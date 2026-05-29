# Telnet-X Supreme v5.1 — Additions

File-file ini adalah **tambahan** ke project Telnet-X Supreme yang sudah ada.

## Cara Integrasi

### 1. Copy config files
```bash
cp config/scan-profiles.yaml  /path/to/telnet-x-supreme/config/
cp config/ai-config.yaml       /path/to/telnet-x-supreme/config/
```

### 2. Copy src files
```bash
cp -r src/control-plane/  /path/to/telnet-x-supreme/src/
cp -r src/sidecars/        /path/to/telnet-x-supreme/src/
cp -r src/workers/         /path/to/telnet-x-supreme/src/
cp -r src/reporters/       /path/to/telnet-x-supreme/src/
cp    src/index.ts         /path/to/telnet-x-supreme/src/index.ts
```

### 3. Install dependencies tambahan
```bash
npm install js-yaml @anthropic-ai/sdk
npm install --save-dev @types/js-yaml
```

### 4. Tambah ke tsconfig.json (jika belum ada)
```json
{
  "compilerOptions": {
    "esModuleInterop": true,
    "resolveJsonModule": true
  }
}
```

### 5. Tambah ke .env
```env
ANTHROPIC_API_KEY=your_anthropic_api_key
```

## Cara Pakai

```bash
# Quick scan
npx ts-node src/index.ts 192.168.1.1 --profile=quick

# Deep scan dengan AI
npx ts-node src/index.ts 10.0.0.1 10.0.0.2 --profile=deep

# Full audit
npx ts-node src/index.ts target.host.com --profile=audit

# Dengan custom port
npx ts-node src/index.ts 192.168.1.1:2323 --profile=deep
```

## Ubah Config Tanpa Recompile

Edit `config/scan-profiles.yaml` untuk:
- Ubah timeout
- Ubah concurrency (max_concurrent)
- Aktifkan/nonaktifkan AI analysis per profile
- Tambah profile baru

Edit `config/ai-config.yaml` untuk:
- Ganti model Anthropic
- Ubah temperature
- Edit system prompt analyzer

Perubahan langsung aktif saat run berikutnya (hot-reload otomatis).

## Output Reports

Reports disimpan di `./reports/`:
- `scan-<timestamp>.json` — data lengkap untuk processing lebih lanjut
- `scan-<timestamp>.txt` — human-readable summary
