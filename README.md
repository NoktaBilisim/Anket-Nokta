# SurveyPro — Çok Kanallı Kurumsal Anket ve Değerlendirme Sistemi

SurveyPro, kurumsal anketlerin, denetim formlarının ve değerlendirmelerin çok kanallı (E-Posta, SMS, WhatsApp) olarak katılımcılara ulaştırılmasını ve toplanmasını sağlayan modern bir anket platformudur. Toplanan yanıtları gerçek zamanlı puanlama modelleri ve kategori bazlı başarı analizleriyle işleyerek zengin görsel analitik raporlara ve çok sekmeli Excel çıktılarına dönüştürür. Dinamik kurumsal marka yönetimi (White-Labeling) desteği sayesinde işletmelerin kendi logo ve kurumsal kimlikleriyle anket süreçlerini güvenle yürütmelerine imkân tanır.

---

## 🚀 Temel Özellikler

- **5 Farklı Soru Tipi:** Tekten Seçmeli, Çoktan Seçmeli, Matris / Likert Tablosu, Açık Uçlu Metin, Puanlama (1-10 Slider/Rating), Evet/Hayır.
- **Sürükle-Bırak Form Tasarımı:** HTML5 Drag & Drop ile anket sorularını görsel olarak sıralama ve anlık maksimum puan hesaplama.
- **Kategori ve Yetkinlik Analizi:** Soruları dinamik kategorilere ayırma, raporlama aşamasında kategori bazlı radar ve başarı yüzdesi göstergeleri.
- **Kurumsal Marka ve Dinamik Logo Yönetimi (White-Labeling):**
  - Yönetim panelinden PNG, JPG, WebP ve SVG formatında kurum logosu yükleme.
  - İstemci ve sunucu katmanında 2MB dosya boyutu ve MIME tipi denetimi.
  - Sunucu tarafı SVG XSS / XXE sanitizasyonu (`svgSanitizer.js`).
  - Giriş ekranı (`/login`), masaüstü sol kenar çubuğu (`Sidebar`) ve mobil üst barda dinamik logo gösterimi.
  - Tek tıkla onaylı varsayılan Truguard kurumsal logosuna kesintisiz geri dönüş (`DELETE /api/settings/logo`).
  - Hızlı ve izole genel ayarlar uç noktası (`GET /api/settings/public`, SLA < 100ms).
- **Çok Kanallı Bildirim Motoru:**
  - 📧 Truguard kurumsal logolu HTML E-Posta davetleri (SMTP / TLS).
  - 📱 Nokta Bilişim SMS API entegrasyonu (Telefon normalizasyonu ve Türkçe karakter desteği).
  - 💬 WhatsApp Gateway API entegrasyonu (15 sn zaman aşımı korumalı).
- **Gelişmiş Raporlama ve Analitik:**
  - 4 Temel Metrik Kartı: Gönderilen, Tamamlanan, Katılım Oranı (%), Ortalama Puan.
  - Kategori Başarı Göstergeleri: ≥75% Yeşil, ≥50% Sarı, <50% Kırmızı renk kodlaması.
  - Katılımcı Puan Sıralaması: İlk üç derece için 🥇, 🥈, 🥉 madalya rozetleri ve soru detay dökümü.
  - 5 Sayfalı Excel Rapor Çıktısı (Özet, Kategori Analizi, Soru İstatistikleri, Yanıtlar, Kişi Puanları) ve CSV/Formula Injection koruması.
- **Katılımcı Deneyimi (Take Survey):**
  - Benzersiz tek kullanımlık token (`/survey/:token`).
  - 20'şer soruluk sayfalama ve matris satır eksik kontrolü.
  - Çift gönderim engeli (Single Submission Guard) ve yanıtlama süresi ölçümü (`duration_seconds`).
  - Anonim anketlerde SHA-256 kimlik gizleme (KVKK / GDPR uyumu).
- **Yüksek Performans ve Önbellek:** Redis 300s TTL rapor önbellekleme ve anket güncellemelerinde otomatik cache invalidation.
- **Savunmacı Güvenlik ve RBAC:** Katmanlı Rate Limiting, OWASP Top 10 IDOR / BOLA koruması, PostgreSQL transaction bütünlüğü ve Nginx güvenlik başlıkları.

---

## 📋 Sistem Gereksinimleri

