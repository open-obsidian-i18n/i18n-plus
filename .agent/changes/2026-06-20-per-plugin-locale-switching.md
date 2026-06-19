# Per-Plugin Locale Switching & Auto-Restart

## 为什么改

1. 切换第三方插件语言后，用户需要手动重启 Obsidian 才能看到效果，体验差
2. 需要一个事件机制让 i18n+ 自身能动态刷新，同时让第三方插件也能自动生效
3. 每个插件的语言偏好需要独立持久化，不能共用全局设置

## 改了哪些文件

### 框架层
- **src/framework/types.ts** — 新增 `'plugin-locale-changed'` 事件名
- **src/framework/global-api.ts** — 新增 `setPluginLocale(pluginId, locale)` 方法，设置后 emit 事件

### 插件核心
- **src/main.ts** — 
  - 监听 `plugin-locale-changed` 事件，i18n+ 自身动态刷新面板/弹出窗口
  - `plugin-registered` handler 改为先读 per-plugin locale，再 fallback 到全局
  - 新增 `showMainPopout()` 统一弹出窗口入口，支持路由参数
  - `showDictionaryManager()` / `showDictionaryEditor()` 之间导航不走浮窗
- **src/settings.ts** — 新增 `pluginLocales: Record<string, string>` 字段

### UI
- **src/ui/dictionary-manager.ts** — 
  - 下拉切换时调用 `manager.setPluginLocale()` + 持久化 + 同步选择状态
  - **新增**：对非 i18n+ 插件，切换语言后自动 `disablePlugin()` + `enablePlugin()` 重启
  - 支持 `navigationTarget` 在弹出窗口内路由导航
- **src/ui/i18n-editor-view.ts** — 重命名为 `I18nPlusMainView`，支持内部路由（manager ↔ editor）

### 文档
- **README.md** — 特性描述从 "Hot Reload" 改为 "Per-Plugin Locale Switching"；快速开始更新
- **docs/README.zh-CN.md** — 同上，中文版
- **docs/WHITEPAPER.zh-CN.md** — 2.2 用户端新增独立切换语言；路线图已完成后更新
- **docs/WHITEPAPER.en.md** — 同上，英文版

## 特意没改什么

- 适配器模板（`templates/adapter.ts`）—— 零改动，向后完全兼容
- 已有插件的集成方式不变。不注册事件、不监听，功能上无感知
- i18n+ 自身切换语言的动态刷新方式不变（仍是浮窗 refresh + 弹出窗口 renderRoute）

## 风险是什么

- 自动重启插件 (`disablePlugin` → `enablePlugin`) 可能导致插件状态短暂丢失（如正在编辑的内容）—— 已在 Notice 中提示用户
- 如果插件 `disablePlugin()` 失败，会 fallback 到通知用户手动重启
- 事件系统对未监听的插件零开销
- 回退方案：关闭 `main.ts` 中的事件 listener block 即可回到 "需手动重启" 模式
