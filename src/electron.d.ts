/**
 * electron 模块的类型声明：Obsidian 桌面端在运行时注入 `electron`，
 * 插件仅用到 shell.openExternal（系统浏览器打开链接）。
 * esbuild 配置把 electron 列为 external，构建时不打包。
 */
declare module 'electron' {
  export const shell: {
    openExternal(url: string): Promise<void>
  }
}
