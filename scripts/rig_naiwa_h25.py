"""Build an editable glTF skeleton, skin weights and in-place clips for Naiwa."""
import hashlib
import heapq
import json
import math
import struct

import numpy as np

from naiwa_mesh_tools import ROOT, read_glb
from repair_naiwa_arm_topology import shoulder_weights


def smoothstep(lo, hi, value):
    t = np.clip((value - lo) / (hi - lo), 0, 1)
    return t * t * (3 - 2 * t)


# Joint centers in the original one-unit-high mesh. Names are portable glTF nodes.
BONES = [
    ('Root', None, [0, 0, 0]),
    ('Hips', 'Root', [0, .335, -.015]),
    ('Spine', 'Hips', [0, .52, -.025]),
    ('Chest', 'Spine', [0, .70, -.02]),
    ('Neck', 'Chest', [0, .845, -.025]),
    ('Head', 'Neck', [0, .925, -.02]),
]
for side, sign in [('L', -1), ('R', 1)]:
    BONES += [
        (f'UpperArm_{side}', 'Chest', [sign * .182, .705, .015]),
        (f'Forearm_{side}', f'UpperArm_{side}', [sign * .268, .530, .030]),
        (f'Hand_{side}', f'Forearm_{side}', [sign * .265, .402, .045]),
        (f'Thigh_{side}', 'Hips', [sign * .130, .335, .025]),
        (f'Shin_{side}', f'Thigh_{side}', [sign * .130, .185, .025]),
        (f'Foot_{side}', f'Shin_{side}', [sign * .130, .055, .025]),
        (f'Toe_{side}', f'Foot_{side}', [sign * .130, .022, .105]),
        (f'Eye_{side}', 'Head', [sign * .058, .934, .084]),
    ]
for side, sign in [('L', -1), ('R', 1)]:
    BONES.append((f'Shoulder_{side}', 'Chest', [sign * .182, .705, .015]))
INDEX = {name: i for i, (name, _, _) in enumerate(BONES)}
BIND_WORLD = np.array([p for _, _, p in BONES], dtype=np.float32)
BIND_LOCAL = BIND_WORLD.copy()
for i, (_, parent, _) in enumerate(BONES):
    if parent:
        BIND_LOCAL[i] -= BIND_WORLD[INDEX[parent]]

GAITS = {
    'Walk': {'duration': 1.20, 'stance': .62, 'stride': .172, 'lift': .032, 'heel': -.065, 'toe': .14},
    'Run': {'duration': .88, 'stance': .46, 'stride': .205, 'lift': .065, 'heel': -.045, 'toe': .20},
}
GAIT_REVISION = '2026-10-17-shoulder-face-wrists-v13'
BLOCK = {'duration': 1.2, 'raise': .40, 'holdEnd': .80}
BED_PULL = {'duration': 1.78, 'impact': .74, 'anticipation': .28, 'forceDuration': .72, 'retreatDistance': .9}
FOOT_SOLES = {side: np.array([[0, -.055, -.065], [0, -.055, .115]]) for side in ('L', 'R')}


def surface_distances(positions, adjacency, seed):
    distances = np.full(len(positions), np.inf)
    queue = [(0., int(i)) for i in np.flatnonzero(seed)]
    if not queue:
        raise ValueError('A limb seed region contains no vertices')
    heapq.heapify(queue)
    distances[seed] = 0
    while queue:
        distance, i = heapq.heappop(queue)
        if distance > distances[i]:
            continue
        for j, length in adjacency[i]:
            candidate = distance + length
            if candidate < distances[j]:
                distances[j] = candidate
                heapq.heappush(queue, (candidate, j))
    return distances


