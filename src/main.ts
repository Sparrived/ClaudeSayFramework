// 视频的入口（index.html）：把这一期的设置和场景交给引擎。一般不用改这里
import { boot } from './engine/boot'
import { VIDEO } from './video/config'
import { SCENES } from './video/scenes'

void boot(VIDEO, SCENES)
