/**
 * Tests for framework/translator.ts
 *
 * Covers: constructor alias resolution, load/set/get/unload locale alias handling
 * These are pure logic — no Obsidian API needed.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { I18nTranslator, createTranslator } from './translator';
import type { Dictionary } from './types';

// Helper: create a simple dictionary for testing
function makeDict(entries: Record<string, string>): Dictionary {
  return { $meta: { locale: 'en', dictVersion: '1' }, ...entries };
}

const enDict = makeDict({ greet: 'Hello', farewell: 'Goodbye' });

describe('I18nTranslator', () => {
  let translator: I18nTranslator;

  beforeEach(() => {
    translator = createTranslator({
      pluginId: 'test-plugin',
      baseLocale: 'en',
      baseDictionary: enDict,
    });
  });

  // ─── Constructor ──────────────────────────────────────────────────────

  describe('constructor', () => {
    it('initializes with base locale', () => {
      expect(translator.getLocale()).toBe('en');
    });

    it('resolves base locale alias', () => {
      const t2 = createTranslator({
        pluginId: 'test',
        baseLocale: 'EN-US',
        baseDictionary: enDict,
      });
      expect(t2.baseLocale).toBe('en');
    });

    it('resolves current locale alias', () => {
      const t2 = createTranslator({
        pluginId: 'test',
        baseLocale: 'en',
        baseDictionary: enDict,
        currentLocale: 'ZH-CN',
      });
      expect(t2.currentLocale).toBe('zh');
    });
  });

  // ─── setLocale / getLocale ────────────────────────────────────────────

  describe('setLocale / getLocale', () => {
    it('setLocale resolves alias', () => {
      translator.setLocale('zh-CN');
      expect(translator.getLocale()).toBe('zh');
    });

    it('setLocale with canonical code unchanged', () => {
      translator.setLocale('fr');
      expect(translator.getLocale()).toBe('fr');
    });

    it('setLocale with underscores resolves', () => {
      translator.setLocale('zh_TW');
      expect(translator.getLocale()).toBe('zh-tw');
    });
  });

  // ─── loadDictionary ────────────────────────────────────────────────────

  describe('loadDictionary', () => {
    it('stores under resolved locale', () => {
      const zhDict = makeDict({ greet: '你好' });
      translator.loadDictionary('zh-CN', zhDict);

      // Should be stored under 'zh', not 'zh-cn'
      expect(translator.getLoadedLocales()).toContain('zh');
      expect(translator.getLoadedLocales()).not.toContain('zh-cn');
    });

    it('deduplicates aliased locales (same canonical key)', () => {
      const zhV1 = makeDict({ greet: '你好' });
      const zhV2 = makeDict({ greet: '你好呀' });

      translator.loadDictionary('zh', zhV1);
      translator.loadDictionary('zh-CN', zhV2); // Should overwrite 'zh'

      expect(translator.getLoadedLocales()).toEqual(['en', 'zh']);
      expect(translator.getDictionary('zh')?.greet).toBe('你好呀');
    });

    it('keeps distinct canonical locales separate', () => {
      const frDict = makeDict({ greet: 'Bonjour' });
      const deDict = makeDict({ greet: 'Hallo' });

      translator.loadDictionary('fr', frDict);
      translator.loadDictionary('de', deDict);

      expect(translator.getLoadedLocales()).toContain('fr');
      expect(translator.getLoadedLocales()).toContain('de');
    });
  });

  // ─── loadBuiltinDictionary ────────────────────────────────────────────

  describe('loadBuiltinDictionary', () => {
    it('marks resolved locale as builtin', () => {
      const zhDict = makeDict({ greet: '你好' });
      translator.loadBuiltinDictionary('zh-CN', zhDict);

      expect(translator.getBuiltinLocales()).toContain('zh');
      expect(translator.getBuiltinLocales()).not.toContain('zh-cn');
    });
  });

  // ─── getDictionary ────────────────────────────────────────────────────

  describe('getDictionary', () => {
    it('retrieves by canonical key regardless of input variant', () => {
      const zhDict = makeDict({ greet: '你好' });
      translator.loadDictionary('zh', zhDict);

      expect(translator.getDictionary('zh')?.greet).toBe('你好');
      expect(translator.getDictionary('zh-CN')?.greet).toBe('你好');
      expect(translator.getDictionary('zh_Hans')?.greet).toBe('你好');
    });
  });

  // ─── unloadDictionary ──────────────────────────────────────────────────

  describe('unloadDictionary', () => {
    it('unloads by resolved locale', () => {
      const zhDict = makeDict({ greet: '你好' });
      translator.loadDictionary('zh-CN', zhDict);
      expect(translator.getLoadedLocales()).toContain('zh');

      translator.unloadDictionary('zh-CN');
      expect(translator.getLoadedLocales()).not.toContain('zh');
    });

    it('cannot unload base locale', () => {
      translator.unloadDictionary('en');
      expect(translator.getLoadedLocales()).toContain('en');
    });

    it('resets to base locale when unloading current locale', () => {
      const zhDict = makeDict({ greet: '你好' });
      translator.loadDictionary('zh', zhDict);
      translator.setLocale('zh');
      expect(translator.getLocale()).toBe('zh');

      translator.unloadDictionary('zh');
      expect(translator.getLocale()).toBe('en');
    });
  });

  // ─── t() translation ──────────────────────────────────────────────────

  describe('t() translation function', () => {
    it('translates with canonical locale', () => {
      const zhDict = makeDict({ greet: '你好' });
      translator.loadDictionary('zh-CN', zhDict);
      translator.setLocale('zh');

      expect(translator.t('greet')).toBe('你好');
    });

    it('falls through to base locale when current lacks key', () => {
      const zhDict = makeDict({ farewell: '再见' }); // no 'greet' key
      translator.loadDictionary('zh-CN', zhDict);
      translator.setLocale('zh');

      expect(translator.t('greet')).toBe('Hello'); // from base 'en'
      expect(translator.t('farewell')).toBe('再见'); // from 'zh'
    });

    it('supports parameter interpolation', () => {
      const dict = makeDict({ welcome: 'Welcome {name}!' });
      translator.loadDictionary('fr', dict);
      translator.setLocale('fr');

      expect(translator.t('welcome', { name: 'Alice' })).toBe('Welcome Alice!');
    });

    it('supports context-based translations', () => {
      const dict = makeDict({
        title: 'Title',
        title_male: 'Mr.',
        title_female: 'Ms.',
      });
      translator.loadDictionary('fr', dict);
      translator.setLocale('fr');

      expect(translator.t('title', { context: 'male' })).toBe('Mr.');
      expect(translator.t('title', { context: 'female' })).toBe('Ms.');
      expect(translator.t('title')).toBe('Title'); // fallback
    });
  });
});

// ─── createTranslator factory ─────────────────────────────────────────────

describe('createTranslator factory', () => {
  it('returns an I18nTranslator instance', () => {
    const t = createTranslator({
      pluginId: 'factory-test',
      baseLocale: 'en',
      baseDictionary: enDict,
    });
    expect(t).toBeInstanceOf(I18nTranslator);
    expect(t.pluginId).toBe('factory-test');
  });
});
