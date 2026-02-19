# 🏗️ Ada İmparatorluğu - Proje Yapısı

## ✅ Oluşturulan Dosyalar

### 📦 Root Dosyaları
- README.md - Kapsamlı proje dokümantasyonu
- .gitignore - Git ignore kuralları

### 🗄️ Database
- database/schema.sql - Tam veritabanı şeması (11 tablo)

### ⚙️ Backend (Node.js + Express)

**Konfigürasyon:**
- backend/package.json - Tüm dependencies
- backend/.env.example - Environment variables şablonu
- backend/src/server.js - Ana server dosyası
- backend/src/config/database.js - Database bağlantı havuzu

**Klasör Yapısı:**
```
backend/src/
├── config/         # Database, environment config
├── controllers/    # Route handler'lar (boş - dolduracağız)
├── models/         # Database model'leri (boş - dolduracağız)
├── routes/         # API route'ları (boş - dolduracağız)
├── services/       # Business logic (boş - dolduracağız)
├── middleware/     # Auth, validation (boş - dolduracağız)
└── utils/          # Helper functions (boş - dolduracağız)
```

### 🎨 Frontend (React + TypeScript + Vite)

**Konfigürasyon:**
- frontend/package.json - React, TypeScript, Tailwind dependencies
- frontend/vite.config.ts - Vite yapılandırması
- frontend/tailwind.config.js - Tailwind CSS tema
- frontend/tsconfig.json - TypeScript yapılandırması
- frontend/index.html - Ana HTML dosyası
- frontend/src/index.css - Global CSS + Tailwind
- frontend/src/main.tsx - React entry point
- frontend/src/App.tsx - Ana component (routing ile)

**Klasör Yapısı:**
```
frontend/src/
├── components/     # Reusable components (boş - dolduracağız)
├── pages/          # Page components (boş - dolduracağız)
├── services/       # API calls (boş - dolduracağız)
├── hooks/          # Custom React hooks (boş - dolduracağız)
├── types/          # TypeScript type definitions (boş - dolduracağız)
├── utils/          # Helper functions (boş - dolduracağız)
└── assets/         # Images, fonts, etc. (boş)
```

---

## 🗂️ Database Tabloları (11 adet)

1. **users** - Kullanıcı hesapları
2. **islands** - Koloni adaları
3. **buildings** - Binalar ve üretim tesisleri
4. **resources** - Kullanıcı kaynakları (altın, odun, yiyecek, vb.)
5. **productions** - Aktif üretim döngüleri
6. **convoys** - Ada arası konvoylar
7. **tasks** - Günlük görevler
8. **league_rankings** - Lig sıralamaları
9. **pvp_actions** - PvP aksiyonları (baskın, sabotaj)
10. **user_shields** - Koruma kalkanları
11. **market_transactions** - Pazar yeri işlemleri

---

## 🚀 Kurulum Adımları

### 1. PostgreSQL Database Oluştur
```bash
psql -U postgres
CREATE DATABASE island_empire;
\q
```

### 2. Schema'yı Yükle
```bash
psql -U postgres -d island_empire -f database/schema.sql
```

### 3. Backend Kur ve Başlat
```bash
cd backend
npm install
cp .env.example .env
# .env dosyasını düzenle!
npm run dev
```

### 4. Frontend Kur ve Başlat
```bash
cd frontend
npm install
npm run dev
```

### 5. Tarayıcıda Aç
- Frontend: http://localhost:5173
- Backend: http://localhost:3000

---

## 📋 Sonraki Adımlar

### Sprint 1 - Core Sistem (Bu hafta)

**Backend:**
1. Authentication (register, login, JWT)
2. User model ve controller
3. Island model ve controller
4. Building model ve controller
5. Resource management
6. Production sistem (game tick)

**Frontend:**
1. Login/Register sayfaları
2. HomePage component (mockup'tan)
3. API service katmanı
4. State management (Zustand)
5. Socket.io entegrasyonu

**Test:**
- Kullanıcı kayıt → login → ada görme → bina inşa → üretim başlat → topla

---

## 🎯 İlk Çalışan Özellik

**Core Loop (Üret → Topla → Yükselt):**
1. Kullanıcı kayıt olup giriş yapar
2. Ana adasını görür (1 adet çiftlik ile başlar)
3. Çiftlik buğday üretir (saatte +45)
4. 10 dakika sonra gelip toplar
5. Altın harcar, çiftliği seviye 2'ye yükseltir
6. Üretim artar: +60/saat

Bu çalıştığında oyunun temeli hazır demektir! 🎉

---

## 💡 Notlar

- Tüm klasörler oluşturuldu ama bazıları boş (dolduracağız)
- Mockup HTML'i referans olarak saklayın
- Database şeması tam ve production-ready
- CORS ve Socket.io yapılandırması hazır
- Tailwind tema oyun tasarımına uygun (tropik renkler)

---

**Soru veya sorun olursa README.md'deki iletişim bilgilerinden ulaşın!**
