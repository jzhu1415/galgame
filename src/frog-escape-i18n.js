// Keep gameplay names/IDs stable; translate only when presenting them to players.
export const escapeEnglish=Object.freeze({
  '体力值':'Stamina','香蕉':'Banana','香蕉皮':'Banana peel',
  '被门撞中':'Hit by a swinging door','门受到撞击，稍等片刻再使用。':'The door is recovering from an impact. Wait a moment before using it.',
  '设置':'Settings', '设置 · Esc':'Settings · Esc', '打开设置':'Open settings',
  '开始游戏':'Start Game', '继续游戏':'Resume Game', '返回':'Back',
  '显示与语言':'Display and language', '语言 / Language':'Language', '简体中文':'Simplified Chinese',
  '全屏 · F11':'Fullscreen · F11', '退出全屏 · F11':'Exit fullscreen · F11',
  '当前浏览器不支持游戏全屏，可使用浏览器的全屏功能。':'This browser does not support game fullscreen. You can use the browser fullscreen feature.',
  '未能切换全屏，请再次点击全屏按钮。':'Fullscreen could not be changed. Try the fullscreen button again.',
  '体力剩余 {percent}%':'Stamina remaining: {percent}%', '体力剩余 100%':'Stamina remaining: 100%',
  '操作说明':'Controls',
  'WASD 移动 · R 疾跑 · Shift 下蹲 · 空格跳跃 · E 互动 · G 进食 · Esc 设置 · F11 全屏。':'WASD move · R sprint · Shift crouch · Space jump · E interact · G eat · Esc settings · F11 fullscreen.',
  '左键挥动撬棍，右键使用物品；1–7 切换物品，Q 丢弃。':'Left-click to swing the crowbar, right-click to use an item; 1–7 select slots, Q drops the item.',
  '画质':'Graphics',
  '画质设置':'Graphics settings',
  '低画质 · Best Performance':'Best Performance',
  '中等画质 · Balanced':'Balanced',
  '高画质 · Best Quality':'Best Quality',
  '可随时切换，自动记住选择。手机推荐低画质。':'Change anytime. Your choice is remembered. Best Performance is recommended for phones.',
  '适合手机：优先帧率，降低渲染分辨率、阴影和装饰细节。':'For phones: prioritizes frame rate with reduced rendering resolution, shadows and decorative detail.',
  '默认画质：保留原有画面，兼顾清晰度与流畅度。':'Default: retains the original visuals and balances clarity with smooth performance.',
  '更细腻的阴影、接触阴影与表面粗糙度细节，适合性能较强的设备。':'Finer shadows, contact shading and surface roughness detail for more powerful devices.',
  "通透模式":"Transcendent",
  "生命与体力":"Health and stamina",
  "奶蛙警觉与状态":"Naiwa alertness and status",
  "疾跑体力":"Sprint stamina",
  "20.0 / 20.0 秒":"20.0 / 20.0 s",
  "{current} / {max} 秒":"{current} / {max} s",
  "疾跑速度为普通行走的 1.7 倍，手机可按住疾跑按钮。蓝色体力条上限固定为 20，非疾跑时每秒恢复当前生命值 ÷ 25；耗尽后松开疾跑键再按可重新疾跑。进食或饮用期间，移动速度仍为当前速度的 30%。":"Sprint at 1.7 times walking speed, or hold the sprint button on phones. Blue stamina always caps at 20. When not sprinting, recover current health ÷ 25 per second. After exhaustion, release and press sprint again. Eating and drinking still reduce the current movement speed to 30%.",
  "警觉达到 100 进入通透模式，极限模式默认开启：奶蛙失去视觉，5 米内靠嗅觉发现玩家，蹲下和藏身也无法避开；任何远处声音都能引起注意，蹲行无脚步声，投掷物可诱导。通透移速为 6.2 米/秒，正面格挡概率 50%，可穿越任何完好或破碎的窗户及栅栏，也能从二楼窗户翻出，但不能穿普通墙体。拿到断线钳后，通透奶蛙将持续知道玩家位置。":"At 100 alertness, enter Transcendent mode, the default on Hacker. Naiwa is blind but smells you within 5 metres, even while crouching or hiding. Any distant sound attracts it; crouching is silent, and thrown items can distract it. It moves at 6.2 m/s, blocks 50% of frontal hits, and passes through intact or broken windows and fences, including exits from upper-floor windows, while ordinary walls still block it. Once you collect the bolt cutters, Transcendent Naiwa always knows your position.",

  "被奶蛙抱住，失去 {damage} 点生命。你已回到地下室起点，剩余生命 {health}。简单模式保留后门钥匙、其他物品和场景状态，醒来后奶蛙警觉值降低 10。":"Naiwa caught you, costing {damage} health. You are back at the basement start with {health} health. Easy keeps the back door key, other items and world progress. Waking lowers alertness by 10.",
  "北侧逃生栅栏":"North escape fence",
  "先阅读正门密码线索。二楼有线索。":"Read the front door code clue first. There is a clue upstairs.",
  "先用工具箱钥匙开箱，拿到里面的断线钳。":"Use the tool chest key to open the chest and collect its bolt cutters first.",
  "先持后门钥匙通过后门，或打碎二楼大窗进入后院。":"Reach the rear yard through the back door with its key, or through the shattered upstairs escape window first.",
  "选中断线钳，对准北侧逃生栅栏按右键。":"Equip the bolt cutters, aim at the north escape fence and right-click.",
  "靠近并对准北侧逃生栅栏，再按右键剪开。":"Move closer, aim at the north escape fence and right-click to cut it.",
  "栅栏已剪开，穿过缺口跑到庭院外！":"The fence is cut. Run through the gap and out of the estate!",
  "点按 · 剪开栅栏":"Tap · Cut fence",
  "右键 · 剪开栅栏":"Right-click · Cut fence",
  "剪栅栏":"Cut fence",
  "逃脱成功 · 游戏胜利":"Escaped · Victory",
  "你记住了密码，拿到断线钳，进入后院并剪开栅栏，成功逃出古堡！":"You learned the code, collected the bolt cutters, reached the rear yard and cut the fence. You escaped the castle!",
  "被奶蛙抱住，失去 {damage} 点生命。你已回到地下室起点，剩余生命 {health}。后门钥匙被奶蛙没收并重新挂回腰间；其他物品和场景状态保留，醒来后奶蛙警觉值降低 10。":"Naiwa caught you, costing {damage} health. You are back at the basement start with {health} health. Naiwa reclaimed the back door key and hung it on its waist. Other items and world progress remain; waking lowers alertness by 10.",
  "通关：先阅读正门密码线索，用工具箱钥匙开箱拿到断线钳，再持后门钥匙通过后门，或打碎二楼大窗进入后院。选中断线钳，对准北侧指定栅栏按右键剪开，穿过缺口跑到庭院外即可获胜。手机可点按“剪栅栏”。":"To escape: read the front door code clue, unlock the tool chest with its key and collect the bolt cutters. Reach the rear yard through the back door with its key, or shatter the large upstairs window. Equip the cutters, aim at the marked north fence and right-click. Run through the gap and out of the estate to win. On phones, tap Cut fence.",
  "简单模式晕厥保留后门钥匙；普通、困难和极限模式每次被奶蛙抓晕，后门钥匙都会被收回并重新挂在奶蛙腰间；地上丢下的这把钥匙也会被收走。醒来后需要重新打倒奶蛙取钥匙，或改走破窗路线。密码、工具箱、断线钳与剪开的栅栏保留。":"Easy keeps the back door key after capture. On Normal, Hard and Hacker, capture returns it to Naiwa’s waist, including a key dropped on the ground. Knock Naiwa down again to retake it, or use the window route. The code, tool chest, bolt cutters and cut fence stay as they were.",

  "大门密码锁":"Front door keypad",
  "四位数字密码":"Four-digit code",
  "数字键盘":"Numeric keypad",
  "删除":"Delete",
  "确认":"Confirm",
  "返回探索":"Return to exploration",
  "大门密码纸条":"Front door code note",
  "大门密码":"Front door code",
  "每次进出都要输入，记得带好线索。":"Enter it each time you open the door. Remember the code.",
  "每次开启大门都需输入本局四位密码，开启 5 秒后自动关闭。二楼有线索。":"Enter this run’s four-digit code every time you open the front door. It closes automatically after 5 seconds. There is a clue upstairs.",
  "请输入四位数字。":"Enter four digits.",
  "密码错误，请重试。":"Incorrect code. Try again.",
  "大门已开启，5 秒后自动关闭。":"Front door opened. It closes automatically after 5 seconds.",
  "{key} · 放大查看密码纸条":"{key} · Read code note",
  "{key} · 输入大门密码":"{key} · Enter front door code",
  "正门每次开启都需输入本局随机四位密码，开启 5 秒后自动关闭。二楼有线索；找到纸条后，对准按 E 放大查看。前后院由栅栏分隔，工具棚在较大的前院。简单模式的工具箱钥匙固定在马桶里；其他难度随机藏在一层或二层的抽屉、小柜子里，不会与密码纸条同格。":"Opening the front door requires this run’s random four-digit code every time. It closes automatically after 5 seconds. There is a clue upstairs. Aim at the note once found and press E to read it. Fences separate the yards; the shed is in the larger front yard. On Easy, the tool chest key is always in the toilet. Other difficulties hide it in a random ground- or upper-floor drawer or small cabinet, never in the same compartment as the note.",
  "已开智奶蛙格挡正面攻击的概率为 25%，唐王模式为 40%。未开智时不会格挡攻击。":"Nerd Naiwa blocks frontal attacks with a 25% chance; Ninja mode has a 40% chance. Fool Naiwa does not block attacks.",

  '后门钥匙挂在奶蛙腰间，仅倒地时可按 E 拿走；持有时可按 E 反复开关厨房后门，不消耗。奶蛙不需要钥匙，通过自己打开的门后会关门。':'The back door key hangs from Naiwa’s waist. Press E to take it only while Naiwa is knocked down. Keep it in your inventory to repeatedly open or close the kitchen back door with E. Naiwa needs no key and closes doors after passing through.',
  '阳台右侧花瓶可拾取和投掷，命中奶蛙造成 9 点基础伤害，命中时碎裂则为 10 点；用力投掷也能砸碎窗户。':'Pick up and throw the vase on the right of the balcony. It deals 9 base damage to Naiwa, or 10 if it shatters on impact. Hard throws can also break windows.',
  '工具箱钥匙不能右键投掷。选中工具箱钥匙，对准对应箱锁按右键插入；钥匙永久留在锁上，之后按 E 开关箱子。手机点按“插入钥匙”。':'The tool chest key cannot be thrown with right-click. Select it, aim at its matching chest lock and right-click to insert it permanently. Use E to open or close afterward. On phones, tap Insert key.',
  '后门钥匙':'Back door key', '阳台花瓶':'Balcony vase', '使用钥匙':'Use key',
  '奶蛙倒地时才能拿走腰间的后门钥匙。':'You can only take the key from Naiwa’s waist while it is knocked down.',
  '拿到了后门钥匙，持有时按 E 开关后门，钥匙可重复使用。':'You took the back door key. Keep it in your inventory and press E to open or close the back door. It is reusable.',
  '靠近并对准奶蛙腰间的钥匙再按 E。':'Move closer, aim at the key on Naiwa’s waist and press E.',
  '厨房后门需要后门钥匙；奶蛙倒地时可拿走它腰间的钥匙。':'The kitchen back door needs its key. Take it from Naiwa’s waist while it is knocked down.',
  '后门钥匙可重复使用，持有时按 E 开关厨房后门。':'The back door key is reusable. Keep it in your inventory and press E to open or close the kitchen back door.',
  '{key} · 拿走后门钥匙':'{key} · Take back door key',
  '{key} · 需要后门钥匙 · {item}':'{key} · Back door key required · {item}',
  '重新开始并重选难度':'Restart and choose difficulty',
  '本局难度已锁定。重新开始后可重新选择。':'Difficulty is locked for this run. Restart to choose again.',
  '难度仅能在开局前选择，开始后本局锁定。':'Choose a difficulty before starting. It stays locked for the run.',
  '插入钥匙':'Insert key',
  '选中工具箱钥匙，对准箱锁按右键插入，再按 E 开关箱子。':'Select the tool chest key, aim at its lock and right-click to insert it. Then press E to open or close the chest.',
  '钥匙已插在箱锁上，永久保留；按 E 开关箱子。':'The key stays permanently in the lock. Press E to open or close the chest.',
  '钥匙不能投掷。对准附近对应的箱锁按右键插入。':'Keys cannot be thrown. Aim at the matching nearby chest lock and right-click to insert the key.',
  '点按“插入钥匙”解锁{item}':'Tap Insert key to unlock {item}',
  '右键 · 插入钥匙 · {item}':'Right-click · Insert key · {item}',
  '先选中钥匙 · {item}':'Select the key first · {item}',
  '难度会影响奶蛙倒地所需的伤害与倒地时长，每局首次倒地额外延长 2 秒。物品的基础伤害等于其增加的警觉值；成功格挡不扣生命。':'Difficulty changes the damage needed to knock Naiwa down and how long it stays down. The first knockdown in each run lasts 2 seconds longer. An item’s base damage equals its alertness increase; a successful block prevents health damage.',
  '钥匙不能右键投掷。选中钥匙，对准对应箱锁按右键插入；钥匙永久留在锁上，之后按 E 开关箱子。手机点按“插入钥匙”。':'Keys cannot be thrown with right-click. Select a key and aim at its matching chest lock, then right-click to insert it permanently. Use E to open or close the chest afterward. On phones, tap Insert key.',
  '进食进度':'Consumption progress', '进食':'Eat', '饮用':'Drink', '挣扎':'Struggle',
  '果酱':'Jam', '酒':'Wine',
  '{item}（空）':'{item} (Empty)',
  'G · 进食／饮用':'G · Eat / Drink', '当前物品不能食用。':'You cannot consume this item.', '鸡蛋不能食用。':'You cannot eat eggs.',
  '点按进食／饮用':'Tap Eat / Drink',
  '包装已经空了。':'The container is empty.', '被抱住时先反击或挣脱！':'Fight back or break free before consuming anything!',
  '正在吃{item} · {time} 秒':'Eating {item} · {time}s', '正在喝{item} · {time} 秒':'Drinking {item} · {time}s',
  '吃完{item}，恢复 {healed} 点生命。':'Finished {item}. Restored {healed} health.',
  '喝完{item}，效果已生效。':'Finished {item}. Its effect is now active.',
  '生命恢复 {healed}，当前 {health}。':'Restored {healed} health; now at {health}.',
  '牛奶抗性 · 所有伤害减半 · {time} 秒':'Milk resistance · All damage halved · {time}s',
  '酒劲 · 伤害 +50% · 移速 80% · {time} 秒':'Wine · +50% damage · 80% movement speed · {time}s',
  '挣扎剩余 {time} 秒 · 连续点跳或反击':'{time}s to struggle · Tap Jump repeatedly or fight back',
  '奶蛙抱住了你！1.5 秒内反击，或连续点跳挣脱！':'Naiwa is holding you! You have 1.5 seconds to fight back or tap Jump repeatedly to break free!',
  '你挣脱了奶蛙，快跑！':'You broke free of Naiwa. Run!',
  '被抓基础扣血 {damage}；开局警觉 {alertness}。醒来后警觉 -10。':'Base capture cost: {damage} HP. Starting alertness: {alertness}. Waking lowers alertness by 10.',
  '难度影响被抓晕厥扣血与开局警觉。':'Difficulty changes capture damage and starting alertness.',
  '选中食物按 G 进食，每份需要 1.5 秒；鸡蛋不能吃。番茄、苹果回 3 点生命，果酱回 4 点，面包、芝士回 5 点。牛奶使所有伤害减半，持续 15 秒；酒使对奶蛙的伤害提高 50%、移动速度降至 80%，持续 20 秒。效果显示在右上角。牛奶、果酱、酒用完保留空包装，仍可投掷，伤害比满装少 1。':'Select food and press G to consume it in 1.5 seconds. Eggs cannot be eaten. Tomatoes and apples restore 3 health, jam 4, and bread and cheese 5. Milk halves all incoming damage for 15 seconds. Wine increases damage to Naiwa by 50% and reduces movement speed to 80% for 20 seconds. Active effects appear at the top right. Milk, jam and wine leave empty containers that can still be thrown, dealing 1 less damage than when full.',
  '困难模式开局警觉 30，极限模式开局警觉 100。未开智奶蛙被软食物砸中也会踉跄；未开智时被抱住，有 1.5 秒反击或连续点跳挣脱的机会。':'Hard starts with 30 alertness; Hacker starts with 100. Soft food also staggers Fool. If Fool grabs you, you have 1.5 seconds to fight back or tap Jump repeatedly for a chance to escape.',
  '奶蛙追捕 · 暮色古堡':'Naiwa Escape · Castle at Dusk',
  '奶蛙追捕：暮色古堡':'Naiwa Escape: Castle at Dusk',
  '奶蛙追捕：双层别墅、地下室与铁栅栏庭院的3D地图原型。':'Explore a two-storey castle, its basement and fenced garden while evading Naiwa.',
  '← 返回主页':'← Home', '拖动旋转 · 滚轮缩放 · 右键平移':'Drag to rotate · Scroll to zoom · Right-drag to pan',
  '3D别墅地图':'3D castle map',
  '3D城堡：WASD移动、按住R疾跑、Shift下蹲、空格跳跃、E拾取或放置及开关柜门、撬棍左键挥击、右键投掷或开关手电、Q丢弃、数字1至7切换物品、Esc暂停':'3D castle: WASD to move, hold R to sprint, Shift to crouch, Space to jump, E to pick up, place or interact, left click to swing the crowbar, right click to throw or toggle the flashlight, Q to drop, 1–7 to select an item, Esc to pause',
  '进入探索':'Explore', '暂停':'Pause', '北':'N', '生命与奶蛙警觉':'Health and Naiwa alertness',
  '生命值':'Health', '奶蛙警觉':'Naiwa alertness', '未开智':'Fool', '已开智':'Nerd', '唐王模式':'Ninja', '唐王':'Ninja',
  '地图楼层':'Map floors', '全景':'Overview', '地下室':'Basement', '一层':'Ground floor', '二层':'Upper floor', '庭院':'Garden',
  '重置视角':'Reset view', '七格物品栏':'Seven-slot inventory', '挥击':'Strike', '使用':'Use', '丢弃':'Drop',
  '移动摇杆':'Movement stick', '按住蹲下':'Hold to crouch', '按住疾跑':'Hold Sprint', '跳跃':'Jump',
  '疾跑速度为普通行走的 1.5 倍；手机按住“按住疾跑”按钮。进食或饮用期间，移动速度降至当前行走、疾跑或蹲行速度的 30%。':'Sprint is 1.5 times normal walking speed. On phones, hold the Sprint button. While eating or drinking, movement is reduced to 30% of your current walking, sprinting or crouching speed.',
  '第一人称探索原型 · 从地下室走向庭院':'First-person exploration · From the basement to the garden',
  '更新内容':'What’s new', '探索已暂停':'Exploration paused', '音效':'Sound effects',
  '开启环境与动作音效':'Environment and action sounds', '音量':'Volume', '脚步轻声播放，蹲行无声。':'Footsteps are quiet. Crouch-walking is silent.',
  '继续探索':'Resume exploration', '查看地图':'View map', '回到地下室起点':'Return to the basement start',
  '你晕了过去':'You passed out', '醒来继续':'Wake up and continue', '重新开始':'Restart', '生命耗尽 · 游戏结束':'No health left · Game over',
  '生命值已归零。重新开始会重置生命、警觉、物品和本次探索进度。':'Your health has reached zero. Restarting resets health, alertness, items and progress in this escape run.',
  '被奶蛙抱住，失去 {damage} 点生命。你已回到地下室起点，剩余生命 {health}。物品和场景状态保留；醒来后奶蛙警觉值降低 10。':'Naiwa caught you, costing {damage} health. You are back at the basement start with {health} health. Items and world changes are retained. Waking up lowers Naiwa’s alertness by 10.',
  '被抓后按当前难度扣血并回到起点；醒来后奶蛙警觉值降低 10。':'Being caught costs health according to difficulty and returns you to the start. Waking up lowers Naiwa’s alertness by 10.',
  '游戏难度':'Difficulty', '简单模式':'Easy', '普通模式':'Normal', '困难模式':'Hard', '极限模式':'Hacker',
  '仅影响被抓晕厥的生命损失，其他规则相同。':'Only the health cost of being caught changes. All other rules are the same.',
  '被抓晕厥扣除 {damage} 点生命；醒来后奶蛙警觉值 -10。':'Being caught costs {damage} health. Waking up reduces Naiwa’s alertness by 10.',
  '{mode} · 被抓 -{damage}':'{mode} · Caught: −{damage} HP',
  '简单模式（Easy）':'Easy', '普通模式（Normal）':'Normal', '困难模式（Hard）':'Hard', '极限模式（Hacker）':'Hacker',
  'WASD / 方向键移动，按住 R 疾跑，Shift 下蹲，空格跳跃。E 对准物品拾取、开关门柜，或将选中物品放在准星指向的有效平面；Q 丢弃。右键投掷物品，手电筒仍为开关。装备撬棍后左键挥击，可打碎易碎物和二楼后院侧的大窗，跳过窗台离开别墅。工具箱需要对应钥匙打开。瓷器与玻璃更耐轻碰，强撞击仍会碎；鸡蛋比较脆弱。手机可点按提示和“挥击”操作。':'Move with WASD or the arrow keys, hold R to sprint, crouch with Shift and jump with Space. Aim and press E to pick up items, operate doors and cupboards, or place the selected item on a valid surface. Q drops an item. Right click throws items or toggles the flashlight. With the crowbar equipped, left click to strike fragile objects or the large upstairs window facing the rear garden. Jump over its sill to leave the castle. Find the matching key to open the tool chest. Ceramics and glass withstand light knocks but shatter on hard impacts; eggs are fragile. On phones, tap the interaction prompt or Strike.',
  '靠近床按 E 躲进床底，藏好后无法移动和跳跃，再按 E 出来。窗户只能用撬棍连续敲击或用酒瓶、撬棍用力投掷破坏；小窗保留窄格栏杆，只有大窗可以翻出。':'Approach a bed and press E to hide underneath. You can look around, but cannot move or jump until you press E to leave. Break windows with repeated crowbar strikes or hard throws of a bottle or crowbar. Small windows retain narrow bars; only the large window is passable.',
  '左下角显示生命与疾跑体力，右上角显示奶蛙警觉值。举砸命中扣 6 点生命；落差超过 3 米会摔伤，二楼窗口落入后院约扣 8 点。被抓晕厥按所选难度扣血并回起点，醒来后奶蛙警觉值降低 10；生命耗尽则游戏结束。攻击与附近破碎会提高警觉：30 起已开智，会概率格挡正面来袭；70 起唐王模式，追赶更快、感知更敏锐。照亮奶蛙双眼附近可使普通阶段移速降至 50%、唐王模式降至 75%。站在床上也可能被俯身拽下来。':'The lower-left HUD shows health and sprint stamina; Naiwa’s alertness is in the upper right. A fist slam costs 6 health. Drops over 3 metres cause fall damage; landing in the rear garden from the upstairs window costs about 8. Being caught costs health according to difficulty and returns you to the start; waking up lowers Naiwa’s alertness by 10. Zero health ends the run. Attacks and nearby breakage increase alertness. At 30, Naiwa becomes a Nerd and may block frontal attacks. At 70, Ninja mode brings faster pursuit and sharper senses. Shining the flashlight around both eyes slows Fool and Nerd to 50% speed, or Ninja to 75%. Naiwa may lean forward and pull you off a bed.',
  '完整庭院 · 地下室 · 两层别墅':'Garden · Basement · Two-storey castle',
  '地下室 · 玩家起点与维修间':'Basement · Starting room and workshop',
  '一层 · 门厅、书房、厨房后门':'Ground floor · Hall, study and kitchen back door',
  '二层 · 主卧、客房与阳台':'Upper floor · Bedrooms and balcony',
  '庭院 · 工具棚与北侧铁栅栏':'Garden · Tool shed and north fence',
  '摇杆移动 · 按住疾跑 · 滑动转头 · 对准物品点按拾取 / 放置 · 装备撬棍可点挥击':'Stick to move · Hold Sprint · Swipe to look · Aim and tap to pick up or place · Equip the crowbar to Strike',
  'WASD 移动 · 按住 R 疾跑 · Shift 下蹲 · 空格跳跃 · E 拾取 / 开关 / 放置 · 撬棍左键挥击 · 右键投掷（手电开关） · Q 丢弃 · 1–7 物品栏 · M 地图':'WASD Move · Hold R to Sprint · Shift Crouch · Space Jump · E Pick up / Interact / Place · Left click Swing crowbar · Right click Throw / Toggle flashlight · Q Drop · 1–7 Inventory · M Map',
  '移动鼠标转头，点击画面可锁定鼠标 · {help}':'Move the mouse to look; click the scene to lock the pointer · {help}',
  '被举砸命中':'Hit by a fist slam', '高处摔落':'Fell from a height', '被奶蛙抱住':'Caught by Naiwa', '被飞来的椅子撞中':'Hit by a flying chair', '受伤':'Injured',
  '{cause}，生命值减少 {damage}，剩余 {health}。':'{cause}. Lost {damage} health; {health} remaining.',
  '物品栏第{slot}格：{item}':'Inventory slot {slot}: {item}', '空':'Empty',
  '关闭手电':'Turn flashlight off', '打开手电':'Turn flashlight on', '投掷':'Throw',
  '床边暂时被挡住，换个时机再按 E 出来。':'The bedside exit is blocked. Try pressing E again when it is clear.',
  '已躲在床底，无法移动；按 E 出来。':'Hidden under the bed. Movement is disabled; press E to leave.',
  '已放置{item}。':'Placed {item}.', '已投出{item}。':'Threw {item}.', '{item}已丢下，靠近后按 E 拾取。':'Dropped {item}. Approach and press E to pick it up.',
  '对准附近的桌面、地面或层架空位再按 E 放置。':'Aim at a clear nearby table, floor or shelf and press E to place the item.',
  '物品栏已满，先丢下一件物品。':'Inventory full. Drop an item first.',
  '工具箱上了锁，需要找到对应的钥匙。':'The tool chest is locked. Find its matching key.',
  '工具箱已解锁，里面有一把断线钳。':'Tool chest unlocked. There are bolt cutters inside.',
  '先离开门口，再关门。':'Step clear of the doorway before closing the door.',
  '这里空间不足，后退一点再投掷。':'Not enough room to throw. Step back and try again.',
  '这里空间不足，后退一点再丢弃。':'Not enough room to drop the item. Step back and try again.',
  '大窗已打碎，可以跳过窗台进入后院。':'The large window is broken. Jump over the sill into the rear garden.',
  '小窗玻璃已打碎，窄格栏杆无法翻越。':'The small window is broken, but its narrow bars still block the way.',
  '击碎了眼前的物品。':'The object shattered.', '窗玻璃出现裂痕，还需要再敲击。':'The glass is cracked. Strike it again.',
  '撬棍击中了目标。':'The crowbar hit its target.', '挥动撬棍。':'Swung the crowbar.',
  '点按':'Tap', '{key} · 拾取{item}':'{key} · Pick up {item}', '{key} · {action}{item}':'{key} · {action} {item}',
  '打开':'Open', '关闭':'Close', '{key} · 躲进床底':'{key} · Hide under the bed', '{key} · 离开床底':'{key} · Leave the bed',
  '{key} · 用钥匙打开{item}':'{key} · Unlock {item}', '{key} · 需要钥匙 · {item}':'{key} · Key required · {item}',
  '请让开{item} · {key} 反向开关':'Move clear of {item} · {key} Reverse direction', '门扇':'the door',
  '{key} · 放置{item}':'{key} · Place {item}', '床底 · 已藏好 · E 出来':'Under the bed · Hidden · E to leave',
  '衣柜内 · 已藏好':'Inside wardrobe · Hidden', '衣柜内 · 柜门未关':'Inside wardrobe · Doors open', '{floor} · 自由探索':'{floor} · Exploring',
  '奶蛙正在巡逻':'Naiwa is patrolling', '奶蛙发现了你！':'Naiwa spotted you!', '奶蛙正在附近搜寻':'Naiwa is searching nearby',
  '奶蛙被击中，暂时踉跄':'Naiwa is staggering', '奶蛙暂时倒地':'Naiwa is knocked down',
  '奶蛙伸手抓你，快躲开！':'Naiwa is reaching for you. Get away!', '奶蛙抓到了你':'Naiwa caught you',
  '奶蛙高举右拳，快避开！':'Naiwa is raising a fist. Dodge!', '奶蛙伸出右手，快避开！':'Naiwa is reaching out. Dodge!',
  '奶蛙高举左脚，快避开！':'Naiwa is raising his left foot. Dodge!', '奶蛙伸出左脚，快避开！':'Naiwa is reaching out with his left foot. Dodge!',
  '奶蛙用左脚抓你，快躲开！':'Naiwa is grabbing you with his left foot. Get away!', '奶蛙用左脚砸开挡路的椅子！':'Naiwa is striking the chair with his left foot!',
  '奶蛙用左脚抓住了你，无法跳跃！快反击！':'Naiwa has caught you with his left foot. You cannot jump. Fight back!',
  '奶蛙正在打开衣柜搜查':'Naiwa is checking the wardrobe', '奶蛙双手撑地，正在查看床底':'Naiwa is looking under the bed',
  '奶蛙伸出右手抓向床底！':'Naiwa is reaching under the bed!', '奶蛙正在从地上起身':'Naiwa is getting up',
  '奶蛙抬脚踹开挡路的椅子！':'Naiwa is kicking the chair away!',
  '奶蛙抱住了你，无法跳跃！快反击！':'Naiwa is holding you. You cannot jump. Fight back!',
  '奶蛙注意到了手电光，正在寻找来源！':'Naiwa noticed the flashlight and is looking for its source!',
  '奶蛙':'Naiwa', '手电筒':'Flashlight', '瓷盘':'Porcelain plate', '瓷碗':'Porcelain bowl', '陶瓷杯':'Ceramic cup',
  '玻璃酒杯':'Wine glass', '金属叉':'Fork', '餐刀':'Table knife', '鸡蛋':'Egg', '苹果':'Apple', '番茄':'Tomato',
  '面包':'Bread', '奶酪':'Cheese', '牛奶':'Milk', '果酱罐':'Jam jar', '酒瓶':'Wine bottle', '撬棍':'Crowbar',
  '断线钳':'Bolt cutters', '工具箱钥匙':'Tool chest key', '工具箱':'Tool chest', '后院侧大窗':'Large rear window', '玻璃窗':'Window',
  '北侧剪栅栏点':'North fence · Cutting point', '工具棚 · 断线钳':'Tool shed · Bolt cutters', '主别墅':'Main castle',
  '旧储藏间 · 起点':'Old storeroom · Start', '酒窖':'Wine cellar', '锅炉房':'Boiler room', '维修间':'Workshop',
  '门厅':'Entrance hall', '书房':'Study', '中央走廊':'Central hallway', '餐厅':'Dining room', '厨房 · 后门':'Kitchen · Back door',
  '主卧':'Main bedroom', '二层走廊':'Upper hallway', '客房':'Guest room', '浴室':'Bathroom', '楼梯厅':'Stair hall',
  '工具棚门':'Tool shed door', '厨房后门':'Kitchen back door', '城堡双开大门':'Castle double doors', '阳台门':'Balcony door',
  '主卧门':'Main bedroom door', '客房门':'Guest room door', '卫生间门':'Bathroom door', '衣柜':'Wardrobe', '床底':'Under the bed',
  '床头柜下层抽屉':'Lower nightstand drawer', '床头柜上层抽屉':'Upper nightstand drawer',
  '厨房左柜':'Left kitchen cupboard', '厨房右柜':'Right kitchen cupboard', '厨房柜':'Kitchen cupboard',
  '书桌左抽屉':'Left desk drawer', '书桌右抽屉':'Right desk drawer', '冰箱':'Refrigerator',
});

