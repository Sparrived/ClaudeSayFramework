// 封面的入口（cover.html）：封面上的字都在 src/video/config.ts 的 cover 里。一般不用改这里
import { renderCover } from './engine/cover/cover'
import { VIDEO } from './video/config'

void renderCover(VIDEO.cover)
