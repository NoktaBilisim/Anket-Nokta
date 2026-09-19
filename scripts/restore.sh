#!/bin/bash
# ==============================================================================
# SurveyPro - Veritabanı Geri Yükleme (Disaster Recovery / Restore) Scripti
# Kullanım: bash scripts/restore.sh <yedek_dosyasi.sql.gz>
# ==============================================================================

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "HATA: Geri yüklenecek .sql.gz dosyasını belirtmelisiniz!"
  echo "Kullanım: bash $0 /opt/anket/backups/surveypro_db_YYYYMMDD_HHMMSS.sql.gz"
  exit 1
fi

BACKUP_FILE="$1"
POSTGRES_CONTAINER="surveypro_postgres"
DB_NAME="${DB_NAME:-surveypro}"
DB_USER="${DB_USER:-surveypro}"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "HATA: Yedek dosyası bulunamadı: $BACKUP_FILE" >&2
  exit 1
fi

echo "========================================================"
echo " UYARI: VERİTABANI GERİ YÜKLEME İŞLEMİ"
echo " Hedef Veritabanı: $DB_NAME"
echo " Kaynak Yedek:     $BACKUP_FILE"
echo " Bu işlem mevcut verilerin üzerine yazacaktır!"
echo "========================================================"
read -p "Devam etmek istediğinize emin misiniz? (evet/hayir): " CONFIRM

if [ "$CONFIRM" != "evet" ]; then
  echo "İşlem kullanıcı tarafından iptal edildi."
  exit 0
fi

echo "-> [1/3] PostgreSQL konteyner kontrol ediliyor..."
if ! docker ps --format '{{.Names}}' | grep -q "^${POSTGRES_CONTAINER}$"; then
  echo "HATA: $POSTGRES_CONTAINER konteyneri çalışır durumda değil!" >&2
  exit 1
fi

echo "-> [2/3] Yedek dosyası açılıyor ve veritabanına aktarılıyor..."
gunzip -c "$BACKUP_FILE" | docker exec -i "$POSTGRES_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME"

echo "-> [3/3] Bütünlük doğrulaması yapılıyor..."
USER_COUNT=$(docker exec -t "$POSTGRES_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT count(*) FROM users;" | tr -d '\r')
SURVEY_COUNT=$(docker exec -t "$POSTGRES_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT count(*) FROM surveys;" | tr -d '\r')

echo "========================================================"
echo " ✓ Geri Yükleme Başarıyla Tamamlandı!"
echo " Doğrulama Sonuçları:"
echo " - Toplam Kullanıcı Sayısı: $USER_COUNT"
echo " - Toplam Anket Sayısı:     $SURVEY_COUNT"
echo "========================================================"
