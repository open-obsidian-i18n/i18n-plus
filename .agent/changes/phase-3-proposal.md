# Phase 3 Proposal: Locale Alias 系统 + ItemView 评估

## 背景

Phase 1 建立了基础翻译管线，Phase 2 完成了设置页扩容和浮动面板位置记忆。当前上游 repo 已包含 Phase 2 全部功能。

## Phase 3 目标

两块：

1. **Locale Alias 完整系统** — 当前 `resolveLocale()` 定义在 `locales.ts` 但从未被实际调用，alias 表只有 4 条。需要把 alias 真正接入翻译管线。
2. **ItemView 可 dock 面板评估** — 当前浮动面板是纯 DOM，不能 dock 到 Obsidian 侧栏。评估是否/如何改为 ItemView。

---

## 1. Locale Alias 系统

### 当前问题

- `resolveLocale()` 函数存在，但零使用（只被定义）
- `LOCALE_ALIASES` 只有 `zh-cn→zh`、`zh-hans→zh`、`zh-hant→zh-tw`、`pt-pt→pt` 4 条
- Translator 的 `t()` 查找时不做 locale alias 解析
- `getTranslation()` 的 fallback 是内联写的 `split('-')[0]`，不是走 alias 系统
- 外部词典下载后，如果上传的 locale 是 `zh-CN`、`zh_Hans` 等变体，会加载为独立词典（重复）
- 用户从设置下拉选 `zh-tw (Chinese Traditional)` 后 setGlobalLocale，alias 系统未参与

### 改动方案

#### A. 扩充 LOCALE_ALIASES

覆盖所有 Obsidian 已知变体：

| 源 | 目标 | 说明 |
|----|------|------|
| `zh-cn`, `zh-hans`, `zh-sg` | `zh` | 简体中文 |
| `zh-hk`, `zh-mo`, `zh-tw`, `zh-hant` | `zh-tw` | 繁体中文 |
| `pt-br` | `pt-br` | 巴西葡语（保留独立） |
| `pt-pt` | `pt` | 欧洲葡语 |
| `en-gb` | `en-gb` | 英式英语（保留独立） |
| `en-us` | `en` | 美式英语 |
| `nb`, `nn` | `no` | 挪威语 |
| `ms-my` | `ms` | 马来语 |

#### B. 接入翻译管线 (3 个调用点)

1. **`global-api.ts` → `setGlobalLocale()`**
   - 调用 `resolveLocale()` 后再存储 + emit
   - 确保 `zh-CN` 设置后实际使用 `zh`

2. **`global-api.ts` → `getTranslation()`**
   - 调用 `resolveLocale()` 解析 `this.currentLocale`
   - fallback 走 alias 系统而非内联 split

3. **`translator.ts` → `t()`**
   - 查找当前 locale 字典前先 resolve
   - 未命中时，尝试 base locale 的 alias 解析

4. **`dictionary-store.ts`**（未读，需确认）
   - 加载词典时 resolve locale，避免 `zh` 和 `zh-cn` 加载两份

#### C. locales.ts 内部清理

- `normalizeLocaleCode()` 目前只处理 `_→-`，加一行去除 `.` 后缀（`zh.hans` → `zh`）
- `LOCALE_ALIASES` 改为 Map（目前是 `Record<string, string>`），更好性能

---

## 2. ItemView 评估

### 当前架构

```
I18nFloatingWidget
├── bubbleEl  ← 小圆球（collapsed 状态）
└── panelEl   ← 主面板（expanded 状态）
    ├── header (drag handle + controls)
    └── contentContainer (通过 showView 渲染子视图)
```

暴露 API：`showView(renderFn, title?)` / `show()` / `hide()` / `expand()` / `collapse()`

### 改为 ItemView 的收益

- ✅ 可 dock 到左侧/右侧侧栏，不遮挡编辑区
- ✅ 多标签页切换（多个字典同时编辑）
- ✅ 状态由 Obsidian 管理（自动保存展开/收起）
- ✅ 在 Obsidian 移动端原生支持

### 改造成本

- ❌ **大量重构** — 所有子视图（DictionaryManagerView、DictionaryEditorView）的渲染方式是 `(container) => void`，ItemView 需要改为 Obsidian 标准的 `.addChild()` 模式
- ❌ **拖拽面板功能丧失** — ItemView 不可任意浮动，意味着浮动定位 + 拖拽记忆逻辑浪费
- ❌ **不能直接关闭** — ItemView 的关闭是销毁视图，不是 hide
- ❌ **双向 API 改动** — 所有调用 `this.floatingWidget.showView(...)` 的地方都要改

### 建议方案：混合模式

```
┌─ 用户选择 ──────────────────────────────┐
│  ● Floating (默认，当前模式)              │
│  ○ Docked (ItemView 在右侧侧栏)          │
└──────────────────────────────────────────┘
```

- 保持 `I18nFloatingWidget` 不变（float 模式）
- 新增 `I18nPlusDockedView extends ItemView`（docked 模式）
- 两者共用同一组 renderer 函数
- 设置页加一个单选「面板模式：浮动 / Dock」
- 切换时销毁旧实例，创建新实例

**但这个方案在 Phase 3 做太重了。** 纯 ItemView 改造至少涉及：
- `main.ts` 中 `registerView()` + `registerViewType()`
- 新 View 类（60+ 行）
- 子视图重构（每个 `.render(container)` → `.getView()` + `addChild()`）
- 状态同步（浮动定位只在 float 模式下有意义）

### 评估结论

| 维度 | 评分 | 说明 |
|------|------|------|
| 用户体验收益 | 中 | 部分用户喜欢 dock，但浮动面板也够用 |
| 实现成本 | 高 | 3+ 文件改动，子视图渲染方式重构 |
| 维护负担 | 中 | 两套模式共存增加了分支复杂度 |
| 当前优先级 | 低 | 可推迟到 Phase 4 或用户明确需求后 |

---

## 定案

**Phase 3 集中做 Locale Alias 完整系统**，ItemView 搁置为 future consideration。

### 改动文件清单

| 文件 | 改动 |
|------|------|
| `src/framework/locales.ts` | 扩充 `LOCALE_ALIASES` 表、`normalizeLocaleCode()` 增强、`LOCALE_ALIASES` 改为 Map |
| `src/framework/translator.ts` | `t()` 方法中 apply `resolveLocale()` 到当前 locale |
| `src/framework/global-api.ts` | `setGlobalLocale()` 使用 `resolveLocale()`；`getTranslation()` 使用 `resolveLocale()` |
| `src/main.ts` | 加载设置后 resolve locale 再 setGlobalLocale（确保持久化 locale 也被解析） |
| `src/settings.ts` | 切换语言时 resolve 再存 |

（后续确认 `dictionary-store.ts` 和 `metadata-editor-view.ts` 是否也需要改动）

### 不做的

- ❌ 不改 ItemView
- ❌ 不改浮动面板
- ❌ 不改 cloud-manager（字典下载 url 不受 locale 影响）
- ❌ 不增加设置项

### 风险

- **Alias 双向**：如果用户存了 `zh-CN` 到 settings，alias 解析后存成 `zh`，下次加载时与之前的行为不同。需要 `loadSettings()` 时也走一遍 resolve，确保旧版本用户的数据无缝迁移。
- **词典重复**：如果已加载了 `zh-cn` 词典，alias 后变成 `zh`，可能加载两份。需在 `loadDictionary()` 时 resolve locale 并检查 `dictionaries.has(resolvedKey)`。
