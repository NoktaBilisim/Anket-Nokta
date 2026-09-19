# Gereksinimler — SurveyPro (Anket Yönetim Sistemi)
Tarih: 2026-09-19   Durum: ONAYLI

## 1. Amaç ve İş Değeri
SurveyPro, kurumların çalışanlarına, paydaşlarına ve müşterilerine yönelik anketleri kolayca tasarlamasını, çoklu dağıtım kanalları (E-posta, SMS, WhatsApp) üzerinden hedef kitleye ulaştırmasını, yanıtları puanlama ve kategori bazlı analiz modelleriyle gerçek zamanlı olarak ölçümlemesini sağlayan kurumsal bir anket yönetim platformudur. Sistem, değerlendirme süreçlerindeki manuel iş yükünü ortadan kaldırarak karar vericilere ayrıntılı raporlar, kategori bazlı başarı analitiği ve Excel çıktıları sunar. Kurumsal kimlik ve logo yönetimi modülü sayesinde işletmeler, giriş ekranından yönetim paneline kadar tüm arayüzleri kendi kurumsal markalarıyla özelleştirebilirler.

## 2. Kullanıcılar / Roller
| Rol | Tanım ve Yetki Kapsamı |
|---|---|
| **Admin** | Sistem yöneticisi. Tüm anketleri, kullanıcıları, sistem ve entegrasyon ayarlarını (SMTP, SMS, WhatsApp), kurumsal logo/marka yönetimini, aktivite loglarını yönetir ve tüm raporlara erişir. |
| **Creator** (Anket Yöneticisi) | Anket tasarlayan, soruları ve puanlama/kategori kurallarını oluşturan, anketleri hedef kitleye gönderen ve kendi oluşturduğu anketlerin raporlarını inceleyen kullanıcı. |
| **Evaluator** (Değerlendirici) | Kendisine atanan veya sistemdeki aktif anketlerin raporlarını, katılımcı puanlarını ve kategori analizlerini inceleyen kullanıcı (anket düzenleyemez). |
| **Participant** (Katılımcı) | Kendisine özel token linki veya sisteme giriş yaparak anketleri yanıtlayan son kullanıcı. |

## 3. Kapsam