let language='zh';
const listeners=new Set();
export const escapeLanguage=()=>language;
export function initEscapeLanguage() {
  let saved;try{saved=globalThis.localStorage?.getItem('naiwa-language-override-v1');}catch{}
  const query=new URLSearchParams(globalThis.location?.search??'').get('lang');
  const system=(globalThis.navigator?.languages?.[0]??globalThis.navigator?.language??'zh').toLowerCase().startsWith('zh')?'zh':'en';
  language=['zh','en'].includes(query)?query:['zh','en'].includes(saved)?saved:system;
  return language;
}
export function setEscapeLanguage(next) {
  if(!['zh','en'].includes(next)||next===language)return;
  language=next;try{globalThis.localStorage?.setItem('naiwa-language-override-v1',next);}catch{}
  for(const listener of listeners)listener(next);
}
export function onEscapeLanguageChange(listener){listeners.add(listener);return ()=>listeners.delete(listener);}
export function tr(source,params={},locale=language) {
  let text=source;
  if(locale==='en') {
    text=escapeEnglish[source];
    if(text===undefined) {
      const kitchen=/^(厨房左柜|厨房右柜|厨房柜)第(\d+)格(柜门|抽屉)$/.exec(source);
      const slot=/^物品栏第(\d+)格：(.*)$/.exec(source);
      text=kitchen?`${escapeEnglish[kitchen[1]]} ${kitchen[3]==='抽屉'?'drawer':'door'} ${kitchen[2]}`:
        slot?`Inventory slot ${slot[1]}: ${tr(slot[2],{},locale)}`:source;
    }
  }
  return text.replace(/\{(\w+)\}/g,(match,key)=>params[key]??match);
}

