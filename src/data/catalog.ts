export type RebindSection = 'Gameplay' | 'AnimalFocus' | 'LucidRush' | 'Menus' | 'Car';

export type BindFamily = 'Gamepad' | 'KeyboardMouse';

export type GamepadType = 'PlayStation' | 'Xbox';

export type AssetName = 'Malbers Inputs' | 'InputSystem_Actions' | 'VehicleInputActions';

export interface RebindEntryDef {
  key: string;
  section: RebindSection;
  labelEn: string;
  labelRu: string;
  noteEn?: string;
  noteRu?: string;
  asset: AssetName;
  map: string;
  action: string;
  compositePart: string;
  linkedCompositePart: string;
  gamepadReadOnly: boolean;
  keyboardReadOnly: boolean;
  defaultKbm: string;
  defaultPad: string;
  defaultPadInteractions?: string;
  hasTouchpadAlias?: boolean;
}

export interface FixedCalloutDef {
  part: string;
  labelEn: string;
  labelRu: string;
}

export const SECTION_ORDER: RebindSection[] = [
  'Gameplay',
  'AnimalFocus',
  'LucidRush',
  'Menus',
  'Car',
];

export const SECTION_TITLES: Record<RebindSection, { en: string; ru: string; subtitleRu: string; subtitleEn: string }> = {
  Gameplay: {
    en: 'GAMEPLAY',
    ru: 'ГЕЙМПЛЕЙ (ПЕШКОМ)',
    subtitleRu: 'Основные действия персонажа, бой и перемещение',
    subtitleEn: 'Core character movement, combat and exploration',
  },
  AnimalFocus: {
    en: 'ANIMAL FOCUS',
    ru: 'ФОКУС НА ЖИВОТНОМ',
    subtitleRu: 'Действия при удержании кнопки фокуса (L1 / Z)',
    subtitleEn: 'Actions while holding Animal Focus (L1 / Z)',
  },
  LucidRush: {
    en: 'LUCID RUSH',
    ru: 'LUCID RUSH (QTE)',
    subtitleRu: 'Быстрые реакции во время комбо и рывков',
    subtitleEn: 'Quick time directional prompts during rush sequences',
  },
  Menus: {
    en: 'MENUS',
    ru: 'МЕНЮ И ИНТЕРФЕЙС',
    subtitleRu: 'Быстрый доступ к дневнику, винилу, колесу оружия и диалогам',
    subtitleEn: 'Journal, vinyl collection, weapon wheel and dialogue',
  },
  Car: {
    en: 'CAR',
    ru: 'АВТОМОБИЛЬ',
    subtitleRu: 'Управление транспортом и дрифт-QTE',
    subtitleEn: 'Vehicle physics controls and drift QTEs',
  },
};

export const FIXED_CALLOUTS: FixedCalloutDef[] = [
  { part: 'leftStick', labelEn: 'Move', labelRu: 'Движение' },
  { part: 'rightStick', labelEn: 'Look around', labelRu: 'Обзор камерой' },
  { part: 'start', labelEn: 'Pause menu', labelRu: 'Меню паузы' },
];

/**
 * Exact 39 entries from Assets/Scripts/Configs/RebindCatalog.asset
 * matched with Malbers Inputs.inputactions, InputSystem_Actions.inputactions,
 * and VehicleInputActions.inputactions.
 */
