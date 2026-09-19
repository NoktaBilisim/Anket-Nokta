# SurveyPro — Çok Kanallı Kurumsal Anket ve Değerlendirme Sistemi

SurveyPro, kurumsal anketlerin, denetim formlarının ve değerlendirmelerin çok kanallı (E-Posta, SMS, WhatsApp) olarak katılımcılara ulaştırılmasını, toplanmasını ve detaylı analitik raporlara dönüştürülmesini sağlayan modern bir anket platformudur.

---

## 🚀 Özellikler

- **5 Farklı Soru Tipi:** Tekten Seçmeli, Çoktan Seçmeli, Matris / Grid (Likert), Açık Uçlu Metin, Puanlama (1-10 Slider/Rating), Evet/Hayır.
- **Sürükle-Bırak Form Tasarımı:** HTML5 Drag & Drop ile anket sorularını görsel olarak sıralama ve canlı maksimum puan hesaplama.
- **Kategori ve Yetkinlik Etiketleme:** Soruları dinamik kategorilere ayırma, raporlama aşamasında kategori bazlı radar ve başarı analizi.
- **Çok Kanallı Bildirim Motoru:** 
  - 📧 Truguard markalı HTML E-Posta davetleri (SMTP / TLS).
  - 📱 Nokta Bilişim SMS API entegrasyonu (Telefon normalizasyonu ve Türkçe karakter desteği).
  - 💬 WhatsApp Gateway API entegrasyonu (15 sn zaman aşımı korumalı).
- **Gelişmiş Raporlama ve Analitik:**
  - 4 Temel Metrik Kartı: Gönderilen, Tamamlanan, Katılım Oranı (%), Ortalama Puan.
  - Kategori Başarı Göstergeleri: >=75% Yeşil, >=50% Sarı, <50% Kırmızı renk kodlaması.
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

## 🛠 Mimari ve Teknoloji Yığını

| Katman | Teknoloji | Açıklama |
|---|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Recharts, Lucide Icons | 5 UI durumu (Skeleton, Empty, Error, Partial, Success), responsive arayüz |
| **Backend** | Node.js, Express.js, Sequelize ORM | RESTful API, Winston loglama, katmanlı yetkilendirme |
| **Veritabanı** | PostgreSQL 16 | ACID Transaction, foreign key kısıtları, UUIDv4 birincil anahtarlar |
| **Önbellek** | Redis 7 | Raporlama önbellekleme (Graceful degradation özellikli) |
| **Ters Proxy & Web** | Nginx | SSL/TLS sonlandırma, gzip sıkıştırma, CSP ve güvenlik başlıkları |
| **Konteyner** | Docker, Docker Compose | İzole servis mimarisi |

---

## ⚙️ Kurulum ve Çalıştırma

### 1. Repoyu Klonlama ve Hazırlık

```bash
git clone https://github.com/NoktaBilisim/Anket-Nokta.git
cd Anket-Nokta
cp .env.example .env
```

### 2. Docker ile Hızlı Başlangıç

```bash
# Docker konteynerlerini derleyin ve başlatın
docker compose up --build -d
```

- **Frontend (Uygulama):** `http://localhost:3000`
- **Backend API:** `http://localhost:5001/api`
- **pgAdmin (İsteğe bağlı):** `http://localhost:5050`
- **Production URL:** `https://anket.noktabilisim.net`

### 3. Canlı Sunucuya Yayınlama (Deploy)

```bash
# 185.126.217.99 (develop) sunucusuna otomatik kurulum
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
*Tüm test paketleri 8/8 suite ve 61/61 test ile %100 başarılı olarak çalışmaktadır.*

### Frontend Production Derleme Testi
```bash
cd frontend
npm run build
```

---

## 👥 Varsayılan Kullanıcı Rolleri ve Demo Hesaplar

| Rol | E-Posta | Şifre | Yetki Kapsamı |
|---|---|---|---|
| **Admin** | `admin@surveypro.com` | `Admin123!` | Tüm anketler, kullanıcı yönetimi, sistem ayarları ve log istatistikleri |
| **Creator** | `creator@surveypro.com` | `Creator123!` | Kendi anketlerini tasarlama, yayınlama, çok kanallı gönderim ve raporları görme |
| **Evaluator** | `evaluator@surveypro.com` | `Eval123!` | Kendisine atanan anketlerin değerlendirmelerini ve raporlarını inceleme |
| **Participant** | `user1@surveypro.com` | `User123!` | Kendisine atanan anketleri yanıtlama |

---

## 🛡 Güvenlik ve Gizlilik Prensipleri

1. **IDOR / BOLA Savunması:** Kullanıcılar yalnızca kendi yetki alanlarındaki veya kendilerine hedeflenmiş anket verilerini görüntüleyebilir.
2. **Formula Injection Sanitization:** Excel dışa aktarımında `=`, `+`, `-`, `@`, `\t`, `\r` ile başlayan girdiler tek tırnakla nötralize edilir.
3. **Privilege Escalation Koruması:** Herkese açık kayıt endpoint'i (`/api/auth/register`) daima `participant` rolü atar.
4. **Hassas Bilgi Maskeleme:** Ayarlar ekranında SMTP şifreleri ve SMS API anahtarları `••••••••` olarak maskelenir.
5. **Anonimlik:** Katılımcı kimliği SHA-256 hash ile şifrelenir ve kullanıcı PII bilgisi anket yanıtından ayrıştırılır.
