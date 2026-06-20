# Integrasi ElevenLabs Text-to-Speech

Frontend tidak boleh menyimpan API key ElevenLabs. Simpan API key di backend
sebagai environment variable, lalu expose endpoint proxy internal untuk aplikasi.

## Kontrak Endpoint

Default endpoint yang dipakai frontend:

```txt
POST /api/tts/elevenlabs
```

Request body:

```json
{
  "text": "Nomor antrean R 13. Silakan menuju Loket 1.",
  "voiceId": "VOICE_ID_DARI_ELEVENLABS",
  "modelId": "eleven_v3",
  "voiceSettings": {
    "stability": 0.55,
    "similarityBoost": 0.78,
    "style": 0,
    "useSpeakerBoost": true
  }
}
```

Response:

```txt
Content-Type: audio/mpeg
```

## Local Dev / Preview

Endpoint ini sekarang disediakan oleh backend Go di `../antrein-backend`.
Jalankan backend:

```bash
cd ../antrein-backend
go run ./cmd/server
```

Frontend Vite akan mem-proxy request:

```txt
POST /api/tts/elevenlabs
```

API key dibaca oleh backend dari environment variable:

```txt
ELEVENLABS_API_KEY=isi_api_key_di_server
```

Jangan gunakan prefix `VITE_` untuk API key, karena semua `VITE_*` akan ikut
masuk ke bundle frontend.

## Environment Variable Production

```txt
ELEVENLABS_API_KEY=isi_api_key_di_server
```
