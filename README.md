# 🏝️ Ada İmparatorluğu - Island Empire Game

Tropik ada temalı hibrit oyun. Üretim yönetimi, ticaret ve kontrollü PvP içerir.

## 🎮 Oyun Özellikleri

- **3 Lig Sistemi**: Ticaret, Üretim, Korsan/Keşif
- **Koloni Adaları**: Her ada farklı uzmanlık alanı
- **Hibrit PvP**: Kontrollü kayıp, sinir bozmayan savaş sistemi
- **Günlük 3-4 Giriş**: Casual oyunculara uygun tempo
- **Dengeli Puanlama**: 4 farklı puan kaynağı

## 🛠️ Teknolojiler

### Backend
- Node.js + Express
- PostgreSQL
- Socket.io (real-time)
- JWT Authentication

### Frontend
- React + TypeScript
- Vite
- Tailwind CSS
- Zustand (state management)

## 📦 Kurulum

### Gereksinimler
- Node.js 18+
- PostgreSQL 14+
- npm veya yarn

### 1. Repository'yi Klonla
\`\`\`bash
git clone <your-repo-url>
cd island-empire-game
\`\`\`

### 2. Database Kurulumu

PostgreSQL'de database oluştur:
\`\`\`sql
CREATE DATABASE island_empire;
\`\`\`

Schema'yı yükle:
\`\`\`bash
psql -U postgres -d island_empire -f database/schema.sql
\`\`\`

### 3. Backend Kurulumu

\`\`\`bash
cd backend
npm install
\`\`\`

.env dosyası oluştur:
\`\`\`bash
cp .env.example .env
# .env dosyasını düzenle (database bilgileri, JWT secret, vs.)
\`\`\`

Backend'i başlat:
\`\`\`bash
npm run dev
\`\`\`

Server şu adreste çalışacak: http://localhost:3000

### 4. Frontend Kurulumu

Yeni terminal aç:
\`\`\`bash
cd frontend
npm install
\`\`\`

Frontend'i başlat:
\`\`\`bash
npm run dev
\`\`\`

Uygulama şu adreste çalışacak: http://localhost:5173

## 📁 Proje Yapısı

\`\`\`
island-empire-game/
├── backend/
│   ├── src/
│   │   ├── config/         # Database, env config
│   │   ├── controllers/    # Route handlers
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Auth, validation
│   │   └── utils/          # Helper functions
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API calls
│   │   ├── hooks/          # Custom hooks
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Helper functions
│   ├── package.json
│   └── vite.config.ts
├── database/
│   └── schema.sql          # Database schema
└── README.md
\`\`\`

## 🚀 Development Workflow

### Backend Development
\`\`\`bash
cd backend
npm run dev  # Nodemon ile otomatik restart
\`\`\`

### Frontend Development
\`\`\`bash
cd frontend
npm run dev  # Hot reload aktif
\`\`\`

### Database Migration
Yeni migration çalıştırmak için:
\`\`\`bash
cd backend
npm run db:migrate
\`\`\`

## 🧪 Testing

### Backend Tests
\`\`\`bash
cd backend
npm test
\`\`\`

### Frontend Tests
\`\`\`bash
cd frontend
npm test
\`\`\`

## 📊 API Endpoints

### Authentication
- POST `/api/auth/register` - Yeni kullanıcı kaydı
- POST `/api/auth/login` - Giriş yap
- GET `/api/auth/me` - Kullanıcı bilgilerini getir

### Islands
- GET `/api/islands` - Kullanıcının adalarını listele
- POST `/api/islands` - Yeni ada keşfet
- PUT `/api/islands/:id` - Ada güncelle

### Buildings
- GET `/api/buildings/:islandId` - Ada binalarını listele
- POST `/api/buildings` - Yeni bina inşa et
- PUT `/api/buildings/:id/upgrade` - Bina yükselt
- POST `/api/buildings/:id/collect` - Üretim topla

### Resources
- GET `/api/resources` - Kaynakları getir
- PUT `/api/resources` - Kaynak güncelle

### Convoys
- GET `/api/convoys` - Aktif konvoyları listele
- POST `/api/convoys` - Yeni konvoy gönder

### League
- GET `/api/league/rankings` - Lig sıralaması
- GET `/api/league/my-rank` - Kullanıcının sırası

## 🎯 Next Steps (Sprint 1)

- [x] Proje yapısı oluşturuldu
- [x] Database şeması hazırlandı
- [ ] Authentication sistemi
- [ ] Temel üretim sistemi (Core Loop)
- [ ] Island & Building CRUD
- [ ] Resource management
- [ ] Frontend-Backend entegrasyonu

## 🤝 Contributing

Pull request'ler hoş karşılanır. Büyük değişiklikler için önce issue açın.

## 📝 License

MIT

## 👥 Team

- Geliştirici: [Your Name]
- Tasarım: [Designer Name]

## 📞 İletişim

Sorularınız için: [your-email@example.com]
\`\`\`
