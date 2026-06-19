# i18n-plus — AI Agent Instructions

This file is the **entry point** for AI agents working on this project.
Module-level constraints live in `.agent/rules/`, reusable workflows in `.agent/skills/`.

---

## OpenSpec — 规格层（项目做什么）

### 项目定位

i18n-plus 是一套为 Obsidian 第三方插件提供国际化的**零依赖框架 + 管理插件**。

两层结构：

```
i18n-plus/
├── 框架层 (src/framework/)       ← 平台无关：翻译器、全局管理器、适配器模板
├── Obsidian 插件 (src/main.ts)    ← 用户安装：词典管理、云端同步、UI 编辑器
├── 自动化工具 (scripts/)          ← i18n-codemod, extract-keys, inject-i18n
└── 适配器模板 (templates/adapter.ts) ← 插件开发者复制的 160 行零依赖文件
```

### 核心约束（不可违反）

- **适配器必须零依赖** — `templates/adapter.ts` 只能使用 TypeScript 标准语法，不能 import 除 `obsidian` 以外的包
- **适配器必须独立可工作** — 即使用户没装 i18n-plus 插件，适配器也要能用内置词典翻译
- **翻译优先级链不能改** — 外部词典 > 内置当前语言 > 上次成功 > 基础语言 > raw key
- **插件作者零承诺** — 集成适配器 = 复制一个文件 + 改几行代码，不需要额外依赖或构建配置

### 架构决策记录

| 决策 | 理由 | 不可违反 |
|------|------|----------|
| 适配器是模板文件，不是 npm 包 | 降低集成门槛，无构建依赖 | ✅ |
| 五级 fallback 链 | 保证任何情况下不崩溃 | ✅ |
| 词典存 `.obsidian/i18n-plus/dictionaries/` | 不污染 vault 目录 | ✅ |
| 用 moment.locale() 检测系统语言 | Obsidian 内置 moment | ✅ |
| locale 代码统一小写（zh，不 zh-CN） | Obsidian 标准 | ✅ |

---

## Superpowers — 纪律层（怎么做）

### 开发守则

1. **不改规格之前先问** — 如果要改核心架构（fallback 链、适配器模板格式、词典格式），必须先写 proposal 确认
2. **codemod 先 dry-run** — 改 `scripts/i18n-codemod.cjs` 后，必须在测试文件上跑 `--dry --print` 验证
3. **测试兜底** — 参见 `.agent/rules/testing.md`。`src/framework/` 每改动纯逻辑必更新现有测试或新增用例。开发时 `npm run test:watch`，提交前 `npm test` 确保绿色。
4. **向后兼容** — 所有改动必须保持插件作者现有的 adapter 集成方式不变，不能要求已集成的插件改代码
5. **YAGNI** — 不添加没有实际需求的抽象层

### 代码规范

- 所有公共 API 要有 JSDoc
- TypeScript strict 模式
- i18n key 用原始英文字符串（不用 ID），方便人类阅读和调试
- `scripts/` 中的工具脚本用 `.cjs`（CommonJS）兼容 jscodeshift

### Codemod 新增模式规范

每次在 `scripts/i18n-codemod.cjs` 新增模式时：

1. 确认该方法的参数**100% 是 UI 文本**（不是 ID、路径、CSS 类名）
2. 在测试文件中添加对应用例
3. 跑 `--dry --print` 验证只有目标字符串被替换
4. 确保 `shouldIgnore` 过滤器能排除误伤

---

## gstack — 交付层（怎么发布）

### PR 工作流

```
[你的 fork] → [pr] → [review] → [merge] → [release]
```

1. 每个功能/修复一个独立分支
2. PR 标题格式：`feat: xxx` / `fix: xxx` / `chore: xxx`
3. 如果改了适配器模板，PR 需要附带一个 demo 插件的迁移测试
4. 如果改了 codemod，PR 需要附带 dry-run 输出截图

### 发布清单

- [ ] 版本号更新（manifest.json + versions.json）
- [ ] 编译通过（`node esbuild.config.mjs production`）
- [ ] 改动涉及的地方有测试（至少手动）
- [ ] 适配器模板未引入新依赖
- [ ] 词典格式未破坏向后兼容

### 失败复盘

如果发布后发现 bug，产出是一个 `.agent/rules/` 规则或 `.agent/skills/` 工作流，防止同类问题再次发生。不在聊天里口头记住教训。

---

## 第四条纪律：每次改动产生变更记录

改动 >= 3 个文件或涉及架构决策时，在 `.agent/changes/` 下写一条 markdown 记录：

```
.agent/changes/
├── YYYY-MM-DD-short-description.md
└── ...
```

每条记录回答四个问题：

1. **为什么改** — 原始需求 / 发现的问题
2. **改了哪些文件** — 文件清单 + 核心改动点
3. **特意没改什么** — 边界声明，防止后续误以为遗漏
4. **风险是什么** — 影响半径、回退方案

这个记录不是给人看的文档，是给 AI 和 reviewer 追溯上下文用的。以后任何人问"当时为什么这么改"，翻 `.agent/changes/` 就行。

---

## 快速命令

| 命令 | 用途 |
|------|------|
| `node esbuild.config.mjs production` | 生产编译 |
| `npx jscodeshift -t scripts/i18n-codemod.cjs src/ --parser=ts --dry --print` | codemod 试跑 |
| `node scripts/extract-keys.cjs src/` | 提取翻译 key |
| `npx jscodeshift -t scripts/inject-i18n.cjs src/main.ts --parser=ts` | 注入适配器 |
