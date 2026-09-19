#!/bin/bash
# Uzak makinede seed çalıştırır
# Kullanım: bash seed-prod.sh

REMOTE_HOST="185.126.217.99"
REMOTE_USER="root"

echo "Seed çalıştırılıyor..."
ssh "$REMOTE_USER@$REMOTE_HOST" "
  docker exec surveypro_backend node -e \"
    process.env.NODE_ENV = 'development';
    require('./src/database/seed').seedDatabase()
      .then(() => { console.log('Seed OK'); process.exit(0); })
      .catch(e => { console.error('Seed HATA:', e.message); process.exit(1); });
  \"
"
echo "Tamamlandı."
