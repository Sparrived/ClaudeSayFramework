import { defineConfig } from 'vite'

// 开发服务器的端口：每个视频项目各用一个（npm run new 会按项目名换一个），几个项目可以同时开着
//
// 框架自己有两支示例片：src/video（Claude 系列）和 src/video-deepseek（DS 系列）。
// 设环境变量 DEMO=deepseek，入口（main.ts / cover.ts）里的 ./video/ 就改指向 src/video-deepseek/，
// npm run dev / snap / score / cover / render 照常用：DEMO=deepseek npm run snap -- ch:sky+3
const demo = process.env.DEMO
export default defineConfig({
  server: { port: 5170 },
  resolve: { alias: demo ? [{ find: /^\.\/video\//, replacement: `/src/video-${demo}/` }] : [] },
})
