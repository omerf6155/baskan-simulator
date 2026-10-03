# Baskan Simulator - Calisma Kurallari & Token Optimizasyonu

## Kullanici Profili
- **Kullanici:** Omer
- **Proje:** Baskan Simulator (Futbol Yonetim & Strateji Web Oyunu)
- **Mimari:** Python (Flask/FastAPI/Server) + HTML/JS/CSS (static/)

---

## ⚡ TOKEN TASARRUFU & KOTA KORUMA STANDARDI (MANDATORY)
1. **Büyük Dosyalari Asla Bütünüyle Okuma:**
   - `server.py` (~200 KB) ve `teams_data.py` gibi büyük dosyalar asla tek seferde bütünüyle context'e çekilmeyecektir.
   - Sadece hedef fonksiyon veya ilgili 30-50 satırlık blok `StartLine` ve `EndLine` dilimleme (slice) ile okunacaktır.

2. **Think in Code (Kodla Analiz Et):**
   - Hata ararken, veri listelerken veya değişken ararken dosyaları tek tek okumak yerine arka planda hızlı bir Python/PowerShell scripti veya regex araması çalıştırılıp chat context'ine **yalnızca filtrelenmiş net sonuç** verilecektir.

3. **Nokta Atisi Duzenleme:**
   - Dosya değişikliklerinde tüm dosya baştan yazılmayacak, yalnızca değişen blok `replace_file_content` ile değiştirilecektir.

---

## 🚀 Git & Canli Dagitim Kurali
- Kullanıcının doğrudan talimatıyla; her revize, düzeltme ve geliştirmenin ardından kodlar kesintisiz olarak `git push` ile GitHub'a gönderilecektir (Render/Vercel canlı dağıtımlarının anında güncellenmesi için).
