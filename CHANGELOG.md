# Changelog — SurveyPro

Tüm önemli değişiklikler bu dosyada belgelenmiştir.

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
- **Rate Limiting:** Genel API (100 req/15dk), Login (5 req/15dk) ve Çok Kanallı Gönderim (30 req/1dk) hız sınırlaması uygulandı.
- **Hata Maskeleme:** Üretim ortamında PostgreSQL/Sequelize iç hata detaylarının istemciye sızması engellendi.
- **Hassas Ayar Maskeleme:** SMS API anahtarı ve SMTP parolaları `••••••••` olarak maskelendi.
- **Nginx & Header Güvenliği:** CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy ve Permissions-Policy başlıkları eklendi.
- **Git Gizli Bilgi İzolasyonu:** `.env` ve `.env.prod` dosyaları git index'inden temizlendi.

### ⚡ Performans ve Mimari
- **Redis Cache:** Raporlama sorguları 300s TTL ile önbelleğe alındı, anket değişikliklerinde otomatik cache invalidation eklendi.
- **ACID Transaction:** Anket oluşturma, soru ekleme ve yanıt kayıt işlemleri `sequelize.transaction` ile atomik hale getirildi.
- **Frontend 5 UI Durumu:** Tüm sayfalarda Skeleton loading, empty states, error retry ve validation feedback'leri uygulandı.
- **Test Kapsamı:** 8 test suite ve 61 birim/entegrasyon testi ile %100 test başarı oranı sağlandı.
