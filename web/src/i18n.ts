/** UI language. English is the default and the source text; Turkish lives here, keyed by that English text, so a
 *  string with no translation simply stays English. Texts from the data files (stop names, notes) are not
 *  translated. Placeholders look like {name}. */
export type Lang = 'en' | 'tr'

export const TR: Record<string, string> = {
  // Map panel
  'Planned Marswalk in Gale crater, on its central mound (Mount Sharp)':
    'Gale kraterinde, merkezî tepesinde (Mount Sharp) planlanan Mars yürüyüşü',
  'Map of the walking route': 'Yürüyüş rotasının haritası',
  'Route summary': 'Rota özeti',
  'Could not load map data: {error}': 'Harita verisi yüklenemedi: {error}',
  'Placeholder stops: route is computed, stops are not science stops yet':
    'Geçici duraklar: rota hesaplandı, duraklar henüz bilim durağı değil',
  'Round trip': 'Gidiş-dönüş',
  'Steepest point (5 m grid)': 'En dik nokta (5 m ızgara)',
  'Climb / descent': 'Tırmanış / iniş',
  'Science stops': 'Bilim durakları',
  'Source: {host}': 'Kaynak: {host}',
  'Map layers': 'Harita katmanları',
  'Terrain shading': 'Arazi gölgelendirmesi',
  'Slope classes': 'Eğim sınıfları',
  'Route and stops': 'Rota ve duraklar',
  'Route avoiding slopes over {deg}°, out and back': '{deg}° üstü eğimlerden kaçınan rota, gidiş-dönüş',
  'Base (B): start and end, at stop 1': 'Üs (B): başlangıç ve bitiş, 1. durakta',
  'Slope {from}–{to}°': 'Eğim {from}–{to}°',
  'Slope over {from}°: no-go': '{from}° üstü eğim: geçilmez',
  'Elevation and slope: HiRISE DTM {dtm} (NASA/JPL/University of Arizona, via USGS Astrogeology), 5 m grid.':
    'Yükselti ve eğim: HiRISE DTM {dtm} (NASA/JPL/Arizona Üniversitesi, USGS Astrogeology aracılığıyla), 5 m ızgara.',
  Language: 'Dil',

  // Conditions panel
  'Could not load conditions: {error}': 'Koşullar yüklenemedi: {error}',
  Conditions: 'Koşullar',
  'Weather at Gale crater': 'Gale kraterinde hava',
  'Curiosity REMS · sol {sol} · {date} · {km} km from the base': 'Curiosity REMS · sol {sol} · {date} · üsse {km} km',
  Air: 'Hava',
  Ground: 'Zemin',
  Pressure: 'Basınç',
  'Sunrise–sunset': 'Gün doğumu–batımı',
  '{min} to {max}': '{min} ile {max} arası',
  'The walk takes about {time} at the assumed {speed} km/h, {fit} the roughly {hours}-hour sunrise-to-sunset window.':
    'Yürüyüş varsayılan {speed} km/sa hızla yaklaşık {time} sürüyor; yaklaşık {hours} saatlik gün ışığı penceresinin {fit}.',
  'well inside': 'rahatça içinde',
  inside: 'içinde',
  'longer than': 'dışına taşıyor',
  'Sunrise and sunset are shown as the feed gives them; it does not state which Mars clock it uses.':
    'Gün doğumu ve batımı akışta verildiği gibi gösteriliyor; hangi Mars saatini kullandığı belirtilmemiş.',
  'Source: REMS weather feed (CAB / NASA)': 'Kaynak: REMS hava akışı (CAB / NASA)',
  Wind: 'Rüzgâr',
  'InSight · sol {sol} · {date} · {km} km away, Elysium Planitia': 'InSight · sol {sol} · {date} · {km} km uzakta, Elysium Planitia',
  Average: 'Ortalama',
  Highest: 'En yüksek',
  "Curiosity's feed reports no wind, so this is the nearest published wind record: another site, from 2020.":
    "Curiosity'nin akışı rüzgâr vermiyor; bu yüzden en yakın yayımlanmış rüzgâr kaydı bu: başka bir yer, 2020'den.",
  'Source: InSight weather service (NASA)': 'Kaynak: InSight hava servisi (NASA)',
  Radiation: 'Radyasyon',
  'Curiosity RAD · {period} · Gale crater': 'Curiosity RAD · {period} · Gale krateri',
  'Average dose': 'Ortalama doz',
  'This walk': 'Bu yürüyüş',
  'The walk figure applies that average to the walk time; it is not a measurement.':
    'Yürüyüş değeri bu ortalamayı yürüyüş süresine uygular; ölçüm değildir.',
  'Source: SwRI, Hassler et al. (Science, 2014)': 'Kaynak: SwRI, Hassler vd. (Science, 2014)',

  // Walk view
  'Loading Marswalk route data…': 'Mars yürüyüşü rota verisi yükleniyor…',
  'Unable to load Marswalk route': 'Mars yürüyüşü rotası yüklenemedi',
  'Marswalk Traverse Tracker': 'Mars yürüyüşü takibi',
  'Marswalk Traverse View': 'Mars Yürüyüşü Takip Ekranı',
  'What the astronaut follows on the walk. No GPS here: move the slider to simulate progress.':
    'Astronotun yürürken takip ettiği ekran. Burada GPS yok: ilerlemeyi kaydırıcıyla canlandırın.',
  'Sample / Placeholder Notice:': 'Örnek / geçici veri notu:',
  'Warning: {n} route point(s) lie outside the study DTM footprint.':
    'Uyarı: {n} rota noktası çalışma DTM alanının dışında.',
  'Returning to base along the same path: {dist} ({time}) to go.': 'Aynı yoldan üsse dönülüyor: {dist} ({time}) kaldı.',
  'Back at base. Walk complete.': 'Üsse dönüldü. Yürüyüş tamamlandı.',
  'TURNAROUND POINT PASSED: You have exceeded 50% of the planned walk duration ({dist} past half-way threshold).':
    "DÖNÜŞ NOKTASI GEÇİLDİ: Planlanan yürüyüş süresinin %50'sini aştınız (yarı yol eşiğinin {dist} ötesinde).",
  'AT TURNAROUND POINT: You are at exactly 50% of the planned walk duration.':
    "DÖNÜŞ NOKTASINDASINIZ: Planlanan yürüyüş süresinin tam %50'sindesiniz.",
  'Before Turnaround Point: {dist} ({time}) remaining until the 50% walk threshold.':
    'Dönüş noktasından önce: %50 eşiğine {dist} ({time}) kaldı.',
  'Simulated Astronaut Position Along Route': 'Rotadaki canlandırılmış astronot konumu',
  '{walked} walked of {total} ({pct} percent)': '{total} içinden {walked} yüründü (yüzde {pct})',
  Start: 'Başa',
  'Back 5%': 'Geri %5',
  'Step back': 'Bir adım geri',
  'Step forward': 'Bir adım ileri',
  'Forward 5%': 'İleri %5',
  End: 'Sona',
  'Prev Stop': 'Önceki durak',
  'Next Stop': 'Sonraki durak',
  '1. Current Position (Where Am I)': '1. Şu anki konum (Neredeyim)',
  'Walked: {dist} ({pct}%)': 'Yürünen: {dist} (%{pct})',
  'At Stop #{n}: {name}': '{n}. durakta: {name}',
  'Elapsed time: {time}': 'Geçen süre: {time}',
  '2. Next Stop': '2. Sonraki durak',
  '{dist} ahead · ETA {time}': '{dist} ileride · varış {time}',
  Base: 'Üs',
  'Back at Base': 'Üsse dönüldü',
  'All planned stops visited': 'Planlanan tüm duraklar ziyaret edildi',
  'Final Stop Reached': 'Son durağa varıldı',
  'All planned stops visited along route': 'Rotadaki tüm planlı duraklar ziyaret edildi',
  'Stops visited: {done} / {total}': 'Ziyaret edilen durak: {done} / {total}',
  '3. Total Remaining Distance & Time': '3. Kalan toplam mesafe ve süre',
  'Est. remaining time: {time}': 'Tahmini kalan süre: {time}',
  'Assumption: constant {speed} km/h ({note})': 'Varsayım: sabit {speed} km/sa ({note})',
  '4. Turnaround Point (50% Budget)': '4. Dönüş noktası (%50 bütçe)',
  'At {dist} ({time})': '{dist} noktasında ({time})',
  'Passed by {dist} ({time})': '{dist} geçildi ({time})',
  '{dist} ({time}) until turnaround': 'Dönüşe {dist} ({time})',
  'Half-duration mark of total {time} walk': 'Toplam {time} yürüyüşün yarı süre noktası',
  ': the last stop, where the walk turns back': ': yürüyüşün geri döndüğü son durak',
  'Planned Stops Along Route': 'Rotadaki planlı duraklar',
  'At {dist} along route': 'Rotada {dist} noktasında',
  'Here now': 'Şu an burada',
  '{dist} ahead': '{dist} ileride',
  'Passed {dist} ago': '{dist} önce geçildi',
  ' · snapped {m} m': ' · {m} m kaydırıldı',
  'Jump here': 'Buraya git',
  'Route & Terrain Parameters': 'Rota ve arazi değerleri',
  'Round-trip Length': 'Gidiş-dönüş uzunluğu',
  'Route Length': 'Rota uzunluğu',
  'Max Route Slope': 'Rotadaki en dik eğim',
  '{deg}° (limit {limit}°)': '{deg}° (sınır {limit}°)',
  'Total Climb / Descent': 'Toplam tırmanış / iniş',
  'Assumed Walk Speed': 'Varsayılan yürüyüş hızı',

  // Elevation profile
  'Route Elevation Profile': 'Rota yükselti profili',
  'Round-trip profile (symmetric around the turnaround at Stop #{n}). Click a stop marker, or use the "Jump here" buttons below, to move there.':
    'Gidiş-dönüş profili ({n}. duraktaki dönüş noktası etrafında simetrik). Oraya gitmek için bir durak işaretine tıklayın ya da aşağıdaki "Buraya git" düğmelerini kullanın.',
  'Elevation along the planned route.': 'Planlanan rota boyunca yükselti.',
  'Current elevation:': 'Şu anki yükselti:',
  'Turnaround (Stop #{n})': 'Dönüş ({n}. durak)',
  'Turnaround (50%)': 'Dönüş (%50)',
  'Base (Return)': 'Üs (dönüş)',
  'Elevation profile summary': 'Yükselti profili özeti',
  'Lowest Point': 'En alçak nokta',
  'Highest Point': 'En yüksek nokta',
  '(at {dist})': '({dist} noktasında)',
  '{m} m span': '{m} m fark',
  'Astronaut Elevation': 'Astronot yükseltisi',
}

export function translate(lang: Lang, en: string, vars: Record<string, string | number> = {}): string {
  const text = lang === 'tr' ? (TR[en] ?? en) : en
  return text.replace(/\{(\w+)\}/g, (hole, name: string) => (name in vars ? String(vars[name]) : hole))
}