// Register original authored text once. Updating text nodes preserves control
// listeners, focus, inventory, physical world and the current play session.
export function bindEscapeDocument(root=document) {
  const texts=[],attributes=[],walker=document.createTreeWalker(root,4);
  while(walker.nextNode()) {
    const node=walker.currentNode,source=node.nodeValue.trim();
    if(/[\u3400-\u9fff]/.test(source)&&!node.parentElement?.closest('script,style'))texts.push({node,source,prefix:node.nodeValue.match(/^\s*/)[0],suffix:node.nodeValue.match(/\s*$/)[0]});
  }
  for(const node of root.querySelectorAll('[aria-label], [title], meta[name="description"]'))for(const attr of ['aria-label','title','content']) {
    const source=node.getAttribute(attr);if(source&&/[\u3400-\u9fff]/.test(source))attributes.push({node,attr,source});
  }
  const update=()=>{document.documentElement.lang=language==='zh'?'zh-CN':'en';texts.forEach(({node,source,prefix,suffix})=>{node.nodeValue=prefix+tr(source)+suffix;});attributes.forEach(({node,attr,source})=>node.setAttribute(attr,tr(source)));};
  update();return onEscapeLanguageChange(update);
}

export function itemLabel(item){return item?item.empty?tr('{item}（空）',{item:tr(item.name)}):tr(item.name):tr('空');}
export function foodLabel(item){return tr(item?.kind==='jar'?'果酱':item?.kind==='bottle'?'酒':item?.name??'空');}
