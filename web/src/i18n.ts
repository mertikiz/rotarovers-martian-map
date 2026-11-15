/** UI language. English is the default and the source text; Turkish lives here, keyed by that English text, so a
 *  string with no translation simply stays English. From the data files only the science stops are translated
 *  (below); the conditions notes stay English. Placeholders look like {name}. */
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

  // Science stops (names and reasons from content/stops.csv via route.geojson). Keyed by the whole English text:
  // if a stop's text changes in the CSV, that stop simply shows English until its Turkish is updated here.
  'Possible Inverted Channel': 'Olası Ters Dönmüş Kanal',
  'The canyon floor west of and about 150 m below this stop holds a sinuous, raised ridge that the HiRISE team interprets as a possible inverted channel deposit. Inverted channels form when stream sediment is cemented in place by minerals deposited from water, and the softer rock around it later erodes away. Samples of the ridge could test whether liquid water once flowed here.':
    "Bu durağın batısında ve yaklaşık 150 m altındaki kanyon tabanında, HiRISE ekibinin olası bir ters dönmüş kanal çökeli olarak yorumladığı kıvrımlı, kabarık bir sırt var. Ters dönmüş kanallar, akarsu tortusu sudan çökelen minerallerle yerinde çimentolanıp etrafındaki daha yumuşak kaya zamanla aşındığında oluşur. Sırttan alınacak örnekler, burada bir zamanlar sıvı su akıp akmadığını sınayabilir.",
  'East Wall Layers': 'Doğu Duvarı Katmanları',
  "This stop is on the eastern side of the canyon, about 160 m above its floor. Gale crater's central mound is built of layered (stratified) material, and the canyon cuts through it, exposing the layers in its walls; sampling layer by layer gives an ordered record of how these deposits built up. The HiRISE team notes the canyon may have been carved by running water.":
    'Bu durak kanyonun doğu yakasında, tabanından yaklaşık 160 m yukarıda. Gale kraterinin merkezî tepesi katmanlı (tabakalı) malzemeden oluşur; kanyon bu tepeyi keserek katmanları duvarlarında açığa çıkarır. Katman katman örnek almak, bu çökellerin nasıl biriktiğinin sıralı bir kaydını verir. HiRISE ekibi, kanyonun akan suyla oyulmuş olabileceğini belirtiyor.',
  'Debris Deposits': 'Moloz Çökelleri',
  'The canyon holds debris deposits and levees left by past mass movements. Hughes et al. (2020) find the slopes too low for dry flows, which suggests water was needed to set them moving, likely groundwater seeping out of the slopes. Orbital CRISM spectra indicate the debris is made of polyhydrated (water-bearing) sulfates.':
    'Kanyonda geçmişteki kütle hareketlerinin bıraktığı moloz çökelleri ve setler var. Hughes vd. (2020), eğimlerin kuru akışlar için fazla düşük olduğunu buluyor; bu da onları harekete geçirmek için suyun, büyük olasılıkla yamaçlardan sızan yeraltı suyunun gerektiğini düşündürüyor. Yörüngedeki CRISM spektrumları molozun polihidrat (su içeren) sülfatlardan oluştuğunu gösteriyor.',
  'Sulfate Strata and Alcoves': 'Sülfat Katmanları ve Oyuklar',
  'The canyon cuts through sulfate-bearing strata, with tributary alcoves on its walls and coarse debris along its floor. Hughes et al. (2019) state that how much water was involved in forming these deposits is still unknown, which makes them a direct target for observation on the ground.':
    'Kanyon sülfat içeren katmanları keser; duvarlarında yan kollara açılan oyuklar, tabanı boyunca iri moloz bulunur. Hughes vd. (2019), bu çökellerin oluşumunda ne kadar su rol oynadığının hâlâ bilinmediğini belirtiyor; bu da onları yerde gözlem için doğrudan bir hedef yapıyor.',
  'Northern Canyon Terrace': 'Kuzey Kanyon Taraçası',
  "The walk ends on terrace ground at the northern end of the route. The layered rock of Gale's central mound is exposed in the canyon walls, and the HiRISE team notes the canyon may have been carved by running water.":
    "Yürüyüş, rotanın kuzey ucundaki taraça zemininde biter. Gale'in merkezî tepesinin katmanlı kayası kanyon duvarlarında açığa çıkar; HiRISE ekibi kanyonun akan suyla oyulmuş olabileceğini belirtiyor.",

  // Walk view additions from PR #4 (telemetry, playback, legs)
  ' · Heading {deg}° {cardinal}': ' · Yön {deg}° {cardinal}',
  ' · Local slope {slope}°': ' · Yerel eğim {slope}°',
  'Copy EVA sheet': 'EVA sayfasını kopyala',
  'Copied EVA sheet!': 'EVA sayfası kopyalandı!',
  'Download .md': '.md indir',
  'Play walk': 'Yürüyüşü oynat',
  'Pause walk': 'Yürüyüşü durdur',
  'Simulation playback speed': 'Canlandırma hızı',
  'Walked Climb / Descent': 'Yürünen tırmanış / iniş',
  'Max Slope Next 50 m': 'Sonraki 50 m en dik eğim',
  ' (steep segment)': ' (dik bölüm)',
  'Base Separation (Straight)': 'Üsse uzaklık (kuş uçuşu)',
  'Route Walkback to Base': 'Rota üzerinden üsse dönüş',
  'Leg-by-Leg Traverse Breakdown': 'Bölüm bölüm yürüyüş dökümü',
  'Leg {n}: {from} → {to}': '{n}. bölüm: {from} → {to}',
  'max slope {deg}°': 'en dik eğim {deg}°',
  'In progress': 'Sürüyor',
  Completed: 'Tamamlandı',
  'Start leg': 'Bölüme başla',

  // Elevation profile
  'Round-trip profile (symmetric around the turnaround at Stop #{n}). Click anywhere along the profile or a stop marker to jump there.':
    'Gidiş-dönüş profili ({n}. duraktaki dönüş noktası etrafında simetrik). Oraya gitmek için profilde herhangi bir yere ya da bir durak işaretine tıklayın.',
  'Elevation along the planned route. Click anywhere along the profile to jump there.':
    'Planlanan rota boyunca yükselti. Oraya gitmek için profilde herhangi bir yere tıklayın.',
  'Inspect:': 'İncele:',
  at: '·',
  'Slope:': 'Eğim:',
  '0.0° (level)': '0.0° (düz)',
  '+{deg}° uphill': '+{deg}° yokuş yukarı',
  '−{deg}° downhill': '−{deg}° yokuş aşağı',
  'Steep slope section ({deg}°, 15–20° caution zone)': 'Dik eğimli bölüm ({deg}°, 15–20° dikkat bölgesi)',
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
