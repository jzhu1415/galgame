const BASE_URL = import.meta.env?.BASE_URL ?? '/';
const AUDIO_ROOT = `${String(BASE_URL).endsWith('/') ? String(BASE_URL) : `${String(BASE_URL)}/`}audio/`;

const ogg = file => `${AUDIO_ROOT}${file}.ogg`;
const wav = file => `${AUDIO_ROOT}${file}.wav`;
const sample = (file, kind, variant) => ({
  url: ogg(file),
  kind,
  ...(variant === undefined ? {} : { variant }),
});

// User-provided MP3s, preserved without re-encoding. Walking/running share one
// buffer; only observed jumps/high falls use the separate diving recording.
const walkEntry = { url: `${AUDIO_ROOT}water/splash/walk_entry.mp3`, kind: 'slosh' };
const diveEntry = { url: `${AUDIO_ROOT}water/splash/dive.mp3`, kind: 'slosh' };

// Eight distinct single-step excerpts from each user-provided sequence.
// Wet-tile walking/running only; keep the original wading sample pools separate.
const footstepSamples = mode => Array.from({ length: 8 }, (_, index) => ({
  url: `${AUDIO_ROOT}footsteps/wet_tile/${mode}_${String(index + 1).padStart(2, '0')}.mp3`,
  kind: 'slosh', variant: index + 1,
}));

// The files are intentionally referenced through /audio so a later asset drop
// only has to mirror these names below public/audio. BASE_URL keeps the same
// manifest usable when Vite serves the app from a sub-path.
export const AUDIO_MANIFEST = {
  WET_TILE_STEPS: {
    samples: footstepSamples('walk'),
    loop: false,
  },
  RUN_STEPS: {
    samples: footstepSamples('run'),
    loop: false,
  },
  SHALLOW_WATER_STEPS: {
    samples: [
      sample('water/shallow/step_01', 'slosh', 1),
      sample('water/shallow/step_02', 'slosh', 2),
      sample('water/shallow/step_03', 'slosh', 3),
      sample('water/shallow/step_04', 'slosh', 4),
    ],
    loop: false,
  },
  DEEP_WADING_STEPS: {
    samples: [
      sample('water/wading/step_01', 'slosh', 1),
      sample('water/wading/step_02', 'slosh', 2),
      sample('water/wading/step_03', 'slosh', 3),
      sample('water/wading/step_04', 'slosh', 4),
    ],
    loop: false,
  },
  SWIM_LOOP: {
    samples: [sample('water/swim/movement', 'filtered-noise-loop')],
    loop: true,
  },
  WADE_LOOP: {
    samples: [sample('water/wading/movement', 'filtered-noise-loop')],
    loop: true,
  },
  SWIM_STROKES: {
    samples: [
      sample('water/swim/stroke_01', 'slosh', 1),
      sample('water/swim/stroke_02', 'slosh', 2),
      sample('water/swim/stroke_03', 'slosh', 3),
    ],
    loop: false,
  },
  SPLASH_SMALL: {
    samples: [walkEntry],
    loop: false,
  },
  SPLASH_MEDIUM: {
    samples: [walkEntry],
    loop: false,
  },
  SPLASH_LARGE: {
    samples: [diveEntry],
    loop: false,
  },
  WATER_EXIT: {
    samples: [
      sample('water/surface/water_exit_01', 'slosh', 1),
      sample('water/surface/water_exit_02', 'slosh', 2),
    ],
    loop: false,
  },
  SURFACE_ENTER: {
    samples: [
      sample('water/surface/enter_01', 'slosh', 1),
      sample('water/surface/enter_02', 'slosh', 2),
    ],
    loop: false,
  },
  SURFACE_EXIT: {
    samples: [
      sample('water/surface/exit_01', 'slosh', 1),
      sample('water/surface/exit_02', 'slosh', 2),
    ],
    loop: false,
  },
  VENTILATION: {
    samples: [sample('ambience/ventilation/loop', 'filtered-noise-loop')],
    loop: true,
  },
  POOL_AMBIENCE: {
    samples: [sample('ambience/pool/loop', 'filtered-noise-loop')],
    loop: true,
  },
  FLUORESCENT: {
    samples: [sample('ambience/fluorescent/loop', 'filtered-noise-loop')],
    loop: true,
  },
  UNDERWATER_BED: {
    samples: [sample('ambience/underwater/bed', 'filtered-noise-loop')],
    loop: true,
  },
  DISTANT_WATER: {
    samples: [sample('ambience/distant_water/loop', 'filtered-noise-loop')],
    loop: true,
  },
  DRIPS: {
    samples: [
      sample('environment/drip/drip_01', 'drip', 1),
      sample('environment/drip/drip_02', 'drip', 2),
      sample('environment/drip/drip_03', 'drip', 3),
      sample('environment/drip/drip_04', 'drip', 4),
    ],
    loop: false,
  },
};

// Local authored IRs are optional. ReverbSystem can keep its deterministic
// synthetic IR when one of these files is absent.
export const IR_MANIFEST = {
  SMALL_TILE: wav('impulse/small_tile'),
  POOL_ROOM: wav('impulse/pool_room'),
  LARGE_POOL_HALL: wav('impulse/large_pool_hall'),
  LONG_CORRIDOR: wav('impulse/long_corridor'),
  DEEP_CHAMBER: wav('impulse/deep_chamber'),
  UNDERWATER: wav('impulse/underwater'),
};
