#!/bin/bash
# ─────────────────────────────────────────────────────────────
# SurveyPro — Uzak Makine Kurulum Scripti
# Hedef: 192.168.2.160  |  Konum: /uygulamalar/anket
# Kullanım: bash deploy.sh
# ─────────────────────────────────────────────────────────────

set -e

REMOTE_HOST="192.168.2.160"
REMOTE_USER="desikimya"           # gerekirse değiştir (ubuntu, admin vb.)
REMOTE_DIR="/uygulamalar/anket"
LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " SurveyPro → $REMOTE_HOST"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Uzak makinede dizin oluştur
echo "[1/5] Uzak dizin hazırlanıyor..."
ssh "$REMOTE_USER@$REMOTE_HOST" "mkdir -p $REMOTE_DIR"

# 2. Proje dosyalarını kopyala (node_modules ve .git hariç)
echo "[2/5] Dosyalar aktarılıyor..."
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'frontend/node_modules' \
  --exclude 'backend/node_modules' \
  --exclude '.env' \
  "$LOCAL_DIR/" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/"

# 3. Production .env dosyasını kopyala
echo "[3/5] .env.prod → .env olarak aktarılıyor..."
scp "$LOCAL_DIR/.env.prod" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/.env"

# 4. Uzak makinede Docker Compose başlat
echo "[4/5] Docker build ve başlatma..."
ssh "$REMOTE_USER@$REMOTE_HOST" "
  cd $REMOTE_DIR
  docker compose -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true
  docker compose -f docker-compose.prod.yml up --build -d
"

# 5. Durum kontrolü
echo "[5/5] Kontrol ediliyor..."
sleep 5
ssh "$REMOTE_USER@$REMOTE_HOST" "
  echo ''
  echo '── Container Durumları ──'
  docker compose -f $REMOTE_DIR/docker-compose.prod.yml ps
"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " ✓ Kurulum tamamlandı!"
echo " → http://$REMOTE_HOST"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
