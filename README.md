# Swarm-Opus — Monorepo

Monorepo berisi semua project aktif yang saling terintegrasi.

## Project Structure

```
Swarm-Opus/
├── keuanganku-bot/        # AI-powered Telegram finance bot (Node.js)
├── telnet-x-supreme/      # Network auditing framework (TypeScript)
└── tabunganku-mobile/     # Personal finance Flutter app
```

---

## keuanganku-bot
Telegram bot keuangan pribadi berbasis AI (Gemini) dengan arsitektur enterprise:
- **Control Plane** — konfigurasi dinamis via `config/bot-config.yaml`
- **Async Worker Queue** — BullMQ + Redis (non-blocking)
- **Sidecar Model** — Auth, Logger, Rate Limiter
- **REST API** — endpoint untuk TabunganKu Mobile
- Deploy: Railway / Replit

```bash
cd keuanganku-bot
npm install
cp .env.example .env   # isi credentials
node src/index.js
```

---

## telnet-x-supreme
Framework audit jaringan Telnet dengan AI analysis:
- **Control Plane** — scan profiles via `config/scan-profiles.yaml`
- **AI Sidecar** — Anthropic Claude untuk banner analysis
- **Async Scan Worker** — concurrent scanning dengan concurrency control

```bash
cd telnet-x-supreme
npm install
npx ts-node src/index.ts 192.168.1.1 --profile=quick
npx ts-node src/index.ts 10.0.0.1 --profile=deep
npx ts-node src/index.ts target.host.com --profile=audit
```

---

## tabunganku-mobile
Flutter app keuangan pribadi yang terhubung ke KeuanganKu Bot:
- **Remote Config** — Sovereign Pattern, config dari API
- **Offline Fallback** — cached config jika API tidak tersedia
- **Full UI** — Dashboard, Transaction List, Add Transaction

```bash
cd tabunganku-mobile
flutter pub get
flutter run
```

---

## Integration Map

```
[tabunganku-mobile] ──HTTP──► [keuanganku-bot REST API]
[Telegram Bot]      ──────►  [keuanganku-bot Worker Queue]
                                      │
                                      ▼
                             [Google Sheets API]
                             [Gemini AI]

[telnet-x-supreme] ──► audit infrastruktur hosting keuanganku-bot
```

---

## Environment Variables

Lihat `.env.example` di masing-masing subfolder.
