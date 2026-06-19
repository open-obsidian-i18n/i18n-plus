# Phase 1: UX 快速优化 — 完成

## 为什么改

用户（曲淡歌）评估 i18n-plus 的使用体验后，发现多处 UI 可以优化：
command 名硬编码英文、错误消息未翻译、locale 显示不友好、
插件显示 raw ID、无批量下载功能等。

## 改了哪些文件

| 文件 | 改动 |
|------|------|
| `src/main.ts` | 3 个 command 名从硬编码英文改为 `t()` 调用 |
| `src/lang/index.ts` | 新增 11 个 i18n key（命令名、错误消息、批量下载） |
| `src/lang/zh.json` | 新增 13 个中文翻译 |
| `src/ui/dictionary-manager.ts` | 14 处改动：友好插件名、语言全名下拉、硬编码字符串替换、批量下载按钮、getPluginDisplayName 方法 |

同时修复了 `src/lang/index.ts` 中 self-i18n 的语言检测——之前 `currentLocale: undefined` 导致始终用英文，
现在用 `moment.locale().split('-')[0]` 自动检测（zh-cn → zh）。

## 特意没改什么

- 服务层（`src/services/`）未动
- 框架层（`src/framework/`）未动
- 适配器模板未动
- 不涉及词典格式变更
- locale alias 系统（zh-CN → zh）未做完整实现，仅做了简单的 split 归一化

## 风险

低。所有改动是纯展示层 + i18n key 替换。单个 key 拼错只会导致该处显示英文 fallback，
不影响核心功能。可在 Obsidian 中重新加载插件验证。
