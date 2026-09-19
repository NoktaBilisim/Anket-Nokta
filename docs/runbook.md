# SurveyPro — Operasyon ve SRE İşletim Rehberi (Runbook)

**Sistem:** SurveyPro (Kurumsal Anket Yönetim Platformu)  
**Hedef Sunucu:** `185.126.217.99` (Ubuntu 24.04, Hostname: `develop`)  
**Yayın Portu:** 4466/TCP (Host Nginx → Konteyner Nginx 80)  
**Üretim URL:** [https://anket.noktabilisim.net](https://anket.noktabilisim.net)  
**Sunucu Çalışma Dizini:** `/opt/anket`  
**Sürüm:** 1.0.0  
**Tarih:** 2026-09-19  

---

## 1. Sistem Mimarisi ve Port / Ağ Haritası

```
                                  [ Dış Dünya / İstemciler ]
                                              │
                                              ▼
                               [ Host Nginx (185.126.217.99) ]
                                              │ (Port :4466, SSL/TLS, HSTS)
                                              ▼
                ┌───────────────────────────────────────────────────────────┐
                │ Docker Ağı (surveypro_default - Bridge)                   │
                │                                                           │
                │  ┌─────────────────────────┐   location /api              │
                │  │ surveypro_frontend      │ ─────────────────┐           │
                │  │ (Nginx 1.25 Alpine)     │                  │           │
                │  │ Port :80 (İç Ağ)        │                  │           │
                │  └─────────────────────────┘                  ▼           │
                │                                 ┌──────────────────────┐  │
                │                                 │ surveypro_backend    │  │
                │                                 │ (Node.js 20 Express) │  │
                │                                 │ Port :5001 (İç Ağ)   │  │
                │                                 └──────────┬───────────┘  │
                │                                            │              │
                │                    ┌───────────────────────┴──────────┐   │
                │                    ▼                                  ▼   │
                │      ┌─────────────────────────┐        ┌─────────────┴┐  │
                │      │ surveypro_postgres      │        │ surveypro_   │  │
                │      │ (PostgreSQL 15 Alpine)  │        │ redis (7)    │  │
                │      │ Port :5432 (İç Ağ)      │        │ :6379 (İç)   │  │
                │      └─────────────────────────┘        └──────────────┘  │
                └───────────────────────────────────────────────────────────┘
```

### 1.1 Konteyner ve Port Özeti

| Servis Adı | Konteyner Adı | İmaj | İç Port | Host Port | İzolasyon Durumu |
|---|---|---|---|---|---|
| **Frontend** | `surveypro_frontend` | `nginx:alpine` (Vite build) | 80 | **4466** | Host Nginx üzerinden erişilir, doğrudan dışa kapalıdır |
| **Backend** | `surveypro_backend` | `node:20-alpine` | 5001 | Yok | Sadece Docker köprü (bridge) ağında erişilebilir |
| **PostgreSQL**| `surveypro_postgres` | `postgres:15-alpine` | 5432 | Yok | Sadece Docker köprü ağında erişilebilir |
| **Redis** | `surveypro_redis` | `redis:7-alpine` | 6379 | Yok | Sadece Docker köprü ağında erişilebilir |

---

## 2. Hızlı Başlangıç ve Tek Komutla Kurulum

### 2.1 Yerel Geliştirme Ortamı (Local Dev)

Yerel geliştirme ortamında tek komutla tüm bağımlılıklar ve servisler ayağa kaldırılır:

```bash
# 1. Proje kök dizininde ortam dosyasını oluşturun
cp .env.example .env

# 2. Docker compose ile tüm stack'i başlatın
docker compose up -d

# 3. Logları canlı takip edin
docker compose logs -f
```

- **Frontend:** `http://localhost:3000`
- **Backend API:** `http://localhost:5001/api`
- **PgAdmin:** `http://localhost:5050` (Kullanıcı: `admin@surveypro.com`, Şifre: `admin123`)

### 2.2 Üretim Ortamı (Production Kurulumu)

Üretim sunucusunda (`185.126.217.99`) `/opt/anket` dizininde:

```bash
# Yerel geliştirici makinesinden dağıtım için:
bash deploy.sh

# Veya sunucu içine SSH ile bağlanıp başlatmak için:
ssh root@185.126.217.99
cd /opt/anket
docker compose -f docker-compose.prod.yml up -d --build
```

### 2.3 Tohum Verisi (Seed Data) Yükleme

İlk kurulumda varsayılan sistem yöneticisi, örnek anketler ve ayarları yüklemek için:

```bash
# Prod sunucusunda güvenli seed:
bash seed-prod.sh

# Veya doğrudan konteyner içinde:
docker exec surveypro_backend npm run seed
```

---

## 3. Ortam Değişkenleri, Gizli Bilgi Yönetimi ve Rotasyon (Secrets Management)

### 3.1 Ortam Değişkenleri Listesi

| Değişken | Açıklama | Örnek / Varsayılan | Zorunluluk |
|---|---|---|---|
| `NODE_ENV` | Çalışma modu (`development` / `production` / `test`) | `production` | Zorunlu |
| `PORT` | Backend dinleme portu | `5001` | Zorunlu |
| `FRONTEND_URL` | CORS ve anket linki kök URL | `https://anket.noktabilisim.net` | Zorunlu |
| `DB_HOST` | PostgreSQL konteyner host adı | `postgres` | Zorunlu |
| `DB_PORT` | PostgreSQL dinleme portu | `5432` | Zorunlu |
| `DB_NAME` | Veritabanı adı | `surveypro` | Zorunlu |
| `DB_USER` | Veritabanı kullanıcısı | `surveypro` | Zorunlu |
| `DB_PASSWORD` | Veritabanı güçlü parolası | *(Gizli parola)* | Zorunlu |
| `REDIS_HOST` | Redis sunucu host adı | `redis` | Zorunlu |
| `REDIS_PORT` | Redis port numarası | `6379` | Zorunlu |
| `JWT_SECRET` | 15 dk Access Token imzalama anahtarı (min 64 karakter) | *(openssl rand -hex 64)* | Zorunlu |
| `JWT_REFRESH_SECRET` | 7 gün Refresh Token imzalama anahtarı | *(openssl rand -hex 64)* | Zorunlu |
| `JWT_EXPIRES_IN` | Access token ömrü | `15m` | Opsiyonel |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token ömrü | `7d` | Opsiyonel |
| `SMS_API_URL` | Nokta Bilişim SMS Gateway API URL | `http://smsportal.noktabilisim.net:3001` | SMS için |
| `SMS_API_KEY` | Nokta Bilişim SMS API anahtarı | *(Gizli API anahtarı)* | SMS için |
| `SMS_HEADER` | SMS başlığı (Originator) | `NOKTABLSM` | SMS için |
| `WHATSAPP_API_URL` | Nokta Bilişim WhatsApp Gateway URL | `http://whatsapp.noktabilisim.net:3000/send-message` | WhatsApp için |
| `SMTP_HOST` | E-posta SMTP sunucu adresi | `smtp.kurumunuz.com` | E-posta için |
| `SMTP_PORT` | SMTP port numarası | `587` | E-posta için |
| `SMTP_USER` | SMTP kullanıcı adı / e-posta | `bildirim@kurumunuz.com` | E-posta için |
| `SMTP_PASS` | SMTP parolası | *(Gizli parola)* | E-posta için |

### 3.2 Gizli Bilgi İzolasyonu ve Sunucu Dosya İzinleri

- `.env` ve `.env.prod` dosyaları **asla Git deposuna commit edilmez**; `.gitignore` tarafından yok sayılır ve git index'inden tamamen çıkarılmıştır (`git rm --cached`).
- Sunucudaki `.env` dosyasının izinleri yalnızca root kullanıcısına özel sınırlandırılmalıdır:
  ```bash
  chmod 600 /opt/anket/.env
  chown root:root /opt/anket/.env
  ```
- Kod ve seed scriptlerinde (`seed.js`, `settingsService.js`) hiçbir API anahtarı veya parola hardcoded bırakılmamıştır. Tüm değerler ortam değişkenlerinden (`process.env`) okunur.
- API yanıtlarında `smtp_pass` ve `sms_api_key` gibi hassas ayar değerleri `••••••••` şeklinde maskelenerek istemciye döner.

### 3.3 Güvenlik ve Gizli Anahtar Rotasyon Prosedürü (Secrets Rotation Drill)

Herhangi bir anahtarın sızması veya periyodik güvenlik gereği anahtar yenileme adımları:

#### 3.3.1 JWT Secret Anahtarlarını Rotasyona Tabi Tutma
1. Yeni kriptografik anahtarlar üretin:
   ```bash
   NEW_JWT_SECRET=$(openssl rand -hex 64)
   NEW_REFRESH_SECRET=$(openssl rand -hex 64)
   echo "JWT_SECRET: $NEW_JWT_SECRET"
   echo "JWT_REFRESH_SECRET: $NEW_REFRESH_SECRET"
   ```
2. Sunucu üzerindeki `/opt/anket/.env` dosyasında `JWT_SECRET` ve `JWT_REFRESH_SECRET` değerlerini güncelleyin.
3. Backend servisini sıfır kesintiyle yeniden başlatın:
   ```bash
   docker compose -f /opt/anket/docker-compose.prod.yml restart backend
   ```
4. *Not:* JWT anahtarı değiştiğinde mevcut tüm aktif kullanıcı oturumları güvenli bir şekilde düşürülür; kullanıcılar yeniden giriş yaparak yeni geçerli token alır.

#### 3.3.2 SMS Gateway API Anahtarını Yenileme
1. SMS servis sağlayıcı panelinden yeni SMS API anahtarı temin edin.
2. `/opt/anket/.env` dosyasında `SMS_API_KEY` değerini güncelleyin.
3. Veritabanındaki `settings` tablosunda saklanan değeri güncelleyin:
   ```bash
   docker exec -it surveypro_postgres psql -U surveypro -d surveypro -c \
     "UPDATE settings SET value = 'YENI_SMS_API_KEY' WHERE key = 'sms_api_key';"
   ```
4. Backend konteynerini yeniden başlatın (`docker compose restart backend`).

---

## 4. Dağıtım (Deploy) ve Rollback Prosedürleri

### 4.1 Standart Dağıtım (Deploy Flow)

1. **Yerel Testlerin Çalıştırılması:**
   ```bash
   cd /Users/mennan/Projeler/anket/backend && npm test
   cd /Users/mennan/Projeler/anket/frontend && npm run build
   ```
2. **Sunucuya Aktarım (`deploy.sh`):**
   ```bash
   bash deploy.sh
   ```
   Bu script:
   - `rsync` ile kaynak kodları sunucuya aktarır (`.git`, `node_modules`, `.env` hariç).
   - Sunucudaki `.env` dosyasının bütünlüğünü korur.
   - `docker compose -f docker-compose.prod.yml up --build -d` ile konteynerları günceller.
   - Sağlık kontrollerini (`/api/health`, `/api/ready`) otomatik doğrular.

### 4.2 CI/CD Pipeline (GitHub Actions)

`.github/workflows/ci.yml` iş akışı:
- `Lint & Syntax Check`: Node 20 ortamında kod sözdizimi ve birim testler.
- `Frontend Vite Build`: SPA üretim derlemesi (`dist/index.html` doğrulaması).
- `Security & Secret Scan`: Git gizli anahtar taraması ve `npm audit --audit-level=critical`.
- `Docker Image Build Validation`: Konteyner imajlarının derlenebilirlik testi.
- `Deploy to Production`: `main` dalına gelen değişikliklerde SSH üzerinden otomatik tetikleme.

### 4.3 Acil Durum Geri Alma (Rollback Prosedürü)

Hatalı bir dağıtım sonrasında sisteme müdahale sırası:

#### Adım 1: Önceki Kararlı Sürüme Dönüş
```bash
ssh root@185.126.217.99
cd /opt/anket

# Commit geçmişinden önceki kararlı hash'i belirleyin:
git log --oneline -n 5

# Sürümü geri alın:
git checkout <ONCEKI_COMMIT_HASH>
```

#### Adım 2: Konteynerları Yeniden Derleyin ve Başlatın
```bash
docker compose -f docker-compose.prod.yml up --build -d
```

#### Adım 3: Sağlık Durumunu Doğrulayın
```bash
# Konteyner durumları
docker compose -f docker-compose.prod.yml ps

# Uç nokta doğrulamaları
curl -i http://localhost:4466/api/health
curl -i http://localhost:4466/api/ready
```
Beklenen yanıt: HTTP 200 `{"status":"ready","database":"connected"}`.

---

## 5. Sağlık Uçları, Servis Çökmesi ve Otomatik Kurtarma Senaryoları

### 5.1 Sağlık Kontrol Uç Noktaları

- **Liveness Probe:** `GET /api/health` — API Express sunucusunun ayakta olduğunu ve uptime süresini bildirir.
- **Readiness Probe:** `GET /api/ready` — PostgreSQL veritabanı canlı bağlantısını sınar. Veritabanı yanıt veremezse HTTP 503 döner.

### 5.2 Senaryo A: Backend Servisi Çöktü (HTTP 502 / 504)

**Müdahale Adımları:**
1. Logları inceleyin:
   ```bash
   docker logs --tail 100 -f surveypro_backend
   ```
2. Bellek tüketimi ve OOM (Out of Memory) kontrolü yapın:
   ```bash
   docker stats --no-stream surveypro_backend
   ```
3. Backend konteynerini yeniden başlatın:
   ```bash
   docker compose -f /opt/anket/docker-compose.prod.yml restart backend
   ```
4. Sağlık ucunu test edin:
   ```bash
   docker exec surveypro_backend wget -qO- http://localhost:5001/api/health
   ```

### 5.3 Senaryo B: Veritabanı Kilitlendi veya Yanıt Vermiyor (HTTP 503)

**Müdahale Adımları:**
1. PostgreSQL durumunu sorgulayın:
   ```bash
   docker exec -it surveypro_postgres pg_isready -U surveypro
   ```
2. Kilitli ve uzun süren sorguları listeleyin:
   ```bash
   docker exec -it surveypro_postgres psql -U surveypro -d surveypro -c "
     SELECT pid, usename, state, age(clock_timestamp(), query_start), query 
     FROM pg_stat_activity 
     WHERE state != 'idle' 
     ORDER BY query_start ASC;
   "
   ```
3. 30 saniyeden uzun süren kilitli oturumu sonlandırın:
   ```bash
   docker exec -it surveypro_postgres psql -U surveypro -d surveypro -c "
     SELECT pg_terminate_backend(pid) 
     FROM pg_stat_activity 
     WHERE state != 'idle' AND clock_timestamp() - query_start > interval '30 seconds';
   "
   ```
4. Gerekirse PostgreSQL servisini yeniden başlatın:
   ```bash
   docker compose -f /opt/anket/docker-compose.prod.yml restart postgres
   ```

### 5.4 Senaryo C: Redis Çöktü veya Bağlantı Koptu

**Müdahale Adımları:**
```bash
docker exec -it surveypro_redis redis-cli ping
# Beklenen çıktı: PONG

# Yanıt yoksa:
docker compose -f /opt/anket/docker-compose.prod.yml restart redis
```
*Not:* Redis devre dışı kalsa dahi backend rapor ve auth akışları "graceful degradation" ile doğrudan veritabanından çalışmaya devam eder.

---

## 6. Veritabanı Yedekleme, Arşivleme ve Geri Yükleme Provası

### 6.1 Otomatik Yedekleme Scripti (`scripts/backup.sh`)

Script hem PostgreSQL `pg_dump` yedeğini gzip sıkıştırmalı (`.sql.gz`) alır, hem de Redis RDB bellek snapshot'ını arşivler. 14 günden eski yedekleri otomatik temizler.

**Manuel Yedek Alma:**
```bash
bash /opt/anket/scripts/backup.sh /opt/anket/backups
```

**Zamanlanmış Görev (Cron Yapılandırması):**
```cron
0 3 * * * /opt/anket/scripts/backup.sh /opt/anket/backups >> /var/log/surveypro_backup.log 2>&1
```

### 6.2 Geri Yükleme (Restore Drill) Prosedürü

Felaket kurtarma senaryosunda yedeğin geri yüklenmesi:

```bash
# 1. Mevcut yedek arşivlerini listeleyin:
ls -lh /opt/anket/backups/

# 2. Seçilen yedeği geri yükleyin (Onay istemli):
bash /opt/anket/scripts/restore.sh /opt/anket/backups/surveypro_db_20260919_030000.sql.gz
```

**Bütünlük Doğrulama Komutları:**
```bash
docker exec -it surveypro_postgres psql -U surveypro -d surveypro -c "
  SELECT 
    (SELECT count(*) FROM users) AS toplam_kullanici,
    (SELECT count(*) FROM surveys) AS toplam_anket,
    (SELECT count(*) FROM questions) AS toplam_soru,
    (SELECT count(*) FROM responses) AS toplam_yanit;
"
```

---

## 7. Docker Ortamı Sıfırlama, Temizleme ve Yeniden Başlatma

### 7.1 Disk Alanı Temizliği (Disk Dolu Senaryosu)

Sunucuda disk doluluğu yaşandığında kullanılmayan konteyner, katman ve imajlar temizlenir (veritabanı volume'ü korunur):

```bash
# Disk kullanım analizi:
df -h /
docker system df

# Eski imaj ve kullanılmayan katmanları temizleme:
docker system prune -af --volumes=false
```

### 7.2 Log Boyut Sınırlaması

Tüm konteyner logları Docker daemon üzerinden sınırlandırılmıştır (`/etc/docker/daemon.json`):

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "20m",
    "max-file": "5"
  }
}
```

---

## 8. Nginx Ters Vekil, SSL/TLS ve Ağ Güvenliği

### 8.1 Host Nginx ve Port 4466 Yönlendirmesi

Sunucudaki ana Nginx (`/etc/nginx/sites-available/anket.noktabilisim.net`), gelen HTTPS isteklerini Docker portu `4466`'ya iletir:

```nginx
server {
    server_name anket.noktabilisim.net;

    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/anket.noktabilisim.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/anket.noktabilisim.net/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:4466;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 8.2 SSL Sertifika Süresi Dolma ve Yenileme

Let's Encrypt sertifikasını manuel test etmek ve yenilemek için:

```bash
certbot renew --dry-run
certbot renew
systemctl reload nginx
```

### 8.3 Güvenlik Başlıkları, HSTS ve Bilgi Gizleme

Konteyner içi Nginx (`docker/nginx.prod.conf`) ve Express katmanında zorunlu güvenlik başlıkları:

- `server_tokens off;` (Sürüm numarası gizleme)
- `X-Frame-Options: SAMEORIGIN` (Clickjacking engelleme)
- `X-Content-Type-Options: nosniff` (MIME-sniffing engelleme)
- `X-XSS-Protection: 1; mode=block` (XSS filtre koruması)
- `Referrer-Policy: strict-origin-when-cross-origin` (Hassas referans sızıntısı engelleme)
- `Permissions-Policy: geolocation=(), microphone=(), camera=()` (Donanım yetki kısıtlama)
- `Content-Security-Policy: default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self';` (CSP XSS koruması)
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (HSTS koruması)

---

## 9. Gözlemlenebilirlik, Log İnceleme ve Alarm Eşikleri

### 9.1 Canlı Log İzleme Komutları

```bash
# Tüm servislerin log akışı:
docker compose -f /opt/anket/docker-compose.prod.yml logs -f --tail=50

# Sadece backend hata logları:
docker compose -f /opt/anket/docker-compose.prod.yml logs -f backend | grep -i "error"

# Frontend erişim logları:
docker compose -f /opt/anket/docker-compose.prod.yml logs -f frontend
```

### 9.2 Kritik Alarm Eşikleri ve Operatör Müdahale Matrisi

| Metrik | İzleme Yöntemi | Uyarı Eşiği | Kritik Alarm Eşiği | Operatör Aksiyonu |
|---|---|---|---|---|
| **HTTP 5xx Hata Oranı** | Nginx log analizi | > %1 (5 dk) | > %5 (1 dk) | Backend loglarını incele, DB bağlantı durumunu kontrol et |
| **API P95 Yanıt Süresi** | Express log | > 300 ms | > 1000 ms | Yavaş sorguları analiz et, Redis önbellek durumuna bak |
| **DB Bağlantı Havuzu** | `pg_stat_activity` | > 7 bağlantı | 10 bağlantı (Havuz dolu) | Kilitli veya boşta kalan oturumları sonlandır |
| **Disk Doluluk Oranı** | `df -h /` | > %80 | > %90 | `docker system prune`, eski yedekleri arşivle |
| **Konteyner Yeniden Başlatma** | `docker ps` | 1 restart | > 2 restart (10 dk) | OOM veya crash dump incele |

---

## 10. Güvenlik Olayı Müdahale ve İletişim Kontrol Listesi

Bir güvenlik zafiyeti bildirimi veya şüpheli aktivite anında müdahale adımları:

1. **Erişim Kontrolü ve Yalıtım:** İlgili IP adreslerini Nginx katmanında `deny <IP>;` ile engelleyin.
2. **Gizli Bilgi Rotasyonu:** Bölüm 3.3'teki JWT ve SMS anahtar rotasyon adımlarını derhal uygulayın.
3. **Log İncelemesi:** `ActivityLog` tablosunu ve Docker loglarını inceleyin:
   ```bash
   docker exec -it surveypro_postgres psql -U surveypro -d surveypro -c \
     "SELECT created_at, action, ip_address, metadata FROM activity_logs ORDER BY created_at DESC LIMIT 20;"
   ```
4. **Veri Bütünlüğü Doğrulaması:** Yetkisiz anket veya kullanıcı değişikliği olup olmadığını denetleyin.
5. **Düzeltme ve Devir Teslim:** Düzeltme adımlarını `docs/implementation.md` dosyasına kaydedin.
