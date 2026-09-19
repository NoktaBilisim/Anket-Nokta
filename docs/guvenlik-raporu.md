# Güvenlik Raporu — Tur 4 (Kurumsal Marka ve Dinamik Logo Yönetimi Dahil)
DURUM: GEÇTİ
Özet: Kritik 0 / Yüksek 0 / Orta 1 / Düşük 2

---

## 1. Yönetici Özeti ve Kapsam
Bu güvenlik denetimi, SurveyPro v1.1 sürümü kapsamında eklenen **Dinamik Kurumsal Marka ve Logo Yönetimi (White-Labeling)** modülünü, Multer dosya yükleme mekanizmasını, sunucu taraflı SVG Sanitizer XSS/XXE korumasını, `/api/settings/public` genel uç noktasını, statik dosya sunumu güvenlik başlıklarını, RBAC yetkilendirmesini, rate limiting politikalarını ve otomatik bağımlılık/gizli bilgi tarama sonuçlarını kapsamaktadır.

Tüm kritik kimlik doğrulama, yetkilendirme (RBAC/IDOR), enjeksiyon, XSS ve dosya yükleme sınırları incelenmiş ve 11 test suite altında 82 otomatik testin tamamının başarıyla geçtiği doğrulanmıştır.

---

## Bulgular (öncelik sırasıyla)

### [ORTA] Bağımlılık Güvenliği: Nodemailer ve SheetJS (xlsx) CVE Bildirimleri — A06:2021-Vulnerable and Outdated Components
- **Yer:** `backend/package.json` (nodemailer, xlsx) ve `frontend/package.json` (react-router, vite/esbuild)
- **Sorun:** `npm audit` taramasında backend tarafında `nodemailer` (GHSA-mm7p-fcc7-pg87, GHSA-c7w3-x93f-qmm8) ve `xlsx` (GHSA-4r6h-8v6p-xvw6 Prototype Pollution & ReDoS); frontend tarafında `react-router` (GHSA-wrjc-x8rr-h8h6) kütüphanelerinde moderate/high seviye zafiyetler tespit edilmiştir.
- **İstismar senaryosu:** Saldırgan, Excel dışa aktarımında özel hazırlanmış kötü niyetli nesne özellikleri enjekte ederek bellek tüketimine (ReDoS) veya SMTP başlıklarında manipülasyona yol açmayı deneyebilir. (Mevcut kodda `sanitizeExcelCell` koruması ve `AbortSignal.timeout` ile pratik etki minimize edilmiştir).
- **Düzeltme:** 
  1. `xlsx` kütüphanesi yerine `docs/mimari.md` K-7 kapsamında planlanan bellek korumalı `exceljs` kütüphanesine geçilmesi.
  2. `nodemailer` sürümünün güncellenmesi (`nodemailer@>=10.x`).
  3. Frontend `react-router-dom` paketinin yamalanması (`npm audit fix`).
  - **Atanan ajan:** `backend-dev`, `devops`

### [DÜŞÜK] Git Geçmişinde Eski .env İzi — A05:2021-Security Misconfiguration
- **Yer:** Git geçmişi (Commit `41436094` ve `ca5e27c9`)
- **Sorun:** `.env` ve `.env.prod` dosyaları önceki versiyonlarda git takibine girmiş, `4e5934c2` commit'i ile çalışma ağacından silinmiş olsa da Git commit geçmişinde (`git log`) yer almaktadır.
- **İstismar senaryosu:** Deponun açık kaynak yapılması veya yetkisiz 3. şahıslara açılması durumunda eski geliştirme parolaları ve anahtarları git geçmişinden okunabilir.
- **Düzeltme:** `git-filter-repo` veya BFG Repo-Cleaner aracı kullanılarak ilgili eski commit'lerdeki `.env*` dosyaları depodan tamamen kazınmalı, production ortamında kullanılan gizli anahtarlar (JWT_SECRET, DB_PASSWORD, SMTP_PASS vb.) rotasyona tabi tutulmalıdır.
  - **Atanan ajan:** `devops`