- **Node.js:** `>= 20.0.0`
- **npm:** `>= 10.0.0`
- **Docker & Docker Compose:** `v2.20+` (Konteyner ortamı için)
- **PostgreSQL:** `>= 15.0` (Yerel çalıştırma için)
- **Redis:** `>= 7.0` (Yerel çalıştırma için)

---

## 🛠 Mimari ve Teknoloji Yığını

| Katman | Teknoloji | Açıklama |
|---|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Zustand, Recharts, Lucide Icons | 5 UI durumu (Skeleton, Empty, Error, Partial, Success), White-Labeling store, responsive tasarım |
| **Backend** | Node.js, Express.js, Sequelize ORM, Multer | RESTful API, Winston loglama, katmanlı yetkilendirme, SVG Sanitizer |
| **Veritabanı** | PostgreSQL 16 | ACID Transaction, foreign key kısıtları, UUIDv4 birincil anahtarlar |
| **Önbellek** | Redis 7 | Raporlama önbellekleme ve rate limit sayaçları (Graceful degradation özellikli) |
| **Statik Depolama** | Kalıcı Docker Volume (`uploads_data`) | Yüklenen logolar için `/app/uploads/logos` dizini |
| **Ters Proxy & Web** | Nginx | SSL/TLS sonlandırma, gzip sıkıştırma, CSP ve güvenlik başlıkları |
| **Konteyner** | Docker, Docker Compose | İzole ve orkestre edilmiş micro-service mimarisi |

---

## ⚙️ Kurulum ve Çalıştırma

### 1. Repoyu Klonlama ve Hazırlık

```bash
git clone https://github.com/NoktaBilisim/Anket-Nokta.git
cd Anket-Nokta
cp .env.example .env
```

### 2. Docker ile Hızlı Başlangıç (Geliştirme)

```bash
# Docker konteynerlerini derleyin ve arka planda başlatın
docker compose up --build -d
```

- **Frontend (Uygulama):** `http://localhost:3000`
- **Backend API:** `http://localhost:5001/api`
- **pgAdmin (İsteğe bağlı):** `http://localhost:5050`
- **Production URL:** `https://anket.noktabilisim.net` (Port 4466)

### 3. Canlı Sunucuya Yayınlama (Deploy)

```bash
# 185.126.217.99 (develop) sunucusuna otomatik kurulum ve derleme
bash deploy.sh
```

### 4. Yerel Geliştirme Ortamı

#### Backend
```bash
cd backend
npm install
npm run dev
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 🧪 Testleri Çalıştırma

### Backend Birim ve Entegrasyon Testleri (Jest + Supertest)
```bash
cd backend
npm test
```
*Tüm test paketleri 11/11 suite ve 82/82 test ile %100 başarılı olarak çalışmaktadır.*

### Frontend Production Derleme Testi
```bash
cd frontend
npm run build
```

---

## 🔐 Ortam Değişkenleri (Environment Variables)

`.env.example` dosyasında tanımlanan tüm anahtarlar ve açıklamaları:

| Değişken | Varsayılan / Örnek | Açıklama |
|---|---|---|
| `NODE_ENV` | `development` | Çalışma ortamı (`development`, `production`, `test`) |
| `PORT` | `5001` | Backend API HTTP dinleme portu |
| `FRONTEND_URL` | `http://localhost:3000` | İstemci SPA adresi (CORS ve bildirim bağlantıları için) |
| `DB_HOST` | `postgres` / `localhost` | PostgreSQL veritabanı sunucu adresi |
| `DB_PORT` | `5432` | PostgreSQL bağlantı portu |
| `DB_NAME` | `surveypro` | Veritabanı adı |
| `DB_USER` | `surveypro` | Veritabanı kullanıcı adı |
| `DB_PASSWORD` | `surveypro_guclu_sifre` | Veritabanı bağlantı parolası |
| `REDIS_HOST` | `redis` / `localhost` | Redis sunucu adresi |
| `REDIS_PORT` | `6379` | Redis bağlantı portu |
| `JWT_SECRET` | *(64 karakter gizli anahtar)* | JWT Access Token imzalama anahtarı |
| `JWT_REFRESH_SECRET` | *(64 karakter gizli anahtar)* | JWT Refresh Token imzalama anahtarı |
| `JWT_EXPIRES_IN` | `15m` | Access Token geçerlilik süresi |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh Token geçerlilik süresi |
| `SMS_API_URL` | `http://smsportal.noktabilisim.net:3001` | Nokta Bilişim SMS Gateway uç adresi |
| `SMS_API_KEY` | *(Gizli API Anahtarı)* | SMS Gateway kimlik doğrulama anahtarı |
| `SMS_HEADER` | `NOKTABLSM` | SMS gönderici başlığı (Originator) |
| `WHATSAPP_API_URL` | `http://whatsapp.noktabilisim.net:3000/send-message` | WhatsApp Gateway gönderim uç noktası |
| `SMTP_HOST` | `smtp.kurumunuz.com` | Kurumsal SMTP e-posta sunucusu |
| `SMTP_PORT` | `587` | SMTP sunucu portu |
| `SMTP_USER` | `bildirim@kurumunuz.com` | SMTP kullanıcı adı / e-posta adresi |
| `SMTP_PASS` | *(SMTP Parolası)* | SMTP bağlantı parolası |
| `SMTP_SSL` | `false` | SSL/TLS zorunluluğu (`true`/`false`) |
| `SMTP_AUTH` | `true` | Kimlik doğrulama zorunluluğu (`true`/`false`) |
| `SMTP_FROM_NAME` | `SurveyPro` | E-posta gönderici adı |
| `SMTP_FROM_EMAIL` | `bildirim@kurumunuz.com` | E-posta gönderici adresi |
| `APP_TITLE` | `SurveyPro` | Varsayılan sistem ve sayfa başlığı |
| `APP_LOGO` | `""` | Özel logo yolu (varsayılan boş, Truguard fallback) |
| `UPLOAD_DIR` | `./uploads/logos` | Logo yükleme fiziksel depolama dizini |
| `MAX_LOGO_SIZE_MB` | `2` | Logo dosya boyutu üst sınırı (Megabayt) |