export const REBIND_CATALOG: RebindEntryDef[] = [
  // ================= SECTION 0: GAMEPLAY =================
  {
    key: 'jump',
    section: 'Gameplay',
    labelEn: 'Jump',
    labelRu: 'Прыжок',
    asset: 'Malbers Inputs',
    map: 'Gameplay',
    action: 'Jump',
    compositePart: '',
    linkedCompositePart: 'UpDown/positive',
    gamepadReadOnly: false,
    keyboardReadOnly: false,
    defaultKbm: '<Keyboard>/space',
    defaultPad: '<Gamepad>/buttonSouth',
  },
  {
    key: 'crouch',
    section: 'Gameplay',
    labelEn: 'Crouch',
    labelRu: 'Присесть',
    noteEn: 'toggle',
    noteRu: 'перекл.',
    asset: 'Malbers Inputs',
    map: 'Gameplay',
    action: 'Crouch',
    compositePart: '',
    linkedCompositePart: 'UpDown/negative',
    gamepadReadOnly: false,
    keyboardReadOnly: false,
    defaultKbm: '<Keyboard>/c',
    defaultPad: '<Gamepad>/dpad/down',
  },
  {
    key: 'sprint',
    section: 'Gameplay',
    labelEn: 'Sprint',
    labelRu: 'Спринт (Бег)',
    noteEn: 'L3 toggle / Shift hold',
    noteRu: 'нажатие стика',
    asset: 'Malbers Inputs',
    map: 'Gameplay',
    action: 'Sprint',
    compositePart: '',
    linkedCompositePart: '',
    gamepadReadOnly: false,
    keyboardReadOnly: false,
    defaultKbm: '<Keyboard>/shift',
    defaultPad: '<Gamepad>/leftStickPress',
  },
  {
    key: 'speed_up',
    section: 'Gameplay',
    labelEn: 'Speed up',
    labelRu: 'Ускорить шаг',
    asset: 'Malbers Inputs',
    map: 'Gameplay',
    action: 'SpeedUp',
    compositePart: '',
    linkedCompositePart: '',
    gamepadReadOnly: false,
    keyboardReadOnly: false,
    defaultKbm: '<Keyboard>/2',
    defaultPad: '',
  },
  {
    key: 'speed_down',
    section: 'Gameplay',
    labelEn: 'Slow down',
    labelRu: 'Замедлить шаг',
    asset: 'Malbers Inputs',
    map: 'Gameplay',
    action: 'SpeedDown',
    compositePart: '',
    linkedCompositePart: '',
    gamepadReadOnly: false,
    keyboardReadOnly: false,
    defaultKbm: '<Keyboard>/1',
    defaultPad: '',
  },
  {
    key: 'interact',
    section: 'Gameplay',
    labelEn: 'Interact',
    labelRu: 'Взаимодействие',
    asset: 'Malbers Inputs',
    map: 'Gameplay',
    action: 'Interact',
    compositePart: '',
    linkedCompositePart: '',
    gamepadReadOnly: false,
    keyboardReadOnly: false,
    defaultKbm: '<Keyboard>/e',
    defaultPad: '<Gamepad>/buttonNorth',
  },
  {
    key: 'dodge',
    section: 'Gameplay',
    labelEn: 'Dodge',
    labelRu: 'Уклонение / Рывок',
    asset: 'Malbers Inputs',
    map: 'Gameplay',
    action: 'Ability1',
    compositePart: '',
    linkedCompositePart: '',
    gamepadReadOnly: false,
    keyboardReadOnly: false,
    defaultKbm: '<Keyboard>/q',
    defaultPad: '<Gamepad>/buttonEast',
  },
  {
    key: 'attack',
    section: 'Gameplay',
    labelEn: 'Attack',
    labelRu: 'Атака / Выстрел',
    asset: 'Malbers Inputs',
    map: 'Gameplay',
    action: 'Action1',
    compositePart: '',
    linkedCompositePart: '',
    gamepadReadOnly: false,
    keyboardReadOnly: false,
    defaultKbm: '<Mouse>/leftButton',
    defaultPad: '<Gamepad>/rightTrigger',
  },
  {
    key: 'aim',
    section: 'Gameplay',
    labelEn: 'Aim',
    labelRu: 'Прицеливание',
    asset: 'Malbers Inputs',
    map: 'Gameplay',
    action: 'Action2',
    compositePart: '',
    linkedCompositePart: '',
    gamepadReadOnly: false,
    keyboardReadOnly: false,
    defaultKbm: '<Mouse>/rightButton',
    defaultPad: '<Gamepad>/leftTrigger',
  },
  {
    key: 'block',
    section: 'Gameplay',
    labelEn: 'Block',
    labelRu: 'Блок',
    noteEn: 'hold',
    noteRu: 'удерж.',
    asset: 'Malbers Inputs',
    map: 'Gameplay',
    action: 'Block',
    compositePart: '',
    linkedCompositePart: '',
    gamepadReadOnly: false,
    keyboardReadOnly: false,
    defaultKbm: '<Keyboard>/g',
    defaultPad: '<Gamepad>/rightShoulder',
  },
  {
    key: 'reload',
    section: 'Gameplay',
    labelEn: 'Reload',
    labelRu: 'Перезарядка',
    asset: 'Malbers Inputs',
    map: 'Gameplay',
    action: 'Reload',
    compositePart: '',
    linkedCompositePart: '',
    gamepadReadOnly: false,
    keyboardReadOnly: false,
    defaultKbm: '<Keyboard>/r',
    defaultPad: '<Gamepad>/leftShoulder',
  },
  {
    key: 'weapon_draw',
    section: 'Gameplay',
    labelEn: 'Draw / put away weapon',
    labelRu: 'Достать / убрать оружие',
    asset: 'Malbers Inputs',
    map: 'Gameplay',
    action: 'Holster1',
    compositePart: '',
    linkedCompositePart: '',
    gamepadReadOnly: false,
    keyboardReadOnly: false,
    defaultKbm: '<Keyboard>/4',
    defaultPad: '<Gamepad>/dpad/left',
  },
  {
    key: 'animal_focus',
    section: 'Gameplay',
    labelEn: 'Focus an animal',
    labelRu: 'Фокус на животном',
    noteEn: 'hold',
    noteRu: 'удерж.',
    asset: 'InputSystem_Actions',
    map: 'UI',
    action: 'InteractOptions',
    compositePart: '',
    linkedCompositePart: '',
    gamepadReadOnly: false,
    keyboardReadOnly: false,
    defaultKbm: '<Keyboard>/z',
    defaultPad: '<Gamepad>/leftShoulder',
  },
  {
    key: 'pets_menu',
    section: 'Gameplay',
    labelEn: 'Pets menu',
    labelRu: 'Меню питомцев',
    noteEn: 'hold',
    noteRu: 'удерж.',
    asset: 'InputSystem_Actions',
    map: 'UI',
    action: 'PetsMenu',
    compositePart: '',
    linkedCompositePart: '',
    gamepadReadOnly: false,
    keyboardReadOnly: false,
    defaultKbm: '<Keyboard>/v',
    defaultPad: '<Gamepad>/dpad/up',
  },
  {
    key: 'weapon_ability',
    section: 'Gameplay',
    labelEn: 'Weapon ability',
    labelRu: 'Способность оружия',
    asset: 'Malbers Inputs',
    map: 'Gameplay',
    action: 'WeaponAction',
    compositePart: '',
    linkedCompositePart: '',
    gamepadReadOnly: false,
    keyboardReadOnly: false,
    defaultKbm: '<Keyboard>/m',
    defaultPad: '',
  },
  {
    key: 'retro_pulse',
    section: 'Gameplay',
    labelEn: 'Retro Pulse',
    labelRu: 'Ретро-импульс (Retro Pulse)',
    asset: 'Malbers Inputs',
    map: 'Gameplay',
    action: 'Pulse',
    compositePart: '',
    linkedCompositePart: '',
    gamepadReadOnly: false,
    keyboardReadOnly: false,
    defaultKbm: '<Keyboard>/x',
    defaultPad: '<Gamepad>/rightShoulder',
  },
  {
    key: 'lock_on',
    section: 'Gameplay',
    labelEn: 'Lock on',
    labelRu: 'Захват цели (Lock-on)',
    asset: 'Malbers Inputs',
    map: 'Gameplay',
    action: 'LockOn',
    compositePart: '',
    linkedCompositePart: '',
    gamepadReadOnly: false,
    keyboardReadOnly: false,
    defaultKbm: '<Mouse>/middleButton',
    defaultPad: '<Gamepad>/rightStickPress',
  },
  {
    key: 'switch_target',
    section: 'Gameplay',
    labelEn: 'Switch target',
    labelRu: 'Сменить цель',
    noteEn: 'stick / scroll',
    noteRu: 'стик / колесо',
    asset: 'Malbers Inputs',
    map: 'Gameplay',
    action: 'LockNextTarget',
    compositePart: 'left',
    linkedCompositePart: '',
    gamepadReadOnly: true,
    keyboardReadOnly: true,
    defaultKbm: '<Mouse>/scroll',
    defaultPad: '<Gamepad>/rightStick/left',
  },
  {
    key: 'open_map',
    section: 'Gameplay',
    labelEn: 'Open map',
    labelRu: 'Открыть карту',
    noteEn: 'tap on Select',
    noteRu: 'кор. нажатие',
    asset: 'Malbers Inputs',
    map: 'Gameplay',
    action: 'OpenMap',
    compositePart: '',
    linkedCompositePart: '',
    gamepadReadOnly: false,
    keyboardReadOnly: false,
    defaultKbm: '<Keyboard>/m',
    defaultPad: '<Gamepad>/select',
    defaultPadInteractions: 'Tap(duration=0.5)',
    hasTouchpadAlias: true,
  },

  // ================= SECTION 3: ANIMAL FOCUS =================
  {
    key: 'animal_talk',
    section: 'AnimalFocus',
    labelEn: 'Talk',
    labelRu: 'Поговорить',
    asset: 'InputSystem_Actions',
    map: 'UI',
    action: 'InteractTalk',
    compositePart: '',
    linkedCompositePart: '',
    gamepadReadOnly: false,
    keyboardReadOnly: false,
    defaultKbm: '<Keyboard>/1',
    defaultPad: '<Gamepad>/dpad/up',
  },
  {
    key: 'animal_pet',
    section: 'AnimalFocus',
    labelEn: 'Pet',
    labelRu: 'Погладить',
    asset: 'InputSystem_Actions',
    map: 'UI',
    action: 'InteractPet',
    compositePart: '',
    linkedCompositePart: '',
    gamepadReadOnly: false,
    keyboardReadOnly: false,
    defaultKbm: '<Keyboard>/2',
    defaultPad: '<Gamepad>/buttonWest',
  },

  // ================= SECTION 4: LUCID RUSH =================
  {
    key: 'qte_left',
    section: 'LucidRush',
    labelEn: 'Left',
    labelRu: 'Влево (QTE)',
    asset: 'Malbers Inputs',
    map: 'Gameplay',
    action: 'QteLeft',
    compositePart: '',
    linkedCompositePart: '',
    gamepadReadOnly: false,
    keyboardReadOnly: false,
    defaultKbm: '<Keyboard>/b',
    defaultPad: '<Gamepad>/dpad/left',
  },
  {
    key: 'qte_right',
    section: 'LucidRush',
    labelEn: 'Right',
    labelRu: 'Вправо (QTE)',
    asset: 'Malbers Inputs',
    map: 'Gameplay',
    action: 'QteRight',
    compositePart: '',
    linkedCompositePart: '',
    gamepadReadOnly: false,
    keyboardReadOnly: false,
    defaultKbm: '<Keyboard>/e',
    defaultPad: '<Gamepad>/dpad/right',
  },
  {
    key: 'qte_down',
    section: 'LucidRush',
    labelEn: 'Down',
    labelRu: 'Вниз (QTE)',
    asset: 'Malbers Inputs',
    map: 'Gameplay',
    action: 'QteDown',
    compositePart: '',
    linkedCompositePart: '',
    gamepadReadOnly: false,
    keyboardReadOnly: false,
    defaultKbm: '<Keyboard>/t',
    defaultPad: '<Gamepad>/dpad/down',
  },

  // ================= SECTION 1: MENUS =================
  {
    key: 'journal',
    section: 'Menus',
    labelEn: 'Journal',
    labelRu: 'Дневник',
    noteEn: 'hold on Select',
    noteRu: 'удерж. Select',
    asset: 'InputSystem_Actions',
    map: 'UI',
    action: 'Tab',
    compositePart: '',
    linkedCompositePart: '',
    gamepadReadOnly: false,
    keyboardReadOnly: false,
    defaultKbm: '<Keyboard>/tab',
    defaultPad: '<Gamepad>/select',
    defaultPadInteractions: 'Hold(duration=0.5)',
    hasTouchpadAlias: true,
  },
  {
    key: 'vinyl_collection',
    section: 'Menus',
    labelEn: 'Vinyl collection',
    labelRu: 'Коллекция винила',
    asset: 'InputSystem_Actions',
    map: 'UI',
    action: 'Vinyl',
    compositePart: '',
    linkedCompositePart: '',
    gamepadReadOnly: false,
    keyboardReadOnly: false,
    defaultKbm: '<Keyboard>/backslash',
    defaultPad: '',
  },
  {
    key: 'weapon_wheel',
    section: 'Menus',
    labelEn: 'Weapon wheel',
    labelRu: 'Колесо оружия',
    noteEn: 'hold',
    noteRu: 'удерж.',
    asset: 'InputSystem_Actions',
    map: 'UI',
    action: 'RadialMenu',
    compositePart: '',
    linkedCompositePart: '',
    gamepadReadOnly: false,
    keyboardReadOnly: false,
    defaultKbm: '<Keyboard>/h',
    defaultPad: '<Gamepad>/buttonWest',
  },
  {
    key: 'skip_dialogue',
    section: 'Menus',
    labelEn: 'Skip dialogue',
    labelRu: 'Пропуск реплики',
    asset: 'InputSystem_Actions',
    map: 'UI',
    action: 'SkipDialogue',
    compositePart: '',
    linkedCompositePart: '',
    gamepadReadOnly: false,
    keyboardReadOnly: false,
    defaultKbm: '<Keyboard>/r',
    defaultPad: '<Gamepad>/buttonWest',
  },

  // ================= SECTION 2: CAR =================
  {
    key: 'throttle',
    section: 'Car',
    labelEn: 'Throttle',
    labelRu: 'Газ',
    asset: 'VehicleInputActions',
    map: 'Vehicle Controls',
    action: 'Throttle',
    compositePart: 'positive',
    linkedCompositePart: '',
    gamepadReadOnly: false,
    keyboardReadOnly: false,
    defaultKbm: '<Keyboard>/w',
    defaultPad: '<Gamepad>/rightTrigger',
  },
  {
    key: 'brake',
    section: 'Car',
    labelEn: 'Brake',
    labelRu: 'Тормоз / Задний ход',
    asset: 'VehicleInputActions',
    map: 'Vehicle Controls',
    action: 'Brakes',
    compositePart: 'positive',
    linkedCompositePart: '',
    gamepadReadOnly: false,
    keyboardReadOnly: false,
    defaultKbm: '<Keyboard>/s',
    defaultPad: '<Gamepad>/leftTrigger',
  },
  {
    key: 'handbrake',
    section: 'Car',
    labelEn: 'Handbrake',
    labelRu: 'Ручной тормоз',
    asset: 'VehicleInputActions',
    map: 'Vehicle Controls',
    action: 'Handbrake',
    compositePart: 'positive',
    linkedCompositePart: '',
    gamepadReadOnly: false,
    keyboardReadOnly: false,
    defaultKbm: '<Keyboard>/space',
    defaultPad: '<Gamepad>/buttonEast',
  },
  {
    key: 'boost',
    section: 'Car',
    labelEn: 'Boost',
    labelRu: 'Ускорение (Нитро)',
    asset: 'VehicleInputActions',
    map: 'Vehicle Controls',
    action: 'Boost',
    compositePart: '',
    linkedCompositePart: '',
    gamepadReadOnly: false,
    keyboardReadOnly: false,
    defaultKbm: '<Keyboard>/leftShift',
    defaultPad: '<Gamepad>/buttonSouth',
  },
  {
    key: 'headlights',
    section: 'Car',
    labelEn: 'Headlights',
    labelRu: 'Фары',
    asset: 'VehicleInputActions',
    map: 'Vehicle Controls',
    action: 'LowBeamLights',
    compositePart: '',
    linkedCompositePart: '',
    gamepadReadOnly: false,
    keyboardReadOnly: false,
    defaultKbm: '<Keyboard>/l',
    defaultPad: '<Gamepad>/buttonNorth',
  },
  {
    key: 'car_camera',
    section: 'Car',
    labelEn: 'Camera view',
    labelRu: 'Вид камеры авто',
    asset: 'VehicleInputActions',
    map: 'Vehicle Controls',
    action: 'ViewChange',
    compositePart: '',
    linkedCompositePart: '',
    gamepadReadOnly: false,
    keyboardReadOnly: false,
    defaultKbm: '<Keyboard>/v',
    defaultPad: '<Gamepad>/rightStickPress',
  },
  {
    key: 'steer_left',
    section: 'Car',
    labelEn: 'Steer left',
    labelRu: 'Руль влево',
    asset: 'VehicleInputActions',
    map: 'Vehicle Controls',
    action: 'Steering',
    compositePart: 'Negative',
    linkedCompositePart: '',
    gamepadReadOnly: true,
    keyboardReadOnly: false,
    defaultKbm: '<Keyboard>/a',
    defaultPad: '<Gamepad>/leftStick/left',
  },
  {
    key: 'steer_right',
    section: 'Car',
    labelEn: 'Steer right',
    labelRu: 'Руль вправо',
    asset: 'VehicleInputActions',
    map: 'Vehicle Controls',
    action: 'Steering',
    compositePart: 'Positive',
    linkedCompositePart: '',
    gamepadReadOnly: true,
    keyboardReadOnly: false,
    defaultKbm: '<Keyboard>/d',
    defaultPad: '<Gamepad>/leftStick/right',
  },
  {
    key: 'drift_qte_1',
    section: 'Car',
    labelEn: 'Drift QTE 1',
    labelRu: 'Дрифт QTE 1',
    asset: 'InputSystem_Actions',
    map: 'Car',
    action: 'Action1',
    compositePart: '',
    linkedCompositePart: '',
    gamepadReadOnly: false,
    keyboardReadOnly: false,
    defaultKbm: '<Keyboard>/j',
    defaultPad: '<Gamepad>/buttonWest',
  },
  {
    key: 'drift_qte_2',
    section: 'Car',
    labelEn: 'Drift QTE 2',
    labelRu: 'Дрифт QTE 2',
    asset: 'InputSystem_Actions',
    map: 'Car',
    action: 'Action2',
    compositePart: '',
    linkedCompositePart: '',
    gamepadReadOnly: false,
    keyboardReadOnly: false,
    defaultKbm: '<Keyboard>/k',
    defaultPad: '<Gamepad>/buttonEast',
  },
  {
    key: 'drift_qte_3',
    section: 'Car',
    labelEn: 'Drift QTE 3',
    labelRu: 'Дрифт QTE 3',
    asset: 'InputSystem_Actions',
    map: 'Car',
    action: 'Action3',
    compositePart: '',
    linkedCompositePart: '',
    gamepadReadOnly: false,
    keyboardReadOnly: false,
    defaultKbm: '<Keyboard>/e',
    defaultPad: '<Gamepad>/rightShoulder',
  },
];