def skin_weights(positions, faces):
    x, y, z = positions.T
    weights = np.zeros((len(positions), len(BONES)), dtype=np.float32)
    # The belly stays on the torso; limb masks travel along the mesh surface,
    # so an arm passing close to the belly does not pull the belly with it.
    regions = [('Hips', 'Spine', .39, .53), ('Spine', 'Chest', .60, .73),
               ('Chest', 'Neck', .80, .86), ('Neck', 'Head', .87, .92)]
    weights[:, INDEX['Hips']] = 1
    for previous, next_bone, lo, hi in regions:
        mix = smoothstep(lo, hi, y)
        weights *= (1 - mix[:, None])
        weights[:, INDEX[next_bone]] += mix

    # The complete visible face must follow the same head transform as the
    # separate smile and eyeballs. A horizontal neck/head blend across the
    # mouth buried its centre and exposed only two corners when looking up.
    face = smoothstep(.835, .875, y) * smoothstep(.015, .045, z)
    weights *= 1 - face[:, None]
    weights[:, INDEX['Head']] += face

    edges = np.unique(np.sort(np.concatenate([faces[:, [0, 1]], faces[:, [1, 2]], faces[:, [2, 0]]]), axis=1), axis=0)
    adjacency = [[] for _ in positions]
    for (a, b), distance in zip(edges, np.linalg.norm(positions[edges[:, 0]] - positions[edges[:, 1]], axis=1)):
        adjacency[a].append((int(b), float(distance)))
        adjacency[b].append((int(a), float(distance)))
    arm_influences, _ = shoulder_weights(positions, faces)
    weights *= 1 - np.clip(arm_influences.sum(axis=1), 0, 1)[:, None]
    for side, sign in [('L', -1), ('R', 1)]:
        # Follow the repaired limb's connectivity, not an X threshold across a
        # fused body. Torso and arms only share a short shoulder transition.
        influence = arm_influences[:, 0 if side == 'L' else 1]
        elbow = 1 - smoothstep(.50, .575, y)
        hand = 1 - smoothstep(.375, .435, y)
        weights[:, INDEX[f'UpperArm_{side}']] += influence * (1 - elbow)
        weights[:, INDEX[f'Forearm_{side}']] += influence * elbow * (1 - hand)
        weights[:, INDEX[f'Hand_{side}']] += influence * elbow * hand

        seed = (x * sign > .10) & (x * sign < .17) & (y > .045) & (y < .075)
        distance = surface_distances(positions, adjacency, seed)
        influence = (1 - smoothstep(.235, .325, distance)) * (1 - smoothstep(.31, .365, y))
        influence *= smoothstep(.035, .09, x * sign)
        knee = 1 - smoothstep(.165, .235, y)
        foot = 1 - smoothstep(.052, .095, y)
        toe = smoothstep(.068, .125, z) * (1 - smoothstep(.045, .065, y))
        weights *= 1 - influence[:, None]
        weights[:, INDEX[f'Thigh_{side}']] += influence * (1 - knee)
        weights[:, INDEX[f'Shin_{side}']] += influence * knee * (1 - foot)
        weights[:, INDEX[f'Foot_{side}']] += influence * knee * foot * (1 - toe)
        weights[:, INDEX[f'Toe_{side}']] += influence * knee * foot * toe

    # The six separate eye surfaces move together under two eye joints.
    # Small disconnected smile geometry follows the head rigidly as well.
    visited = np.zeros(len(positions), dtype=bool)
    for start in range(len(positions)):
        if visited[start]:
            continue
        component, pending = [], [start]
        visited[start] = True
        while pending:
            i = pending.pop()
            component.append(i)
            for j, _ in adjacency[i]:
                if not visited[j]:
                    visited[j] = True
                    pending.append(j)
        if len(component) > 1000:
            continue
        center = positions[component].mean(axis=0)
        if center[1] < .85:
            continue
        bone = f'Eye_{"L" if center[0] < 0 else "R"}' if center[1] > .91 else 'Head'
        weights[component] = 0
        weights[component, INDEX[bone]] = 1

    for side in ('L', 'R'):
        upper, chest, support = [INDEX[name] for name in (f'UpperArm_{side}', 'Chest', f'Shoulder_{side}')]
        # A half-angle shoulder pivot splits the large chest/upper-arm rotation.
        # Direct 146-degree linear blending squeezed the shoulder almost flat.
        total = weights[:, chest] + weights[:, upper]
        fraction = np.divide(weights[:, upper], total, out=np.zeros_like(total), where=total > 1e-8)
        phase = 2 * fraction
        weights[:, chest] = total * np.clip(1 - phase, 0, 1)
        weights[:, upper] = total * np.clip(phase - 1, 0, 1)
        weights[:, support] = total * np.maximum(0, 1 - np.abs(phase - 1))
    joints = np.argsort(-weights, axis=1)[:, :4]
    values = np.take_along_axis(weights, joints, axis=1)
    values /= values.sum(axis=1)[:, None]
    return joints.astype(np.uint16), values.astype(np.float32)


def quat_xyz(angles):
    sx, sy, sz = np.sin(angles / 2).T
    cx, cy, cz = np.cos(angles / 2).T
    return np.column_stack([sx * cy * cz + cx * sy * sz,
                            cx * sy * cz - sx * cy * sz,
                            cx * cy * sz + sx * sy * cz,
                            cx * cy * cz - sx * sy * sz]).astype(np.float32)


def quat_multiply(a, b):
    return np.append(a[3] * b[:3] + b[3] * a[:3] + np.cross(a[:3], b[:3]),
                     a[3] * b[3] - np.dot(a[:3], b[:3]))


def quat_inverse(q):
    return q * np.array([-1, -1, -1, 1])


def quat_slerp(a, b, amount):
    dot = float(np.dot(a, b))
    if dot < 0:
        b, dot = -b, -dot
    if dot > .9995:
        value = a * (1 - amount) + b * amount
        return value / np.linalg.norm(value)
    angle = math.acos(np.clip(dot, -1, 1))
    return (a * math.sin((1 - amount) * angle) + b * math.sin(amount * angle)) / math.sin(angle)


def constrain_wrist(q, axis):
    axis = axis / np.linalg.norm(axis)
    q = q if q[3] >= 0 else -q
    twist = np.append(axis * np.dot(q[:3], axis), q[3])
    twist /= max(1e-8, np.linalg.norm(twist))
    swing = quat_multiply(q, quat_inverse(twist))
    swing_angle = 2 * math.acos(np.clip(abs(swing[3]), 0, 1))
    twist_angle = 2 * math.atan2(np.dot(twist[:3], axis), twist[3])
    if swing_angle <= .35 and abs(twist_angle) <= .175:
        return q
    swing = quat_slerp(np.array([0., 0., 0., 1.]), swing, min(1, .35 / max(1e-8, swing_angle)))
    angle = np.clip(twist_angle, -.175, .175)
    return quat_multiply(swing, np.append(axis * math.sin(angle / 2), math.cos(angle / 2)))


def quat_rotate(q, vector):
    return vector + 2 * np.cross(q[:3], np.cross(q[:3], vector) + q[3] * vector)