---

## 📁 Klasör Yapısı

```text
.
├── backend/                  # Node.js / Express.js REST API Servisi
│   ├── src/
│   │   ├── config/           # Veritabanı ve Sequelize ORM yapılandırması
│   │   ├── controllers/      # API istek yöneticileri (Surveys, Settings, Auth, vb.)
│   │   ├── database/         # Veritabanı seed ve başlangıç scriptleri
│   │   ├── middleware/       # Auth, RBAC, Upload (Multer), Rate Limiter, Error Handler
│   │   ├── models/           # Sequelize veri modelleri ve ilişkileri
│   │   ├── routes/           # Express REST API rota tanımları
│   │   ├── services/         # Settings ve çok kanallı bildirim servisleri
│   │   ├── utils/            # JWT, Redis, SVG Sanitizer, Validasyon ve Winston Logger
│   │   ├── app.js            # Express uygulama örneği (test izolasyonu)
│   │   └── index.js          # HTTP sunucu başlatıcı
│   ├── test/                 # Jest & Supertest birim ve entegrasyon test paketleri
│   │   ├── unit/             # Settings, SVG Sanitizer, Score, Validate, Redis birim testleri
│   │   └── integration/      # Auth, Survey, Response, Settings API entegrasyon testleri
│   └── uploads/logos/        # Yüklenen dinamik kurum logoları (kalıcı disk alanı)
├── frontend/                 # React 18 + Vite SPA İstemcisi
│   ├── src/
│   │   ├── assets/           # Varsayılan Truguard kurumsal görsel varlıkları
│   │   ├── components/       # AppLayout, Modal, Navbar, Korumalı Rota bileşenleri
│   │   ├── pages/            # Login, Dashboard, SurveyEditor, Report, Settings sayfaları
│   │   ├── store/            # Zustand global durum yönetimi (brandingStore.js)
│   │   ├── utils/            # Axios API istemcisi ve yardımcı fonksiyonlar
│   │   ├── App.jsx           # Ana yönlendirme ve marka başlangıç yükleyicisi
│   │   └── main.jsx          # React DOM render noktası
├── docker/                   # Nginx web sunucusu ve ters vekil yapılandırmaları
├── docs/                     # Sistem mimarisi, API sözleşmesi ve operasyonel belgeler
│   ├── adr/                  # Mimari Karar Kayıtları (ADR 0001 - ADR 0005)
│   ├── api.md                # REST API uç nokta sözleşmeleri ve örnek istek/yanıtlar
│   ├── implementation.md     # Devir teslim ve teknik uygulama notları
│   ├── mimari.md             # Sistem mimarisi, veri modeli ve ERD diyagramları
│   ├── gereksinimler.md      # Fonksiyonel ve fonksiyonel olmayan kabul kriterleri
│   └── runbook.md            # SRE ve operasyonel işletim kılavuzu
├── scripts/                  # Yedekleme (backup.sh), geri yükleme (restore.sh) ve init scriptleri
├── docker-compose.yml        # Yerel Docker geliştirme ortamı
├── docker-compose.prod.yml   # Üretim ortamı Docker Compose orkestrasyonu
├── deploy.sh                 # Sunucu dağıtım otomasyon scripti
├── CHANGELOG.md              # Sürüm ve değişiklik geçmişi
└── README.md                 # Proje ana tanıtım ve başlangıç belgesi
```

