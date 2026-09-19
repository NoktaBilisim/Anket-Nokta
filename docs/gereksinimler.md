# Gereksinimler — SurveyPro (Anket Yönetim Sistemi)
Tarih: 2026-09-19   Durum: ONAYLI

## 1. Amaç ve İş Değeri
SurveyPro, kurumların çalışanlarına, paydaşlarına ve müşterilerine yönelik anketleri kolayca tasarlamasını, çoklu dağıtım kanalları (E-posta, SMS, WhatsApp) üzerinden hedef kitleye ulaştırmasını, yanıtları puanlama ve kategori bazlı analiz modelleriyle gerçek zamanlı olarak ölçümlemesini sağlayan kurumsal bir anket yönetim platformudur. Sistem, değerlendirme süreçlerindeki manuel iş yükünü ortadan kaldırarak karar vericilere ayrıntılı raporlar, kategori bazlı başarı analitiği ve Excel çıktıları sunar.

## 2. Kullanıcılar / Roller
| Rol | Tanım ve Yetki Kapsamı |
|---|---|
| **Admin** | Sistem yöneticisi. Tüm anketleri, kullanıcıları, sistem/entegrasyon ayarlarını (SMTP, SMS, WhatsApp), aktivite loglarını yönetir ve tüm raporlara erişir. |
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

### Kapsam DIŞI (Açıkça)
1. **Anket İçi Dinamik Dal/Mantık (Skip Logic / Conditional Branching)**: Belirli bir yanıta göre sonraki soruları gizleme/atlama mantığı bu sürümde yoktur; tüm sorular sıra numarasına göre gösterilir.
2. **3. Parti OAuth / SSO Entegrasyonu**: Google, Microsoft Azure AD veya LDAP üzerinden kurumsal tek tıkla giriş kapsam dışıdır; yerel JWT e-posta/şifre doğrulaması kullanılır.
3. **Mobil Uygulama (Native iOS / Android)**: Ayrı bir mobil uygulama geliştirilmeyecektir; sistem mobil uyumlu (responsive web) olarak çalışır.
4. **Çok Dilli Anket Desteği (i18n Survey Content)**: Aynı anketin tek formda birden fazla dilde çeviri içerikleriyle sunulması bu sürümde yer almamaktadır; arayüz ve içerikler Türkçe odaklıdır.
5. **Ödeme veya Ücretli Katılım Modülü**: Ücretli anketler, hediye çeki tanımlama veya ödeme ağ geçidi entegrasyonu kapsam dışıdır.

## 4. Kullanıcı Hikâyeleri

- **US-1 (Anket Tasarımı)**: Bir **Creator** veya **Admin** olarak, çoktan seçmeli, puanlama, açık uçlu ve matris soru tipleriyle anketler oluşturabilmek, sorulara kategori ve puan tanımlayabilmek, soruların sırasını sürükle-bırak yöntemiyle değiştirebilmek istiyorum ki anketimi hatasız ve hızlıca kurgulayabileyim.
- **US-2 (Çok Kanallı Dağıtım)**: Bir **Creator** olarak, hazırladığım anketi sisteme kayıtlı katılımcılara E-posta (Truguard logolu şablon ile), SMS veya WhatsApp üzerinden tek tıkla gönderebilmek istiyorum ki katılımcılara en hızlı kanaldan ulaşabileyim.
- **US-3 (Entegrasyon Yönetimi ve Testi)**: Bir **Admin** olarak, SMTP sunucu bilgilerini, SMS Gateway API ve WhatsApp API uç noktalarını arayüzden tanımlayabilmek ve canlı test mesajı atarak çalıştığını doğrulayabilmek istiyorum ki bildirim gönderimlerinde kesinti yaşamayayım.
- **US-4 (Anket Yanıtlama ve Sayfalama)**: Bir **Participant** olarak, kendime özel güvenli bağlantı üzerinden kurumsal logolu arayüzde 20'şerli sayfalar halinde soruları kolayca doldurabilmek, eksik bıraktığım soruları anında görebilmek ve tek seferde yanıtlarımı kaydedebilmek istiyorum ki deneyimim kesintisiz ve net olsun.
- **US-5 (Raporlama ve Puan Sıralaması)**: Bir **Evaluator**, **Creator** veya **Admin** olarak, tamamlanan anketlerin katılım oranlarını, soru bazlı grafiklerini, kategori bazlı başarı yüzdelerini ve katılımcı sıralamasını listeleyebilmek, verileri Excel'e aktarabilmek istiyorum ki değerlendirme sonuçlarını kolayca analiz edip raporlayabileyim.
- **US-6 (Denetim İzi ve Loglama)**: Bir **Admin** olarak, anket oluşturma, güncelleme, gönderme ve yanıtlama gibi tüm kritik aksiyonları IP adresi ve zaman damgasıyla listeleyebilmek istiyorum ki sistem güvenliğini ve denetlenebilirliğini sağlayabileyim.

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

