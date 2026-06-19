# 测试纪律 — Testing Discipline

## 核心原则

测试是代码的安全网，不是负担。你改得越快，越需要测试兜底。

---

## 什么必须写测试

### ✅ `src/framework/` 必测

`framework/` 层不 import `obsidian`，可以脱离 Obsidian 跑纯逻辑测试。所有涉及以下场景的都写：

| 场景 | 示例 |
|------|------|
| locale 解析 | `resolveLocale('zh-CN') → 'zh'` |
| 词典加载/卸载 | `loadDictionary('nb', dict)` 应自动 alias 为 `no` |
| locale 设置 | `setLocale('zh-TW')` 应 resolve 为 `zh-tw` |
| 翻译 fallback | 当前 locale 缺 key → base locale → raw key |
| 参数插值 | `t('welcome', {name: 'Alice'})` |
| Context 翻译 | `t('title', {context: 'male'})` |
| 事件发射 | `setGlobalLocale` 应 emit `locale-changed` |
| 边界条件 | 空字符串、未知 code、全 BCP 47 tag |

### ✅ 脚本也可测试

`scripts/` 下的 codemod / extractor 如果有复杂逻辑，也写测试。vitest 或 node:test 都行。

### ❌ 不需要测试的场景

- UI 层（浮动面板、设置页渲染）— 这些依赖 Obsidian API，且改动不涉及核心逻辑
- Obsidian 集成层（`settings.ts` 的 Setting 构建、`main.ts` 的 plugin lifecycle）
- Cloud-manager（依赖 Obsidian requestUrl 和网络）

---

## 怎么写

### 文件命名

与源文件同路径，扩展名 `.test.ts`：

```
src/framework/locales.ts       → src/framework/locales.test.ts
src/framework/translator.ts    → src/framework/translator.test.ts
src/framework/global-api.ts    → src/framework/global-api.test.ts
scripts/i18n-codemod.cjs      → scripts/i18n-codemod.test.cjs
```

### 测试结构

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('I18nTranslator', () => {
  let translator: I18nTranslator;

  beforeEach(() => {
    translator = createTranslator({...});
  });

  describe('setLocale', () => {
    it('resolves alias', () => {
      translator.setLocale('zh-CN');
      expect(translator.getLocale()).toBe('zh');
    });

    it('canonical codes unchanged', () => {
      translator.setLocale('fr');
      expect(translator.getLocale()).toBe('fr');
    });
  });
});
```

### 不要做的事

- ❌ 不要 mock `obsidian` — 测试只覆盖 framework 纯逻辑
- ❌ 不要依赖网络 / 文件系统 — 测试跑在 `environment: 'node'`
- ❌ 不要写集成测试直到 CI 支持 Obsidian 环境
- ❌ 不要一份测试测太多东西 — 一个 `it('does one thing')` 只测一件事

---

## 什么时候跑

### 开发中

```bash
npm test              # 一次性
npm run test:watch    # 文件变化自动重跑
```

### 提交前

```bash
npm run build && npm test   # 编译 + 测试都过
```

### CI 自动跑

`package.json` 已配 `"test": "vitest run"`。接入 GitHub Actions 后 PR 自动触发。

---

## 测试驱动的原则（TDD 适用于这些场景）

如果你在开发时已经能确定输入和输出，推荐**先写测试再写代码**：

1. 先想好：`resolveLocale('nb')` 应该返回什么 → `no`
2. 写一个会失败的测试：`expect(resolveLocale('nb')).toBe('no')`
3. 去 `locales.ts` 加一条 alias
4. 测试变绿

这个流程叫 **TDD（Test-Driven Development）**，适合：
- locale 解析、alias 映射这类纯函数
- 翻译 fallback 链的逻辑
- 任何 "输入 X → 输出 Y" 的确定性逻辑

不适合 TDD 的场景（写测试但不一定先写）：
- UI 布局、样式调整
- 依赖 Obsidian API 的集成逻辑

---

## 覆盖率目标

| 层 | 目标 | 当前 |
|----|------|------|
| `framework/locales.ts` | 100% 分支覆盖 | ✅ 41 tests |
| `framework/translator.ts` | 90%+ 分支覆盖 | ✅ 19 tests |
| `framework/global-api.ts` | 85%+ 方法覆盖 | ✅ 14 tests |
| `scripts/` | 按需增加 | ⏳ |
