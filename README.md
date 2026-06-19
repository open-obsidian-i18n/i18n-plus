# i18n+

[![GitHub release](https://img.shields.io/github/v/release/dangehub/obsidian-plugins-i18n-plus)](https://github.com/dangehub/obsidian-plugins-i18n-plus/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[中文文档](docs/README.zh-CN.md)

**I18n Plus** is a powerful Obsidian internationalization (i18n) management plugin, and also a universal development framework for the plugin ecosystem.

For **Users**, it is an intuitive translation management tool that lets you easily translate/correct plugin translations.
For **Developers**, it provides zero-dependency i18n adapters and automated migration tools.

> **Read the Whitepaper**: For a deep dive into the philosophy, architecture, and future roadmap of Obsidian's third-party internationalization, please read the [Whitepaper](docs/WHITEPAPER.en.md).

## ✨ Features

### For Users
- **Visual Management**: View and manage translation status of all plugins in a unified panel
- **Per-Plugin Locale Switching**: Switch language for each plugin independently — i18n+ refreshes its own UI dynamically, and automatically restarts third-party plugins to apply the new locale immediately
- **Incremental Localization**: Modify only unsatisfactory translations via "Overlay" mode without affecting the original plugin
- **Community Sharing**: Import/Export `.json` translation files for easy sharing
- **Cloud Sync**: Download the latest community translation packages directly from the cloud

### For Developers
- **Zero Runtime Dependency**: Plugins work perfectly without I18n Plus installed
- **Standalone + Mixed Mode**: Built-in languages work independently; external dictionaries can override/extend them
- **Automated Migration**: Transform hardcoded strings to `t()` calls with one command
- **Type Safety**: TypeScript-based intelligent code completion

## 🚀 Quick Start

### For Users

1.  **Install Plugin**: Search for and install `i18n-plus` in Obsidian Community Plugins.
2.  **Open Manager**: Click the `🌐` icon in the left sidebar, or use the command `Open Dictionary Manager`.
3. **Switch Language**:
    -   Find the target plugin in the list
    -   Select `zh` or another language from the dropdown
    -   **i18n+ itself** refreshes dynamically; **other plugins** are automatically restarted to apply the new locale immediately
4.  **Correct Translation**:
    -   Click the `👁️` (View Content) button next to the plugin
    -   Modify the translation in the editor
    -   Click `Save` to apply changes immediately

---

### For Plugin Developers

> See the full [Migration Guide](docs/I18N_MIGRATION_GUIDE.en.md) for detailed integration instructions.

### For Plugin Developers

1. **Copy the adapter** to your plugin:
   ```bash
   cp templates/adapter.ts your-plugin/src/lang/i18n.ts
   ```

2. **Initialize in main.ts**:
   ```typescript
   import { initI18n } from './lang/i18n';
   
   export default class MyPlugin extends Plugin {
       i18n: I18nAdapter;
       t: (key: string, params?: any) => string;
       
       async onload() {
           this.i18n = initI18n(this);
           this.t = this.i18n.t.bind(this.i18n);
       }
   }
   ```

3. **Use translations**:
   ```typescript
   new Notice(this.t("Hello, {name}!", { name: "World" }));
   ```

### Automated Migration

Run the codemod to automatically replace hardcoded strings:

```bash
# Install jscodeshift
npm install -g jscodeshift

# Run codemod on your plugin
npx jscodeshift -t scripts/i18n-codemod.cjs your-plugin/src/ --parser=ts

# Extract keys to generate en.ts
node scripts/extract-keys.cjs your-plugin/src
```

## 📦 How It Works

### Priority System

When `t("key")` is called, the adapter searches in this order:

1. **External Dictionary** (loaded via I18n Plus)
2. **Built-in Language** (current locale)
3. **Last Successful Locale** (smart fallback to previous working language)
4. **Base Locale** (configurable, defaults to English)
5. **Raw Key**

This means:
- Users can override built-in translations with custom JSON files
- New languages can be added without modifying plugin code
- If a new language fails, it falls back to the last working language (not hardcoded English)
- Plugins work offline without I18n Plus installed

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Your Plugin                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  adapter.ts (self-contained, ~150 lines)        │    │
│  │  ├── BUILTIN_LOCALES: { en, zh, ... }           │    │
│  │  └── _externalDictionaries: { de, fr, ... }     │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                          ▲
                          │ (optional)
                          ▼
┌─────────────────────────────────────────────────────────┐
│               I18n Plus Plugin (optional)                │
│  ├── Dictionary Manager UI                               │
│  ├── Global Locale Sync                                  │
│  └── External .json Import/Export                        │
└─────────────────────────────────────────────────────────┘
```

## 🛠️ Scripts

| Script | Description |
|--------|-------------|
| `i18n-codemod.cjs` | Transform hardcoded strings to `t()` calls |
| `extract-keys.cjs` | Extract all keys and generate `en.ts` |
| `inject-i18n.cjs` | Auto-inject adapter into `main.ts` |
| `generate-report.cjs` | Generate migration report |

## 🔧 Development

### Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development mode with hot reload |
| `npm run build` | Build the plugin (output to project root) |
| `npm run deploy` | Build and copy to Obsidian test vault |
| `npm run lint` | Run ESLint checks |

### Deploy to Test Vault

The `deploy` command automatically copies build artifacts to your local Obsidian vault for testing.

**Setup:**

1. Create `deploy.config.local.json` in project root:
   ```json
   {
       "targetDir": "C:\\path\\to\\your\\.obsidian\\plugins\\i18n-plus"
   }
   ```

2. Run:
   ```bash
   npm run deploy
   ```

> **Note**: `deploy.config.local.json` is gitignored to keep your local paths private.

## 📁 Project Structure

```
templates/
  └── adapter.ts          # Copy this to your plugin
scripts/
  ├── i18n-codemod.cjs    # String replacement codemod
  ├── extract-keys.cjs    # Key extraction script
  └── inject-i18n.cjs     # Auto-injection script
examples/
  └── auto-migrate-workflow.yml  # GitHub Action template
docs/
  ├── README.zh-CN.md     # Chinese documentation
  └── I18N_MIGRATION_GUIDE.zh-CN.md  # Migration guide
```

## 🚨 Vibe Coding Warning

This project was built using **Vibe Coding**. While I have done my best to ensure the reliability of the code, please do not use this project if you are uncomfortable with this approach.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.
