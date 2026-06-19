---
trigger: always_on
---
# Architecture Rules

## 模块边界

```
src/
├── framework/     ← 纯逻辑，不能 import Obsidian API
│   ├── types.ts         类型定义
│   ├── translator.ts    单插件翻译器（fallback 链）
│   ├── global-api.ts    全局管理器（window.i18nPlus）
│   └── locales.ts       语言列表
├── services/      ← 文件 IO + 网络
│   ├── dictionary-store.ts   词典持久化
│   ├── cloud-manager.ts      CDN 下载
│   └── theme-extractor.ts    CSS 设置解析
├── ui/            ← Obsidian UI 组件
│   ├── floating-widget.ts
│   ├── dictionary-manager.ts
│   ├── dictionary-editor-modal.ts
│   └── metadata-editor-view.ts
├── main.ts        ← 插件入口
└── settings.ts    ← 设置页
```

## 不可违反

- `framework/` 不能 import `obsidian` 或任何 Obsidian API
- `services/` 可以使用 Obsidian 的 `requestUrl` 但不能操作 DOM
- `ui/` 可以和 Obsidian API 交互
- `templates/adapter.ts` 必须能独立工作（不依赖 i18n-plus 插件）
