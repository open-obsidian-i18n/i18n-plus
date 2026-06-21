## 2026-06-21-obsidian-review-fixes.md

**why:** Obsidian 官方自动代码审核报了一堆 warning/error，核心是 `any` 滥用、未用的导入/变量、`createEl('h3')` 替代方案、innerHTML 使用。

**what:**
- `src/settings.ts` — 3 处 `createEl('h3')` → `new Setting().setName().setHeading()`；`(this.app as any)` → `as unknown as PluginRegistry`；`opt.i18nKey as any` → `as LangKey`
- `src/main.ts` — 移除 unused 导入 `DictionaryEditorView`；`catch (e)` → `catch`；`(view as any)` → `as unknown as { renderRoute: () => void }`；`matched[0] as any` → `matched[0]`
- `src/lang/index.ts` — `(pluginInstance as any).i18n` → `as unknown as I18nPlusPlugin & { i18n: ... }`
- `src/ui/dictionary-manager.ts` — 修复 5 处 `(this.app as any)` → typed cast；`plugin as any` → typed interface；去除不必要的 `as HTMLSelectElement`；`(view as any)` → typed cast
- `src/ui/i18n-editor-view.ts` — `innerHTML` → `createTextNode().appendChild()`

**not changed:**
- 没有任何功能修改，纯代码质量修复
- 无版本号变更

**risk:**
- 极低。全是类型注解和 API 使用方式的改进，运行时行为不变。
