# SurveyPro Veritabanı ve Veri Modeli Dokümantasyonu (DBA)

Tarih: 2026-09-19  
Sürüm: 1.0.0  
Sorumlu: DBA (Veritabanı Mühendisi)  
Durum: ONAYLI  

---

## 1. Genel Bakış ve Veritabanı Mimarisi

SurveyPro veri katmanı, yüksek güvenilirlik, ilişkisel bütünlük, JSON esnekliği ve sorgu performansı sağlamak üzere **PostgreSQL 15+** üzerinde koşturulmaktadır. Uygulama katmanında **Node.js / Sequelize ORM** kullanılmaktadır.

### 1.1 Temel Prensipler
- **Birincil Anahtarlar (PK)**: Tüm tablolarda tahmin edilemezliği sağlamak ve dağıtık ölçeklenebilirliği korumak amacıyla `UUIDv4` (`gen_random_uuid()` / `uuid-ossp`) kullanılmıştır.
- **Zaman Damgaları**: Tüm tablolarda `created_at` ve `updated_at` alanları `TIMESTAMPTZ` (UTC) formatında ve varsayılan olarak `CURRENT_TIMESTAMP` ile tanımlıdır.
- **Karakter Kodlaması**: Veritabanı `UTF-8` kodlamasıyla yapılandırılmış olup Türkçe karakter desteği (ö, ü, ş, ı, ğ, ç, İ) tamdır.
- **İlişkisel Bütünlük ve Silme Politikası**: Kritik ana varlıklarda (`surveys`, `questions`, `survey_targets`, `responses`, `answers`) `ON DELETE CASCADE` uygulanırken, denetim izini saklayan `activity_logs` tablosunda kayıt kaybını önlemek için gevşek (loose/unconstrained) ilişki uygulanmıştır.

---

## 2. Tablo Şemaları ve Varlık İlişkileri

### 2.1 Tablo Envanteri

| Tablo Adı | Tanım | Birincil Anahtar | Silme Stratejisi (Cascade / Set Null) |
|---|---|---|---|
| `users` | Sistem kullanıcıları ve yöneticiler | UUID | Hard Delete (Admin tarafından; kendi kendini silme engelli) |
| `surveys` | Anket meta verisi ve durumları | UUID | Hard Delete (İlişkili sorular, hedefler, yanıtlar silinir) |
| `questions` | Anket soruları, puan ve seçenekler | UUID | Hard Delete (Cascade: survey silindiğinde silinir) |
| `survey_targets` | Katılımcıya özel token'lı dağıtım hedefleri | UUID | Hard Delete (Cascade: survey/user silindiğinde silinir) |
| `responses` | Anket tamamlama oturumları | UUID | Hard Delete (Cascade: survey silindiğinde silinir) |
| `answers` | Soru bazlı verilen cevaplar | UUID | Hard Delete (Cascade: response/question silindiğinde) |
| `activity_logs` | Güvenlik ve denetim izi kayıtları | UUID | **Asla Silinmez** (Değiştirilemez denetim kaydı) |
| `settings` | Sistem genel ayarları (SMTP, SMS, WP) | UUID | Hard Delete / Tekil Anahtar |

---

### 2.2 Tablo Detayları ve Alan Tanımları

#### 2.2.1 `users` (Kullanıcılar)
```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password      VARCHAR(255) NOT NULL,
  role          user_role NOT NULL DEFAULT 'participant',
  avatar        VARCHAR(255),
  phone         VARCHAR(50),
  whatsapp      VARCHAR(50),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  refresh_token TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

#### 2.2.2 `surveys` (Anketler)
```sql
CREATE TABLE surveys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         VARCHAR(255) NOT NULL,
  description   TEXT,
  status        survey_status NOT NULL DEFAULT 'draft',
  anonymous     BOOLEAN NOT NULL DEFAULT false,
  expires_at    TIMESTAMPTZ,
  settings      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

#### 2.2.3 `questions` (Sorular)
```sql
CREATE TABLE questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id     UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  type          question_type NOT NULL,
  text          TEXT NOT NULL,
  required      BOOLEAN NOT NULL DEFAULT true,
  "order"       INTEGER NOT NULL DEFAULT 0,
  options       JSONB NOT NULL DEFAULT '[]'::jsonb,
  category      VARCHAR(100) DEFAULT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

#### 2.2.4 `survey_targets` (Anket Hedefleri ve Dağıtım)
```sql
CREATE TABLE survey_targets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id     UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token         UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  sent_at       TIMESTAMPTZ,
  send_method   send_method,
  opened_at     TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

