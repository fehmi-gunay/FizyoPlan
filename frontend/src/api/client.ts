// Backend ile tek iletişim noktası: token ekler, hataları tek tipe (ApiError) çevirir.

const TOKEN_KEY = 'fizyo_token';

export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* gizli pencere vb. – oturum yalnızca bellekte kalır */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* yok say */
    }
  },
};

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  // Doğrulama hatalarını alan adına göre döndürür: { email: 'mesaj' }
  fieldErrors(): Record<string, string> {
    if (!Array.isArray(this.details)) return {};
    const out: Record<string, string> = {};
    for (const d of this.details as { field?: string; message?: string }[]) {
      if (d.field && d.message && !out[d.field]) out[d.field] = d.message;
    }
    return out;
  }
}

// Oturum geçersizleşince AuthContext dinler ve çıkış yapar
export const UNAUTHORIZED_EVENT = 'auth:unauthorized';

type Options = { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown; signal?: AbortSignal };

export async function api<T>(path: string, { method = 'GET', body, signal }: Options = {}): Promise<T> {
  const token = tokenStore.get();
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK_ERROR', 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.');
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const e = data?.error;
    if (res.status === 401 && token) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    throw new ApiError(res.status, e?.code ?? 'UNKNOWN', e?.message ?? 'Beklenmeyen bir hata oluştu', e?.details);
  }
  return data as T;
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu';
}
