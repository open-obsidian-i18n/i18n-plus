# Phase 2: 核心体验优化 — Proposal

## 为什么改

Phase 1 处理了展示层问题。Phase 2 解决两个核心体验缺失：
面板位置不记忆、设置页功能太少。

## 任务

### Task 9: 记忆面板位置
- 在 `I18nPlusSettings` 中加 `widgetPosX` / `widgetPosY`
- 拖拽结束时保存位置
- 创建 widget 时从 settings 恢复位置

### Task 10: 设置页扩容
- 语言偏好选择器（用 `manager.setGlobalLocale()` 切换全局语言）
- CDN 源 URL 配置（`cloudManager` 的源地址）
- 已注册插件概览（当前已有，稍做美化）
- 显示云端词典总数统计

## 改了哪些文件

- `src/main.ts` — settings 加新字段
- `src/settings.ts` — 设置页 UI 扩容
- `src/ui/floating-widget.ts` — 位置持久化
- `src/services/cloud-manager.ts` — CDN 源可配置（如需要）

## 特意没改什么

- 不改框架层
- 不改词典格式
- 不影响适配器模板
- 不改 UI 组件内部逻辑
- 不改插件间通信

## 风险

低。位置记忆是新增字段，settings 读取兼容旧数据（undefined 时用默认值）。
设置页新增 UI 元素，不涉及数据变更。