export function getEntryId(entry: RebindEntryDef): string {
  const base = `${entry.asset}/${entry.map}/${entry.action}`;
  return entry.compositePart ? `${base}/${entry.compositePart}` : base;
}

export interface GamepadControlOption {
  path: string;
  controlName: string;
  meshPart: string;
  group: 'face' | 'shoulders' | 'dpad' | 'sticks' | 'system';
  labelPs: string;
  labelXbox: string;
  descRu: string;
  descEn: string;
}

export const GAMEPAD_CONTROL_OPTIONS: GamepadControlOption[] = [
  // Face buttons
  {
    path: '<Gamepad>/buttonSouth',
    controlName: 'buttonSouth',
    meshPart: 'buttonSouth',
    group: 'face',
    labelPs: 'Cross (✕)',
    labelXbox: 'A',
    descRu: 'Нижняя кнопка действия',
    descEn: 'Bottom face button',
  },
  {
    path: '<Gamepad>/buttonEast',
    controlName: 'buttonEast',
    meshPart: 'buttonEast',
    group: 'face',
    labelPs: 'Circle (○)',
    labelXbox: 'B',
    descRu: 'Правая кнопка действия',
    descEn: 'Right face button',
  },
  {
    path: '<Gamepad>/buttonWest',
    controlName: 'buttonWest',
    meshPart: 'buttonWest',
    group: 'face',
    labelPs: 'Square (□)',
    labelXbox: 'X',
    descRu: 'Левая кнопка действия',
    descEn: 'Left face button',
  },
  {
    path: '<Gamepad>/buttonNorth',
    controlName: 'buttonNorth',
    meshPart: 'buttonNorth',
    group: 'face',
    labelPs: 'Triangle (△)',
    labelXbox: 'Y',
    descRu: 'Верхняя кнопка действия',
    descEn: 'Top face button',
  },
  // Shoulders & Triggers
  {
    path: '<Gamepad>/leftShoulder',
    controlName: 'leftShoulder',
    meshPart: 'leftShoulder',
    group: 'shoulders',
    labelPs: 'L1',
    labelXbox: 'LB',
    descRu: 'Левый бампер',
    descEn: 'Left bumper',
  },
  {
    path: '<Gamepad>/rightShoulder',
    controlName: 'rightShoulder',
    meshPart: 'rightShoulder',
    group: 'shoulders',
    labelPs: 'R1',
    labelXbox: 'RB',
    descRu: 'Правый бампер',
    descEn: 'Right bumper',
  },
  {
    path: '<Gamepad>/leftTrigger',
    controlName: 'leftTrigger',
    meshPart: 'leftTrigger',
    group: 'shoulders',
    labelPs: 'L2',
    labelXbox: 'LT',
    descRu: 'Левый курок (триггер)',
    descEn: 'Left trigger',
  },
  {
    path: '<Gamepad>/rightTrigger',
    controlName: 'rightTrigger',
    meshPart: 'rightTrigger',
    group: 'shoulders',
    labelPs: 'R2',
    labelXbox: 'RT',
    descRu: 'Правый курок (триггер)',
    descEn: 'Right trigger',
  },
  // D-Pad
  {
    path: '<Gamepad>/dpad/up',
    controlName: 'dpad/up',
    meshPart: 'dpad/up',
    group: 'dpad',
    labelPs: 'D-Pad ↑',
    labelXbox: 'D-Pad ↑',
    descRu: 'Крестовина Вверх',
    descEn: 'D-Pad Up',
  },
  {
    path: '<Gamepad>/dpad/down',
    controlName: 'dpad/down',
    meshPart: 'dpad/down',
    group: 'dpad',
    labelPs: 'D-Pad ↓',
    labelXbox: 'D-Pad ↓',
    descRu: 'Крестовина Вниз',
    descEn: 'D-Pad Down',
  },
  {
    path: '<Gamepad>/dpad/left',
    controlName: 'dpad/left',
    meshPart: 'dpad/left',
    group: 'dpad',
    labelPs: 'D-Pad ←',
    labelXbox: 'D-Pad ←',
    descRu: 'Крестовина Влево',
    descEn: 'D-Pad Left',
  },
  {
    path: '<Gamepad>/dpad/right',
    controlName: 'dpad/right',
    meshPart: 'dpad/right',
    group: 'dpad',
    labelPs: 'D-Pad →',
    labelXbox: 'D-Pad →',
    descRu: 'Крестовина Вправо',
    descEn: 'D-Pad Right',
  },
  // Sticks
  {
    path: '<Gamepad>/leftStickPress',
    controlName: 'leftStickPress',
    meshPart: 'leftStick',
    group: 'sticks',
    labelPs: 'L3 (Нажатие Л. стика)',
    labelXbox: 'LS (Нажатие Л. стика)',
    descRu: 'Клик левого стика',
    descEn: 'Left stick click',
  },
  {
    path: '<Gamepad>/rightStickPress',
    controlName: 'rightStickPress',
    meshPart: 'rightStick',
    group: 'sticks',
    labelPs: 'R3 (Нажатие П. стика)',
    labelXbox: 'RS (Нажатие П. стика)',
    descRu: 'Клик правого стика',
    descEn: 'Right stick click',
  },
  // System / Center
  {
    path: '<Gamepad>/select',
    controlName: 'select',
    meshPart: 'select',
    group: 'system',
    labelPs: 'Create / Share',
    labelXbox: 'View (⧉)',
    descRu: 'Левая системная кнопка',
    descEn: 'Select / View / Create',
  },
  {
    path: '<DualShockGamepad>/touchpadButton',
    controlName: 'touchpadButton',
    meshPart: 'touchpadButton',
    group: 'system',
    labelPs: 'Touchpad',
    labelXbox: 'View / Touchpad',
    descRu: 'Сенсорная панель DualSense',
    descEn: 'DualSense Touchpad click',
  },
];