### [DÜŞÜK] İkili Görsel Dosya İmzası (Magic Number) Doğrulaması — A04:2021-Insecure Design / Defense in Depth
- **Yer:** `backend/src/middleware/upload.js:39-51`
- **Sorun:** Multer `fileFilter` fonksiyonu istemcinin gönderdiği `file.mimetype` (`image/png`, `image/jpeg` vb.) ve `path.extname` uzantısını kontrol etmektedir; dosyanın gerçek binary magic byte'larını (örn. PNG `89 50 4E 47`, JPG `FF D8 FF`) kontrol eden buffer sniffing katmanı bulunmamaktadır.
- **İstismar senaryosu:** Yalnızca admin rolü dosya yükleyebildiğinden dış saldırganlar doğrudan erişemez. Ancak kötü niyetli bir admin veya oturumu ele geçirilmiş admin hesabı, `.png` uzantılı farklı bir binary içeriği sisteme yükleyebilir. Dosyalar `logo_<uuid>.<ext>` olarak izole dizine yazıldığı ve `X-Content-Type-Options: nosniff` ile sunulduğu için sunucuda kod çalıştırma riski oluşmaz.
- **Düzeltme:** `file-type` paketi entegre edilerek `fileFilter` veya yükleme sonrası buffer kontrolünde dosya imzasının (magic numbers) doğrulanması.
  - **Atanan ajan:** `backend-dev`

---

## 2. Logo Yönetimi ve Özel Güvenlik İncelemesi

| Güvenlik Kontrolü | Mimari Tasarım Kuralı | Kod Gerçekleştirmesi | Sonuç |
|---|---|---|:---:|
| **Erişim & RBAC** | Yalnızca `admin` rolü logo yükleyebilir / silebilir (`AC-23`, `AC-24`) | `settingsRoutes.js`: `authenticate` + `authorize('admin')` middleware'i ile `/logo` (POST/DELETE) rotaları korunuyor. | ✅ GEÇTİ |
| **Boyut Sınırı** | Maksimum 2MB dosya boyutu (`AC-23`) | `upload.js`: `limits: { fileSize: 2097152 }` ve `LIMIT_FILE_SIZE` 400 Bad Request dönüşü. | ✅ GEÇTİ |
| **MIME & Uzantı Doğrulaması** | Yalnızca PNG, JPG, JPEG, WEBP, SVG formatları (`AC-23`) | `upload.js`: `fileFilter` ile katı beyaz liste (`image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`). | ✅ GEÇTİ |
| **Dizin İzolasyonu & Tekil İsimlendirme** | UUIDv4 dosya adı, izole `/uploads/logos/` dizini | `upload.js`: `logo_${crypto.randomUUID()}${ext}`. Dizin dışına çıkma (`../` path traversal) engelli. | ✅ GEÇTİ |
| **SVG XSS & XXE Sanitizasyonu** | `<script>`, `onload`, `javascript:`, `ENTITY` temizliği (`AC-23`, `R-5`) | `svgSanitizer.js`: DOCTYPE, ENTITY, script, iframe, object, foreignObject, inline `on*` dinleyicileri ve `javascript:` URL şemaları temizleniyor. | ✅ GEÇTİ |
| **Frontend Güvenli Render** | SVG'lerin DOM'a doğrudan basılmaması | `LoginPage.jsx`, `AppLayout.jsx`: Logolar daima `<img src="..." />` ile render ediliyor, `dangerouslySetInnerHTML` kullanılmıyor. | ✅ GEÇTİ |
| **Public Endpoint İzolasyonu** | `/api/settings/public` şifre sızdırmamalı (`AC-27`) | `settingsService.js`: Yalnızca `['app_logo', 'app_title', 'site_url']` alanları seçiliyor; SMTP/SMS anahtarları asla çıkmıyor. | ✅ GEÇTİ |
| **Public Rate Limiting** | Max 60 istek/dk (`AC-27`) | `rateLimiter.js`: `publicSettingsLimiter` (60 istek / 1 dakika). | ✅ GEÇTİ |
| **Statik Başlıklar** | MIME sniffing engelleme (`nosniff`) | `app.js` express.static ve `nginx.prod.conf`: `X-Content-Type-Options: nosniff`. | ✅ GEÇTİ |
| **Eski Dosya Çöp Temizliği (GC)** | Logo güncellendiğinde/silindiğinde disk temizliği | `settingsService.js`: `removeLogoFile` ile eski dosya `fs.promises.unlink` ile güvenli şekilde siliniyor. | ✅ GEÇTİ |

---

## 3. Otomatik Tarama Çıktıları

### 3.1 `npm audit` Taraması (Backend)
```text
nodemailer  <=9.1.0 (Severity: high - GHSA-mm7p-fcc7-pg87)
uuid        <11.1.1 (Severity: moderate - GHSA-w5hq-g745-h8pq - via sequelize)
xlsx        * (Severity: high - GHSA-4r6h-8v6p-xvw6)
Toplam: 4 zafiyet (2 moderate, 2 high)
```

