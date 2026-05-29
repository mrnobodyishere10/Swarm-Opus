# KeuanganKu Bot v2.0

AI-powered personal finance Telegram bot dengan arsitektur enterprise-grade.

## Arsitektur
- **Control Plane** (Sovereign Pattern): Konfigurasi dinamis via `config/bot-config.yaml`
- **Async Worker Queue** (OSB Pattern): BullMQ + Redis untuk proses non-blocking
- **Sidecar Model**: Auth, Logger, Rate Limiter terpisah dari logika utama
- **REST API**: Endpoint untuk TabunganKu Mobile Flutter

## Setup

```bash
npm install
cp .env.example .env
# Edit .env dengan credentials kamu
node src/index.js
```

## Environment Variables

| Variable | Keterangan |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Token dari @BotFather |
| `GEMINI_API_KEY` | Google AI Studio API key |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Service account JSON (1 baris) |
| `GOOGLE_SPREADSHEET_ID` | ID Google Spreadsheet tujuan |
| `REDIS_HOST` | Host Redis (default: 127.0.0.1) |
| `REDIS_PORT` | Port Redis (default: 6379) |
| `REST_PORT` | Port REST API untuk Flutter (default: 3001) |

## Google Sheets Format

Buat sheet bernama `Transaksi` dengan header:
```
A: Date | B: Type | C: Category | D: Description | E: Amount | F: UserID | G: CreatedAt
```

## Control Plane

Edit `config/bot-config.yaml` untuk mengubah:
- Gemini model & parameter
- Queue concurrency & retry
- Rate limiting per user
- Feature flags (ai_parse, weekly_summary, budget_alert)

Perubahan langsung aktif tanpa restart (hot-reload).

## Deploy ke Railway

1. Push ke GitHub
2. Connect Railway ke repo
3. Set semua environment variables di Railway dashboard
4. Tambah Redis add-on di Railway
5. Deploy

## REST API Endpoints

| Method | Path | Keterangan |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/config` | Remote config untuk Flutter |
| GET | `/api/transactions?user_id=X` | Daftar transaksi |
| POST | `/api/transactions` | Tambah transaksi |
| GET | `/api/summary?user_id=X&year=Y&month=M` | Ringkasan bulanan |
