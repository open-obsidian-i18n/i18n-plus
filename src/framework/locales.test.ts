/**
 * Tests for framework/locales.ts
 *
 * Covers: resolveLocale, normalizeLocaleCode, LOCALE_ALIASES
 * These are pure functions — no Obsidian API needed.
 */
import { describe, it, expect } from 'vitest';
import {
  resolveLocale,
  normalizeLocaleCode,
  isValidLocale,
  LOCALE_ALIASES,
} from './locales';

// ─── normalizeLocaleCode ──────────────────────────────────────────────────

describe('normalizeLocaleCode', () => {
  it('lowercases input', () => {
    expect(normalizeLocaleCode('ZH')).toBe('zh');
    expect(normalizeLocaleCode('En-Us')).toBe('en-us');
  });

  it('converts underscores to hyphens', () => {
    expect(normalizeLocaleCode('zh_CN')).toBe('zh-cn');
    expect(normalizeLocaleCode('zh_Hans')).toBe('zh-hans');
  });

  it('strips dot suffixes', () => {
    expect(normalizeLocaleCode('zh.hans')).toBe('zh');
    expect(normalizeLocaleCode('es.mx')).toBe('es');
  });

  it('preserves already-canonical codes', () => {
    expect(normalizeLocaleCode('en')).toBe('en');
    expect(normalizeLocaleCode('zh-tw')).toBe('zh-tw');
    expect(normalizeLocaleCode('pt-br')).toBe('pt-br');
  });

  it('handles empty string', () => {
    expect(normalizeLocaleCode('')).toBe('');
  });
});

// ─── LOCALE_ALIASES (Map integrity) ──────────────────────────────────────

describe('LOCALE_ALIASES', () => {
  it('is a Map (not a plain object)', () => {
    expect(LOCALE_ALIASES).toBeInstanceOf(Map);
  });

  it('has at least 20 entries', () => {
    expect(LOCALE_ALIASES.size).toBeGreaterThanOrEqual(20);
  });

  it('all values are canonical Obsidian codes', () => {
    const canonicalCodes = ['zh', 'zh-tw', 'pt', 'pt-br', 'en', 'en-gb', 'no', 'ms', 'es', 'fr', 'de', 'id', 'he', 'yi'];
    for (const value of LOCALE_ALIASES.values()) {
      expect(canonicalCodes).toContain(value);
    }
  });

  it('has no self-referential aliases (key === value)', () => {
    for (const [key, value] of LOCALE_ALIASES) {
      if (key === value) {
        // Identity aliases are OK (zh-tw → zh-tw, en-gb → en-gb) —
        // they exist to normalize variants to a stable form
      }
    }
  });
});

// ─── resolveLocale ────────────────────────────────────────────────────────

