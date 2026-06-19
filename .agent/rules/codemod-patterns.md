---
trigger: always_on
---
# Codemod 模式规则

## 已覆盖的 17 种模式

见 `scripts/i18n-codemod.cjs` 中的编号区块（1-15，其中 14-15 是标注）。

## 新增模式的判断标准

新增模式前，回答三个问题：

1. **这个方法的第一个/第 N 个参数 100% 是 UI 文本吗？**
   - ✅ `addRibbonIcon("icon", "tooltip")` → 第二个参数是 UI
   - ❌ `addCommand({ id: "...", name: "..." })` → id 不是，name 是
   - ❌ `createEl("div")` → 第一个参数是标签名，不是 UI

2. **这个字符串会被用户看到吗？**
   - ✅ `new Error("Something failed")` → 作为 Notice 显示
   - ❌ `console.debug("cache miss for key")` → 开发者日志
   - ❌ 正则表达式、文件路径、CSS 类名

3. **需要区分 `this.t()` 还是 `this.plugin.t()` 吗？**
   - codemod 的 `shouldUsePluginT()` 自动检测 class 是否有 `plugin` 属性
   - 如果工具函数不在 class 里（如 `log_error`），需要加 `t` 参数注入

## 验证步骤

每次修改 codemod 后：

```bash
# 1. 语法检查
node -c scripts/i18n-codemod.cjs

# 2. 在测试文件上 dry-run
npx jscodeshift -t scripts/i18n-codemod.cjs /tmp/test.ts --parser=ts --dry --print

# 3. 确认只有目标字符串被替换，没有误伤
```
