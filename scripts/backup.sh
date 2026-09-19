#!/bin/bash
# ==============================================================================
# SurveyPro - Otomatik Veritabanı ve Redis Yedekleme Scripti
# Kullanım: bash scripts/backup.sh [yedek_dizini]
# Cron Örneği: 0 3 * * * /opt/anket/scripts/backup.sh /opt/anket/backups >> /var/log/surveypro_backup.log 2>&1
# ==============================================================================

set -euo pipefail

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="${1:-/opt/anket/backups}"
RETENTION_DAYS=14

# Konteyner adları
POSTGRES_CONTAINER="surveypro_postgres"
REDIS_CONTAINER="surveypro_redis"
DB_NAME="${DB_NAME:-surveypro}"
DB_USER="${DB_USER:-surveypro}"

echo "========================================================"
echo " [$(date +"%Y-%m-%d %H:%M:%S")] Yedekleme Başlatılıyor..."
echo " Hedef Dizin: $BACKUP_DIR"
echo "========================================================"

mkdir -p "$BACKUP_DIR"

# 1. PostgreSQL Yedekleme (pg_dump + gzip)
PG_DUMP_FILE="$BACKUP_DIR/surveypro_db_${TIMESTAMP}.sql.gz"
echo "-> [1/3] PostgreSQL veritabanı yedekleniyor: $PG_DUMP_FILE"

if docker ps --format '{{.Names}}' | grep -q "^${POSTGRES_CONTAINER}$"; then
  docker exec -t "$POSTGRES_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-exists --no-owner | gzip > "$PG_DUMP_FILE"
  echo "✓ PostgreSQL yedeği tamamlandı. Boyut: $(du -sh "$PG_DUMP_FILE" | cut -f1)"
else
  echo "HATA: $POSTGRES_CONTAINER konteyneri çalışır durumda değil!" >&2
  exit 1
fi

# 2. Redis RDB Snapshot Yedeği
REDIS_DUMP_FILE="$BACKUP_DIR/surveypro_redis_${TIMESTAMP}.rdb"
echo "-> [2/3] Redis bellek yedeği alınıyor: $REDIS_DUMP_FILE"

if docker ps --format '{{.Names}}' | grep -q "^${REDIS_CONTAINER}$"; then
  docker exec "$REDIS_CONTAINER" redis-cli bgsave || true
  sleep 2
  docker cp "$REDIS_CONTAINER":/data/dump.rdb "$REDIS_DUMP_FILE" 2>/dev/null || echo "Bilgi: Redis dump.rdb henüz oluşmamış olabilir (bellek boş)."
  if [ -f "$REDIS_DUMP_FILE" ]; then
    gzip -f "$REDIS_DUMP_FILE"
    echo "✓ Redis yedeği tamamlandı. Boyut: $(du -sh "${REDIS_DUMP_FILE}.gz" | cut -f1)"
  fi
else
  echo "Uyarı: $REDIS_CONTAINER çalışmıyor, Redis yedeği atlandı."
fi

# 3. Eski Yedekleri Temizle (Retention)
echo "-> [3/3] $RETENTION_DAYS günden eski yedekler temizleniyor..."
find "$BACKUP_DIR" -name "surveypro_db_*.sql.gz" -type f -mtime +"$RETENTION_DAYS" -exec rm -f {} \;
find "$BACKUP_DIR" -name "surveypro_redis_*.rdb.gz" -type f -mtime +"$RETENTION_DAYS" -exec rm -f {} \;

echo "========================================================"
echo " [$(date +"%Y-%m-%d %H:%M:%S")] Yedekleme Başarıyla Tamamlandı!"
echo "========================================================"
