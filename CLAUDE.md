# ClaudeSayFramework

ClaudeSay 系列讲解视频的制作框架本身：引擎（`src/engine/`）+ 脚本（`scripts/`）+ 一支示例片（`src/video/`）。
用户用中文交流；视频全部由代码写成，Clawd 当讲解员。

- **开新片**：`npm run new -- ClaudeSayXxx --title … --slug …`，新项目建在框架旁边。新片的台词和画面在新项目里写，不在这里写。
- **在这里改的是引擎**：改动要对所有片子都适用；只和某一期有关的东西留在那一期的 `src/video/` 里。
- **引擎是起点，不是终点**（GUIDE 第 0 节）：鼓励不断给引擎添新功能，让它越用越丰富；示例片只演示 API，不是新片的模板，
  别让新片因为“引擎里有现成的”就少了为题目专门设计的画面。
- **示例片是引擎的回归测试**：引擎加了新功能，最好在示例片里用一次。改完至少跑一遍
  `npm run typecheck`、`npm run score`、`npm run snap -- <几个时刻>` 看截图；动到导出流程时再跑 `npm run render`。
- 视频项目里做的通用改进，用 `npm run engine -- push` 提交：push 会在框架仓库开一个 PR，人工审阅合并后再照上面检查一遍。

@GUIDE.md
