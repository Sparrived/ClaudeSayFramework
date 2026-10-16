import { defineConfig } from 'vite'

// 开发服务器的端口：每个视频项目各用一个（npm run new 会按项目名换一个），几个项目可以同时开着
export default defineConfig({
  server: { port: 5170 },
})
