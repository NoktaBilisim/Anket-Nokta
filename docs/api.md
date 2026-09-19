# SurveyPro REST API Dokümantasyonu

SurveyPro API, JSON formatında iletişim kuran, JWT (Bearer Token) tabanlı kimlik doğrulamalı ve katmanlı yetkilendirme (RBAC) mekanizmasına sahip RESTful bir web servisidir.

**Temel URL:** `http://<host>:5001/api` veya Nginx ters vekili arkasında `/api`

---

## 1. Genel Standartlar ve Yanıt Formatı

### 1.1 Standart Yanıt Zarfı (Envelope)

Tüm API uç noktaları tutarlı bir JSON zarf yapısı döner:

**Başarılı Yanıt (HTTP 200 / 201):**
```json
{
  "success": true,
  "data": { ... }
}
```

**Hatalı Yanıt (HTTP 400 / 401 / 403 / 404 / 429 / 500):**
```json
{
  "success": false,
  "message": "Açıklayıcı hata mesajı"
}
```

### 1.2 HTTP Durum Kodları
- `200 OK`: İstek başarılı.
- `201 Created`: Kaynak başarıyla oluşturuldu.
- `400 Bad Request`: Geçersiz parametre, validasyon hatası veya kural ihlali.
- `401 Unauthorized`: Kimlik doğrulama belirteci (JWT) eksik veya geçersiz.
- `403 Forbidden`: Kullanıcı rolünün bu işlemi yapmaya yetkisi yok (IDOR / RBAC engeli).
- `404 Not Found`: İstenen kayıt veya anket bağlantısı bulunamadı.
- `429 Too Many Requests`: Hız sınırı (Rate Limit) aşıldı.
- `500 Internal Server Error`: Sunucu içi hata (üretim ortamında maskelenmiş hata mesajı).

### 1.3 Hız Sınırlamaları (Rate Limiting)
- **Genel API:** IP başına dakikada maksimum 100 istek (`apiLimiter`).
- **Giriş:** IP başına 15 dakikada maksimum 5 istek (`loginLimiter`).
- **Genel Ayarlar:** IP başına dakikada maksimum 60 istek (`publicSettingsLimiter`).
- **Çok Kanallı Gönderim:** Kullanıcı/IP başına dakikada maksimum 30 istek (`sendLimiter`).

---

## 2. Kimlik Doğrulama (Auth) — `/api/auth`

### `POST /api/auth/login`
Kullanıcı girişi yapar ve JWT erişim belirteçleri döner.
- **Yetki:** Herkese Açık (Rate Limit: 5 req/15dk)
- **İstek Gövdesi:**
```json
{
  "email": "admin@surveypro.com",
  "password": "Admin123!"
}
```
- **Başarılı Yanıt (200 OK):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": "11111111-1111-1111-1111-111111111111",
      "name": "Sistem Yöneticisi",
      "email": "admin@surveypro.com",
      "role": "admin"
    }
  }
}
```

### `POST /api/auth/register`
Sisteme yeni katılımcı kaydeder. Güvenlik gereği rol daima `participant` olarak atanır.
- **Yetki:** Herkese Açık
- **İstek Gövdesi:**
```json
{
  "name": "Ahmet Yılmaz",
  "email": "ahmet@example.com",
  "password": "Password123!"
}
```
- **Başarılı Yanıt (201 Created):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": "22222222-2222-2222-2222-222222222222",
      "name": "Ahmet Yılmaz",
      "email": "ahmet@example.com",
      "role": "participant"
    }
  }
}
```

### `POST /api/auth/refresh`
Refresh token ile yeni bir access token üretir.
- **Yetki:** Herkese Açık
- **İstek Gövdesi:** `{"refreshToken": "eyJhbGci..."}`
- **Başarılı Yanıt (200 OK):** `{"success": true, "data": {"token": "eyJhbGci..."}}`

### `POST /api/auth/logout`
Mevcut oturumu sonlandırır ve refresh token'ı geçersiz kılar.
- **Yetki:** `Bearer <token>` (Tüm Roller)
- **Başarılı Yanıt (200 OK):** `{"success": true, "data": {"message": "Çıkış yapıldı"}}`

