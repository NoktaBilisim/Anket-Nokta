# ADR 0003: Çok Kanallı Bildirim Entegrasyonu (E-posta, SMS, WhatsApp)

- **Durum**: Kabul Edildi
- **Tarih**: 2026-09-19
- **Karar Verici**: Mimar

## 1. Bağlam
Kurumsal katılımcıların anketlere hızlı ve kolay katılımını sağlamak amacıyla çok kanallı (Multi-Channel) bildirim desteğine ihtiyaç vardır. Sistemin SMTP (Nodemailer), Nokta Bilişim SMS Gateway ve Nokta Bilişim WhatsApp Gateway servisleriyle dinamik ve dayanıklı (resilient) şekilde haberleşmesi gerekmektedir.

## 2. Karar
1. **Dinamik Yapılandırma**: Bildirim ayarları (`smtp_host`, `smtp_port`, `smtp_user`, `smtp_pass`, `sms_api_url`, `sms_api_key`, `sms_header`, `whatsapp_api_url`, `site_url`) veritabanındaki `settings` tablosundan dinamik okunur.
2. **Hata İzolasyonu ve Timeout**: Dış ağ servislerine yapılan tüm çağrılarda 15 saniyelik `AbortSignal.timeout(15000)` işletilir. Bir katılımcıya bildirim gitmemesi tüm toplu gönderimi durdurmaz; başarılı ve hatalı alıcılar ayrıştırılarak kullanıcıya raporlanır (`results.sent`, `results.failed`).
3. **Şablonlama**:
   - E-posta: Truguard kurumsal logolu, mobil uyumlu HTML şablonu.
   - SMS: Telefon numarası normalizasyonu (boşluk/parantez/90 temizliği) + SMS başlığı.
   - WhatsApp: Başlık, açıklama ve anket bağlantısı içeren formatlı metin mesajı.
4. **Canlı Test Uçları**: Ayarlar sayfasından adminlerin doğrudan test e-postası, test SMS'i ve test WhatsApp mesajı tetikleyebilmesi sağlanmıştır.

## 3. Alternatifler
- **Doğrudan Harici Kuyruk Servisi (AWS SQS/SES)**: Yerel on-premise ve kurumsal Nokta Bilişim altyapısına özel entegrasyonlar gerektiği için doğrudan REST/SMTP istemcisi kullanılmıştır.

## 4. Sonuçlar
- **Olumlu**: Yüksek esneklik, canlı test kabiliyeti ve harici ağ kesintilerinde dayanıklılık.
- **Olumsuz**: Çok büyük ölçekli (10.000+) anlık gönderimlerde kuyruk (BullMQ) mekanizması eklenmelidir.