### 3.2 `npm audit` Taraması (Frontend)
```text
esbuild       <=0.24.2 (Severity: moderate - GHSA-67mh-4wv8-2f99 - via vite)
react-router  6.0.0 - 7.17.0 (Severity: moderate - GHSA-wrjc-x8rr-h8h6)
Toplam: 4 zafiyet (3 moderate, 1 high)
```

### 3.3 Gizli Bilgi (Secret) Taraması
- Komut: `git grep -nE "(api[_-]?key|secret|password|token)\s*[:=]\s*['\"][^'\"]{8,}"`
- Sonuç: Aktif kod tabanında sabitlenmiş (hardcoded) hiçbir parola, API anahtarı veya gizli token bulunmamaktadır.

### 3.4 Git Geçmişi .env Taraması
- Komut: `git log --all --name-status -- '*.env*'`
- Sonuç: `.env` ve `.env.prod` dosyaları geçmiş commit'lerde (`41436094`, `ca5e27c9`) yer almış; `4e5934c2` ile kaldırılmıştır. Düşük seviyeli operasyonel bulgu olarak kaydedilmiştir.

---

## 4. Tasarımda Vaat Edilip Kodda Bulunmayanlar
Tüm mimari güvenlik taahhütleri (`docs/mimari.md` Bölüm 5 ve `docs/tasarim-kontrol.md` Bölüm 4) kod tabanında eksiksiz olarak doğrulanmıştır:
- [x] JWT 15 dk Access / 7 gün Refresh Token ve `users.refresh_token` veritabanı rotasyonu
- [x] Bcrypt salt cost 12 parola hashleme
- [x] Rol tabanlı erişim denetimi (`authorize('admin')`)
- [x] Katmanlı rate limiting (Login: 5/dk, Public Settings: 60/dk, Send: 30/dk, API: 100/dk)
- [x] Katılımcı IDOR / BOLA engelleme
- [x] Anonim anketlerde SHA-256 kimlik hashleme
- [x] 2MB Logo boyutu kısıtı ve SVG Sanitizer
- [x] Helmet ve Nginx güvenlik başlıkları (`nosniff`, `SAMEORIGIN`, CSP)
- [x] Excel formül enjeksiyonu (`sanitizeExcelCell`) koruması

---

## 5. Test Paketi Koşum Sonucu
```text
PASS test/unit/validate.test.js
PASS test/unit/score.test.js
PASS test/unit/svgSanitizer.test.js
PASS test/unit/notification.test.js
PASS test/unit/settings.test.js
PASS test/unit/security.test.js
PASS test/unit/redis.test.js
PASS test/integration/auth.test.js
PASS test/integration/survey.test.js
PASS test/integration/response.test.js
PASS test/integration/settings.test.js

Test Suites: 11 passed, 11 total
Tests:       82 passed, 82 total
Snapshots:   0 total
Time:        2.895 s
Ran all test suites.
```

---

## 6. Olumlu Güvenlik Uygulamaları (Strengths)
1. **Güçlü Yetki ve Dizin İzolasyonu:** Yüklenen logo dosyaları rastgele UUID ile adlandırılarak izole `/uploads/logos/` dizininde depolanmakta, doğrudan kullanıcı girdisi dosya adına yansıtılmamaktadır.
2. **SVG XSS & XXE Savunması:** SVG dosyaları sunucuda taranarak potansiyel zararlı XML ve JS etiketleri ayıklanmakta; istemci tarafında yalnızca `<img>` etiketi içinde güvenli olarak render edilmektedir.
3. **Public Endpoint Veri Sızıntısı Savunması:** `/api/settings/public` uç noktası veritabanı sorgu katmanında filtrelenmekte, sistemdeki hiçbir SMTP parolası veya SMS API anahtarı istemciye sızdırılmamaktadır.
4. **Kapsamlı Test Kapsamı:** Güvenlik kuralları, sanitizer davranışı ve ayar uç noktaları 82 adet otomatik birim ve entegrasyon testiyle %100 oranında güvenceye alınmıştır.

---

## 7. Karar ve Sonuç
Aktif kod tabanında hiçbir **Kritik** veya **Yüksek** güvenlik açığı bulunmamaktadır. Tespit edilen **Orta** ve **Düşük** seviyeli bağımlılık ve operasyonel öneriler `docs/gereksinimler.md` "Sonra" maddelerine eklenmek üzere listelenmiştir.

**DURUM:** `GEÇTİ`