### `GET /api/auth/me`
Oturum açmış kullanıcının güncel profil bilgilerini döner.
- **Yetki:** `Bearer <token>` (Tüm Roller)
- **Başarılı Yanıt (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "11111111-1111-1111-1111-111111111111",
    "name": "Sistem Yöneticisi",
    "email": "admin@surveypro.com",
    "role": "admin"
  }
}
```

---

## 3. Kurumsal Marka ve Sistem Ayarları — `/api/settings`

### `GET /api/settings/public`
Giriş sayfası (`/login`), katılımcı arayüzü ve genel layout için genel marka bilgilerini döner. Hassas entegrasyon parametrelerini (SMTP parolası, SMS API anahtarı vb.) kesinlikle sızdırmaz.
- **Yetki:** **Herkese Açık (No Auth)** (Rate Limit: 60 req/1dk)
- **Performans:** SLA < 100ms
- **Başarılı Yanıt (200 OK):**
```json
{
  "success": true,
  "data": {
    "app_logo": "/uploads/logos/logo_d1e89b62-6c3e-4b47-b89a-f4c2e6f498c1.png",
    "app_title": "SurveyPro",
    "site_url": "http://localhost:3000"
  }
}
```
*(Not: Henüz özel logo yüklenmemişse `app_logo` değeri `null` döner; istemci varsayılan Truguard kurumsal logosunu fallback olarak gösterir.)*

### `GET /api/settings`
Tüm sistem ayarlarını döner. Hassas şifreler ve SMS API anahtarları `••••••••` olarak maskelenir.
- **Yetki:** `admin` (`Bearer <token>`)
- **Başarılı Yanıt (200 OK):**
```json
{
  "success": true,
  "data": {
    "app_logo": "/uploads/logos/logo_xxxx.png",
    "app_title": "SurveyPro",
    "site_url": "http://localhost:3000",
    "smtp_host": "smtp.kurum.com",
    "smtp_port": "587",
    "smtp_user": "bildirim@kurum.com",
    "smtp_pass": "••••••••",
    "smtp_ssl": "false",
    "smtp_auth": "true",
    "smtp_from_name": "SurveyPro",
    "smtp_from_email": "bildirim@kurum.com",
    "whatsapp_api_url": "http://whatsapp.noktabilisim.net:3000/send-message",
    "sms_api_url": "http://smsportal.noktabilisim.net:3001",
    "sms_api_key": "••••••••",
    "sms_header": "NOKTABLSM"
  }
}
```

### `PUT /api/settings`
Sistem ayarlarını günceller. Maskeli (`••••••••`) gönderilen hassas alanlar veritabanında değiştirilmeden korunur.
- **Yetki:** `admin` (`Bearer <token>`)
- **İstek Gövdesi:**
```json
{
  "app_title": "Acme Corp Anket Portalı",
  "site_url": "https://anket.acme.com",
  "smtp_host": "smtp.acme.com",
  "smtp_port": "587",
  "smtp_user": "anket@acme.com",
  "smtp_pass": "••••••••",
  "sms_header": "ACME"
}
```
- **Başarılı Yanıt (200 OK):** `{"success": true, "data": {"message": "Ayarlar kaydedildi"}}`

### `POST /api/settings/logo`
Sistem geneli için yeni kurumsal logo yükler.
- **Yetki:** `admin` (`Bearer <token>`)
- **İçerik Tipi:** `multipart/form-data`
- **Girdi:** Form alanı `logo` (PNG, JPG, JPEG, WebP, SVG formatında dosya; maksimum 2MB).
- **Güvenlik İşlemleri:**
  - Multer boyutu ve MIME türünü doğrular.
  - SVG dosyalarında `<script>`, `<iframe>`, `on*` olayları ve XXE enjeksiyonları sunucuda `svgSanitizer.js` ile sterilize edilir.
  - Benzersiz UUID dosya adı (`logo_<uuid>.<ext>`) üretilir.
  - Varsa önceki özel logo dosyası diskten otomatik silinir (Garbage collection).
  - `activity_logs` tablosuna denetim izi kaydedilir.
- **Başarılı Yanıt (200 OK):**
```json
{
  "success": true,
  "data": {
    "app_logo": "/uploads/logos/logo_e49eb72f-5188-466d-9269-e09faaf73c24.png",
    "app_title": "SurveyPro",
    "message": "Logo başarıyla yüklendi ve güncellendi"
  }
}
```
- **Olası Hata Kodları:**
  - `400 Bad Request`: "Dosya boyutu 2MB'tan büyük olamaz." / "Geçersiz dosya formatı..." / "Lütfen bir logo dosyası seçin."
  - `401 Unauthorized`: "Oturum açmanız gerekmektedir"
  - `403 Forbidden`: "Bu işlem için admin yetkisi gereklidir"

### `DELETE /api/settings/logo`
Yüklenen özel logoyu diskten fiziksel olarak siler, `app_logo` ayarını boşaltır ve sistemi varsayılan Truguard kurumsal logosuna sıfırlar.
- **Yetki:** `admin` (`Bearer <token>`)
- **Başarılı Yanıt (200 OK):**
```json
{
  "success": true,
  "data": {
    "app_logo": null,
    "message": "Özel logo kaldırıldı, sistem varsayılan Truguard logosuna sıfırlandı"
  }
}
```

### `POST /api/settings/test-smtp`
Kayıtlı SMTP sunucusuna canlı TCP/TLS el sıkışma testi yapar.
- **Yetki:** `admin` (`Bearer <token>`)
- **Başarılı Yanıt (200 OK):** `{"success": true, "data": {"message": "SMTP sunucusuna bağlantı başarılı"}}`

### `POST /api/settings/send-test-email`
Belirtilen adrese deneme e-postası gönderir.
- **Yetki:** `admin` (`Bearer <token>`)
- **İstek Gövdesi:** `{"to": "deneme@kurum.com"}`
- **Başarılı Yanıt (200 OK):** `{"success": true, "data": {"message": "Test e-postası deneme@kurum.com adresine gönderildi"}}`

### `POST /api/settings/send-test-whatsapp`
Belirtilen telefon numarasına WhatsApp test mesajı gönderir.
- **Yetki:** `admin` (`Bearer <token>`)
- **İstek Gövdesi:** `{"phone": "05551234567"}`
- **Başarılı Yanıt (200 OK):** `{"success": true, "data": {"message": "WhatsApp test mesajı 05551234567 numarasına gönderildi"}}`

### `POST /api/settings/send-test-sms`
Belirtilen telefon numarasına SMS test mesajı gönderir.
- **Yetki:** `admin` (`Bearer <token>`)
- **İstek Gövdesi:** `{"phone": "05551234567"}`
- **Başarılı Yanıt (200 OK):** `{"success": true, "data": {"message": "Test SMS 05551234567 numarasına gönderildi"}}`

---

## 4. Anket Yönetimi (Surveys) — `/api/surveys`

### `GET /api/surveys`
Kullanıcının rolüne göre erişebileceği anketleri listeler.
- **Yetki:** `Bearer <token>` (`admin`: tüm anketler, `creator`: kendi anketleri, `evaluator`/`participant`: atandıkları aktif anketler).
- **Başarılı Yanıt (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "a3b845c1-1234-4567-89ab-cdef01234567",
      "title": "2026 Müşteri Memnuniyeti Anketi",
      "description": "Yıllık değerlendirme formu",
      "status": "active",
      "anonymous": false,
      "expires_at": "2026-12-31T23:59:59.000Z",
      "created_at": "2026-09-19T10:00:00.000Z",
      "creator": {
        "id": "11111111-1111-1111-1111-111111111111",
        "name": "Sistem Yöneticisi",
        "email": "admin@surveypro.com"
      }
    }
  ]
}
```

