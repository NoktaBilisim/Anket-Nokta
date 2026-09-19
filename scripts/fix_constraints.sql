-- ==============================================================================
-- SurveyPro - Foreign Key & Constraint Temizleme / Doğrulama Scripti
-- Bu script eski alter:true kalıntısı sorunlu FK ve orphan kayıtları temizler
-- ==============================================================================

-- 1. activity_logs tablosundaki FK constraint'leri kaldır (Denetim izi için Sequelize loose join kullanır)
ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_survey_id_fkey;
ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey;

-- 2. Orphan kayıtları temizle (survey_id'si silinmiş survey'e işaret edenler)
DELETE FROM activity_logs
WHERE survey_id IS NOT NULL
  AND survey_id NOT IN (SELECT id FROM surveys);

-- 3. responses tablosunda geçersiz target_id kalıntılarını NULL yap
UPDATE responses
SET target_id = NULL
WHERE target_id IS NOT NULL
  AND target_id NOT IN (SELECT id FROM survey_targets);

-- 4. responses tablosunda geçersiz user_id kalıntılarını NULL yap
UPDATE responses
SET user_id = NULL
WHERE user_id IS NOT NULL
  AND user_id NOT IN (SELECT id FROM users);

SELECT 'Constraint ve veri temizliği başarıyla tamamlandı ✓' AS durum;
