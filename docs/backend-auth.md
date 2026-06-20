# Backend dan Auth

Backend aplikasi sekarang berada di `../antrein-backend` dan berjalan memakai Go standard library.

## Development

```bash
cd ../antrein-backend
go run ./cmd/server
```

Di terminal lain:

```bash
cd ../antrein-frontend
npm run dev
```

Vite akan mem-proxy request `/api/*` ke `http://localhost:8080`. Jika backend berjalan di alamat lain, set:

```txt
ANTREIN_API_URL=http://localhost:PORT
```

## Production

```bash
cd ../antrein-frontend
npm run build

cd ../antrein-backend
go run ./cmd/server
```

Backend Go akan melayani API aplikasi, proxy ElevenLabs, dan file build frontend dari `../antrein-frontend/build`.

## Database

Database runtime berada di:

```text
antrein-backend/database/antrein-db.json
```

File ini dibuat otomatis saat server pertama kali menerima request API dan tidak ikut git karena berisi data runtime.

## Akun Awal

Seed default:

```text
Email: admin@antrein.local
Password: password123
```

## Session

Session disimpan di cookie `antrein_session` dengan:

- `HttpOnly`
- `SameSite=Lax`
- durasi 10 hari
- `Secure` otomatis saat request melalui HTTPS