### `POST /api/surveys`
Yeni bir anket taslağı (`draft`) ve ilişkili sorularını Sequelize transaction ile oluşturur.
- **Yetki:** `admin`, `creator` (`Bearer <token>`)
- **İstek Gövdesi:**
```json
{
  "title": "Hizmet Kalitesi Değerlendirmesi",
  "description": "Kurumsal geri bildirim formu",
  "anonymous": false,
  "expires_at": "2026-12-31T23:59:59Z",
  "questions": [
    {
      "text": "Genel hizmet hızından memnun musunuz?",
      "type": "single",
      "category": "Hız ve Performans",
      "is_required": true,
      "options": [
        { "text": "Çok Memnunum", "score": 10 },
        { "text": "Memnunum", "score": 7 },
        { "text": "Memnun Değilim", "score": 2 }
      ]
    },
    {
      "text": "Departman Başarı Matrisi",
      "type": "matrix",
      "category": "Departmanlar",
      "is_required": true,
      "options": {
        "rows": [
          { "text": "Teknik Destek" },
          { "text": "Müşteri Hizmetleri" }
        ],
        "columns": [
          { "text": "Yetersiz", "score": 1 },
          { "text": "Orta", "score": 3 },
          { "text": "Mükemmel", "score": 5 }
        ]
      }
    }
  ]
}
```
- **Başarılı Yanıt (201 Created):** `{"success": true, "data": { "id": "...", "title": "...", "questions": [...] }}`

