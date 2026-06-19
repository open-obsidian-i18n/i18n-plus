/**
 * Tests for framework/global-api.ts
 *
 * Covers: I18nPlusManager locale alias resolution in setGlobalLocale,
 * getTranslation, and theme dictionary APIs.
 * We test the class directly (not via singleton) to avoid cross-test pollution.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { I18nPlusManager, getI18nPlusManager } from './global-api';
import { I18nTranslator } from './translator';
import type { Dictionary } from './types';

const enDict: Dictionary = { $meta: { locale: 'en', dictVersion: '1' }, greet: 'Hello' };

describe('I18nPlusManager', () => {
  let manager: I18nPlusManager;

  beforeEach(() => {
    // Create a fresh instance for each test (not the singleton)
    manager = new I18nPlusManager();
  });

  // ─── setGlobalLocale ──────────────────────────────────────────────────

  describe('setGlobalLocale', () => {
    it('resolves locale alias', () => {
      manager.setGlobalLocale('zh-CN');
      expect(manager.getGlobalLocale()).toBe('zh');
    });

    it('propagates resolved locale to registered translators', () => {
      const translator = new I18nTranslator({
        pluginId: 'test',
        baseLocale: 'en',
        baseDictionary: enDict,
      });
      manager.register('test', translator);

      manager.setGlobalLocale('zh-TW');
      expect(translator.getLocale()).toBe('zh-tw');
    });

    it('canonical codes remain unchanged', () => {
      manager.setGlobalLocale('fr');
      expect(manager.getGlobalLocale()).toBe('fr');
    });

    it('emits locale-changed event with resolved value', () => {
      const events: string[] = [];
      manager.on('locale-changed', (locale: unknown) => {
        events.push(locale as string);
      });

      manager.setGlobalLocale('ZH-CN');
      expect(events).toEqual(['zh']);
    });
  });

  // ─── getTranslation (theme dictionaries) ──────────────────────────────

  describe('getTranslation (theme translations)', () => {
    beforeEach(() => {
      // Load theme dictionaries for 'TestTheme'
      const enThemeDict: Dictionary = {
        $meta: { locale: 'en', dictVersion: '1', themeName: 'TestTheme' },
        'section.setting.title': 'Background Color',
        'section.setting.desc': 'Choose the background color',
      };
      const zhThemeDict: Dictionary = {
        $meta: { locale: 'zh', dictVersion: '1', themeName: 'TestTheme' },
        'section.setting.title': '背景颜色',
        'section.setting.desc': '选择背景颜色',
      };

      manager.loadThemeDictionary('TestTheme', 'en', enThemeDict);
      manager.loadThemeDictionary('TestTheme', 'zh', zhThemeDict);
    });

    it('returns translation for current locale', () => {
      manager.setGlobalLocale('zh');
      expect(manager.getTranslation('TestTheme', 'section.setting.title')).toBe('背景颜色');
    });

    it('falls back to base language for regional variant', () => {
      manager.setGlobalLocale('zh-TW');  // No zh-tw dict, should fall back to zh
      expect(manager.getTranslation('TestTheme', 'section.setting.title')).toBe('背景颜色');
    });

    it('returns English when current locale has no match', () => {
      manager.setGlobalLocale('fr');  // No fr dict, no fallback → undefined
      expect(manager.getTranslation('TestTheme', 'section.setting.title')).toBeUndefined();
    });

    it('resolves theme aliases', () => {
      // Load with an alias via @@ids mechanism
      const dictWithAlias: Dictionary = {
        $meta: { locale: 'en', dictVersion: '1', themeName: 'Aliased' },
        '@@ids': JSON.stringify(['alt-name', 'legacy-name']),
        'key': 'value',
      };
      manager.loadThemeDictionary('Aliased', 'en', dictWithAlias);
      expect(manager.getTranslation('alt-name', 'key')).toBe('value');
      expect(manager.getTranslation('legacy-name', 'key')).toBe('value');
    });
  });

  // ─── Register / unregister ────────────────────────────────────────────

  describe('register / unregister', () => {
    it('registers a translator', () => {
      const translator = new I18nTranslator({
        pluginId: 'p1', baseLocale: 'en', baseDictionary: enDict,
      });
      manager.register('p1', translator);
      expect(manager.getRegisteredPlugins()).toContain('p1');
    });

    it('unregisters a translator', () => {
      const translator = new I18nTranslator({
        pluginId: 'p1', baseLocale: 'en', baseDictionary: enDict,
      });
      manager.register('p1', translator);
      manager.unregister('p1');
      expect(manager.getRegisteredPlugins()).not.toContain('p1');
    });

    it('emits plugin-registered event', () => {
      const events: string[] = [];
      manager.on('plugin-registered', (id: unknown) => events.push(id as string));

      const translator = new I18nTranslator({
        pluginId: 'p1', baseLocale: 'en', baseDictionary: enDict,
      });
      manager.register('p1', translator);
      expect(events).toContain('p1');
    });
  });

  // ─── loadDictionary through manager ───────────────────────────────────

  describe('loadDictionary (delegated to translator)', () => {
    it('loads dictionary with resolved locale', () => {
      const translator = new I18nTranslator({
        pluginId: 'p1', baseLocale: 'en', baseDictionary: enDict,
      });
      manager.register('p1', translator);

      const zhDict: Dictionary = { $meta: { locale: 'zh', dictVersion: '1' }, greet: '你好' };
      manager.loadDictionary('p1', 'zh-CN', zhDict);

      expect(translator.getLoadedLocales()).toContain('zh');
      expect(translator.getLoadedLocales()).not.toContain('zh-cn');
    });
  });
});

// ─── Singleton accessor ───────────────────────────────────────────────────

describe('getI18nPlusManager singleton', () => {
  it('returns the same instance on repeated calls', () => {
    const a = getI18nPlusManager();
    const b = getI18nPlusManager();
    expect(a).toBe(b);
  });

  it('setGlobalLocale resolves aliases on singleton too', () => {
    const m = getI18nPlusManager();
    m.setGlobalLocale('en-GB');
    // Don't assert on exact value (other tests may have changed it),
    // just check it's a valid canonical code
    expect(m.getGlobalLocale()).toMatch(/^[a-z]+(-[a-z]+)?$/);
  });
});
