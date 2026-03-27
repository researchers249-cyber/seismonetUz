# SEISMON — Zilzila Erta Ogohlantirish Tizimi

Python + FastAPI backend, React TypeScript frontend.

## Ishga tushirish (local)

```bash
# Backend
pip install -r requirements.txt
uvicorn server.main:app --reload

# Frontend
npm install
npm run dev
```

## Deploy (Railway)

Railway avtomatik ravishda `railway.toml` asosida build va deploy qiladi.

```
https://[RAILWAY-DOMAIN]/health   # health check
https://[RAILWAY-DOMAIN]/         # frontend
https://[RAILWAY-DOMAIN]/ws       # WebSocket
https://[RAILWAY-DOMAIN]/lab      # 3D elektromagnit laboratoriya
```

## Server uxlamasligi (UptimeRobot)

1. [uptimerobot.com](https://uptimerobot.com) ga kiring (bepul)
2. **Add New Monitor** tugmasini bosing
3. **Type**: HTTP(s)
4. **URL**: `https://[RAILWAY-DOMAIN]/health`
5. **Interval**: 5 minutes
6. **Create Monitor** tugmasini bosing

UptimeRobot har 5 daqiqada `/health` endpointga so'rov yuborib, serverning uyquga ketishini oldini oladi.

## Texnologiyalar

- **Backend**: Python, FastAPI, SQLite, APScheduler
- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Deploy**: Railway, Nixpacks
- **Ma'lumot manbalari**: USGS, EMSC