## 6. Fonksiyonel Olmayan Gereksinimler

- **Performans**: 
  - Anket doldurma sayfası yüklenme süresi (LCP) < 1.5 saniye olmalıdır.
  - 1.000 katılımcılı ve 50 sorulu bir anketin rapor hesaplaması ve Excel çıktısı üretimi < 2.0 saniyede tamamlanmalıdır.
  - Backend API uç noktaları yanıt süresi ortalama < 200 ms olmalıdır.
- **Güvenlik**:
  - Şifreler bcrypt algoritması ile minimum cost faktörü 12 kullanılarak hash'lenmelidir.
  - API uç noktaları rate limiter ile brute-force saldırılarına karşı korunmalıdır (dakikada max 100 istek, auth uçlarında max 10 istek).
  - Ayarlar tablosunda tutulan SMS API anahtarı ve SMTP parolaları istemciye asla açık metin olarak gönderilmemelidir.
- **Erişilebilirlik ve Arayüz (UI/UX)**:
  - Form alanları, seçenek butonları ve matris hücreleri mobil cihazlarda dokunmatik hedeflere (min 44x44px) uygun olmalıdır.
  - Tüm sayfalarda Yükleniyor (Loading), Boş (Empty), Hata (Error) ve Başarılı (Success) durumları ele alınmış olmalıdır.
- **Veri Bütünlüğü**:
  - PostgreSQL veritabanında ilişkisel sorgular ve indeksler (`survey_id`, `user_id`, `token`) optimize edilmiş olmalıdır.
  - Anket silme işlemlerinde ilişkili kayıtların (`questions`, `responses`, `answers`, `survey_targets`) veri tutarlılığı korunmalıdır.
- **Operasyon ve Yayınlama**:
  - Docker Compose ile frontend (Nginx reverse proxy), backend (Node.js) ve veritabanı (PostgreSQL) konteyner ortamında izole çalışmalıdır.
  - Üretim sunucusuna dağıtım `deploy.sh` scripti ile sıfır kesintiye yakın şekilde rsync + docker compose up --build ile gerçekleştirilebilmelidir.

## 7. Varsayımlar
1. SMS gönderimleri için Nokta Bilişim SMS Gateway servisinin (`http://smsportal.noktabilisim.net:3001`) aktif ve tanımlı API anahtarına sahip olduğu varsayılmaktadır.
2. WhatsApp gönderimleri için Nokta Bilişim WhatsApp servisinin (`http://whatsapp.noktabilisim.net:3000`) bağlı oturuma sahip olduğu varsayılmaktadır.
3. Katılımcıların sisteme geçerli formatta e-posta adresi veya başında 0/90 bulunan geçerli Türkiye telefon numarası ile kayıtlı olduğu varsayılmaktadır.
4. Anket katılımcılarının standart modern web tarayıcılarını (Chrome, Firefox, Safari, Edge güncel sürümleri) kullandığı varsayılmaktadır.
5. Anket e-posta ve web arayüzünde Truguard kurumsal logosunun kullanılacağı varsayılmıştır.

## 8. Riskler ve Açık Sorular

| No | Risk / Açık Soru | Etki | Olasılık | Sahibi | Azaltma Planı |
|---|---|---|---|---|---|
| **R-1** | SMS / WhatsApp Gateway API servislerinin geçici olarak yanıt vermemesi veya zaman aşımı | Yüksek | Orta | DevOps / Backend | İsteklere 15 saniyelik `AbortSignal.timeout` konulmuştur; başarısız gönderimler kullanıcı bazında raporlanır ve loglanır. İleride yeniden deneme (retry) kuyruğu eklenecektir. |
| **R-2** | SMTP sunucusunun toplu gönderimlerde IP/gönderim kotasına takılması veya spam filtresine düşmesi | Yüksek | Düşük | Sistem Yöneticisi | Kurumsal SMTP sunucu IP'sinin SPF, DKIM ve DMARC kayıtlarının doğrulanması gerekmektedir. |
| **R-3** | Çok yüksek soru sayılı (100+ soru) anketlerde istemci tarafında yanıtların kaybolma riski | Orta | Düşük | Frontend Dev | 20'şerli sayfalama ile DOM hafifletilmiştir; ileride her sayfa geçişinde taslak yanıtları yerel hafızaya (`localStorage`) kaydetme özelliği eklenecektir. |
| **R-4** | Çok büyük anketlerde (10.000+ yanıt) Excel export işleminin bellek tüketimi | Orta | Düşük | DBA / Backend | Şu anki hacimde bellek içi XLSX kütüphanesi yeterlidir; 50.000+ yanıt seviyesine ulaşıldığında streaming Excel (`exceljs` stream) mimarisine geçilecektir. |

