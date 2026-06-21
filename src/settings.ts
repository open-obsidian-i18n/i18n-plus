/**
 * I18n Plus Settings
 */

import { App, PluginSettingTab, Setting } from 'obsidian';
import type I18nPlusPlugin from './main';
import { t, type LangKey } from './lang';
import { getI18nPlusManager } from './framework/global-api';
import { OBSIDIAN_LOCALES } from './framework/locales';

import { resolveLocale } from './framework/locales';

// Minimal type for accessing Obsidian's internal plugin registry
// (app.plugins exists at runtime but is not exposed in Obsidian's public types)
interface PluginRegistry {
	plugins: {
		plugins: Record<string, {
			manifest: { id: string; name: string; version: string; [key: string]: unknown };
		}>;
	};
}

// ============================================================================
// CDN Preset Types & Helpers
// ============================================================================

export type CdnPreset = 'default' | 'jsdelivr-main' | 'unpkg' | 'custom';

export const CDN_PRESETS: Record<Exclude<CdnPreset, 'custom'>, string> = {
  'default': 'https://cdn.jsdelivr.net/gh/open-obsidian-i18n/dictionaries@latest',
  'jsdelivr-main': 'https://cdn.jsdelivr.net/gh/open-obsidian-i18n/dictionaries@main',
  'unpkg': 'https://unpkg.com/@open-obsidian-i18n/dictionaries@latest',
};

export interface CdnPresetOption {
  value: CdnPreset;
  label: string;
  i18nKey: string;
}

export const CDN_PRESET_OPTIONS: CdnPresetOption[] = [
  { value: 'default', label: 'jsDelivr (@latest)', i18nKey: 'settings.cdn_preset_default' },
  { value: 'jsdelivr-main', label: 'jsDelivr (@main)', i18nKey: 'settings.cdn_preset_main' },
  { value: 'unpkg', label: 'unpkg', i18nKey: 'settings.cdn_preset_unpkg' },
  { value: 'custom', label: 'Custom URL...', i18nKey: 'settings.cdn_preset_custom' },
];

/**
 * Resolve the effective CDN URL from a preset + optional custom URL.
 * For non-custom presets, returns the built-in URL.
 * For custom, returns whatever the user typed (may be empty).
 */
export function resolveCdnUrl(preset: CdnPreset, customUrl: string): string {
  if (preset === 'custom') {
    return customUrl;
  }
  return CDN_PRESETS[preset] ?? '';
}

/**
 * Get the preset key that matches a given URL, or 'custom' if no match.
 * Used for migration when loading settings from older versions.
 */
export function presetForUrl(url: string): CdnPreset {
  for (const [key, presetUrl] of Object.entries(CDN_PRESETS)) {
    if (url === presetUrl) return key as Exclude<CdnPreset, 'custom'>;
  }
  return 'custom';
}

// ============================================================================
// Settings Interface
// ============================================================================

export interface I18nPlusSettings {
	/** Whether to show debug logs */
	debugMode: boolean;
	/** Current locale (persisted user preference) */
	currentLocale: string;
	/** Per-plugin locale overrides (pluginId → locale) */
	pluginLocales: Record<string, string>;
	/** CDN preset name */
	cdnPreset: CdnPreset;
	/** Custom CDN URL (only used when cdnPreset === 'custom') */
	cdnCustomUrl: string;
	/**
	 * Effective CDN base URL (resolved from preset or custom URL).
	 * Persisted for backward compat and to avoid recomputation on every load.
	 */
	cdnUrl: string;
}

export const DEFAULT_SETTINGS: I18nPlusSettings = {
	debugMode: false,
	currentLocale: '',  // Empty means use Obsidian's default language
	pluginLocales: {},
	cdnPreset: 'default',
	cdnCustomUrl: '',
	cdnUrl: CDN_PRESETS['default'],
};

// ============================================================================
// Settings Tab
// ============================================================================

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
		new Setting(containerEl).setName(t('settings.language_section') || 'Language').setHeading();

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
		new Setting(containerEl).setName(t('settings.cloud_section') || 'Cloud Dictionaries').setHeading();

		// CDN preset dropdown
		new Setting(containerEl)
			.setName(t('settings.cdn_source') || 'CDN source')
			.setDesc(t('settings.cdn_source_desc') || 'Select a CDN provider for downloading dictionaries.')
			.addDropdown(dd => {
				for (const opt of CDN_PRESET_OPTIONS) {
					const label = t(opt.i18nKey as LangKey) || opt.label;
					dd.addOption(opt.value, label);
				}
				dd.setValue(this.plugin.settings.cdnPreset);
				dd.onChange(async (val) => {
					const preset = val as CdnPreset;
					this.plugin.settings.cdnPreset = preset;

					// Resolve the effective URL
					if (preset === 'custom') {
						// Keep existing cdnCustomUrl, but use current cdnUrl as the custom URL if empty
						if (!this.plugin.settings.cdnCustomUrl) {
							this.plugin.settings.cdnCustomUrl = this.plugin.settings.cdnUrl;
						}
						// Don't change cdnUrl yet — user needs to type in the custom input
					} else {
						this.plugin.settings.cdnUrl = resolveCdnUrl(preset, '');
						this.plugin.settings.cdnCustomUrl = '';
						// Update CloudManager immediately
						if (this.plugin.cloudManager) {
							this.plugin.cloudManager.setCdnUrl(this.plugin.settings.cdnUrl);
						}
					}

					await this.plugin.saveSettings();
					// Re-render to show/hide custom input
					this.display();
				});
			});

		// Custom URL input (only visible when preset is 'custom')
		if (this.plugin.settings.cdnPreset === 'custom') {
			new Setting(containerEl)
				.setName(t('settings.cdn_custom_url') || 'Custom CDN URL')
				.setDesc(t('settings.cdn_custom_url_desc') || 'Enter your own CDN base URL.')
				.addText(text => text
					.setPlaceholder('https://cdn.example.com/dictionaries')
					.setValue(this.plugin.settings.cdnCustomUrl || this.plugin.settings.cdnUrl)
					.onChange(async (val) => {
						this.plugin.settings.cdnCustomUrl = val;
						this.plugin.settings.cdnUrl = val;
						await this.plugin.saveSettings();
						if (this.plugin.cloudManager) {
							this.plugin.cloudManager.setCdnUrl(val);
						}
					}));
		}

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
		new Setting(containerEl).setName(t('settings.debug_section') || 'Debug').setHeading();

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
				const pluginRegistry = this.app as unknown as PluginRegistry;
					const manifest = pluginRegistry.plugins?.plugins?.[pluginId]?.manifest;
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
