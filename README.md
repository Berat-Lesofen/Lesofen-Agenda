# LESOFEN AGENDA

> **Training · Planning · Consistency**

Bağımsız, mobil öncelikli ve çevrimdışı çalışabilen kişisel antrenman ajandası. Lesofen Kinetika estetik dilinden ilham alan, sıfır hesap zorunluluğu ile anında kullanılabilen hızlı antrenman ve split takvimi.

---

## ⚡ Temel Özellikler

- **Aylık Split Takvimi:** Ay boyunca hangi gün hangi antrenmanı yaptığınızı veya planladığınızı tek bakışta görün.
- **9 Temel Split Seçeneği:**
  - `PUSH`
  - `PULL`
  - `LEGS`
  - `UPPER`
  - `LOWER`
  - `FULL BODY`
  - `ANTERIOR`
  - `POSTERIOR`
  - `REST` (Dinlenme)
- **Çok Yönlü Yerleştirme (Masaüstü & Mobil):**
  - **Masaüstü:** Split kartını tutup istediğiniz güne sürükleyip bırakın (HTML5 Drag & Drop).
  - **Mobil Dokun & Yerleştir:** İster split kartına dokunup günlere seri halde tıklayın, ister doğrudan herhangi bir takvim gününe dokunarak split seçim menüsünü açın.
- **Tamamlandı Takibi:** Planlanan antrenmanları `✓ Tamamlandı` olarak işaretleyin veya geri alın.
- **Aylık Özet Bilgi:** Mevcut ayın toplam antrenman sayısı, dinlenme günleri ve tamamlanma oranını anlık hesaplayan sade gösterge.
- **Yerel ve Çevrimdışı (PWA):** Verileriniz tamamen tarayıcınızda ve cihazınızda saklanır. İnternet bağlantısı olmadan da tam performansla çalışır.
- **Standalone PWA Deneyimi:** Telefonun ana ekranına eklenebilir, tam ekran uygulama hissi sunar.

---

## 🛠️ Teknoloji & Mimari

- **Frontend:** Vanilla HTML5, Modern CSS (Obsidian Laboratory Tasarım Dili), ES Modules (JavaScript)
- **Veri Katmanı:** `storage.js` soyutlama katmanı (LocalStorage / IndexedDB / gelecekte Supabase hazır)
- **Modal / Dialog:** Modern HTML `<dialog closedby="any">` ve light-dismiss standardı
- **PWA:** Web App Manifest (`manifest.webmanifest`), Service Worker (`sw.js`) ile statik önbellekleme
- **Deployment:** Vercel

---

## 🚀 Yerel Geliştirme

Herhangi bir yerel HTTP sunucusu ile çalıştırabilirsiniz:

```bash
# Node.js yerel sunucu örneği:
npx serve .
# veya Python ile:
python -m http.server 8080
```

Tarayıcınızda `http://localhost:8080` adresini açın.
