# Tasarım Kontrol Listesi Kararları — SurveyPro (Anket Yönetim Sistemi)

Tarih: 2026-09-19  
Sürüm: 1.1 (Kurumsal Marka & Logo Yönetimi Dahil)  
Durum: ONAYLI  
Rol: Mimar  

Bu doküman `~/.claude/checklists/tasarim-kontrol-listesi.md` standardı uyarınca tüm mimari ve operasyonel kararların eksiksiz dökümüdür. Hiçbir madde değerlendirilmeden bırakılmamış; her başlık için **Kapsamda / Kapsam Dışı / Sonra** kararı ve mimari gerekçesi yazılmıştır.

---

## 1. Kimlik ve Erişim

| Madde | Karar | Gerekçe ve Mimari Tasarım |
|---|---|---|
| **Kimlik doğrulama yöntemi (şifre, OAuth, SSO, magic link, 2FA/MFA)** | **Kapsamda** | Yönetim paneli için e-posta + bcrypt (cost 12) şifre doğrulaması ve JWT (Access Token: 15 dk, Refresh Token: 7 gün). Katılımcılar için e-posta/şifre gerekmeden tekil UUIDv4 token tabanlı güvenli bağlantı erişimi sağlanmıştır (`AC-6`, `AC-12`). (SSO ve 2FA ilk kurumsal sürümde kapsam dışı tutulmuştur.) |
| **Şifre politikası, sıfırlama akışı, hesap kilitleme, brute-force koruması** | **Kapsamda** | Giriş uç noktasında (`/api/auth/login`) IP ve kullanıcı bazında Redis/bellek destekli `loginLimiter` (1 dakikada max 5 istek) aktiftir. Şifre en az 8 karakter kuralına tabidir. Parola güncelleme yetkisi kullanıcı profilinde ve admin panelinde mevcuttur. |
| **Yetkilendirme modeli (rol tabanlı / kaynak tabanlı); "kendi verisine erişim" kuralı (IDOR)** | **Kapsamda** | Rol tabanlı erişim denetimi (RBAC) ile 4 rol (`admin`, `creator`, `evaluator`, `participant`) tanımlanmıştır. `authorize()` middleware ile denetlenir. `creator` yalnızca kendi oluşturduğu anketleri düzenleyebilir. Katılımcı yalnızca kendisine ait token ile anket yanıtlayabilir. Logo yükleme/silme ve sistem ayarlarını değiştirme yetkisi yalnızca `admin` rolüne aittir (`AC-23`, `AC-24`). |
| **Oturum yönetimi: süre, yenileme, çoklu cihaz, "tüm cihazlardan çıkış"** | **Kapsamda** | JWT Access Token (15 dk) + Refresh Token (7 gün DB'de `users.refresh_token` kolonunda) mekanizması uygulanmıştır. Axios interceptor 401 durumunda sessizce `/api/auth/refresh` çağırarak token tazeler. `/api/auth/logout` yapıldığında `refresh_token` DB'de sıfırlanır. |
| **Davet / onay / hesap silme (KVKK unutulma hakkı) akışları** | **Kapsamda** | Admin paneli üzerinden tekli kullanıcı ekleme veya Excel/CSV ile toplu katılımcı içe aktarma (`/api/users/import`) mevcuttur. Admin tarafından kullanıcı pasife alma veya silme (`DELETE /api/users/:id`) ve KVKK unutulma hakkı kapsamında anonimleştirme uygulanmıştır. |
| **Servis hesapları ve API anahtarları (rotasyon, kapsam)** | **Kapsamda** | Nokta Bilişim SMS Gateway API anahtarı ve SMTP kimlik bilgileri `settings` tablosunda ve `.env` dosyasında saklanır. API anahtarı backend-to-backend güvenli çağrılarda kullanılır, istemcilere ve `/api/settings/public` ucuna asla açık metin sızdırılmaz (`AC-11`, `AC-27`). |

---

## 2. Veri Modeli

| Madde | Karar | Gerekçe ve Mimari Tasarım |
|---|---|---|
| **Her tabloda `created_at`, `updated_at`; gerekiyorsa `deleted_at` ve `created_by`** | **Kapsamda** | Tüm tablolarda (`users`, `surveys`, `questions`, `survey_targets`, `responses`, `answers`, `activity_logs`, `settings`) Sequelize `timestamps: true` ve `underscored: true` ile `created_at`, `updated_at` mevcuttur. `surveys` tablosunda `created_by` FK alanı bulunur. |
| **Silme stratejisi: soft/hard; ilişkili kayıtlarda cascade mi engelle mi?** | **Kapsamda** | Anket silme (`DELETE /api/surveys/:id`) işlemi ilişkili sorular, hedefler ve yanıtlar için hard delete (cascade) olarak çalışır; silme öncesi `activity_logs` tablosuna audit kaydı atılır. Anketleri arşivlemek için `status: 'archived'` durumu mevcuttur. Özel logo silindiğinde (`DELETE /api/settings/logo`) dosya diskten silinir ve `settings.app_logo` değeri temizlenir (`AC-24`). |
| **Para: ondalık tip (asla float), para birimi alanı, kur ve kur tarihi** | **Kapsam dışı** | SurveyPro bir kurumsal değerlendirme ve ölçümleme platformudur; anket içi ödeme veya ücretli anket satışı gereksinimler gereği kapsam dışıdır. Puanlama alanlarında tamsayı/ondalık değerler kullanılır. |
| **Tarih/saat: UTC saklama, kullanıcı saat dilimi, yaz saati** | **Kapsamda** | PostgreSQL ve Node.js katmanında tüm tarihler (`expires_at`, `sent_at`, `opened_at`, `completed_at`, `created_at`, `updated_at`) UTC (ISO-8601) formatında saklanır. Frontend'de kullanıcının yerel saat dilimine göre `tr-TR` formatında formatlanır. |
| **Benzersizlik ve indeks kararları; büyüyecek tablolar için partition/arşiv planı** | **Kapsamda** | `users.email` (UNIQUE), `survey_targets.token` (UNIQUE), `settings.key` (UNIQUE) indeksleri mevcuttur. Performans için `survey_targets(survey_id, user_id)`, `responses(survey_id, is_complete)`, `answers(response_id, question_id)`, `questions(survey_id, order)` bileşik indeksleri tanımlanmıştır. |
| **Migration stratejisi; geri alınabilirlik; seed verisi** | **Kapsamda** | Sequelize `sync({ alter: true })` + `scripts/init.sql` ve `scripts/fix_constraints.sql` şemaları mevcuttur. `seed.js` dosyası varsayılan roller, sistem ayarları (`app_logo: ''`, `app_title: 'SurveyPro'`) ve demo anketleri idempotent olarak yükler. |
| **Denetim izi (audit log): kim, ne zaman, neyi, eski→yeni değer** | **Kapsamda** | `activity_logs` tablosunda `user_id`, `survey_id`, `action` (`user_login`, `survey_created`, `survey_sent`, `setting_updated`, `response_submitted`), `metadata` (JSONB) ve `ip_address` alanları ile tam denetim izi tutulmaktadır. Logo yükleme/sıfırlama işlemleri loglanır. |
| **Çoklu kiracı (multi-tenant) gerekiyor mu? Veri izolasyonu nasıl?** | **Kapsam dışı** | Tek kurum içi (Single-Tenant on-premise/dedicated) mimari hedeflenmiştir. Yüklenen kurumsal logo ve marka başlığı sistem geneli için tektir (`K-2`, US-7). Çoklu organizasyon izolasyonu sonraki büyük sürüme bırakılmıştır. |
| **Dosya/ek yönetimi: nerede saklanır, boyut limiti, virüs taraması, imzalı URL** | **Kapsamda** | Logo dosyaları sunucuda `/app/uploads/logos/` izole dizininde tekil UUID dosya adlarıyla (`logo_<uuid>.<ext>`) saklanır (`AC-23`). Maksimum dosya boyutu 2MB ile sınırlandırılmıştır. Kalıcı Docker volume (`uploads_data:/app/uploads`) ile veri kalıcılığı güvenceye alınmıştır. Katılımcı Excel/CSV import için `multer.memoryStorage()` kullanılır (5MB sınır). |

---

## 3. API ve Entegrasyon

| Madde | Karar | Gerekçe ve Mimari Tasarım |
|---|---|---|
| **API sözleşmesi (OpenAPI) önce yazılır; versiyonlama (`/v1`)** | **Kapsamda** | `/api` ön ekiyle RESTful standartlarda hazırlanmıştır. `docs/mimari.md` Bölüm 4 altında tüm endpoint girdi/çıktı şemaları, parametreleri ve HTTP durum kodları tanımlanmıştır. |
| **Standart hata formatı ve hata kodları; kullanıcıya gösterilen vs loglanan mesaj ayrımı** | **Kapsamda** | Tüm API yanıtları `{ success: true, data: ... }` veya `{ success: false, message: ... }` zarfında döner. Backend'de Winston logger ile detaylı hata stack trace'i tutulurken kullanıcıya temiz Türkçe iş mesajları iletilir. |
| **Sayfalama, sıralama, filtreleme standardı** | **Kapsamda** | Audit log ve katılımcı listelerinde `page`, `limit` (varsayılan 50, maksimum 100) query parametreleri ile standart sayfalama uygulanmıştır. Katılımcı anket arayüzünde 20'şerli soru sayfalama devrededir (`AC-13`). |
| **Rate limiting, idempotency key (ödeme/işlem uçları)** | **Kapsamda** | `express-rate-limit` ile genel API için 100 istek/dk, login için 5 istek/dk, bildirim gönderimi için 20 istek/dk, public settings ucu (`/api/settings/public`) için 60 istek/dk limitleri uygulanmıştır. Anket yanıtında `survey_targets.completed_at` bayrağı ile mükerrerlik engellenir (`AC-15`). |
| **Zaman aşımı, retry, circuit breaker (dış servisler için)** | **Kapsamda** | Nokta Bilişim SMS ve WhatsApp Gateway HTTP çağrılarında 15 saniyelik `AbortSignal.timeout(15000)` koruması konulmuştur (`R-1`). Hata durumunda işlem çökmez, kullanıcı bazında hata raporu döner. |
| **Webhook güvenliği (imza doğrulama), tekrar teslim** | **Sonra** | İlk sürümde dış servislerden gelen webhook dinleyicisi bulunmamaktadır; bildirimler senkron API push modeliyle yürütülmektedir. İleride SMS teslim raporları (DLR) için webhook entegrasyonu planlanmıştır. |
| **CORS politikası** | **Kapsamda** | `cors` middleware ile izin verilen origin `process.env.FRONTEND_URL` üzerinden sınırlandırılmış, `credentials: true` ile oturum başlıkları güvenceye alınmıştır. |

---

## 4. Güvenlik (Tasarım Aşamasında)

| Madde | Karar | Gerekçe ve Mimari Tasarım |
|---|---|---|
| **Tehdit modeli: varlıklar, saldırgan profilleri, giriş noktaları (STRIDE)** | **Kapsamda** | STRIDE analizine göre: Token spoofing'e karşı UUIDv4 + tek seferlik doldurma kısıtı; DoS'a karşı rate limiting ve Nginx limitleri; Bilgi sızmasına karşı `settings` şifre maskeleme ve public settings uç izolasyonu; SVG XSS'e karşı sunucu sanitizasyonu ve `<img>` render kuralı uygulanmıştır (`AC-23`, `AC-27`). |
| **Girdi doğrulama sınırda (zod/DTO); çıktı kodlama (XSS)** | **Kapsamda** | Multer seviyesinde MIME whitelist (`image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`) ve 2MB boyut sınırı; SVG dosyalarında zararlı script/olay temizliği; React JSX otomatik context-aware encoding ile tam XSS koruması sağlanmıştır. |
| **Gizli bilgi yönetimi: `.env` repo dışı, secret manager, rotasyon** | **Kapsamda** | `.env` dosyaları `.gitignore` ile repo dışı tutulur. Production ayarları `deploy.sh` ile güvenli SCP üzerinden aktarılır. Hassas DB ayarları API yanıtlarında maskelenir. |
| **Hassas veri sınıflandırması (PII, finansal, sağlık) ve şifreleme (at-rest / in-transit)** | **Kapsamda** | Katılımcı kimlikleri ve telefon/e-posta PII kapsamındadır. İletişim HTTPS/TLS ile şifrelenir. Parolalar bcrypt ile tek yönlü hash'lenir. Anonim anketlerde PII ile yanıt ilişkisi SHA-256 ile koparılır (`AC-17`). |
| **Log'larda hassas veri maskeleme** | **Kapsamda** | Winston logger ve `ActivityLog` kayıtlarında şifreler, refresh token'lar ve API key'ler loglanmaz (`exclude: ['password', 'refresh_token', 'smtp_pass', 'sms_api_key']`). |
| **Bağımlılık taraması (npm audit / Snyk), SBOM** | **Kapsamda** | CI ve yerel ortamda `npm audit --audit-level=high` ile güncel CVE taramaları yapılır; bilinen zaafiyet içeren eski kütüphaneler ayıklanmıştır. |
| **Güvenlik başlıkları (CSP, HSTS, X-Frame-Options…), CSRF** | **Kapsamda** | Express tarafında `helmet()` middleware ve Nginx prod yapılandırmasında `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection: 1; mode=block` güvenlik başlıkları aktiftir. |
| **Yönetici paneli ayrı yetki + IP/2FA** | **Kapsamda** | Admin fonksiyonları (`/api/users`, `/api/settings`, `/api/settings/logo`, `/api/logs`) `authorize('admin')` koruması altındadır. Tüm admin işlemleri IP adresi ile loglanır. |

---

## 5. Kullanıcı Deneyimi ve Arayüz (UI/UX)

| Madde | Karar | Gerekçe ve Mimari Tasarım |
|---|---|---|
| **Her ekran için 5 durum: yükleniyor / boş / hata / kısmi veri / başarılı** | **Kapsamda** | Logo yükleme ve ayar ekranında Loading (Yükleniyor spinner), Empty (Varsayılan Truguard Fallback), Error (Geçersiz format/boyut hata toast'ı), Partial (Önizleme kartı) ve Success (Kaydedildi ✓) durumları eksiksiz tasarlanmıştır (`AC-23`, `AC-24`). |
| **Form doğrulama mesajları, alan bazlı hata, sunucu hatasının forma yansıması** | **Kapsamda** | 2MB'tan büyük dosya veya desteklenmeyen uzantı seçildiğinde sunucuya gitmeden anında istemci uyarısı gösterilir; sunucu hataları toast ve form altı mesajı olarak kullanıcıya yansıtılır. |
| **Yıkıcı işlemlerde onay, geri alma (undo) veya soft delete** | **Kapsamda** | Özel logoyu sıfırlama ("Varsayılana Dön") işleminde kullanıcıya onay modal penceresi sunulur; onay verildiğinde sıfırlama gerçekleştirilir (`AC-24`). |
| **Responsive kırılımlar (mobil-tablet-masaüstü), dokunma hedefleri** | **Kapsamda** | Yönetim paneli kenar çubuğunda (`AppLayout`) masaüstünde maksimum 48px yükseklik, mobil üst barda maksimum 36px yükseklik kısıtları konulmuştur (`AC-26`). Giriş ekranında (`LoginPage`) ortalanmış duyarlı görsel kullanılır (`AC-25`). |
| **Erişilebilirlik: klavye gezinme, odak halkası, ARIA, kontrast, `alt`** | **Kapsamda** | Logo görsellerinde `alt="Kurum Logosu"` ve `alt={appTitle}` erişilebilirlik etiketleri zorunludur. Form elemanlarında `focus:ring-2` ve ARIA nitelikleri mevcuttur. |
| **Yerelleştirme: dil, tarih/para/sayı formatı, RTL gerekiyor mu?** | **Kapsamda** | Tüm arayüz, hata mesajları ve bildirim şablonları Türkçe (`tr-TR`) olarak kurgulanmıştır. RTL gerekmemektedir. |
| **Bildirim stratejisi: toast / e-posta / push; ne zaman hangisi** | **Kapsamda** | Arayüz içi aksiyon bildirimleri Zustand destekli `Notifications.jsx` (Toast) ile; katılımcı iletişimi E-posta (SMTP), SMS ve WhatsApp ile sağlanır. |
| **Çevrimdışı / yavaş ağ davranışı; optimistic update kararı** | **Kapsamda** | Logo yükleme butonunda `disabled={saving}` koruması ile çift tıklama önlenir; logo yüklendiğinde `brandingStore` anında güncellenerek görsel tazelenir. |
| **Sayfa başlıkları, breadcrumb, 404/500 sayfaları** | **Kapsamda** | Tarayıcı sekme başlığı dinamik olarak `appTitle` ile güncellenir (`document.title = `${pageTitle} | ${appTitle}``). |
| **Tasarım sistemi/token'lar (renk, spacing, tipografi) tek kaynaktan** | **Kapsamda** | Tailwind CSS konfigürasyonu (`tailwind.config.js`) ve CSS değişkenleri (`index.css`) ile kurumsal tasarım standartları tek kaynaktan yönetilir. |

---

## 6. Performans ve Ölçek

| Madde | Karar | Gerekçe ve Mimari Tasarım |
|---|---|---|
| **Beklenen yük: kullanıcı, istek/sn, veri hacmi (1 yıl / 3 yıl)** | **Kapsamda** | Yıllık 50.000 anket gönderimi, 100.000 yanıt ve anlık 50 concurrent kullanıcı hedefi için Node.js non-blocking I/O + PostgreSQL indeksleme mimarisi tam yeterlilik sunar. |
| **N+1 sorgu önlemi, index planı, ağır raporlar için ayrı okuma yolu / önbellek** | **Kapsamda** | `settings` tablosundan public ayarlar tekil indeks aramasıyla çekilir (`O(1)`). Rapor sorgularında Sequelize `include` ile optimize JOIN kullanılır. |
| **Önbellek katmanları ve geçersiz kılma (invalidation) kuralı** | **Kapsamda** | Statik logo dosyaları tarayıcıda `max-age=86400` ile önbelleklenir. Logo güncellendiğinde frontend store `?v=${timestamp}` cache-busting parametresi ekleyerek önbelleği anında düşürür (`R-7`). |
| **Arka plan işleri / kuyruk (e-posta, rapor, import) ve tekrar deneme politikası** | **Sonra** | Mevcut sürümde toplu bildirim gönderimleri asenkron `Promise.all` ile iletilir. 10.000+ anlık gönderimler için Redis tabanlı BullMQ kuyruk mimarisine geçiş hazır bırakılmıştır. |
| **Büyük liste/export: streaming, sayfalama, zaman aşımı** | **Kapsamda** | Rapor Excel dışa aktarımı `xlsx` kütüphanesi ile optimize bellek içi matris üzerinden binary stream olarak istemciye iletilir (`AC-22`). 50.000+ kayıt için `exceljs` streaming genişleme noktası tanımlıdır. |
| **Performans bütçesi (LCP, TTI, bundle boyutu, API SLA)** | **Kapsamda** | `GET /api/settings/public` yanıt süresi **< 100 ms** (`AC-27`), anket doldurma LCP **< 1.5 sn**, rapor hesaplama **< 1 sn** (`AC-19`), frontend gzip bundle **< 350 KB**. |

---

## 7. Operasyon ve Gözlemlenebilirlik

| Madde | Karar | Gerekçe ve Mimari Tasarım |
|---|---|---|
| **Yapılandırılmış log (JSON), korelasyon ID'si, log seviyeleri** | **Kapsamda** | Winston logger (`info`, `warn`, `error`) ile konsol ve prod dosya loglaması yapılandırılmıştır. |
| **Metrikler ve alarm eşikleri; health/readiness uçları** | **Kapsamda** | `/api/health` uç noktası (`{ status: 'ok', time: ... }`) izleme araçlarına açıktır. Docker Compose healthcheck ile PostgreSQL, Redis ve Backend servisleri periyodik denetlenir. |
| **Hata izleme (Sentry vb.) ve kullanıcıya hata referans no'su** | **Sonra** | Sunucu logları ve `activity_logs` üzerinden hata takibi yapılmaktadır; harici SaaS hata izleme (Sentry) sonraki aşamaya bırakılmıştır. |
| **Yedekleme: sıklık, saklama süresi, geri yükleme testi** | **Kapsamda** | PostgreSQL verileri `postgres_data`, yüklenen kurumsal logolar `uploads_data` kalıcı Docker volume'lerinde tutulur. Günlük yedekleme scripti her iki veriyi de arşivler (`K-8`). |
| **Ortamlar: dev / staging / prod; config farkları; feature flag** | **Kapsamda** | Yerel geliştirme (`docker-compose.yml`, `npm run dev`) ve yayın sunucusu (`docker-compose.prod.yml`, `.env.prod`, `deploy.sh`) ayrımı net olarak yapılmıştır. |
| **CI/CD: lint → test → build → deploy; geri alma (rollback) planı** | **Kapsamda** | `deploy.sh` scripti ile rsync tabanlı dosya aktarımı ve `docker compose up --build -d` ile kesintisiz dağıtım sağlanmaktadır. Rollback için önceki Docker imajına dönüş prosedürü hazırdır. |
| **Sıfır kesintili migration; bakım modu** | **Kapsamda** | Sequelize `alter: true` ile mevcut tablolar korunarak yeni kolonlar geriye dönük uyumlu eklenir. Nginx bakım modu yönlendirmesi mevcuttur. |
| **Runbook: "servis düştü", "veri bozuldu", "sertifika süresi doldu"** | **Kapsamda** | `docs/runbook.md` dokümanında servis kesintisi, volume kurtarma, Nginx SSL rotasyonu ve acil müdahale adımları detaylandırılmıştır. |

---

## 8. Uyumluluk ve Hukuk

| Madde | Karar | Gerekçe ve Mimari Tasarım |
|---|---|---|
| **KVKK/GDPR: açık rıza, aydınlatma metni, veri saklama süresi, silme talebi** | **Kapsamda** | Anonim anket seçeneğinde katılımcı `user_id` alanı tamamen `NULL` bırakılmakta ve yalnızca tekil katılım kontrolü için geri döndürülemez SHA-256 hash saklanmaktadır (`AC-17`). E-posta şablonunda bilgilendirme ve aydınlatma notu mevcuttur. |
| **Çerez politikası, lisanslar (3. parti kütüphane lisans uyumu)** | **Kapsamda** | Üçüncü parti izleme çerezi kullanılmaz; yalnızca oturum token'ları güvenli localStorage'da saklanır. Kullanılan tüm NPM paketleri MIT / Apache 2.0 açık kaynak lisanslıdır. |
| **Finansal veri varsa: işlem kayıtlarının değiştirilemezliği, mutabakat raporu** | **Kapsam dışı** | Finansal veri veya ödeme işlemi bulunmamaktadır. |

---

## 9. Proje Yönetimi

| Madde | Karar | Gerekçe ve Mimari Tasarım |
|---|---|---|
| **Kapsam dışı listesi açıkça yazıldı mı?** | **Kapsamda** | `docs/gereksinimler.md` Bölüm 3 altında 6 temel kapsam dışı madde (Skip logic, SSO/OAuth, Mobil Native, Çok dilli içerik, Multi-tenant branding, Image Cropper) net olarak tanımlanmıştır. |
| **Kabul kriterleri ölçülebilir mi (AC-n formatında)?** | **Kapsamda** | AC-1'den AC-27'ye kadar 27 adet ölçülebilir ve otomatik test edilebilir kabul kriteri belirlenmiştir. |
| **Riskler ve varsayımlar; açık sorular ve sahibi** | **Kapsamda** | R-1'den R-7'ye kadar tüm riskler (Gateway timeout, SMTP kota, SVG XSS, 2MB aşımı, Önbellek tazeleme) ve azaltma planları belgelenmiştir. |
| **Definition of Done (bkz. `kalite-standartlari.md`)** | **Kapsamda** | DoD standartları mimari ve test stratejisine tam olarak yansıtılmıştır. |
| **Dokümantasyon planı: README, API dokümanı, kullanıcı kılavuzu, ADR kayıtları** | **Kapsamda** | `docs/mimari.md`, `docs/tasarim-kontrol.md`, `docs/api.md` ve `docs/adr/0001`..`0005` kayıtları eksiksiz hazırlanmıştır. |