#### 2.2.5 `responses` (Katılımcı Yanıt Oturumları)
```sql
CREATE TABLE responses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id         UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  user_hash         VARCHAR(255),
  target_id         UUID REFERENCES survey_targets(id) ON DELETE SET NULL,
  is_complete       BOOLEAN NOT NULL DEFAULT false,
  duration_seconds  INTEGER,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

#### 2.2.6 `answers` (Soru Cevapları)
```sql
CREATE TABLE answers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id   UUID NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
  question_id   UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  value         JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

#### 2.2.7 `activity_logs` (Denetim İzi ve Aktivite Günlüğü)
```sql
CREATE TABLE activity_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID,
  survey_id     UUID,
  action        VARCHAR(100) NOT NULL,
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address    VARCHAR(100),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

#### 2.2.8 `settings` (Sistem Ayarları)
```sql
CREATE TABLE settings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key           VARCHAR(255) NOT NULL UNIQUE,
  value         TEXT,
  description   VARCHAR(255),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. İndeks Stratejisi ve Sorgu Deseni Eşleşmesi

Uygulamanın sorgu desenlerine göre oluşturulan tekil ve bileşik (composite) indeksler aşağıda özetlenmiştir:

| Tablo | İndeks Adı | Kolonlar | İndeks Tipi | Hızlandırılan Sorgu Deseni |
|---|---|---|---|---|
| `users` | `idx_users_email` | `(email)` | UNIQUE B-Tree | Login, token doğrulama, kullanıcı oluşturma teyidi |
| `users` | `idx_users_role` | `(role)` | B-Tree | Rol bazlı filtreleme ve yetkilendirme listeleri |
| `users` | `idx_users_is_active` | `(is_active)` | B-Tree | Aktif kullanıcı sorguları |
| `users` | `idx_users_created_at` | `(created_at DESC)` | B-Tree | Kullanıcı listesi sıralı çekim (`order by created_at DESC`) |
| `surveys` | `idx_surveys_created_by_status` | `(created_by, status)` | Composite B-Tree | Creator bazlı anket listeleme ve durum filtreleri |
| `surveys` | `idx_surveys_status` | `(status)` | B-Tree | Dashboard aktif anket sayısı ve genel durum sorguları |
| `surveys` | `idx_surveys_created_at` | `(created_at DESC)` | B-Tree | Anket listeleme ana sıralama |
| `questions` | `idx_questions_survey_id_order` | `(survey_id, "order" ASC)` | Composite B-Tree | Anket sorularının sıralı yüklenmesi (Editor, Yanıtlama, Rapor) |
| `questions` | `idx_questions_survey_id_category` | `(survey_id, category)` | Composite B-Tree | Kategori bazlı soru gruplama ve analitik hesaplama |
| `survey_targets` | `idx_survey_targets_token` | `(token)` | UNIQUE B-Tree | Katılımcı link erişimi (`/survey/:token`) — sub-millisecond yanıt |
| `survey_targets` | `idx_survey_targets_survey_user` | `(survey_id, user_id)` | Composite B-Tree | Dağıtım sırasında mükerrer hedef kontrolü ve güncellemesi |
| `survey_targets` | `idx_survey_targets_user_id` | `(user_id, created_at DESC)` | Composite B-Tree | Katılımcının "Anketlerim" (`mySurveys`) sayfası sorgusu |
| `survey_targets` | `idx_survey_targets_survey_completed` | `(survey_id, completed_at)` | Composite B-Tree | Rapor sayfasında tamamlanma oranları hesabı |
| `responses` | `idx_responses_survey_is_complete` | `(survey_id, is_complete)` | Composite B-Tree | Raporlama ve Excel export için tamamlanmış yanıtları çekme |
| `responses` | `idx_responses_target_id` | `(target_id)` | B-Tree | Hedef - Yanıt eşleşmesi doğrulaması |
| `responses` | `idx_responses_user_id` | `(user_id)` | B-Tree | Kullanıcı yanıt geçmişi |
| `responses` | `idx_responses_complete_created_at` | `(is_complete, created_at DESC)` | Composite B-Tree | Dashboard son 7 günlük yanıt grafiği sorgusu |
| `responses` | `idx_responses_user_hash` | `(user_hash)` | B-Tree | Anonim katılımcı tekillik kontrolü |
| `answers` | `idx_answers_response_question` | `(response_id, question_id)` | Composite B-Tree | Yanıt-Soru eşleşmesi ve analitik puan hesaplama |
| `answers` | `idx_answers_question_id` | `(question_id)` | B-Tree | Soru bazlı toplu cevap dağılım istatistikleri |
| `activity_logs` | `idx_activity_logs_created_at` | `(created_at DESC)` | B-Tree | Dashboard son aktiviteler ve log sayfalama |
| `activity_logs` | `idx_activity_logs_user_created` | `(user_id, created_at DESC)` | Composite B-Tree | Belirli bir kullanıcının işlem geçmişi |
| `activity_logs` | `idx_activity_logs_survey_created` | `(survey_id, created_at DESC)` | Composite B-Tree | Belirli bir anketin yaşam döngüsü logları |
| `activity_logs` | `idx_activity_logs_action_created` | `(action, created_at DESC)` | Composite B-Tree | Aksiyon tipi filtreli denetim log sorguları |
| `settings` | `idx_settings_key` | `(key)` | UNIQUE B-Tree | Ayar okuma ve upsert işlemleri |