def quat_between(a, b):
    a, b = a / np.linalg.norm(a), b / np.linalg.norm(b)
    if np.dot(a, b) < -.999999:
        axis = np.cross(a, [1., 0., 0.] if abs(a[0]) < .8 else [0., 0., 1.])
        return np.append(axis / np.linalg.norm(axis), 0.)
    quaternion = np.append(np.cross(a, b), 1 + np.dot(a, b))
    return quaternion / np.linalg.norm(quaternion)


def foot_target(phase, gait):
    stance, stride = gait['stance'], gait['stride']
    planted = phase < stance
    if planted:
        u = phase / stance
        forward = stride * (1 - 2 * u)
        lift = 0
        pitch = gait['heel'] * (1 - smoothstep(0, .18, u)) + gait['toe'] * smoothstep(.72, 1, u)
        support = math.sin(math.pi * u) ** .75
    else:
        v = (phase - stance) / (1 - stance)
        # Match stance velocity at toe-off and heel contact instead of snapping
        # from a linear planted foot to an unrelated sinusoidal swing.
        tangent = -2 * stride / stance * (1 - stance)
        forward = -stride + 2 * stride * smoothstep(0, 1, v) + tangent * v * (1 - v) * (1 - 2 * v)
        lift = gait['lift'] * math.sin(math.pi * v) ** 2
        pitch = gait['toe'] * (1 - smoothstep(0, .45, v)) + gait['heel'] * smoothstep(.60, 1, v) - .06 * math.sin(math.pi * v)
        support = 0
    return {'forward': forward, 'lift': lift, 'pitch': pitch, 'support': support, 'planted': planted}


def foot_position(side, target):
    foot_rotation = np.array([math.sin(target['pitch'] / 2), 0, 0, math.cos(target['pitch'] / 2)])
    # Lift the ankle as the heel/toe rolls so the actual sole stays above ground.
    sole_min = min(quat_rotate(foot_rotation, vertex)[1] for vertex in FOOT_SOLES[side])
    position = BIND_WORLD[INDEX[f'Foot_{side}']].astype(float).copy()
    position[1] = -sole_min + target['lift']
    position[2] += target['forward']
    return position, foot_rotation


def leg_ik(side, target_position, foot_rotation, translation, rotation, overrides):
    hips_rotation = quat_xyz(rotation[[INDEX['Hips']]])[0]
    hip = translation[INDEX['Hips']] + quat_rotate(hips_rotation, BIND_LOCAL[INDEX[f'Thigh_{side}']])
    delta = target_position - hip
    distance = np.linalg.norm(delta)
    length1, length2 = .15, .13
    reach = min(distance, length1 + length2 - .0001)
    direction = delta / max(distance, 1e-8)
    pole = np.array([0., 0., 1.])
    pole -= direction * np.dot(pole, direction)
    pole /= np.linalg.norm(pole)
    along = (length1**2 - length2**2 + reach**2) / (2 * reach)
    knee = hip + direction * along + pole * math.sqrt(max(0, length1**2 - along**2))
    upper = quat_between(np.array([0., -1., 0.]), quat_rotate(quat_inverse(hips_rotation), knee - hip))
    upper_world = quat_multiply(hips_rotation, upper)
    lower = quat_between(np.array([0., -1., 0.]), quat_rotate(quat_inverse(upper_world), target_position - knee))
    lower_world = quat_multiply(upper_world, lower)
    overrides[INDEX[f'Thigh_{side}']] = upper
    overrides[INDEX[f'Shin_{side}']] = lower
    overrides[INDEX[f'Foot_{side}']] = quat_multiply(quat_inverse(lower_world), foot_rotation)


def bone_world(name, translation, rotation, overrides):
    i = INDEX[name]
    parent = BONES[i][1]
    q = overrides.get(i, quat_xyz(rotation[[i]])[0])
    if parent is None:
        return translation[i].copy(), q
    position, orientation = bone_world(parent, translation, rotation, overrides)
    return position + quat_rotate(orientation, translation[i]), quat_multiply(orientation, q)


def block_arm_pose(amount, translation, rotation, overrides):
    # Rebuild on the original shoulder/elbow/wrist chain. Two controlled bends
    # raise the hand; the wrist only compensates a modest forward shoulder tilt.
    # There is no half-turn of the palm or axial twist added to the forearm.
    _, chest = bone_world('Chest', translation, rotation, overrides)
    upper_world = quat_xyz(np.array([[.55 * amount, 0, 2.60 * amount]]))[0]
    lower = quat_xyz(np.array([[0, 0, 1.40 * amount]]))[0]
    palm = quat_xyz(np.array([[.25 * amount, 0, 4.00 * amount]]))[0]
    overrides[INDEX['UpperArm_R']] = quat_multiply(quat_inverse(chest), upper_world)
    overrides[INDEX['Forearm_R']] = lower
    overrides[INDEX['Hand_R']] = quat_multiply(quat_inverse(quat_multiply(upper_world, lower)), palm)


def arm_frame(direction, normal):
    direction = direction / np.linalg.norm(direction)
    normal = normal - direction * np.dot(normal, direction)
    normal /= np.linalg.norm(normal)
    frame = np.column_stack([direction, normal, np.cross(direction, normal)])
    return frame