---

## 👥 Varsayılan Kullanıcı Rolleri ve Demo Hesaplar

| Rol | E-Posta | Şifre | Yetki Kapsamı |
|---|---|---|---|
| **Admin** | `admin@surveypro.com` | `Admin123!` | Tüm anketler, kullanıcı yönetimi, kurumsal logo & sistem ayarları, log istatistikleri |
| **Creator** | `creator@surveypro.com` | `Creator123!` | Kendi anketlerini tasarlama, yayınlama, çok kanallı gönderim ve raporları görme |
| **Evaluator** | `evaluator@surveypro.com` | `Eval123!` | Kendisine atanan anketlerin değerlendirmelerini ve raporlarını inceleme |
| **Participant** | `user1@surveypro.com` | `User123!` | Kendisine atanan anketleri yanıtlama |

---

## 🛡 Güvenlik ve Gizlilik Prensipleri

1. **IDOR / BOLA Savunması:** Kullanıcılar yalnızca kendi yetki alanlarındaki veya kendilerine hedeflenmiş anket verilerini görüntüleyebilir. Evaluator rolü sadece yetkilendirildiği anket raporlarına erişebilir.
2. **SVG XSS & Dosya Yükleme Güvenliği:** Yüklenen logolarda Multer ile 2MB boyut sınırı ve MIME denetimi yapılır. SVG dosyaları sunucuda `<script>`, `<iframe>`, inline `on*` olay dinleyicileri ve XXE enjeksiyonlarına karşı `svgSanitizer.js` ile sterilize edilir.
3. **Formula Injection Sanitization:** Excel dışa aktarımında `=`, `+`, `-`, `@`, `\t`, `\r` ile başlayan girdiler tek tırnakla (`'`) nötralize edilir.
4. **Privilege Escalation Koruması:** Herkese açık kayıt endpoint'i (`/api/auth/register`) rol parametresini yok sayarak daima `participant` rolü atar.
5. **Hassas Bilgi Maskeleme:** Ayarlar ekranında SMTP şifreleri ve SMS API anahtarları `••••••••` olarak maskelenir; `/api/settings/public` ucundan kesinlikle dışarı sızdırılmaz.
6. **Anonimlik:** Katılımcı kimliği SHA-256 hash ile şifrelenir ve kullanıcı PII bilgisi anket yanıtından ayrıştırılır.
7. **Rate Limiting:** DoS saldırılarına karşı API (100 req/dk), Login (5 req/15dk), Çok Kanallı Gönderim (30 req/dk) ve Genel Ayarlar (60 req/dk) hız sınırlaması uygulanır.

---

## 🤝 Katkı Kuralları

1. Yeni bir özellik geliştirmeden önce `docs/gereksinimler.md` ve `docs/mimari.md` dokümanlarını inceleyin.
2. Her yeni API veya iş mantığı için `backend/test/` altında ilgili birim ve entegrasyon testlerini ekleyin (`npm test` %100 yeşil olmalıdır).
3. Kodlama standartları:
   - Backend: Node.js Express temiz katman ayrımı (Controller -> Service -> Model).
   - Frontend: React 18, Tailwind CSS, 5 UI durumu (Loading, Empty, Error, Validation, Success) ve erişilebilirlik (`aria-*`, `alt`).
4. Güvenlik kuralları: Ham SQL yazmaktan kaçının (Sequelize ORM kullanın), kullanıcı girdilerini doğrulayın (`validate.js`), hata yakalamalarında iç SQL/sistem hatalarını istemciye sızdırmayın.
5. Değişikliklerinizi `CHANGELOG.md` dosyasına Keep a Changelog standardında kaydedin.
