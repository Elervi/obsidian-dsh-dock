/**
 * esbuild 构建：src/main.ts → main.js（Obsidian 插件单文件）。
 * - platform: node —— node 内置模块（child_process/fs/os/...）自动 external，
 *   运行时由 Obsidian 桌面端的 Node 环境 require 提供；
 * - obsidian / electron 保持 external（宿主注入）。
 * - sourcemap：只有 --watch（开发）才内联，一次性构建不内联 —— 与仓库已提交
 *   的 main.js 惯例一致（插件单文件保持精简），CI 的构建产物漂移检查依赖此约定。
 */
import esbuild from 'esbuild'

const production = process.argv.includes('--production')
const watch = process.argv.includes('--watch')

/** esbuild 平台 node 模式下内置模块自动 external，此处仅显式声明宿主模块 */
const external = ['obsidian', 'electron']

/** @type {import('esbuild').BuildOptions} */
const options = {
  entryPoints: ['src/main.ts'],
  bundle: true,
  external,
  format: 'cjs',
  target: 'node18',
  platform: 'node',
  sourcemap: watch ? 'inline' : false,
  minify: production,
  outfile: 'main.js',
  logLevel: 'info',
}

/** launcher.ts 单独产出 CJS，供 scripts/smoke.mjs 直接 require 验证 */
const launcherOptions = {
  entryPoints: ['src/launcher.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node18',
  outfile: 'lib/launcher.cjs',
  logLevel: 'info',
}

/** bridgeServer.ts 单独产出 CJS（纯 Node 可测，零 Obsidian 依赖），供 smoke 起假服务验证 */
const bridgeOptions = {
  entryPoints: ['src/bridgeServer.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node18',
  outfile: 'lib/bridgeServer.cjs',
  logLevel: 'info',
}

/** webProxy.ts 单独产出 CJS（纯 Node 可测），供 smoke 验证反向代理鉴权注入 */
const webProxyOptions = {
  entryPoints: ['src/webProxy.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node18',
  outfile: 'lib/webProxy.cjs',
  logLevel: 'info',
}

if (watch) {
  const ctx = await esbuild.context(options)
  await ctx.watch()
  const ctx2 = await esbuild.context(launcherOptions)
  await ctx2.watch()
  const ctx3 = await esbuild.context(bridgeOptions)
  await ctx3.watch()
  const ctx4 = await esbuild.context(webProxyOptions)
  await ctx4.watch()
  console.log('[dsh-dock] watching...')
} else {
  await esbuild.build(options)
  await esbuild.build(launcherOptions)
  await esbuild.build(bridgeOptions)
  await esbuild.build(webProxyOptions)
  console.log('[dsh-dock] build done -> main.js, lib/launcher.cjs, lib/bridgeServer.cjs, lib/webProxy.cjs')
}