def quat_matrix(matrix):
    # Stable matrix -> quaternion conversion, including the 180-degree case.
    m = matrix
    k = np.array([[m[0, 0] - m[1, 1] - m[2, 2], m[0, 1] + m[1, 0], m[0, 2] + m[2, 0], m[2, 1] - m[1, 2]],
                  [m[0, 1] + m[1, 0], m[1, 1] - m[0, 0] - m[2, 2], m[1, 2] + m[2, 1], m[0, 2] - m[2, 0]],
                  [m[0, 2] + m[2, 0], m[1, 2] + m[2, 1], m[2, 2] - m[0, 0] - m[1, 1], m[1, 0] - m[0, 1]],
                  [m[2, 1] - m[1, 2], m[0, 2] - m[2, 0], m[1, 0] - m[0, 1], m.trace()]]) / 3
    _, vectors = np.linalg.eigh(k)
    q = vectors[:, -1]
    return q if q[3] >= 0 else -q


def ground_arm_pose(side, wrist, pole, translation, rotation, overrides):
    shoulder, parent_q = bone_world('Chest', translation, rotation, overrides)
    shoulder += quat_rotate(parent_q, BIND_LOCAL[INDEX[f'UpperArm_{side}']])
    delta = np.array(wrist) - shoulder
    distance = np.linalg.norm(delta)
    direction = delta / max(distance, 1e-8)
    upper_rest, lower_rest = BIND_LOCAL[INDEX[f'Forearm_{side}']], BIND_LOCAL[INDEX[f'Hand_{side}']]
    length1, length2 = np.linalg.norm(upper_rest), np.linalg.norm(lower_rest)
    reach = min(distance, length1 + length2 - .008)
    wrist = shoulder + direction * reach
    bend = np.array(pole) - shoulder
    bend -= direction * np.dot(bend, direction)
    bend /= max(np.linalg.norm(bend), 1e-8)
    along = (length1**2 - length2**2 + reach**2) / (2 * reach)
    elbow = shoulder + direction * along + bend * math.sqrt(max(0, length1**2 - along**2))
    # Orient the whole shoulder/elbow plane, instead of aiming two bones with
    # arbitrary roll and then forcing a large palm correction into the wrist.
    normal = -np.cross(elbow - shoulder, wrist - elbow)
    rest_normal = np.cross(upper_rest, lower_rest)
    upper_world = quat_matrix(arm_frame(elbow - shoulder, normal) @ arm_frame(upper_rest, rest_normal).T)
    lower_world = quat_matrix(arm_frame(wrist - elbow, normal) @ arm_frame(lower_rest, rest_normal).T)
    # Both palms face down, with open fingers pointing forward on the floor.
    floor_palm = quat_xyz(np.array([[math.pi / 2, 0, math.pi if side == 'L' else -math.pi]]))[0]
    overrides[INDEX[f'UpperArm_{side}']] = quat_multiply(quat_inverse(parent_q), upper_world)
    overrides[INDEX[f'Forearm_{side}']] = quat_multiply(quat_inverse(upper_world), lower_world)
    overrides[INDEX[f'Hand_{side}']] = quat_multiply(quat_inverse(lower_world), floor_palm)


def bed_body(lowering, extension, translation, rotation):
    crouch = float(smoothstep(0, .65, lowering))
    prone = float(smoothstep(.28, 1.05, lowering))
    floor_clearance = .03 * math.sin(math.pi * crouch) * (1 - prone)
    # Keep the crown outside the frame until the face has settled low enough;
    # reverse the same path before rising, rather than lifting into the mattress.
    retreat = .16 * math.sin(math.pi * prone)
    translation[INDEX['Root']] = [0, .24 * prone + floor_clearance, (-.08 + .10 * extension) * prone - retreat]
    rotation[INDEX['Root'], 0] = math.pi / 2 * prone
    translation[INDEX['Hips'], 1] -= .07 * crouch * (1 - prone)
    # The chest follows the support of the arms; a short neck and modest head
    # lift share the remaining movement instead of folding the head back 68°.
    tuck = float(smoothstep(0, .20, extension))
    rotation[INDEX['Spine'], 0] = .18 * crouch * (1 - prone) - .08 * prone * (1 - tuck)
    rotation[INDEX['Chest'], 0] = .12 * crouch * (1 - prone) + (-.10 + .14 * tuck) * prone
    rotation[INDEX['Neck'], 0] = -.24 * prone
    rotation[INDEX['Head'], 0] = -.60 * prone
    for side in ('L', 'R'):
        rotation[INDEX[f'Thigh_{side}'], 0] = -.65 * crouch
        rotation[INDEX[f'Shin_{side}'], 0] = 1.0 * crouch
        # Roll off the planted feet before lifting them behind the prone body.
        # Without this, the root's forward tilt drives the toes through the floor.
        support = 1 - float(smoothstep(.45, .85, prone))
        rotation[INDEX[f'Foot_{side}'], 0] = -(rotation[INDEX['Root'], 0] + .35 * crouch) * support


