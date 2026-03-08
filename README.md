# SurveyPro — Anket Yönetim Sistemi

## Hızlı Başlangıç

```bash
# 1. .env dosyasını oluştur
cp .env.example .env

# 2. Docker ile başlat
docker compose up --build
```

Uygulama: http://localhost:3000  
pgAdmin: http://localhost:5050

## Demo Hesaplar

| Rol | E-posta | Şifre |
|---|---|---|
| Admin | admin@surveypro.com | Admin123! |
| Creator | creator@surveypro.com | Creator123! |
| Evaluator | evaluator@surveypro.com | Eval123! |
| Katılımcı | user1@surveypro.com | User123! |

## Yerel Geliştirme (Docker Olmadan)

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (ayrı terminal)
cd frontend
npm install
npm run dev
```

## Teknolojiler
- Frontend: React 18 + Vite + Zustand + Recharts + Tailwind CSS
- Backend: Node.js + Express + Sequelize ORM
- Veritabanı: PostgreSQL 15
- Cache: Redis 7
