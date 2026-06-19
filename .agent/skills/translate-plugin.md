---
name: translate-plugin
description: "Run the full i18n translation pipeline on an Obsidian plugin: clone, codemod, inject adapter, translate, build, PR"
---

# Translate Plugin Workflow

## 前提
- i18n-plus 项目在 `~/Documents/code/org-i18n-plus`
- 目标插件已 fork 到 `open-obsidian-i18n` 组织

## 步骤

```bash
# 1. 克隆插件
cd ~/Documents/code
git clone https://github.com/open-obsidian-i18n/xxx.git
cd xxx

# 2. 设置适配器目录
mkdir -p src/lang/locales
cp ~/Documents/code/org-i18n-plus/templates/adapter.ts src/lang/i18n.ts

# 3. 运行增强版 codemod
npx jscodeshift -t ~/Documents/code/org-i18n-plus/scripts/i18n-codemod.cjs src/ --parser=ts
npx jscodeshift -t ~/Documents/code/org-i18n-plus/scripts/inject-i18n.cjs src/main.ts --parser=ts

# 4. 提取 key
node ~/Documents/code/org-i18n-plus/scripts/extract-keys.cjs src/ src/lang/locales/en.ts

# 5. 翻译（用 Claude Code 批量翻）
claude -p "Translate these i18n keys to Chinese..." --allowedTools 'Read' --max-turns 3

# 6. 启用中文内置词典
# 在 i18n.ts 中取消注释 'zh': zh

# 7. 编译 & 部署
node esbuild.config.mjs production
cp main.js ~/Documents/测试用OB/.obsidian/plugins/xxx/main.js
```

## 注意事项
- 先 `--dry --print` 试跑 codemod，确认无误再执行
- 如果插件有自己的构建系统（webpack/tsc），需调整构建命令
- 修改 manifest.json 中的 author 为 open-obsidian-i18n
- PR 标题格式：`i18n: translate XXX to Chinese`
