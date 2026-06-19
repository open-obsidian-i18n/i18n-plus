/**
 * I18n Plus Plugin for Obsidian
 * 
 * A universal internationalization framework for the Obsidian plugin ecosystem
 */

import { Notice, Plugin } from 'obsidian';
import { initGlobalAPI, destroyGlobalAPI, getI18nPlusManager } from './framework';
import { resolveLocale } from './framework/locales';
import { DEFAULT_SETTINGS, I18nPlusSettings, I18nPlusSettingTab } from './settings';
import { DictionaryStore } from './services/dictionary-store';
import { CloudManager } from './services/cloud-manager';
import { DictionaryManagerView } from './ui/dictionary-manager';
import { DictionaryEditorView } from './ui/dictionary-editor-modal';
import { I18nFloatingWidget } from './ui/floating-widget';
import { I18nPlusMainView, VIEW_TYPE_I18N_PLUS } from './ui/i18n-editor-view';
import type { ViewRoute } from './ui/i18n-editor-view';
import { initSelfI18n, t } from './lang';

export default class I18nPlusPlugin extends Plugin {
	settings: I18nPlusSettings;
	dictionaryStore: DictionaryStore;
	cloudManager: CloudManager;
	floatingWidget: I18nFloatingWidget | null = null;
	/** Shared manager reference (holds translator instances for all plugins). */
	i18nManager = getI18nPlusManager();

	async onload() {
		if (this.settings?.debugMode) console.debug('[i18n-plus] Loading plugin...');

		await this.loadSettings();

		// Initialize dictionary store (must be before initGlobalAPI as event listeners need it)
		this.dictionaryStore = new DictionaryStore(this.app, this);

		// Initialize Cloud Manager
		this.cloudManager = new CloudManager();
		if (this.settings.cdnUrl) {
			this.cloudManager.setCdnUrl(this.settings.cdnUrl);
		}

		// Initialize Floating Widget
		this.floatingWidget = new I18nFloatingWidget(this.app, this);
		this.floatingWidget.onload();

		// Register the main view (opens in popout window)
		this.registerView(
			VIEW_TYPE_I18N_PLUS,
			(leaf) => new I18nPlusMainView(leaf, this),
		);

		// Get manager instance and set up event listeners first
		// This ensures we capture plugin registrations when initGlobalAPI triggers i18n-plus:ready
		const manager = getI18nPlusManager();

		// Listen to plugin registration events, auto-load dictionaries and apply locale settings
		manager.on('plugin-registered', (pluginId: unknown) => {
			if (typeof pluginId === 'string') {
				if (this.settings.debugMode) {
					console.debug(`[i18n-plus] plugin-registered event for: ${pluginId}`);
				}
				// Load dictionaries for this plugin
				void this.dictionaryStore.loadDictionariesForPlugin(pluginId).then(count => {
					if (this.settings.debugMode && count > 0) {
						console.debug(`[i18n-plus] Loaded ${count} dictionaries for plugin: ${pluginId}`);
					}

					// Apply locale: per-plugin override > global setting > default
					const preferredLocale = this.settings.pluginLocales?.[pluginId] || this.settings.currentLocale;
					if (preferredLocale) {
						const translator = manager.getTranslator(pluginId);
						if (translator && translator.getLocale() !== preferredLocale) {
							try {
								translator.setLocale(preferredLocale);
								if (this.settings.debugMode) {
									console.debug(`[i18n-plus] Applied locale to ${pluginId}: ${preferredLocale}`);
								}
							} catch (e) {
								console.warn(`[i18n-plus] Failed to apply locale to ${pluginId}`, e);
							}
						}
					}
				});
			}
		});

		// Listen to locale change events and persist to settings
		manager.on('locale-changed', (locale: unknown) => {
			if (typeof locale === 'string' && locale !== this.settings.currentLocale) {
				this.settings.currentLocale = locale;
				void this.saveSettings().then(() => {
					if (this.settings.debugMode) {
						console.debug(`[i18n-plus] Saved locale preference: ${locale}`);
					}
				});
			}
		});

		// Listen to per-plugin locale changes and refresh the UI
		manager.on('plugin-locale-changed', (pluginId: unknown, locale: unknown) => {
			if (typeof pluginId === 'string' && typeof locale === 'string') {
				if (this.settings.debugMode) {
					console.debug(`[i18n-plus] Plugin locale changed: ${pluginId} -> ${locale}`);
				}
				// If i18n-plus itself changed, refresh our own UI
				if (pluginId === 'i18n-plus') {
					// Refresh the floating widget if visible
					if (this.floatingWidget) {
						window.setTimeout(() => this.floatingWidget?.refresh(), 50);
					}
					// Re-render the popout view if open
					const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_I18N_PLUS);
					for (const leaf of leaves) {
						const view = leaf.view;
						if (view && 'renderRoute' in view) {
							(view as any).renderRoute();
						}
					}
				}
			}
		});

