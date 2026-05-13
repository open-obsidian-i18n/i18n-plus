---
description: Adapt an Obsidian plugin to i18n-plus for internationalization support
---

# i18n-plus Plugin Adaptation Skill

This skill guides you through adapting an Obsidian plugin to the i18n-plus framework for zero-dependency internationalization.

## Prerequisites

Ensure you have access to the following scripts in the `i18n-plus` repository:
- `scripts/i18n-codemod.cjs` - Automatic string replacement
- `scripts/extract-keys.cjs` - Key extraction
- `templates/adapter.ts` - The adapter template

## Adaptation Steps

### Step 1: Copy the Adapter

Copy the adapter template to the target plugin's source directory.

```bash
# Create lang directory if it doesn't exist
mkdir -p <target-plugin>/src/lang/
# Copy adapter
cp <i18n-plus-path>/templates/adapter.ts <target-plugin>/src/lang/i18n.ts
```

### Step 2: Initialize in main.ts

Modify the plugin's entry file (`main.ts`) to initialize the i18n system.

1. **Add import at the top:**
   ```typescript
   import { initI18n, I18nAdapter } from './lang/i18n';
   ```

2. **Add property declarations in the Plugin class:**
   ```typescript
   export default class MyPlugin extends Plugin {
       i18n: I18nAdapter;
       t: (key: string, params?: Record<string, string | number>) => string;
       // ... existing properties
   }
   ```

3. **Initialize in onload() as the FIRST line:**
   ```typescript
   async onload() {
       this.i18n = initI18n(this);
       this.t = this.i18n.t.bind(this.i18n);
       // ... rest of onload
   }
   ```

### Step 3: Run Codemod

Automatically replace hardcoded strings with `t()` calls.

```bash
npx jscodeshift -t <i18n-plus-path>/scripts/i18n-codemod.cjs <target-plugin>/src/ --parser=ts
```

> **Note:** Codemod handles common UI methods (setText, setDesc, Notice, etc.) but cannot process:
> - Dynamic string concatenation with variables
> - Strings in arrays
> - Complex template literals

### Step 4: Manual Fixes

Review and fix cases that Codemod missed:

#### 4.1 Dynamic Interpolation
```typescript
// Before (Codemod can't handle)
.setDesc("Time: " + DateTime.now().toFormat())

// After (Manual fix)
.setDesc(this.t("Time: {time}", { time: DateTime.now().toFormat() }))
```

#### 4.2 Strings in Arrays
```typescript
// Before
const options = ["Option A", "Option B"];

// After
const options = [this.t("Option A"), this.t("Option B")];
```

#### 4.3 Complex DOM with Links
```typescript
// Before
frag.appendText("Click ");
frag.createEl("a", { text: "here", href: "..." });
frag.appendText(" for more.");

// After - Split into multiple t() calls
frag.appendText(this.t("Click "));
frag.createEl("a", { text: this.t("here"), href: "..." });
frag.appendText(this.t(" for more."));
```

### Step 5: Extract Keys

Generate the default English dictionary from all `t()` calls.

```bash
node <i18n-plus-path>/scripts/extract-keys.cjs <target-plugin>/src
```

This creates `src/lang/locales/en.ts`. Update the adapter's import to reference this file:
```typescript
import en from './locales/en';
```

### Step 6: Verify

1. **Build the plugin:** `npm run build`
2. **Reload in Obsidian:** Test the plugin
3. **Export dictionary:** Use i18n-plus Dictionary Manager to export `en.json`
4. **Test hot reload:** Switch languages to verify instant updates

## Creating Translations

1. Copy `en.json` to `zh.json` (or other locale)
2. Update `$meta.locale` to `zh`
3. Translate all values while preserving `{placeholder}` syntax
4. Import via i18n-plus or add as built-in locale in adapter

## Built-in Language Configuration

To add built-in languages, modify the adapter:

```typescript
import en from './locales/en';
import zh from './locales/zh'; // Add import

const BUILTIN_LOCALES: Record<string, Record<string, string>> = {
    'en': en,
    'zh': zh,  // Add to map
};
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `t is not a function` | Ensure `this.t = this.i18n.t.bind(this.i18n)` |
| Keys not extracted | Check that strings use `t("literal")`, not variables |
| Hot reload not working | Verify adapter's `setLocale` is properly implemented |
