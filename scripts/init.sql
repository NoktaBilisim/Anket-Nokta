-- ==============================================================================
-- SurveyPro - PostgreSQL Veritabanı Başlangıç Şeması ve İndeks Tanımları
-- Sürüm: 1.0.0
-- Uyumluluk: PostgreSQL 14+ (Önerilen: 15 / 16)
-- ==============================================================================

-- 1. Eklentiler (UUID ve Kriptografi)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Özel Tipler / ENUM Tanımları (İdempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'creator', 'evaluator', 'participant');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'survey_status') THEN
    CREATE TYPE survey_status AS ENUM ('draft', 'active', 'closed', 'archived');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_type') THEN
    CREATE TYPE question_type AS ENUM ('multiple_choice', 'text', 'rating', 'yes_no', 'matrix');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'send_method') THEN
    CREATE TYPE send_method AS ENUM ('email', 'sms', 'whatsapp');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'log_action') THEN
    CREATE TYPE log_action AS ENUM (
      'user_login', 'user_logout', 'user_created', 'user_updated', 'user_deleted',
      'survey_created', 'survey_updated', 'survey_deleted', 'survey_sent', 'survey_completed',
      'response_submitted'
    );
  END IF;
END $$;

-- 3. Tablolar

-- 3.1 Kullanıcılar Tablosu
CREATE TABLE IF NOT EXISTS users (
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

-- 3.2 Anketler Tablosu
CREATE TABLE IF NOT EXISTS surveys (
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

-- 3.3 Sorular Tablosu
CREATE TABLE IF NOT EXISTS questions (
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

-- 3.4 Anket Hedefleri / Gönderimler Tablosu
CREATE TABLE IF NOT EXISTS survey_targets (
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

-- 3.5 Yanıt Oturumları Tablosu
CREATE TABLE IF NOT EXISTS responses (
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

-- 3.6 Soru Cevapları Tablosu
CREATE TABLE IF NOT EXISTS answers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id   UUID NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
  question_id   UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  value         JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3.7 Aktivite ve Denetim İzi Logları Tablosu (FK kısıtları kasıtlı olarak loose tutulur)
CREATE TABLE IF NOT EXISTS activity_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID,
  survey_id     UUID,
  action        VARCHAR(100) NOT NULL,
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address    VARCHAR(100),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3.8 Sistem Ayarları Tablosu
CREATE TABLE IF NOT EXISTS settings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key           VARCHAR(255) NOT NULL UNIQUE,
  value         TEXT,
  description   VARCHAR(255),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bileşik ve Tekil İndeksler (Sorgu Performans Optimizasyonları)

-- 4.1 Users İndeksleri
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- 4.2 Surveys İndeksleri
CREATE INDEX IF NOT EXISTS idx_surveys_created_by_status ON surveys(created_by, status);
CREATE INDEX IF NOT EXISTS idx_surveys_status ON surveys(status);
CREATE INDEX IF NOT EXISTS idx_surveys_created_at ON surveys(created_at DESC);

-- 4.3 Questions İndeksleri
CREATE INDEX IF NOT EXISTS idx_questions_survey_id_order ON questions(survey_id, "order" ASC);
CREATE INDEX IF NOT EXISTS idx_questions_survey_id_category ON questions(survey_id, category);

-- 4.4 SurveyTargets İndeksleri
CREATE UNIQUE INDEX IF NOT EXISTS idx_survey_targets_token ON survey_targets(token);
CREATE INDEX IF NOT EXISTS idx_survey_targets_survey_user ON survey_targets(survey_id, user_id);
CREATE INDEX IF NOT EXISTS idx_survey_targets_user_id ON survey_targets(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_survey_targets_survey_completed ON survey_targets(survey_id, completed_at);

-- 4.5 Responses İndeksleri
CREATE INDEX IF NOT EXISTS idx_responses_survey_is_complete ON responses(survey_id, is_complete);
CREATE INDEX IF NOT EXISTS idx_responses_target_id ON responses(target_id);
CREATE INDEX IF NOT EXISTS idx_responses_user_id ON responses(user_id);
CREATE INDEX IF NOT EXISTS idx_responses_complete_created_at ON responses(is_complete, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_responses_user_hash ON responses(user_hash);

-- 4.6 Answers İndeksleri
CREATE INDEX IF NOT EXISTS idx_answers_response_question ON answers(response_id, question_id);
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);

-- 4.7 ActivityLogs İndeksleri
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created ON activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_survey_created ON activity_logs(survey_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_created ON activity_logs(action, created_at DESC);

-- 4.8 Settings İndeksleri
CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- 5. Başlangıç Sistem ve Marka Ayarları (İdempotent Seed)
INSERT INTO settings (id, key, value, description, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'app_logo', '', 'Özel kurumsal logo dosya yolu', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'app_title', 'SurveyPro', 'Uygulama ve sistem başlığı', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'site_url', 'http://localhost:3000', 'Uygulama genel web adresi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'smtp_host', 'smtp.gmail.com', 'SMTP sunucu adresi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'smtp_port', '587', 'SMTP port numarası', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'smtp_user', '', 'SMTP kullanıcı adı / e-posta', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'smtp_pass', '', 'SMTP parolası', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'smtp_ssl', 'false', 'SMTP SSL / TLS kullanımı', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'smtp_auth', 'true', 'SMTP kimlik doğrulama', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'smtp_from_name', 'SurveyPro Kurumsal', 'E-posta gönderici başlığı', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'smtp_from_email', 'noreply@surveypro.com', 'E-posta gönderici adresi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'sms_api_url', 'http://smsportal.noktabilisim.net:3001', 'Nokta Bilişim SMS Gateway API', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'sms_api_key', '', 'SMS Gateway API Anahtarı', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'sms_header', 'NOKTABLSM', 'SMS Başlık (Originator)', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'whatsapp_api_url', 'http://whatsapp.noktabilisim.net:3000/send-message', 'Nokta Bilişim WhatsApp API', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (key) DO NOTHING;
