/**
 * I18n Plus Settings
 */

import { App, PluginSettingTab, Setting } from 'obsidian';
import type I18nPlusPlugin from './main';
import { t } from './lang';
import { getI18nPlusManager } from './framework/global-api';
import { OBSIDIAN_LOCALES } from './framework/locales';

import { resolveLocale } from './framework/locales';

export interface I18nPlusSettings {
	/** Whether to show debug logs */
	debugMode: boolean;
	/** Current locale (persisted user preference) */
	currentLocale: string;
	/** Per-plugin locale overrides (pluginId → locale) */
	pluginLocales: Record<string, string>;
	/** CDN base URL for dictionary manifest */
	cdnUrl: string;
}

export const DEFAULT_SETTINGS: I18nPlusSettings = {
	debugMode: false,
	currentLocale: '',  // Empty means use Obsidian's default language
	pluginLocales: {},
	cdnUrl: 'https://cdn.jsdelivr.net/gh/open-obsidian-i18n/dictionaries@latest',
};

export class I18nPlusSettingTab extends PluginSettingTab {
	plugin: I18nPlusPlugin;

	constructor(app: App, plugin: I18nPlusPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// === Language Section ===
		containerEl.createEl('h3', { text: t('settings.language_section') || 'Language' });

		new Setting(containerEl)
			.setName(t('settings.preferred_language') || 'Preferred language')
			.setDesc(t('settings.preferred_language_desc') || 'Default language for translations. Plugins with available translations will use this language.')
			.addDropdown(dropdown => {
				// Add "Auto" option
				dropdown.addOption('', t('settings.language_auto') || 'Auto (follow Obsidian)');

				// Add all Obsidian locales
				for (const locale of OBSIDIAN_LOCALES) {
					dropdown.addOption(locale.code, `${locale.nativeName} (${locale.name})`);
				}

				dropdown.setValue(this.plugin.settings.currentLocale);
				dropdown.onChange(async (val) => {
					const resolved = resolveLocale(val);
					this.plugin.settings.currentLocale = resolved;
					await this.plugin.saveSettings();

					const manager = getI18nPlusManager();
					if (resolved) {
						manager.setGlobalLocale(resolved);
					} else {
						// Auto: detect from Obsidian
						const detected = resolveLocale(window.moment?.locale() || 'en');
						manager.setGlobalLocale(detected);
					}
				});
				});

		// === Cloud Section ===
		containerEl.createEl('h3', { text: t('settings.cloud_section') || 'Cloud Dictionaries' });

		new Setting(containerEl)
			.setName(t('settings.cdn_url') || 'CDN source URL')
			.setDesc(t('settings.cdn_url_desc') || 'Base URL for downloading dictionary manifests and translation files.')
			.addText(text => text
				.setPlaceholder('https://...')
				.setValue(this.plugin.settings.cdnUrl)
				.onChange(async (val) => {
					this.plugin.settings.cdnUrl = val;
					await this.plugin.saveSettings();
				}));

		// Cloud stats
		if (this.plugin.cloudManager) {
			const statsContainer = containerEl.createDiv({ cls: 'setting-item' });
			const info = statsContainer.createDiv({ cls: 'setting-item-info' });
			info.createDiv({ cls: 'setting-item-name', text: t('settings.cloud_status') || 'Cloud status' });

			const manifestLoaded = this.plugin.cloudManager.hasLoaded;
			const descText = manifestLoaded
				? (t('settings.cloud_loaded') || 'Manifest loaded. Dictionaries available for download.')
				: (t('settings.cloud_not_loaded') || 'Manifest not loaded yet. Open the dictionary manager to trigger sync.');

			info.createDiv({ cls: 'setting-item-description', text: descText });

			// Refresh button
			const controls = statsContainer.createDiv({ cls: 'setting-item-control' });
			const refreshBtn = controls.createEl('button', { cls: 'mod-cta' });
			refreshBtn.textContent = t('settings.refresh_cloud') || 'Refresh';
			refreshBtn.onclick = () => {
				refreshBtn.setText('...');
				void this.plugin.cloudManager.fetchRemoteManifest(true).then(() => {
					refreshBtn.setText(t('settings.refresh_cloud') || 'Refresh');
					this.display();
				});
			};
		}

		// === Debug Section ===
		containerEl.createEl('h3', { text: t('settings.debug_section') || 'Debug' });

		new Setting(containerEl)
			.setName(t('settings.debug_mode'))
			.setDesc(t('settings.debug_mode_desc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.debugMode)
				.onChange(async (value) => {
					this.plugin.settings.debugMode = value;
					await this.plugin.saveSettings();
				}));

		// Display registered plugins info
		new Setting(containerEl).setName(t('settings.registered_plugins')).setHeading();

		const pluginListEl = containerEl.createDiv({ cls: 'i18n-plus-plugin-list' });

		if (window.i18nPlus) {
			const plugins = window.i18nPlus.getRegisteredPlugins();
			if (plugins.length === 0) {
				pluginListEl.createEl('p', {
					text: t('settings.no_plugins_registered') || 'No plugins registered yet. Plugins need to integrate i18n-plus framework.',
					cls: 'setting-item-description'
				});
			} else {
				for (const pluginId of plugins) {
					const manifest = (this.app as any).plugins?.plugins?.[pluginId]?.manifest;
					const displayName = manifest?.name ? `${manifest.name} (${pluginId})` : pluginId;
					const locales = window.i18nPlus.getLoadedLocales(pluginId);
					new Setting(pluginListEl)
						.setName(displayName)
						.setDesc(t('settings.loaded_locales', { locales: locales.join(', ') || 'none' }));
				}
			}
		} else {
			pluginListEl.createEl('p', {
				text: 'i18n+ API not initialized',
				cls: 'setting-item-description'
			});
		}
	}
}
