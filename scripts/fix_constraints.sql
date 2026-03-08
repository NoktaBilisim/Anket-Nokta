-- Bozuk foreign key constraint'leri temizle
-- Bu script eski alter:true'dan kalan sorunlu FK'ları kaldırır

-- activity_logs tablosundaki FK constraint'leri kaldır (Sequelize kendi join'larını yönetir)
ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_survey_id_fkey;
ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey;

-- Orphan kayıtları temizle (survey_id'si silinmiş survey'e işaret edenler)
DELETE FROM activity_logs 
WHERE survey_id IS NOT NULL 
  AND survey_id NOT IN (SELECT id FROM surveys);

SELECT 'Temizlendi ✓' as durum;