def pose(clip, phase):
    translation = BIND_LOCAL.copy()
    rotation = np.zeros_like(translation)
    scale = np.ones_like(translation)
    overrides = {}
    cycle = 2 * math.pi * phase
    if clip == 'Idle':
        breath = math.sin(cycle)
        translation[INDEX['Hips'], 1] += .0015 * breath
        scale[INDEX['Spine']] = [1 + .003 * breath, 1 + .003 * breath, 1 + .006 * breath]
        rotation[INDEX['Chest'], 0] = .008 * breath
        rotation[INDEX['Head'], 1] = .018 * math.sin(cycle)
        blink = 1 - .86 * math.exp(-((phase - .71) / .018) ** 2)
        for side, sign in [('L', -1), ('R', 1)]:
            rotation[INDEX[f'UpperArm_{side}'], 2] = sign * .009 * breath
            scale[INDEX[f'Eye_{side}'], 1] = blink
    elif clip in ('Walk', 'Run'):
        running = clip == 'Run'
        gait = GAITS[clip]
        targets = {side: foot_target((phase + offset) % 1, gait) for side, offset in [('L', 0), ('R', .5)]}
        feet = {side: foot_position(side, target) for side, target in targets.items()}
        load_left, load_right = targets['L']['support'], targets['R']['support']
        balance = (load_right - load_left) / max(.25, load_left + load_right)
        translation[INDEX['Hips'], 0] += .009 * balance
        hip_yaw = .024 * (targets['L']['forward'] - targets['R']['forward']) / (2 * gait['stride'])
        hip_roll = -.009 * balance
        rotation[INDEX['Hips'], 1:] = [hip_yaw, hip_roll]
        rotation[INDEX['Spine'], 1:] = [-1.3 * hip_yaw, -.7 * hip_roll]
        rotation[INDEX['Chest']] = [.075 if running else .012, -.4 * hip_yaw, -.3 * hip_roll]
        rotation[INDEX['Head']] = [-.045 if running else -.008, .7 * hip_yaw, 0]

        # Set pelvis height from the planted leg's reach. This gives a tall
        # mid-stance and a gentle landing instead of a permanently crouched gait.
        hips_rotation = quat_xyz(rotation[[INDEX['Hips']]])[0]
        heights, reach_limits = [], []
        for side, target in targets.items():
            local_hip = quat_rotate(hips_rotation, BIND_LOCAL[INDEX[f'Thigh_{side}']])
            horizontal = feet[side][0][[0, 2]] - (translation[INDEX['Hips']] + local_hip)[[0, 2]]
            reach_limits.append(feet[side][0][1] + math.sqrt(max(.001, .2795**2 - np.dot(horizontal, horizontal))) - local_hip[1])
            if target['planted']:
                extension = .2755 if running else .2775
                heights.append(feet[side][0][1] + math.sqrt(max(.001, extension**2 - np.dot(horizontal, horizontal))) - local_hip[1])
        desired_height = min(heights) if heights else .335 + .006 * math.cos(cycle * 2)
        translation[INDEX['Hips'], 1] = min(desired_height, min(reach_limits))
        for side in ('L', 'R'):
            target = targets[side]
            leg_ik(side, *feet[side], translation, rotation, overrides)
            # Positive arm X swings a hanging arm BACK while positive foot Z
            # steps FORWARD. Use the actual foot trajectory, not a separate sine.
            opposite = float(np.clip(target['forward'] / gait['stride'], -1.1, 1.1))
            bend = (.38 if running else .095) + (.11 if running else .075) * max(0, -opposite)
            rotation[INDEX[f'UpperArm_{side}'], 0] = (.42 if running else .29) * opposite + .37 * bend
            rotation[INDEX[f'Forearm_{side}'], 0] = -bend
            rotation[INDEX[f'Hand_{side}'], 0] = -.025 * opposite
    elif clip == 'Grab':
        reach = smoothstep(0, .72, phase)
        rotation[INDEX['Spine'], 0] = .09 * reach
        rotation[INDEX['Head'], 0] = -.04 * reach
        for side, sign in [('L', -1), ('R', 1)]:
            rotation[INDEX[f'UpperArm_{side}']] = [-1.15 * reach, sign * -.10 * reach, sign * -.10 * reach]
            rotation[INDEX[f'Forearm_{side}'], 0] = -.28 * reach
            rotation[INDEX[f'Hand_{side}'], 0] = .13 * reach
    elif clip in ('Slam', 'Pull', 'BedPull'):
        # This legacy +Z-facing rig labels the negative-X chain L. It is the
        # character's anatomical right (the viewer's left from the front).
        side = 'L'
        bed = clip == 'BedPull'
        prelean = 0.
        if bed:
            seconds = phase * BED_PULL['duration']
            prelean = float(smoothstep(0, .28, seconds) * (1 - smoothstep(.28, .56, seconds)))
            elapsed = max(0, seconds - .28)
            mapped = elapsed if elapsed <= .46 else .46 + (elapsed - .46) * .46 / .72 if elapsed <= 1.18 else .92 + (elapsed - 1.18) * .28 / .32
            phase = min(1., mapped / 1.2)
        envelope = float(smoothstep(0, .12, phase) * (1 - smoothstep(.82, 1, phase)))
        keys = ([(0, 0, 0, 0), (.20, -2.65, -.55, -.07), (.42, -2.90, -.35, -.10),
                 (.68 / 1.28, -1.95, -.15, .19), (.68, -1.65, -.35, .16), (.85, -.45, -.30, .04), (1, 0, 0, 0)]
                if clip == 'Slam' else
                [(0, 0, 0, 0), (.26, -1.88, -.15, .10), (.46 / 1.2, -1.88, -.12, .12),
                 (.70, -1.35, -1.15, -.045), (.86, -.60, -.65, -.03), (1, 0, 0, 0)])
        before, after = keys[0], keys[-1]
        for a, b in zip(keys, keys[1:]):
            if a[0] <= phase <= b[0]:
                before, after = a, b
                break
        blend = float(smoothstep(before[0], after[0], phase))
        upper, elbow, lean = np.array(before[1:]) * (1 - blend) + np.array(after[1:]) * blend
        rotation[INDEX[f'UpperArm_{side}']] = [upper, -.08 * envelope, -.06 * envelope]
        rotation[INDEX[f'Forearm_{side}'], 0] = elbow
        rotation[INDEX[f'Hand_{side}'], 0] = .16 * envelope
        rotation[INDEX['UpperArm_R']] = [.25 * envelope, 0, .13 * envelope]
        rotation[INDEX['Forearm_R'], 0] = -.22 * envelope
        rotation[INDEX['Hips'], 1] = .045 * envelope
        rotation[INDEX['Spine']] = [lean, .09 * envelope, -.012 * envelope]
        rotation[INDEX['Chest']] = [.35 * lean, .06 * envelope, -.015 * envelope]
        rotation[INDEX['Head'], 0] = -1.35 * lean - .04 * envelope
        rotation[INDEX['Spine'], 0] += .18 * prelean
        rotation[INDEX['Chest'], 0] += .08 * prelean
        rotation[INDEX['Head'], 0] -= .22 * prelean
        translation[INDEX['Hips']] += [-.008 * envelope, -.018 * envelope, (.035 if clip == 'Slam' else -.008) * envelope]
        clench = envelope if clip == 'Slam' else float(smoothstep(.32, .40, phase) * (1 - smoothstep(.85, 1, phase)))
        scale[INDEX[f'Hand_{side}']] = [1 - .14 * clench, 1 - .45 * clench, 1 - .1 * clench]
        # Keep the soles planted for the slam. Pull takes two short backward
        # steps coordinated with the actor's 0.45m retreat in the game.
        step = float(np.clip((phase - .46 / 1.2) / (.46 / 1.2), 0, 1)) if clip != 'Slam' else 0
        translation[INDEX['Hips'], 1] -= .01 * math.sin(math.pi * step) if clip != 'Slam' else .012 * math.sin(math.pi * float(np.clip((phase - .42) / .3, 0, 1))) ** 2
        feet = {}
        for leg_side in ('L', 'R'):
            forward, lift = 0., 0.
            if clip != 'Slam':
                u = float(np.clip(step / .60 if leg_side == 'R' else (step - .43) / .57, 0, 1))
                forward = (.9 if bed else .45) / 1.7 * (step - float(smoothstep(0, 1, u)))
                lift = .042 * math.sin(math.pi * u) ** 2
            target = {'forward': forward, 'lift': lift, 'pitch': 0}
            feet[leg_side] = foot_position(leg_side, target)
        hips_rotation = quat_xyz(rotation[[INDEX['Hips']]])[0]
        for leg_side in ('L', 'R'):
            local_hip = quat_rotate(hips_rotation, BIND_LOCAL[INDEX[f'Thigh_{leg_side}']])
            horizontal = feet[leg_side][0][[0, 2]] - (translation[INDEX['Hips']] + local_hip)[[0, 2]]
            limit = feet[leg_side][0][1] + math.sqrt(max(.001, .2795**2 - np.dot(horizontal, horizontal))) - local_hip[1]
            translation[INDEX['Hips'], 1] = min(translation[INDEX['Hips'], 1], limit)
        for leg_side in ('L', 'R'):
            leg_ik(leg_side, *feet[leg_side], translation, rotation, overrides)
    elif clip in ('BedSearch', 'BedReach', 'BedRise'):
        seconds = phase * (2.15 if clip == 'BedSearch' else .85 if clip == 'BedReach' else 1.05)
        lowering = seconds if clip == 'BedSearch' else 1.05 if clip == 'BedReach' else 1.05 - seconds
        extension = float(smoothstep(0, .62, seconds)) if clip == 'BedReach' else 0.
        bed_body(lowering, extension, translation, rotation)
        # Solve only the settled support pose. Lowering/rising follow fixed,
        # continuous local joint arcs, so no elbow-plane branch can flip while
        # a hand passes the shoulder or an arm briefly approaches full reach.
        target_translation, target_rotation = BIND_LOCAL.copy(), np.zeros_like(rotation)
        bed_body(1.05, extension, target_translation, target_rotation)
        planted = {}
        for side, sign in [('L', -1), ('R', 1)]:
            reach = extension if side == 'L' else 0.
            wrist = [sign * (.30 - .10 * reach), .102 + .015 * reach, (.82 if side == 'L' else .88) + .21 * reach]
            ground_arm_pose(side, wrist, [sign * .40, .18, .62], target_translation, target_rotation, planted)
        plant = float(smoothstep(.08, 1.05, lowering))
        for joint, orientation in planted.items():
            overrides[joint] = quat_slerp(np.array([0., 0., 0., 1.]), orientation, plant)
    elif clip == 'Block':
        seconds = phase * BLOCK['duration']
        amount = float(smoothstep(0, BLOCK['raise'], seconds) * (1 - smoothstep(BLOCK['holdEnd'], BLOCK['duration'], seconds)))
        # Brace behind the raised hand: a small weight shift, turn and chin tuck.
        translation[INDEX['Hips']] += [-.008 * amount, -.012 * amount, -.009 * amount]
        rotation[INDEX['Hips'], 1] = -.045 * amount
        rotation[INDEX['Spine']] = [-.055 * amount, -.055 * amount, .025 * amount]
        rotation[INDEX['Chest']] = [-.025 * amount, -.045 * amount, .018 * amount]
        rotation[INDEX['Head']] = [.065 * amount, .04 * amount, -.02 * amount]
        rotation[INDEX['UpperArm_L']] = [-.16 * amount, 0, -.07 * amount]
        rotation[INDEX['Forearm_L'], 0] = -.22 * amount
        for side in ('L', 'R'):
            leg_ik(side, *foot_position(side, {'forward': 0, 'lift': 0, 'pitch': 0}), translation, rotation, overrides)
        block_arm_pose(amount, translation, rotation, overrides)
    elif clip == 'Hit':
        recoil = math.sin(math.pi * phase) ** 2
        rotation[INDEX['Spine'], 0] = -.13 * recoil
        rotation[INDEX['Chest'], 2] = .065 * math.sin(cycle * 2) * recoil
        rotation[INDEX['Head'], 0] = .11 * recoil
        translation[INDEX['Hips'], 1] -= .008 * recoil
        for side in ('L', 'R'):
            rotation[INDEX[f'UpperArm_{side}'], 0] = -.35 * recoil
    elif clip in ('Down', 'Recover'):
        fall = smoothstep(0, 1, phase if clip == 'Down' else 1 - phase)
        translation[INDEX['Root']] = [0, .236 * fall, .43 * fall]
        rotation[INDEX['Root'], 0] = -math.pi / 2 * fall
        for side, sign in [('L', -1), ('R', 1)]:
            rotation[INDEX[f'UpperArm_{side}'], 2] = sign * .1 * fall
            rotation[INDEX[f'Forearm_{side}'], 0] = -.1 * fall
        if clip == 'Recover':
            bend = math.sin(math.pi * phase) ** 2
            rotation[INDEX['Spine'], 0] = .17 * bend
            for side in ('L', 'R'):
                rotation[INDEX[f'Thigh_{side}'], 0] = -.25 * bend
                rotation[INDEX[f'Shin_{side}'], 0] = .5 * bend
    quaternion = quat_xyz(rotation)
    for joint, value in overrides.items():
        quaternion[joint] = value
    for side in ('L', 'R'):
        hand = INDEX[f'Hand_{side}']
        quaternion[hand] = constrain_wrist(quaternion[hand], BIND_LOCAL[hand].astype(float))
        quaternion[INDEX[f'Shoulder_{side}']] = quat_slerp(np.array([0., 0., 0., 1.]), quaternion[INDEX[f'UpperArm_{side}']], .5)
    return translation, quaternion, scale


