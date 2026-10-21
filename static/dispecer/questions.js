const QUESTIONS_DATA = [
  {
    "id": 1,
    "category": "Terminoloji & Kısaltmalar",
    "difficulty": "Kolay",
    "question": "ICAO 4 harfli yer göstergelerinde (Location Indicators - Doc 7910) kod yapısı ile ilgili aşağıdakilerden hangisi DOĞRUDUR?",
    "options": [
      "A) İlk harf havalimanını, son üç harf ülkeyi gösterir.",
      "B) İlk iki harf şehri, son iki harf pist numarasını gösterir.",
      "C) İlk harf ICAO coğrafi bölgesini, ikinci harf ülkeyi, son iki harf ise havalimanını belirtir.",
      "D) Dört harf tamamen rastgele havayolu talebine göre seçilir.",
      "E) İlk üç harf IATA kodudur, son harf terminali gösterir."
    ],
    "answer": 2,
    "explanation": "Slayt 9: ICAO yer göstergelerinde ilk harf ülkenin bulunduğu ICAO bölgesini (L: Güney Avrupa/Akdeniz), ikinci harf ülkeyi (T: Türkiye), son iki harf ise havalimanını (BA: Atatürk) belirtir.",
    "slideRef": "Slayt 9"
  },
  {
    "id": 2,
    "category": "Terminoloji & Kısaltmalar",
    "difficulty": "Kolay",
    "question": "Aşağıdaki havalimanı eşleştirmelerinden hangisinde ICAO ve IATA kodları DOĞRU verilmiştir?",
    "options": [
      "A) İstanbul Havalimanı: LTBA - IST",
      "B) Sabiha Gökçen Havalimanı: LTFJ - SAW",
      "C) Ankara Esenboğa: LTAI - AYT",
      "D) İzmir Adnan Menderes: LTAC - ESB",
      "E) Antalya Havalimanı: LTBJ - ADB"
    ],
    "answer": 1,
    "explanation": "Slayt 6-9: Sabiha Gökçen: LTFJ / SAW'dır. İstanbul Havalimanı LTFM/IST, Atatürk LTBA/ISL, Esenboğa LTAC/ESB, Adnan Menderes LTBJ/ADB, Antalya LTAI/AYT'dir.",
    "slideRef": "Slayt 6-9"
  },
  {
    "id": 3,
    "category": "Terminoloji & Kısaltmalar",
    "difficulty": "Kolay",
    "question": "Havacılık kısaltmaları (Doc 8400) kapsamında 'AD' ve 'ASAP' kısaltmalarının doğru karşılıkları hangisidir?",
    "options": [
      "A) AD: Air Data / ASAP: Altitude Speed Air Pressure",
      "B) AD: Aerodrome (Meydan) / ASAP: As Soon As Possible (En kısa sürede)",
      "C) AD: Approach Descent / ASAP: Airport Slot Allocation Plan",
      "D) AD: Air Defense / ASAP: Aviation Safety Action Program",
      "E) AD: Aircraft Departure / ASAP: All Stations Air Plan"
    ],
    "answer": 1,
    "explanation": "Slayt 12: AD = Aerodrome (Hava Meydanı), ASAP = As Soon As Possible (Mümkün olan en kısa sürede).",
    "slideRef": "Slayt 12"
  },
  {
    "id": 4,
    "category": "Terminoloji & Kısaltmalar",
    "difficulty": "Orta",
    "question": "Havacılık haberleşmesinde bir uçuşun fiili kalkış/iniş bilgilerini ve varsa gecikme nedenini diğer istasyonlara bildiren hareket mesajı hangisidir?",
    "options": [
      "A) LDM (Load Distribution Message)",
      "B) MVT (Movement Message)",
      "C) FPL (Filed Flight Plan)",
      "D) NOTAM (Notice to Airmen)",
      "E) SCR (Slot Clearance Request)"
    ],
    "answer": 1,
    "explanation": "Slayt 13: MVT (Movement Message), uçağın kalkış (DEP), iniş (ARR/EA) ve gecikme (DLA) durumlarını bildiren standart operasyonel mesajdır.",
    "slideRef": "Slayt 13"
  },
  {
    "id": 5,
    "category": "Terminoloji & Kısaltmalar",
    "difficulty": "Orta",
    "question": "Dispeçer ve yer işletme operasyonlarında kullanılan 'LDM' kısaltmasının açılımı ve temel amacı nedir?",
    "options": [
      "A) Landing Distance Margin - İniş mesafe marjı",
      "B) Line Dispatch Management - Hat dispeç yönetimi",
      "C) Load Distribution Message - Uçaktaki yolcu, bagaj, kargo ve yakıt yükünün dağılım mesajı",
      "D) Late Departure Mitigation - Kalkış rötarlarını önleme mesajı",
      "E) Low Drag Minimum - Alçak sürtünme limiti"
    ],
    "answer": 2,
    "explanation": "Slayt 13: LDM (Load Distribution Message), uçaktaki yolcu sayısı (PAX), bagaj, kargo ve yakıtın kompartımanlara ağırlık dağılımını gösterir.",
    "slideRef": "Slayt 13"
  },
  {
    "id": 6,
    "category": "Terminoloji & Kısaltmalar",
    "difficulty": "Kolay",
    "question": "MVT (Movement Message) içerisinde yer alan 'ETA' ve 'ETD' kısaltmalarının doğru anlamları hangi seçenekte verilmiştir?",
    "options": [
      "A) ETA: Erken Kalkış / ETD: Erken Varış",
      "B) ETA: Estimated Time of Arrival (Tahmini Varış Zamanı) / ETD: Estimated Time of Departure (Tahmini Kalkış Zamanı)",
      "C) ETA: Gerçek İniş Zamanı / ETD: Gerçek Kalkış Zamanı",
      "D) ETA: Elektronik Uçuş İzni / ETD: Elektronik Tarife Bildirimi",
      "E) ETA: Yakıt Tüketim Zamanı / ETD: Motor Başlatma Zamanı"
    ],
    "answer": 1,
    "explanation": "Slayt 13: ETA = Estimated Time of Arrival (Tahmini Varış), ETD = Estimated Time of Departure (Tahmini Kalkış).",
    "slideRef": "Slayt 13"
  },
  {
    "id": 7,
    "category": "Terminoloji & Kısaltmalar",
    "difficulty": "Kolay",
    "question": "Havacılık kısaltmaları listesinde uçuş planının veya bir mesajın iptal edildiğini bildiren standart kod hangisidir?",
    "options": [
      "A) CLSD",
      "B) CNL",
      "C) DLA",
      "D) ATTN",
      "E) CIV"
    ],
    "answer": 1,
    "explanation": "Slayt 12: CNL = Cancel or cancelled (İptal / İptal edildi). CLSD ise kapalı (closed) anlamına gelir.",
    "slideRef": "Slayt 12"
  },
  {
    "id": 8,
    "category": "Terminoloji & Kısaltmalar",
    "difficulty": "Kolay",
    "question": "Bir havayolu işletmesine ticari hava taşımacılığı yapabilmesi için Sivil Havacılık Otoritesi (CAA/SHGM) tarafından verilen resmi işletme belgesi/ruhsatı kısaltması nedir?",
    "options": [
      "A) ATC (Air Traffic Control)",
      "B) AOC (Air Operator Certificate)",
      "C) AIM (Aeronautical Information Management)",
      "D) FPL (Flight Plan License)",
      "E) IATA (International Air Transport Association)"
    ],
    "answer": 1,
    "explanation": "Slayt 11: AOC (Air Operator Certificate) = Hava Taşıyıcı İşletme Ruhsatı / Belgesi.",
    "slideRef": "Slayt 11"
  },
  {
    "id": 9,
    "category": "Terminoloji & Kısaltmalar",
    "difficulty": "Orta",
    "question": "ICAO Fonetik Alfabesinde 'C', 'G', 'K', 'Q' harflerinin standart okunuşları hangisinde sırasıyla doğru verilmiştir?",
    "options": [
      "A) Canada, Germany, King, Queen",
      "B) Charlie, Golf, Kilo, Quebec",
      "C) Coca, George, Kentucky, Quick",
      "D) Charlie, Green, Knife, Quebec",
      "E) Check, Golf, King, Quiet"
    ],
    "answer": 1,
    "explanation": "Slayt 5: ICAO Fonetik Alfabesi standart kodları: C = Charlie, G = Golf, K = Kilo, Q = Quebec.",
    "slideRef": "Slayt 5"
  },
  {
    "id": 10,
    "category": "Terminoloji & Kısaltmalar",
    "difficulty": "Orta",
    "question": "Havacılık terimlerinde 'Hava Trafik Kontrol Müsaadesi' için kullanılan uluslararası terim ve kısaltma hangisidir?",
    "options": [
      "A) ATC Clearance",
      "B) Slot Approval",
      "C) AIP Supplement",
      "D) NOTAM Release",
      "E) AOC Grant"
    ],
    "answer": 0,
    "explanation": "Slayt 10: Hava Trafik Kontrol Müsaadesi = Air Traffic Control Clearance (ATC Müsaadesi).",
    "slideRef": "Slayt 10"
  },
  {
    "id": 11,
    "category": "Terminoloji & Kısaltmalar",
    "difficulty": "Orta",
    "question": "Havacılık kısaltmaları tablosunda yer alan 'CIV' ve 'MIL' kısaltmaları neyi ifade eder?",
    "options": [
      "A) CIV: Sivil (Civil) / MIL: Askeri (Military)",
      "B) CIV: Hava Sahası / MIL: Havalimanı",
      "C) CIV: İç Hat / MIL: Dış Hat",
      "D) CIV: Kargo / MIL: Yolcu",
      "E) CIV: Zorunlu İniş / MIL: Teknik İniş"
    ],
    "answer": 0,
    "explanation": "Slayt 12: CIV = Civil (Sivil), MIL = Military (Askeri).",
    "slideRef": "Slayt 12"
  },
  {
    "id": 12,
    "category": "Terminoloji & Kısaltmalar",
    "difficulty": "Zor (Senaryo)",
    "question": "Bir dispeçer, uçağın kalkışının gecikeceğini ve yeni tahmini kalkış zamanını EUROCONTROL ve ilgili istasyonlara bildirmek için hangi mesaj formatını kullanmalıdır?",
    "options": [
      "A) LDM mesajı içerisinde PAX sayısını güncelleyerek",
      "B) DLA (Delay) mesajı çekerek yeni kalkış zamanını belirterek",
      "C) Sadece NOTAM yayınlayarak",
      "D) Uçuş planını (FPL) silip yeni şirket açarak",
      "E) Meydan işletmecisine telefon ederek"
    ],
    "answer": 1,
    "explanation": "Slayt 13: DLA (Delay Message - Gecikme Mesajı), uçuş planında belirtilen kalkış saatinden sapmalarda çekilen standart ATC/operasyon mesajıdır.",
    "slideRef": "Slayt 13"
  },
  {
    "id": 13,
    "category": "Terminoloji & Kısaltmalar",
    "difficulty": "Kolay",
    "question": "AIM (Aeronautical Information Management) hizmetinin temel amacı nedir?",
    "options": [
      "A) Uçak bileti fiyatlarını belirlemek",
      "B) Uçuş emniyeti, düzeni ve verimliliği için gerekli havacılık bilgi ve verilerini sağlamak",
      "C) Pilotların maaş bordrolarını düzenlemek",
      "D) Gümrük kaçakçılığını takip etmek",
      "E) Sadece askeri radar verilerini kaydetmek"
    ],
    "answer": 1,
    "explanation": "Slayt 10: AIM Hizmeti (Havacılık Bilgi Yönetimi), uluslararası hava seyrüseferinin emniyet, düzen ve etkinliği için gerekli bilgileri sağlar.",
    "slideRef": "Slayt 10"
  },
  {
    "id": 14,
    "category": "Terminoloji & Kısaltmalar",
    "difficulty": "Kolay",
    "question": "Aşağıdaki Türkiye havalimanı ICAO kodlarından hangisi Akdeniz / Ege bölgesindeki bir turizm meydanımıza aittir?",
    "options": [
      "A) LTAC (Ankara)",
      "B) LTFJ (Sabiha Gökçen)",
      "C) LTAI (Antalya)",
      "D) LTBA (Atatürk)",
      "E) LTFM (İstanbul)"
    ],
    "answer": 2,
    "explanation": "Slayt 6-9: LTAI, Antalya Havalimanı'nın resmi ICAO kodudur.",
    "slideRef": "Slayt 6-9"
  },
  {
    "id": 15,
    "category": "Terminoloji & Kısaltmalar",
    "difficulty": "Orta",
    "question": "Uluslararası sivil havacılıkta 'Airworthiness' teriminin Türkçe tam hukuki karşılığı nedir?",
    "options": [
      "A) Hava Seyrüseferi",
      "B) Uçuşa Elverişlilik",
      "C) Slot Tahsisi",
      "D) Rampa Denetimi",
      "E) Rota İzni"
    ],
    "answer": 1,
    "explanation": "Slayt 11: Airworthiness = Uçuşa Elverişlilik.",
    "slideRef": "Slayt 11"
  },
  {
    "id": 16,
    "category": "Hukuk & Konvansiyonlar",
    "difficulty": "Orta",
    "question": "Havacılık hukukunda 'Kamu hizmetine tahsis edilen, devletin Askerlik, Gümrük ve Güvenlik/Polis hizmetlerinde kullanılan hava araçlarına' ne ad verilir?",
    "options": [
      "A) Sivil Hava Aracı",
      "B) Devlet Hava Aracı",
      "C) Genel Havacılık Uçağı",
      "D) Charter Uçağı",
      "E) Ticari Taşıyıcı"
    ],
    "answer": 1,
    "explanation": "Slayt 17: Kamu hizmetine tahsis edilen askerlik, gümrük ve polis/güvenlik araçlarına 'Devlet Hava Araçları' denir.",
    "slideRef": "Slayt 17"
  },
  {
    "id": 17,
    "category": "Hukuk & Konvansiyonlar",
    "difficulty": "Zor (Senaryo)",
    "question": "Uluslararası sivil havacılığın temel taşı olan aşağıdaki hangi üç sözleşmenin hükümleri 'Devlet Hava Araçlarına' KESİNLİKLE UYGULANMAZ?",
    "options": [
      "A) Varşova, Lahey, Montreal",
      "B) Paris, Şikago ve Roma Konvansiyonları",
      "C) Tokyo, Varşova, Cenevre",
      "D) Roma, Lahey, Tokyo",
      "E) Madrid, Brüksel, Londra"
    ],
    "answer": 1,
    "explanation": "Slayt 17: 'Devlet hava araçlarına PARİS, ŞİKAGO ve ROMA Konvansiyonları hükümleri uygulanmaz.'",
    "slideRef": "Slayt 17"
  },
  {
    "id": 18,
    "category": "Hukuk & Konvansiyonlar",
    "difficulty": "Kolay",
    "question": "1919 Paris Konvansiyonu'nun sivil havacılık tarihindeki en önemli hukuki ilkesi nedir?",
    "options": [
      "A) Açık Semalar (Open Skies) ilkesini getirmiştir.",
      "B) Her devletin, ülkesi üzerindeki hava sahasında tam ve mutlak egemenliğe sahip olduğunu ilk kez kabul etmiştir.",
      "C) Havayolu şirketlerinin tazminat sorumluluklarını sınırlamıştır.",
      "D) Uçak kaçırma suçlarını düzenlemiştir.",
      "E) ICAO'yu resmen kurmuştur."
    ],
    "answer": 1,
    "explanation": "Slayt 18-19: 1919 Paris Konvansiyonu, her devletin kendi hava sahası üzerinde 'tam ve münhasır (mutlak) egemenliğe' sahip olduğunu uluslararası hukuka sokmuştur.",
    "slideRef": "Slayt 18-19"
  },
  {
    "id": 19,
    "category": "Hukuk & Konvansiyonlar",
    "difficulty": "Kolay",
    "question": "Havayolu ile yapılan uluslararası taşımalarda taşıyıcının yolcu ölümü, yaralanması, bagaj ve kargo kaybına ilişkin hukuki ve mali sorumluluğunu düzenleyen ilk temel konvansiyon hangisidir?",
    "options": [
      "A) 1944 Chicago Konvansiyonu",
      "B) 1929 Varşova Konvansiyonu",
      "C) 1963 Tokyo Konvansiyonu",
      "D) 1970 Lahey Konvansiyonu",
      "E) 1952 Roma Konvansiyonu"
    ],
    "answer": 1,
    "explanation": "Slayt 20-22: 1929 Varşova Konvansiyonu, taşıyıcının yolcu ve bagaj/kargo hasarındaki hukuki sorumluluk ve tazminat limitlerini belirlemiştir.",
    "slideRef": "Slayt 20-22"
  },
  {
    "id": 20,
    "category": "Hukuk & Konvansiyonlar",
    "difficulty": "Orta",
    "question": "Varşova Konvansiyonu ve Lahey Protokolü hükümleri aşağıdaki uçuş türlerinden hangisine KURAL OLARAK UYGULANMAZ?",
    "options": [
      "A) Düzenli tarifeli dış hat uçuşlarına",
      "B) Charter (Tarifesiz) seferleri ile yapılan taşımalara",
      "C) Uluslararası kargo taşımalarına",
      "D) İki taraf devlet arasındaki yolcu seferlerine",
      "E) Aktarmalı uluslararası biletli yolculara"
    ],
    "answer": 1,
    "explanation": "Slayt 23: 'Charter seferleri ile yapılan taşımalara Varşova-Lahey hükümleri uygulanamaz. Charter seferleri düzenli bir tarifeye dayanmaz ve umumun istifadesine açık değildir.'",
    "slideRef": "Slayt 23"
  },
  {
    "id": 21,
    "category": "Hukuk & Konvansiyonlar",
    "difficulty": "Orta",
    "question": "1952 Roma Konvansiyonu'nun sivil havacılıktaki temel düzenleme alanı nedir?",
    "options": [
      "A) Hava araçlarının yüzeydeki (yerdeki) üçüncü şahıslara verdiği zararların tazmini",
      "B) Uçak içi hırsızlık suçları",
      "C) Kokpit ekibinin uçuş ve görev süreleri",
      "D) Slot koordinasyon kuralları",
      "E) Havalimanı iniş kalkış ücretleri"
    ],
    "answer": 0,
    "explanation": "Slayt 24: Roma Konvansiyonu (1952), yabancı bir hava aracının yerde/yüzeyde bulunan üçüncü şahıslara ve mallara verdiği zararlardan doğan sorumluluğu düzenler.",
    "slideRef": "Slayt 24"
  },
  {
    "id": 22,
    "category": "Hukuk & Konvansiyonlar",
    "difficulty": "Kolay",
    "question": "7 Aralık 1944 tarihli Chicago Konvansiyonu ile kurulan ve sivil havacılık standartlarını (SARPs / Ekler) belirleyen Birleşmiş Milletler uzman kuruluşu hangisidir?",
    "options": [
      "A) IATA",
      "B) ICAO",
      "C) EASA",
      "D) EUROCONTROL",
      "E) ECAC"
    ],
    "answer": 1,
    "explanation": "Slayt 25-26: 1944 Şikago Konvansiyonu ile ICAO (Uluslararası Sivil Havacılık Örgütü) kurulmuştur.",
    "slideRef": "Slayt 25-26"
  },
  {
    "id": 23,
    "category": "Hukuk & Konvansiyonlar",
    "difficulty": "Orta",
    "question": "Chicago Konvansiyonu'nun 'Kabotaj' başlıklı 7. Maddesi devletlere hangi hakkı ve kısıtlamayı getirmiştir?",
    "options": [
      "A) Her devlete yabancı ülkelerde serbestçe iç hat uçma zorunluluğu getirmiştir.",
      "B) Taraf devletlerin, kendi ülkesi içindeki iki nokta arasındaki ticari taşımayı (kabotaj) kendi milli taşıyıcılarına saklı tutma hakkını tanımıştır.",
      "C) Tüm dünyada iç hat uçuşlarını tamamen serbest bırakmıştır.",
      "D) Sadece deniz aşırı ülkelere kabotaj hakkı tanımıştır.",
      "E) Kabotaj hakkının sadece askeri uçaklara verilmesini emretmiştir."
    ],
    "answer": 1,
    "explanation": "Slayt 26: Şikago Sözleşmesi Madde 7, kabotaj hakkını düzenler. Her devlet kendi iç hat noktaları arasındaki ticari taşımacılığı kendi bayrağını taşıyan araçlara tahsis etme yetkisine sahiptir.",
    "slideRef": "Slayt 26"
  },
  {
    "id": 24,
    "category": "Hukuk & Konvansiyonlar",
    "difficulty": "Orta",
    "question": "Devletlerin çok taraflı sözleşmeler yerine 'İkili Hava Ulaştırma Anlaşmaları' (Bilateral Agreements) yapmayı tercih etmelerinin temel sebebi nedir?",
    "options": [
      "A) ICAO'nun kapatılmış olması",
      "B) Çok taraflı sözleşmelerle trafik haklarının kontrol ve sürdürülebilirliğini sağlamak istememeleri, ekonomik dengeleri ikili koruma arzusu",
      "C) Tüm dünyada vizelerin kaldırılması",
      "D) Sadece tek bir uçak üreticisinin bulunması",
      "E) Hava sahalarının birleştirilmek istenmesi"
    ],
    "answer": 1,
    "explanation": "Slayt 29: Devletlerin çok taraflı sözleşmelerle trafik haklarının kontrolünü kaybetmek istememesi, birbirine yakın ekonomik güçteki devletlerle ikili anlaşmalar yapma yolunu açmıştır.",
    "slideRef": "Slayt 29"
  },
  {
    "id": 25,
    "category": "Hukuk & Konvansiyonlar",
    "difficulty": "Orta",
    "question": "1963 Tokyo Konvansiyonu'nun sivil havacılık güvenliği açısından getirdiği EN ÖNEMLİ yenilik hangisidir?",
    "options": [
      "A) Uçak kaçıranlara ölüm cezası getirilmesi",
      "B) Uçak içinde işlenen suçlarda yetkiyi tescil devletine vermesi ve Kaptan Pilota şüpheli kişileri etkisiz hale getirme/bağlama yetkisi tanıması",
      "C) Havalimanlarında X-Ray cihazı zorunluluğu getirmesi",
      "D) Sıvı kısıtlaması getirmesi",
      "E) Pilotların silah taşımasını zorunlu kılması"
    ],
    "answer": 1,
    "explanation": "Slayt 31-32: Tokyo Sözleşmesi (1963), uçak içindeki suçlar ve eylemlerde tescil devletinin yargı yetkisini ve uçak komutanının (kaptan pilot) emniyet tedbiri alma yetkilerini düzenlemiştir.",
    "slideRef": "Slayt 31-32"
  },
  {
    "id": 26,
    "category": "Hukuk & Konvansiyonlar",
    "difficulty": "Kolay",
    "question": "16 Aralık 1970 tarihli Lahey Sözleşmesi'nin doğrudan mücadele ettiği ve uluslararası suç ilan ettiği eylem nedir?",
    "options": [
      "A) Bagaj hırsızlığı",
      "B) Hava aracının yasa dışı ele geçirilmesi / Uçak kaçırma (Hijacking)",
      "C) Fazla bilet satışı (Overbooking)",
      "D) Slota uymama",
      "E) Pilot lisans sahteciliği"
    ],
    "answer": 1,
    "explanation": "Slayt 33: 1970 Lahey Sözleşmesi, uçak kaçırma (hava aracının yasa dışı zaptı) fiilini suç kabul etmiş ve suçluların iadesi/yargılanmasını hükme bağlamıştır.",
    "slideRef": "Slayt 33"
  },
  {
    "id": 27,
    "category": "Hukuk & Konvansiyonlar",
    "difficulty": "Kolay",
    "question": "Tokyo ve Lahey sözleşmelerinin eksik bıraktığı 'hava aracına ve tesislerine karşı SABOTAJ eylemlerini' suç kapsamına alan 1971 tarihli sözleşme hangisidir?",
    "options": [
      "A) Varşova Sözleşmesi",
      "B) Montreal Sözleşmesi (1971)",
      "C) Paris Konvansiyonu",
      "D) Roma Sözleşmesi",
      "E) Madrid Anlaşması"
    ],
    "answer": 1,
    "explanation": "Slayt 33: 1971 Montreal Sözleşmesi, 'Sivil Havacılığın Güvenliğine Karşı Kanun Dışı Eylemlerin Önlenmesi' amacıyla özellikle sabotaj fiillerini kapsama almıştır.",
    "slideRef": "Slayt 33"
  },
  {
    "id": 28,
    "category": "Hukuk & Konvansiyonlar",
    "difficulty": "Orta",
    "question": "1999 Montreal Sözleşmesi'nin 1929 Varşova Konvansiyonu'na kıyasla getirdiği en büyük reform nedir?",
    "options": [
      "A) Uçak biletlerini tamamen kaldırmıştır.",
      "B) Yolcu ölümü ve yaralanmasında taşıyıcının sorumluluk limitlerini çok yüksek SDR tutarlarına çıkarmış ve kusursuz sorumluluk ilkesini getirmiştir.",
      "C) Tüm charter uçuşlarını yasaklamıştır.",
      "D) Devlet uçaklarını sivil kapsama almıştır.",
      "E) Permi alma zorunluluğunu kaldırmıştır."
    ],
    "answer": 1,
    "explanation": "Slayt 34: 1999 Montreal Konvansiyonu, Varşova sistemini modernize ederek yolcu, bagaj ve kargo taşımacılığındaki tazminat limitlerini günümüz şartlarına yükseltmiştir.",
    "slideRef": "Slayt 34"
  },
  {
    "id": 29,
    "category": "Hukuk & Konvansiyonlar",
    "difficulty": "Zor (Senaryo)",
    "question": "Bir yolcu uluslararası bir uçuşta türbülans veya kabin ekibinin hatası nedeniyle yaralandığında havayolu şirketine açılacak maddi/manevi tazminat davasının uluslararası hukuki dayanağı hangi sözleşmedir?",
    "options": [
      "A) 1963 Tokyo Sözleşmesi",
      "B) 1970 Lahey Sözleşmesi",
      "C) 1929 Varşova / 1999 Montreal Sözleşmesi",
      "D) 1944 Chicago Sözleşmesi",
      "E) 1952 Roma Sözleşmesi"
    ],
    "answer": 2,
    "explanation": "Slayt 20, 34: Uluslararası yolcu taşımalarında bedensel zarar ve yaralanmalardan doğan hukuki sorumluluk Varşova ve Montreal sistemine tabidir.",
    "slideRef": "Slayt 20, 34"
  },
  {
    "id": 30,
    "category": "Hukuk & Konvansiyonlar",
    "difficulty": "Orta",
    "question": "Chicago Konvansiyonu'nun kabul edildiği 7 Aralık günü tüm dünyada her yıl ne olarak kutlanmaktadır?",
    "options": [
      "A) Dünya Dispeçerler Günü",
      "B) Uluslararası Sivil Havacılık Günü",
      "C) Dünya Pilotlar Günü",
      "D) Havacılık Şehitlerini Anma Günü",
      "E) Hava Trafik Kontrolörleri Günü"
    ],
    "answer": 1,
    "explanation": "Slayt 25: 7 Aralık 1944 Şikago Sözleşmesi'nin imza tarihi anısına her yıl 7 Aralık 'Uluslararası Sivil Havacılık Günü' olarak kutlanır.",
    "slideRef": "Slayt 25"
  },
  {
    "id": 31,
    "category": "Hukuk & Konvansiyonlar",
    "difficulty": "Orta",
    "question": "Uluslararası sivil havacılıkta 'Hava Seyrüseferine ve Tesislerine Karşı Suçlar' ile ilgili olarak Tokyo (1963) ve Lahey (1970) sözleşmelerinin kronolojik sırası hangisinde doğrudur?",
    "options": [
      "A) Tokyo (1963) -> Lahey (1970) -> Montreal (1971)",
      "B) Montreal (1963) -> Tokyo (1970) -> Lahey (1971)",
      "C) Lahey (1963) -> Tokyo (1970) -> Montreal (1971)",
      "D) Varşova (1963) -> Şikago (1970) -> Roma (1971)",
      "E) Paris (1963) -> Tokyo (1970) -> Lahey (1971)"
    ],
    "answer": 0,
    "explanation": "Slayt 31-33: Havacılık güvenlik sözleşmeleri sırasıyla: 1963 Tokyo (Uçak içi suçlar), 1970 Lahey (Uçak kaçırma), 1971 Montreal (Sabotaj)'dir.",
    "slideRef": "Slayt 31-33"
  },
  {
    "id": 32,
    "category": "Hukuk & Konvansiyonlar",
    "difficulty": "Orta",
    "question": "1944 Chicago Konvansiyonu'nun Ekleri (Annexes) neyi ifade eder?",
    "options": [
      "A) Sadece üye devletlerin ödeyeceği yıllık aidat listesini",
      "B) Uluslararası standartları ve tavsiye edilen uygulamaları (SARPs - Personel Lisanslama, Uçuş Kuralları, Meteoroloji, AIM vb.)",
      "C) Sadece askeri hava üslerinin koordinatlarını",
      "D) Havayolu şirketlerinin bilet fiyat tarifelerini",
      "E) Pilotların çalışma saatlerini belirleyen yerel kanunları"
    ],
    "answer": 1,
    "explanation": "Slayt 26-28: Şikago Konvansiyonu Ekleri (Annex 1'den Annex 19'a kadar), tüm dünyada sivil havacılık standartlarını (SARPs) belirleyen teknik mevzuattır.",
    "slideRef": "Slayt 26-28"
  },
  {
    "id": 33,
    "category": "Hukuk & Konvansiyonlar",
    "difficulty": "Kolay",
    "question": "Türkiye Cumhuriyeti 1944 Chicago Konvansiyonu'na hangi kanunla ve ne zaman taraf olmuştur?",
    "options": [
      "A) 1923 Lozan Antlaşması ile",
      "B) 1945 yılında 4749 sayılı Kanun ile",
      "C) 1983 yılında 2920 sayılı TSHK ile",
      "D) 1999 Montreal Kanunu ile",
      "E) 2018 Cumhurbaşkanlığı Kararnamesi ile"
    ],
    "answer": 1,
    "explanation": "Slayt 25, 57: Türkiye, 1944 Şikago Konvansiyonu ve Transit/Ulaştırma sözleşmelerine 06.06.1945 tarihinde 4749 sayılı kanun ile taraf olmuştur.",
    "slideRef": "Slayt 25, 57"
  },
  {
    "id": 34,
    "category": "Hukuk & Konvansiyonlar",
    "difficulty": "Orta",
    "question": "Bir devletin hava sahasında uçuş yapan sivil hava araçları ile ilgili olarak 1944 Chicago Sözleşmesi Madde 1 uyarınca kabul edilen temel kural nedir?",
    "options": [
      "A) Açık denizler gibi hava sahası da tamamen sahipsizdir.",
      "B) Her devlet kendi kara ülkesi ve karasuları üzerindeki hava sahasında tam ve münhasır egemenliğe sahiptir.",
      "C) Hava sahası tüm dünya devletlerinin ortak mülkiyetidir.",
      "D) Havayolu şirketleri diledikleri irtifadan kimseden izin almadan uçabilir.",
      "E) Sadece ICAO hava sahalarının sahibidir."
    ],
    "answer": 1,
    "explanation": "Slayt 18, 26: Şikago Sözleşmesi Madde 1: Her devlet, ülkesi üzerindeki hava sahasında tam ve münhasır egemenliğe sahiptir.",
    "slideRef": "Slayt 18, 26"
  },
  {
    "id": 35,
    "category": "Hukuk & Konvansiyonlar",
    "difficulty": "Orta",
    "question": "Havacılıkta 'Hava Korsanlığı' suçu işleyen bir kişinin tescil devletine iadesi ve yargılanması zorunluluğu hangi sözleşmenin temel omurgasını oluşturur?",
    "options": [
      "A) 1970 Lahey Sözleşmesi",
      "B) 1919 Paris Sözleşmesi",
      "C) 1929 Varşova Sözleşmesi",
      "D) 1952 Roma Sözleşmesi",
      "E) 1945 Bermuda Anlaşması"
    ],
    "answer": 0,
    "explanation": "Slayt 33: 1970 Lahey Sözleşmesi, hava korsanlarının iadesi veya mutlaka yargılanması (aut dedere aut judicare) kuralını getirmiştir.",
    "slideRef": "Slayt 33"
  },
  {
    "id": 36,
    "category": "Otoriteler & Kurumlar",
    "difficulty": "Kolay",
    "question": "Uluslararası Hava Taşımacılığı Birliği olan 'IATA'nın temel niteliği nedir?",
    "options": [
      "A) Devletlerarası resmi bir askeri teşkilattır.",
      "B) Dünyadaki ticari havayolu işletmelerinin üye olduğu, havayolu taşımacılığını temsil eden ticari bir birliktir.",
      "C) Hava sahası kontrolünü yapan kule teşkilatıdır.",
      "D) Uçak üreticisi bir konsorsiyumdur.",
      "E) Birleşmiş Milletler Güvenlik Konseyi alt organıdır."
    ],
    "answer": 1,
    "explanation": "Slayt 38: IATA, dünya havayolu işletmelerinin üye olduğu uluslararası sivil ticari havayolu birliğidir; biletleme standartları, slot kılavuzları (WSG) yayınlar.",
    "slideRef": "Slayt 38"
  },
  {
    "id": 37,
    "category": "Otoriteler & Kurumlar",
    "difficulty": "Kolay",
    "question": "Merkezi Brüksel'de bulunan ve Avrupa hava sahasındaki hava trafik akışını (ATFM) ve CFMU/Network Manager sistemini yöneten kuruluş hangisidir?",
    "options": [
      "A) ECAC",
      "B) EUROCONTROL",
      "C) EASA",
      "D) FAA",
      "E) ICAO"
    ],
    "answer": 1,
    "explanation": "Slayt 39: EUROCONTROL (Avrupa Hava Seyrüsefer Emniyeti Teşkilatı), Avrupa semalarındaki hava trafik akış yönetimini (ATFM) koordine eder.",
    "slideRef": "Slayt 39"
  },
  {
    "id": 38,
    "category": "Otoriteler & Kurumlar",
    "difficulty": "Orta",
    "question": "Avrupa Birliği'nin sivil havacılık emniyet ajansı olan 'EASA'nın temel görevleri arasında hangisi YER ALIR?",
    "options": [
      "A) Uçak ve parça sertifikasyonu, bakım ve operasyon emniyet standartlarını belirlemek",
      "B) Havayolu bilet fiyatlarını denetlemek",
      "C) Savaş uçaklarının askeri tatbikatlarını yönetmek",
      "D) Havalimanlarında Duty-Free mağazalarını işletmek",
      "E) Ülkeler arasındaki vize muafiyetlerini düzenlemek"
    ],
    "answer": 0,
    "explanation": "Slayt 40: EASA (European Union Aviation Safety Agency), Avrupa'da uçuş emniyeti standartları, tip sertifikasyonu ve hava aracı regülasyonlarını belirler.",
    "slideRef": "Slayt 40"
  },
  {
    "id": 39,
    "category": "Otoriteler & Kurumlar",
    "difficulty": "Kolay",
    "question": "Meydanlarda gerçekleştirilen rampa denetimlerinde; 'YABANCI tescilli uçakları denetleyen program' ile 'YERLİ/MİLLİ uçakları denetleyen program' kısaltmaları hangisidir?",
    "options": [
      "A) SAFA (Yabancı) - SANA (Yerli)",
      "B) SANA (Yabancı) - SAFA (Yerli)",
      "C) IATA (Yabancı) - ICAO (Yerli)",
      "D) ECAC (Yabancı) - EASA (Yerli)",
      "E) AOC (Yabancı) - CAA (Yerli)"
    ],
    "answer": 0,
    "explanation": "Slayt 41-42: SAFA = Safety Assessment of Foreign Aircraft (Yabancı), SANA = Safety Assessment of National Aircraft (Yerli).",
    "slideRef": "Slayt 41-42"
  },
  {
    "id": 40,
    "category": "Otoriteler & Kurumlar",
    "difficulty": "Orta",
    "question": "Türkiye'de SAFA ve SANA rampa emniyet denetimlerini icra etmeye yetkili resmi kurum hangisidir?",
    "options": [
      "A) DHMİ Rampa Şefliği",
      "B) Sivil Havacılık Genel Müdürlüğü (SHGM) Denetçileri",
      "C) Emniyet Genel Müdürlüğü Havacılık Şubesi",
      "D) Hava Meydanı Özel Güvenlik Birimi",
      "E) Türk Hava Yolları Kalite Başkanlığı"
    ],
    "answer": 1,
    "explanation": "Slayt 41-42: Türkiye'de SAFA ve SANA denetimleri münhasıran sivil havacılık otoritesi olan SHGM tarafından yetkilendirilmiş denetçilerce yapılır.",
    "slideRef": "Slayt 41-42"
  },
  {
    "id": 41,
    "category": "Otoriteler & Kurumlar",
    "difficulty": "Kolay",
    "question": "233 Sayılı KHK kapsamında bir Kamu İktisadi Teşebbüsü (KİT) olarak Türkiye havalimanlarını işleten ve hava seyrüsefer/ATC hizmetlerini yürüten kuruluş hangisidir?",
    "options": [
      "A) SHGM",
      "B) DHMİ",
      "C) TUSAŞ",
      "D) THY",
      "E) HEAŞ"
    ],
    "answer": 1,
    "explanation": "Slayt 52: DHMİ (Devlet Hava Meydanları İşletmesi Genel Müdürlüğü), Türkiye hava sahasındaki ATC hizmetlerini yürüten ve kamu meydanlarını işleten KİT'tir.",
    "slideRef": "Slayt 52"
  },
  {
    "id": 42,
    "category": "Otoriteler & Kurumlar",
    "difficulty": "Orta",
    "question": "Türkiye'de Sivil Havacılık Genel Müdürlüğü'nün (SHGM) görevleri arasında aşağıdakilerden hangisi YER ALMAZ?",
    "options": [
      "A) Uçuş izinlerini (permi) değerlendirmek ve vermek",
      "B) Havayolu işletmelerine AOC düzenlemek",
      "C) Havalimanı kontrol kulelerinde bizzat Hava Trafik Kontrolörlüğü (ATC) hizmeti vermek",
      "D) Havacılık kuralları koymak ve mevzuata aykırılıkta idari para cezası uygulamak",
      "E) Uçuş ekibi ve teknisyen lisanslandırma işlemlerini yürütmek"
    ],
    "answer": 2,
    "explanation": "Slayt 50-52: Kulede hava trafik kontrol (ATC) hizmetini fiilen veren kurum DHMİ'dir. SHGM ise otoritedir (kural koyar, ruhsat/permi verir, denetler).",
    "slideRef": "Slayt 50-52"
  },
  {
    "id": 43,
    "category": "Otoriteler & Kurumlar",
    "difficulty": "Orta",
    "question": "14.10.1983 tarihli 2920 Sayılı Türk Sivil Havacılık Kanunu'nun (TSHK) temel amacı nedir?",
    "options": [
      "A) Sadece Türk Hava Yolları'nın bilet fiyatlarını belirlemek",
      "B) Sivil havacılık sahasındaki faaliyetlerin ulusal çıkarlarımız ve uluslararası ilişkilere uygun şekilde düzenlenmesini sağlamak",
      "C) Tüm yabancı hava araçlarının Türkiye'ye girişini yasaklamak",
      "D) Askeri uçakların bakım periyotlarını düzenlemek",
      "E) Havalimanı taksi tarifelerini sabitlemek"
    ],
    "answer": 1,
    "explanation": "Slayt 46: 2920 Sayılı Kanun Madde 1: Sivil havacılık faaliyetlerinin ulusal çıkarlarımız ve uluslararası ilişkilere uygun düzenlenmesini sağlamaktır.",
    "slideRef": "Slayt 46"
  },
  {
    "id": 44,
    "category": "Otoriteler & Kurumlar",
    "difficulty": "Zor (Senaryo)",
    "question": "2920 Sayılı TSHK Madde 90 uyarınca, Türk hava sahasında uçuş yapacak 'Yabancı Devlet Hava Araçları'nın hukuki sorumluluğu nedir?",
    "options": [
      "A) Yabancı devlet hava araçları hiçbir Türk kanununa tabi değildir.",
      "B) Türk hava sahasında uçuş yapacak yabancı devlet hava araçları Türk kanunlarına ve bunlara bağlı kurallara uymak zorundadırlar.",
      "C) Sadece kendi ülkelerinin kanunlarına uyarlar.",
      "D) NATO üyesi iseler Türk hava sahasında istedikleri gibi uçabilirler.",
      "E) Yabancı devlet uçaklarının Türk hava sahasına girmesi ebediyen yasaktır."
    ],
    "answer": 1,
    "explanation": "Slayt 49: 2920 Sayılı TSHK Madde 90: 'Türk hava sahasında uçuş yapacak yabancı devlet hava araçları; Türk kanunlarına ve bunlara bağlı kurallara uymak zorundadırlar.'",
    "slideRef": "Slayt 49"
  },
  {
    "id": 45,
    "category": "Otoriteler & Kurumlar",
    "difficulty": "Orta",
    "question": "Uçuş izinlendirme sürecinde görev alan ve hava sahası koordinasyonunu sağlayan 'Uluslararası FIC Birimi' hangi kurum bünyesinde yer alır?",
    "options": [
      "A) Dışişleri Bakanlığı",
      "B) DHMİ - Hava Trafik Kontrol Merkezi (HTKM / SMART)",
      "C) Milli Savunma Bakanlığı",
      "D) Emniyet Genel Müdürlüğü",
      "E) Gümrük Muhafaza Başmüdürlüğü"
    ],
    "answer": 1,
    "explanation": "Slayt 53: Uluslararası FIC birimi (Uçuş Bilgi Merkezi), DHMİ bünyesindeki Hava Trafik Kontrol Merkezi'nde (HTKM) görev yapar.",
    "slideRef": "Slayt 53"
  },
  {
    "id": 46,
    "category": "Otoriteler & Kurumlar",
    "difficulty": "Kolay",
    "question": "ECAC (European Civil Aviation Conference) teşkilatının temel amacı nedir?",
    "options": [
      "A) Avrupa devletleri arasında sivil havacılık politikaları ve uygulamalarında uyum ve eşgüdüm sağlamak",
      "B) Uçak motoru üretmek",
      "C) Askeri hava savunma füzelerini kontrol etmek",
      "D) Havalimanlarında yolcu bagajlarını taşımak",
      "E) Pilotlara pasaport vermek"
    ],
    "answer": 0,
    "explanation": "Slayt 37: ECAC (Avrupa Sivil Havacılık Konferansı), Avrupa'da emniyetli, verimli ve sürdürülebilir bir hava taşımacılığı sistemi geliştirmek için politikalar üretir.",
    "slideRef": "Slayt 37"
  },
  {
    "id": 47,
    "category": "Otoriteler & Kurumlar",
    "difficulty": "Orta",
    "question": "Havalimanı slot koordinasyonunu Türkiye'de yöneten ve seviyelendirilmiş meydanlarda slot tahsisi yapan birim hangisidir?",
    "options": [
      "A) SHGM Lisans Şubesi",
      "B) DHMİ Slot Koordinasyon Merkezi Başmüdürlüğü",
      "C) Türk Hava Yolları Planlama",
      "D) Meteoroloji Genel Müdürlüğü",
      "E) Ulaştırma Bölge Müdürlüğü"
    ],
    "answer": 1,
    "explanation": "Slayt 53, 94: Türkiye'deki havalimanlarında slot koordinasyonu DHMİ Slot Koordinasyon Merkezi tarafından yürütülür.",
    "slideRef": "Slayt 53, 94"
  },
  {
    "id": 48,
    "category": "Otoriteler & Kurumlar",
    "difficulty": "Orta",
    "question": "2920 Sayılı TSHK Madde 91'e göre sivil hava araçlarının iniş kalkışları ile ilgili temel kural nedir?",
    "options": [
      "A) Sivil hava araçları Kanunun öngördüğü esaslar idaresinde saptanmış bulunan havaalanlarından başka yerlerde iniş/kalkış yapamazlar.",
      "B) Pilotlar istedikleri otoyola serbestçe inebilirler.",
      "C) Gündüzleri boş arazilere serbest iniş serbesttir.",
      "D) Sivil hava araçları kule talimatını dinlemek zorunda değildir.",
      "E) İniş kalkış için sadece belediye başkanından izin alınır."
    ],
    "answer": 0,
    "explanation": "Slayt 49: 2920 Sayılı Kanun Madde 91: Sivil hava araçlarının iniş ve kalkışları, kanunen saptanmış bulunan havaalanlarından başka yerlerde yapılamaz.",
    "slideRef": "Slayt 49"
  },
  {
    "id": 49,
    "category": "Otoriteler & Kurumlar",
    "difficulty": "Kolay",
    "question": "Uluslararası Sivil Havacılık Teşkilatı ICAO'nun genel merkezi hangi şehirdedir?",
    "options": [
      "A) Brüksel (Belçika)",
      "B) Cenevre (İsviçre)",
      "C) Montreal (Kanada)",
      "D) Paris (Fransa)",
      "E) New York (ABD)"
    ],
    "answer": 2,
    "explanation": "Slayt 36: ICAO'nun daimi genel merkezi Montreal, Kanada'dadır.",
    "slideRef": "Slayt 36"
  },
  {
    "id": 50,
    "category": "Otoriteler & Kurumlar",
    "difficulty": "Orta",
    "question": "Türkiye'de tehlikeli maddelerin sivil hava araçlarıyla taşınmasında SHGM'nin koordinasyon kurduğu Ulaştırma ve Altyapı Bakanlığı birimi hangisidir?",
    "options": [
      "A) Karayolları Genel Müdürlüğü",
      "B) Tehlikeli Mal ve Kombine Taşımacılık Düzenleme Genel Müdürlüğü (TMKT)",
      "C) Tersaneler Genel Müdürlüğü",
      "D) TCDD Taşımacılık",
      "E) Haberleşme Genel Müdürlüğü"
    ],
    "answer": 1,
    "explanation": "Slayt 53, 91: Tehlikeli maddelerin taşınması başvuruları TMKT Genel Müdürlüğü ile koordine edilerek SHGM tarafından sonuçlandırılır.",
    "slideRef": "Slayt 53, 91"
  },
  {
    "id": 51,
    "category": "Trafik Hakları",
    "difficulty": "Kolay",
    "question": "1. Trafik Hakkı (Birinci Serbesti) ne anlama gelir?",
    "options": [
      "A) Bir devletin hava araçlarının diğer bir devletin hava sahasından YERE İNMEKSİZİN GEÇİŞ yapabilme hakkıdır.",
      "B) Yakıt almak için teknik iniş yapma hakkıdır.",
      "C) Yolcu indirip bindirme hakkıdır.",
      "D) İç hatlarda uçabilme hakkıdır.",
      "E) İki yabancı ülke arasında bağımsız uçma hakkıdır."
    ],
    "answer": 0,
    "explanation": "Slayt 58: 1. Trafik Hakkı: Bir havayolunun diğer bir ülkenin hava sahasından yere inmeksizin transit geçiş (aşırı uçuş / overflight) yapabilme hakkıdır.",
    "slideRef": "Slayt 58"
  },
  {
    "id": 52,
    "category": "Trafik Hakları",
    "difficulty": "Kolay",
    "question": "2. Trafik Hakkı (İkinci Serbesti) aşağıdakilerden hangisidir?",
    "options": [
      "A) Ticari yolcu indirme hakkı",
      "B) Ticari amaç DIŞINDA, yakıt ikmali veya teknik sebeplerle diğer ülke topraklarına inebilme hakkı",
      "C) Kendi ülkesine yolcu taşıma hakkı",
      "D) Tam kabotaj hakkı",
      "E) Kargo taşıma tekeli"
    ],
    "answer": 1,
    "explanation": "Slayt 59: 2. Trafik Hakkı: Ticari amaç dışında yakıt ikmali veya teknik arıza nedeniyle inebilme hakkıdır (Teknik İniş Hakkı). Yolcu/yük alıp indiremez.",
    "slideRef": "Slayt 59"
  },
  {
    "id": 53,
    "category": "Trafik Hakları",
    "difficulty": "Kolay",
    "question": "Senaryo:\nTürk Hava Yolları uçağı, İstanbul meydanından kalkarak İspanya'nın Barselona meydanına uçuyor ve taşıdığı yolcuları burada indiriyor.\n\nBu taşıma faaliyeti Chicago Sözleşmesi'ne göre hangi serbesti / trafik hakkıdır?",
    "options": [
      "A) 1. Trafik Hakkı",
      "B) 2. Trafik Hakkı",
      "C) 3. Trafik Hakkı",
      "D) 4. Trafik Hakkı",
      "E) 5. Trafik Hakkı"
    ],
    "answer": 2,
    "explanation": "Slayt 60: 3. Trafik Hakkı: Bir taşıyıcının kendi ülkesinden başka bir ülkeye ticari amaçla yolcu ve yük taşıma hakkıdır.",
    "slideRef": "Slayt 60"
  },
  {
    "id": 54,
    "category": "Trafik Hakları",
    "difficulty": "Kolay",
    "question": "Senaryo:\nTürk Hava Yolları uçağı, İspanya'nın Barselona meydanından aldığı ticari yolcuları Türkiye'ye getirerek İstanbul meydanına indiriyor.\n\nBu taşıma faaliyeti Chicago Sözleşmesi'ne göre hangi trafik hakkıdır?",
    "options": [
      "A) 3. Trafik Hakkı",
      "B) 4. Trafik Hakkı",
      "C) 5. Trafik Hakkı",
      "D) 6. Trafik Hakkı",
      "E) 7. Trafik Hakkı"
    ],
    "answer": 1,
    "explanation": "Slayt 61: 4. Trafik Hakkı: Başka bir ülkeden kendi tescil ülkesine yolcu ve yük taşıma hakkıdır.",
    "slideRef": "Slayt 61"
  },
  {
    "id": 55,
    "category": "Trafik Hakları",
    "difficulty": "Zor (Senaryo)",
    "question": "Senaryo:\nTürk Hava Yolları uçağı; İstanbul'dan kalkarak Singapur'a iniyor. Buradan aldığı yeni yolcularla Avustralya'ya uçuyor ve Singapur ile Avustralya arasındaki parkur için bağımsız olarak bilet satışı yapıyor.\n\nSingapur ile Avustralya arasındaki bu taşıma hangi trafik hakkıdır?",
    "options": [
      "A) 4. Trafik Hakkı",
      "B) 5. Trafik Hakkı",
      "C) 7. Trafik Hakkı",
      "D) 8. Trafik Hakkı",
      "E) 9. Trafik Hakkı"
    ],
    "answer": 1,
    "explanation": "Slayt 62-63: 5. Trafik Hakkı: Kendi ülkesinde başlamak veya bitmek şartıyla iki yabancı ülke arasındaki ticari trafiği taşıma hakkıdır.",
    "slideRef": "Slayt 62-63"
  },
  {
    "id": 56,
    "category": "Trafik Hakları",
    "difficulty": "Zor (Senaryo)",
    "question": "Senaryo:\nTürk Hava Yolları; Londra'dan aldığı yolcuyu Türkiye'de iniş-kalkış yaptırarak (gümrüğe sokmaksızın transit olarak) aktarmalı bir seferle Bangkok'a taşıyor.\n\nBu operasyon Chicago Sözleşmesi kapsamında hangi trafik hakkı olarak kabul edilir?",
    "options": [
      "A) 5. Trafik Hakkı",
      "B) 6. Trafik Hakkı",
      "C) 7. Trafik Hakkı",
      "D) 8. Trafik Hakkı",
      "E) 9. Trafik Hakkı"
    ],
    "answer": 1,
    "explanation": "Slayt 64-65: 6. Trafik Hakkı: Bir taşıyıcının kendi ülkesini aktarma merkezi (Hub) yaparak iki yabancı ülke arasındaki trafiği taşımasıdır (4. + 3. Hak kombinasyonu).",
    "slideRef": "Slayt 64-65"
  },
  {
    "id": 57,
    "category": "Trafik Hakları",
    "difficulty": "Zor (Senaryo)",
    "question": "Senaryo:\nTürkiye tescilli bir havayolu şirketi; Türkiye ile hiçbir operasyonel veya fiziksel bağlantı kurmaksızın Zürih (İsviçre) meydanından kalkıp Londra (İngiltere) meydanına uçuyor ve bu hatta bilet satıyor.\n\nBu durum hangi serbesti / trafik hakkı kapsamındadır?",
    "options": [
      "A) 5. Trafik Hakkı",
      "B) 6. Trafik Hakkı",
      "C) 7. Trafik Hakkı",
      "D) 8. Trafik Hakkı",
      "E) 9. Trafik Hakkı"
    ],
    "answer": 2,
    "explanation": "Slayt 66: 7. Trafik Hakkı: Kendi ülkesinde başlamaksızın veya sona ermeksizin iki yabancı ülke arasındaki uluslararası trafiği taşıma hakkıdır.",
    "slideRef": "Slayt 66"
  },
  {
    "id": 58,
    "category": "Trafik Hakları",
    "difficulty": "Zor (Senaryo)",
    "question": "Senaryo:\nTürkiye tescilli bir havayolu uçağı; İstanbul'dan kalkarak Madrid'e (İspanya) iniyor. Ardından Madrid'den yeni yolcular alarak Barselona'ya (İspanya) uçuyor ve Madrid-Barselona hattında bilet satışı yapıyor.\n\nUçağın Madrid ile Barselona arasındaki bu taşıma faaliyeti hangi trafik hakkıdır?",
    "options": [
      "A) 5. Trafik Hakkı",
      "B) 7. Trafik Hakkı",
      "C) 8. Trafik Hakkı",
      "D) 9. Trafik Hakkı",
      "E) 6. Trafik Hakkı"
    ],
    "answer": 2,
    "explanation": "Slayt 67-68: 8. Trafik Hakkı (Ardışık Kabotaj): Kendi ülkesinden başlayan veya biten bir uluslararası seferin devamı olarak yabancı bir ülkenin iki iç hat noktası arasında yolcu/yük taşıma hakkıdır.",
    "slideRef": "Slayt 67-68"
  },
  {
    "id": 59,
    "category": "Trafik Hakları",
    "difficulty": "Zor (Senaryo)",
    "question": "Senaryo:\nTürkiye tescilli bir havayolu şirketi; Türkiye ile hiçbir bağlantı kurmaksızın doğrudan İspanya içinde Madrid ile Barselona arasında mekik dokuyarak tamamen iç hat bileti satmaktadır.\n\nBu taşıma faaliyeti havacılık hukukunda hangi trafik hakkıdır?",
    "options": [
      "A) 5. Trafik Hakkı",
      "B) 7. Trafik Hakkı",
      "C) 8. Trafik Hakkı",
      "D) 9. Trafik Hakkı",
      "E) 4. Trafik Hakkı"
    ],
    "answer": 3,
    "explanation": "Slayt 69-70: 9. Trafik Hakkı (Saf/Tam Kabotaj): Kendi ülkesinde başlamaksızın veya sona ermeksizin tamamen yabancı bir ülkenin iç hatlarında ticari taşımacılık yapma hakkıdır.",
    "slideRef": "Slayt 69-70"
  },
  {
    "id": 60,
    "category": "Trafik Hakları",
    "difficulty": "Zor (Senaryo)",
    "question": "5. Trafik Hakkı ile 7. Trafik Hakkı arasındaki EN KRİTİK FARK nedir?",
    "options": [
      "A) 5. hak iç hatlarda geçerlidir, 7. hak dış hatlarda geçerlidir.",
      "B) 5. hakta uçuş kendi ana vatanıyla bağlantılıdır (başlar veya biter); 7. hakta ise ana vatanla hiçbir operasyonel bağlantı yoktur.",
      "C) 5. hak sadece kargo taşır, 7. hak sadece yolcu taşır.",
      "D) 5. hakta slot gerekmez, 7. hakta slot şarttır.",
      "E) 5. hakta teknik iniş yapılır, 7. hakta transit geçilir."
    ],
    "answer": 1,
    "explanation": "Slayt 62, 66: İkisi de iki yabancı ülke arasındaki dış hat taşımacılığıdır. Ancak 5. Hakta sefer kendi ülkesinde başlar veya biter; 7. Hakta ise kendi ülkesiyle hiçbir temas yoktur.",
    "slideRef": "Slayt 62, 66"
  },
  {
    "id": 61,
    "category": "Trafik Hakları",
    "difficulty": "Zor (Senaryo)",
    "question": "8. Trafik Hakkı ile 9. Trafik Hakkı arasındaki EN TEMEL FARK nedir?",
    "options": [
      "A) 8. hakta uçak kendi ülkesinden gelmiş veya oraya gidecektir (ardışık/bağlantılı); 9. hakta ise uçak tamamen yabancı ülkenin iç hatlarında bağımsızdır.",
      "B) 8. hak kargo, 9. hak posta taşır.",
      "C) 8. hak Seviye-1 meydanlarda, 9. hak Seviye-3 meydanlarda geçerlidir.",
      "D) 8. hakta bilet kesilemez, 9. hakta bilet kesilir.",
      "E) 8. hak IASTA'da yer alır, 9. hak IATA'da yer alır."
    ],
    "answer": 0,
    "explanation": "Slayt 67-70: İkisi de yabancı ülkedeki iç hat (kabotaj) taşımacılığıdır. 8. Hak kendi ülkesiyle bağlantılıdır (Ardışık Kabotaj); 9. Hak ana vatanla hiçbir bağı olmayan Saf Kabotajdır.",
    "slideRef": "Slayt 67-70"
  },
  {
    "id": 62,
    "category": "Trafik Hakları",
    "difficulty": "Zor (Senaryo)",
    "question": "Emirates (BAE tescilli), Atina'dan (Yunanistan) kalkarak New York'a (ABD) uçmakta ve Atina-New York arasında bilet satmaktadır. Uçak Dubai'ye hiç uğramamaktadır. Bu taşıma hangi serbestidir?",
    "options": [
      "A) 4. Trafik Hakkı",
      "B) 5. Trafik Hakkı",
      "C) 6. Trafik Hakkı",
      "D) 7. Trafik Hakkı",
      "E) 8. Trafik Hakkı"
    ],
    "answer": 3,
    "explanation": "Uçuş iki yabancı ülke (Yunanistan ve ABD) arasındadır ve kendi tescil devleti olan BAE ile hiçbir bağlantı yoktur -> 7. Trafik Hakkı.",
    "slideRef": "Slayt 66"
  },
  {
    "id": 63,
    "category": "Trafik Hakları",
    "difficulty": "Zor (Senaryo)",
    "question": "Lufthansa (Almanya), Münih'ten kalkarak İstanbul Havalimanı'na inmiş, ardından oradan Ankara Esenboğa'ya devam ederek İstanbul-Ankara arası yolculara bilet satmıştır. Bu faaliyet hangi serbestidir?",
    "options": [
      "A) 5. Trafik Hakkı",
      "B) 7. Trafik Hakkı",
      "C) 8. Trafik Hakkı",
      "D) 9. Trafik Hakkı",
      "E) 6. Trafik Hakkı"
    ],
    "answer": 2,
    "explanation": "Uçuş Almanya'dan başlamış, Türkiye'nin iki iç hat şehri (İstanbul - Ankara) arasında yolcu taşımıştır -> Kendi ülkesiyle bağlantılı kabotaj = 8. Trafik Hakkı.",
    "slideRef": "Slayt 67-68"
  },
  {
    "id": 64,
    "category": "Trafik Hakları",
    "difficulty": "Zor (Senaryo)",
    "question": "KLM (Hollanda), Amsterdam'dan kalkıp Kahire'ye (Mısır) inmiş, oradan yeni yolcular alarak Riyad'a (Suudi Arabistan) uçmuş ve Kahire-Riyad parkurunda bilet satmıştır. Bu taşıma hangi serbestidir?",
    "options": [
      "A) 5. Trafik Hakkı",
      "B) 7. Trafik Hakkı",
      "C) 8. Trafik Hakkı",
      "D) 9. Trafik Hakkı",
      "E) 3. Trafik Hakkı"
    ],
    "answer": 0,
    "explanation": "Amsterdam'dan başlayan seferde, iki farklı yabancı ülke (Mısır ve Suudi Arabistan) arasında yolcu taşındığı için 5. Trafik Hakkıdır.",
    "slideRef": "Slayt 62-63"
  },
  {
    "id": 65,
    "category": "Trafik Hakları",
    "difficulty": "Zor (Senaryo)",
    "question": "Pegasus (Türkiye tescilli), Paris (Fransa) ile Nice (Fransa) şehirleri arasına uçağını koyarak tamamen Fransa içi bağımsız tarifeli iç hat seferi düzenlerse bu operasyon hangi hakka girer?",
    "options": [
      "A) 5. Trafik Hakkı",
      "B) 7. Trafik Hakkı",
      "C) 8. Trafik Hakkı",
      "D) 9. Trafik Hakkı",
      "E) 6. Trafik Hakkı"
    ],
    "answer": 3,
    "explanation": "Türk uçağının Fransa içi iki nokta arasında Türkiye ile hiçbir bağ kurmaksızın uçması Saf/Tam Kabotajdır -> 9. Trafik Hakkı.",
    "slideRef": "Slayt 69-70"
  },
  {
    "id": 66,
    "category": "Trafik Hakları",
    "difficulty": "Orta",
    "question": "1944 Chicago Konvansiyonu ile birlikte açılan 'Transit Sözleşmesi' (IASTA) sadece hangi iki serbestiyi uluslararası olarak tanımıştır?",
    "options": [
      "A) 1. ve 2. Trafik Haklarını",
      "B) 3. ve 4. Trafik Haklarını",
      "C) 5. ve 6. Trafik Haklarını",
      "D) 8. ve 9. Trafik Haklarını",
      "E) Sadece 7. Trafik Hakkını"
    ],
    "answer": 0,
    "explanation": "Slayt 56: IASTA (İki Serbesti Anlaşması), 1. Trafik Hakkı (Transit geçiş) ve 2. Trafik Hakkı (Teknik iniş) serbestilerini düzenler.",
    "slideRef": "Slayt 56"
  },
  {
    "id": 67,
    "category": "Trafik Hakları",
    "difficulty": "Orta",
    "question": "Bir taşıyıcının 1. ve 2. trafik haklarını kullanırken (transit geçiş ve teknik iniş) ticari yolcu veya kargo alıp indirmesi mümkün müdür?",
    "options": [
      "A) Evet, serbestçe yolcu bileti satabilir.",
      "B) Hayır, 1. ve 2. haklar ticari hak içermez; yolcu/kargo indirip bindirme hakkı yoktur.",
      "C) Sadece kargo alabilir, yolcu alamaz.",
      "D) Kaptanın onayına bağlıdır.",
      "E) Meydan işletmecisi izin verirse satabilir."
    ],
    "answer": 1,
    "explanation": "Slayt 58-59: 1. ve 2. trafik hakları teknik/seyir haklarıdır; ticari yolcu, kargo ve posta taşıma hakkı KESİNLİKLE tanımaz.",
    "slideRef": "Slayt 58-59"
  },
  {
    "id": 68,
    "category": "Trafik Hakları",
    "difficulty": "Zor (Senaryo)",
    "question": "Iberia (İspanya), Bogota'dan (Kolombiya) kalkarak Lima'ya (Peru) inmiş, buradan aldığı yeni yolcularla birlikte seferini nihai varış yeri olan Madrid'de (İspanya) tamamlamıştır. Bogota-Lima arası taşıma hangi haktır?",
    "options": [
      "A) 4. Trafik Hakkı",
      "B) 5. Trafik Hakkı",
      "C) 6. Trafik Hakkı",
      "D) 7. Trafik Hakkı",
      "E) 8. Trafik Hakkı"
    ],
    "answer": 1,
    "explanation": "Sefer kendi ana vatanında (Madrid - İspanya) SON BULDUĞU için kendi ülkesiyle bağlantılı iki yabancı ülke taşımacılığıdır -> 5. Trafik Hakkı.",
    "slideRef": "Slayt 62"
  },
  {
    "id": 69,
    "category": "Trafik Hakları",
    "difficulty": "Kolay",
    "question": "3. ve 4. Hava Trafik Hakları devletler arasında genellikle ne şekilde yürürlüğe konulur ve uygulanır?",
    "options": [
      "A) Herhangi bir anlaşma olmaksızın serbestçe",
      "B) İki ülkenin karşılıklı olarak kendi taşıyıcılarına tanıdıkları 'İkili Hava Ulaştırma Anlaşmaları' ile",
      "C) Sadece pilotların şahsi başvurusu ile",
      "D) Polis teşkilatının protokolü ile",
      "E) Belediye izinleriyle"
    ],
    "answer": 1,
    "explanation": "Slayt 61: 3. ve 4. trafik hakları iki ülkenin karşılıklı olarak kendi taşıyıcılarına tanıdıkları İkili Hava Ulaştırma Anlaşmaları çerçevesinde yürütülür.",
    "slideRef": "Slayt 61"
  },
  {
    "id": 70,
    "category": "Trafik Hakları",
    "difficulty": "Orta",
    "question": "Genel olarak dünya ülkelerinin kendi ulusal havayollarını ve iç pazarını korumak amacıyla yabancı havayollarına en katı şekilde yasakladığı serbestiler hangileridir?",
    "options": [
      "A) 1. ve 2. Trafik Hakları",
      "B) 3. ve 4. Trafik Hakları",
      "C) 8. ve 9. Trafik Hakları (Kabotaj Hakları)",
      "D) Sadece 1. Trafik Hakkı",
      "E) Sadece 2. Trafik Hakkı"
    ],
    "answer": 2,
    "explanation": "Slayt 26, 67, 80: Devletler milli ekonomilerini ve egemenliklerini korumak için iç hat pazarlarını (8. ve 9. hak - Kabotaj) yabancı şirketlere genel kural olarak kapatırlar.",
    "slideRef": "Slayt 26, 67, 80"
  },
  {
    "id": 71,
    "category": "Permi & Mevzuat",
    "difficulty": "Kolay",
    "question": "AIP GEN 1.2 Madde 1.6'ya göre; Türk hava sahasını ve havalimanlarını kullanmaya yönelik her türlü uçuş izni talebi ve tamamlayıcı belgelerin hangi dillerde olması zorunludur?",
    "options": [
      "A) Sadece Türkçe",
      "B) Sadece İngilizce",
      "C) Türkçe veya İngilizce",
      "D) Fransızca veya Almanca",
      "E) Rusça veya Arapça"
    ],
    "answer": 2,
    "explanation": "Slayt 80: AIP GEN 1.2 Madde 1.6: Uçuş izni talepleri ve belgelerinin Türkçe veya İngilizce olması zorunludur.",
    "slideRef": "Slayt 80"
  },
  {
    "id": 72,
    "category": "Permi & Mevzuat",
    "difficulty": "Kolay",
    "question": "AIP GEN 1.2 Madde 1.8 uyarınca; sivil havalimanlarımıza inecek veya hava sahamızı kullanacak sivil hava araçlarının normal izin başvuru süresi ve acil durum süresi nedir?",
    "options": [
      "A) Normal: En az 24 saat / Acil: En az 12 saat",
      "B) Normal: En az 5 iş günü / Acil: En az 2 iş günü önceden",
      "C) Normal: En az 10 gün / Acil: En az 5 gün",
      "D) Normal: En az 30 gün / Acil: En az 15 gün",
      "E) Normal: En az 48 saat / Acil: En az 3 saat"
    ],
    "answer": 1,
    "explanation": "Slayt 81: AIP GEN 1.2 Madde 1.8: Planlanan kalkıştan en az 5 iş günü, acil durumlarda ise en az 2 iş günü önceden SHGM'ye başvurulur.",
    "slideRef": "Slayt 81"
  },
  {
    "id": 73,
    "category": "Permi & Mevzuat",
    "difficulty": "Kolay",
    "question": "AIP GEN 1.2 Madde 1.9'a göre, SHGM tarafından verilen uçuş izinlerinin (permi) geçerlilik süresi hava aracının kalkış saati esas alınarak ne kadardır?",
    "options": [
      "A) 12 saat öncesi ve 24 saat sonrası",
      "B) 24 saat öncesi ve 48 saat sonrası",
      "C) 24 saat öncesi ve 72 saat sonrası",
      "D) 48 saat öncesi ve 96 saat sonrası",
      "E) 72 saat öncesi ve 72 saat sonrası"
    ],
    "answer": 2,
    "explanation": "Slayt 81: AIP GEN 1.2 Madde 1.9: Uçuş izinlerinin geçerlilik süresi kalkış saati esas alınarak 24 saat öncesi ve 72 saat sonrasıdır (-24 / +72 saat).",
    "slideRef": "Slayt 81"
  },
  {
    "id": 74,
    "category": "Permi & Mevzuat",
    "difficulty": "Orta",
    "question": "AIP GEN 1.2 Madde 1.16 kapsamındaki özel uçuşlar (Tanker uçakları, sınır ötesi İHA'lar, silahlı askeri birlik nakli vb.) için başvurular kural olarak nereye ve ne kadar süre önce yapılır?",
    "options": [
      "A) SHGM'ye en az 5 iş günü önce",
      "B) Diplomatik kanaldan Dışişleri Bakanlığına en az 10 iş günü önce",
      "C) DHMİ'ye en az 48 saat önce",
      "D) Valiliklere en az 3 gün önce",
      "E) Jandarma Havacılığa en az 15 gün önce"
    ],
    "answer": 1,
    "explanation": "Slayt 88: AIP GEN 1.2 Madde 1.16 kapsamındaki uçuşlar planlanan uçuştan en az 10 iş günü önce diplomatik kanaldan Dışişleri Bakanlığına yapılır.",
    "slideRef": "Slayt 88"
  },
  {
    "id": 75,
    "category": "Permi & Mevzuat",
    "difficulty": "Orta",
    "question": "AIP GEN 1.2 Madde 1.19'a göre, harp malzemesi, silah, patlayıcı ve tehlikeli maddelerin sivil uçaklarla taşınması başvuruları için süre kuralı nedir?",
    "options": [
      "A) Uçuştan 2 saat önce kuleye bildirilmesi yeterlidir.",
      "B) Madde 1.8'de belirtilen süreye uygun olarak (Planlanan kalkıştan en az 5 iş günü, acil durumlarda en az 2 iş günü önceden) SHGM'ye yapılır.",
      "C) En az 60 gün önceden BM Güvenlik Konseyi'ne yapılır.",
      "D) En az 10 ay önce DHMİ'ye yapılır.",
      "E) Tehlikeli maddeler sivil uçakla asla taşınamaz, başvuru yapılamaz."
    ],
    "answer": 1,
    "explanation": "Slayt 91: Tehlikeli madde başvuruları Madde 1.8'deki standart süreye tabidir (en az 5 iş günü, acil hallerde 2 iş günü önce TMKT ile koordine edilerek SHGM'ye).",
    "slideRef": "Slayt 91"
  },
  {
    "id": 76,
    "category": "Permi & Mevzuat",
    "difficulty": "Kolay",
    "question": "Onaylanan bir permi talebinde 'Teknik İniş Amaçlı Talep' için tahsis edilen permi tür kodu hangisidir?",
    "options": [
      "A) CAG",
      "B) CAT",
      "C) CAC",
      "D) CASL",
      "E) CASD"
    ],
    "answer": 0,
    "explanation": "Slayt 127: CAG = Teknik iniş amaçlı talep (G -> Ground).",
    "slideRef": "Slayt 127"
  },
  {
    "id": 77,
    "category": "Permi & Mevzuat",
    "difficulty": "Kolay",
    "question": "Onaylanan bir permi talebinde 'Transit veya Overflight (Üst Geçiş) Amaçlı Talep' için kullanılan permi tür kodu hangisidir?",
    "options": [
      "A) CAG",
      "B) CAT",
      "C) CAC",
      "D) CASL",
      "E) CAST"
    ],
    "answer": 1,
    "explanation": "Slayt 127: CAT = Transit veya Overflight amaçlı talep (T -> Transit).",
    "slideRef": "Slayt 127"
  },
  {
    "id": 78,
    "category": "Permi & Mevzuat",
    "difficulty": "Kolay",
    "question": "Onaylanan bir permi talebinde 'Charter veya Kargo taşımak amaçlı talep' için kullanılan tür kodu hangisidir?",
    "options": [
      "A) CAG",
      "B) CAT",
      "C) CAC",
      "D) CASD",
      "E) CASL"
    ],
    "answer": 2,
    "explanation": "Slayt 127: CAC = Charter veya Kargo taşımak amaçlı talep (C -> Charter/Cargo).",
    "slideRef": "Slayt 127"
  },
  {
    "id": 79,
    "category": "Permi & Mevzuat",
    "difficulty": "Kolay",
    "question": "Onaylanan bir permi talebinde 'Tarifeli Sefer Düzenlemek Amaçlı Talep (Dış Hat)' için kullanılan tür kodu hangisidir?",
    "options": [
      "A) CASD",
      "B) CASL",
      "C) CAT",
      "D) CAG",
      "E) CAST"
    ],
    "answer": 1,
    "explanation": "Slayt 127: CASL = Tarifeli sefer düzenlemek amaçlı talep - Dış Hat (L -> Line/Dış Hat).",
    "slideRef": "Slayt 127"
  },
  {
    "id": 80,
    "category": "Permi & Mevzuat",
    "difficulty": "Kolay",
    "question": "Onaylanan bir permi talebinde 'Tarifeli Sefer Düzenlemek Amaçlı Talep (İç Hat)' için kullanılan tür kodu hangisidir?",
    "options": [
      "A) CASL",
      "B) CASD",
      "C) CAG",
      "D) CAT",
      "E) CAC"
    ],
    "answer": 1,
    "explanation": "Slayt 127: CASD = Tarifeli sefer düzenlemek amaçlı talep - İç Hat (D -> Domestic/İç Hat).",
    "slideRef": "Slayt 127"
  },
  {
    "id": 81,
    "category": "Permi & Mevzuat",
    "difficulty": "Kolay",
    "question": "Onaylanan bir permi talebinde 'Türk Hava Sahasını Transit olarak yük ve yolcu taşımacılığında kullanmak amaçlı talep' kodu hangisidir?",
    "options": [
      "A) CAG",
      "B) CAC",
      "C) CAST",
      "D) CASD",
      "E) CASL"
    ],
    "answer": 2,
    "explanation": "Slayt 127: CAST = Türk Hava Sahasını transit olarak yolcu ve yük taşımacılığında kullanmak amaçlı tarifeli talep.",
    "slideRef": "Slayt 127"
  },
  {
    "id": 82,
    "category": "Permi & Mevzuat",
    "difficulty": "Orta",
    "question": "AIP GEN 1.2 Madde 3.1.1'e göre; yabancı havayollarının tarifeli transit uçuş izin başvuruları, aksi belirtilmedikçe tarife döneminden en geç ne kadar süre önce SHGM otomasyon sisteminden yapılmalıdır?",
    "options": [
      "A) En geç 5 iş günü önce",
      "B) En geç 10 gün önce",
      "C) En geç 15 gün önce",
      "D) En geç 30 gün önce",
      "E) En geç 60 gün önce"
    ],
    "answer": 3,
    "explanation": "Slayt 113: Uçuş izinleri başvuruları tarife döneminden en geç 30 gün önce SHGM otomasyon sistemi kullanılarak yapılır.",
    "slideRef": "Slayt 113"
  },
  {
    "id": 83,
    "category": "Permi & Mevzuat",
    "difficulty": "Orta",
    "question": "AIP GEN 1.2 Madde 4.4.1'e göre Turistik Charter Uçuşlarında kural olarak tek yönlü bilet satışı yapılabilir mi?",
    "options": [
      "A) Evet, istenildiği kadar serbestçe tek yön satılabilir.",
      "B) Genel kural olarak bu uçuşlarda tek yönlü bilet ile yolcu taşınmaz; ancak mütekabiliyet gereği en fazla %10 tek yön koltuk satışı yapılabilir.",
      "C) Sadece pilotların ailelerine tek yön bilet satılabilir.",
      "D) %50'ye kadar tek yön bilet serbesttir.",
      "E) Turistik charter uçuşlarında bilet satışı tamamen yasaktır."
    ],
    "answer": 1,
    "explanation": "Slayt 116: Turistik charter uçuşlarında tek yönlü bilet ile yolcu taşınmaz. Kısıtlama olmayan ülkelerden mütekabiliyete göre uçak koltuk kapasitesinin %10'una kadar tek yön satılabilir.",
    "slideRef": "Slayt 116"
  },
  {
    "id": 84,
    "category": "Permi & Mevzuat",
    "difficulty": "Orta",
    "question": "AIP GEN 1.2 Madde 4.4.1 (c) bendine göre; yerli havayolu işletmelerimiz uçakları SHGM otomasyonunda tanımlı olmak şartıyla yurt dışı turistik charter uçuşlarını uçuş planıyla (FPL) gerçekleştirebilmek için planlarını en az kaç saat önce göndermelidir?",
    "options": [
      "A) En az 1 saat önce",
      "B) En az 3 saat önce",
      "C) En az 12 saat önce",
      "D) En az 24 saat önce",
      "E) En az 48 saat önce"
    ],
    "answer": 1,
    "explanation": "Slayt 117: Yerli havayolları, uçuştan en az 3 saat önce uçuş amacını içeren uçuş planlarını göndermek kaydıyla yurt dışı uçuşlarını uçuş planıyla icra edebilirler.",
    "slideRef": "Slayt 117"
  },
  {
    "id": 85,
    "category": "Permi & Mevzuat",
    "difficulty": "Orta",
    "question": "AIP GEN 1.2 Madde 4.4.2.3 Kargo Charter Uçuşlarında; kargo uçağında taşınabilecek istisnai yolcu/kişiler arasında aşağıdakilerden hangisi YER ALMAZ?",
    "options": [
      "A) Uçuş ekip üyesi ve işletme el kitabında izin verilen şirket personeli ve aile üyeleri",
      "B) İlgili kamu kurum/kuruluş yetkili temsilcisi",
      "C) Uçaktaki özel bir sevkiyat/kargo ile ilgili olan görevli refakatçiler",
      "D) Biletini internetten satın almış standart ticari sivil yolcular",
      "E) Şirketin eğitim verdiği yetkili kişiler"
    ],
    "answer": 3,
    "explanation": "Slayt 119: Kargo charter uçuşlarında yolcu kabul edilmez! Sadece ekip, denetçi, refakatçi ve kamu temsilcisi gibi görevliler bulunabilir.",
    "slideRef": "Slayt 119"
  },
  {
    "id": 86,
    "category": "Permi & Mevzuat",
    "difficulty": "Zor (Senaryo)",
    "question": "AIP ENR 1.10 Madde 2.1.5'e göre; Lozan (1923) ve Paris (1947) Antlaşmalarıyla silahsızlandırılmış Doğu Ege Adaları ile GKRY meydanları ile ilgili diplomatik askeri uçuş kısıtlaması nedir?",
    "options": [
      "A) Sadece gündüz saatlerinde kullanılabilirler.",
      "B) Türk hava sahasını kullanacak ve Türkiye'deki meydanlara inecek diplomatik uçuş iznine tabi askeri araçlar bu meydanları iniş/kalkış veya YEDEK (Alternate) meydan olarak belirtemez.",
      "C) İsteyen her askeri uçak yakıt ikmali yapabilir.",
      "D) Sadece NATO tatbikatlarında iniş meydanı yazılabilir.",
      "E) Bu meydanlara iniş için sadece Valilik izni yeterlidir."
    ],
    "answer": 1,
    "explanation": "Slayt 104: Silahsızlandırılmış Doğu Ege Adaları ve GKRY meydanları diplomatik uçuş iznine tabi askeri hava araçlarınca iniş/kalkış veya yedek (alternate) meydan olarak gösterilemez.",
    "slideRef": "Slayt 104"
  },
  {
    "id": 87,
    "category": "Permi & Mevzuat",
    "difficulty": "Orta",
    "question": "Türkiye Cumhuriyeti'nin tanımaması nedeniyle Güney Kıbrıs Rum Kesimi tescilli (5B Tescilli) hava araçları ülkemiz tarafından hangi kapsamın dışında tutulmaktadır?",
    "options": [
      "A) ICAO kapsamı",
      "B) ECAC kapsamı",
      "C) NATO kapsamı",
      "D) Birleşmiş Milletler kapsamı",
      "E) Varşova kapsamı"
    ],
    "answer": 1,
    "explanation": "Slayt 104: GKRY tescilli (5B tescilli) hava araçları Türkiye tarafından ECAC kapsamı dışında tutulmakta ve hava sahamız kısıtlanmaktadır.",
    "slideRef": "Slayt 104"
  },
  {
    "id": 88,
    "category": "Permi & Mevzuat",
    "difficulty": "Orta",
    "question": "AIP GEN 1.2 Madde 1.7 'Kabotaj' hükmü gereğince, tek bir kiralayanla özel kullanıma tahsisli yabancı tescilli bir iş jetinin ülkemiz meydanları arasında sefer yapması durumunda temel kural nedir?",
    "options": [
      "A) Hava aracının herhangi bir bölümü üçüncü şahıslara satılamaz ve/veya kiralanamaz.",
      "B) Uçağın tüm koltukları serbestçe internetten satılabilir.",
      "C) Uçak sadece askeri amaçla kullanılabilir.",
      "D) Uçakta mutlaka gümrük memuru pilotluk yapmalıdır.",
      "E) Uçağın tescili Türk tesciline çevrilmeden kalkış yapamaz."
    ],
    "answer": 0,
    "explanation": "Slayt 80: AIP GEN 1.2 Madde 1.7: Tek kiralayanla tahsisli yabancı tescilli uçakların ülkemiz içi seferlerinde uçağın hiçbir bölümü 3. şahıslara satılamaz/kiralanamaz (Kabotaj kuralı).",
    "slideRef": "Slayt 80"
  },
  {
    "id": 89,
    "category": "Permi & Mevzuat",
    "difficulty": "Kolay",
    "question": "Tarifeli uçuş gerçekleştirecek yabancı bir hava taşıyıcısının kendi ülkesinden geçerli hangi belgeyi almamış olması durumunda Türk hava sahası ve havalimanlarını kullanmasına izin verilmez?",
    "options": [
      "A) Seyahat Acentesi Belgesi",
      "B) Hava Taşıyıcı İşletme Ruhsatı (AOC - Air Operator Certificate)",
      "C) Kaptan Pilot Diploması",
      "D) Otel Rezervasyon Belgesi",
      "E) Yer Hizmetleri Faturası"
    ],
    "answer": 1,
    "explanation": "Slayt 107: Kendi ülkesinden geçerli işletme izni (AOC - Airline Operation Certificate) almamış hava taşıyıcılarına Türk hava sahası ve havalimanları kullandırılmaz.",
    "slideRef": "Slayt 107"
  },
  {
    "id": 90,
    "category": "Permi & Mevzuat",
    "difficulty": "Orta",
    "question": "Bir havayolu işletmesi SHGM'den uçuş izni (permi) aldıktan sonra, uçuşun gerçekleşeceği meydanın apron park yeri yetersizliği varsa ayrıca hangi onayı almak ZORUNDADIR?",
    "options": [
      "A) Belediye Ruhsatı",
      "B) Meydan Oluru (İlgili havalimanı otoritesinden)",
      "C) Emniyet İzni",
      "D) Gümrük Beyannamesi",
      "E) Dışişleri İzni"
    ],
    "answer": 1,
    "explanation": "Slayt 96: Apron park yeri yetersizliği olan meydanlar için havayolu permi almış olsa dahi ilgili havalimanı otoritesinden ayrıca 'Meydan Oluru' almak zorundadır.",
    "slideRef": "Slayt 96"
  },
  {
    "id": 91,
    "category": "Slot & Seviyeler",
    "difficulty": "Kolay",
    "question": "IATA Dünya Slot Kılavuzu'na (WSG) göre Seviye-3 (Level 3) bir havalimanının temel niteliği nedir?",
    "options": [
      "A) Kapasite fazlası vardır, hiçbir uçağa slot verilmez.",
      "B) Talebin havalimanı kapasitesini aştığı, uçuş gerçekleştirmek için bağımsız bir Koordinatör tarafından SLOT TAHSİSİNİN ZORUNLU olduğu meydandır.",
      "C) Sadece genel havacılık ve askeri uçaklar inebilir.",
      "D) Sadece kışın açık olan meydanlardır.",
      "E) Bilet fiyatlarının devlet tarafından belirlendiği meydandır."
    ],
    "answer": 1,
    "explanation": "Slayt 94: Seviye-3 meydanlarda talep kapasiteyi aştığı için bir Slot Koordinatörü tarafından slot tahsis edilmesi şarttır.",
    "slideRef": "Slayt 94"
  },
  {
    "id": 92,
    "category": "Slot & Seviyeler",
    "difficulty": "Kolay",
    "question": "IATA Dünya Slot Kılavuzu'na (WSG) göre Seviye-2 (Level 2) bir havalimanında slot ve tarife süreci nasıl işler?",
    "options": [
      "A) Slot almak ölüm kalım meselesidir, koordinatör izin vermezse uçulamaz.",
      "B) Talep yoğunlaşması olan saatler için havayolları bir Tarife Danışmanı (Facilitator) ile gönüllü iş birliği ve danışma içinde çalışır (SMA mesajı kullanılır).",
      "C) Meydan tüm ticari uçuşlara kapatılır.",
      "D) Sadece yerli şirketler uçabilir.",
      "E) Permi başvurusu yapılmaz."
    ],
    "answer": 1,
    "explanation": "Slayt 94: Seviye-2 meydanlar tarifesi düzenlenen/danışmalı meydanlardır. Havayolları bir tarife kolaylaştırıcısı ile programlarını koordine eder.",
    "slideRef": "Slayt 94"
  },
  {
    "id": 93,
    "category": "Slot & Seviyeler",
    "difficulty": "Orta",
    "question": "AIP GEN 1.2 Madde 1.23'e göre; hem yaz hem kış tarife dönemlerinde haftanın her günü 'Seviye-3 (Koordine Edilen)' olan iki havalimanımız hangileridir?",
    "options": [
      "A) Ankara Esenboğa ve İzmir Adnan Menderes",
      "B) İstanbul Havalimanı (LTFM) ve Sabiha Gökçen Havalimanı (LTFJ)",
      "C) Antalya Havalimanı ve Dalaman Havalimanı",
      "D) Atatürk Havalimanı ve Milas Bodrum",
      "E) Adana Havalimanı ve Trabzon Havalimanı"
    ],
    "answer": 1,
    "explanation": "Slayt 94: İstanbul Havalimanı (LTFM) ve Sabiha Gökçen (LTFJ), yaz ve kış döneminde haftanın her günü Seviye-3 (koordine edilen) havalimanlarıdır.",
    "slideRef": "Slayt 94"
  },
  {
    "id": 94,
    "category": "Slot & Seviyeler",
    "difficulty": "Kolay",
    "question": "AIP GEN 1.2 Madde 1.23'e göre; 'Yaz tarife döneminde Seviye-3, Kış tarife döneminde ise Seviye-2' uygulanan havalimanımız hangisidir?",
    "options": [
      "A) İstanbul Havalimanı (LTFM)",
      "B) Ankara Esenboğa (LTAC)",
      "C) Antalya Havalimanı (LTAI)",
      "D) İzmir Adnan Menderes (LTBJ)",
      "E) Atatürk Havalimanı (LTBA)"
    ],
    "answer": 2,
    "explanation": "Slayt 94: Antalya Havalimanı (LTAI), yazın Seviye-3, kışın ise Seviye-2 olarak uygulanır.",
    "slideRef": "Slayt 94"
  },
  {
    "id": 95,
    "category": "Slot & Seviyeler",
    "difficulty": "Orta",
    "question": "AIP GEN 1.2 Madde 1.23'e göre; aşağıdaki havalimanlarımızdan hangisi hem yaz hem kış tarife döneminde 'Seviye-2 (Tarifesi Düzenlenen)' statüsündedir?",
    "options": [
      "A) İstanbul Havalimanı (LTFM)",
      "B) Sabiha Gökçen Havalimanı (LTFJ)",
      "C) Ankara Esenboğa Havalimanı (LTAC)",
      "D) Londra Heathrow",
      "E) Paris Charles de Gaulle"
    ],
    "answer": 2,
    "explanation": "Slayt 94-95: Ankara Esenboğa (LTAC), İzmir (LTBJ), Dalaman (LTBS), Bodrum (LTFE) ve Atatürk (LTBA) yaz ve kış Seviye-2 meydanlardır.",
    "slideRef": "Slayt 94-95"
  },
  {
    "id": 96,
    "category": "Slot & Seviyeler",
    "difficulty": "Kolay",
    "question": "Seviye-3 (Koordineli) havalimanlarında havayolunun slot talep ederken (Request) ve koordinatörün onay/ret verirken (Response) kullandığı standart IATA mesaj formatı hangisidir?",
    "options": [
      "A) SMA (Schedule Movement Advice)",
      "B) SCR (Slot Clearance Request / Response)",
      "C) SIR (Slot Information Response)",
      "D) FPL (Filed Flight Plan)",
      "E) LDM (Load Distribution Message)"
    ],
    "answer": 1,
    "explanation": "SCR (Slot Clearance Request / Response), Seviye-3 koordineli havalimanlarında slot alma, değiştirme ve onaylama işlemlerinde kullanılan temel mesajdır.",
    "slideRef": "Slayt 94, IATA WSG"
  },
  {
    "id": 97,
    "category": "Slot & Seviyeler",
    "difficulty": "Kolay",
    "question": "Seviye-2 (Tarife Danışmalı) havalimanlarında havayollarının tarife danışmanına tarife bildiriminde bulunurken kullandığı standart mesaj formatı hangisidir?",
    "options": [
      "A) SCR",
      "B) SMA (Schedule Movement Advice)",
      "C) MVT",
      "D) DLA",
      "E) NOTAM"
    ],
    "answer": 1,
    "explanation": "SMA (Schedule Movement Advice), Seviye-2 havalimanlarında tarife bildirim ve danışma amacıyla çekilen mesajdır.",
    "slideRef": "Slayt 94, IATA WSG"
  },
  {
    "id": 98,
    "category": "Slot & Seviyeler",
    "difficulty": "Orta",
    "question": "AIP GEN 1.2 Madde 1.25'e göre; bir havayolu işletmesinin slot uygulanan bir havalimanı için önceden SHGM'den 'Uçuş İzni (Permi) almış olması' ne anlama gelir?",
    "options": [
      "A) Slotu da kesin olarak aldığı anlamına gelir.",
      "B) Slot alabileceği anlamına GELMEZ; slot bağımsız olarak DHMİ Slot Merkezinden alınmalıdır.",
      "C) Havalimanında bedava yakıt alacağı anlamına gelir.",
      "D) Kule kontrolörünün uçağı bekletemeyeceği anlamına gelir.",
      "E) Bilet fiyatlarını iki katına çıkarabileceği anlamına gelir."
    ],
    "answer": 1,
    "explanation": "Slayt 96: AIP GEN 1.2 Madde 1.25: Havayolu işletmelerinin önceden uçuş izni almış olmaları, Slot alabilecekleri anlamına GELMEZ.",
    "slideRef": "Slayt 96"
  },
  {
    "id": 99,
    "category": "Slot & Seviyeler",
    "difficulty": "Orta",
    "question": "IATA Dünya Slot Kılavuzu'nda yer alan meşhur '80/20 Kuralı' (Kazanılmış Hak / Grandfather Rights) neyi ifade eder?",
    "options": [
      "A) Slotların %80'inin yabancı şirketlere verilmesini",
      "B) Bir havayolunun bir sonraki sezon aynı slotu koruyabilmesi için tahsis edilen slot serisini en az %80 oranında fiilen kullanmış olması gerektiğini",
      "C) Uçakların en az %20 boş koltukla uçması gerektiğini",
      "D) Bilet ücretlerinin %80'inin vergi olduğunu",
      "E) Gecikmelerin en fazla %20 olabileceğini"
    ],
    "answer": 1,
    "explanation": "IATA WSG 80/20 Kuralı: Bir havayolu tahsis edilen tarihi slot hakkını (Grandfather rights) bir sonraki sezonda korumak için en az %80 kullanım gerçekleştirmelidir (Use it or lose it).",
    "slideRef": "IATA WSG Kuralları"
  },
  {
    "id": 100,
    "category": "Slot & Seviyeler",
    "difficulty": "Zor (Senaryo)",
    "question": "AIP GEN 1.2 Madde 1.25 hükmü gereğince; Seviye-3 bir havalimanında slotu onaylanmış bir uçuşun herhangi bir sebeple iptal edilmesi durumunda havayolu işletmesinin yasal yükümlülüğü nedir?",
    "options": [
      "A) Uçuş iptal edilse bile koordinatöre bildirim yapılmasına gerek yoktur.",
      "B) Slot alındıktan sonra yapılacak uçuş iptallerinin DHMİ Genel Müdürlüğü Slot Koordinasyon Merkezine bildirilmesi ZORUNLUDUR.",
      "C) İptal durumunda sadece bilet alan yolculara haber verilir.",
      "D) İptal edilen slot otomatik olarak en yakın yerli havayoluna devredilir.",
      "E) İptal bildirimi sadece uçuş gününden 1 ay sonra resmi gazetede ilan edilir."
    ],
    "answer": 1,
    "explanation": "Slayt 96: AIP GEN 1.2 Madde 1.25: 'Slot alındıktan sonra yapılacak uçuş iptallerinin DHMİ Genel Müdürlüğü Slot Koordinasyon Merkezine bildirilmesi zorunludur.'",
    "slideRef": "Slayt 96"
  }
];
