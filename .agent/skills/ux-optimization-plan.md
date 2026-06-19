# i18n-plus UX 优化 — 执行计划

## 分三阶段推进

### 🟢 Phase 1：快赢（不改架构，纯文案和展示层）

| # | 改动 | 文件 | 难度 |
|---|------|------|------|
| 1 | 插件名显示友好名称（从 manifest.name 读），不显示 raw ID | `dictionary-manager.ts` | ⭐ |
| 2 | locale 下拉框显示语言全名（"中文" 而不是 "zh"） | `dictionary-manager.ts` | ⭐ |
| 3 | 命令名走自身 i18n（Open dictionary manager → 翻译） | `main.ts` | ⭐ |
| 4 | 硬编码错误消息补翻译（"No plugins found" → 走 t()） | `dictionary-manager.ts` | ⭐ |
| 5 | 搜索同时匹配 ID 和 Manifest 名称 | `dictionary-manager.ts` | ⭐ |
| 6 | 简化 badge 文案："BUILTIN" → "内置"，"EXTERNAL" → "用户导入" | `dictionary-manager.ts` + locale | ⭐ |
| 7 | 一键下载当前插件所有可用语言的翻译 | `dictionary-manager.ts` | ⭐⭐ |
| 8 | 注册全局快捷键（Cmd+Shift+I 切换面板） | `main.ts` | ⭐ |

### 🟡 Phase 2：核心体验

| # | 改动 | 文件 | 难度 |
|---|------|------|------|
| 9 | 记忆面板位置（关闭时存、打开时恢复） | `floating-widget.ts` | ⭐⭐ |
| 10 | 设置页扩容（CDN 源配置、语言偏好选择器） | `settings.ts` | ⭐⭐⭐ |

### 🔴 Phase 3：架构级

| # | 改动 | 文件 | 难度 |
|---|------|------|------|
| 11 | locale alias 系统（zh-CN → zh 归一化，摆脱硬编码） | `framework/` | ⭐⭐⭐ |
| 12 | 评估是否改用 Obsidian ItemView 替代自定义浮动面板 | 整体架构 | ⭐⭐⭐⭐ |

## 工作量估算

- Phase 1: 约 400-600 行改动，8 个子任务，无架构风险
- Phase 2: 约 100-200 行，涉及数据持久化
- Phase 3: 约 200-400 行，涉及框架改动，需向后兼容

## 建议执行顺序

Phase 1 全做完 → 你验收 → Phase 2 → 你验收 → Phase 3（需要讨论架构）
