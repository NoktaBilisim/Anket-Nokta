# ADR 0002: Token Tabanlı Katılımcı Güvenliği ve KVKK Anonimlik Modeli

- **Durum**: Kabul Edildi
- **Tarih**: 2026-09-19
- **Karar Verici**: Mimar

## 1. Bağlam
Anket katılımcılarının sisteme şifreyle giriş yapma zorunluluğu olmadan, doğrudan kendilerine iletilen bağlantıya tıklayarak anketi güvenle ve tek seferlik doldurabilmeleri gerekmektedir. Ayrıca, anket sahibi "Anonim Anket" seçtiğinde katılımcının kimliği yanıtlarla ilişkilendirilmemeli ancak mükerrer oy/yanıt engellenmelidir.

## 2. Karar
1. **Tekil Bağlantı Token'ı**: Her anket gönderiminde `SurveyTarget` tablosunda kullanıcıya özel kriptografik olarak rastgele tekil `UUIDv4` üretilir (`/survey/:token`).
2. **Erişim ve Zaman Damgası**: Token ilk açıldığında `SurveyTarget.opened_at`, yanıt tamamlandığında `SurveyTarget.completed_at` güncellenir.
3. **Mükerrerlik Engeli**: `completed_at` dolu olan token'lar anında reddedilir ("Bu anketi zaten doldurdunuz").
4. **Anonimlik ve SHA-256 Hash**:
   - Standart anketlerde `responses.user_id` saklanır.
   - Anonim anketlerde (`survey.anonymous === true`), `responses.user_id` alanı `NULL` bırakılır. Katılımcının `target.user_id` değeri SHA-256 algoritması ile tek yönlü hash'lenerek `responses.user_hash` kolonuna yazılır. Böylece veritabanı yöneticisi veya anket sahibi dahi yanıtın kime ait olduğunu geri çözemez.

## 3. Alternatifler
- **IP Tabanlı Kısıtlama**: Kurumsal ağlarda (NAT arkasında) tüm çalışanlar aynı çıkış IP'sine sahip olduğu için anketin yalnızca bir kişi tarafından doldurulabilmesi sorununa yol açardı. Token tabanlı mimari en güvenilir çözümdür.
- **Doğrudan E-posta Doğrulama Kodu**: Kullanıcı deneyimini yavaşlatır; tekil token linki katılım oranını maksimize eder.

## 4. Sonuçlar
- **Olumlu**: KVKK standartlarına %100 uyumlu, mükerrer katılımı kesin olarak engelleyen ve şifresiz hızlı katılım sağlayan bir yapı kurulmuştur.
- **Olumsuz**: Token linkinin başkasına iletilmesi durumunda linke sahip kişi anketi doldurabilir (bu durum kurumsal davet e-postası güvenliği ile sınırlandırılmıştır).
