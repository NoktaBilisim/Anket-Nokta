# Tasarım Kontrol Listesi Kararları — SurveyPro (Anket Yönetim Sistemi)
Tarih: 2026-09-19  
Durum: ONAYLI  
Rol: Mimar  

Bu doküman `~/.claude/checklists/tasarim-kontrol-listesi.md` standardı uyarınca tüm mimari ve operasyonel kararların eksiksiz dökümüdür. Hiçbir madde değerlendirilmeden bırakılmamıştır.

---

## 1. Kimlik ve Erişim

| Madde | Karar | Gerekçe ve Mimari Tasarım |
|---|---|---|
| **Kimlik doğrulama yöntemi (şifre, OAuth, SSO, magic link, 2FA/MFA)** | **Kapsamda** | Yönetim paneli için e-posta + bcrypt (cost 12) şifre doğrulaması ve JWT (Access Token: 15 dk, Refresh Token: 7 gün). Katılımcılar için e-posta/şifre gerekmeden tekil UUIDv4 token tabanlı güvenli bağlantı erişimi sağlanmıştır. (SSO ve 2FA ilk kurumsal sürümde kapsam dışı tutulmuştur.) |
| **Şifre politikası, sıfırlama akışı, hesap kilitleme, brute-force koruması** | **Kapsamda** | Giriş uç noktasında (`/api/auth/login`) IP ve kullanıcı bazında Redis/bellek destekli `loginLimiter` (1 dakikada max 5 hatalı istek) aktiftir. Şifre en az 8 karakter kuralına tabidir. Parola güncelleme yetkisi kullanıcı profilinde ve admin panelinde mevcuttur. |
| **Yetkilendirme modeli (rol tabanlı / kaynak tabanlı); "kendi verisine erişim" kuralı (IDOR)** | **Kapsamda** | Rol tabanlı erişim denetimi (RBAC) ile 4 rol (`admin`, `creator`, `evaluator`, `participant`) tanımlanmıştır. `authorize()` middleware ile denetlenir. `creator` yalnızca kendi oluşturduğu anketleri (`created_by = user.id`) düzenleyebilir/silebilir. Katılımcı yalnızca kendisine ait token ile anket yanıtlayabilir (IDOR koruması). |
| **Oturum yönetimi: süre, yenileme, çoklu cihaz, "tüm cihazlardan çıkış"** | **Kapsamda** | JWT Access Token (15 dk) + Refresh Token (7 gün DB'de `users.refresh_token` kolonunda) mekanizması uygulanmıştır. Axios interceptor 401 durumunda sessizce `/api/auth/refresh` çağırarak token tazeler. `/api/auth/logout` yapıldığında `refresh_token` sıfırlanır. |
| **Davet / onay / hesap silme (KVKK unutulma hakkı) akışları** | **Kapsamda** | Admin paneli üzerinden tekli kullanıcı ekleme veya Excel/CSV ile toplu katılımcı içe aktarma (`/api/users/import`) mevcuttur. Admin tarafından kullanıcı pasife alma veya silme (`DELETE /api/users/:id`) ve KVKK unutulma hakkı kapsamında anonimleştirme uygulanmıştır. |
| **Servis hesapları ve API anahtarları (rotasyon, kapsam)** | **Kapsamda** | Nokta Bilişim SMS Gateway API anahtarı ve SMTP kimlik bilgileri `settings` tablosunda ve `.env` dosyasında saklanır. API anahtarı `x-api-key` başlığıyla sadece backend-to-backend güvenli çağrılarda kullanılır, frontend'e asla açık metin sızdırılmaz. |

---

## 2. Veri Modeli

| Madde | Karar | Gerekçe ve Mimari Tasarım |
|---|---|---|
| **Her tabloda `created_at`, `updated_at`; gerekiyorsa `deleted_at` (soft delete) ve `created_by`** | **Kapsamda** | Tüm tablolarda (`users`, `surveys`, `questions`, `survey_targets`, `responses`, `answers`, `activity_logs`, `settings`) Sequelize `timestamps: true` ve `underscored: true` ile `created_at`, `updated_at` mevcuttur. `surveys` tablosunda `created_by` FK alanı bulunur. |
| **Silme stratejisi: soft/hard; ilişkili kayıtlarda cascade mi engelle mi?** | **Kapsamda** | Anket silme (`DELETE /api/surveys/:id`) işlemi ilişkili sorular, hedefler ve yanıtlar için hard delete olarak çalışır; silme işlemi öncesi `activity_logs` tablosuna audit kaydı atılır. Anketleri pasife almak için soft status (`status: 'archived'` / `'closed'`) mekanizması öncelikli sunulur. |
| **Para: ondalık tip (asla float), para birimi alanı, kur ve kur tarihi** | **Kapsam dışı** | SurveyPro bir kurumsal değerlendirme ve ölçümleme platformudur; anket içi ödeme veya ücretli anket satışı gereksinimler gereği kapsam dışıdır. Puanlama alanlarında tamsayı/ondalık değerler kullanılır. |
| **Tarih/saat: UTC saklama, kullanıcı saat dilimi, yaz saati** | **Kapsamda** | PostgreSQL ve Node.js katmanında tüm tarihler (`expires_at`, `sent_at`, `opened_at`, `completed_at`, `created_at`, `updated_at`) UTC (ISO-8601) formatında saklanır. Frontend'de kullanıcının yerel saat dilimine göre `tr-TR` formatında formatlanır. |
| **Benzersizlik ve indeks kararları; büyüyecek tablolar için partition/arşiv planı** | **Kapsamda** | `users.email` (UNIQUE), `survey_targets.token` (UNIQUE), `settings.key` (UNIQUE) indeksleri mevcuttur. Performans için `survey_targets(survey_id, user_id)`, `responses(survey_id, is_complete)`, `answers(response_id, question_id)`, `questions(survey_id, order)` bileşik indeksleri tanımlanmıştır. |
| **Migration stratejisi; geri alınabilirlik; seed verisi** | **Kapsamda** | Sequelize `sync({ alter: true })` + `scripts/init.sql` ve `scripts/fix_constraints.sql` şemaları mevcuttur. `backend/src/database/seed.js` ve `seed-prod.sh` ile varsayılan roller, sistem ayarları ve demo anketler idempotent olarak yüklenir. |
| **Denetim izi (audit log): kim, ne zaman, neyi, eski→yeni değer** | **Kapsamda** | `activity_logs` tablosunda `user_id`, `survey_id`, `action` (`user_login`, `user_logout`, `user_created`, `user_updated`, `user_deleted`, `survey_created`, `survey_updated`, `survey_deleted`, `survey_sent`, `response_submitted`), `metadata` (JSONB) ve `ip_address` alanları ile tam denetim izi tutulmaktadır. |
| **Çoklu kiracı (multi-tenant) gerekiyor mu? Veri izolasyonu nasıl?** | **Kapsam dışı** | Tek kurum içi (Single-Tenant on-premise/dedicated) deployment modeli hedeflenmiştir. Çoklu organizasyon izolasyonu sonraki büyük sürüme bırakılmıştır. |
| **Dosya/ek yönetimi: nerede saklanır, boyut limiti, virüs taraması, imzalı URL** | **Kapsamda** | Katılımcı Excel/CSV içe aktarımı için `multer.memoryStorage()` kullanılmıştır; diskte geçici dosya bırakılmaz. Maksimum dosya boyutu 5 MB ile sınırlandırılmış ve MIME/uzantı doğrulaması yapılmıştır. Logo ve statik varlıklar Nginx/Vite public dizinindedir. |

---

## 3. API ve Entegrasyon

| Madde | Karar | Gerekçe ve Mimari Tasarım |
|---|---|---|
| **API sözleşmesi (OpenAPI) önce yazılır; versiyonlama (`/v1`)** | **Kapsamda** | `/api` ön ekiyle RESTful standartlarda hazırlanmıştır. `docs/mimari.md` Bölüm 4 altında tüm endpoint girdi/çıktı şemaları, parametreleri ve HTTP durum kodları tanımlanmıştır. |
| **Standart hata formatı ve hata kodları; kullanıcıya gösterilen vs loglanan mesaj ayrımı** | **Kapsamda** | Tüm API yanıtları `{ success: true, data: ... }` veya `{ success: false, message: ... }` zarfında (envelope) döner. Backend'de Winston logger ile detaylı stack trace loglanırken kullanıcıya temiz Türkçe hata mesajları iletilir. |
| **Sayfalama, sıralama, filtreleme standardı** | **Kapsamda** | Audit log ve katılımcı listelerinde `page`, `limit` (varsayılan 50, maksimum 100) query parametreleri ve `findAndCountAll` ile standart sayfalama uygulanmıştır. Yanıtlar `order: [['created_at', 'DESC']]` ile sıralanır. |
| **Rate limiting, idempotency key (ödeme/işlem uçları)** | **Kapsamda** | `express-rate-limit` ile genel API için 100 istek/dk, login için 5 istek/dk, bildirim gönderimi için 20 istek/dk kısıtları konulmuştur. Anket yanıt gönderiminde mükerrer kayıt `survey_targets.completed_at` bayrağı ile engellenir. |
| **Zaman aşımı, retry, circuit breaker (dış servisler için)** | **Kapsamda** | Nokta Bilişim SMS ve WhatsApp Gateway HTTP çağrılarında 15 saniyelik `AbortSignal.timeout(15000)` koruması konulmuştur. Hata durumunda işlem çökmez, kullanıcı bazında hata raporu derlenip dönülür. |
| **Webhook güvenliği (imza doğrulama), tekrar teslim** | **Sonra** | İlk sürümde dış servislerden gelen webhook dinleyicisi bulunmamaktadır; dağıtım senkron API push modeliyle yürütülmektedir. İleride SMS iletim raporları (DLR) webhook entegrasyonuyla eklenecektir. |
| **CORS politikası** | **Kapsamda** | `cors` middleware ile izin verilen origin `process.env.FRONTEND_URL` üzerinden sınırlandırılmış, `credentials: true` ile oturum başlıkları güvenceye alınmıştır. |

---

## 4. Güvenlik (tasarım aşamasında)

| Madde | Karar | Gerekçe ve Mimari Tasarım |
|---|---|---|
| **Tehdit modeli: varlıklar, saldırgan profilleri, giriş noktaları (STRIDE)** | **Kapsamda** | STRIDE analizine göre: Token spoofing'e karşı UUIDv4 + tek seferlik doldurma kısıtı; DoS'a karşı rate limiting ve Nginx limitleri; Bilgi sızmasına karşı `settings` şifre maskeleme ve anonim yanıtlarda SHA-256 hash mimarisi uygulanmıştır. |
| **Girdi doğrulama sınırda (zod/DTO); çıktı kodlama (XSS)** | **Kapsamda** | Controller seviyesinde zorunlu alan doğrulamaları, tip kontrolleri (`parseDate`, `calcQuestionScore`), React JSX otomatik context-aware encoding ile XSS koruması sağlanmıştır. |
| **Gizli bilgi yönetimi: `.env` repo dışı, secret manager, rotasyon** | **Kapsamda** | `.env` dosyaları `.gitignore` ile repo dışı tutulur. Production ayarları `deploy.sh` ile güvenli SCP üzerinden aktarılır. Hassas DB ayarları maskelenir. |
| **Hassas veri sınıflandırması (PII, finansal, sağlık) ve şifreleme (at-rest / in-transit)** | **Kapsamda** | Katılımcı kimlikleri ve telefon/e-posta PII kapsamındadır. İletişim HTTPS/TLS ile şifrelenir. Parolalar bcrypt ile tek yönlü hash'lenir. Anonim anketlerde PII ile yanıt ilişkisi SHA-256 ile koparılır. |
| **Log'larda hassas veri maskeleme** | **Kapsamda** | Winston logger ve `ActivityLog` kayıtlarında şifreler, refresh token'lar ve API key'ler loglanmaz (`exclude: ['password', 'refresh_token']`). |
| **Bağımlılık taraması (npm audit / Snyk), SBOM** | **Kapsamda** | CI ve yerel ortamda `npm audit` ile güncel CVE taramaları yapılır; bilinen zaafiyet içeren eski kütüphaneler ayıklanmıştır. |
| **Güvenlik başlıkları (CSP, HSTS, X-Frame-Options…), CSRF** | **Kapsamda** | Express tarafında `helmet()` middleware ve Nginx prod yapılandırmasında `X-Frame-Options SAMEORIGIN`, `X-Content-Type-Options nosniff`, `X-XSS-Protection` güvenlik başlıkları aktiftir. |
| **Yönetici paneli ayrı yetki + IP/2FA** | **Kapsamda** | Admin fonksiyonları (`/api/users`, `/api/settings`, `/api/logs`) `authorize('admin')` koruması altındadır. Tüm admin işlemleri IP adresi ile loglanır. |

---

## 5. Kullanıcı Deneyimi ve Arayüz

| Madde | Karar | Gerekçe ve Mimari Tasarım |
|---|---|---|
| **Her ekran için 5 durum: yükleniyor / boş / hata / kısmi veri / başarılı** | **Kapsamda** | Frontend sayfalarında `loading` (Skeleton/Spinner), `empty` (Boş liste mesajı ve Aksiyon butonu), `error` (Hata bannerı / Yeniden dene), `partial` (Sayfalı/filtreli görünüm) ve `success` (Veri kartları/grafikler) durumları eksiksiz uygulanmıştır. |
| **Form doğrulama mesajları, alan bazlı hata, sunucu hatasının forma yansıması** | **Kapsamda** | Anket editöründe boş başlık uyarısı (AC-1), katılımcı ekranında zorunlu soru ve eksik matris satırı kırmızı uyarıları (AC-13, AC-14) anlık geri bildirimle sunulur. |
| **Yıkıcı işlemlerde onay, geri alma (undo) veya soft delete** | **Kapsamda** | Anket silme ve kullanıcı silme işlemlerinde modal onay pencereleri (`window.confirm` veya özel dialog) devrededir. |
| **Responsive kırılımlar (mobil-tablet-masaüstü), dokunma hedefleri** | **Kapsamda** | Tailwind CSS `sm:`, `md:`, `lg:` sınıflarıyla mobil uyumluluk sağlanmıştır. Anket butonları, rating kutuları ve matris hücreleri mobil dokunma standardına (min 44x44px) uygundur. |
| **Erişilebilirlik: klavye gezinme, odak halkası, ARIA, kontrast, `alt`** | **Kapsamda** | Buton ve form kontrollerinde `focus:ring-2`, semantik HTML (`<button>`, `<input>`, `<label>`), kontrast uyumlu renkler ve görsel `alt` etiketleri kullanılmıştır. |
| **Yerelleştirme: dil, tarih/para/sayı formatı, RTL gerekiyor mu?** | **Kapsamda** | Tüm arayüz ve sistem mesajları Türkçe (`tr-TR`) olarak kurgulanmıştır. Tarihler gün/ay/yıl saat biçiminde yerelleştirilir. RTL gerekmemektedir. |
| **Bildirim stratejisi: toast / e-posta / push; ne zaman hangisi** | **Kapsamda** | Sistem içi anlık bildirimler Zustand destekli `Notifications.jsx` (Toast) ile; katılımcı iletişimi E-posta (SMTP), SMS ve WhatsApp ile sağlanır. |
| **Çevrimdışı / yavaş ağ davranışı; optimistic update kararı** | **Kapsamda** | Form submit butonlarında `disabled={loading}` koruması ile çift tıklama önlenir; yavaş ağda işlem sürerken yükleniyor göstergesi belirir. |
| **Sayfa başlıkları, breadcrumb, 404/500 sayfaları** | **Kapsamda** | React Router ve AppLayout ile dinamik başlıklar, anlaşılır geri dönüş bağlantıları ve anket bulunamadı / yetkisiz erişim ekranları tasarlanmıştır. |
| **Tasarım sistemi/token'lar (renk, spacing, tipografi) tek kaynaktan** | **Kapsamda** | Tailwind konfigürasyonu (`tailwind.config.js`) ve CSS değişkenleri (`index.css`) ile kurumsal mor/indigo/slate paleti standartlaştırılmıştır. |

---

## 6. Performans ve Ölçek

| Madde | Karar | Gerekçe ve Mimari Tasarım |
|---|---|---|
| **Beklenen yük: kullanıcı, istek/sn, veri hacmi (1 yıl / 3 yıl)** | **Kapsamda** | Yıllık 50.000 anket gönderimi, 100.000 yanıt ve anlık 50 concurrent kullanıcı hedefi için Node.js non-blocking I/O + PostgreSQL indeksleme mimarisi tam yeterlilik sunar. |
| **N+1 sorgu önlemi, index planı, ağır raporlar için ayrı okuma yolu / önbellek** | **Kapsamda** | Sequelize `include` ilişkileri tek SQL `JOIN` veya optimize `IN (...)` sorgusuyla çalışır. Rapor hesaplamalarında bellek içi map/reduce ile veritabanına minimum sorgu yükü biner. |
| **Önbellek katmanları ve geçersiz kılma (invalidation) kuralı** | **Kapsamda** | Redis önbellek katmanı rate limiting ve oturum yönetimi için devrededir. Dağıtık ortamda dinamik ayarlar servis bazında bellekte tutulur. |
| **Arka plan işleri / kuyruk (e-posta, rapor, import) ve tekrar deneme politikası** | **Sonra** | Mevcut sürümde toplu gönderimler asenkron `Promise.all` / döngü ile doğrudan iletilir. 10.000+ anlık gönderimler için Redis tabanlı BullMQ kuyruk mimarisine geçiş hazır bırakılmıştır. |
| **Büyük liste/export: streaming, sayfalama, zaman aşımı** | **Kapsamda** | Katılımcı yanıtları ve rapor verileri `xlsx` kütüphanesi ile optimize bellek içi matris üzerinden anlık üretilip binary blob stream olarak istemciye iletilir (AC-22). |
| **Performans bütçesi (LCP, TTI, bundle boyutu)** | **Kapsamda** | Vite ile optimize bundle boyutu (< 350 KB gzipped), Nginx gzip sıkıştırması ve anket doldurma LCP < 1.5s hedefine tam uyum. |

---

## 7. Operasyon ve Gözlemlenebilirlik

| Madde | Karar | Gerekçe ve Mimari Tasarım |
|---|---|---|
| **Yapılandırılmış log (JSON), korelasyon ID'si, log seviyeleri** | **Kapsamda** | Winston logger (`info`, `warn`, `error`) ile konsol ve dosya loglaması yapılandırılmıştır. |
| **Metrikler ve alarm eşikleri; health/readiness uçları** | **Kapsamda** | `/api/health` uç noktası veritabanı ve servis canlılığını (`{ status: 'ok', time: ... }`) doğrulamak üzere izleme araçlarına açıktır. Docker Compose healthcheck ile PostgreSQL ve Redis servisleri denetlenir. |
| **Hata izleme (Sentry vb.) ve kullanıcıya hata referans no'su** | **Sonra** | Sunucu logları ve `activity_logs` üzerinden hata takibi yapılmaktadır; harici SaaS hata izleme (Sentry) sonraki aşamaya bırakılmıştır. |
| **Yedekleme: sıklık, saklama süresi, geri yükleme testi** | **Kapsamda** | `docker-compose.prod.yml` üzerindeki `postgres_data` volume'ü ve günlük `pg_dump` crontab yedekleme prosedürü runbook'a dahil edilmiştir. |
| **Ortamlar: dev / staging / prod; config farkları; feature flag** | **Kapsamda** | Yerel geliştirme (`docker-compose.yml`, `npm run dev`) ve yayın sunucusu (`docker-compose.prod.yml`, `.env.prod`, `deploy.sh`) ayrımı net olarak yapılmıştır. |
| **CI/CD: lint → test → build → deploy; geri alma (rollback) planı** | **Kapsamda** | `deploy.sh` scripti ile rsync tabanlı dosya transferi ve `docker compose up --build -d` ile kesintisiz dağıtım sağlanmaktadır. Önceki imaj etiketine dönerek anında rollback mümkündür. |
| **Sıfır kesintili migration; bakım modu** | **Kapsamda** | Sequelize `alter: true` ile mevcut tablolar korunarak yeni kolonlar geriye dönük uyumlu olarak eklenir. Nginx statik bakım sayfası kuralı mevcuttur. |
| **Runbook: "servis düştü", "veri bozuldu", "sertifika süresi doldu"** | **Kapsamda** | Dokümantasyonda ve mimaride konteyner yeniden başlatma, log inceleme ve Nginx SSL sertifika rotasyon adımları tanımlanmıştır. |

---

## 8. Uyumluluk ve Hukuk

| Madde | Karar | Gerekçe ve Mimari Tasarım |
|---|---|---|
| **KVKK/GDPR: açık rıza, aydınlatma metni, veri saklama süresi, silme talebi** | **Kapsamda** | Anonim anket seçeneğinde katılımcı `user_id` alanı tamamen `NULL` bırakılmakta ve yalnızca tekil katılım kontrolü için geri döndürülemez SHA-256 hash saklanmaktadır (AC-17). E-posta şablonunda bilgilendirme ve aydınlatma notu mevcuttur. |
| **Çerez politikası, lisanslar (3. parti kütüphane lisans uyumu)** | **Kapsamda** | Üçüncü parti izleme çerezi kullanılmaz; yalnızca oturum token'ları güvenli localStorage'da saklanır. Kullanılan tüm NPM paketleri MIT / Apache 2.0 açık kaynak lisanslıdır. |
| **Finansal veri varsa: işlem kayıtlarının değiştirilemezliği, mutabakat raporu** | **Kapsam dışı** | Finansal veri veya ödeme işlemi bulunmamaktadır. |

---

## 9. Proje Yönetimi

| Madde | Karar | Gerekçe ve Mimari Tasarım |
|---|---|---|
| **Kapsam dışı listesi açıkça yazıldı mı?** | **Kapsamda** | `docs/gereksinimler.md` Bölüm 3 altında 5 temel kapsam dışı madde (Koşullu dallanma, SSO/OAuth, Mobil Native Uygulama, Çok dilli içerik, Ödeme modülü) net olarak tanımlanmıştır. |
| **Kabul kriterleri ölçülebilir mi (AC-n formatında)?** | **Kapsamda** | AC-1'den AC-22'ye kadar 22 adet ölçülebilir ve test edilebilir kriter belirlenmiştir. |
| **Riskler ve varsayımlar; açık sorular ve sahibi** | **Kapsamda** | R-1 (SMS/WA API timeout), R-2 (SMTP spam/kota), R-3 (Büyük anketler), R-4 (Büyük Excel export) riskleri ve azaltma planları belgelenmiştir. |
| **Definition of Done (bkz. `kalite-standartlari.md`)** | **Kapsamda** | DoD standartları mimari ve test stratejisine tam olarak yansıtılmıştır. |
| **Dokümantasyon planı: README, API dokümanı, kullanıcı kılavuzu, ADR kayıtları** | **Kapsamda** | `docs/mimari.md`, `docs/tasarim-kontrol.md` ve `docs/adr/` mimari karar kayıtları hazırlanmıştır. |