### `GET /api/surveys/:id`
Anket detayını ve sorularını getirir (IDOR korumalı).
- **Yetki:** `admin`, `creator` (kendi anketi), `evaluator`/`participant` (atanmış anket).

### `PUT /api/surveys/:id`
Anket bilgilerini ve sorularını günceller. Redis rapor önbelleğini otomatik temizler.
- **Yetki:** `admin`, `creator` (kendi anketi).

### `PATCH /api/surveys/:id/status`
Anket durumunu değiştirir (`draft`, `active`, `closed`, `archived`).
- **Yetki:** `admin`, `creator` (kendi anketi).
- **İstek Gövdesi:** `{"status": "active"}`

### `DELETE /api/surveys/:id`
Anketi siler (İlişkili sorular, hedefler, yanıtlar cascade silinir, Redis önbelleği temizlenir).
- **Yetki:** `admin`, `creator` (kendi anketi).

### `POST /api/surveys/:id/send`
Anketi hedef kitleye çok kanallı (Email, SMS, WhatsApp) olarak dağıtır ve katılımcılara özel tekil token linkleri üretir.
- **Yetki:** `admin`, `creator` (Rate Limit: 30 req/1dk)
- **İstek Gövdesi:**
```json
{
  "channels": ["email", "sms"],
  "target_users": ["uuid-user-1", "uuid-user-2"],
  "custom_message": "Değerli çalışanımız, lütfen anketimizi doldurunuz."
}
```
- **Başarılı Yanıt (200 OK):**
```json
{
  "success": true,
  "data": {
    "total": 2,
    "results": [
      { "userId": "uuid-user-1", "email": "success", "sms": "success" },
      { "userId": "uuid-user-2", "email": "success", "sms": "success" }
    ]
  }
}
```

### `GET /api/surveys/:id/report`
Anketin özet istatistiklerini, 4 KPI kartını, kategori başarı yüzdelerini ve katılımcı sıralamasını döner.
- **Yetki:** `admin`, `creator` (kendi anketi), `evaluator` (atanmış anket).
- **Önbellek:** Redis 300s TTL (Yeni yanıt geldikçe otomatik invalidation yapılır).
- **Başarılı Yanıt (200 OK):**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_sent": 100,
      "total_completed": 85,
      "participation_rate": 85.0,
      "average_score": 78.4,
      "max_possible_score": 100
    },
    "categories": [
      {
        "name": "Hız ve Performans",
        "score": 42,
        "max_score": 50,
        "percentage": 84.0,
        "status_color": "green"
      }
    ],
    "participants": [
      {
        "rank": 1,
        "medal": "🥇",
        "name": "Ali Veli",
        "score": 98,
        "completed_at": "2026-09-19T11:20:00.000Z"
      }
    ]
  }
}
```

### `GET /api/surveys/:id/export-excel`
Ankete ait 5 sekmeli analitik raporu (Özet, Kategori Analizi, Soru İstatistikleri, Yanıtlar, Kişi Puanları) Excel (`.xlsx`) formatında binary stream olarak indirir.
- **Yetki:** `admin`, `creator` (kendi anketi), `evaluator` (atanmış anket).
- **Güvenlik:** CSV/Formula Injection korumalı (Formül önekleri `'` ile temizlenir). Dosya adı RFC 5987 / UTF-8 uyumludur.

---

## 5. Katılımcı Anket Doldurma — `/api/responses`

### `GET /api/responses/:token` (veya `GET /api/responses/token/:token`)
Katılımcıya özel tekil token ile anket sorularını çeker. İlk erişimde veritabanına `opened_at` zaman damgasını işler.
- **Yetki:** **Herkese Açık (Token ile)**
- **Başarılı Yanıt (200 OK):**
```json
{
  "success": true,
  "data": {
    "survey": {
      "id": "survey-uuid",
      "title": "Memnuniyet Anketi",
      "questions": [ ... ]
    },
    "targetId": "target-uuid"
  }
}
```
- **Olası Hata Kodları:**
  - `400 Bad Request`: "Bu anketi zaten doldurdunuz" / "Anket aktif değil" / "Anket süresi doldu"
  - `404 Not Found`: "Geçersiz link veya token bulunamadı"