### Kapsamda
1. **Gelişmiş Anket ve Soru Editörü**:
   - 5 farklı soru tipi: Çoktan Seçmeli (`multiple_choice`), Açık Uçlu Metin (`text`), 1-10 Puanlama (`rating`), Evet/Hayır (`yes_no`), Matris/Tablo (`matrix`).
   - Soru ve seçenek bazlı puanlama desteği (seçenek puanı, matris sütun puanı, rating puanı).
   - Soru bazında Kategori atama (`category`) ve canlı kategori grup göstergesi.
   - Sürükle-Bırak (HTML5 Drag & Drop) ile soruların görsel sırasını değiştirme.
   - Matris sorular için hızlı ölçek şablonları (5'li Likert, Memnuniyet, Sıklık, Evet/Hayır).
   - Canlı anket maksimum puan hesabı.
2. **Çok Kanallı Dağıtım & Bildirim Entegrasyonu**:
   - Tekil güvenlik token'ı (`UUIDv4`) ile anket hedefleme.
   - E-posta Gönderimi: Nodemailer SMTP entegrasyonu, Truguard kurumsal logolu duyarlı HTML e-posta şablonu.
   - SMS Gönderimi: Nokta Bilişim SMS Gateway API entegrasyonu (`external/send-sms`), başlık ve numara normalizasyonu.
   - WhatsApp Gönderimi: Nokta Bilişim WhatsApp API entegrasyonu (`send-message`).
   - Yönetim panelinden SMTP, SMS ve WhatsApp canlı bağlantı/test mesajı gönderme fonksiyonları.
3. **Kullanıcı Dostu Anket Doldurma Deneyimi**:
   - Token tabanlı şifresiz, güvenli web arayüzü (`/survey/:token`).
   - 20'şerli soru sayfalaması (Pagination), sayfa ilerleme çubuğu, sayfa bazlı zorunlu alan doğrulamaları.
   - Matris sorularda eksik satır kontrolü ve anlık görsel geri bildirim.
   - Süre ölçümü (başlama ve tamamlama arasındaki süre kaydı).
   - Anonim anketlerde SHA-256 kullanıcı hash'leme ile kimlik gizliliği.
   - Mükerrer gönderim engelleme (tek seferlik tamamlama kısıtı).
4. **Analitik, Puanlama ve Raporlama**:
   - Gerçek zamanlı katılım metrikleri (Gönderilen, Tamamlanan, Katılım Oranı, Ortalama Puan).
   - 4 sekmeli analitik görünümü:
     - **Soru Analizi**: Recharts grafikleri, seçenek seçilme ve puan toplamları, matris madde kırılımları, açık uçlu yanıtlar.
     - **Puan Özeti**: Soru bazında toplanan toplam/ortalama puan tablosu ve genel toplam.
     - **Kategori Analizi**: Kategori bazlı puan barları, başarı yüzdeleri ve katılımcı kategori puan matrisi.
     - **Kişi Puanları**: Katılımcı başarı sıralaması (🥇, 🥈, 🥉 madalyalar), tamamlanma süresi, soru bazlı puan dökümü.
   - Excel Export: Yanıtları ve soru puanlarını içeren `.xlsx` dosya aktarımı.
5. **Yönetim ve Güvenlik**:
   - JWT tabanlı oturum yönetimi (Access + Refresh Token), bcrypt parola şifreleme.
   - Entegrasyon ayarları paneli (maskelenmiş API key/şifre güvenliği).
   - IP adresi ve aksiyon bazlı aktivite denetim logları (`ActivityLog`).
   - Docker & Nginx Production ortam desteği (`docker-compose.prod.yml`, `deploy.sh`).
6. **Dinamik Kurumsal Kimlik ve Logo Yönetimi**:
   - Sistem Ayarları (`/settings`) üzerinden kurumsal müşteri logosu yükleme ve güncelleme (PNG, JPG, JPEG, SVG, WebP formatları, maksimum 2MB dosya boyutu sınırı).
   - Yüklenen logonun arayüzde anında canlı önizlenmesi ve istenildiğinde tek tıkla varsayılan Truguard logosuna sıfırlanabilmesi ("Varsayılana Dön" aksiyonu).
   - Giriş sayfasında (`/login`) dinamik logo gösterimi (özel logo tanımlı değilse varsayılan Truguard logosu fallback).
   - Yönetim paneli sol gezinme menüsünde (`AppLayout` masaüstü sidebar ve mobil header) müşteri logosunun responsive ve kurumsal hiyerarşiye uygun konumlandırılması.
   - Kimlik doğrulaması gerektirmeyen `/api/settings/public` ucu ile giriş ekranı ve genel arayüzlerin logoyu ve site başlığını güvenli ve yüksek performansla çekebilmesi.

### Kapsam DIŞI (Açıkça)
1. **Anket İçi Dinamik Dal/Mantık (Skip Logic / Conditional Branching)**: Belirli bir yanıta göre sonraki soruları gizleme/atlama mantığı bu sürümde yoktur; tüm sorular sıra numarasına göre gösterilir.
2. **3. Parti OAuth / SSO Entegrasyonu**: Google, Microsoft Azure AD veya LDAP üzerinden kurumsal tek tıkla giriş kapsam dışıdır; yerel JWT e-posta/şifre doğrulaması kullanılır.
3. **Mobil Uygulama (Native iOS / Android)**: Ayrı bir mobil uygulama geliştirilmeyecektir; sistem mobil uyumlu (responsive web) olarak çalışır.
4. **Çok Dilli Anket Desteği (i18n Survey Content)**: Aynı anketin tek formda birden fazla dilde çeviri içerikleriyle sunulması bu sürümde yer almamaktadır; arayüz ve içerikler Türkçe odaklıdır.
5. **Kullanıcı/Departman Bazlı Çoklu Logo (Multi-Tenant White-Labeling)**: Farklı departman veya kullanıcılar için ayrı ayrı temalar ve logolar tanımlanması kapsam dışıdır; yüklenen logo sistem geneli için tek kurumsal logodur.
6. **Tarayıcı İçi Görsel Kırpıcı (Image Cropper / Editor)**: Logo yükleme sırasında görseli döndürme, kırpma veya filtre uygulama araçları kapsam dışıdır; yüklenen görsel CSS oran koruma (`object-contain`) kurallarıyla ölçeklenir.

## 4. Kullanıcı Hikâyeleri

- **US-1 (Anket Tasarımı)**: Bir **Creator** veya **Admin** olarak, çoktan seçmeli, puanlama, açık uçlu ve matris soru tipleriyle anketler oluşturabilmek, sorulara kategori ve puan tanımlayabilmek, soruların sırasını sürükle-bırak yöntemiyle değiştirebilmek istiyorum ki anketimi hatasız ve hızlıca kurgulayabileyim.
- **US-2 (Çok Kanallı Dağıtım)**: Bir **Creator** olarak, hazırladığım anketi sisteme kayıtlı katılımcılara E-posta (Truguard logolu şablon ile), SMS veya WhatsApp üzerinden tek tıkla gönderebilmek istiyorum ki katılımcılara en hızlı kanaldan ulaşabileyim.
- **US-3 (Entegrasyon Yönetimi ve Testi)**: Bir **Admin** olarak, SMTP sunucu bilgilerini, SMS Gateway API ve WhatsApp API uç noktalarını arayüzden tanımlayabilmek ve canlı test mesajı atarak çalıştığını doğrulayabilmek istiyorum ki bildirim gönderimlerinde kesinti yaşamayayım.
- **US-4 (Anket Yanıtlama ve Sayfalama)**: Bir **Participant** olarak, kendime özel güvenli bağlantı üzerinden kurumsal logolu arayüzde 20'şerli sayfalar halinde soruları kolayca doldurabilmek, eksik bıraktığım soruları anında görebilmek ve tek seferde yanıtlarımı kaydedebilmek istiyorum ki deneyimim kesintisiz ve net olsun.
- **US-5 (Raporlama ve Puan Sıralaması)**: Bir **Evaluator**, **Creator** veya **Admin** olarak, tamamlanan anketlerin katılım oranlarını, soru bazlı grafiklerini, kategori bazlı başarı yüzdelerini ve katılımcı sıralamasını listeleyebilmek, verileri Excel'e aktarabilmek istiyorum ki değerlendirme sonuçlarını kolayca analiz edip raporlayabileyim.
- **US-6 (Denetim İzi ve Loglama)**: Bir **Admin** olarak, anket oluşturma, güncelleme, gönderme ve yanıtlama gibi tüm kritik aksiyonları IP adresi ve zaman damgasıyla listeleyebilmek istiyorum ki sistem güvenliğini ve denetlenebilirliğini sağlayabileyim.
- **US-7 (Kurumsal Kimlik ve Logo Yönetimi)**: Bir **Admin** olarak, sistem ayarlarından kurumsal müşteri logosunu yükleyebilmek, değiştirebilmek ve gerektiğinde varsayılana sıfırlayabilmek istiyorum ki oturum açma sayfasında ve yönetim paneli sol menüsünde / mobil başlığında kurumumuzun kendi marka kimliği yer alsın.

## 5. Kabul Kriterleri (Ölçülebilir & Test Edilebilir)

### Anket Yönetimi ve Editör
- **AC-1**: Anket başlığı girilmeden anket kaydı yapılmak istendiğinde sistem işlemi durdurmalı ve istemcide "Anket başlığı gerekli" uyarısı göstermelidir.
- **AC-2**: Soru editöründe sürükle-bırak (Drag & Drop) işlemi yapıldığında soruların `order` indeksleri anında güncellenmeli ve kaydetme işleminde veritabanına `0..N` artan sırada yazılmalıdır.
- **AC-3**: Çoktan seçmeli, Evet/Hayır ve Matris sorularında tanımlanan seçenek puanları toplandığında, editörün sağ üst köşesindeki "Maks. puan" kartı toplam puanı anlık ve doğru olarak hesaplayıp göstermelidir.
- **AC-4**: Matris soru tipinde satır veya sütun eklendiğinde/silindiğinde tablo önizlemesi ve puan hesaplaması gecikmesiz olarak arayüze yansımalıdır.
- **AC-5**: Sorulara atanan kategoriler üst başlıkta adetleriyle birlikte etiket (badge) olarak listelenmeli ve yeni soru eklenirken mevcut kategoriler otomatik tamamlama (`datalist`) ile önerilmelidir.

### Bildirim ve Dağıtım
- **AC-6**: Anket gönderiminde seçilen her kullanıcı için tekil `UUIDv4` token'ı içeren bir `SurveyTarget` kaydı oluşturulmalı veya mevcut kayıt güncellenmelidir.
- **AC-7**: E-posta gönderiminde sistemde tanımlı `site_url` ve `/Truguard_logo.png` görselini içeren duyarlı HTML e-posta şablonu alıcının e-posta adresine iletilmelidir.
- **AC-8**: SMS gönderiminde telefon numarasındaki boşluk, parantez ve `+` karakterleri temizlenerek Nokta Bilişim SMS API'sine (`POST /api/external/send-sms`) doğru formatta gönderilmelidir.
- **AC-9**: WhatsApp gönderiminde mesaj metni anket başlığı, açıklaması ve erişim linkini içerecek şekilde Nokta Bilişim WhatsApp API'sine (`POST /send-message`) iletilmelidir.
- **AC-10**: Sistem Ayarları sayfasından yapılan "Test E-posta", "Test SMS" ve "Test WhatsApp" istekleri başarılı olduğunda 3 saniye içinde yeşil bildirim toast'ı, hata durumunda ise açık hata mesajı dönmelidir.
- **AC-11**: Sistem Ayarları API'si (`GET /api/settings`) çağrıldığında hassas alanlar (`smtp_pass`, `sms_api_key`) maskelenmiş (`••••••••`) olarak dönmelidir.

### Anket Doldurma (Katılımcı Arayüzü)
- **AC-12**: Katılımcı linke tıkladığında (`/survey/:token`) ilk erişimde `SurveyTarget.opened_at` alanı o anki UTC zaman damgasıyla güncellenmelidir.
- **AC-13**: 20'den fazla soru içeren anketlerde sorular 20'şerli sayfalara bölünmeli ve katılımcı sayfadaki tüm zorunlu soruları doldurmadan "Sonraki Sayfa" veya "Anketi Tamamla" butonuna basarak ilerleyememelidir.
- **AC-14**: Matris sorularında zorunlu alan tanımlıysa, ilgili matrisin tüm satırları işaretlenmeden sayfa tamamlanmış sayılamaz ve doldurulmamış satır sayısı uyarı olarak gösterilmelidir.
- **AC-15**: Daha önce tamamlanmış bir anket linkine tekrar tıklandığında sistem "Bu anketi zaten doldurdunuz" hata ekranı döndürmeli ve mükerrer yanıt kaydını engellemelidir.
- **AC-16**: Süresi dolmuş (`expires_at < now`) veya durumu `active` olmayan anketlerde anket formuna erişim engellenmeli ve "Anket süresi doldu / Anket aktif değil" uyarısı verilmelidir.
- **AC-17**: Anonim işaretlenmiş anketlerde `responses` tablosundaki `user_id` alanı `NULL` bırakılmalı ve katılımcı kimliği SHA-256 ile hash'lenerek `user_hash` kolonuna yazılmalıdır.
- **AC-18**: Yanıt gönderildiğinde katılımcının anketi açtığı an ile gönderdiği an arasındaki süre hesaplanarak `duration_seconds` alanına tamsayı saniye olarak kaydedilmelidir.

### Raporlama ve Dışa Aktarma
- **AC-19**: Rapor sayfasında (`/surveys/:id/report`) Gönderilen, Tamamlanan, Katılım Oranı (%) ve Ortalama Puan metrikleri maksimum 1 saniye içinde yüklenmelidir.
- **AC-20**: Kategori Analizi sekmesinde her kategoriye ait toplanan puan, o kategorinin maksimum puanına oranlanarak yüzde barı ve renk kodlamasıyla (≥75% yeşil, ≥50% sarı, <50% kırmızı) gösterilmelidir.
- **AC-21**: Kişi Puanları sekmesinde katılımcılar toplam puanlarına göre azalan sırada dizilmeli, ilk 3 dereceye madalya simgeleri (🥇, 🥈, 🥉) atanmalıdır.
- **AC-22**: "Excel'e Aktar" butonuna tıklandığında anket sorularını, katılımcı yanıtlarını ve soru puanlarını içeren `.xlsx` dosyası indirilmeli ve Türkçe karakterler bozulmadan UTF-8 uyumlu açılmalıdır.

### Kurumsal Kimlik ve Logo Yönetimi
- **AC-23**: Sistem Ayarları (`/settings`) sayfasında Logo Yükleme / Değiştirme alanı bulunmalı; PNG, JPG, JPEG, SVG ve WebP formatları haricindeki dosyalarda veya 2MB'ı aşan dosyalarda istemcide ve sunucuda anında doğrulama hatası (`400 Bad Request`) dönerek işlem engellenmelidir.
- **AC-24**: Logo yüklendiğinde Sistem Ayarları ekranında anında canlı görsel önizleme sunulmalı; "Varsayılana Dön" (Sıfırla) butonuna basıldığında özel logo kaldırılarak sistem orijinal Truguard logosuna geri dönmeli ve veritabanındaki `custom_logo_url` ayarı temizlenmelidir.
- **AC-25**: Giriş sayfasında (`/login`) müşteri logosu dinamik olarak en üstte ortalanmış şekilde gösterilmeli; özel logo yüklenmemişse sistem varsayılan Truguard logosunu fallback olarak kesintisiz göstermelidir.
- **AC-26**: Yönetim panelinde (`AppLayout` bileşeninde), masaüstü sol kenar çubuğunun (Sidebar) en üstünde ve mobil üst başlık barında müşteri logosu kurumsal hiyerarşiye uygun, taşma yapmadan (maksimum yükseklik masaüstünde 48px, mobilde 36px) ve responsive olarak görüntülenmelidir.
- **AC-27**: Kimlik doğrulaması gerektirmeyen genel ayar API ucu (`GET /api/settings/public`), hassas entegrasyon parametrelerini (şifre, anahtar, e-posta kullanıcıları vb.) filtreleyerek yalnızca güvenli genel alanları (`logo_url`, `app_name`, `site_url`) < 100 ms içinde döndürmelidir.

## 6. Fonksiyonel Olmayan Gereksinimler

- **Performans**: 
  - Anket doldurma sayfası yüklenme süresi (LCP) < 1.5 saniye olmalıdır.
  - Genel ayarlar ve logo getirme API ucu (`GET /api/settings/public`) yanıt süresi < 100 ms olmalıdır.
  - Yüklenen statik logo dosyaları tarayıcı önbelleğinde (`Cache-Control: public, max-age=86400`) tutulmalı ve cache-busting parametresi (`?v=timestamp`) ile yönetilmelidir.
  - 1.000 katılımcılı ve 50 sorulu bir anketin rapor hesaplaması ve Excel çıktısı üretimi < 2.0 saniyede tamamlanmalıdır.
  - Backend API uç noktaları yanıt süresi ortalama < 200 ms olmalıdır.
- **Güvenlik**:
  - Şifreler bcrypt algoritması ile minimum cost faktörü 12 kullanılarak hash'lenmelidir.
  - Dosya yükleme güvenliği: Yüklenen logo dosyalarında dosya uzantısı ve MIME türü (magic bytes) kontrol edilmeli; SVG dosyalarında zararlı script enjeksiyonuna (XSS) karşı yalnızca güvenli `<img>` render yaklaşımı kullanılmalı veya sunucu tarafında sanitize edilmelidir.
  - Dosya boyutu sınırı: Maksimum dosya boyutu 2MB olarak sunucu (multer/body-parser) ve istemci katmanında zorunlu tutulmalıdır.
  - API uç noktaları rate limiter ile brute-force saldırılarına karşı korunmalıdır (dakikada max 100 istek, auth ve public ayar uçlarında max 20 istek).
  - Ayarlar tablosunda tutulan SMS API anahtarı ve SMTP parolaları istemciye asla açık metin olarak gönderilmemeli, `public` ucundan kesinlikle izole edilmelidir.
- **Erişilebilirlik ve Arayüz (UI/UX)**:
  - Form alanları, seçenek butonları ve matris hücreleri mobil cihazlarda dokunmatik hedeflere (min 44x44px) uygun olmalıdır.
  - Kurumsal logo alanlarında erişilebilirlik için anlamlı `alt` etiketleri (`alt="Kurum Logosu"` veya `alt="SurveyPro"`) tanımlanmalıdır.
  - Tüm sayfalarda Yükleniyor (Loading), Boş (Empty), Hata (Error) ve Başarılı (Success) durumları ele alınmış olmalıdır.
- **Veri Bütünlüğü ve Depolama**:
  - Yüklenen logo dosyaları sunucuda güvenli `/uploads/logos/` dizininde tekil UUID dosya adlarıyla (`logo_<uuid>.<ext>`) saklanmalı; eski logo silindiğinde/güncellendiğinde artık dosya temizliği yapılmalıdır.
  - PostgreSQL veritabanında ilişkisel sorgular ve indeksler (`survey_id`, `user_id`, `token`) optimize edilmiş olmalıdır.
- **Operasyon ve Yayınlama**:
  - Docker Compose ortamında `/uploads` dizini kalıcı Docker volume (`uploads_data:/app/uploads`) olarak bağlanarak konteyner yeniden başlatmalarında veri kaybı önlenmelidir.
  - Üretim sunucusuna dağıtım `deploy.sh` scripti ile sıfır kesintiye yakın şekilde rsync + docker compose up --build ile gerçekleştirilebilmelidir.

## 7. Varsayımlar
1. SMS gönderimleri için Nokta Bilişim SMS Gateway servisinin (`http://smsportal.noktabilisim.net:3001`) aktif ve tanımlı API anahtarına sahip olduğu varsayılmaktadır.
2. WhatsApp gönderimleri için Nokta Bilişim WhatsApp servisinin (`http://whatsapp.noktabilisim.net:3000`) bağlı oturuma sahip olduğu varsayılmaktadır.
3. Katılımcıların sisteme geçerli formatta e-posta adresi veya başında 0/90 bulunan geçerli Türkiye telefon numarası ile kayıtlı olduğu varsayılmaktadır.
4. Anket katılımcılarının ve sistem yöneticilerinin standart modern web tarayıcılarını (Chrome, Firefox, Safari, Edge güncel sürümleri) kullandığı varsayılmaktadır.
5. Özel bir logo yüklenmediğinde sistemin varsayılan Truguard logosunu (`frontend/src/assets/Truguard_logo.png`) kullanacağı varsayılmıştır.
6. Yüklenen logonun tüm sistem genelinde tek bir kurumsal marka kimliği olarak geçerli olacağı ve çok kiracılı (multi-tenant) logo ayrıştırması gerektirmediği varsayılmıştır.

## 8. Riskler ve Açık Sorular

| No | Risk / Açık Soru | Etki | Olasılık | Sahibi | Azaltma Planı |
|---|---|---|---|---|---|
| **R-1** | SMS / WhatsApp Gateway API servislerinin geçici olarak yanıt vermemesi veya zaman aşımı | Yüksek | Orta | DevOps / Backend | İsteklere 15 saniyelik `AbortSignal.timeout` konulmuştur; başarısız gönderimler kullanıcı bazında raporlanır ve loglanır. |
| **R-2** | SMTP sunucusunun toplu gönderimlerde IP/gönderim kotasına takılması veya spam filtresine düşmesi | Yüksek | Düşük | Sistem Yöneticisi | Kurumsal SMTP sunucu IP'sinin SPF, DKIM ve DMARC kayıtlarının doğrulanması gerekmektedir. |
| **R-3** | Çok yüksek soru sayılı (100+ soru) anketlerde istemci tarafında yanıtların kaybolma riski | Orta | Düşük | Frontend Dev | 20'şerli sayfalama ile DOM hafifletilmiştir; ileride her sayfa geçişinde taslak yanıtları yerel hafızaya (`localStorage`) kaydetme özelliği eklenecektir. |
| **R-4** | Çok büyük anketlerde (10.000+ yanıt) Excel export işleminin bellek tüketimi | Orta | Düşük | DBA / Backend | Şu anki hacimde bellek içi XLSX kütüphanesi yeterlidir; 50.000+ yanıt seviyesine ulaşıldığında streaming Excel (`exceljs` stream) mimarisine geçilecektir. |
| **R-5** | SVG logo yüklemelerinde XSS (Script Injection) güvenlik açığı riski | Yüksek | Orta | Guvenlik / Backend | Yüklenen SVG dosyaları sunucu tarafında doğrulanacak; istemcide doğrudan DOM'a gömülmeden (inline SVG yerine) izole `<img>` etiketi ile render edilecektir. |
| **R-6** | Büyük boyutlu veya geçersiz dosya yüklemelerinin disk/bant genişliği tüketmesi | Orta | Düşük | Backend Dev | Sunucu tarafında `multer` dosya boyutu (max 2MB) ve MIME tipi kısıtlaması uygulanacak; geçersiz dosyalar anında reddedilecektir. |
| **R-7** | Logo güncellendiğinde tarayıcı önbelleği (cache) sebebiyle eski logonun görünmeye devam etmesi | Düşük | Orta | Frontend Dev | Logo URL'si veya frontend state güncellemesinde zaman damgası / hash parametresi (`?v=...`) kullanılarak cache busting sağlanacaktır. |

## 9. Tasarım Kontrol Listesi Kararları

`~/.claude/checklists/tasarim-kontrol-listesi.md` maddeleri doğrultusunda proje kararları:

| Bölüm & Konu | Karar | Gerekçe & Detay |
|---|---|---|
| **1.1 Kimlik Doğrulama** | **Kapsamda** | JWT (Access + Refresh Token) ve bcrypt hash ile e-posta/şifre doğrulaması devrededir. |
| **1.2 2FA / SSO Entegrasyonu** | **Sonra** | İlk sürüm kurumsal iç kullanım ve token tabanlı anket dağıtımı için yeterlidir; SSO sonraki fazda değerlendirilecektir. |
| **1.3 Yetkilendirme (RBAC)** | **Kapsamda** | 4 rol (`admin`, `creator`, `evaluator`, `participant`) endpoint seviyesinde `authorize()` middleware ile denetlenmektedir. Logo ve sistem ayarlarını yönetme yetkisi yalnızca `admin` rolüne aittir. |
| **2.1 Veri Modeli Standartları** | **Kapsamda** | `created_at`, `updated_at`, UUID birincil anahtarlar, JSONB seçenek yapıları ve ilişkisel tablolar Sequelize ile tanımlanmıştır. |
| **2.2 Soft Delete Stratejisi** | **Sonra** | Anket silme işlemleri doğrudan hard delete olarak yapılmakta ve `activity_logs` kaydı tutulmaktadır; arşivleme durumu (`status: 'archived'`) mevcuttur. |
| **2.4 Dosya / Ek Yönetimi** | **Kapsamda** | Müşteri logosu yükleme için yerel dosya depolama (`/uploads/logos/`), max 2MB boyut sınırı, dosya uzantısı/MIME kontrolü ve tekil dosya adlandırma uygulanacaktır. |
| **3.1 API Standartları & Hata Formatı** | **Kapsamda** | Tüm yanıtlar standart `{ success: true, data: ... }` veya `{ success: false, message: ... }` formatında dönmektedir. |
| **3.2 Rate Limiting** | **Kapsamda** | Express rate limiter genel, auth ve public settings rotalarına uygulanmıştır. |
| **3.3 Public Settings Endpoint** | **Kapsamda** | `/api/settings/public` ucu yetkilendirme gerektirmeden yalnızca logo URL'si ve site başlığını maskesiz/güvenli dönecektir. |
| **4.1 Girdi Doğrulama & XSS** | **Kapsamda** | API seviyesinde dosya tipi ve boyutu doğrulama, SVG dosyalarında XSS izolasyonu (`<img>` render) ve React JSX çıktı kodlaması devrededir. |
| **4.2 Gizli Bilgi Yönetimi** | **Kapsamda** | `.env` repo dışında tutulmakta, API'den dönen ayarlarda şifreler `••••••••` ile maskelenmekte; public uçtan hassas veriler kesinlikle döndürülmemektedir. |
| **5.1 5 UI Durumu (UX)** | **Kapsamda** | Logo yükleme alanında Yükleniyor (Uploading), Başarılı (Preview), Boş (Default Fallback), Hata (Invalid file/size) ve Sıfırlama durumları ele alınmıştır. |
| **5.2 Soru Sıralama & Sayfalama** | **Kapsamda** | Editörde Drag & Drop sıralama, anket doldurmada 20'şerli sayfalama ve matris kontrolleri uygulanmıştır. |
| **5.3 Responsive & Kurumsal Tasarım** | **Kapsamda** | Masaüstü Sidebar (`AppLayout`), mobil üst bar ve Giriş sayfasında (`LoginPage`) duyarlı logo konumlandırması ve boyut koruma (`object-contain`) kuralları tanımlanmıştır. |
| **6.1 Performans & İndeksler** | **Kapsamda** | Token, survey_id ve user_id indeksleri mevcut; public logo/settings uçlarında hızlı yanıt ve statik dosya önbellekleme uygulanmıştır. |
| **7.1 Denetim İzi & Loglama** | **Kapsamda** | `ActivityLog` modeliyle logo yükleme/sıfırlama ve ayar değişiklikleri admin kullanıcı ve IP bilgisiyle loglanmaktadır. |
| **7.2 Docker & Dağıtım Scripti** | **Kapsamda** | `/uploads` klasörü kalıcı volume olarak tanımlanarak Docker ve `deploy.sh` ortamlarında veri kalıcılığı güvenceye alınmıştır. |
| **8.1 KVKK & Anonimlik** | **Kapsamda** | Anonim anketlerde katılımcı `user_id` saklanmayıp SHA-256 hash ile saklanmakta, kimlik gizliliği korunmaktadır. |
