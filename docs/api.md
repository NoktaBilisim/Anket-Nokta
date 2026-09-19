# SurveyPro REST API Dokümantasyonu

SurveyPro API, JSON formatında iletişim kuran, JWT (Bearer token) kimlik doğrulamalı RESTful bir arayüzdür.

**Temel URL:** `http://<host>:5001/api` veya Nginx arkasında `/api`

---

## 1. Kimlik Doğrulama (Auth)

### `POST /api/auth/login`
Kullanıcı girişi yapar ve JWT erişim belirteci döner.
- **Yetki:** Herkese açık (Rate Limit: 5 req/15dk)
- **Request Body:**
```json
{
  "email": "admin@surveypro.com",
  "password": "Admin123!"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
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
- **Yetki:** Herkese açık (Rate Limit: 5 req/15dk)
- **Request Body:**
```json
{
  "name": "Ahmet Yılmaz",
  "email": "ahmet@example.com",
  "password": "Password123!"
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": "...",
      "name": "Ahmet Yılmaz",
      "email": "ahmet@example.com",
      "role": "participant"
    }
  }
}
```

### `GET /api/auth/me`
Oturum açmış kullanıcının bilgilerini döner.
- **Yetki:** `Bearer <token>` (Tüm roller)

---

## 2. Anket Yönetimi (Surveys)

### `GET /api/surveys`
Kullanıcının erişebileceği anketleri listeler (Admin: tümü, Creator: kendi oluşturdukları, Participant: hedeflenen aktif anketler).
- **Yetki:** `Bearer <token>`

### `POST /api/surveys`
Yeni bir anket taslağı oluşturur.
- **Yetki:** `admin`, `creator`
- **Request Body:**
```json
{
  "title": "2026 Müşteri Memnuniyeti Anketi",
  "description": "Yıllık kurumsal memnuniyet değerlendirmesi",
  "is_anonymous": false,
  "expires_at": "2026-12-31T23:59:59Z",
  "questions": [
    {
      "text": "Genel hizmet kalitemizi nasıl değerlendirirsiniz?",
      "type": "single",
      "category": "Hizmet Kalitesi",
      "order": 0,
      "is_required": true,
      "options": [
        { "text": "Çok İyi", "score": 10 },
        { "text": "İyi", "score": 8 },
        { "text": "Orta", "score": 5 },
        { "text": "Kötü", "score": 2 }
      ]
    },
    {
      "text": "Departman Değerlendirme Matrisi",
      "type": "matrix",
      "category": "Departmanlar",
      "order": 1,
      "is_required": true,
      "matrix_config": {
        "rows": ["Teknik Destek", "Müşteri Hizmetleri", "Satış Ekibi"],
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

### `GET /api/surveys/:id`
Anket detayını ve sorularını getirir (IDOR korumalı).
- **Yetki:** `admin`, `creator` (kendi anketi), `evaluator`/`participant` (atanmış anket).

### `PUT /api/surveys/:id`
Anket bilgilerini veya durumunu günceller (`draft`, `active`, `closed`, `archived`).
- **Yetki:** `admin`, `creator` (kendi anketi).

### `DELETE /api/surveys/:id`
Anketi siler (İlişkili sorular, hedefler ve yanıtlar cascade olarak silinir, Redis önbelleği temizlenir).
- **Yetki:** `admin`, `creator` (kendi anketi).

### `POST /api/surveys/:id/send`
Anketi seçilen katılımcılara çok kanallı (Email, SMS, WhatsApp) olarak gönderir.
- **Yetki:** `admin`, `creator` (Rate Limit: 30 req/1dk)
- **Request Body:**
```json
{
  "channels": ["email", "sms"],
  "target_users": ["uuid1", "uuid2"],
  "custom_message": "Lütfen anketimizi doldurunuz."
}
```

### `GET /api/surveys/:id/report`
Anketin özet metriklerini, kategori başarı barlarını ve katılımcı sıralamasını döner.
- **Yetki:** `admin`, `creator` (kendi anketi), `evaluator` (atanmış anket).
- **Önbellek:** Redis 300s TTL (Yanıt geldikçe otomatik geçersiz kılınır).

### `GET /api/surveys/:id/export-excel`
5 sayfalı sterilize edilmiş Excel analitik raporunu indirir.
- **Yetki:** `admin`, `creator` (kendi anketi), `evaluator` (atanmış anket).

---

## 3. Katılımcı Anket Doldurma (Responses)

### `GET /api/responses/survey/:token`
Tekil token ile anket sorularını çeker ve `opened_at` zaman damgasını işler.
- **Yetki:** Herkese açık (Geçerli token ile)

### `POST /api/responses/submit`
Anket yanıtlarını kaydeder ve anketi tamamlar (Single Submission Guard).
- **Yetki:** Herkese açık (Geçerli token ile)
- **Request Body:**
```json
{
  "token": "c6129849-7bca-4ea1-a86e-899922c338cb",
  "duration_seconds": 145,
  "answers": [
    {
      "question_id": "uuid-q1",
      "selected_options": ["Çok İyi"],
      "score": 10
    },
    {
      "question_id": "uuid-q2",
      "matrix_answers": {
        "Teknik Destek": "Mükemmel",
        "Müşteri Hizmetleri": "Mükemmel",
        "Satış Ekibi": "Orta"
      },
      "score": 13
    }
  ]
}
```

---

## 4. Sistem Ayarları ve Bildirim Testleri (Settings)

### `GET /api/settings`
Sistem ayarlarını döner (Hassas şifre ve API anahtarları `••••••••` olarak maskelenir).
- **Yetki:** `admin`

### `POST /api/settings`
Sistem ayarlarını günceller.
- **Yetki:** `admin`

### `POST /api/settings/test-email`
SMTP ayarlarını test eder.
- **Yetki:** `admin`

### `POST /api/settings/test-sms`
Nokta Bilişim SMS entegrasyonunu test eder.
- **Yetki:** `admin`

### `POST /api/settings/test-whatsapp`
WhatsApp Gateway entegrasyonunu test eder.
- **Yetki:** `admin`

---

## 5. Log ve İstatistikler (Logs)

### `GET /api/logs/stats`
Sistem geneli anket, kullanıcı ve günlük katılım istatistiklerini döner.
- **Yetki:** `admin`, `creator`

### `GET /api/ready`
Veritabanı bağlantı ve sağlık durumunu kontrol eder (Healthcheck).
- **Yetki:** Herkese açık
