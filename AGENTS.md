# AGENTS.md — RotaRovers Martian Map (yarışma projesi)

Bu repoda çalışan **tüm yapay zekâ ajanları** (Claude Code, Google Antigravity, Cline, …) için kurallar.

## Dil
- Kullanıcı hangi dilde yazıyorsa (genelde **Türkçe**) o dilde cevap ver.
- Kod, değişken/fonksiyon adları, commit mesajları ve **bu repodaki README ile proje sayfası metinleri İngilizce**.

## Bu repo ne?
- NASA Space Apps 2026, Universal Event, görev "Interplanetary Survival Guide: Martian Map". Teslim **15 Kasım 23:59**
  (Team Owner'ın, yani Türkiye saati). Plan ve kararlar özel takım reposunda (`space-apps-2026-team`):
  `docs/notes/hackathon-plani-universal.md` ve Decisions log.
- Seçilen yön: yürüyüşten önce planlama + yürürken takip; HiRISE DTM'den hesaplanan, 20°'den dik eğimlerden kaçınan rota;
  bilim hedefi geçmişte yaşanabilirlik ve su; Gale krateri civarı (DTM `DTEEC_006855_1750_007501_1750_A01`).
- Teknoloji: `web/` React + Vite + TypeScript + OpenLayers + proj4; `pipeline/` Python (rasterio, numpy).

## Kurallar
1. **Ana fikir ekibe ait.** Resmî kural: projenin fikrini SI bulamaz; o fikir ekip tarafından seçildi (yukarıdaki yön).
   Bu proje içinde ajan araştırma yapabilir, verileri ve seçenekleri artı/eksileriyle gösterebilir, bir özelliğin nasıl
   yapılacağını önerebilir; neyin yapılacağına ekip karar verir. Kullanılan SI yardımı commit'te ve proje sayfasında
   beyan edilir.
2. **Önce plan göster**, onay al, sonra değiştir. Küçük adımlarla ilerle.
3. **Veri uydurma.** URL, uç nokta, veri seti adı veya sonuç uydurma; emin değilsen "doğrulanmadı" de. Örnek/sentetik
   veriyi açıkça işaretle. Her veri kaynağını lisansıyla README'deki tabloya ekle.
4. Mars koordinatları: GeoJSON **[boylam, enlem]**; DTM'ler "Mars (2015) Sphere, Ocentric, Equirectangular"
   projeksiyonunda, proj4 ile tanımla. Mesafeleri **Mars yarıçapıyla** hesapla.
5. Değişiklikten sonra kontrolleri çalıştır (`npm run build`, Python betiği için küçük bir örnek) ve **gerçek sonucu**
   bildir; çalıştırmadığın şeye "geçti" deme.
6. **Git:** commit/push sadece kullanıcı isteyince. Force-push, `reset --hard`, dal silme yok. Gizli bilgi ya da kişisel
   e-posta commit etme. Büyük veri dosyaları `data/` içine (git'e girmez).
7. Commit'ten önce `git status` ve `git diff --stat` özetini göster; ilgisiz bir değişiklik varsa söyle.
8. Aynı hatayı iki denemede çözemezsen dur, ne denediğini ve hatanın tam metnini yaz, yön iste.
9. İş bitince kodun ne yaptığını kısa ve Türkçe anlat.
10. **SI beyanı:** ajanın yazdığı kod için commit mesajına `Co-Authored-By` satırı ya da açıklama ekle; SI ile üretilen
    görsel/videoda filigran olsun, NASA logosu olmasın.
11. **Proje skill'leri** `.agents/skills/` altında: `mars-geo` (koordinat, mesafe, DTM, eğim), `git-pr-workflow`
    (dal, commit, PR), `science-stops` (`content/stops.csv`). İlgili işten önce o skill'i oku ve uygula.
