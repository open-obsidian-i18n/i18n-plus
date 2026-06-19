---
trigger: always_on
---
# Translation Chain Rules

## 翻译优先级（不可改变顺序）

```
t("key") 查找路径:

1. 外部词典（用户导入/云端下载）     ← 最高优先级
2. 内置词典当前语言（插件自带的 locale）
3. 上次成功的内置语言（智能回退）
4. 基础语言（插件开发者设定的 locale）
5. 原始 key                            ← 最后防线
```

## Locale 代码规则

- 一律小写：`zh` 不是 `zh-CN`，`en` 不是 `en-US`
- 使用 Obsidian 标准 locale 列表（`src/framework/locales.ts`）
- 适配器模板中 `moment.locale()` 可能返回 `zh-cn`，必须归一化为 `zh`
- 不支持的 locale 自动回退到基础语言

## 词典格式

```json
{
  "$meta": {
    "pluginId": "dataview",
    "pluginVersion": "0.5.0",
    "dictVersion": "1770304403150",
    "locale": "zh",
    "description": "Dataview 中文翻译"
  },
  "Automatic task completion tracking": "自动任务完成跟踪",
  "Refresh interval": "刷新间隔"
}
```

- `$meta` 字段保留，不翻译
- key 必须是原始英文字符串（不用 ID 编号）
- 空字符串表示未翻译，fallback 链自动处理
