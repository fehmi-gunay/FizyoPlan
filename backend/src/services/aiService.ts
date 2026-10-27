import { clinicalConfig } from '../config/clinical';
import { ApiError } from '../utils/ApiError';
import { Suggestion, suggestionSchema } from '../validators/plan.validators';
import { ruleBasedProvider } from './ai/ruleBasedProvider';
import { AiProvider, SuggestionInput } from './ai/types';

// Aşama 8'de gerçek AI sağlayıcısı burada seçilecek; şimdilik kural tabanlı yedek.
let provider: AiProvider = ruleBasedProvider;

export function setProvider(p: AiProvider) {
  provider = p;
}

class TimeoutError extends Error {}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError()), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Öneri al + şema kontrolü. Hata veya zaman aşımında plan kaydedilmez.
export async function requestSuggestion(input: SuggestionInput): Promise<Suggestion> {
  let raw: unknown;
  try {
    raw = await withTimeout(provider.suggest(input), clinicalConfig.aiTimeoutMs);
  } catch (err) {
    if (err instanceof TimeoutError) {
      throw new ApiError(504, 'SUGGESTION_TIMEOUT', 'Öneri üretimi zaman aşımına uğradı, plan kaydedilmedi');
    }
    console.error(`Öneri üretici (${provider.name}) hatası:`, err instanceof Error ? err.message : err);
    throw new ApiError(502, 'SUGGESTION_FAILED', 'Öneri üretilemedi, plan kaydedilmedi');
  }

  const parsed = suggestionSchema(input.days).safeParse(raw);
  if (!parsed.success) {
    throw new ApiError(502, 'SUGGESTION_INVALID', 'Öneri şema kontrolünden geçmedi, plan kaydedilmedi');
  }
  return parsed.data;
}
