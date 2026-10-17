/**
 * 小鲸的像素画数据：36×54 的画布，各部件分开画（好分别做动画），由后往前叠。
 * 每个部件：(x, y) 是点阵左上角在画布上的位置，rows 是调色板字符的点阵，'.' 透明。
 * 直接改这里的点阵就能改长相；要加表情、动作，就给 eyes / mouth / armL / armR 加一帧，再在 whale.ts 里用上。
 */

/** 画布大小（精灵像素） */
export const WHALE_W = 36
export const WHALE_H = 54

export const WHALE_PALETTE = {
  K: '#161C48', // 描边：深海军蓝
  H: '#26338E', // 头发：阴影
  h: '#3650C8', // 头发：本色（宝蓝）
  i: '#4A6EE4', // 头发：亮
  j: '#8FAAF7', // 头发：高光（天使环）
  t: '#5B92F1', // 发梢：渐变
  u: '#86BDFA', // 发梢：最浅
  W: '#FFFFFF', // 白
  w: '#CDD6F0', // 白的阴影（带点蓝）
  S: '#FFF1EA', // 皮肤
  s: '#F5D0C6', // 皮肤阴影
  p: '#F7AFAD', // 腮红
  E: '#1B2B78', // 眼睛：深
  e: '#2F6FE6', // 眼睛：中（也是围裙上的鲸鱼）
  c: '#8AD0FF', // 眼睛：浅
  N: '#1D2766', // 裙子：海军蓝
  n: '#2D3D8F', // 裙子：亮
  g: '#E3B653', // 金边
  b: '#42AEF7', // 浅蓝：蝴蝶结、宝石、水花
  B: '#2479CC', // 蝴蝶结：深
  r: '#B85A66', // 嘴：张开
  m: '#D98C8F', // 嘴：闭着
}

export interface PixelPart {
  x: number
  y: number
  rows: string[]
}