class GlbBuilder:
    def __init__(self):
        self.data = bytearray()
        self.views = []
        self.accessors = []

    def add(self, values, kind, component=5126, target=None, bounds=False):
        arr = np.asarray(values, dtype={5126: '<f4', 5125: '<u4', 5123: '<u2'}[component])
        while len(self.data) % 4:
            self.data.append(0)
        view = {'buffer': 0, 'byteOffset': len(self.data), 'byteLength': arr.nbytes}
        if target:
            view['target'] = target
        accessor = {'bufferView': len(self.views), 'componentType': component,
                    'count': len(arr), 'type': kind}
        if bounds:
            accessor['min'] = np.atleast_1d(arr.min(axis=0)).tolist()
            accessor['max'] = np.atleast_1d(arr.max(axis=0)).tolist()
        self.views.append(view)
        self.accessors.append(accessor)
        self.data.extend(arr.tobytes())
        return len(self.accessors) - 1

    def save(self, path, doc):
        doc.update({'buffers': [{'byteLength': len(self.data)}], 'bufferViews': self.views, 'accessors': self.accessors})
        encoded = json.dumps(doc, separators=(',', ':'), ensure_ascii=False).encode('utf-8')
        encoded += b' ' * (-len(encoded) % 4)
        self.data.extend(b'\0' * (-len(self.data) % 4))
        result = struct.pack('<4sII', b'glTF', 2, 28 + len(encoded) + len(self.data))
        result += struct.pack('<II', len(encoded), 0x4e4f534a) + encoded
        result += struct.pack('<II', len(self.data), 0x004e4942) + self.data
        path.write_bytes(result)