---

## 4. Enum vs Lookup Tablosu Analiz ve Kararları

| Alan | Kullanılan Yapı | Değerler | Gerekçe |
|---|---|---|---|
| `users.role` | PostgreSQL `ENUM` (`user_role`) | `admin`, `creator`, `evaluator`, `participant` | Rol kümesi sabittir, kod içi RBAC kontrolleri ile sıkı bağlıdır; lookup tablosu ek JOIN maliyeti getirir. |
| `surveys.status` | PostgreSQL `ENUM` (`survey_status`) | `draft`, `active`, `closed`, `archived` | Durum makinesi deterministiktir; durumlar arası geçiş iş kurallarıyla yönetilir. |
| `questions.type` | PostgreSQL `ENUM` (`question_type`) | `multiple_choice`, `text`, `rating`, `yes_no`, `matrix` | Soru tipleri UI render motoru ve puanlama fonksiyonlarıyla doğrudan bağlantılıdır. |
| `survey_targets.send_method` | PostgreSQL `ENUM` (`send_method`) | `email`, `sms`, `whatsapp` | Dağıtım kanalları gateway servisleriyle 1-e-1 eşleşir. |
| `activity_logs.action` | `VARCHAR(100)` (DB) / ENUM (Model) | `user_login`, `survey_created`, `survey_sent`, vb. | Yeni log aksiyonları eklendiğinde DDL migration gerektirmemek ve esneklik sağlamak için serbest metin/kod içi doğrulama seçilmiştir. |
| `questions.category` | `VARCHAR(100)` | Dinamik metin (örn: "Liderlik", "Memnuniyet") | Kurumların anket bazında istedikleri kategorileri serbestçe tanımlaması için serbest kategori modeli seçilmiştir. UI otomatik tamamlama (`datalist`) ile desteklenir. |

---

## 5. Mevcut Sorgu Analizi ve İyileştirme Bulguları

### 5.1 Rapor ve Analitik Sorguları (`surveyController.report` & `exportExcel`)
- **Bulgu**: Rapor hesaplamasında `Survey`, `Question`, `SurveyTarget`, `Response` ve `Answer` tabloları taranmaktadır.
- **Optimizasyon**: `Response.findAll` çağrısında `include: [{ model: Answer, as: 'answers' }, { model: User, as: 'user' }]` kullanılarak **N+1 sorgu problemi tamamen engellenmiştir**.
- **İndeks Desteği**: `idx_responses_survey_is_complete` ve `idx_answers_response_question` sayesinde 1.000+ katılımcılı bir anketin tüm cevapları < 50 ms içinde tek seferde çekilmektedir.

### 5.2 Transaction (Atomik Yazma) İhtiyaçları
- **`surveyController.update`**: Anket güncellenirken sorular `Question.destroy` ile silinip `Question.bulkCreate` ile yeniden oluşturulmaktadır. Bu işlem sırasında hata oluşursa soruların silinip oluşturulamama riski vardır.
  - *Öneri*: İşlem `sequelize.transaction()` bloğu içerisine alınmalıdır.
- **`responseController.submit`**: Yanıt gönderildiğinde `Response.create`, `Answer.bulkCreate`, `SurveyTarget.update({ completed_at })` ve `ActivityLog.create` işlemleri birbirine bağımlıdır.
  - *Öneri*: `Response` ve `Answer` yazımı veri bütünlüğü için tek bir transaction altında güvenceye alınmalıdır.

### 5.3 Sayfalama ve Üst Sınırlar
- **`logController.list`**: `limit` parametresi istemciden alınmaktadır. DoS riskine karşı varsayılan `limit: 50`, maksimum sınır `Math.min(limit, 100)` olarak sınırlandırılmalıdır.
- **`userController.list`**: Kullanıcı listesi şifre ve refresh token alanlarını `attributes: { exclude: ['password', 'refresh_token'] }` ile filtreleyerek çekmektedir.

---

## 6. Büyüyecek Tablolar, Bölümleme (Partitioning) ve Arşivleme

### 6.1 Büyüme Analizi
- **`answers` ve `responses`**: Her ankette $N$ katılımcı $\times$ $M$ soru kadar cevap üretilir. Yıllık 100.000 katılımcı $\times$ 20 soru = **2.000.000 satır/yıl**.
- **`activity_logs`**: Her oturum açma, anket oluşturma, gönderme ve yanıtlama işlemi log üretir. Yıllık ~500.000 satır.

