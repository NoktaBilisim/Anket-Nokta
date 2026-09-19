# ADR 0005: Kurumsal Marka ve Dinamik Logo Yönetimi

- **Durum**: Kabul Edildi
- **Tarih**: 2026-09-19
- **Karar Verici**: Mimar

## 1. Bağlam
SurveyPro'nun kurumsal müşteriler tarafından kendi marka kimlikleriyle kullanılabilmesi (white-labeling/branding) gerekmektedir. İşletmelerin giriş ekranında (`/login`), yönetim paneli kenar çubuğunda (`AppLayout` Desktop Sidebar) ve mobil üst başlık barında kendi logolarını ve kurum başlıklarını görebilmesi talep edilmektedir. Ayrıca sistem yöneticisinin (`admin`) dilediğinde özel logoyu kaldırıp varsayılan Truguard kurumsal logosuna kesintisiz dönebilmesi (`AC-24`) ve giriş ekranı gibi yetkisiz sayfaların bu marka bilgilerine güvenli ve hızlı erişebilmesi (`AC-27`) gerekmektedir.

## 2. Karar
1. **Veri Modeli**:
   - `settings` tablosunda `app_logo` (TEXT, yüklenen logo URL'si veya göreceli dosya yolu `/uploads/logos/...`) ve `app_title` (STRING, sistem/kurum başlığı, varsayılan `'SurveyPro'`) anahtarları kullanılacaktır.
   - Özel logo tanımlı değilse (`app_logo` boş/null), sistem varsayılan Truguard logosunu (`Truguard_logo.png`) fallback olarak render edecektir.
2. **API Tasarımı**:
   - `GET /api/settings/public`: Kimlik doğrulama gerektirmeyen (Public), hassas alanları filtreleyen, yalnızca `{ app_logo, app_title, site_url }` payload'ı dönen yüksek hızlı (<100ms) uç nokta.
   - `POST /api/settings/logo`: Yalnızca `admin` rolünün erişebildiği, `multipart/form-data` ile gelen görsel dosyasını doğrulayan, tekil UUID dosya adıyla kaydeden ve `settings.app_logo` alanını güncelleyen uç nokta.
   - `DELETE /api/settings/logo`: Yalnızca `admin` rolünün erişebildiği, özel logoyu silip `settings.app_logo` değerini sıfırlayan ve önceki dosyayı diskten temizleyen uç nokta.
3. **Depolama ve Statik Sunum**:
   - Yüklenen logolar backend sunucusunda güvenli `/uploads/logos/` dizininde saklanacaktır.
   - Docker Compose ve prodüksiyonda `/uploads` dizini kalıcı Docker volume (`uploads_data:/app/uploads`) olarak bağlanacaktır.
   - Express static middleware (`app.use('/uploads', express.static(...))`) ve Nginx prod yapılandırması ile optimize statik dosya sunumu sağlanacaktır.
4. **Güvenlik Standartları**:
   - Maksimum dosya boyutu 2MB (`limits: { fileSize: 2 * 1024 * 1024 }`).
   - İzin verilen MIME tipleri: `image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`.
   - SVG Güvenliği: SVG dosyaları sunucu tarafında `<script>`, `onload`, `javascript:` gibi zararlı XSS vektörlerine karşı sanitize edilecek; istemcide inline SVG yerine daima izole `<img>` etiketi ile render edilecektir.
5. **Frontend Durum Yönetimi (Zustand)**:
   - `brandingStore.js` adında bağımsız bir Zustand store oluşturulacak; uygulama başlangıcında (`App.jsx`) `GET /api/settings/public` çağrılarak marka bilgileri hafızaya alınacaktır.
   - Tarayıcı önbellek sorunlarını (stale cache) önlemek için logo URL'sine `?v=timestamp` cache-busting parametresi eklenecektir.

## 3. Alternatifler
- **Base64 String DB Depolama**: Logo verisinin doğrudan veritabanında base64 formatında `settings.value` olarak saklanması.
  - *Reddedilme Nedeni*: 2MB bir görsel base64'e çevrildiğinde ~2.7MB olur. Bu durum her `/api/settings` ve `/api/settings/public` sorgusunda veritabanı I/O ve ağ bant genişliğini gereksiz şişirir; tarayıcının HTTP caching mekanizmalarından yararlanmasını engeller.
- **Harici S3 / Cloud Storage**: Logoların AWS S3 veya MinIO üzerinde tutulması.
  - *Reddedilme Nedeni*: Tek kurumsal dağıtım (on-premise / dedicated VM) modeli için harici bulut bağımlılığı mimariyi gereksiz karmaşıklaştırır. Kalıcı Docker volume ile yerel dosya depolama daha yalın ve güvenilirdir.

## 4. Sonuçlar
- **Olumlu**:
  - Hızlı ve ölçeklenebilir marka yönetimi.
  - Public endpoint sayesinde giriş ekranı dahil tüm arayüzlerde anında dinamik kurumsal kimlik.
  - Fallback mekanizmasıyla kırık görsel/logo riski sıfıra indirilmiştir.
  - XSS ve DoS risklerine karşı katmanlı güvenlik (2MB limit, MIME kontrolü, SVG sanitization).
- **Olumsuz / Kısıt**:
  - Çok kiracılı (multi-tenant) logo desteği bu sürümde yoktur; kurum geneli tek logo geçerlidir.
  - Docker deployment'ında `uploads_data` volume tanımlaması zorunludur.
