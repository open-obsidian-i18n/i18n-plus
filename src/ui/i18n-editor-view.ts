/**
 * I18n Plus — Main View (ItemView)
 *
 * An Obsidian ItemView that opens in a popout window.
 * Hosts both the dictionary manager and dictionary editor,
 * with internal navigation between them.
 *
 * Routes:
 *   { mode: 'manager' }            → plugin list
 *   { mode: 'editor', ... }         → dictionary editor for a specific locale
 *   { mode: 'editor-theme', ... }   → dictionary editor for a theme locale
 */

import { ItemView, WorkspaceLeaf, ViewStateResult } from 'obsidian';
import type I18nPlusPlugin from '../main';
import { DictionaryManagerView } from './dictionary-manager';
import { DictionaryEditorView } from './dictionary-editor-modal';

export const VIEW_TYPE_I18N_PLUS = 'i18n-plus-main';

export type ViewRoute =
    | { mode: 'manager' }
    | { mode: 'editor'; pluginId: string; locale: string; isBuiltin: boolean }
    | { mode: 'editor-theme'; themeName: string; locale: string; isBuiltin: boolean };

export class I18nPlusMainView extends ItemView {
    private plugin: I18nPlusPlugin;
    private route: ViewRoute = { mode: 'manager' };
    /** Prevents duplicate render calls (async race conditions). */
    private _rendering = false;

    constructor(leaf: WorkspaceLeaf, plugin: I18nPlusPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return VIEW_TYPE_I18N_PLUS;
    }

    getDisplayText(): string {
        if (this.route.mode === 'editor') {
            return `i18n+ — ${this.route.pluginId} / ${this.route.locale}`;
        }
        if (this.route.mode === 'editor-theme') {
            return `i18n+ — ${this.route.themeName} / ${this.route.locale}`;
        }
        return 'i18n+ Dictionary Manager';
    }

    getIcon(): string {
        return 'languages';
    }

    async onOpen(): Promise<void> {
        // Don't render here — setState() is called by Obsidian right after onOpen(),
        // and we want a single render path to avoid races.
        const saved = this.leaf.getViewState().state as Partial<ViewRoute> | undefined;
        if (saved?.mode) {
            this.route = saved as ViewRoute;
        }
    }

    onClose(): Promise<void> {
        return Promise.resolve();
    }

    getState(): Record<string, unknown> {
        return { ...this.route };
    }

    async setState(state: Record<string, unknown>, result: ViewStateResult): Promise<void> {
        const s = state as Partial<ViewRoute>;
        if (s.mode === 'editor' || s.mode === 'editor-theme' || s.mode === 'manager') {
            this.route = s as ViewRoute;
            await this.renderRoute();
        }
        await super.setState(state, result);
    }

    // ─── Navigation ────────────────────────────────────────────────────

    /** Navigate to the dictionary manager (plugin list). */
    navigateToManager(): void {
        this.route = { mode: 'manager' };
        void this.renderRoute();
    }

    /** Navigate to the dictionary editor for a plugin's locale. */
    navigateToEditor(pluginId: string, locale: string, isBuiltin: boolean): void {
        this.route = { mode: 'editor', pluginId, locale, isBuiltin };
        void this.renderRoute();
    }

    /** Navigate to the dictionary editor for a theme's locale. */
    navigateToThemeEditor(themeName: string, locale: string, isBuiltin: boolean): void {
        this.route = { mode: 'editor-theme', themeName, locale, isBuiltin };
        void this.renderRoute();
    }

    // ─── Rendering ─────────────────────────────────────────────────────

    private _renderPromise: Promise<void> | null = null;

    private async renderRoute(): Promise<void> {
        // Await the previous render if still in-flight, then we'll retrigger
        while (this._renderPromise) {
            await this._renderPromise;
        }

        const promise = this._doRender();
        this._renderPromise = promise;
        try {
            await promise;
        } finally {
            this._renderPromise = null;
        }
    }

    private async _doRender(): Promise<void> {
        this.contentEl.empty();
        this.contentEl.addClass('i18n-plus-main-view');

        switch (this.route.mode) {
            case 'manager':
                await this.renderManager();
                break;
            case 'editor':
            case 'editor-theme':
                await this.renderEditor();
                break;
        }
    }

    private async renderManager(): Promise<void> {
        const view = new DictionaryManagerView(this.plugin.app, this.plugin);
        view.setNavigationTarget(this);
        await view.render(this.contentEl);
    }

    private async renderEditor(): Promise<void> {
        const route = this.route;

        // Back button
        const backBtn = this.contentEl.createEl('button', {
            cls: 'clickable-icon i18n-plus-editor-back-btn',
            attr: { 'aria-label': 'Back to dictionary manager' },
        });
        backBtn.appendChild(document.createTextNode('‹ Back'));
        backBtn.onclick = () => this.navigateToManager();

        // Determine params based on route
        let pluginId: string;
        let locale: string;
        let isBuiltin: boolean;
        let themeName: string | undefined;

        if (route.mode === 'editor') {
            pluginId = route.pluginId;
            locale = route.locale;
            isBuiltin = route.isBuiltin;
            themeName = undefined;
        } else if (route.mode === 'editor-theme') {
            pluginId = '';
            locale = route.locale;
            isBuiltin = route.isBuiltin;
            themeName = route.themeName;
        } else {
            // Manager mode — shouldn't reach here
            return;
        }

        const editorView = new DictionaryEditorView(
            this.plugin.app,
            this.plugin,
            pluginId,
            locale,
            isBuiltin,
            themeName,
        );

        const editorContainer = this.contentEl.createDiv({ cls: 'i18n-plus-editor' });
        await editorView.render(editorContainer);
    }
}
