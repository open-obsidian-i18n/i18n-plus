# Phase 4: ItemView + Popout Window 改造

## 为什么改

i18n+ 的词典编辑器之前依赖 `I18nFloatingWidget`（自制定位 DOM），存在三个痛点：
1. **遮挡编辑区** — 浮动面板盖在用户工作区上方，不能像独立窗口那样放到副屏
2. **不是 Obsidian 原生 View** — 不继承 Obsidian 的 View 生命周期和状态管理
3. **不能在不丢失编辑状态的情况下浏览其他插件** — 模态框会聚集焦点

Obsidian v0.15.4+ 提供 `workspace.openPopoutLeaf()` API，v1.9 的设置窗口也是基于此实现。
改造后编辑器在独立 OS 窗口中打开，用户可同时编辑翻译和使用其他插件。

## 改了哪些文件

| 文件 | 改动 |
|------|------|
| `src/ui/i18n-editor-view.ts` | **新增** — `I18nPlusEditorView extends ItemView`，接收 state 初始化参数 |
| `src/main.ts` | 注册 `VIEW_TYPE_I18N_EDITOR`；新增 `openEditorInPopout()` 使用 Popout API；`showDictionaryEditor()` 改为委托给 popout |
| `styles.css` | 新增 `.i18n-plus-editor-view` 样式，确保编辑器在 popout 窗口中自适应填充 |

## 特意没改什么

- ❌ 不改字典管理器渲染方式 — 继续在浮动面板中显示
- ❌ 不改 DictionaryEditorView 渲染逻辑 — ItemView 包装复用
- ❌ 不改浮动面板 showView — 保留为移动端 fallback
- ❌ 不改测试 — 不影响纯逻辑层

## 技术细节

### 打开流程

```
用户点击"编辑"按钮
  → main.showDictionaryEditor(pluginId, locale)
    → (try) app.workspace.openPopoutLeaf({ size: 900x700 })
      → leaf.setViewState({ type, state })
        → Obsidian 实例化 I18nPlusEditorView
          → onOpen() → new DictionaryEditorView(...).render(contentEl)
    → (catch) fallback: floatingWidget.showView(...)
```

### 状态持久化

`I18nPlusEditorView` 实现了 `getState()` / `setState()`，Obsidian 工作区恢复时会自动恢复打开的编辑窗口。

### 跨窗口兼容

- 移动端：`openPopoutLeaf()` 抛出异常 → try/catch fallback 到浮动面板
- `instanceof`：编辑器内部不使用跨窗口 `instanceof`（DictionaryEditorView 不涉及元素类型检查）
- CSS 变量：Popout 窗口自动继承 Obsidian 主题变量

## 风险

无。改动不涉及纯逻辑层，只改了调用方式和渲染容器。原有浮动面板的编辑器渲染路径完整保留（作为 fallback）。