def main():
    source = ROOT / 'assets/models/naiwa-h25-articulated.glb'
    output = ROOT / 'assets/models/naiwa-h25-rigged.glb'
    positions, normals, faces, colors = read_glb(source)
    for side, sign in [('L', -1), ('R', 1)]:
        sole = positions[(positions[:, 0] * sign > .06) & (positions[:, 1] < .045)]
        FOOT_SOLES[side] = sole - BIND_WORLD[INDEX[f'Foot_{side}']]
    joints, weights = skin_weights(positions, faces)
    builder = GlbBuilder()
    attributes = {'POSITION': builder.add(positions, 'VEC3', target=34962, bounds=True),
                  'NORMAL': builder.add(normals, 'VEC3', target=34962),
                  'COLOR_0': builder.add(colors, 'VEC3', target=34962),
                  'JOINTS_0': builder.add(joints, 'VEC4', component=5123, target=34962),
                  'WEIGHTS_0': builder.add(weights, 'VEC4', target=34962)}
    triangles = builder.add(faces.reshape(-1), 'SCALAR', component=5125, target=34963)
    inverses = np.tile(np.eye(4, dtype=np.float32), (len(BONES), 1, 1))
    inverses[:, :3, 3] = -BIND_WORLD
    bind_matrices = builder.add(inverses.transpose(0, 2, 1).reshape(-1, 16), 'MAT4')
    nodes = [{'name': 'Naiwa', 'children': [1, 2]}, {'name': 'NaiwaSkin', 'mesh': 0, 'skin': 0}]
    for i, (name, parent, _) in enumerate(BONES):
        node = {'name': name, 'translation': BIND_LOCAL[i].tolist()}
        children = [2 + j for j, (_, p, _) in enumerate(BONES) if p == name]
        if children:
            node['children'] = children
        nodes.append(node)

    clips = [('Idle', 2.8, True), ('Walk', GAITS['Walk']['duration'], True), ('Run', GAITS['Run']['duration'], True),
             ('Grab', .65, False), ('Hit', .8, True), ('Down', .6, False), ('Recover', .8, False),
             ('Slam', 1.28, False), ('Pull', 1.2, False), ('Block', BLOCK['duration'], False), ('BedPull', BED_PULL['duration'], False),
             ('BedSearch', 2.15, False), ('BedReach', .85, False), ('BedRise', 1.05, False)]
    animations = []
    translated = {INDEX['Root'], INDEX['Hips']}
    scaled = {INDEX['Spine'], INDEX['Eye_L'], INDEX['Eye_R'], INDEX['Hand_L']}
    for name, duration, looping in clips:
        times = np.linspace(0, duration, max(3, round(duration * 30) + 1), dtype=np.float32)
        if name == 'Block':
            times = np.unique(np.append(times, [BLOCK['raise'], BLOCK['holdEnd']])).astype(np.float32)
        if name == 'BedPull':
            times = np.unique(np.append(times, [.28, .56, .74, 1.46])).astype(np.float32)
        poses = [pose(name, float(t / duration)) for t in times]
        if looping:
            poses[-1] = poses[0]
        time_accessor = builder.add(times, 'SCALAR', bounds=True)
        animation = {'name': name, 'samplers': [], 'channels': [],
                     'extras': {'loop': looping, 'inPlace': True}}
        for i in range(len(BONES)):
            for component, field, kind in [(0, 'translation', 'VEC3'), (1, 'rotation', 'VEC4'), (2, 'scale', 'VEC3')]:
                if component == 0 and i not in translated or component == 2 and i not in scaled:
                    continue
                values = np.array([p[component][i] for p in poses])
                if component == 1:
                    for sample in range(1, len(values)):
                        if np.dot(values[sample - 1], values[sample]) < 0:
                            values[sample] *= -1
                accessor = builder.add(values, kind)
                animation['channels'].append({'sampler': len(animation['samplers']), 'target': {'node': 2 + i, 'path': field}})
                animation['samplers'].append({'input': time_accessor, 'output': accessor, 'interpolation': 'LINEAR'})
        animations.append(animation)
    builder.save(output, {
        'asset': {'version': '2.0', 'generator': 'Naiwa local skeletal rig'},
        'scene': 0, 'scenes': [{'name': 'Naiwa rig', 'nodes': [0]}], 'nodes': nodes,
        'skins': [{'name': 'NaiwaSkeleton', 'skeleton': 2, 'joints': list(range(2, 2 + len(BONES))), 'inverseBindMatrices': bind_matrices}],
        'meshes': [{'name': 'Naiwa', 'primitives': [{'attributes': attributes, 'indices': triangles, 'material': 0, 'mode': 4}]}],
        'materials': [{'name': 'Naiwa matte skin', 'doubleSided': True, 'pbrMetallicRoughness': {'baseColorFactor': [1, 1, 1, 1], 'metallicFactor': 0, 'roughnessFactor': .66}}],
        'animations': animations,
        'extras': {'identityReference': 'references/naiwa-escape-turnaround.png',
                   'source': source.name, 'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
                   'height': 1, 'forward': '+Z', 'skinInfluences': 4,
                   'gaitRevision': GAIT_REVISION,
                   'anatomicalRightHand': 'Hand_L',
                   'block': {**BLOCK, 'anatomicalLeftHand': 'Hand_R', 'palmNormal': [0, 0, 1], 'palmCenter': [0, -.035, .012], 'aiEnabled': True},
                   'bedPull': BED_PULL,
                   'armRebuild': {'baseline': '2026-10-17-arm-topology-skin-v12', 'originalSkin': False, 'topologyRepaired': True, 'harmonicShoulders': True, 'shoulderVolumeSupport': ['Shoulder_L', 'Shoulder_R'], 'forearmTwistTransfer': False, 'distributedProneLift': True, 'rigidVisibleFace': True, 'wristSwingLimit': .35, 'wristTwistLimit': .175},
                   'notes': 'In-place clips; same-side arms oppose foot travel. Ground speed uses forward model scale. Eye joints include pupils and highlights.'},
    })
    gait_metadata = {name: {'duration': gait['duration'], 'stanceFraction': gait['stance'],
                            'strideDistance': 2 * gait['stride'],
                            'modelSpeed': 2 * gait['stride'] / (gait['stance'] * gait['duration'])}
                     for name, gait in GAITS.items()}
    gait_metadata['revision'] = GAIT_REVISION
    (output.parent / 'naiwa-h25-gait.json').write_text(json.dumps(gait_metadata, indent=2) + '\n', encoding='utf-8')
    print(f'{output}\n{len(BONES)} joints; {len(positions):,} vertices; {len(faces):,} triangles; {output.stat().st_size:,} bytes')
    print('Clips: ' + ', '.join(name for name, _, _ in clips))


if __name__ == '__main__':
    main()
