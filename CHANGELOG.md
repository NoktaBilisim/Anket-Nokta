# Changelog — SurveyPro

Tüm önemli değişiklikler bu dosyada Keep a Changelog standardına uygun olarak belgelenmektedir.

---

## [1.1.0] - 2026-09-19

### 🚀 Yeni Özellikler (Kabul Kriterleri AC-23 .. AC-27)
- **Kurumsal Marka ve Dinamik Logo Yönetimi (White-Labeling):**
  - Yönetim panelinden PNG, JPG, JPEG, WebP ve SVG formatında dinamik kurum logosu yükleme ve önizleme desteği (`POST /api/settings/logo`).
  - Multer middleware ile 2MB dosya boyutu sınırı ve katı MIME türü denetimi (`image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`).
  - Özel logo yüklendiğinde veya silindiğinde eski dosyanın sunucu diskinden otomatik temizlenmesi (Garbage collection).
  - Tek tıkla onaylı modal ile varsayılan Truguard kurumsal logosuna anında geri dönüş (`DELETE /api/settings/logo`).
  - Hızlı ve izole genel ayarlar API uç noktası (`GET /api/settings/public`, SLA < 100ms), kimlik doğrulama gerektirmeden yalnızca `{ app_logo, app_title, site_url }` döner ve hassas bilgileri sızdırmaz.
- **Frontend Durum Yönetimi ve Arayüz Uyarlaması:**
  - Zustand tabanlı `brandingStore.js` global durum deposu eklendi; logo ve başlık değişiklikleri tüm uygulamaya anında reaktif yansıtılır.
  - Cache-busting (`?t=timestamp`) mekanizması ile logo güncellemelerinde tarayıcı önbelleği sorunları giderildi.
  - Giriş ekranı (`/login`), masaüstü sol kenar çubuğu (`Sidebar` - max-h-12 / 48px), mobil üst bar (`Mobile Header` - max-h-9 / 36px) ve katılımcı anket sayfası (`/survey/:token`) dinamik logo ve başlık ile donatıldı.
  - Kırık görsel bağlantılarına karşı `onError` fallback desteği ile kesintisiz Truguard logosu gösterimi sağlandı.

### 🛡 Güvenlik ve Uyumluluk
- **Sunucu Tarafı SVG XSS / XXE Temizleyici (`svgSanitizer.js`):**
  - Yüklenen SVG dosyalarındaki `<script>`, `<iframe>`, `<object>`, `<embed>`, `<foreignObject>` etiketleri kaldırıldı.
  - Inline olay dinleyicileri (`onload`, `onerror`, `onclick` vb.) ve `javascript:`, `data:text/html` URI şemaları nötralize edildi.
  - XML External Entity (XXE) ve DoS saldırılarını önlemek amacıyla `<!DOCTYPE>` ve `<!ENTITY>` blokları tamamen temizlendi.
- **Hız Sınırlaması (Rate Limiting):** Genel ayarlar uç noktası için dakikada IP başına 60 istek sınırı (`publicSettingsLimiter`) eklendi.
- **Denetim İzi (Audit Logging):** Logo yükleme (`logo_uploaded`) ve logo sıfırlama (`logo_deleted`) işlemleri `activity_logs` tablosuna kaydedildi.

### ⚡ Mimari, Altyapı ve Testler
- **Mimari Karar Kaydı:** Dinamik logo ve marka yönetimi için `docs/adr/0005-kurumsal-marka-ve-dinamik-logo-yonetimi.md` eklendi.
- **Docker Kalıcı Depolama:** Yüklenen kurum logolarının korunması için kalıcı `uploads_data` volume tanımlandı (`/app/uploads/logos`).
- **Ortam Değişkenleri:** `.env.example` dosyasına kurumsal marka ve yükleme değişkenleri (`APP_TITLE`, `APP_LOGO`, `UPLOAD_DIR`, `MAX_LOGO_SIZE_MB`) eklendi.
- **Genişletilmiş Test Paketi:**
  - Yeni birim testleri: `svgSanitizer.test.js`, `settings.test.js`
  - Yeni entegrasyon testleri: `settings.test.js`
  - Toplam test kapsamı **11 test suite ve 82 birim/entegrasyon testine** çıkarıldı (%100 başarı oranı).

