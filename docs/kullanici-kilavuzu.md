# SurveyPro Kullanıcı Kılavuzu

Bu kılavuz, SurveyPro sistemini kullanan kurum yöneticileri, anket hazırlayıcıları, değerlendiriciler ve katılımcılar için adım adım hazırlanmış görev odaklı kullanım rehberidir.

---

## 1. Sisteme Giriş ve İlk Adımlar

### 1.1 Nasıl Giriş Yaparım?
1. Web tarayıcınızdan kurumunuza ait SurveyPro adresine (`http://localhost:3000` veya canlı adres) gidin.
2. Açılan ekranda **E-posta Adresinizi** ve **Şifrenizi** yazın.
3. **Giriş Yap** düğmesine tıklayın.
4. Rolünüze uygun ana kontrol paneline yönlendirileceksiniz.

---

## 2. Kurumsal Marka ve Sistem Ayarları (Admin)

### 2.1 Kurum Logosu Nasıl Yüklenir ve Güncellenir?
1. Sol menüden **Ayarlar** (`/settings`) sayfasına gidin.
2. Sayfanın en üstünde yer alan **Kurumsal Marka ve Logo Yönetimi** bölümüne gelin.
3. **Logo Seç** veya dosya yükleme alanına tıklayarak bilgisayarınızdan kurum logonuzu seçin (Desteklenen formatlar: PNG, JPG, WebP, SVG; Dosya boyutu en fazla 2 MB).
4. **Logoyu Yükle** düğmesine tıklayın.
5. Yükleme tamamlandığında logonuz sol kenar çubuğunda, giriş ekranında ve anket sayfalarında anında güncellenecektir.

### 2.2 Varsayılan Truguard Logosuna Nasıl Geri Dönülür?
1. **Ayarlar** sayfasındaki logo bölümünde bulunan **Varsayılana Sıfırla** düğmesine tıklayın.
2. Ekrana gelen onay penceresinde işlemi onaylayın.
3. Yüklenen özel logo güvenle silinir ve sistem varsayılan orijinal logosuna geri döner.

### 2.3 E-Posta, SMS ve WhatsApp Ayarları Nasıl Yapılır?
1. **Ayarlar** sayfasındaki **E-Posta (SMTP)**, **SMS Gateway** veya **WhatsApp Gateway** bölümlerine gidin.
2. Kurumunuza ait sunucu bilgilerini, portu ve kullanıcı bilgilerini girin (Şifre alanları gizli olarak korunur).
3. **Test Gönder** düğmelerini kullanarak girdiğiniz bilgilerin çalıştığını doğrulayın.
4. Sayfanın altındaki **Ayarları Kaydet** düğmesine tıklayın.

---

## 3. Anket Oluşturma ve Tasarlama (Admin & Creator)

### 3.1 Yeni Bir Anket Nasıl Oluşturulur?
1. Sol menüden **Anketler** sayfasına gidin.
2. Sağ üst köşedeki **+ Yeni Anket** düğmesine tıklayın.
3. **Anket Başlığı**, **Açıklaması** ve varsa **Bitiş Tarihini** belirleyin.
4. Anketin anonim (kimliksiz) toplanmasını istiyorsanız **Anonim Anket** seçeneğini işaretleyin.
5. **+ Soru Ekle** düğmesine tıklayarak dilediğiniz soru tipini seçin:
   - **Tekten Seçmeli:** Katılımcı tek bir şık seçebilir.
   - **Çoktan Seçmeli:** Katılımcı birden fazla şık işaretleyebilir.
   - **Matris / Likert Tablosu:** Departman veya konu bazlı değerlendirme tablosu (Örn: Hız, Kalite x Yetersiz, Orta, İyi).
   - **Açık Uçlu Metin:** Katılımcı serbest görüş/yorum yazabilir.
   - **Puanlama (1-10):** 1 ile 10 arasında puan seçimi.
   - **Evet / Hayır:** İki seçenekli hızlı soru.
6. Soruların puan değerlerini ve ait oldukları **Kategori** (Örn: Hizmet Kalitesi, Hız) adını girin.
7. Soruların sırasını değiştirmek için soru kartının solundaki tutamaktan tutup yukarı veya aşağı **sürükleyip bırakın**.
8. **Anketi Kaydet** düğmesine tıklayın.