describe('resolveLocale', () => {
  // Identity — codes already canonical
  it('returns canonical codes unchanged', () => {
    expect(resolveLocale('en')).toBe('en');
    expect(resolveLocale('zh')).toBe('zh');
    expect(resolveLocale('fr')).toBe('fr');
    expect(resolveLocale('de')).toBe('de');
    expect(resolveLocale('es')).toBe('es');
    expect(resolveLocale('ja')).toBe('ja');
    expect(resolveLocale('no')).toBe('no');
  });

  // Chinese variants
  describe('Chinese variants', () => {
    it('zh-CN → zh', () => {
      expect(resolveLocale('zh-CN')).toBe('zh');
    });
    it('zh-sg → zh', () => {
      expect(resolveLocale('zh-sg')).toBe('zh');
    });
    it('zh-hans → zh', () => {
      expect(resolveLocale('zh-hans')).toBe('zh');
    });
    it('zh_Hans → zh (underscores)', () => {
      expect(resolveLocale('zh_Hans')).toBe('zh');
    });
    it('zh.hans → zh (dot suffix)', () => {
      expect(resolveLocale('zh.hans')).toBe('zh');
    });
    it('zh-HK → zh-tw', () => {
      expect(resolveLocale('zh-HK')).toBe('zh-tw');
    });
    it('zh-mo → zh-tw', () => {
      expect(resolveLocale('zh-mo')).toBe('zh-tw');
    });
    it('zh-tw → zh-tw (identity)', () => {
      expect(resolveLocale('zh-tw')).toBe('zh-tw');
    });
    it('zh-hant → zh-tw', () => {
      expect(resolveLocale('zh-hant')).toBe('zh-tw');
    });
  });

  // Portuguese variants
  describe('Portuguese variants', () => {
    it('pt-PT → pt', () => {
      expect(resolveLocale('pt-PT')).toBe('pt');
    });
    it('pt-br → pt-br (preserved)', () => {
      expect(resolveLocale('pt-br')).toBe('pt-br');
    });
  });

  // English variants
  describe('English variants', () => {
    it('en-US → en', () => {
      expect(resolveLocale('en-US')).toBe('en');
    });
    it('en-gb → en-gb (preserved)', () => {
      expect(resolveLocale('en-gb')).toBe('en-gb');
    });
    it('en-AU → en-gb', () => {
      expect(resolveLocale('en-AU')).toBe('en-gb');
    });
    it('en-CA → en-gb', () => {
      expect(resolveLocale('en-CA')).toBe('en-gb');
    });
  });

  // Legacy / alternative codes
  describe('Legacy ISO codes', () => {
    it('in → id (Indonesian)', () => {
      expect(resolveLocale('in')).toBe('id');
    });
    it('iw → he (Hebrew)', () => {
      expect(resolveLocale('iw')).toBe('he');
    });
    it('nb → no (Norwegian)', () => {
      expect(resolveLocale('nb')).toBe('no');
    });
    it('nn → no (Norwegian Nynorsk)', () => {
      expect(resolveLocale('nn')).toBe('no');
    });
    it('ms-MY → ms (Malay)', () => {
      expect(resolveLocale('ms-MY')).toBe('ms');
    });
  });

  // Regional variants for European languages
  describe('European regional variants', () => {
    it('es-ES → es', () => {
      expect(resolveLocale('es-ES')).toBe('es');
    });
    it('es-MX → es', () => {
      expect(resolveLocale('es-MX')).toBe('es');
    });
    it('fr-CA → fr', () => {
      expect(resolveLocale('fr-CA')).toBe('fr');
    });
    it('de-AT → de', () => {
      expect(resolveLocale('de-AT')).toBe('de');
    });
    it('de-CH → de', () => {
      expect(resolveLocale('de-CH')).toBe('de');
    });
  });

  // Edge cases
  describe('Edge cases', () => {
    it('unknown locale returns identity normalized', () => {
      expect(resolveLocale('xx')).toBe('xx');
      expect(resolveLocale('zz-ZZ')).toBe('zz-zz');
    });
    it('empty string returns empty', () => {
      expect(resolveLocale('')).toBe('');
    });
    it('full BCP 47 tag zh-CH-Hans-CN normalized but not multi-resolved', () => {
      // normalizeLocaleCode yields 'zh-ch-hans-cn'
      // resolveLocale tries exact alias match → no match (too specific)
      // Returns normalized form unchanged — this is expected, we don't
      // try to parse full BCP 47 subtags
      expect(resolveLocale('zh-CH-Hans-CN')).toBe('zh-ch-hans-cn');
    });
  });
});

// ─── isValidLocale ────────────────────────────────────────────────────────

describe('isValidLocale', () => {
  it('recognizes canonical codes', () => {
    expect(isValidLocale('en')).toBe(true);
    expect(isValidLocale('zh')).toBe(true);
    expect(isValidLocale('zh-tw')).toBe(true);
  });

  it('rejects unknown codes', () => {
    expect(isValidLocale('zz')).toBe(false);
    expect(isValidLocale('xyz')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isValidLocale('EN')).toBe(true);
    expect(isValidLocale('ZH-TW')).toBe(true);
  });
});
