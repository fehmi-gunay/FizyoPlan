// src/config import edilmeden ÖNCE çalışır: testler asla geliştirme veritabanına yazmaz.
// dotenv mevcut değişkenleri ezmediği için buradaki değerler .env'deki değerlere üstün gelir.
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'fizyoplan_test';
