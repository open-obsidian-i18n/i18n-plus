# Phase 3: Locale Alias 完整系统

## 为什么改

Phase 1&2 建立了翻译管线（translate, fallback, settings, cloud sync），但 locale alias 处理存在多个漏洞：

1. `resolveLocale()` 定义在 `locales.ts` 但**零被调用** — 形同虚设
2. `LOCALE_ALIASES` 只有 4 条（`zh-cn→zh`, `zh-hans→zh`, `zh-hant→zh-tw`, `pt-pt→pt`），覆盖面严重不足
3. 翻译管线中 locale 变体（`zh-CN`、`nb`、`es-es` 等）被当作独立 locale 处理，导致词典重复加载
4. `getTranslation()` 的 base language fallback 用内联 `split('-')[0]` 而非 alias 系统
5. 文件和内存中可能同时存在 `zh` 和 `zh-CN` 两份词典

## 改了哪些文件

| 文件 | 改动 |
|------|------|
| `src/framework/locales.ts` | `LOCALE_ALIASES` 从 `Record<string,string>` 改为 `Map`（性能更好），覆盖增加到 30+ 条别名；`normalizeLocaleCode()` 增强：支持 `.` 后缀剥离（`zh.hans → zh`）、`_` 全替换为 `-`；`resolveLocale()` 保持不变作为统一入口 |
| `src/framework/translator.ts` | 构造函数、`loadDictionary()`、`loadBuiltinDictionary()`、`unloadDictionary()`、`setLocale()`、`getDictionary()`、`getBuiltinDictionary()` — 所有 locale 参数、存储键、比较均走 `resolveLocale()` |
| `src/framework/global-api.ts` | `setGlobalLocale()` 存入前 resolve；`getTranslation()` 的 fallback 从内联 split 改为走 `resolveLocale()` |
| `src/main.ts` | 加载持久化 locale 时 resolve 并自动回写兼容值；auto-detect 也走 resolve |
| `src/settings.ts` | 下拉切换语言时 resolve 后再存和通知 |
| `src/services/dictionary-store.ts` | `getDictionaryFilePath()` / `getThemeDictionaryFilePath()` 中 resolve locale，确保文件系统使用规范化文件名 |

## 特意没改什么

- 不改 `initSelfI18n()` 中 `split('-')[0]` — translator 构造函数内部已 resolve，行为正确
- 不改 cloud-manager — 云端字典 url 不受 locale 影响
- 不改浮动面板/子视图 — 与 locale 无关
- 不改 ItemView — 已评估搁置到 Phase 4
- 不改 `locales.ts` 的其他导出函数 — `isValidLocale()`、`getLocaleInfo()` 按需使用

## 风险

- **旧版本字典文件迁移**：用户本地可能有 `zh-CN.json` 等非规范化文件名。`listAllDictionaries()` 扫文件时 locale 从文件名提取为 `zh-CN`，加载时 translator 会 resolve 为 `zh` 并存入 canonical 键。但 `zh-CN.json` 文件不自动重命名，后续 save 操作会创建 `zh.json`。旧文件仍然存在但不会被加载（因为 `getDictionaryFilePath` 现在返回 `zh.json`）。这是安全的渐进迁移——用户可以手动删除旧文件。
- **Alias 双向冲突**：如果 `zh-cn` 和 `zh` 的词典内容不同，现在都压到 `zh` 键下，后加载的覆盖先加载的。这与"最后加载的版本是实际的"行为一致，且通常云词典和本地词典不会同时加载相同 locale 变体。
