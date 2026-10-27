// Kontrollü hata: HTTP durum kodu + makine tarafından okunabilir kod taşır.
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, 'BAD_REQUEST', message, details);
  }
  static unauthorized(message = 'Giriş yapmanız gerekiyor') {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }
  static forbidden(message = 'Bu işlem için yetkiniz yok') {
    return new ApiError(403, 'FORBIDDEN', message);
  }
  static conflict(message: string) {
    return new ApiError(409, 'CONFLICT', message);
  }
  static unprocessable(code: string, message: string, details?: unknown) {
    return new ApiError(422, code, message, details);
  }
  static notFound(message = 'Kayıt bulunamadı') {
    return new ApiError(404, 'NOT_FOUND', message);
  }
}