---

## 4. Anket Dağıtımı ve Çok Kanallı Gönderim

### 4.1 Anketi Katılımcılara Nasıl Gönderirim?
1. **Anketler** listesinden ilgili anketin yanındaki **Gönder** (Uçak simgesi) düğmesine tıklayın.
2. Gönderim yapmak istediğiniz kanalları işaretleyin:
   - 📧 **E-Posta**
   - 📱 **SMS**
   - 💬 **WhatsApp**
3. Listeden anketi göndermek istediğiniz kullanıcıları seçin.
4. İsteğe bağlı olarak özel bir davet mesajı ekleyin.
5. **Gönderimi Başlat** düğmesine tıklayın. Sistem her kullanıcı için tekil ve güvenli bir anket linki oluşturup belirlenen kanallardan iletecektir.

---

## 5. Raporlama ve Sonuç Analizi

### 5.1 Anket Sonuçları Nasıl İncelenir?
1. Sol menüden **Anketler** sayfasına gidin.
2. İncelemek istediğiniz anketin yanındaki **Rapor** (Grafik simgesi) düğmesine tıklayın.
3. Ekranda şu özet bilgileri görebilirsiniz:
   - **Metrik Kartları:** Toplam gönderilen, tamamlanan yanıt sayısı, katılım oranı ve genel ortalama puan.
   - **Kategori Başarı Durumu:** Kategorilerin başarı yüzdeleri ve renk kodlamaları (Yeşil: Başarılı, Sarı: Orta, Kırmızı: Dikkat).
   - **Katılımcı Sıralaması:** En yüksek puan alan katılımcılar ve dereceleri (🥇, 🥈, 🥉).

### 5.2 Excel Raporu Nasıl İndirilir?
1. Rapor sayfasının sağ üst köşesindeki **Excel İndir** düğmesine tıklayın.
2. Bilgisayarınıza inen `.xlsx` dosyasında şu sekmeler yer alır:
   - **Özet:** Genel anket istatistikleri.
   - **Kategori Analizi:** Kategori bazlı puanlar ve yüzdeler.
   - **Soru İstatistikleri:** Her sorunun yanıt dağılımı.
   - **Yanıtlar:** Katılımcıların verdiği tüm ham cevaplar.
   - **Kişi Puanları:** Katılımcı başarı listesi.

---

## 6. Katılımcı Olarak Anket Doldurma

### 6.1 Size Gelen Bir Anketi Nasıl Yanıtlarsınız?
1. E-posta, SMS veya WhatsApp ile size iletilen özel anket bağlantısına tıklayın.
2. Açılan ekranda kurum logosunu ve anket başlığını göreceksiniz.
3. Soruları sırayla okuyup yanıtlayın:
   - Çok sayfalı anketlerde alt kısımdaki **İleri** ve **Geri** düğmelerini kullanabilirsiniz.
   - Zorunlu olan veya matris tablosunda eksik bırakılan satırlar kırmızı uyarıyla belirtilir.
4. Tüm soruları tamamladıktan sonra sayfa sonundaki **Anketi Tamamla** düğmesine tıklayın.
5. Yanıtlarınız sisteme kaydedilecek ve teşekkür mesajı görüntülenecektir. *(Not: Her anket bağlantısı tek kullanımlıktır; tamamlanan anket tekrar açılamaz.)*

---

## 7. Kullanıcı Yönetimi (Admin)

### 7.1 Yeni Kullanıcı Nasıl Eklenir?
1. Sol menüden **Kullanıcılar** (`/users`) sayfasına gidin.
2. **+ Yeni Kullanıcı** düğmesine tıklayın.
3. Ad Soyad, E-Posta, Şifre, Rol (Admin, Creator, Evaluator, Participant) ve Telefon bilgilerini doldurun.
4. **Kaydet** düğmesine tıklayın.

### 7.2 Excel veya CSV ile Toplu Kullanıcı Nasıl Yüklenir?
1. **Kullanıcılar** sayfasında sağ üstteki **İçe Aktar (Import)** düğmesine tıklayın.
2. Kullanıcı listenizi içeren `.xlsx` veya `.csv` dosyasını seçin.
3. **Yükle** düğmesine tıklayarak toplu aktarımı tamamlayın.
