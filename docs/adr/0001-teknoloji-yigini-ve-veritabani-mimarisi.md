# ADR 0001: Teknoloji Yığını ve Veritabanı Mimarisi

- **Durum**: Kabul Edildi
- **Tarih**: 2026-09-19
- **Karar Verici**: Mimar

## 1. Bağlam
SurveyPro sistemi; anket oluşturma, soru bazlı puanlama ve kategorilendirme, çok kanallı bildirim (E-posta, SMS, WhatsApp) ile hedef kitleye dağıtım ve gerçek zamanlı analitik raporlama gereksinimlerine sahiptir. Projenin hızlı geliştirilebilir, kurumsal yayın sunucusunda (`185.126.217.99`) Docker üzerinde izole ve yüksek performanslı çalışabilmesi gerekmektedir.

## 2. Karar
1. **Backend**: Node.js (v18+) ve Express.js çalışma ortamı.
2. **Veritabanı & ORM**: PostgreSQL 15 ve Sequelize ORM.
3. **Önbellek & Oturum**: Redis 7 (Rate limiting ve önbellek desteği).
4. **Frontend**: React 18 (Vite SPA) + Tailwind CSS + Zustand (hafif durum yönetimi) + Recharts (veri görselleştirme) + Lucide React (ikon seti).
5. **Konteynerleştirme & Reverse Proxy**: Docker Compose + Nginx (Gzip sıkıştırma, API proxy, Port 4466/5001 yönlendirmesi).

## 3. Alternatifler
- **Prisma ORM**: Güçlü bir alternatif olmasına karşın, mevcut codebase Sequelize ile kurulmuştur ve JSONB alanları üzerinde dinamik sütun/seçenek sorguları Sequelize model tanımlarıyla tam uyumlu çalışmaktadır.
- **Next.js SSR**: Katılımcı anket arayüzünün token tabanlı istemci tarafı (SPA) formu olarak çalışması ve yönetim panelinin Recharts tabanlı dinamik yapısı nedeniyle Vite + React SPA mimarisi daha hafif ve hızlı bulunmuştur.

## 4. Sonuçlar
- **Olumlu**: Geliştirme hızı yüksek, JSONB desteği sayesinde dinamik soru/seçenek modelleri esnek, Docker ile tek komutla (`deploy.sh`) dağıtım yapılabilir.
- **Olumsuz / Kısıt**: Sequelize `sync({ alter: true })` kullanılırken karmaşık şema değişikliklerinde dikkatli olunmalı, gerekirse SQL migration scriptleri (`scripts/init.sql`) ile desteklenmelidir.