## 9. Tasarım Kontrol Listesi Kararları

`~/.claude/checklists/tasarim-kontrol-listesi.md` maddeleri doğrultusunda proje kararları:

| Bölüm & Konu | Karar | Gerekçe & Detay |
|---|---|---|
| **1.1 Kimlik Doğrulama** | **Kapsamda** | JWT (Access + Refresh Token) ve bcrypt hash ile e-posta/şifre doğrulaması devrededir. |
| **1.2 2FA / SSO Entegrasyonu** | **Sonra** | İlk sürüm kurumsal iç kullanım ve token tabanlı anket dağıtımı için yeterlidir; SSO sonraki fazda değerlendirilecektir. |
| **1.3 Yetkilendirme (RBAC)** | **Kapsamda** | 4 rol (`admin`, `creator`, `evaluator`, `participant`) endpoint seviyesinde `authorize()` middleware ile denetlenmektedir. |
| **2.1 Veri Modeli Standartları** | **Kapsamda** | `created_at`, `updated_at`, UUID birincil anahtarlar, JSONB seçenek yapıları ve ilişkisel tablolar Sequelize ile tanımlanmıştır. |
| **2.2 Soft Delete Stratejisi** | **Sonra** | Anket silme işlemleri doğrudan hard delete olarak yapılmakta ve `activity_logs` kaydı tutulmaktadır; arşivleme durumu (`status: 'archived'`) mevcuttur. |
| **3.1 API Standartları & Hata Formatı** | **Kapsamda** | Tüm yanıtlar standart `{ success: true, data: ... }` veya `{ success: false, message: ... }` formatında dönmektedir. |
| **3.2 Rate Limiting** | **Kapsamda** | Express rate limiter genel ve auth rotalarına uygulanmıştır. |
| **4.1 Girdi Doğrulama & XSS** | **Kapsamda** | API seviyesinde parametre kontrolleri, React JSX çıktı kodlaması ve CORS middleware aktiftir. |
| **4.2 Gizli Bilgi Yönetimi** | **Kapsamda** | `.env` repo dışında tutulmakta, API'den dönen ayarlarda şifreler `••••••••` ile maskelenmektedir. |
| **5.1 5 UI Durumu (UX)** | **Kapsamda** | Yükleniyor, Hata, Boş durum, Tamamlandı ekranları ve Form validasyon mesajları tüm sayfalarda mevcuttur. |
| **5.2 Soru Sıralama & Sayfalama** | **Kapsamda** | Editörde Drag & Drop sıralama, anket doldurmada 20'şerli sayfalama ve matris kontrolleri uygulanmıştır. |
| **5.3 Responsive & Kurumsal Tasarım** | **Kapsamda** | Tailwind CSS ile mobil uyumluluk, Truguard logo yerleşimi ve bildirim toast'ları tamamlanmıştır. |
| **6.1 Performans & İndeksler** | **Kapsamda** | Token, survey_id ve user_id alanlarında PostgreSQL indeksleri mevcuttur. |
| **7.1 Denetim İzi & Loglama** | **Kapsamda** | `ActivityLog` modeliyle tüm kritik aksiyonlar (giriş, anket oluşturma, gönderme, yanıtlama) IP ile kaydedilmektedir. |
| **7.2 Docker & Dağıtım Scripti** | **Kapsamda** | `docker-compose.prod.yml`, `nginx.prod.conf` ve `deploy.sh` ile publish sunucusuna tek komutla aktarım sağlanmaktadır. |
| **8.1 KVKK & Anonimlik** | **Kapsamda** | Anonim anketlerde katılımcı `user_id` saklanmayıp SHA-256 hash ile saklanmakta, kimlik gizliliği korunmaktadır. |
