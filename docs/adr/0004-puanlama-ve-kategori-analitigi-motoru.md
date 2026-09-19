# ADR 0004: Puanlama ve Kategori Analitiği Motoru

- **Durum**: Kabul Edildi
- **Tarih**: 2026-09-19
- **Karar Verici**: Mimar

## 1. Bağlam
SurveyPro sistemi, sadece yanıt toplamaktan öte anket sorularını puanlandırma, kategori bazında başarı ölçümleme ve katılımcı sıralaması (Leaderboard) üretme işlevine sahiptir. 5 farklı soru tipi (`multiple_choice`, `text`, `rating`, `yes_no`, `matrix`) için dinamik ve tutarlı bir puan hesaplama motoru gerekmektedir.

## 2. Karar
1. **Soru Bazlı Puan Yapısı**:
   - `rating`: Seçilen sayısal değer doğrudan puan kabul edilir (1-10).
   - `multiple_choice` / `yes_no`: `options` dizisi içindeki her seçeneğe ait `score` değeri toplanır.
   - `matrix`: Satır bazında seçilen sütuna ait `score` toplanır.
   - `text`: Puanlamaya dahil edilmez (`score = 0`).
2. **Kategori Haritalama**:
   - Her soruya opsiyonel bir `category` (ör. "Liderlik", "İletişim", "Teknik Yetkinlik") atanabilir.
   - Raporlama aşamasında kategori bazlı maksimum alınabilecek puan ve katılımcının aldığı fiili puan hesaplanarak başarı yüzdesi (`%`) elde edilir.
3. **Analitik Sunumu**:
   - 4 sekme mimarisi: **Soru Analizi** (Recharts grafik), **Puan Özeti** (Soru toplam/ortalama), **Kategori Analizi** (Yüzde barları ve renk kodlaması), **Kişi Puanları** (Madalya sıralaması 🥇, 🥈, 🥉).
4. **Excel Dışa Aktarımı**:
   - Rapor verisi hem yanıt metinlerini hem de soru bazlı puanları içerecek şekilde çok sayfalı/genişletilmiş `.xlsx` formatında istemciye sunulur.

## 3. Alternatifler
- **Veritabanında Aggregate Tablolar Tutma**: Dinamik anket yapısında soru veya seçenek puanları sonradan güncellenebileceği için hesaplamaların rapor sorgusu sırasında anlık hesaplanması veri tutarlılığını garantilemektedir.

## 4. Sonuçlar
- **Olumlu**: Yüksek esneklik, gerçek zamanlı doğru puanlama, kurumsal yetkinlik matrislerine tam uyum.
- **Olumsuz**: 50.000+ yanıtta bellek içi hesaplama süresini korumak için sonuçların Redis'te önbelleğe alınması planlanmıştır.