### `POST /api/responses/:token` (veya `POST /api/responses/token/:token`)
Anket yanıtlarını kaydeder ve anketi tamamlar (Single Submission Guard).
- **Yetki:** **Herkese Açık (Token ile)**
- **İstek Gövdesi:**
```json
{
  "duration_seconds": 125,
  "answers": [
    {
      "question_id": "q1-uuid",
      "value": ["Çok Memnunum"]
    },
    {
      "question_id": "q2-uuid",
      "value": {
        "Teknik Destek": "Mükemmel",
        "Müşteri Hizmetleri": "Orta"
      }
    }
  ]
}
```
- **Başarılı Yanıt (200 OK):** `{"success": true, "data": {"message": "Yanıtlarınız kaydedildi, teşekkürler!"}}`

---

## 6. Kullanıcı Yönetimi — `/api/users`

### `GET /api/users`
Sistemdeki tüm kullanıcıları listeler (şifre ve refresh token alanları filtrelenir).
- **Yetki:** `admin` (`Bearer <token>`)

### `POST /api/users`
Yeni bir kullanıcı (Admin, Creator, Evaluator veya Participant) oluşturur.
- **Yetki:** `admin` (`Bearer <token>`)
- **İstek Gövdesi:**
```json
{
  "name": "Mehmet Demir",
  "email": "mehmet@kurum.com",
  "password": "Password123!",
  "role": "creator",
  "phone": "05551112233",
  "whatsapp": "05551112233"
}
```
- **Başarılı Yanıt (201 Created):** `{"success": true, "data": { "id": "...", "name": "...", "role": "creator" }}`

### `POST /api/users/import`
Excel (`.xlsx`, `.xls`) veya `.csv` dosyasından toplu kullanıcı içe aktarımı yapar.
- **Yetki:** `admin` (`Bearer <token>`)
- **İçerik Tipi:** `multipart/form-data` (form alanı `file`, max 5MB).
- **Başarılı Yanıt (200 OK):** `{"success": true, "data": {"created": 25, "skipped": 2, "errors": []}}`

### `PUT /api/users/:id`
Kullanıcı bilgilerini veya şifresini günceller.
- **Yetki:** `admin` (`Bearer <token>`)

### `DELETE /api/users/:id`
Kullanıcıyı siler (Admin kendi kendini silemez).
- **Yetki:** `admin` (`Bearer <token>`)

### `PUT /api/users/me/profile`
Oturum açmış kullanıcının adını, telefonunu veya WhatsApp numarasını günceller.
- **Yetki:** `Bearer <token>` (Tüm Roller)

### `PUT /api/users/me/password`
Oturum açmış kullanıcının şifresini değiştirir.
- **Yetki:** `Bearer <token>` (Tüm Roller)
- **İstek Gövdesi:** `{"currentPassword": "EskiSifre123!", "newPassword": "YeniGucluSifre123!"}`

---

## 7. Log ve İstatistikler — `/api/logs`

### `GET /api/logs`
Sistem genelindeki denetim izlerini (Audit Logs) sayfalı olarak listeler.
- **Yetki:** `admin` (`Bearer <token>`)
- **Query Parametreleri:** `page=1`, `limit=50`, `action=setting_updated`, `userId=...`

### `GET /api/logs/stats`
Sistem geneli toplam anket, aktif anket, toplam yanıt, toplam kullanıcı ve son 7 günlük yanıt dağılım grafiği verilerini döner.
- **Yetki:** `admin`, `creator` (`Bearer <token>`)

### `GET /api/logs/my-surveys`
Oturum açmış katılımcının kendisine atanmış anketlerini listeler.
- **Yetki:** `Bearer <token>` (Tüm Roller)

---

## 8. Sağlık ve Servis Durumu (Health & Readiness)

### `GET /api/health`
Express backend servisinin ayakta olduğunu doğrular (Liveness Probe).
- **Yetki:** Herkese Açık
- **Başarılı Yanıt (200 OK):**
```json
{
  "status": "ok",
  "uptime": 3600,
  "timestamp": "2026-09-19T12:00:00.000Z"
}
```

### `GET /api/ready`
PostgreSQL canlı veritabanı bağlantısını (`sequelize.authenticate()`) sınar (Readiness Probe).
- **Yetki:** Herkese Açık
- **Başarılı Yanıt (200 OK):**
```json
{
  "status": "ready",
  "database": "connected",
  "uptime": 3600,
  "timestamp": "2026-09-19T12:00:00.000Z"
}
```
- **Hata Durumu (503 Service Unavailable):**
```json
{
  "status": "not_ready",
  "database": "disconnected",
  "error": "Veritabanı servisi hazır değil",
  "timestamp": "2026-09-19T12:00:00.000Z"
}
```