export const WHALE_ART = {
  /** 后发：头后面一整块 + 两侧垂到膝盖的长发，越往下越浅 */
  hairBack: { x: 1, y: 6, rows: [
    '............KKKKKKKKKK............',
    '.........KKKhhhhhhhhhhKKK.........',
    '.......KKhhhhhhhhhhhhhhhhKK.......',
    '......KhhhhhhhhhhhhhhhhhhhhK......',
    '.....KhhhhhhhhhhhhhhhhhhhhhhK.....',
    '....KhhhhhhhhhhhhhhhhhhhhhhhhK....',
    '....KhhhhhhhhhhhhhhhhhhhhhhhhK....',
    '...KHhhhhhhhhhhhhhhhhhhhhhhhhHK...',
    '...KHhhhhhhhhhhhhhhhhhhhhhhhhHK...',
    '...KHhihhhhhhhhhhhhhhhhhhhhihHK...',
    '...KHhihhhhhhhhhhhhhhhhhhhhihHK...',
    '..KHhhihhhhhhhhhhhhhhhhhhhhihhHK..',
    '..KHhhihhhhhhhhhhhhhhhhhhhhihhHK..',
    '..KHhhihhhhhhhhhhhhhhhhhhhhihhHK..',
    '..KHhhihhhhhhhhhhhhhhhhhhhhihhHK..',
    '..KHhhihHhhhhhhhhhhhhhhhhHhihhHK..',
    '..KHhhihHhhhhhhhhhhhhhhhhHhihhHK..',
    '..KHhhihHhhhhhhhhhhhhhhhhHhihhHK..',
    '..KHhhihHhhhhhhhhhhhhhhhhHhihhHK..',
    '..KHhhihhHhhhhhhhhhhhhhhHhhihhHK..',
    '..KHhhiihHhhhhhhhhhhhhhhHhiihhHK..',
    '.KHhhhiihHhhhhhhhhhhhhhhHhiihhhHK.',
    '.KHhhiiihHihhhhhhhhhhhhiHhiiihhHK.',
    '.KHhiiiihHiihhhhhhhhhhiiHhiiiihHK.',
    '.KHhiiiiHiiiihhhhhhhhiiiiHiiiihHK.',
    '.KHiiitiHiiiiiiiiiiiiiiiiHitiiiHK.',
    '.KHiiitiHiitiiiiiiiiiitiiHitiiiHK.',
    'KHiiittiHittiiiiiiiiiittiHittiiiHK',
    'KHiittttHtttiiiiiiiiiitttHttttiiHK',
    'KHittttHttttttttttttttttttHttttiHK',
    'KHitttuHttuttttttttttttuttHutttiHK',
    'KHttuuHtuuttttttttttttttuutHuuttHK',
    'KHtuuuHuuuuttttttttttttuuuuHuuutHK',
    'KHuuuuHuuuuuuuuuuuuuuuuuuuuHuuuuHK',
    'KuuuuuKuuuuuuuuuuuuuuuuuuuuKuuuuuK',
    '.KuuuuKuuuKuuuuuuuuuuuuKuuuKuuuuK.',
    '.KuuuK.KuuKuuuuuuuuuuuuKuuK.KuuuK.',
    '..KuK..KuK.KKKKKKKKKKKK.KuK..KuK..',
    '...K....K................K....K...',
  ] },
  /** 呆毛：在发箍后面，茎藏在荷叶边下 */
  ahoge: { x: 13, y: 0, rows: [
    '.KKK...',
    'KhihK..',
    'KhKKhK.',
    '.K..KhK',
    '.....Kh',
    '.....Kh',
    '.....Kh',
  ] },
  /** 左腿（观众看去，下同）：白袜子、荷叶边、玛丽珍鞋 */
  legL: { x: 12, y: 48, rows: [
    'KWWwK.',
    'KWWwK.',
    'KWWwK.',
    'KwWWwK',
    'KNnnNK',
    '.KKKK.',
  ] },
  /** 右腿 */
  legR: { x: 18, y: 48, rows: [
    '.KwWWK',
    '.KwWWK',
    '.KwWWK',
    'KwWWwK',
    'KNnnNK',
    '.KKKK.',
  ] },
  /** 身体：白领、领结、深蓝上衣、白围裙和鲸鱼、裙子金边、白衬裙 */
  body: { x: 5, y: 27, rows: [
    '...........SSSS...........',
    '........KKWWSSWWKK........',
    '......KKNNWWbbWWNNKK......',
    '.....KNNNNNKNNKNNNNNK.....',
    '.....KNWWNNNNNNNNWWNK.....',
    '.....KNWwNNnNNnNNwWNK.....',
    '.....KNWwNNnNNnNNwWNK.....',
    '.....KNWwWWWWWWWWwWNK.....',
    '.....KNNWWWWWWWWWWNNK.....',
    '....KNNNWWWWWWWWWWNNNK....',
    '....KNNNWWWWbWWWWWNNNK....',
    '....KNNNWWWbWbWWWWNNNK....',
    '...KNNNNWWeeeeWWeWNNNNK...',
    '...KNNNNWeeWeeeeeWNNNNK...',
    '...KNNNNWWeeeeeeWWNNNNK...',
    '..KNNNNNwWWWWWWWWwNNNNNK..',
    '..KNNNNNNwwWWWWwwNNNNNNK..',
    '.KNgNgNNNNNwwwwNNNNNgNgNK.',
    '.KNNgNNgNNgNNNNgNNgNNgNNK.',
    'KWWWWWWWWWWWWWWWWWWWWWWWWK',
    'KWwWWwWWwWWwWWwWWwWWwWWwWK',
    '.KKwKKwKKwKKwwKKwKKwKKwKK.',
  ] },
  /** 脸：圆脸、小下巴、腮红 */
  face: { x: 8, y: 13, rows: [
    '.SSSSSSSSSSSSSSSSSS.',
    'SSSSSSSSSSSSSSSSSSSS',
    'SSSSSSSSSSSSSSSSSSSS',
    'SSSSSSSSSSSSSSSSSSSS',
    'SSSSSSSSSSSSSSSSSSSS',
    'SSSSSSSSSSSSSSSSSSSS',
    'SSSSSSSSSSSSSSSSSSSS',
    'SSSSSSSSSSSSSSSSSSSS',
    'SSSSSSSSSSSSSSSSSSSS',
    'SSSSSSSSSSSSSSSSSSSS',
    'SSSSSSSSSSSSSSSSSSSS',
    'sSSSSSSSSSSSSSSSSSSs',
    '.sppSSSSSSSSSSSSpps.',
    '..sSSSSSSSSSSSSSSs..',
    '....ssSSSSSSSSss....',
  ] },
  /** 刘海和鬓发 */
  bangs: { x: 5, y: 7, rows: [
    '........KKKKKKKKKK........',
    '.....KKKhhhhhhhhhhKKK.....',
    '...KKhhhhhhhhhhhhhhhhKK...',
    '..KhhjjiiijjhhhjjhHjjhhK..',
    'KKhhhhjHiiiiihhhhHhhjhhhKK',
    'KhhhhhhhHiiiiihhHhhhhhhhhK',
    'KhhhhhhHhHiiiiihhhhHhhhhhK',
    'KhhhhhhhHhHiiiiihhHhhhhhhK',
    'KhhhhhhhKhhHiiiiihKhhhhhhK',
    'KhhhhhhK.KhhHKiiiK.KhhhhhK',
    'KhhhhhK..KhHK.KiK..KhhhhhK',
    'KhhhKK....KK...KK...KKhhhK',
    'KhhhK.....K....K.....KhhhK',
    'KhhHK................KHhhK',
    '.KhHK................KHhK.',
    '.KhHK................KHhK.',
    '.KhHK................KHhK.',
    '.KhHK................KHhK.',
    '.KhHK................KHhK.',
    '..KHK................KHK..',
    '..KHK................KHK..',
    '...K..................K...',
  ] },
  /** 发箍：白色荷叶边 + 右边的浅蓝蝴蝶结 */
  headband: { x: 3, y: 4, rows: [
    '..........KKKKKKKKKK...........',
    '.......KKKWWWWWWWWWWKKK........',
    '.....KKWWWwWWwWWwWWwWWWKK......',
    '...KKWWwWWWWWWWWWWWWWWwWWKK....',
    '..KWWWWWWKKKKKKKKKKKKWWWWWWK...',
    '.KWwWWKK..............KKWWwWK..',
    '.KWWWK..................KKWWKKK',
    'KWwWK...................KbKwKbK',
    'KWWWK...................KbbgbbK',
    'KWWwK...................KbKWKbK',
    'KWWWK...................KKWWWKK',
    'KWwWK....................KWwWK.',
    'KWWWK....................KWWWK.',
    '.KKK......................KKK..',
  ] },
  /** 左耳鳍：上面深蓝、下面白色绒毛 */
  finL: { x: 0, y: 18, rows: [
    '....KKKK',
    '..KKHhhH',
    '.KHhhhHH',
    'KHhhHHHK',
    'KWWWWWWK',
    '.KwWwWK.',
    '..K.K...',
  ] },
  /** 右耳鳍 */
  finR: { x: 28, y: 18, rows: [
    'KKKK....',
    'HhhHKK..',
    'HHhhhHK.',
    'KHHHhhHK',
    'KWWWWWWK',
    '.KWwWwK.',
    '...K.K..',
  ] },
  /** 眼睛：每种表情一帧（blink 是眨眼那一下） */
  eyes: {
    normal: { x: 10, y: 19, rows: [
      'KKKKK......KKKKK',
      'KEWEE......EWEEK',
      '.EEEE......EEEE.',
      '.eeee......eeee.',
      '.ecce......ecce.',
      '..cc........cc..',
    ] },
    happy: { x: 10, y: 20, rows: [
      '.KKK........KKK.',
      'KK.KK......KK.KK',
    ] },
    wide: { x: 10, y: 19, rows: [
      '.KKK........KKK.',
      'KWWWK......KWWWK',
      'KWEWK......KWEWK',
      'KWEWK......KWEWK',
      'KWWWK......KWWWK',
      '.KKK........KKK.',
    ] },
    closed: { x: 10, y: 22, rows: [
      'KK.KK......KK.KK',
      '.KKK........KKK.',
    ] },
    blink: { x: 10, y: 22, rows: [
      'KKKKK......KKKKK',
    ] },
  },
  /** 嘴 */
  mouth: {
    closed: { x: 17, y: 26, rows: [
      'mm',
    ] },
    open: { x: 17, y: 26, rows: [
      'rr',
      'rr',
    ] },
    smile: { x: 16, y: 26, rows: [
      'm..m',
      '.mm.',
    ] },
  },
  /** 左手：垂下 / 举到脸颊旁 / 挥手的另一帧 */
  armL: {
    down: { x: 6, y: 30, rows: [
      '..KK.',
      '.KNNK',
      '.KNNK',
      'KNNNK',
      'KNNNK',
      'KNNNK',
      'KNNnK',
      'KWWWK',
      'KwWwK',
      '.KSSK',
      '..KK.',
    ] },
    up: { x: 5, y: 23, rows: [
      '..KKK.',
      '.KSSSK',
      '.KSSSK',
      '.KWWWK',
      '.KwWwK',
      '.KNNnK',
      '.KNNnK',
      'KNNNnK',
      'KNNnK.',
      '.KKK..',
    ] },
    wave: { x: 5, y: 23, rows: [
      '.KKK..',
      'KSSSK.',
      'KSSSK.',
      'KWWWK.',
      '.KwWwK',
      '.KNNnK',
      '.KNNnK',
      'KNNNnK',
      'KNNnK.',
      '.KKK..',
    ] },
  },
  /** 右手 */
  armR: {
    down: { x: 25, y: 30, rows: [
      '.KK..',
      'KNNK.',
      'KNNK.',
      'KNNNK',
      'KNNNK',
      'KNNNK',
      'KnNNK',
      'KWWWK',
      'KwWwK',
      'KSSK.',
      '.KK..',
    ] },
    up: { x: 25, y: 23, rows: [
      '.KKK..',
      'KSSSK.',
      'KSSSK.',
      'KWWWK.',
      'KwWwK.',
      'KnNNK.',
      'KnNNK.',
      'KnNNNK',
      '.KnNNK',
      '..KKK.',
    ] },
    wave: { x: 25, y: 23, rows: [
      '..KKK.',
      '.KSSSK',
      '.KSSSK',
      '.KWWWK',
      'KwWwK.',
      'KnNNK.',
      'KnNNK.',
      'KnNNNK',
      '.KnNNK',
      '..KKK.',
    ] },
  },
} satisfies Record<string, PixelPart | Record<string, PixelPart>>

/** 鲸鱼图标：对话页首页上的那只（DS 系列的片头片尾），小鲸从它这里蹦出来。和画布无关，自己一个坐标系 */
export const WHALE_ICON = { w: 24, h: 14, rows: [
  '.......b..b.............',
  '........bb..............',
  '.........b..............',
  '.....KKKKKKKK...........',
  '...KKiiiiiiiiKK......KK.',
  '..KiiiiiiiiiiiiKK...KiiK',
  '.KiiiiiiiiiiiiiiiK.KiiK.',
  '.KiWWiiiiiiiiiiiiiKiiK..',
  'KiiWKiiiiiiiiiiiiiiiK...',
  'KiiiiiiiiiiiiiiiiiiK....',
  'KiKiiiiiiiiiiiiiiiK.....',
  '.KKjjjjjjjjjjjiiiK......',
  '..KKjjjjjjjjjjiKK.......',
  '....KKKKKKKKKKK.........',
] }