---

## [1.0.0] - 2026-09-19

### 🚀 Yeni Özellikler (Kabul Kriterleri AC-1 .. AC-22)
- **5 Soru Tipi Desteği:** Tekli seçim, çoklu seçim, Likert matris soru tipi, metin, puanlama (1-10) ve evet/hayır soruları eklendi.
- **Sürükle-Bırak Form Editörü:** HTML5 Drag & Drop ile soru sırasını anında değiştirme ve anlık maksimum puan göstergesi.
- **Çok Kanallı Bildirim Altyapısı:**
  - Truguard kurumsal logolu responsive HTML e-posta şablonu.
  - Nokta Bilişim SMS API entegrasyonu ve telefon numarası normalizasyonu.
  - WhatsApp Gateway API entegrasyonu (15 sn zaman aşımı korumalı).
  - Ayarlar sayfasından test bildirimleri gönderme uçları.
- **Gelişmiş Analitik ve Raporlama:**
  - 4 temel metrik kartı (Gönderilen, Tamamlanan, Katılım Oranı %, Ortalama Puan).
  - Kategori başarı göstergeleri (≥75% Yeşil, ≥50% Sarı, <50% Kırmızı).
  - Katılımcı sıralaması ve ilk üç dereceye 🥇, 🥈, 🥉 madalya rozetleri.
  - 5 sekmeli Excel dışa aktarımı.
- **Katılımcı Deneyimi (Take Survey):**
  - Tek kullanımlık benzersiz token erişimi.
  - 20'şerli soru sayfalama ve doldurulmayan matris satırları için anlık uyarı.
  - Tekil gönderim garantisi (Single submission guard).
  - Yanıtlama süresi ölçümü (`duration_seconds`).
  - Anonim anketlerde SHA-256 kimlik gizleme.

### 🛡 Güvenlik ve Dayanıklılık İyileştirmeleri
- **Privilege Escalation Koruması:** `/api/auth/register` ucu katılımcı (`participant`) rolüyle sınırlandırıldı.
- **IDOR / BOLA Savunması:** Anket detay, rapor ve Excel indirme uçlarında sahiplik ve katılımcı atama denetimi eklendi.
- **Formula Injection Koruması:** Excel dışa aktarımında `=`, `+`, `-`, `@`, `\t`, `\r` karakterleri tek tırnakla sterilize edildi.
- **Rate Limiting:** Genel API (100 req/dk), Login (5 req/15dk) ve Çok Kanallı Gönderim (30 req/1dk) hız sınırlaması uygulandı.
- **Hata Maskeleme:** Üretim ortamında PostgreSQL/Sequelize iç hata detaylarının istemciye sızması engellendi.
- **Hassas Ayar Maskeleme:** SMS API anahtarı ve SMTP parolaları `••••••••` olarak maskelendi.
- **Nginx & Header Güvenliği:** CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy ve Permissions-Policy başlıkları eklendi.
- **Git Gizli Bilgi İzolasyonu:** `.env` ve `.env.prod` dosyaları git index'inden temizlendi.

### ⚡ Performans ve Mimari
- **Redis Cache:** Raporlama sorguları 300s TTL ile önbelleğe alındı, anket değişikliklerinde otomatik cache invalidation eklendi.
- **ACID Transaction:** Anket oluşturma, soru ekleme ve yanıt kayıt işlemleri `sequelize.transaction` ile atomik hale getirildi.
- **Frontend 5 UI Durumu:** Tüm sayfalarda Skeleton loading, empty states, error retry ve validation feedback'leri uygulandı.
- **Test Kapsamı:** 8 test suite ve 61 birim/entegrasyon testi ile %100 test başarı oranı sağlandı.
