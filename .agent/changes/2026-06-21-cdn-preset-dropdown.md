## 2026-06-21-cdn-preset-dropdown.md

**why:** CDN source URL 用纯文本输入，极客不友好。改成了下拉选择预设 + 条件性自定义输入。

**what:**
- `src/settings.ts` — 新增 `CdnPreset` 类型、`CDN_PRESETS` 映射、下拉 dropdown + 条件性 `custom` 输入框
- `src/main.ts` — `loadSettings()` 增加旧版设置迁移逻辑（自动检测旧 `cdnUrl` 匹配预设）
- `src/lang/index.ts` — 新增 6 个 CDN 相关 i18n key

**not changed:**
- `cloud-manager.ts` — 不需要改，`setCdnUrl()` 接口不变
- 适配器模板 — 不涉及
- 词典格式 — 不涉及

**risk:**
- 旧版用户升级后，如果 `cdnUrl` 不在已知预设列表中，会自动切成 `custom` 模式并保留原 URL。不影响功能。
- `versions.json` 的兼容范围不变（0.3.0 → 1.4.4 继续有效）。