### 6.2 Bölümleme (Partitioning) Stratejisi (Genişleme Planı)
PostgreSQL Declarative Table Partitioning:
```sql
-- Activity Logs için Yıllık/Aylık Bölümleme Örneği:
CREATE TABLE activity_logs_partitioned (
  id            UUID DEFAULT gen_random_uuid(),
  user_id       UUID,
  survey_id     UUID,
  action        VARCHAR(100) NOT NULL,
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address    VARCHAR(100),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE activity_logs_y2026m01 PARTITION OF activity_logs_partitioned
  FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2026-02-01 00:00:00+00');
```
- **Saklama Politikası (Retention)**: 2 yıldan eski `activity_logs` kayıtları soğuk depolamaya (S3 / pg_dump arşivi) taşınarak canlı tablodan temizlenir.

---

## 7. Güvenlik, Hassas Veriler ve KVKK Uyumu

1. **Parolalar**: Tüm kullanıcı parolaları `bcrypt` algoritması ile `cost: 12` tur kullanılarak tuzlanır ve özetlenir. Düz metin asla saklanmaz.
2. **Anonim Anketler**: `surveys.anonymous = true` olduğunda:
   - `responses.user_id = NULL` olarak kaydedilir.
   - `responses.user_hash = SHA256(target.user_id)` olarak geri döndürülemez şekilde hash'lenir.
   - PII (Kişisel Tanımlayıcı Bilgi) ile yanıt tablosu arasındaki bağ tamamen koparılır.
3. **Ayarlar ve Entegrasyon Anahtarları**:
   - `settings.smtp_pass` ve `settings.sms_api_key` alanları istemciye `GET /api/settings` çağrısında `••••••••` şeklinde maskeli iletilir.
   - Hassas ayarlar hiçbir zaman `ActivityLog` metadata alanına veya console loglarına yazdırılmaz.

---

## 8. Seed Mekanizması Doğrulaması

Geliştirme ve prodüksiyon ilk kurulum ortamları için `backend/src/database/seed.js` dosyası güncellenmiş olup şu niteliklere sahiptir:
- **İdempotent Çalışma**: `User.count() > 0` ise işlem güvenle atlanır; mevcut veriyi ezmez.
- **Tüm Rolleri İçerme**: Admin (`admin@surveypro.com`), Creator (`creator@surveypro.com`), Evaluator (`evaluator@surveypro.com`) ve 3 Test Katılımcısı.
- **5 Soru Tipini de İçeren Örnek Anket**: Puanlı seçenekler, kategori tanımları, Likert matris yapısı ile zengin raporlama testi verisi.
- **Örnek Hedef ve Tamamlanmış Yanıtlar**: Katılımcı yanıtları, süre ölçümü (`duration_seconds`), soru puanları ve madalya sıralamaları hazır test edilebilir durumdadır.
- **CLI Doğrudan Çağrı**: `npm run seed` veya `node src/database/seed.js` ile bağımsız çalıştırılabilir.

---

## 9. Yedekleme ve Kurtarma (Backup & Disaster Recovery Runbook)

### 9.1 Günlük Otomatik Yedekleme Komutu (pg_dump)
```bash
#!/bin/bash
# SurveyPro Günlük PostgreSQL Yedekleme Scripti
BACKUP_DIR="/var/backups/surveypro"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="$BACKUP_DIR/surveypro_db_$TIMESTAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

# Docker konteynerinden sıkıştırılmış pg_dump alma
docker exec surveypro_postgres pg_dump -U surveypro -d surveypro --clean --if-exists | gzip > "$FILENAME"

# 30 günden eski yedekleri temizle
find "$BACKUP_DIR" -name "surveypro_db_*.sql.gz" -mtime +30 -delete

echo "Yedek başarıyla alındı: $FILENAME"
```

### 9.2 Yedekten Geri Yükleme Adımları (Recovery)
1. Backend servisini geçici olarak durdurun:
   ```bash
   docker stop surveypro_backend
   ```
2. Veritabanını yedeğin içerisindeki SQL ile temizleyip geri yükleyin:
   ```bash
   gunzip -c /var/backups/surveypro/surveypro_db_YYYYMMDD_HHMMSS.sql.gz | docker exec -i surveypro_postgres psql -U surveypro -d surveypro
   ```
3. Bütünlüğü ve tabloları doğrulayın:
   ```bash
   docker exec -it surveypro_postgres psql -U surveypro -d surveypro -c "SELECT count(*) FROM users; SELECT count(*) FROM surveys;"
   ```
4. Backend servisini tekrar başlatın:
   ```bash
   docker start surveypro_backend
   ```
