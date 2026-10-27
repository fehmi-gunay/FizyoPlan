import { afterEach, describe, expect, it, vi } from 'vitest';
import { clinicalConfig } from '../../src/config/clinical';
import { ruleBasedProvider } from '../../src/services/ai/ruleBasedProvider';
import { SuggestionInput } from '../../src/services/ai/types';
import { requestSuggestion, setProvider } from '../../src/services/aiService';

const input: SuggestionInput = {
  planType: 'daily',
  days: 1,
  ageRange: '30-39',
  activityLevel: 'light',
  painRegions: [],
  candidates: [],
};
const validItem = { exerciseId: 1, day: 1, sets: 2, reps: 10, durationSec: 5 };
const originalTimeout = clinicalConfig.aiTimeoutMs;

afterEach(() => {
  setProvider(ruleBasedProvider);
  clinicalConfig.aiTimeoutMs = originalTimeout;
  vi.restoreAllMocks();
});

describe('requestSuggestion', () => {
  it('geçerli öneriyi döner', async () => {
    setProvider({ name: 'sahte', suggest: async () => ({ items: [validItem] }) });
    await expect(requestSuggestion(input)).resolves.toEqual({ items: [validItem] });
  });

  it.each<[string, unknown]>([
    ['yanlış tip', { items: [{ ...validItem, exerciseId: 'x' }] }],
    ['gün aralık dışı', { items: [{ ...validItem, day: 2 }] }],
    ['eksik alan', { items: [{ exerciseId: 1, day: 1 }] }],
    ['items yok', { foo: 1 }],
    ['null', null],
  ])('şemaya uymayan öneri → 502 SUGGESTION_INVALID (%s)', async (_n, raw) => {
    setProvider({ name: 'sahte', suggest: async () => raw });
    await expect(requestSuggestion(input)).rejects.toMatchObject({ statusCode: 502, code: 'SUGGESTION_INVALID' });
  });

  it('sağlayıcı hatası → 502 SUGGESTION_FAILED', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    setProvider({
      name: 'sahte',
      suggest: async () => {
        throw new Error('API down');
      },
    });
    await expect(requestSuggestion(input)).rejects.toMatchObject({ statusCode: 502, code: 'SUGGESTION_FAILED' });
  });

  it('zaman aşımı → 504 SUGGESTION_TIMEOUT', async () => {
    clinicalConfig.aiTimeoutMs = 50;
    setProvider({ name: 'yavaş', suggest: () => new Promise((r) => setTimeout(() => r({ items: [] }), 500)) });
    await expect(requestSuggestion(input)).rejects.toMatchObject({ statusCode: 504, code: 'SUGGESTION_TIMEOUT' });
  });
});
