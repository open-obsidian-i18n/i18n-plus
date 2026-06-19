# Phase 1: UX 快速优化

## 为什么改

用户（曲淡歌）评估 i18n-plus 插件的使用体验后，发现 13 个问题需要优化。
按照三层方法论（OpenSpec → Superpowers → gstack），先将 Phase 1 的 8 个快赢任务落地。

## 改了哪些文件

见下方 8 个子任务，每个记录具体的文件改动。

## 特意没改什么

- 不涉及框架层（src/framework/）
- 不涉及服务层（src/services/）
- 不改适配器模板（templates/adapter.ts）
- 不改词典格式
- 不改插件间通信协议
- 不做架构级重构（ItemView 评估、locale alias 系统留到 Phase 3）

## 风险

纯展示层改动，不涉及数据逻辑。单个任务改错最多影响对应 UI 元素的显示，
不影响插件的核心翻译功能。每个任务可独立回退。
