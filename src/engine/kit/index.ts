// 系列通用的成套画面（样式在 kit.css，由 boot.ts 统一引入）
//   Claude 系列（终端）：opening / ending        DS 系列（对话页）：chatOpening / chatEnding
//   两个系列都能用：片名卡 titleCard、论文首页 paperPage
export { opening, shellPrompt, type OpeningOptions } from './opening'
export { chatOpening, chatEnding, whaleIcon, type ChatOpeningOptions, type ChatEndingOptions } from './chat'
export { titleCard, type TitleCard, type TitleCardOptions } from './title'
export { ending, type EndingOptions } from './ending'
export { paperPage, sweep, type PaperPage, type PaperPageOptions } from './paper'