/**
 * Exact equivalent of GamepadModelRig.PartPathFor(bindingPath)
 */
export function partPathFor(bindingPath: string | null | undefined): string | null {
  if (!bindingPath) return null;
  let path = bindingPath;
  if (path.startsWith('<')) {
    const slash = path.indexOf('/');
    if (slash < 0 || slash + 1 >= path.length) return null;
    path = path.substring(slash + 1);
  }
  if (path === 'leftStickPress' || path.startsWith('leftStick/')) return 'leftStick';
  if (path === 'rightStickPress' || path.startsWith('rightStick/')) return 'rightStick';
  return path;
}

export type GamepadRegion = 'Face' | 'FaceLeft' | 'FaceRight' | 'TopLeft' | 'TopRight';

export function regionForPart(partPath: string | null | undefined): GamepadRegion {
  switch (partPath) {
    case 'leftShoulder':
    case 'leftTrigger':
      return 'TopLeft';
    case 'rightShoulder':
    case 'rightTrigger':
      return 'TopRight';
    case 'leftStick':
    case 'select':
    case 'dpad/up':
    case 'dpad/down':
    case 'dpad/left':
    case 'dpad/right':
      return 'FaceLeft';
    case 'buttonSouth':
    case 'buttonNorth':
    case 'buttonEast':
    case 'buttonWest':
    case 'rightStick':
    case 'start':
      return 'FaceRight';
    default:
      return 'Face';
  }
}

export function contextOfSection(section: RebindSection): number {
  switch (section) {
    case 'Car':
      return 1;
    case 'AnimalFocus':
      return 2;
    case 'LucidRush':
      return 3;
    default:
      return 0; // On-foot: Gameplay + Menus
  }
}

export function conflictGroupOfSection(section: RebindSection): number {
  switch (section) {
    case 'Car':
      return 1;
    case 'AnimalFocus':
      return 2;
    default:
      return 0; // Gameplay + Menus + LucidRush share conflict group 0 in InputRebindService.cs
  }
}