		// Initialize global API (this triggers i18n-plus:ready event, causing other plugins to register)
		initGlobalAPI();

		// Self-i18n initialization (MUST be after initGlobalAPI so window.i18nPlus is available)
		initSelfI18n(this);

		// Add settings tab
		this.addSettingTab(new I18nPlusSettingTab(this.app, this));

		// Add commands
		this.addCommand({
			id: 'open-dictionary-manager',
			name: t('command.open_manager'),
			callback: () => {
				this.showDictionaryManager();
			}
		});

		this.addCommand({
			id: 'show-registered-plugins',
			name: t('command.show_plugins'),
			callback: () => {
				const manager = getI18nPlusManager();
				const plugins = manager.getRegisteredPlugins();
				if (plugins.length === 0) {
					new Notice(t('notice.no_plugins'));
				} else {
					new Notice(t('notice.registered_plugins', { plugins: plugins.join(', ') }));
				}
			}
		});

		this.addCommand({
			id: 'reload-dictionaries',
			name: t('command.reload_dicts'),
			callback: () => {
				void this.dictionaryStore.autoLoadDictionaries().then(count => {
					new Notice(t('notice.loaded_dicts', { count }));
				});
			}
		});

		// Add ribbon icon - click to open dictionary manager in popout
		this.addRibbonIcon('languages', t('manager.title'), () => {
			void this.showMainPopout();
		});



		// Initialize Global Locale immediately
		if (this.settings.currentLocale) {
			const resolved = resolveLocale(this.settings.currentLocale);
			if (resolved !== this.settings.currentLocale) {
				this.settings.currentLocale = resolved;
				void this.saveSettings();
			}
			manager.setGlobalLocale(resolved);
			if (this.settings.debugMode) {
				console.debug(`[i18n-plus] Restored locale: ${resolved}`);
			}
		} else {
			// Auto-detect if no setting
			const currentLang = resolveLocale(window.moment?.locale() || 'en');
			manager.setGlobalLocale(currentLang);
			if (this.settings.debugMode) {
				console.debug(`[i18n-plus] Auto-detected global locale: ${currentLang}`);
			}
		}

		// Delayed auto-load of installed dictionaries (wait for other plugins to register)
		window.setTimeout(() => {
			void this.dictionaryStore.autoLoadDictionaries().then(count => {
				if (count > 0 && this.settings.debugMode) {
					console.debug(`[i18n-plus] Auto-loaded ${count} dictionaries on startup`);
				}

				// Fetch cloud dictionary manifest
				void this.cloudManager.fetchRemoteManifest();

				// Auto-load theme dictionaries
				void this.dictionaryStore.autoLoadThemeDictionaries().then(count => {
					if (count > 0 && this.settings.debugMode) {
						console.debug(`[i18n-plus] Auto-loaded ${count} theme dictionaries`);
					}
				});
			});
		}, 3000);

		if (this.settings.debugMode) console.debug('[i18n-plus] Plugin loaded successfully');
	}

	onunload() {
		if (this.floatingWidget) {
			this.floatingWidget.onunload();
			this.floatingWidget = null;
		}
		destroyGlobalAPI();
		if (this.settings.debugMode) console.debug('[i18n-plus] Plugin unloaded');
	}

	public showDictionaryManager() {
		// Fallback: show in floating widget
		if (!this.floatingWidget) return;

		const view = new DictionaryManagerView(this.app, this);
		this.floatingWidget.showView(
			(container) => { void view.render(container); },
			t('manager.title')
		);
	}

	/**
	 * Open the main i18n+ popout window.
	 * Shows the dictionary manager by default.
	 * Falls back to floating widget on mobile.
	 */
	public async showMainPopout(route?: ViewRoute): Promise<void> {
		try {
			const leaf = this.app.workspace.openPopoutLeaf({
				size: { width: 960, height: 720 },
			});

			await leaf.setViewState({
				type: VIEW_TYPE_I18N_PLUS,
				active: true,
				state: route || { mode: 'manager' },
			});
		} catch (e) {
			// Mobile/Electron fallback
			this.showDictionaryManager();
		}
	}

	public showDictionaryEditor(pluginId: string | null, locale: string, themeName?: string, isBuiltinOverride?: boolean): void {
		// Resolve isBuiltin if not explicitly provided
		const manager = getI18nPlusManager();
		let isBuiltin = isBuiltinOverride;

		if (isBuiltin === undefined) {
			if (pluginId) {
				const translator = manager.getTranslator(pluginId);
				isBuiltin = translator?.getBuiltinLocales().includes(locale) || false;
			} else {
				isBuiltin = false;
			}
		}

		const route: ViewRoute = pluginId
			? { mode: 'editor', pluginId, locale, isBuiltin }
			: { mode: 'editor-theme', themeName: themeName || '', locale, isBuiltin };

		void this.showMainPopout(route);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<I18nPlusSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
