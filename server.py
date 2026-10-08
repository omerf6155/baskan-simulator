import os
import json
import time
import random
import datetime
import copy
import contextvars
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from teams_data import TEAMS_DB

app = FastAPI(title="Büyük Başkan - Süper Lig Simülatörü")

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
SAVE_FILE = os.path.join(os.path.dirname(__file__), "savegame.json")
SAVES_DIR = os.path.join(os.path.dirname(__file__), "saves")
os.makedirs(SAVES_DIR, exist_ok=True)

current_session_cv = contextvars.ContextVar("current_session_cv", default="default")

def normalize_name_to_slug(name: Optional[str]) -> str:
    if not name:
        return "baskan"
    tr_map = str.maketrans("çğıöşüÇĞİÖŞÜ", "cgiosuCGIOSU")
    slug = str(name).translate(tr_map).lower()
    clean = "".join(c for c in slug if c.isalnum() or c in ("-", "_"))
    return clean[:35] or "baskan"

def sanitize_session_id(session_id: Optional[str]) -> str:
    if not session_id:
        return "default"
    tr_map = str.maketrans("çğıöşüÇĞİÖŞÜ", "cgiosuCGIOSU")
    slug = str(session_id).translate(tr_map)
    clean = "".join(c for c in slug if c.isalnum() or c in ("-", "_"))
    return clean[:45] if clean else "default"

@app.middleware("http")
async def session_middleware(request: Request, call_next):
    sid = request.headers.get("X-Session-Id") or request.query_params.get("session") or "default"
    token = current_session_cv.set(sanitize_session_id(sid))
    try:
        response = await call_next(request)
        response.headers["X-Session-Id"] = current_session_cv.get()
        return response
    finally:
        current_session_cv.reset(token)

def get_save_path(session_id: Optional[str] = None) -> str:
    sid = sanitize_session_id(session_id or current_session_cv.get())
    return os.path.join(SAVES_DIR, f"{sid}.json")

def format_money_val(amount: int) -> str:
    if abs(amount) >= 1_000_000:
        return f"{amount / 1_000_000:.1f}M €".replace(".0M", "M")
    elif abs(amount) >= 1_000:
        return f"{amount / 1_000:.0f}K €"
    return f"{amount} €"


# ==================== DÜNYA YILDIZLARI & TRANSFER HAVUZU ====================
WORLD_SUPERSTARS = [
    {"name": "Erling Haaland", "age": 26, "pos": "ST", "current_club": "Manchester City", "claimed_pot": 92, "real_pot": 92, "price": 260_000_000, "salary": 75_000_000, "is_star": True, "desc": "Manchester City'nin gol makinesi. Süper Lig'e gelirse yer yerinden oynar."},
    {"name": "Kylian Mbappé", "age": 27, "pos": "LW", "current_club": "Real Madrid", "claimed_pot": 93, "real_pot": 93, "price": 280_000_000, "salary": 85_000_000, "is_star": True, "desc": "Dünyanın en hızlı ve durdurulamaz hücumcusu."},
    {"name": "Jude Bellingham", "age": 23, "pos": "CAM", "current_club": "Real Madrid", "claimed_pot": 91, "real_pot": 91, "price": 230_000_000, "salary": 68_000_000, "is_star": True, "desc": "Real Madrid'in genç lideri, tam saha maestro ve skorer."},
    {"name": "Lamine Yamal", "age": 19, "pos": "RW", "current_club": "FC Barcelona", "claimed_pot": 93, "real_pot": 93, "price": 210_000_000, "salary": 55_000_000, "is_star": True, "desc": "Barselona mucizesi! Geleceğin Ballon d'Or favorisi."},
    {"name": "Bernardo Silva", "age": 32, "pos": "RW", "current_club": "Manchester City", "claimed_pot": 89, "real_pot": 89, "price": 115_000_000, "salary": 48_000_000, "is_star": True, "desc": "Manchester City'nin Portekizli virtüözü, dripling ve asist üstadı."},
    {"name": "Kevin De Bruyne", "age": 35, "pos": "CM", "current_club": "Manchester City", "claimed_pot": 90, "real_pot": 90, "price": 130_000_000, "salary": 58_000_000, "is_star": True, "desc": "Miras bırakacak bir pas dehası ve oyun kurucu."},
    {"name": "Harry Kane", "age": 33, "pos": "ST", "current_club": "Bayern Münih", "claimed_pot": 90, "real_pot": 90, "price": 150_000_000, "salary": 56_000_000, "is_star": True, "desc": "Dünya futbolunun en komple forveti, pasör ve golcü."},
    {"name": "Lautaro Martínez", "age": 29, "pos": "ST", "current_club": "Inter", "claimed_pot": 90, "real_pot": 90, "price": 160_000_000, "salary": 54_000_000, "is_star": True, "desc": "İtalya Serie A gol kralı ve kaptanı, durdurulamaz Arjantinli 'El Toro'."},
    {"name": "Vinícius Júnior", "age": 26, "pos": "LW", "current_club": "Real Madrid", "claimed_pot": 92, "real_pot": 92, "price": 250_000_000, "salary": 72_000_000, "is_star": True, "desc": "Sambacı dripling cambazı, savunmaları darmadağın eder."},
    {"name": "Rodri", "age": 30, "pos": "CDM", "current_club": "Manchester City", "claimed_pot": 91, "real_pot": 91, "price": 200_000_000, "salary": 62_000_000, "is_star": True, "desc": "Ballon d'Or sahibi kusursuz orta saha çimentosu."},
    {"name": "Florian Wirtz", "age": 23, "pos": "CAM", "current_club": "Bayer Leverkusen", "claimed_pot": 90, "real_pot": 90, "price": 185_000_000, "salary": 50_000_000, "is_star": True, "desc": "Alman harikası; dar alanda sihirbaz, asist ve gol makinesi."},
    {"name": "Alphonso Davies", "age": 25, "pos": "LB", "current_club": "Bayern Münih", "claimed_pot": 87, "real_pot": 87, "price": 110_000_000, "salary": 38_000_000, "is_star": True, "desc": "Sol kanadın hızlı treni, savunma ve bindirme ustası."},
    {"name": "Achraf Hakimi", "age": 27, "pos": "RB", "current_club": "Paris Saint-Germain", "claimed_pot": 88, "real_pot": 88, "price": 125_000_000, "salary": 42_000_000, "is_star": True, "desc": "Dünyanın en modern ve skorer sağ beki."},
    {"name": "Rúben Dias", "age": 29, "pos": "CB", "current_club": "Manchester City", "claimed_pot": 89, "real_pot": 89, "price": 145_000_000, "salary": 48_000_000, "is_star": True, "desc": "Kusursuz pozisyon bilgisine sahip lider stoper."},
    {"name": "Alessandro Bastoni", "age": 27, "pos": "CB", "current_club": "Inter", "claimed_pot": 88, "real_pot": 88, "price": 130_000_000, "salary": 44_000_000, "is_star": True, "desc": "Modern sol ayaklı oyun kurucu İtalyan savunma generali."},
    {"name": "Thibaut Courtois", "age": 34, "pos": "GK", "current_club": "Real Madrid", "claimed_pot": 89, "real_pot": 89, "price": 85_000_000, "salary": 40_000_000, "is_star": True, "desc": "Kalesinde devleşen dünyanın sayılı eldivenlerinden."},
    {"name": "Bukayo Saka", "age": 24, "pos": "RW", "current_club": "Arsenal", "claimed_pot": 89, "real_pot": 89, "price": 140_000_000, "salary": 46_000_000, "is_star": True, "desc": "Arsenal'in dahi çocuğu, asist ve gol tehlikesi."},
    {"name": "Federico Valverde", "age": 28, "pos": "CM", "current_club": "Real Madrid", "claimed_pot": 89, "real_pot": 89, "price": 150_000_000, "salary": 48_000_000, "is_star": True, "desc": "Uruguaylı fırtına, iki yönlü orta saha dinamosu."},
    {"name": "Khvicha Kvaratskhelia", "age": 25, "pos": "LW", "current_club": "Napoli", "claimed_pot": 89, "real_pot": 89, "price": 140_000_000, "salary": 46_000_000, "is_star": True, "desc": "Gürcü sihirbaz 'Kvaradona', bire birde savunmaları dağıtan sol açık."},
    {"name": "William Saliba", "age": 24, "pos": "CB", "current_club": "Arsenal", "claimed_pot": 89, "real_pot": 89, "price": 140_000_000, "salary": 45_000_000, "is_star": True, "desc": "Premier Lig'in en sağlam ve soğukkanlı stoperi."},
    {"name": "Gianluigi Donnarumma", "age": 27, "pos": "GK", "current_club": "Paris Saint-Germain", "claimed_pot": 89, "real_pot": 89, "price": 95_000_000, "salary": 42_000_000, "is_star": True, "desc": "İtalyan dev kaleci, inanılmaz refleksler."}
]

FREE_AGENTS = [
    {"name": "Paul Pogba", "age": 33, "pos": "CM", "current_club": "Serbest", "claimed_pot": 82, "real_pot": 82, "price": 0, "salary": 20_000_000, "sign_bonus": 9_000_000, "is_free": True, "desc": "Dünya Kupası şampiyonu Fransız maestro. Serbest statüde elit bir yetenek."},
    {"name": "Adrien Rabiot", "age": 31, "pos": "CM", "current_club": "Serbest", "claimed_pot": 83, "real_pot": 83, "price": 0, "salary": 24_000_000, "sign_bonus": 10_000_000, "is_free": True, "desc": "Fransız milli maestro. Fiziksel ve teknik denge abidesi."},
    {"name": "Memphis Depay", "age": 32, "pos": "ST", "current_club": "Serbest", "claimed_pot": 82, "real_pot": 82, "price": 0, "salary": 22_000_000, "sign_bonus": 10_000_000, "is_free": True, "desc": "Serbest oyuncu. Bire birde etkili forvet ve kanat forvet."},
    {"name": "Sergio Ramos", "age": 40, "pos": "CB", "current_club": "Serbest", "claimed_pot": 80, "real_pot": 80, "price": 0, "salary": 16_000_000, "sign_bonus": 8_000_000, "is_free": True, "desc": "Efsane lider stoper. Soyunma odasına karakter katar."},
    {"name": "Keylor Navas", "age": 39, "pos": "GK", "current_club": "Serbest", "claimed_pot": 81, "real_pot": 81, "price": 0, "salary": 14_000_000, "sign_bonus": 6_000_000, "is_free": True, "desc": "3 Şampiyonlar Ligi şampiyonu refleks panteri tecrübeli kaleci."},
    {"name": "David de Gea", "age": 34, "pos": "GK", "current_club": "Serbest", "claimed_pot": 83, "real_pot": 83, "price": 0, "salary": 18_000_000, "sign_bonus": 8_000_000, "is_free": True, "desc": "Eski Manchester United efsanesi, refleksleriyle maç kurtaran eldiven."},
    {"name": "Joel Matip", "age": 35, "pos": "CB", "current_club": "Serbest", "claimed_pot": 80, "real_pot": 80, "price": 0, "salary": 15_000_000, "sign_bonus": 7_000_000, "is_free": True, "desc": "Liverpool tecrübesine sahip soğukkanlı, uzun boylu kule stoper."},
    {"name": "James Rodríguez", "age": 35, "pos": "CAM", "current_club": "Serbest", "claimed_pot": 81, "real_pot": 81, "price": 0, "salary": 15_000_000, "sign_bonus": 7_000_000, "is_free": True, "desc": "Usta sol ayak, ölümcül frikikler ve kilit paslar."},
    {"name": "Wissam Ben Yedder", "age": 35, "pos": "ST", "current_club": "Serbest", "claimed_pot": 81, "real_pot": 81, "price": 0, "salary": 18_000_000, "sign_bonus": 8_000_000, "is_free": True, "desc": "Ceza sahası tilkisi, her iki ayağıyla affetmeyen gol ustası."},
    {"name": "Anthony Martial", "age": 30, "pos": "ST", "current_club": "Serbest", "claimed_pot": 79, "real_pot": 79, "price": 0, "salary": 14_000_000, "sign_bonus": 6_000_000, "is_free": True, "desc": "Serbest kaldı. Yüksek potansiyelli hamle santraforu."},
    {"name": "Miralem Pjanić", "age": 36, "pos": "CM", "current_club": "Serbest", "claimed_pot": 79, "real_pot": 79, "price": 0, "salary": 12_000_000, "sign_bonus": 5_000_000, "is_free": True, "desc": "Frikik ve duran top üstadı, oyun görüşü yüksek eski Juventus beyni."},
    {"name": "Mats Hummels", "age": 36, "pos": "CB", "current_club": "Serbest", "claimed_pot": 82, "real_pot": 82, "price": 0, "salary": 17_000_000, "sign_bonus": 8_000_000, "is_free": True, "desc": "Dünya Kupası şampiyonu, pasör lider stoper."},
    {"name": "Yusuf Yazıcı", "age": 28, "pos": "CAM", "current_club": "Serbest", "claimed_pot": 80, "real_pot": 80, "price": 0, "salary": 14_000_000, "sign_bonus": 6_000_000, "is_free": True, "desc": "Ligue 1 şampiyonu yerli maestro, uzaktan şut ustası."}
]

# ==================== AVRUPA'DAKİ YERLİ YILDIZLAR (TÜRKİYE MİLLİ TAKIM HAVUZU) ====================
TURKISH_STARS = [
    {"name": "Arda Güler", "age": 21, "pos": "CAM", "current_club": "Real Madrid", "claimed_pot": 92, "real_pot": 92, "price": 95_000_000, "salary": 36_000_000, "is_turkish_star": True, "is_foreign": False, "desc": "Real Madrid'in 'Türk İncisi' altın çocuğu, olağanüstü sol ayak ve vizyon."},
    {"name": "Ferdi Kadıoğlu", "age": 26, "pos": "LB", "current_club": "Brighton", "claimed_pot": 87, "real_pot": 87, "price": 65_000_000, "salary": 28_000_000, "is_turkish_star": True, "is_foreign": False, "desc": "Premier Lig'de ciğersiz temposu ve iki ayağını kullanan modern kanat beki."},
    {"name": "Kenan Yıldız", "age": 21, "pos": "LW", "current_club": "Juventus", "claimed_pot": 90, "real_pot": 90, "price": 75_000_000, "salary": 30_000_000, "is_turkish_star": True, "is_foreign": False, "desc": "Juventus'un efsanevi 10 numara varisi, müthiş çalımlar ve plase ustası."},
    {"name": "Merih Demiral", "age": 28, "pos": "CB", "current_club": "Al-Ahli", "claimed_pot": 85, "real_pot": 85, "price": 42_000_000, "salary": 22_000_000, "is_turkish_star": True, "is_foreign": False, "desc": "Milli savunmanın savaşçı gladyatörü, hava topları ve sert müdahalelerin ustası."},
    {"name": "Can Uzun", "age": 20, "pos": "CAM", "current_club": "Eintracht Frankfurt", "claimed_pot": 88, "real_pot": 88, "price": 45_000_000, "salary": 16_000_000, "is_turkish_star": True, "is_foreign": False, "desc": "Bundesliga'da parlayan genç forvet arkası, ölümcül bitiricilik ve dripling."},
    {"name": "Zeki Çelik", "age": 29, "pos": "RB", "current_club": "AS Roma", "claimed_pot": 82, "real_pot": 82, "price": 28_000_000, "salary": 14_000_000, "is_turkish_star": True, "is_foreign": False, "desc": "Serie A tecrübesiyle sağ bekte istikrar ve kaya gibi sağlam savunma."},
    {"name": "Enes Ünal", "age": 29, "pos": "ST", "current_club": "Bournemouth", "claimed_pot": 83, "real_pot": 83, "price": 35_000_000, "salary": 18_000_000, "is_turkish_star": True, "is_foreign": False, "desc": "Premier Lig santraforu, güçlü sırtı dönük oyun ve hava hakimiyeti."},
    {"name": "Ozan Kabak", "age": 26, "pos": "CB", "current_club": "Hoffenheim", "claimed_pot": 83, "real_pot": 83, "price": 32_000_000, "salary": 15_000_000, "is_turkish_star": True, "is_foreign": False, "desc": "Bundesliga'da agresif ve fiziksel olarak rakiplere göz açtırmayan stoper."},
    {"name": "Altay Bayındır", "age": 28, "pos": "GK", "current_club": "Manchester United", "claimed_pot": 82, "real_pot": 82, "price": 22_000_000, "salary": 14_000_000, "is_turkish_star": True, "is_foreign": False, "desc": "Manchester United eldiveni, çizgide boy avantajı ve güven veren refleksler."},
    {"name": "Eren Dinkçi", "age": 24, "pos": "RW", "current_club": "SC Freiburg", "claimed_pot": 83, "real_pot": 83, "price": 28_000_000, "salary": 12_000_000, "is_turkish_star": True, "is_foreign": False, "desc": "Bundesliga'nın en yüksek süratlerine ulaşan rekor sprinter yerli kanat."},
    {"name": "Emirhan İlkhan", "age": 22, "pos": "CM", "current_club": "Torino", "claimed_pot": 84, "real_pot": 84, "price": 25_000_000, "salary": 10_000_000, "is_turkish_star": True, "is_foreign": False, "desc": "İtalya'da gelişen iki yönlü dinamik orta saha, pres ve dikine paslar."},
    {"name": "Ahmetcan Kaplan", "age": 23, "pos": "CB", "current_club": "Ajax", "claimed_pot": 84, "real_pot": 84, "price": 26_000_000, "salary": 10_000_000, "is_turkish_star": True, "is_foreign": False, "desc": "Ajax altyapı ekolüyle yetişen sol ayaklı soğukkanlı savunma lideri."},
    {"name": "Yunus Emre Konak", "age": 20, "pos": "CDM", "current_club": "Brentford", "claimed_pot": 84, "real_pot": 84, "price": 22_000_000, "salary": 8_500_000, "is_turkish_star": True, "is_foreign": False, "desc": "Premier Lig'e transfer olan genç Türk tankı, süpürücü ön libero."},
    {"name": "Doğan Alemdar", "age": 23, "pos": "GK", "current_club": "Rennes / Troyes", "claimed_pot": 81, "real_pot": 81, "price": 18_000_000, "salary": 8_000_000, "is_turkish_star": True, "is_foreign": False, "desc": "Fransa'da erken yaşta eldiven giyen esnek ve çevik genç milli kaleci."},
    {"name": "Yasin Özcan", "age": 20, "pos": "CB", "current_club": "Kasımpaşa / Avrupa Radarı", "claimed_pot": 86, "real_pot": 86, "price": 24_000_000, "salary": 8_000_000, "is_turkish_star": True, "is_foreign": False, "desc": "Sol stoper ve bek oynayabilen, Avrupa devlerinin peşinde olduğu yerli mücevher."}
]

SCOUT_PICKS = [
    {"name": "Mateo 'El Nino' Silva", "age": 19, "pos": "ST", "overall": 80, "claimed_pot": 88, "real_pot": 89, "price": 50_000_000, "salary": 16_000_000, "current_club": "Santos FC", "desc": "Brezilya'da 18 maçta 16 gol attı."},
    {"name": "Lamine Diallo", "age": 23, "pos": "CB", "overall": 79, "claimed_pot": 85, "real_pot": 85, "price": 38_000_000, "salary": 13_000_000, "current_club": "Le Havre", "desc": "Fransa Ligue 2'den kaya gibi genç stoper."},
    {"name": "Kerem Eren", "age": 18, "pos": "RW", "overall": 75, "claimed_pot": 83, "real_pot": 86, "price": 20_000_000, "salary": 7_000_000, "current_club": "Bucaspor 1928", "desc": "Alt ligden fırlayan yerli pırlanta kanat oyuncusu.", "is_foreign": False},
    {"name": "Ousmane Toure", "age": 21, "pos": "CDM", "overall": 78, "claimed_pot": 86, "real_pot": 87, "price": 28_000_000, "salary": 9_000_000, "current_club": "ASEC Mimosas", "desc": "Fildişili ciğersiz pres ve top kapma ustası."},
    {"name": "Valentin Barco", "age": 22, "pos": "LB", "overall": 78, "claimed_pot": 86, "real_pot": 87, "price": 32_000_000, "salary": 10_000_000, "current_club": "Boca Juniors", "desc": "Hücumcu Arjantinli modern sol bek."},
    {"name": "Miloš Kerkez", "age": 22, "pos": "LB", "overall": 80, "claimed_pot": 87, "real_pot": 87, "price": 42_000_000, "salary": 14_000_000, "current_club": "Bournemouth", "desc": "Tempolu bindirmeleriyle sol kanadı domine eden genç yıldız."},
    {"name": "Javi Guerra", "age": 23, "pos": "CM", "overall": 81, "claimed_pot": 88, "real_pot": 88, "price": 45_000_000, "salary": 15_000_000, "current_club": "Valencia", "desc": "İki ceza sahası arasını mekik dokuyan İspanyol maestro."},
    {"name": "Alejandro Garnacho", "age": 22, "pos": "LW", "overall": 82, "claimed_pot": 89, "real_pot": 89, "price": 65_000_000, "salary": 20_000_000, "current_club": "Manchester United", "desc": "Patlayıcı sürat ve bire birde durdurulamaz kanat."}
]


CLUB_SCOUTS_DB = {
    "galatasaray": {"name": "Erdal Keser", "role": "Avrupa Scout Direktörü", "rating": 86, "salary": 6_000_000, "region": "Almanya & Fransa"},
    "fenerbahce": {"name": "Baki Mercimek", "role": "Global Transfer Başgözlemcisi", "rating": 85, "salary": 6_000_000, "region": "Avrupa & Hollanda"},
    "besiktas": {"name": "Gökhan Keskin", "role": "Altyapı & İzleme Komitesi Şefi", "rating": 84, "salary": 5_500_000, "region": "Balkanlar & Türkiye"},
    "trabzonspor": {"name": "İhsan Derelioğlu", "role": "Başgözlemci & Oyuncu İzleme", "rating": 82, "salary": 4_500_000, "region": "Karadeniz & Doğu Avrupa"},
    "goztepe": {"name": "Murat Uluç", "role": "Göztepe A Takım Scout Şefi", "rating": 76, "salary": 3_500_000, "region": "Ege & Güney Amerika"},
    "samsunspor": {"name": "Cenk İşler", "role": "Futbol Gözlemcisi & Analiz", "rating": 75, "salary": 3_000_000, "region": "Türkiye & İskandinavya"},
    "basaksehir": {"name": "Zafer Şahin", "role": "Kurumsal Oyuncu İzleme Şefi", "rating": 78, "salary": 4_000_000, "region": "Süper Lig & Afrika"},
    "eyupspor": {"name": "Umut Bulut", "role": "Yerli Yetenek Avcısı", "rating": 73, "salary": 2_500_000, "region": "1. Lig & Alt Ligler"},
    "kasimpasa": {"name": "Barış Kanbak", "role": "Gelişim & Scout Şefi", "rating": 74, "salary": 2_800_000, "region": "Gurbetçiler & Avrupa"},
    "sivasspor": {"name": "Mehmet Yıldız", "role": "Anadolu & Balkan Scout Şefi", "rating": 74, "salary": 2_800_000, "region": "Balkanlar & Anadolu"},
    "antalyaspor": {"name": "Sedat Ağçay", "role": "Akdeniz Scout Lideri", "rating": 73, "salary": 2_500_000, "region": "Akdeniz & Brezilya"},
    "alanyaspor": {"name": "Ceyhun Gülselam", "role": "Scout & Analiz Şefi", "rating": 75, "salary": 3_000_000, "region": "Avrupa & Alt Ligler"},
    "rizespor": {"name": "Orhan Ovacıklı", "role": "Bölge Scout Koordinatörü", "rating": 72, "salary": 2_400_000, "region": "Karadeniz & Gürcistan"},
    "kayserispor": {"name": "Gökhan Ünal", "role": "Hücum & Forvet Gözlemcisi", "rating": 73, "salary": 2_600_000, "region": "Türkiye & Gurbetçiler"},
    "konyaspor": {"name": "Ömer Ali Şahiner", "role": "Kulüp Başgözlemcisi", "rating": 74, "salary": 2_800_000, "region": "İç Anadolu & Balkanlar"},
    "gaziantepfk": {"name": "Erdal Güneş", "role": "Güneydoğu & Orta Doğu Şefi", "rating": 72, "salary": 2_200_000, "region": "Güneydoğu & Romanya"},
    "bodrumfk": {"name": "Celal Dumanlı", "role": "Gençlik & Amatör Gözlemci", "rating": 71, "salary": 2_000_000, "region": "Ege & 2. Lig"},
    "adanademirspor": {"name": "Volkan Dikmen", "role": "Scout & Performans Şefi", "rating": 72, "salary": 2_200_000, "region": "Akdeniz & İtalya"}
}

SCOUT_CANDIDATES = [
    {"id": "sc1", "name": "Klaus Richter", "role": "Avrupa Veri Analisti", "rating": 90, "salary": 10_000_000, "region": "Almanya & Fransa"},
    {"id": "sc2", "name": "Eduardo Da Silva", "role": "Güney Amerika Uzmanı", "rating": 86, "salary": 7_500_000, "region": "Brezilya & Arjantin"},
    {"id": "sc3", "name": "Cemil 'Kartal Göz' Kaya", "role": "Yerli Lig Kurdu", "rating": 78, "salary": 3_500_000, "region": "Türkiye & Alt Ligler"},
    {"id": "sc4", "name": "Jean-Pierre Mendy", "role": "Genç Yetenek Kaşifi", "rating": 84, "salary": 6_000_000, "region": "Batı Afrika & Fransa"}
]

AVAILABLE_COACHES_MARKET = [
    {
        "id": "c_terim",
        "name": "Fatih Terim",
        "style": "4-3-3 Total Hücum & 'Biz Bitti Demeden Bitmez' Kaos Baskısı",
        "philosophy": "Korkusuz hücum, yüksek özgüven ve 'taktik mazeret üretmez' anlayışıyla rakibi ceza sahasına hapseden dominant futbol.",
        "background": "UEFA Kupası şampiyonu, sayısız Süper Lig kupası ve Türk futbolunun en büyük lider figürlerinden biri.",
        "rating": 89,
        "attack": 92,
        "defense": 79,
        "youth": 78,
        "press_rel": 90,
        "ego": 88,
        "salary": 45_000_000,
        "photo": "/static/coach_terim.png",
        "traits": [
            {"name": "İmparator Aurası", "icon": "award", "desc": "Büyük maçlarda takım gücünü +6 artırır."},
            {"name": "Geri Dönüş Uzmanı", "icon": "flame", "desc": "Yenikken 2. yarıda gol bulma şansını %35 artırır."}
        ]
    },
    {
        "id": "c_sergen",
        "name": "Sergen Yalçın",
        "style": "4-2-3-1 Pragmatik Hücum & Bireysel Yetenek Özgürlüğü",
        "philosophy": "Yetenekli ayaklara sınırsız özgürlük, geçiş oyununda akılcı paslar ve taktik sıkıcılıktan uzak saf futbol zekası.",
        "background": "Süper Lig şampiyonu efsane sol ayak. Sahada taktik tahtasından çok oyuncu dehasına ve maç anındaki sezgiye güvenir.",
        "rating": 86,
        "attack": 88,
        "defense": 80,
        "youth": 82,
        "press_rel": 88,
        "ego": 75,
        "salary": 36_000_000,
        "photo": "/static/coach_sergen.png",
        "traits": [
            {"name": "Dahi Dokunuş", "icon": "sparkles", "desc": "Hücum oyuncularının bireysel bitiricilik yeteneğini yükseltir."},
            {"name": "Büyük Maç Gurusu", "icon": "zap", "desc": "Derbi ve zor maçlarda taktik disiplini üst seviyeye çeker."}
        ]
    },
    {
        "id": "c_senol",
        "name": "Şenol Güneş",
        "style": "4-3-3 Karadeniz Fırtınası & Ofansif Pres",
        "philosophy": "Kanat akınları, dikine cesur hücum ve genç yıldızları parlatma ustalığı. Kaleci geçmişinden gelen saha görüşüyle savunma direncini korur.",
        "background": "Trabzonspor'da 1.112 dakikalık tarihi gol yememe rekoru sahibi efsane kaleci ve Dünya 3.sü Milli Takım teknik direktörü.",
        "rating": 85,
        "attack": 87,
        "defense": 83,
        "youth": 84,
        "press_rel": 86,
        "ego": 72,
        "salary": 32_000_000,
        "photo": "/static/coach_senol_gunes.png",
        "traits": [
            {"name": "Efsane Kaleci Mirası", "icon": "shield", "desc": "Trabzonspor kalesindeki efsane gol yememe rekoru mirasıyla takıma savunma direnci (+5) aşılar."},
            {"name": "Ofansif Cesaret & Oyuncu Geliştirici", "icon": "zap", "desc": "Hızlı kanat hücumları ve genç yetenekleri parlatma felsefesiyle takımın gol potansiyelini yükseltir."}
        ]
    },
    {
        "id": "c_kartal",
        "name": "İsmail Kartal",
        "style": "4-2-3-1 Yüksek Tempolu Pozisyonel Pres & Hücum Disiplini",
        "philosophy": "Fiziksel üstünlük, bitmek bilmeyen koşu mesafesi ve hücumda pozisyon sadakatiyle 90 dakika rakibi yıpratan tempo.",
        "background": "Süper Lig rekor puan toplamış, taktik disiplini ve oyuncularla abi-kardeş bağını aynı anda kuran çalışkan teknik adam.",
        "rating": 84,
        "attack": 85,
        "defense": 82,
        "youth": 78,
        "press_rel": 82,
        "ego": 68,
        "salary": 26_000_000,
        "photo": "/static/coach_ismail_kartal.png",
        "traits": [
            {"name": "Yüksek Mücadele Gücü", "icon": "activity", "desc": "Takımın koşu mesafesini ve ikili mücadele kazanımını artırır."},
            {"name": "Kondisyon Disiplini", "icon": "battery-charging", "desc": "Oyuncuların yorgunluk düşüş hızını %20 azaltır."}
        ]
    },
    {
        "id": "c_volkan",
        "name": "Volkan Demirel",
        "style": "4-4-2 Savaşçı Ruh & Hatay Dayanışması",
        "philosophy": "Korkusuz gladyatör karakteri, forması için ter döken savaşçı kadro ve geriye düşse bile vazgeçmeyen direnç.",
        "background": "Fenerbahçe ve A Milli Takım'ın unutulmaz kalecisi. Kriz dönemlerinde takımı tek yürek yapan ateşleyici lider.",
        "rating": 81,
        "attack": 80,
        "defense": 84,
        "youth": 82,
        "press_rel": 85,
        "ego": 74,
        "salary": 20_000_000,
        "photo": "/static/coach_volkan.png",
        "traits": [
            {"name": "Gladyatör Karakteri", "icon": "shield", "desc": "Yenilgi durumunda takımın pes etmesini engeller."},
            {"name": "Liderlik Karizması", "icon": "volume-2", "desc": "Taraftar güvenini maç başına +1 ekstra besler."}
        ]
    },
    {
        "id": "c_reis",
        "name": "Thomas Reis",
        "style": "4-2-3-1 Dinamik Alman Presi & Fiziksel Baskı",
        "philosophy": "Bundesliga kökenli karşı pres, dar alan savunması ve topsuz oyunda rakibe nefes aldırmayan fiziksel organizasyon.",
        "background": "Almanya ve Türkiye'de taktik disipliniyle fark yaratan, savunma duvarını kusursuz ören Alman futbol ekolü temsilcisi.",
        "rating": 83,
        "attack": 82,
        "defense": 84,
        "youth": 81,
        "press_rel": 83,
        "ego": 66,
        "salary": 24_000_000,
        "photo": "/static/coach_thomas_reis.png",
        "traits": [
            {"name": "Alman Savunma Duvarı", "icon": "shield-check", "desc": "Yenen gol beklentisini (xGA) %20 düşürür."},
            {"name": "Fiziksel Kondisyon", "icon": "zap", "desc": "80. dakikadan sonra takımın kondisyonunu korur."}
        ]
    },
    {
        "id": "c_tekke",
        "name": "Fatih Tekke",
        "style": "4-3-3 Pas Oyunu & Pozisyon Zenginliği",
        "philosophy": "Topa sahip olan oyuna hükmeder anlayışı. Yerden akıcı paslar, forvet hareketliliği ve genç yeteneklere tam güven.",
        "background": "UEFA Kupası kazanmış ve Trabzonspor efsanesi olmuş gol kralı. Modern Türk teknik adamlığının taktik zekası yüksek temsilcisi.",
        "rating": 80,
        "attack": 82,
        "defense": 78,
        "youth": 83,
        "press_rel": 80,
        "ego": 68,
        "salary": 20_000_000,
        "photo": "/static/coach_tekke.png",
        "traits": [
            {"name": "Topa Hakimiyet & Pas", "icon": "compass", "desc": "Topla oynama oranını %10 artırır."},
            {"name": "Genç Yetenek Kaşifi", "icon": "user-check", "desc": "Altyapı oyuncularının gelişimini hızlandırır."}
        ]
    }
]


AVAILABLE_SPONSORS = [
    {
        "id": "sp1",
        "type": "chest",
        "type_label": "Göğüs Ana Sponsoru",
        "name": "Türk Hava Yolları",
        "income_season": 35_000_000,
        "req_text": "İlk 5 Sıra & %70+ Taraftar",
        "req_fan": 70,
        "req_rank": 5,
        "desc": "Uluslararası prestij ve Avrupa arenası hedefleyen köklü kulüplerle çalışırlar.",
        "downside": "İlk 6 sıradan düşülürse sponsorluk ödemeleri dondurulur ve kulübe 6M ₺ ihtar cezası yansıtılır."
    },
    {
        "id": "sp2",
        "type": "chest",
        "type_label": "Göğüs Ana Sponsoru",
        "name": "Binance Global Finans",
        "income_season": 45_000_000,
        "req_text": "İlk 3 Şampiyonluk Adayı & %80+ Güven",
        "req_fan": 80,
        "req_rank": 3,
        "desc": "Yalnızca şampiyonluk kovalayan dev markalara küresel sermaye yatırımı yaparlar.",
        "downside": "Şampiyonluk yarışından kopulması durumunda (4. ve altı) anlaşma feshedilir."
    },
    {
        "id": "sp3",
        "type": "stadium",
        "type_label": "Stadyum İsim Hakkı",
        "name": "Mega Telekom Arena",
        "income_season": 38_000_000,
        "req_text": "35.000+ Stadyum Kapasitesi",
        "req_stadium": 35000,
        "desc": "Dev stadyumların teknolojik altyapısını ve sezonluk isim hakkını devralır.",
        "downside": "Stadyum doluluğu %50 altına düşerse haftalık hakedişler %40 oranında tırpanlanır."
    },
    {
        "id": "sp4",
        "type": "stadium",
        "type_label": "Stadyum İsim Hakkı",
        "name": "Red Bull Park",
        "income_season": 48_000_000,
        "req_text": "40.000+ Kapasite & %80+ Taraftar",
        "req_stadium": 40000,
        "req_fan": 80,
        "desc": "Global enerji devi; stadyumu devasa bir şölen merkezine dönüştürmek için elit bütçe sunar.",
        "downside": "Taraftar güveni %65 altına düşerse marka tazminatı olarak 8M ₺ ceza tahsil edilir."
    },
    {
        "id": "sp5",
        "type": "back",
        "type_label": "Forma Sırt & Numara",
        "name": "Uludağ Doğal Maden",
        "income_season": 14_000_000,
        "req_text": "Tüm Kulüplere Açık",
        "desc": "Yerli sanayi devi; Süper Lig'in tüm renklerine sırt reklamı desteği sağlar.",
        "downside": "Ligin alt sıralarına (küme düşme potası) inilirse sezonluk prim iptal edilir."
    },
    {
        "id": "sp6",
        "type": "back",
        "type_label": "Forma Sırt & Numara",
        "name": "Puma Sportswear",
        "income_season": 22_000_000,
        "req_text": "İlk 8 Sıra & %60+ Kongre Güveni",
        "req_rank": 8,
        "req_board": 60,
        "desc": "Avrupa kupaları yolundaki istikrarlı takımların forma sırt tedarikçisi.",
        "downside": "İlk 10 dışına gerilen haftalarda haftalık forma primleri askıya alınır."
    },
    {
        "id": "sp7",
        "type": "arm",
        "type_label": "Forma Kol & Şort",
        "name": "Getir Lojistik",
        "income_season": 15_000_000,
        "req_text": "Mali Disiplin (Borç Limitini Aşmama)",
        "req_no_debt_limit": True,
        "desc": "Hızlı teslimat devi; mali tablosu temiz olan kulüplerle kol ve şort ortaklığı kurar.",
        "downside": "Kulübün borç limitini aşması durumunda sözleşme anında tek taraflı feshedilir."
    },
    {
        "id": "sp8",
        "type": "health",
        "type_label": "Resmi Sağlık Sponsoru",
        "name": "Acıbadem Sağlık Grubu",
        "income_season": 16_000_000,
        "req_text": "Süper Lig Kulübü Olma",
        "desc": "Kulübün tüm sporcu sağlık kontrollerini üstlenir ve sakatlık sürelerini kısaltır.",
        "downside": "Kulüp doping veya yasadışı soruşturmaya uğrarsa sağlık anlaşması düşer."
    }
]

# ==================== OYUNCU KİRALAMA KULÜPLERİ HAVUZU ====================
POTENTIAL_LOAN_CLUBS = [
    {"name": "Gençlerbirliği", "league": "Trendyol 1. Lig", "wage_cover": 1.0, "pot_growth": 3, "min_time": 90},
    {"name": "Kocaelispor", "league": "Trendyol 1. Lig", "wage_cover": 0.85, "pot_growth": 2, "min_time": 85},
    {"name": "Sakaryaspor", "league": "Trendyol 1. Lig", "wage_cover": 0.90, "pot_growth": 2, "min_time": 80},
    {"name": "Esenler Erokspor", "league": "Trendyol 1. Lig", "wage_cover": 1.0, "pot_growth": 3, "min_time": 90},
    {"name": "Amed SK", "league": "Trendyol 1. Lig", "wage_cover": 0.95, "pot_growth": 3, "min_time": 90},
    {"name": "Bandırmaspor", "league": "Trendyol 1. Lig", "wage_cover": 0.80, "pot_growth": 2, "min_time": 75},
    {"name": "Bodrum FK", "league": "Süper Lig", "wage_cover": 1.0, "pot_growth": 4, "min_time": 85}
]

# ==================== TAKTİK & KÜLTÜR YETENEK AĞACI (MASTERY TREE) ====================
TACTICAL_SKILLS_DATA = {
    "cehennem_tribunu": {
        "id": "cehennem_tribunu",
        "name": "Cehennem Tribünü",
        "tier": 1,
        "cost": 1,
        "icon": "🏟️",
        "desc": "Ev sahibi maçlarında 120 desibel tribün baskısı. Oyuncularımıza +%8 saha baskısı ve ikili mücadele üstünlüğü sağlar.",
        "requires": []
    },
    "deplasman_org": {
        "id": "deplasman_org",
        "name": "Deplasman Seferberliği",
        "tier": 1,
        "cost": 1,
        "icon": "🚌",
        "desc": "Organize taraftar grupları ve holigan desteğiyle deplasman handikapı kırılır. Deplasmanlarda +%6 direnç kazandırır.",
        "requires": []
    },
    "hucum_ustaligi": {
        "id": "hucum_ustaligi",
        "name": "Organize Hücum & Pres",
        "tier": 2,
        "cost": 2,
        "icon": "⚡",
        "desc": "Ön alan presi ve hızlı kanat hücumları. Forvetlerin ceza sahası etkinliğini artırır, gol şanslarına +%5 bitiricilik katar.",
        "requires": ["cehennem_tribunu"]
    },
    "savunma_duvari": {
        "id": "savunma_duvari",
        "name": "Çelik Savunma & Katı Blok",
        "tier": 2,
        "cost": 2,
        "icon": "🛡️",
        "desc": "Ceza sahası önünde etten duvar örülür. Rakibin tehlikeli pozisyonlarını ve gol şanslarını %15 engeller.",
        "requires": ["deplasman_org"]
    },
    "kaptan_ruhu": {
        "id": "kaptan_ruhu",
        "name": "Kaptan Ruhu & İsyan",
        "tier": 3,
        "cost": 3,
        "icon": "👑",
        "desc": "Geriye düşüldüğünde soyunma odası ateşi yanar. 2. devrede geri dönüş (comeback) reaksiyonunu ve gücünü ikiye katlar.",
        "requires": ["hucum_ustaligi", "savunma_duvari"]
    },
    "fizik_kondisyon": {
        "id": "fizik_kondisyon",
        "name": "Gladyatör Kondisyonu",
        "tier": 3,
        "cost": 3,
        "icon": "🩹",
        "desc": "Özel antrenman metoduyla maç sonu kondisyon kaybı %40 azalır; oyuncular haftalarca yorulmadan üst seviye oynar.",
        "requires": ["hucum_ustaligi", "savunma_duvari"]
    },
    "son_dakika_canavari": {
        "id": "son_dakika_canavari",
        "name": "Son Dakika Canavarı",
        "tier": 4,
        "cost": 5,
        "icon": "⏱️🔥",
        "desc": "ZİRVE USTALIK: 80-90. dakikalar arası, özellikle derbilerde olağanüstü gol şansı ve ölümcül baskı üretir!",
        "requires": ["kaptan_ruhu", "fizik_kondisyon"]
    }
}

# ==================== DİNAMİK SPONSOR TEKLİFLERİ HAVUZU ====================
COMPANIES_POOL = [
    {"company": "Türk Hava Yolları", "category": "chest", "category_label": "Göğüs Ana Sponsorluğu", "base": 55_000_000, "cond": "İlk 3 sırada bitirilirse +15M ₺ prim"},
    {"company": "SOCAR Enerji", "category": "chest", "category_label": "Göğüs Ana Sponsorluğu", "base": 48_000_000, "cond": "Avrupa Kupalarına katılınırsa +12M ₺ prim"},
    {"company": "Rams Global", "category": "stadium", "category_label": "Stadyum İsim Sponsorluğu", "base": 68_000_000, "cond": "Stadyum doluluğu %75 üzeri olursa +10M ₺ prim"},
    {"company": "Beko Beyaz Eşya", "category": "back", "category_label": "Forma Sırt Sponsorluğu", "base": 34_000_000, "cond": "Her derbi galibiyetinde +1.5M ₺ prim"},
    {"company": "Trendyol", "category": "back", "category_label": "Forma Sırt Sponsorluğu", "base": 36_000_000, "cond": "İlk 4 sırada bitirilirse +8M ₺ prim"},
    {"company": "Getir & BiTaksi", "category": "arm", "category_label": "Forma Kol & Şort Sponsorluğu", "base": 24_000_000, "cond": "Mali disiplin korunursa sözleşme uzatılır"},
    {"company": "Puma Spor", "category": "arm", "category_label": "Forma Kol & Şort Sponsorluğu", "base": 22_000_000, "cond": "Forma satışları 100K adedi geçerse +5M ₺ prim"},
    {"company": "Medicana Sağlık", "category": "health", "category_label": "Resmi Sağlık Sponsorluğu", "base": 18_000_000, "cond": "Sakatlık tedavileri ve sağlık kontrolleri ücretsiz"}
]

def generate_incoming_sponsor_offers(state, count=3):
    active_sponsors = state.get("finances", {}).get("active_sponsors", [])
    active_types = {s.get("type") for s in active_sponsors}
    existing_companies = {o.get("company") for o in state.get("incoming_sponsor_offers", [])}
    available = [c for c in COMPANIES_POOL if c["category"] not in active_types and c["company"] not in existing_companies]
    if not available:
        available = [c for c in COMPANIES_POOL if c["company"] not in existing_companies]
    if not available:
        available = list(COMPANIES_POOL)
    
    random.shuffle(available)
    fan_trust = state.get("fan_trust", 50)
    multiplier = 0.8 + (fan_trust / 100.0) * 0.4
    offers = []
    for item in available[:count]:
        offer_val = int(item["base"] * multiplier * random.uniform(0.9, 1.15))
        upfront = random.choice([25, 30, 35, 40])
        offers.append({
            "id": f"off_{random.randint(10000, 99999)}",
            "company": item["company"],
            "category": item["category"],
            "category_label": item["category_label"],
            "offer_amount": offer_val,
            "upfront_pct": upfront,
            "upfront_amount": int(offer_val * (upfront / 100.0)),
            "condition": item["cond"],
            "can_bargain": True
        })
    return offers

EUROPEAN_CLUBS_MARKET = {
    "Ajax": [
        {"name": "Kenneth Taylor", "pos": "MERKEZ OS", "age": 24, "overall": 83, "val": 35_000_000, "wage": 11_000_000, "desc": "Ajax altyapısının maestro oyun kurucusu. Yüksek pas ve vizyon."},
        {"name": "Brian Brobbey", "pos": "SANTRAFOR", "age": 24, "overall": 83, "val": 42_000_000, "wage": 14_000_000, "desc": "Fiziksel güç abidesi, ceza sahasında durdurulamaz forvet."},
        {"name": "Mika Godts", "pos": "SOL KANAT", "age": 21, "overall": 80, "potential": 88, "val": 28_000_000, "wage": 7_500_000, "desc": "Belçikalı dahi kanat, müthiş çalım ve asist yeteneği."},
        {"name": "Jorrel Hato", "pos": "STP", "age": 20, "overall": 82, "potential": 89, "val": 40_000_000, "wage": 9_000_000, "desc": "Avrupa devlerinin peşinde olduğu elit sol ayaklı stoper."}
    ],
    "Aston Villa": [
        {"name": "Jacob Ramsey", "pos": "MERKEZ OS", "age": 25, "overall": 83, "val": 38_000_000, "wage": 13_500_000, "desc": "Premier Lig temposuna alışık, iki yönlü dinamik orta saha."},
        {"name": "Morgan Rogers", "pos": "FORVET ARKASI", "age": 24, "overall": 82, "val": 32_000_000, "wage": 10_000_000, "desc": "Güçlü dripling, dripling üstü şut ve asist ustası."},
        {"name": "Jhon Durán", "pos": "SANTRAFOR", "age": 22, "overall": 83, "potential": 88, "val": 45_000_000, "wage": 15_000_000, "desc": "Uzak mesafeli füzeleriyle ünlü Kolombiyalı süper golcü."}
    ],
    "Sevilla": [
        {"name": "Dodi Lukebakio", "pos": "SAĞ KANAT", "age": 28, "overall": 82, "val": 26_000_000, "wage": 9_500_000, "desc": "Hızlı, patlayıcı ve ters ayaklı hücum silahı."},
        {"name": "Isaac Romero", "pos": "SANTRAFOR", "age": 26, "overall": 80, "val": 22_000_000, "wage": 8_000_000, "desc": "Pres gücü yüksek, savaşçı İspanyol forvet."},
        {"name": "Juanlu Sánchez", "pos": "SAĞ BEK", "age": 23, "overall": 81, "potential": 86, "val": 24_000_000, "wage": 7_000_000, "desc": "Hücumcu bek ekolünün parlayan genç yıldızı."}
    ],
    "Sporting CP": [
        {"name": "Morten Hjulmand", "pos": "ÖN LİBERO", "age": 27, "overall": 84, "val": 44_000_000, "wage": 14_000_000, "desc": "Kusursuz oyun zekası, top kapan ve oyunu başlatan lider."},
        {"name": "Francisco Trincão", "pos": "SAĞ KANAT", "age": 26, "overall": 82, "val": 28_000_000, "wage": 9_000_000, "desc": "Teknik kapasitesi yüksek Portekizli solak virtüöz."}
    ],
    "Lille": [
        {"name": "Edon Zhegrova", "pos": "SAĞ KANAT", "age": 27, "overall": 83, "val": 34_000_000, "wage": 11_500_000, "desc": "Ligue 1'in en çok çalım atan kanat oyuncularından biri."},
        {"name": "Ayyoub Bouaddi", "pos": "MERKEZ OS", "age": 19, "overall": 79, "potential": 88, "val": 22_000_000, "wage": 5_500_000, "desc": "Fransa'nın yeni nesil altın çocuğu, soğukkanlı pasör."}
    ],
    "Benfica": [
        {"name": "Florentino Luís", "pos": "ÖN LİBERO", "age": 26, "overall": 83, "val": 38_000_000, "wage": 12_000_000, "desc": "Benfica'nın ciğersiz ön liberosu, top kapan ve oyunu başlatan pres makinesi."},
        {"name": "Arthur Cabral", "pos": "SANTRAFOR", "age": 28, "overall": 82, "val": 30_000_000, "wage": 10_500_000, "desc": "Brezilyalı güçlü santrafor, ceza sahası içi bitirici ve hava hakimiyeti yüksek."},
        {"name": "António Silva", "pos": "STP", "age": 22, "overall": 83, "potential": 89, "val": 45_000_000, "wage": 10_000_000, "desc": "Portekiz'in gelecekteki savunma kaptanı, kaya gibi stoper."},
        {"name": "Jan-Niklas Beste", "pos": "SOL BEK", "age": 27, "overall": 81, "val": 24_000_000, "wage": 8_500_000, "desc": "Ölümcül orta kalitesi ve duran top ustalığıyla tanınan Alman sol bek."}
    ],
    "Borussia Dortmund": [
        {"name": "Karim Adeyemi", "pos": "SOL KANAT", "age": 24, "overall": 83, "val": 40_000_000, "wage": 13_000_000, "desc": "İnanılmaz depar hızı, savunma arkasına sarkan füze forvet."},
        {"name": "Felix Nmecha", "pos": "MERKEZ OS", "age": 25, "overall": 81, "val": 28_000_000, "wage": 9_500_000, "desc": "Fizik gücü yüksek, uzaktan sert şutları olan Alman dinamik orta saha."},
        {"name": "Jamie Bynoe-Gittens", "pos": "SAĞ KANAT", "age": 22, "overall": 80, "potential": 88, "val": 30_000_000, "wage": 8_000_000, "desc": "Bire birde durdurulamaz İngiliz kanat cambazı."}
    ]
}

# ==================== OYUNCU VE RADAR İSTATİSTİKLERİ ====================
def to_fifa_pos(pos: str) -> str:
    if not pos:
        return "CM"
    # ASCII-safe normalizasyon: Türkçe karakterleri ASCII'ye düşür
    raw = str(pos).strip()
    p = raw.upper()
    # ASCII fallback map: encode/decode ile latin-1 hataları önle
    try:
        ascii_p = raw.encode("ascii", errors="replace").decode("ascii").upper()
    except Exception:
        ascii_p = p

    # Kaleci
    if "KL" in p or "GK" in p or "KALE" in p:
        return "GK"
    # Stoper / CB
    if "STP" in p or p == "CB" or "STOPER" in p:
        return "CB"
    if "CB" in p.split():
        return "CB"
    # Sol Bek
    if "SOL BEK" in p or "SOL BEK" in ascii_p or "SLB" in p or p == "LB":
        return "LB"
    if "LB" in p.split():
        return "LB"
    # Sağ Bek - SAĞ BEK, SA? BEK (encoding bozuk gelirse)
    if ("SA" in p and "BEK" in p) or "SGB" in p or p == "RB" or p == "SB":
        return "RB"
    if "RB" in p.split():
        return "RB"
    # CDM / ÖN LİBERO / DOS
    if "N L" in p and "BERO" in p:  # ÖN LİBERO veya ON LIBERO
        return "CDM"
    if "DOS" in p or p == "CDM" or "DMF" in p or "CDM" in p.split():
        return "CDM"
    # CAM / OOS / FORVET ARKASI / ON NUMARA
    if "FORVET ARK" in p or "OOS" in p or p == "CAM" or "AMF" in p or "CAM" in p.split():
        return "CAM"
    if "OFANS" in ascii_p or "OFANS" in p or "ON NUMARA" in p:
        return "CAM"
    # CM / ORTA SAHA / MERKEZ OS
    if "MERKEZ" in p or "ORTA SAHA" in p or p == "CM" or p == "OS":
        return "CM"
    if "CM" in p.split():
        return "CM"
    # RW - Sağ Kanat
    if ("SA" in p and "KANAT" in p) or "SGK" in p or p == "RW" or "RM" in p or p == "SK":
        return "RW"
    if "RW" in p.split():
        return "RW"
    # LW - Sol Kanat
    if ("SOL" in p and "KANAT" in p) or "SLK" in p or p == "LW" or "LM" in p:
        return "LW"
    if "LW" in p.split():
        return "LW"
    # ST / Santrafor / Forvet
    if "SANTRAF" in p or "SANTRAT" in p or p == "ST" or p == "CF" or "CF" in p.split():
        return "ST"
    if "FORVET" in p and "ARK" not in p:
        return "ST"
    # Genel KANAT → RW
    if "KANAT" in p:
        return "RW"
    # Son çare: ilk 3 karakter
    return p[:3] if len(p) >= 3 else p

def get_position_category_rank(pos: str) -> int:
    f_pos = to_fifa_pos(pos)
    order = {
        "GK": 0,
        "LB": 1,
        "CB": 2,
        "RB": 3,
        "CDM": 4,
        "CM": 5,
        "CAM": 6,
        "LW": 7,
        "RW": 8,
        "ST": 9,
    }
    return order.get(f_pos, 5)

def is_gk(p: Dict[str, Any]) -> bool:
    return to_fifa_pos(p.get("pos", "")) == "GK"

def enrich_player(p: Dict[str, Any]) -> Dict[str, Any]:
    raw_pos = str(p.get("pos", "CM")).upper()
    fifa_pos = to_fifa_pos(raw_pos)
    p["pos"] = fifa_pos
    if "overall" not in p or p["overall"] is None:
        p["overall"] = int(p.get("real_pot") or p.get("claimed_pot") or 75)
    else:
        p["overall"] = int(p["overall"])
    ovr = p["overall"]

    skills = p.get("skills")
    if not skills or len(skills) < 6:
        # Radar İstatistikleri: pac (Hız), sho (Şut), pas (Pas), dri (Dripling), def (Defans), phy (Fizik)
        if fifa_pos == "GK":
            skills = {
                "pac": max(42, min(85, ovr - 22)),
                "sho": max(20, min(65, ovr - 38)),
                "pas": max(50, min(86, ovr - 12)),
                "dri": max(40, min(75, ovr - 24)),
                "def": max(65, min(95, ovr - 4)),
                "phy": max(65, min(96, ovr - 2))
            }
        elif fifa_pos in ["CB", "LB", "RB"]:
            skills = {
                "pac": max(62, min(96, ovr - (4 if fifa_pos in ["LB", "RB"] else 11))),
                "sho": max(38, min(78, ovr - 26)),
                "pas": max(60, min(88, ovr - 10)),
                "dri": max(56, min(86, ovr - 14)),
                "def": max(72, min(99, ovr + 3)),
                "phy": max(70, min(98, ovr + 2))
            }
        elif fifa_pos in ["CDM", "CM", "CAM"]:
            skills = {
                "pac": max(64, min(93, ovr - 8)),
                "sho": max(64, min(91, ovr - 5)),
                "pas": max(74, min(99, ovr + 4)),
                "dri": max(72, min(98, ovr + 2)),
                "def": max(52, min(90, ovr - (4 if fifa_pos == "CDM" else 16))),
                "phy": max(65, min(94, ovr - 5))
            }
        else:  # RW, LW, ST
            skills = {
                "pac": max(75, min(99, ovr + (4 if fifa_pos in ["RW", "LW"] else -2))),
                "sho": max(75, min(99, ovr + 3)),
                "pas": max(64, min(92, ovr - 7)),
                "dri": max(75, min(99, ovr + 3)),
                "def": max(30, min(62, ovr - 38)),
                "phy": max(66, min(96, ovr - 3))
            }

    p["skills"] = skills
    if "contract_years" not in p:
        p["contract_years"] = random.choice([1, 2, 3, 4])
    if "morale" not in p:
        p["morale"] = random.randint(75, 95)
    if "wage_demand" not in p:
        p["wage_demand"] = 0

    # Yaş ve Potansiyel (26 yaş altı için özel gelişim potansiyeli)
    if "age" not in p or not p["age"]:
        p["age"] = random.randint(19, 32)
    
    age = int(p["age"])
    ovr = int(p.get("overall", 75))
    if age < 26:
        if "potential" not in p or not p["potential"]:
            growth_room = max(3, (27 - age) * 2)
            p["potential"] = min(94, max(ovr + 2, ovr + growth_room))
        p["is_youth"] = True
    else:
        p["potential"] = ovr
        p["is_youth"] = False

    # Yabancı / Yerli Kontrolü (Süper Lig Kuralı)
    if "is_foreign" not in p:
        name_lower = str(p.get("name", "")).lower()
        turkish_indicators = ["ç", "ğ", "ı", "ö", "ş", "ü", "ahmet", "mehmet", "ali", "ömer", "can", "kerem", "barış", "uğurcan", "ferdi", "semih", "irfan", "mert", "samet", "eren", "enes", "hakan", "yusuf", "abdülkerim", "okay", "berke", "kaan", "cenk", "ozan", "salih", "taylan", "orhan", "serdar", "batagov", "deniz", "güler", "kaya", "yılmaz", "demir", "çelik", "özkan", "gökhan", "arda", "kenan", "altay", "zeki", "emirhan", "yunus", "ahmetcan", "doğan", "yasin", "merih"]
        p["is_foreign"] = not (any(c in name_lower for c in ["ç", "ğ", "ı", "ö", "ş", "ü"]) or any(w in name_lower.split() for w in turkish_indicators))

    # Sakatlık & Kart Cezaları
    if "yellow_cards" not in p:
        p["yellow_cards"] = 0
    if "suspended_weeks" not in p:
        p["suspended_weeks"] = 0
    if "injured_weeks" not in p:
        p["injured_weeks"] = 0

    # Kondisyon & Yorgunluk Düzeyi (0 - 100)
    if "stamina" not in p:
        p["stamina"] = 100
    else:
        p["stamina"] = max(20, min(100, int(p["stamina"])))

    # Maç Süresi, Reyting ve Oynama İstatistikleri
    if "minutes_played" not in p:
        p["minutes_played"] = 0
    if "matches_played" not in p:
        p["matches_played"] = 0
    if "ratings_history" not in p or not isinstance(p["ratings_history"], list):
        p["ratings_history"] = []
    if "avg_rating" not in p:
        p["avg_rating"] = 0.0
    if "goals" not in p:
        p["goals"] = 0
    if "assists" not in p:
        p["assists"] = 0
    if "red_cards" not in p:
        p["red_cards"] = 0

    return p

def calculate_team_radar(squad: List[Dict]) -> Dict[str, int]:
    starters = squad[:11] if len(squad) >= 11 else squad
    if not starters:
        return {"pac": 75, "sho": 75, "pas": 75, "dri": 75, "def": 75, "phy": 75}
    
    sums = {"pac": 0, "sho": 0, "pas": 0, "dri": 0, "def": 0, "phy": 0}
    for p in starters:
        sk = p.get("skills") or {}
        for k in sums:
            sums[k] += sk.get(k, 75)
    
    n = len(starters)
    return {k: round(v / n) for k, v in sums.items()}

def get_captain_name(squad: List[Dict]) -> str:
    # En tecrübeli ve yüksek overall oyuncu kaptandır
    if not squad:
        return "Takım Kaptanı"
    starters = squad[:11] if len(squad) >= 11 else squad
    sorted_p = sorted(starters, key=lambda x: (x.get("age", 25) >= 28, x.get("overall", 75)), reverse=True)
    return sorted_p[0]["name"]

def get_realistic_market_wage(overall: int) -> int:
    if overall >= 88:
        return 30_000_000 + (overall - 88) * 8_000_000
    elif overall >= 84:
        return 12_000_000 + (overall - 84) * 3_500_000
    elif overall >= 80:
        return 6_000_000 + (overall - 80) * 1_500_000
    elif overall >= 75:
        return 3_000_000 + (overall - 75) * 600_000
    else:
        return max(1_500_000, 2_000_000 + (overall - 70) * 200_000)

TURKISH_YOUTH_FIRST_NAMES = [
    "Arda", "Eren", "Semih", "Emirhan", "Kerem", "Barış", "Yusuf", "Mert", "Batuhan", "Caner",
    "Furkan", "Onur", "Burak", "Kaan", "Enes", "Umut", "Oğuzhan", "Yiğit", "Berkay", "Doruk",
    "Yağız", "Efe", "Hamza", "Taha", "Melih", "Ali İhsan", "Emre", "Salih", "Taylan", "İsmail",
    "Deniz", "Cem", "Alperen", "Volkan", "Gökhan", "Tolga", "Sinan", "Okan", "Uğur", "Ferdi"
]
TURKISH_YOUTH_LAST_NAMES = [
    "Yılmaz", "Kaya", "Demir", "Çelik", "Şahin", "Yıldız", "Öztürk", "Aydın", "Özdemir", "Arslan",
    "Doğan", "Kılıç", "Aslan", "Çetin", "Kara", "Koç", "Kurt", "Özkan", "Şimşek", "Polat",
    "Erdoğan", "Güler", "Yavuz", "Aksoy", "Korkmaz", "Önal", "Bozkurt", "Keskin", "Toprak", "Bulut"
]

def generate_random_youth_name(existing_names: set) -> str:
    for _ in range(100):
        fn = random.choice(TURKISH_YOUTH_FIRST_NAMES)
        ln = random.choice(TURKISH_YOUTH_LAST_NAMES)
        full = f"{fn} {ln} (Altyapı)"
        if full not in existing_names:
            return full
    return f"{random.choice(TURKISH_YOUTH_FIRST_NAMES)} {random.choice(TURKISH_YOUTH_LAST_NAMES)} Jr. (Altyapı)"

def rebalance_and_validate_squad(squad: List[Dict], club_name: str = "", force_auto_pick: bool = False) -> List[Dict]:
    squad_copy = [dict(p) for p in squad]
    existing_names = {p.get("name", "") for p in squad_copy}

    # Bozuk veya uçuk maaşları gerçekçi piyasaya normalize et
    for p in squad_copy:
        ovr = p.get("overall", 75)
        market_w = get_realistic_market_wage(ovr)
        if p.get("wage", 0) > market_w * 2.2:
            p["wage"] = market_w

    gks = [p for p in squad_copy if is_gk(p)]
    outfield = [p for p in squad_copy if not is_gk(p)]

    # Kaleci yoksa altyapıdan kaleci çağır
    if not gks:
        gk_name = generate_random_youth_name(existing_names)
        existing_names.add(gk_name)
        new_gk = enrich_player({
            "name": gk_name,
            "pos": "GK",
            "age": random.randint(18, 20),
            "overall": random.randint(72, 75),
            "potential": random.randint(84, 88),
            "wage": 2_000_000,
            "val": 15_000_000,
            "is_youth": True,
            "is_foreign": False,
            "contract_years": 4,
            "morale": 90,
            "stamina": 100
        })
        gks.append(new_gk)

    # Yedek kaleci yoksa 2. kaleci ekle
    if len(gks) < 2:
        gk2_name = generate_random_youth_name(existing_names)
        existing_names.add(gk2_name)
        backup_gk = enrich_player({
            "name": gk2_name,
            "pos": "GK",
            "age": random.randint(18, 19),
            "overall": random.randint(70, 73),
            "potential": random.randint(83, 86),
            "wage": 1_800_000,
            "val": 12_000_000,
            "is_youth": True,
            "is_foreign": False,
            "contract_years": 5,
            "morale": 90,
            "stamina": 100
        })
        gks.append(backup_gk)

    # Saha içi oyuncu sayısı 12'den azsa altyapıdan çeşitli mevkilerde takviye yap
    youth_positions_pool = ["CB", "CM", "LB", "RB", "ST", "LW", "RW", "CDM", "CAM"]
    pos_idx = 0
    while len(outfield) < 13:
        y_name = generate_random_youth_name(existing_names)
        existing_names.add(y_name)
        y_pos = youth_positions_pool[pos_idx % len(youth_positions_pool)]
        pos_idx += 1
        new_youth = enrich_player({
            "name": y_name,
            "pos": y_pos,
            "age": random.randint(18, 20),
            "overall": random.randint(71, 76),
            "potential": random.randint(84, 90),
            "wage": 2_200_000,
            "val": 18_000_000,
            "is_youth": True,
            "is_foreign": False,
            "contract_years": 4,
            "morale": 90,
            "stamina": 100
        })
        outfield.append(new_youth)

    # KULLANICININ MANUEL İLK 11 TERCİHİNİ KORUMA:
    # Eğer force_auto_pick değilse ve mevcut squad_copy ilk 11'i geçerliyse (1 GK + 10 Outfield):
    # Kullanıcının belirlediği ilk 11 sırası ASLA değiştirilmez!
    if not force_auto_pick and len(squad_copy) >= 11:
        current_starters = squad_copy[:11]
        c_gk = [p for p in current_starters if is_gk(p)]
        c_out = [p for p in current_starters if not is_gk(p)]
        if len(c_gk) == 1 and len(c_out) == 10:
            # Kullanıcının ilk 11'i kusursuz! Olduğu gibi koru:
            starter_names = {p["name"] for p in current_starters}
            bench_players = [p for p in (gks + outfield) if p["name"] not in starter_names]
            # Kaleci mutlaka indeks 0'da olsun
            final_starters = [c_gk[0]] + c_out
            return final_starters + bench_players

    # OTOMATİK DİZİLİM (force_auto_pick veya geçersiz kadro durumu):
    gks.sort(key=lambda x: (x.get("suspended_weeks", 0) == 0, x.get("injured_weeks", 0) == 0, x.get("overall", 75)), reverse=True)
    best_gk = gks[0]
    bench_gks = gks[1:]

    outfield.sort(key=lambda x: (x.get("suspended_weeks", 0) == 0, x.get("injured_weeks", 0) == 0, x.get("overall", 75)), reverse=True)

    gk_is_foreign = best_gk.get("is_foreign", True)
    foreign_count = 1 if gk_is_foreign else 0

    starters_outfield = []
    bench_outfield = []

    for p in outfield:
        if len(starters_outfield) < 10:
            if p.get("is_foreign", True):
                if foreign_count < 8:
                    starters_outfield.append(p)
                    foreign_count += 1
                else:
                    bench_outfield.append(p)
            else:
                starters_outfield.append(p)
        else:
            bench_outfield.append(p)

    while len(starters_outfield) < 10 and bench_outfield:
        starters_outfield.append(bench_outfield.pop(0))

    # Saha içi oyuncuları FIFA mevkilerine göre sıralanır:
    starters_outfield.sort(key=lambda x: (get_position_category_rank(x.get("pos", "")), -int(x.get("overall", 75))))
    bench_outfield.sort(key=lambda x: (get_position_category_rank(x.get("pos", "")), -int(x.get("overall", 75))))

    final_squad = [best_gk] + starters_outfield + bench_gks + bench_outfield
    return final_squad

# ==================== OYUN TAKVİMİ & TARİH SİSTEMİ ====================
TURKISH_MONTHS = ["", "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"]
TURKISH_DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]

def format_turkish_date(date_str: str) -> str:
    try:
        d = datetime.date.fromisoformat(date_str)
        return f"{d.day} {TURKISH_MONTHS[d.month]} {d.year}"
    except Exception:
        return date_str

def format_turkish_date_full(date_str: str) -> str:
    try:
        d = datetime.date.fromisoformat(date_str)
        return f"{d.day} {TURKISH_MONTHS[d.month]} {d.year}, {TURKISH_DAYS[d.weekday()]}"
    except Exception:
        return date_str

# Süper Lig maç haftası gün dağılımı (Cumartesi referansına göre ofsetler: -1: Cuma, 0: Cumartesi, +1: Pazar, +2: Pazartesi)
WEEK_DAY_OFFSETS = [
    1,   # W1: Pazar (16 Ağu)
    0,   # W2: Cumartesi (22 Ağu)
    1,   # W3: Pazar (30 Ağu)
    -1,  # W4: Cuma (4 Eyl)
    1,   # W5: Pazar (13 Eyl)
    0,   # W6: Cumartesi (19 Eyl)
    2,   # W7: Pazartesi (28 Eyl)
    1,   # W8: Pazar (4 Eki)
    0,   # W9: Cumartesi (10 Eki)
    -1,  # W10: Cuma (16 Eki)
    1,   # W11: Pazar (25 Eki)
    0,   # W12: Cumartesi (31 Eki)
    1,   # W13: Pazar (8 Kas)
    0,   # W14: Cumartesi (14 Kas)
    -1,  # W15: Cuma (20 Kas)
    1,   # W16: Pazar (29 Kas)
    2,   # W17: Pazartesi (7 Ara)
    # Devre arası tatili
    1,   # W18: Pazar (3 Oca)
    0,   # W19: Cumartesi (9 Oca)
    -1,  # W20: Cuma (15 Oca)
    1,   # W21: Pazar (24 Oca)
    0,   # W22: Cumartesi (30 Oca)
    1,   # W23: Pazar (7 Şub)
    2,   # W24: Pazartesi (15 Şub)
    1,   # W25: Pazar (21 Şub)
    0,   # W26: Cumartesi (27 Şub)
    -1,  # W27: Cuma (5 Mar)
    1,   # W28: Pazar (14 Mar)
    0,   # W29: Cumartesi (20 Mar)
    1,   # W30: Pazar (28 Mar)
    0,   # W31: Cumartesi (3 Nis)
    1,   # W32: Pazar (11 Nis)
    0,   # W33: Cumartesi (17 Nis)
    1    # W34: Pazar (25 Nis)
]

def build_fixture_dates(season: int = 1) -> Dict[int, str]:
    base_year = 2026 + (season - 1)
    sat1 = datetime.date(base_year, 8, 15)
    dates = {}
    for w in range(1, 35):
        off = WEEK_DAY_OFFSETS[w - 1]
        if w <= 17:
            sat = sat1 + datetime.timedelta(days=7 * (w - 1))
        else:
            sat = sat1 + datetime.timedelta(days=7 * 16 + 28 + 7 * (w - 18))
        m_dt = sat + datetime.timedelta(days=off)
        dates[w] = m_dt.isoformat()
    return dates

def is_transfer_window_open(date_str: str, season: int = 1) -> bool:
    try:
        base_year = 2026 + (season - 1)
        d = datetime.date.fromisoformat(date_str)
        summer_start = datetime.date(base_year, 7, 1)
        summer_end = datetime.date(base_year, 9, 15)
        winter_start = datetime.date(base_year + 1, 1, 1)
        winter_end = datetime.date(base_year + 1, 2, 8)
        return (summer_start <= d <= summer_end) or (winter_start <= d <= winter_end)
    except Exception:
        return True

def get_transfer_window_details(date_str: str, season: int = 1) -> Dict[str, Any]:
    try:
        base_year = 2026 + (season - 1)
        d = datetime.date.fromisoformat(date_str)
        summer_start = datetime.date(base_year, 7, 1)
        summer_end = datetime.date(base_year, 9, 15)
        winter_start = datetime.date(base_year + 1, 1, 1)
        winter_end = datetime.date(base_year + 1, 2, 8)
        
        if summer_start <= d <= summer_end:
            days_left = (summer_end - d).days
            return {
                "is_open": True,
                "name": "Yaz Transfer Dönemi",
                "deadline": summer_end.isoformat(),
                "days_left": days_left,
                "desc": f"Son {days_left} gün (Kapanış: 15 Eylül)"
            }
        elif winter_start <= d <= winter_end:
            days_left = (winter_end - d).days
            return {
                "is_open": True,
                "name": "Kış Transfer Dönemi",
                "deadline": winter_end.isoformat(),
                "days_left": days_left,
                "desc": f"Son {days_left} gün (Kapanış: 8 Şubat)"
            }
        else:
            return {
                "is_open": False,
                "name": "Transfer Dönemi Kapalı",
                "deadline": None,
                "days_left": 0,
                "desc": "Transfer penceresi kapalıdır"
            }
    except Exception:
        return {"is_open": True, "name": "Yaz Transfer Dönemi", "deadline": None, "days_left": 0, "desc": ""}

# ==================== 34 HAFTALIK ÇİFT DEVRE FİKSTÜR ====================
def generate_fixtures(my_team_name: str, teams: List[Dict], season: int = 1):
    other_teams = [t for t in teams if t["name"] != my_team_name]
    random.shuffle(other_teams)
    fixtures = []
    dates = build_fixture_dates(season)
    
    # 1. Devre (17 Hafta: 1 - 17)
    for w in range(1, len(other_teams) + 1):
        opp = other_teams[w - 1]
        is_home = (w % 2 == 1)
        f_date = dates.get(w, "2026-08-15")
        try:
            f_dt = datetime.date.fromisoformat(f_date)
            f_day = TURKISH_DAYS[f_dt.weekday()]
            if (opp.get("is_big") or opp.get("opponent_is_big")) and f_day in ["Cuma", "Pazartesi"]:
                f_dt = f_dt + datetime.timedelta(days=1 if f_day == "Cuma" else -1)
                f_date = f_dt.isoformat()
                f_day = TURKISH_DAYS[f_dt.weekday()]
        except Exception:
            f_day = "Cumartesi"

        fixtures.append({
            "week": w,
            "round": 1,
            "opponent": opp["name"],
            "opponent_short": opp.get("short", "RAK"),
            "opponent_logo": opp.get("logo", ""),
            "opponent_pwr": opp["power"],
            "opponent_is_big": opp.get("is_big", False),
            "is_home": is_home,
            "date": f_date,
            "day_name": f_day,
            "played": False,
            "result": None,
            "my_score": None,
            "opp_score": None
        })

    # 2. Devre (17 Hafta: 18 - 34) - Ters Saha
    for w in range(1, len(other_teams) + 1):
        opp = other_teams[w - 1]
        is_home = not (w % 2 == 1) # 1. devrenin tam tersi
        week_num = len(other_teams) + w # 18 to 34
        f_date = dates.get(week_num, "2027-01-09")
        try:
            f_dt = datetime.date.fromisoformat(f_date)
            f_day = TURKISH_DAYS[f_dt.weekday()]
            if (opp.get("is_big") or opp.get("opponent_is_big")) and f_day in ["Cuma", "Pazartesi"]:
                f_dt = f_dt + datetime.timedelta(days=1 if f_day == "Cuma" else -1)
                f_date = f_dt.isoformat()
                f_day = TURKISH_DAYS[f_dt.weekday()]
        except Exception:
            f_day = "Cumartesi"

        fixtures.append({
            "week": week_num,
            "round": 2,
            "opponent": opp["name"],
            "opponent_short": opp.get("short", "RAK"),
            "opponent_logo": opp.get("logo", ""),
            "opponent_pwr": opp["power"],
            "opponent_is_big": opp.get("is_big", False),
            "is_home": is_home,
            "date": f_date,
            "day_name": f_day,
            "played": False,
            "result": None,
            "my_score": None,
            "opp_score": None
        })

    return fixtures

def generate_initial_standings(teams: List[Dict]):
    table = []
    for t in teams:
        table.append({
            "name": t["name"],
            "short": t["short"],
            "played": 0,
            "wins": 0,
            "draws": 0,
            "losses": 0,
            "gf": 0,
            "ga": 0,
            "gd": 0,
            "points": 0
        })
    return table

def simulate_other_league_matches(state: Dict[str, Any], current_opponent_name: str) -> List[Dict[str, Any]]:
    """
    Kullanıcının maçı dışındaki ligdeki kalan 16 takımı eşleştirip gerçekçi sonuçlar üretir ve puan tablosunu günceller.
    """
    my_club = state.get("club_name", "")
    all_teams = [t for t in TEAMS_DB if t["name"] != my_club and t["name"] != current_opponent_name]
    
    # Haftaya göre deterministik karıştır
    rng = random.Random(state.get("season", 1) * 1000 + state.get("week", 1))
    rng.shuffle(all_teams)

    other_match_results = []
    standings_map = {s["name"]: s for s in state.get("standings", [])}

    for i in range(0, len(all_teams) - 1, 2):
        home = all_teams[i]
        away = all_teams[i + 1]
        
        home_pwr = home.get("power", 75) + 3 # Ev sahibi avantajı
        away_pwr = away.get("power", 75)
        diff = home_pwr - away_pwr

        # Gol olasılıkları
        home_goals = max(0, min(6, int(random.gauss(1.4 + (diff * 0.05), 1.0))))
        away_goals = max(0, min(6, int(random.gauss(1.1 - (diff * 0.04), 0.9))))

        # Puan tablosunu güncelle
        h_st = standings_map.get(home["name"])
        a_st = standings_map.get(away["name"])

        if h_st and a_st:
            h_st["played"] += 1
            a_st["played"] += 1
            h_st["gf"] += home_goals
            h_st["ga"] += away_goals
            a_st["gf"] += away_goals
            a_st["ga"] += home_goals
            h_st["gd"] = h_st["gf"] - h_st["ga"]
            a_st["gd"] = a_st["gf"] - a_st["ga"]

            if home_goals > away_goals:
                h_st["wins"] += 1
                h_st["points"] += 3
                a_st["losses"] += 1
            elif home_goals == away_goals:
                h_st["draws"] += 1
                h_st["points"] += 1
                a_st["draws"] += 1
                a_st["points"] += 1
            else:
                a_st["wins"] += 1
                a_st["points"] += 3
                h_st["losses"] += 1

        other_match_results.append({
            "home": home["name"],
            "away": away["name"],
            "home_score": home_goals,
            "away_score": away_goals
        })

    return other_match_results

def get_league_squads(state: Dict[str, Any]) -> Dict[str, List[Dict[str, Any]]]:
    """
    Ligdeki tüm takımların canlı ve dinamik kadrolarını döndürür.
    Transferler ve satışlar doğrudan bu kadrolara yansır.
    """
    if "league_squads" not in state or not isinstance(state["league_squads"], dict):
        state["league_squads"] = {}
    ls = state["league_squads"]
    for t in TEAMS_DB:
        tid = t["id"]
        if tid not in ls or not ls[tid]:
            ls[tid] = [enrich_player(dict(p)) for p in t.get("squad", [])]
        else:
            ls[tid] = [enrich_player(p) for p in ls[tid]]
    return ls

def get_team_squad(state: Dict[str, Any], team_id: str) -> List[Dict[str, Any]]:
    ls = get_league_squads(state)
    return ls.get(team_id, [])

def generate_squad_incoming_bid(state: Dict[str, Any], buyer: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
    """
    Kullanıcının kadrosundaki oyunculara dış kulüplerden veya Süper Lig rakiplerinden
    Kiralık (özellikle 25 yaş altı gençlere) veya Bonservis transfer teklifi üretir.
    """
    squad = state.get("squad", [])
    if not squad:
        return None

    # Alıcı kulüp belirle
    my_club = state.get("club_name", "")
    if buyer:
        buyer_name = buyer["name"]
        buyer_id = buyer.get("id")
        buyer_logo = buyer.get("logo", "")
    else:
        candidates = [
            {"club": "Sakaryaspor", "id": None, "logo": ""},
            {"club": "Gençlerbirliği", "id": None, "logo": ""},
            {"club": "Kocaelispor", "id": None, "logo": ""},
            {"club": "Göztepe", "id": "goztepe", "logo": ""},
            {"club": "Kasımpaşa", "id": "kasimpasa", "logo": ""},
            {"club": "Eyüpspor", "id": "eyupspor", "logo": ""},
            {"club": "Çaykur Rizespor", "id": "rizespor", "logo": ""},
            {"club": "Antalyaspor", "id": "antalyaspor", "logo": ""},
            {"club": "Sivasspor", "id": "sivasspor", "logo": ""},
            {"club": "Bodrum FK", "id": "bodrum", "logo": ""},
            {"club": "Westerlo", "id": None, "logo": ""},
            {"club": "Hull City", "id": None, "logo": ""},
            {"club": "Rio Ave", "id": None, "logo": ""},
            {"club": "Lille", "id": None, "logo": ""}
        ]
        for rt in [t for t in TEAMS_DB if t["name"] != my_club and t.get("is_big")]:
            candidates.append({"club": rt["name"], "id": rt["id"], "logo": rt.get("logo", "")})
        chosen = random.choice(candidates)
        buyer_name = chosen["club"]
        buyer_id = chosen["id"]
        buyer_logo = chosen["logo"]

    # 25 yaş ve altı veya yedek oyunculara öncelik (%70 şansla)
    young_or_bench = [p for p in squad if p.get("age", 25) <= 25 or p["name"] not in [x["name"] for x in squad[:11]]]
    if young_or_bench and random.random() < 0.70:
        target_p = random.choice(young_or_bench)
    else:
        target_p = random.choice(squad)

    p_age = target_p.get("age", 24)
    p_val = target_p.get("val", 25_000_000)

    # 25 yaş altına %75 ihtimalle KİRALIK, diğer oyunculara %45 ihtimalle KİRALIK
    is_loan = (p_age <= 25 and random.random() < 0.75) or (random.random() < 0.45)

    if is_loan:
        loan_fee = max(1_500_000, int(p_val * random.uniform(0.08, 0.18)))
        wage_pct = random.choice([60, 75, 100])
        buy_opt = int(p_val * random.uniform(1.15, 1.45)) if random.random() < 0.50 else None
        bid = {
            "id": f"bid_{random.randint(1000, 9999)}",
            "bid_type": "loan",
            "club": buyer_name,
            "target_team_id": buyer_id,
            "club_logo": buyer_logo,
            "player_name": target_p["name"],
            "pos": target_p["pos"],
            "age": p_age,
            "overall": target_p.get("overall", 72),
            "loan_fee": loan_fee,
            "offer_val": loan_fee,
            "wage_coverage_pct": wage_pct,
            "buy_option": buy_opt,
            "duration_weeks": 15
        }
        opt_str = f", {format_money_val(buy_opt)} opsiyonla" if buy_opt else ""
        ev_msg = f"💼 KİRALIK TEKLİFİ: {buyer_name}, {target_p['name']} ({target_p['pos']}, {p_age} yaş) için {format_money_val(loan_fee)} kiralama ücreti ve %{wage_pct} maaş karşılama{opt_str} teklif etti!"
    else:
        offer_val = int(p_val * random.uniform(1.05, 1.45))
        bid = {
            "id": f"bid_{random.randint(1000, 9999)}",
            "bid_type": "transfer",
            "club": buyer_name,
            "target_team_id": buyer_id,
            "club_logo": buyer_logo,
            "player_name": target_p["name"],
            "pos": target_p["pos"],
            "age": p_age,
            "overall": target_p.get("overall", 75),
            "offer_val": offer_val,
            "loan_fee": 0
        }
        ev_msg = f"💼 BONSERVİS TEKLİFİ: {buyer_name}, {target_p['name']} ({target_p['pos']}) için {format_money_val(offer_val)} bonservis teklif etti!"

    state.setdefault("incoming_bids", []).append(bid)
    state["incoming_bids"] = state["incoming_bids"][-4:]
    state["news"].insert(0, ev_msg)
    return bid

def simulate_cpu_transfers(state: Dict[str, Any], count: int = 1) -> List[str]:
    """
    Ligdeki diğer takımların kendi aralarında, Avrupa pazarından veya serbestlerden transfer yapmasını sağlar.
    Ayrıca kullanıcı kadrosundaki yıldızlara da teklif getirebilir.
    Canlı olarak state['league_squads'] güncellenir.
    """
    if not state.get("transfer_window_open", False):
        return []

    league_squads = get_league_squads(state)
    my_club = state.get("club_name", "")
    
    cpu_teams = [t for t in TEAMS_DB if t["name"] != my_club]
    if not cpu_teams:
        return []

    transfer_events = []
    
    # Avrupa pazarındaki müsait oyuncular
    avail_euro = []
    for c_name, c_players in EUROPEAN_CLUBS_MARKET.items():
        for ep in c_players:
            # Kullanıcının veya diğer Süper Lig takımlarının kadrosunda değilse
            in_squad = any(
                p.get("name", "").lower() == ep.get("name", "").lower() 
                for sq in league_squads.values() for p in sq
            ) or any(p.get("name", "").lower() == ep.get("name", "").lower() for p in state.get("squad", []))
            if not in_squad:
                avail_euro.append((c_name, ep))

    # Serbest pazarındaki müsait oyuncular
    avail_free = []
    for fp in FREE_AGENTS:
        in_squad = any(
            p.get("name", "").lower() == fp.get("name", "").lower() 
            for sq in league_squads.values() for p in sq
        ) or any(p.get("name", "").lower() == fp.get("name", "").lower() for p in state.get("squad", []))
        if not in_squad:
            avail_free.append(fp)

    # Yerli yıldızlar pazarındaki müsait oyuncular
    avail_turkish = []
    for tp in TURKISH_STARS:
        in_squad = any(
            p.get("name", "").lower() == tp.get("name", "").lower() 
            for sq in league_squads.values() for p in sq
        ) or any(p.get("name", "").lower() == tp.get("name", "").lower() for p in state.get("squad", []))
        if not in_squad:
            avail_turkish.append(tp)

    for _ in range(count):
        # Alıcı kulübü seç (Büyük kulüplerin şansı daha yüksek)
        weights = [4 if t.get("is_big") else 1 for t in cpu_teams]
        buyer = random.choices(cpu_teams, weights=weights, k=1)[0]
        buyer_id = buyer["id"]
        buyer_squad = league_squads.setdefault(buyer_id, [enrich_player(dict(p)) for p in buyer.get("squad", [])])

        roll = random.random()

        # 1) %30 İhtimalle BİZİM OYUNCUMUZA TEKLİF GETİR (Kiralık veya Bonservis)!
        if roll < 0.30 and state.get("squad"):
            bid = generate_squad_incoming_bid(state, buyer)
            if bid:
                transfer_events.append(f"💼 {bid['club']}, {bid['player_name']} için resmi teklif yaptı!")

        # 2) %15 İhtimalle AVRUPA'DAKİ YERLİ YILDIZLARIMIZDAN TRANSFER YAP
        elif roll < 0.45 and avail_turkish:
            chosen_p = random.choice(avail_turkish)
            avail_turkish.remove(chosen_p)
            new_p = enrich_player({
                "name": chosen_p["name"],
                "pos": chosen_p["pos"],
                "age": chosen_p["age"],
                "overall": chosen_p.get("real_pot", 83),
                "wage": chosen_p.get("salary", 15_000_000),
                "val": chosen_p.get("price", 30_000_000),
                "contract_years": 3,
                "morale": 90,
                "is_foreign": False
            })
            buyer_squad.append(new_p)
            ev_msg = f"🇹🇷 MİLLİ BOMBA: {buyer['name']}, {chosen_p.get('current_club', 'Avrupa')}'dan milli gururumuz {chosen_p['name']} ({chosen_p['pos']}, Reyting: {new_p['overall']}) transferini bitirdi!"
            state["news"].insert(0, ev_msg)
            transfer_events.append(ev_msg)

        # 3) %30 İhtimalle AVRUPA KULÜPLERİNDEN TRANSFER YAP
        elif roll < 0.70 and avail_euro:
            c_name, chosen_p = random.choice(avail_euro)
            avail_euro.remove((c_name, chosen_p))
            
            new_p = enrich_player({
                "name": chosen_p["name"],
                "pos": chosen_p["pos"],
                "age": chosen_p["age"],
                "overall": chosen_p["overall"],
                "wage": chosen_p.get("wage", 10_000_000),
                "val": chosen_p.get("val", 30_000_000),
                "contract_years": 3,
                "morale": 90
            })
            buyer_squad.append(new_p)
            fee = chosen_p.get("val", 30_000_000)
            ev_msg = f"💣 AVRUPA BOMBASI: {buyer['name']}, {c_name}'dan {chosen_p['name']} ({chosen_p['pos']}, Reyting: {chosen_p['overall']}) transferini {format_money_val(fee)} bedelle bitirdi!"
            state["news"].insert(0, ev_msg)
            transfer_events.append(ev_msg)

        # 3) %25 İhtimalle SERBESTLERDEN TRANSFER YAP
        elif roll < 0.90 and avail_free:
            chosen_p = random.choice(avail_free)
            avail_free.remove(chosen_p)
            
            new_p = enrich_player({
                "name": chosen_p["name"],
                "pos": chosen_p["pos"],
                "age": chosen_p["age"],
                "overall": chosen_p.get("real_pot", 80),
                "wage": chosen_p.get("salary", 15_000_000),
                "val": 25_000_000,
                "contract_years": 2,
                "morale": 90
            })
            buyer_squad.append(new_p)
            ev_msg = f"⚡ RESMİ İMZA: {buyer['name']}, serbest statüdeki yıldız {chosen_p['name']} ({chosen_p['pos']}) ile sözleşme imzaladı!"
            state["news"].insert(0, ev_msg)
            transfer_events.append(ev_msg)

        # 4) %10 İhtimalle DİĞER BİR SÜPER LİG TAKIMINDAN OYUNCU AL (Lig İçi Transfer)
        else:
            other_cpus = [t for t in cpu_teams if t["id"] != buyer_id]
            if other_cpus:
                seller = random.choice(other_cpus)
                seller_squad = league_squads.setdefault(seller["id"], [enrich_player(dict(p)) for p in seller.get("squad", [])])
                outfield = [p for p in seller_squad if not is_gk(p) and p.get("overall", 75) >= 76]
                if outfield and len(seller_squad) > 14:
                    traded_p = random.choice(outfield)
                    seller_squad.remove(traded_p)
                    buyer_squad.append(traded_p)
                    fee = int(traded_p.get("val", 20_000_000) * 1.1)
                    ev_msg = f"🔄 SÜPER LİG İÇİ TRANSFER: {buyer['name']}, {seller['name']}'dan {traded_p['name']} ({traded_p['pos']}, {traded_p['overall']}) transferini {format_money_val(fee)} bedelle tamamladı!"
                    state["news"].insert(0, ev_msg)
                    transfer_events.append(ev_msg)

    return transfer_events

def default_career_state(chosen_team_id: str = "trabzonspor", president_name: str = "Ömer Başkan", is_started: bool = True):
    team = next((t for t in TEAMS_DB if t["id"] == chosen_team_id), TEAMS_DB[0])
    fixtures = generate_fixtures(team["name"], TEAMS_DB)
    standings = generate_initial_standings(TEAMS_DB)
    
    # Kadroyu radar yetenekleriyle zenginleştir ve FIFA mevkilerine göre diz
    enriched_squad = [enrich_player(dict(p)) for p in team["squad"]]
    balanced_squad = rebalance_and_validate_squad(enriched_squad, team["name"])

    return {
        "is_started": is_started,
        "team_id": team["id"],
        "club_name": team["name"],
        "club_short": team["short"],
        "president_name": president_name,
        "city": team["city"],
        "logo": team.get("logo", ""),
        "is_big": team.get("is_big", False),
        "season": 1,
        "week": 1,
        "current_date": "2026-08-10",
        "max_weeks": 34, # 18 takım çift devreli lig = 34 hafta
        "season_finished": False,
        "season_result": None,
        "election_pending": False,
        "election_result": None,
        "team_power": team["power"],
        "budget": team["budget"],
        "debt": 500_000_000, # Eski başkan 500M ₺ borç takıp kaçtı!
        "story": {
            "previous_debt": 500_000_000,
            "debt_paid": 0,
            "story_title": "500M ₺ Ağır Miras"
        },
        "fan_trust": team["fan_base"],
        "board_trust": 78,
        "political_power": 55, # Siyaset nüfuzu %0 - %100
        "media_trust": 70, # Basınla İlişkiler %0 - %100
        "stadium_capacity": team["stadium_cap"],
        "stadium_level": 1,
        "coach": {
            **team["coach"],
            "photo": team["coach"].get("photo", "/static/coach_thomas_reis.png"),
            "moral": 82,
            "trust": 78,
            "mistakes_count": 0,
            "praised_count": 0,
            "tactical_vision": "Yüksek Tempolu Hücum & Alan Daraltma"
        },
        "scout": CLUB_SCOUTS_DB.get(team["id"], SCOUT_CANDIDATES[0]),
        "squad": balanced_squad,
        "fixtures": fixtures,
        "standings": standings,
        "captain_name": get_captain_name(balanced_squad),
        "squad_harmony": 82, # Takım içi huzur
        "transfer_day": 1,
        "transfer_max_days": 7,
        "transfer_window_open": True,
        "exchange_rate": 38.5,
        "secretary_agenda": "Başkanım, bugün kulüp binasındasınız. TFF ve basın raporları masanızda hazır bekliyor.",
        "secretary_inbox": [],
        "pending_secretary_event": None,
        "tapped_up_players": {},
        "incoming_bids": [],
        "coach_recommendations": [],
        "finances": {
            "last_ticket_income": 0,
            "last_store_income": 0,
            "last_tv_income": 0,
            "last_wage_expense": 0,
            "active_sponsors": [
                {"type": "chest", "name": "Turkish Airlines", "income_season": 50_000_000}
            ]
        },
        "real_estate": {
            "land_acres": 250,
            "active_project": None,
            "completed": []
        },
        "underground": {
            "active_deal": None,
            "under_investigation": False,
            "caught_count": 0
        },
        "club_upgrades": {
            "stadium": 1,
            "transit": 1,
            "merch": 1,
            "academy": 1,
            "broadcast": 1
        },
        "last_daily_claim": 0,
        "stadium_concert_active": False,
        "last_pro_statement_week": -99,
        "coach_dialog_pending": False,
        "last_match": None,
        "news": [
            f"🏆 {team['name']} Genel Kurulu tamamlandı! Sayın Başkan görevine başladı.",
            "📅 34 Haftalık Süper Lig maratonu start aldı. Hedef Şampiyonluk!"
        ]
    }

def get_state(session_id: Optional[str] = None):
    sid = sanitize_session_id(session_id or current_session_cv.get())
    path = get_save_path(sid)
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                state = json.load(f)
                valid_ids = [t["id"] for t in TEAMS_DB]
                if state.get("team_id") in valid_ids and "is_started" in state:
                    if "squad" in state:
                        # Yinelenen klon oyuncuları temizle (Pogba vs. çoklu alım hatasını çözer)
                        seen_p_names = set()
                        deduped_squad = []
                        for p in state["squad"]:
                            pn = p.get("name", "").strip().lower()
                            if pn and pn not in seen_p_names:
                                seen_p_names.add(pn)
                                deduped_squad.append(p)
                        state["squad"] = deduped_squad

                        if state.get("team_id") == "trabzonspor" and not any(p.get("name") == "Ozan Tufan" for p in state.get("squad", [])):
                            state["squad"].append(enrich_player({
                                "name": "Ozan Tufan", "pos": "MERKEZ OS", "age": 31, "overall": 81, "wage": 5280000, "val": 24000000, "is_foreign": False
                            }))
                        state["squad"] = [enrich_player(p) for p in state["squad"]]
                        state["squad"] = rebalance_and_validate_squad(state["squad"])
                        state["team_power"] = round(sum(p["overall"] for p in state["squad"][:11]) / 11)
                        state["my_radar"] = calculate_team_radar(state["squad"])
                    if "league_squads" in state and "trabzonspor" in state["league_squads"]:
                        if not any(p.get("name") == "Ozan Tufan" for p in state["league_squads"]["trabzonspor"]):
                            state["league_squads"]["trabzonspor"].append(enrich_player({
                                "name": "Ozan Tufan", "pos": "MERKEZ OS", "age": 31, "overall": 81, "wage": 5280000, "val": 24000000, "is_foreign": False
                            }))

                    if "max_weeks" not in state or state["max_weeks"] < 34:
                        state["max_weeks"] = 34
                    if "political_power" not in state:
                        state["political_power"] = 55
                    if "media_trust" not in state:
                        state["media_trust"] = 70
                    # Kaptan kadroda yoksa (satıldıysa) otomatik yeni kaptan belirle
                    if "captain_name" not in state or not any(p["name"] == state.get("captain_name") for p in state.get("squad", [])):
                        state["captain_name"] = get_captain_name(state.get("squad", []))
                    if "club_upgrades" not in state:
                        state["club_upgrades"] = {"stadium": 1, "transit": 1, "merch": 1, "academy": 1, "broadcast": 1}
                    if "last_daily_claim" not in state:
                        state["last_daily_claim"] = 0
                    if "stadium_concert_active" not in state:
                        state["stadium_concert_active"] = False
                    if "last_pro_statement_week" not in state:
                        state["last_pro_statement_week"] = -99
                    if "incoming_bids" not in state:
                        state["incoming_bids"] = []
                    if "exchange_rate" not in state:
                        state["exchange_rate"] = 38.5
                    if "secretary_agenda" not in state:
                        state["secretary_agenda"] = "Başkanım, bugün kulüp binasındasınız. TFF ve basın raporları masanızda hazır bekliyor."
                    if "secretary_inbox" not in state:
                        state["secretary_inbox"] = []
                    if "pending_secretary_event" not in state:
                        state["pending_secretary_event"] = None
                    if "tapped_up_players" not in state:
                        state["tapped_up_players"] = {}
                    if "club_scout" not in state or not state["club_scout"]:
                        state["club_scout"] = CLUB_SCOUTS_DB.get(state.get("team_id"), {"name": "Cemil Kaya", "rating": 74, "salary": 2_000_000, "role": "Scout Şefi", "region": "Türkiye"})
                    # Hoca özellikleri (traits) ve görseli (photo) tamamla
                    if not state.get("coach_vacant", False):
                        coach = state.get("coach")
                        if not coach:
                            team_info = next((t for t in TEAMS_DB if t["id"] == state.get("team_id")), None)
                            if team_info and team_info.get("coach"):
                                state["coach"] = dict(team_info["coach"])
                                coach = state["coach"]
                            if not coach.get("photo"):
                                coach["photo"] = (team_info.get("coach", {}).get("photo") if team_info else None) or "/static/coach_senol_gunes.png"
                            if coach.get("name") == "Şenol Güneş":
                                if not coach.get("philosophy") or any(t.get("icon") in ["⚡", "🎯"] for t in coach.get("traits", [])):
                                    coach["style"] = "4-3-3 Karadeniz Fırtınası & Ofansif Pres"
                                    coach["philosophy"] = "Kanat akınları, dikine cesur hücum ve genç yıldızları parlatma ustalığı. Kaleci geçmişinden gelen saha görüşüyle savunma direncini korur."
                                    coach["background"] = "Trabzonspor'da 1.112 dakikalık tarihi gol yememe rekoru sahibi efsane kaleci ve Dünya 3.sü Milli Takım teknik direktörü."
                                    coach["defense"] = max(83, coach.get("defense", 80))
                                    coach["traits"] = [
                                        {"name": "Efsane Kaleci Mirası", "icon": "shield", "desc": "Trabzonspor kalesinde 1.112 dakikalık tarihi gol yememe rekoru. Takım savunmasına ve direncine +5 ekler."},
                                        {"name": "Ofansif Cesaret & Oyuncu Geliştirici", "icon": "zap", "desc": "Kanat organizasyonları ve genç yetenekleri parlatıp hücum temposunu zirveye taşır."}
                                    ]
                    if "loaned_players" not in state:
                        state["loaned_players"] = []
                    if "tactical_skills" not in state:
                        state["tactical_skills"] = {"unlocked": [], "mastery_points": 3}
                    if not state.get("incoming_sponsor_offers"):
                        state["incoming_sponsor_offers"] = generate_incoming_sponsor_offers(state, 3)
                    if "bank_consortium" not in state:
                        state["bank_consortium"] = {
                            "total_debt": state.get("debt", 500_000_000),
                            "weekly_installment": 6_500_000,
                            "unpaid_weeks": 0,
                            "sanction_level": 0
                        }
                    # Sıkışan veya tamamlanan gayrimenkul projelerini otomatik çöz
                    re_data = state.setdefault("real_estate", {"land_acres": 250, "active_project": None, "completed": []})
                    if re_data.get("active_project") and re_data["active_project"].get("weeks_left", 1) <= 0:
                        proj = re_data["active_project"]
                        p_type = proj.get("type")
                        p_name = proj.get("name")
                        if p_type == "mall":
                            state["budget"] += 150_000_000
                        elif p_type == "academy":
                            for p in state.get("squad", []):
                                if "Altyapı" in p.get("name", "") or p.get("age", 25) <= 22:
                                    p["overall"] = min(96, p.get("overall", 75) + 3)
                            state["team_power"] = round(sum(p["overall"] for p in state["squad"][:11]) / 11)
                        elif p_type == "stadium":
                            state["stadium_capacity"] = state.get("stadium_capacity", 25000) + 20000
                            state["fan_trust"] = min(100, state.get("fan_trust", 50) + 15)
                    # Takvim & Tarih Sistemi Entegrasyonu
                    season = state.get("season", 1)
                    fixture_dates = build_fixture_dates(season)
                    if "fixtures" in state:
                        for f in state["fixtures"]:
                            f_week = f.get("week", 1)
                            # Henüz oynanmamış maçları gerçekçi gün ve tarihlerle güncelle
                            if not f.get("played"):
                                if f_week in fixture_dates:
                                    f_date = fixture_dates[f_week]
                                    try:
                                        f_dt = datetime.date.fromisoformat(f_date)
                                        f_day = TURKISH_DAYS[f_dt.weekday()]
                                        if (f.get("opponent_is_big") or f.get("is_big")) and f_day in ["Cuma", "Pazartesi"]:
                                            f_dt = f_dt + datetime.timedelta(days=1 if f_day == "Cuma" else -1)
                                            f_date = f_dt.isoformat()
                                            f_day = TURKISH_DAYS[f_dt.weekday()]
                                        f["date"] = f_date
                                        f["day_name"] = f_day
                                    except Exception:
                                        f["date"] = f_date
                                        f["day_name"] = "Cumartesi"
                            elif not f.get("day_name") and f.get("date"):
                                try:
                                    f_dt = datetime.date.fromisoformat(f["date"])
                                    f["day_name"] = TURKISH_DAYS[f_dt.weekday()]
                                except Exception:
                                    f["day_name"] = "Cumartesi"
                            if not f.get("opponent_logo"):
                                opp_t = next((t for t in TEAMS_DB if t["name"] == f.get("opponent")), None)
                                if opp_t:
                                    f["opponent_logo"] = opp_t.get("logo", "")

                    if "current_date" not in state or not state["current_date"]:
                        cur_week = state.get("week", 1)
                        if cur_week in fixture_dates:
                            w_dt = datetime.date.fromisoformat(fixture_dates[cur_week])
                            state["current_date"] = (w_dt - datetime.timedelta(days=5)).isoformat()
                        else:
                            state["current_date"] = "2026-08-10"

                    tw_details = get_transfer_window_details(state["current_date"], season)
                    state["transfer_window_open"] = tw_details["is_open"]
                    state["transfer_window"] = tw_details
                    state["transfer_day"] = tw_details.get("days_left", 1)
                    return state
        except Exception:
            pass

    # Kayıt dosyası yoksa veya bozuksa: temiz, henüz başlamamış kariyer döndür
    state = default_career_state("trabzonspor", is_started=False)
    return state

def save_state(state, session_id: Optional[str] = None):
    sid = sanitize_session_id(session_id or current_session_cv.get())
    path = get_save_path(sid)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)

# ==================== KULÜP LİSTESİ VE KADROLARI ====================
@app.get("/api/teams")
def api_get_teams():
    return [
        {
            "id": t["id"],
            "name": t["name"],
            "short": t["short"],
            "city": t["city"],
            "power": t["power"],
            "budget": t["budget"],
            "stadium_cap": t["stadium_cap"],
            "fan_base": t["fan_base"],
            "target": t["target"],
            "is_big": t.get("is_big", False),
            "logo": t.get("logo", ""),
            "coach_name": t["coach"]["name"],
            "coach_photo": t["coach"].get("photo", ""),
            "coach_style": t["coach"].get("style", "")
        }
        for t in TEAMS_DB
    ]

@app.get("/api/teams/all-squads")
def api_get_all_squads():
    # 18 takımın canlı ve dinamik kadroları (Maaş, değer, sözleşme yılı, radar)
    state = get_state()
    result = []
    for t in TEAMS_DB:
        if t["name"] == state.get("club_name"):
            enriched = [enrich_player(dict(p)) for p in state.get("squad", [])]
        else:
            team_squad = get_team_squad(state, t["id"])
            enriched = [enrich_player(dict(p)) for p in team_squad]
        radar = calculate_team_radar(enriched)
        result.append({
            "id": t["id"],
            "name": t["name"],
            "short": t["short"],
            "logo": t.get("logo", ""),
            "power": t["power"],
            "coach": t["coach"]["name"],
            "budget": t["budget"],
            "radar": radar,
            "squad": enriched
        })
    return result

class SquadSwapRequest(BaseModel):
    index1: int
    index2: int

@app.post("/api/squad/swap")
def api_squad_swap(req: SquadSwapRequest):
    state = get_state()
    squad = state.get("squad", [])
    if 0 <= req.index1 < len(squad) and 0 <= req.index2 < len(squad):
        temp_squad = list(squad)
        temp_squad[req.index1], temp_squad[req.index2] = temp_squad[req.index2], temp_squad[req.index1]

        prev_starters_gks = sum(1 for p in squad[:11] if is_gk(p))
        starters_gks = sum(1 for p in temp_squad[:11] if is_gk(p))

        # Eğer eski kadroda zaten 2 kaleci varsa ve bu hamle kaleci sayısını azaltıyorsa izin ver!
        if starters_gks > 1 and starters_gks >= prev_starters_gks:
            raise HTTPException(status_code=400, detail="İlk 11'de birden fazla kaleci bulunamaz! Kaleci yalnızca yedek kaleciyle veya yedek kulübesine çekilerek değiştirilebilir.")
        if starters_gks == 0:
            raise HTTPException(status_code=400, detail="İlk 11'de mutlaka 1 kaleci yer almalıdır! Kaleciyi saha içi oyuncusuyla değiştiremezsiniz.")

        squad[:] = temp_squad
        state["squad"] = squad
        state["my_radar"] = calculate_team_radar(squad)
        state["team_power"] = round(sum(p["overall"] for p in squad[:11]) / 11)
        save_state(state)
        return {"status": "ok", "state": state}
    raise HTTPException(status_code=400, detail="Geçersiz oyuncu sıralaması!")

@app.post("/api/squad/auto-pick")
def api_squad_auto_pick():
    state = get_state()
    squad = list(state.get("squad", []))
    if not squad:
        raise HTTPException(status_code=400, detail="Kadro bulunamadı!")

    # Önce tüm oyuncuları enrich et: eski Türkçe pos formatlarını FIFA'ya çevir
    squad = [enrich_player(dict(p)) for p in squad]
    new_squad = rebalance_and_validate_squad(squad, state.get("club_name", ""), force_auto_pick=True)
    state["squad"] = new_squad
    state["team_power"] = round(sum(p["overall"] for p in new_squad[:11]) / 11)
    state["my_radar"] = calculate_team_radar(new_squad)
    save_state(state)
    return {"status": "ok", "message": "Teknik Direktör ideal ilk 11'i ve yedekleri başarıyla belirledi!", "state": state}

class StartGameRequest(BaseModel):
    team_id: str
    president_name: Optional[str] = "Ömer Başkan"

@app.post("/api/start-game")
def api_start_game(req: StartGameRequest):
    pres_name = (req.president_name or "").strip() or "Ömer Başkan"
    state = default_career_state(req.team_id, president_name=pres_name, is_started=True)
    save_state(state)
    return state

@app.get("/api/account/check")
def api_account_check(username: str):
    user = (username or "").strip()
    if not user:
        raise HTTPException(status_code=400, detail="Kullanıcı adı boş olamaz.")
    slug = normalize_name_to_slug(user)
    sid = f"user_{slug}"
    path = get_save_path(sid)
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                state = json.load(f)
                if state.get("is_started"):
                    return {
                        "exists": True,
                        "session_id": sid,
                        "username": user,
                        "president_name": state.get("president_name", user),
                        "club_name": state.get("club_name"),
                        "season": state.get("season", 1),
                        "week": state.get("week", 1),
                        "budget": state.get("budget", 0),
                        "logo": state.get("logo", "")
                    }
        except Exception:
            pass
    return {"exists": False, "session_id": sid, "username": user}

@app.post("/api/resign")
def api_resign():
    state = get_state()
    state["is_started"] = False
    state["news"].insert(0, f"⚡ FLAŞ: Başkan {state['president_name']}, {state['club_name']} kulübünden istifa etti!")
    save_state(state)
    return {"message": "İstifanız kabul edildi.", "state": state}

@app.get("/api/state")
def api_get_state():
    state = get_state()

    # Eski Türkçe pos formatlarını (SOL BEK, SANTRAFOR vb.) FIFA'ya normalize et
    squad = state.get("squad", [])
    if squad and any(len(p.get("pos", "")) > 3 for p in squad):
        state["squad"] = [enrich_player(dict(p)) for p in squad]
        save_state(state)

    # Radar istatistiklerini hesapla
    my_radar = calculate_team_radar(state["squad"])
    state["my_radar"] = my_radar

    # Sıradaki rakibin radar istatistikleri
    cur_fix = next((f for f in state["fixtures"] if f["week"] == state["week"]), None)
    if cur_fix:
        opp_team = next((t for t in TEAMS_DB if t["name"] == cur_fix["opponent"]), None)
        if opp_team:
            opp_enriched = [enrich_player(dict(p)) for p in opp_team["squad"]]
            state["opp_radar"] = calculate_team_radar(opp_enriched)
        else:
            state["opp_radar"] = {"pac": 75, "sho": 75, "pas": 75, "dri": 75, "def": 75, "phy": 75}
    else:
        state["opp_radar"] = {"pac": 75, "sho": 75, "pas": 75, "dri": 75, "def": 75, "phy": 75}

    return state

class SaveSyncRequest(BaseModel):
    state: Dict[str, Any]

@app.post("/api/save/sync")
def api_save_sync(req: SaveSyncRequest):
    sid = sanitize_session_id(current_session_cv.get())
    client_state = req.state
    if not isinstance(client_state, dict):
        raise HTTPException(status_code=400, detail="Geçersiz state formatı.")
    
    valid_ids = [t["id"] for t in TEAMS_DB]
    team_id = client_state.get("team_id")
    if team_id not in valid_ids or not client_state.get("is_started"):
        raise HTTPException(status_code=400, detail="Geçersiz veya başlamamış kariyer.")
    
    # Kadroyu ve radar verilerini doğrula ve zenginleştir
    if "squad" in client_state:
        client_state["squad"] = [enrich_player(p) for p in client_state["squad"]]
        client_state["squad"] = rebalance_and_validate_squad(client_state["squad"])
        client_state["team_power"] = round(sum(p["overall"] for p in client_state["squad"][:11]) / 11)
        client_state["my_radar"] = calculate_team_radar(client_state["squad"])
    
    save_state(client_state, sid)
    return client_state

@app.post("/api/save/reset-all")
def api_save_reset_all():
    sid = sanitize_session_id(current_session_cv.get())
    # 1. saves/ klasöründeki tüm .json kayıtlarını temizle
    try:
        if os.path.exists(SAVES_DIR):
            for fname in os.listdir(SAVES_DIR):
                if fname.endswith(".json"):
                    try:
                        os.remove(os.path.join(SAVES_DIR, fname))
                    except Exception:
                        pass
    except Exception:
        pass

    # 2. Varsa kök dizindeki savegame.json dosyasını da temizle
    try:
        if os.path.exists(SAVE_FILE):
            os.remove(SAVE_FILE)
    except Exception:
        pass

    # 3. Temiz, başlamamış sıfır durum döndür
    state = default_career_state("trabzonspor", is_started=False)
    save_state(state, sid)
    return {"status": "ok", "message": "Tüm kayıtlar başarıyla sıfırlandı.", "state": state}

@app.post("/api/reset")
def api_reset():
    sid = sanitize_session_id(current_session_cv.get())
    path = get_save_path(sid)
    if os.path.exists(path):
        try:
            os.remove(path)
        except Exception:
            pass
    state = default_career_state("trabzonspor", is_started=False)
    save_state(state, sid)
    return state

# ==================== İKİ DEVRELİ MAÇ SİMÜLASYONU & SOYUNMA ODASI ====================
# Geçici maç hafızası (1. yarı ile 2. yarı arası köprü)
ACTIVE_MATCH_CACHE: Dict[str, Any] = {}

class Half1Request(BaseModel):
    press_boost: Optional[str] = None # 'derby_bonus', 'threaten_ref', 'provoke', 'calm'

@app.post("/api/match/half1")
def api_match_half1(req: Half1Request):
    state = get_state()
    # Kadro Sağlamlık ve Asgari Oyuncu Kontrolü (3 kişiyle maça çıkmayı engeller)
    if len(state.get("squad", [])) < 11 or sum(1 for p in state.get("squad", [])[:11] if is_gk(p)) != 1:
        state["squad"] = rebalance_and_validate_squad(state.get("squad", []), state.get("club_name", ""))
        state["team_power"] = round(sum(p["overall"] for p in state["squad"][:11]) / 11)
        state["my_radar"] = calculate_team_radar(state["squad"])
        save_state(state)

    current_week = state["week"]
    if current_week > state["max_weeks"]:
        state["season_finished"] = True
        state["election_pending"] = True
        save_state(state)
        raise HTTPException(status_code=400, detail="Lig maçları bitti! Kongreye geçin.")

    cur_fixture = next((f for f in state["fixtures"] if f["week"] == current_week), None)
    if not cur_fixture:
        raise HTTPException(status_code=400, detail="Fikstür bulunamadı!")

    opponent_name = cur_fixture["opponent"]
    is_home = cur_fixture["is_home"]
    opp_is_big = cur_fixture.get("opponent_is_big", False)
    my_is_big = state.get("is_big", False)
    is_derby = (my_is_big and opp_is_big) or opp_is_big

    my_pwr = state["team_power"] + (state["coach"]["rating"] - 70) * 0.3
    opp_pwr = cur_fixture["opponent_pwr"]
    if is_home:
        my_pwr += 4
    else:
        opp_pwr += 5

    ref_bonus = 0
    if req.press_boost == "derby_bonus":
        bonus_cost = 8_000_000
        if state["budget"] >= bonus_cost:
            state["budget"] -= bonus_cost
            my_pwr += 7
    elif req.press_boost == "threaten_ref":
        ref_bonus = 6
        state["media_trust"] = max(10, state.get("media_trust", 70) - 8)
    elif req.press_boost == "calm":
        state["political_power"] = min(100, state.get("political_power", 50) + 4)
        state["media_trust"] = min(100, state.get("media_trust", 70) + 5)

    # 1. Devre Başlangıç Durumları ve Olay Listesi
    events = []
    my_score = 0
    opp_score = 0
    coach_mistakes = 0

    # Taktik Yetenek Ağacı Bonusları (1. Devre)
    t_skills = state.get("tactical_skills", {}).get("unlocked", [])
    if "cehennem_tribunu" in t_skills and is_home:
        my_pwr += 6
        events.append({
            "minute": 3,
            "type": "coach_action",
            "text": "🏟️🔥 CEHENNEM TRİBÜNÜ: 120 desibel tribün uğultusu stadı inletiyor! Rakip paniğe kapıldı (+%8 Ev Sahibi Baskısı)."
        })
    if "deplasman_org" in t_skills and not is_home:
        opp_pwr = max(50, opp_pwr - 5)
        my_pwr += 3
        events.append({
            "minute": 4,
            "type": "coach_action",
            "text": "🚌 DEPLASMAN SEFERBERLİĞİ: 2.500 cefakar deplasman taraftarı stadı inletiyor! Deplasman baskısı kırıldı."
        })
    if "hucum_ustaligi" in t_skills:
        my_pwr += 4
    if "savunma_duvari" in t_skills:
        opp_pwr = max(50, opp_pwr - 4)

    opp_team = next((t for t in TEAMS_DB if t["name"] == opponent_name), None)
    healthy_squad = [p for p in state["squad"] if p.get("suspended_weeks", 0) == 0 and p.get("injured_weeks", 0) == 0]
    if len(healthy_squad) < 11:
        healthy_squad = state["squad"]
    starting_xi = [p["name"] for p in healthy_squad[:11]]
    scorers = []

    # Yabancı Kuralı (Süper Lig: İlk 11'de maksimum 8 yabancı)
    foreign_count = sum(1 for p in healthy_squad[:11] if p.get("is_foreign", True))
    if foreign_count > 8:
        state["budget"] = max(0, state["budget"] - 4_000_000)
        events.append({
            "minute": 1,
            "type": "coach_action",
            "text": f"⚠️ TFF KURAL İHLALİ: İlk 11'de {foreign_count} yabancı yer aldı (Limit: 8)! TFF 4.000.000 ₺ ceza kesti."
        })

    outfield_starters = [p for p in healthy_squad[:11] if not is_gk(p)]
    non_gk_names = [p["name"] for p in outfield_starters] or ["Hücum Oyuncusu"]

    my_attackers = [p["name"] for p in outfield_starters if to_fifa_pos(p.get("pos", "")) in ["ST", "LW", "RW"]] or non_gk_names
    my_midfielders = [p["name"] for p in outfield_starters if to_fifa_pos(p.get("pos", "")) in ["CAM", "CM", "CDM"]] or non_gk_names
    my_defenders = [p["name"] for p in outfield_starters if to_fifa_pos(p.get("pos", "")) in ["CB", "LB", "RB"]] or non_gk_names

    if opp_team and opp_team.get("squad"):
        opp_outfield = [p for p in opp_team["squad"] if not is_gk(p)]
        opp_non_gk = [p["name"] for p in opp_outfield] or [f"{opponent_name} Forveti"]
        opp_attackers = [p["name"] for p in opp_outfield if to_fifa_pos(p.get("pos", "")) in ["ST", "LW", "RW"]] or opp_non_gk
        opp_mids = [p["name"] for p in opp_outfield if to_fifa_pos(p.get("pos", "")) in ["CAM", "CM", "CDM"]] or opp_non_gk
    else:
        opp_attackers = [f"{opponent_name} Forveti"]
        opp_mids = [f"{opponent_name} Yıldızı"]

    # Oyuncu Kondisyon/Yorgunluk Etkisi: İlk 11'in ortalama kondisyonu 70'in altındaysa güç düşer
    avg_starter_stamina = sum(p.get("stamina", 100) for p in healthy_squad[:11]) / 11.0
    if avg_starter_stamina < 70:
        my_pwr -= int((70 - avg_starter_stamina) * 0.25)

    # Şike / Maçı Satma Kontrolü: Eğer 'opponent_win' bahsi aktifse veya maçı satma anlaşması varsa
    active_bet = state.get("underground", {}).get("active_bet", {})
    throw_match = (active_bet and active_bet.get("bet_type") == "opponent_win")

    # Taktiksel Başkan Talimatı ve Rotasyon Kontrolleri
    tactic = state.get("next_match_tactic")
    if tactic:
        state["next_match_rotation"] = False

    if state.get("next_match_rotation"):
        events.append({
            "minute": 1,
            "type": "coach_action",
            "text": "🔄 ROTASYON KADROSU: Başkan ve hocanın kararıyla as yıldızlar dinlendirildi, yedek ağırlıklı 11 sahada!"
        })
        state["next_match_rotation"] = False

    tactic_bonus_my = 0
    tactic_bonus_opp = 0
    if tactic == "all_out_attack":
        my_pwr += 6
        tactic_bonus_my = 5
        events.append({"minute": 2, "type": "coach_action", "text": "⚔️ TOPYEKÜN HÜCUM: Başkanın talimatıyla takım tüm hatlarıyla rakip yarı sahaya yerleşti!"})
        state["next_match_tactic"] = None
    elif tactic == "park_the_bus":
        opp_pwr -= 6
        tactic_bonus_opp = -6
        events.append({"minute": 2, "type": "coach_action", "text": "🛡️ SAVUNMA KİLİDİ: Başkanın talimatıyla takım katı savunma bloğuna çekildi!"})
        state["next_match_tactic"] = None

    # 1. Devre Gol Simülasyonu - Akıcı ve Gerçekçi Futbol Skorları (5 şans penceresi)
    minute_slots = [14, 23, 33, 41, 45]
    for m in minute_slots:
        roll = random.randint(1, 100)
        pwr_diff = max(-20, min(20, my_pwr - opp_pwr))
        goal_chance_my = max(5, min(25, 11 + int(pwr_diff * 0.50) + ref_bonus + tactic_bonus_my))
        goal_chance_opp = max(4, min(22, 10 - int(pwr_diff * 0.35) + tactic_bonus_opp))

        if throw_match:
            goal_chance_my = 2
            goal_chance_opp = max(18, goal_chance_opp + 10)

        if roll < goal_chance_my and my_score < 3:
            my_score += 1
            attacker = random.choice(my_attackers) if random.random() < 0.75 else random.choice(my_midfielders)
            scorers.append(attacker)
            home_curr = my_score if is_home else opp_score
            away_curr = opp_score if is_home else my_score
            loc_label = "fileleri havalandırdı!" if is_home else "deplasmanda fileleri sarstı!"
            events.append({
                "minute": m,
                "type": "goal_my",
                "is_my_goal": True,
                "scorer": attacker,
                "club": state["club_name"],
                "text": f"⚽ GOOOOL! {attacker} ({state['club_name']}) {loc_label} ({home_curr}-{away_curr})",
                "home_score": home_curr,
                "away_score": away_curr
            })
        elif roll > (100 - goal_chance_opp) and opp_score < 3:
            opp_score += 1
            opp_scorer = random.choice(opp_attackers) if random.random() < 0.75 else random.choice(opp_mids)
            home_curr = my_score if is_home else opp_score
            away_curr = opp_score if is_home else my_score
            opp_label = "topu ağlarımıza gönderdi..." if is_home else "ev sahibini öne geçirdi..."
            events.append({
                "minute": m,
                "type": "goal_opp",
                "is_my_goal": False,
                "scorer": opp_scorer,
                "club": opponent_name,
                "text": f"🔴 RAKİP ATTI! {opp_scorer} ({opponent_name}) {opp_label} ({home_curr}-{away_curr})",
                "home_score": home_curr,
                "away_score": away_curr
            })

    # Cache'e kaydet (Session bazlı)
    sid = current_session_cv.get()
    ACTIVE_MATCH_CACHE[sid] = {
        "week": current_week,
        "is_home": is_home,
        "opponent_name": opponent_name,
        "my_pwr": my_pwr,
        "opp_pwr": opp_pwr,
        "ref_bonus": ref_bonus,
        "my_score": my_score,
        "opp_score": opp_score,
        "scorers": scorers,
        "events": events,
        "coach_mistakes": coach_mistakes,
        "is_derby": is_derby
    }

    home_name = state["club_name"] if is_home else opponent_name
    away_name = opponent_name if is_home else state["club_name"]
    opp_logo = (opp_team.get("logo") if opp_team else "") or ""
    home_logo = state.get("logo", "") if is_home else opp_logo
    away_logo = opp_logo if is_home else state.get("logo", "")

    return {
        "stage": "half1_finished",
        "is_home": is_home,
        "home_name": home_name,
        "away_name": away_name,
        "home_logo": home_logo,
        "away_logo": away_logo,
        "home_score": my_score if is_home else opp_score,
        "away_score": opp_score if is_home else my_score,
        "events": events,
        "stats": {
            "possession": max(35, min(65, 50 + int((my_pwr - opp_pwr) * 0.7))),
            "shots_my": max(2, my_score * 2 + random.randint(3, 7)),
            "shots_opp": max(1, opp_score * 2 + random.randint(2, 6)),
            "xg_my": round(my_score * 0.45 + random.uniform(0.3, 0.7), 2),
            "xg_opp": round(opp_score * 0.45 + random.uniform(0.2, 0.6), 2),
            "coach_mistakes": coach_mistakes
        }
    }

class HalftimeActionRequest(BaseModel):
    action: str # 'scold' (azarlama), 'bonus' (prim vaadi), 'praise' (moral/övgü), 'quiet' (sessiz)

@app.post("/api/match/half2")
def api_match_half2(req: HalftimeActionRequest):
    state = get_state()
    sid = current_session_cv.get()
    h1 = ACTIVE_MATCH_CACHE.get(sid) or ACTIVE_MATCH_CACHE.get("half1")
    if not h1:
        raise HTTPException(status_code=400, detail="İlk yarı verisi bulunamadı!")

    my_pwr = h1["my_pwr"]
    opp_pwr = h1["opp_pwr"]
    my_score = h1["my_score"]
    opp_score = h1["opp_score"]
    scorers = h1["scorers"]
    events = list(h1["events"])
    is_home = h1["is_home"]
    opponent_name = h1["opponent_name"]
    is_derby = h1["is_derby"]
    coach_mistakes = h1["coach_mistakes"]

    # Soyunma Odası Aksiyonunun Etkisi
    halftime_msg = ""
    if req.action == "scold":
        if my_score < opp_score:
            halftime_msg = "⚡ SOYUNMA ODASINDA FIRTINA KOPTU: Başkan masayı yumrukladı! Takım 2. yarıya intikam yeminiyle çıktı!"
            my_pwr += 10
        else:
            halftime_msg = "⚠️ SOYUNMA ODASINDA GERGİNLİK: Başkan öndeyken bile sert çıktı, oyuncuların morali hafif bozuldu."
            my_pwr -= 3
    elif req.action == "bonus":
        bonus_cost = 15_000_000
        if state["budget"] >= bonus_cost:
            state["budget"] -= bonus_cost
            halftime_msg = "💰 DEVRE ARASI KESE AÇILDI: Başkan soyunma odasında adam başı 1.000.000 ₺ galibiyet primi vadetti!"
            my_pwr += 12
        else:
            halftime_msg = "⚠️ Kasada para olmadığı için prim vaadi verilemedi, kuru gaz verildi."
            my_pwr += 2
    elif req.action == "praise":
        halftime_msg = "👏 GÜVEN AŞILANDI: Başkan oyunculara sarıldı, 'Biz bu ligin en iyisiyiz' diyerek moral aşıladı."
        my_pwr += 6
        state["coach"]["moral"] = min(100, state["coach"]["moral"] + 8)
    else: # quiet
        halftime_msg = "🧊 BAŞKAN SESSİZ KALDI: Taktik tahtası tamamen teknik heyete bırakıldı."

    events.append({
        "minute": 45,
        "type": "coach_action",
        "text": halftime_msg
    })

    # Taktik Yetenek Ağacı: Kaptan Ruhu & İsyan
    t_skills = state.get("tactical_skills", {}).get("unlocked", [])
    if "kaptan_ruhu" in t_skills and my_score < opp_score:
        my_pwr += 8
        events.append({
            "minute": 46,
            "type": "coach_action",
            "text": "👑 KAPTAN ATEŞİ: Kaptan soyunma odasında masaya yumruğunu vurdu! 'Bu maçı çevirmeden buradan çıkış yok!' (+%10 İsyan & Reaksiyon)."
        })

    opp_team = next((t for t in TEAMS_DB if t["name"] == opponent_name), None)
    outfield_starters = [p for p in state["squad"][:11] if not is_gk(p)]
    non_gk_names = [p["name"] for p in outfield_starters] or ["Hücum Oyuncusu"]

    my_attackers = [p["name"] for p in outfield_starters if to_fifa_pos(p.get("pos", "")) in ["ST", "LW", "RW"]] or non_gk_names
    my_midfielders = [p["name"] for p in outfield_starters if to_fifa_pos(p.get("pos", "")) in ["CAM", "CM", "CDM"]] or non_gk_names
    my_defenders = [p["name"] for p in outfield_starters if to_fifa_pos(p.get("pos", "")) in ["CB", "LB", "RB"]] or non_gk_names

    opp_squad = get_team_squad(state, opp_team["id"]) if opp_team else []
    if opp_squad:
        opp_outfield = [p for p in opp_squad if not is_gk(p)]
        opp_non_gk = [p["name"] for p in opp_outfield] or [f"{opponent_name} Forveti"]
        opp_attackers = [p["name"] for p in opp_outfield if to_fifa_pos(p.get("pos", "")) in ["ST", "LW", "RW"]] or opp_non_gk
        opp_mids = [p["name"] for p in opp_outfield if to_fifa_pos(p.get("pos", "")) in ["CAM", "CM", "CDM"]] or opp_non_gk
    else:
        opp_attackers = [f"{opponent_name} Forveti"]
        opp_mids = [f"{opponent_name} Yıldızı"]

    # Şike / Maçı Satma Kontrolü: Eğer 'opponent_win' bahsi aktifse veya maçı satma anlaşması varsa
    active_bet = state.get("underground", {}).get("active_bet", {})
    throw_match = (active_bet and active_bet.get("bet_type") == "opponent_win")

    # 2. Devre Gol Simülasyonu (Dakika 50 - 90) - Akıcı ve Gerçekçi 5 Şans Penceresi
    minute_slots_h2 = [53, 65, 74, 83, 89]
    for m in minute_slots_h2:
        roll = random.randint(1, 100)
        pwr_diff = max(-20, min(20, my_pwr - opp_pwr))
        goal_chance_my = max(5, min(25, 12 + int(pwr_diff * 0.50) + h1["ref_bonus"]))
        goal_chance_opp = max(4, min(22, 11 - int(pwr_diff * 0.35)))

        if throw_match:
            goal_chance_my = 1
            goal_chance_opp = max(20, goal_chance_opp + 10)

        # Son Dakika Canavarı Yeteneği (Dk 80-90 arası mucize gol şansı)
        triggered_canavar = False
        if m in [83, 89] and "son_dakika_canavari" in t_skills and my_score <= opp_score and not throw_match:
            canavar_roll = random.random()
            if canavar_roll < (0.45 if is_derby else 0.35) and (my_score - h1["my_score"]) < 3:
                my_score += 1
                attacker = random.choice(my_attackers) if random.random() < 0.75 else random.choice(my_midfielders)
                scorers.append(attacker)
                home_curr = my_score if is_home else opp_score
                away_curr = opp_score if is_home else my_score
                events.append({
                    "minute": m,
                    "type": "goal_my",
                    "is_my_goal": True,
                    "scorer": attacker,
                    "club": state["club_name"],
                    "text": f"🔥⏱️ {m}' DAKİKA: SON DAKİKA CANAVARI! {attacker} ceza sahasında mucizevi bir vuruşla fileleri sarstı! ({home_curr}-{away_curr})",
                    "home_score": home_curr,
                    "away_score": away_curr
                })
                triggered_canavar = True

        # Gol kontrolü (tek yarıda makul skor dengesi)
        if not triggered_canavar and roll < goal_chance_my and (my_score - h1["my_score"]) < 3:
            my_score += 1
            attacker = random.choice(my_attackers) if random.random() < 0.75 else random.choice(my_midfielders)
            scorers.append(attacker)
            home_curr = my_score if is_home else opp_score
            away_curr = opp_score if is_home else my_score
            loc_label = "ağları deldi geçti!" if is_home else "deplasmanda tribünleri susturdu!"
            events.append({
                "minute": m,
                "type": "goal_my",
                "is_my_goal": True,
                "scorer": attacker,
                "club": state["club_name"],
                "text": f"⚽ GOOOOL! {attacker} ({state['club_name']}) {loc_label} ({home_curr}-{away_curr})",
                "home_score": home_curr,
                "away_score": away_curr
            })
        elif roll > (100 - goal_chance_opp) and (opp_score - h1["opp_score"]) < 3:
            opp_score += 1
            opp_scorer = random.choice(opp_attackers) if random.random() < 0.75 else random.choice(opp_mids)
            home_curr = my_score if is_home else opp_score
            away_curr = opp_score if is_home else my_score
            opp_label = "topu köşeye bıraktı..." if is_home else "skoru değiştirdi..."
            events.append({
                "minute": m,
                "type": "goal_opp",
                "is_my_goal": False,
                "scorer": opp_scorer,
                "club": opponent_name,
                "text": f"🔴 RAKİP ATTI! {opp_scorer} ({opponent_name}) {opp_label} ({home_curr}-{away_curr})",
                "home_score": home_curr,
                "away_score": away_curr
            })

    # Eğer rakip galibiyetine bahis yapılmışsa ve hala berabere veya öndeysek maçı satma uzatması
    if throw_match and my_score >= opp_score:
        opp_score = my_score + 1
        opp_scorer = random.choice(opp_attackers)
        events.append({
            "minute": 90,
            "type": "goal_opp",
            "is_my_goal": False,
            "scorer": opp_scorer,
            "club": opponent_name,
            "text": f"🚨 90+4' ŞÜPHELİ HATA! Kalecimiz ve stoperler boşa çıktı, {opp_scorer} topu boş kaleye yuvarladı! ({my_score if is_home else opp_score}-{opp_score if is_home else my_score})",
            "home_score": my_score if is_home else opp_score,
            "away_score": opp_score if is_home else my_score
        })

    # 2. Devre Kart ve Sakatlık Olayları
    healthy_starters = [p for p in state["squad"] if p.get("suspended_weeks", 0) == 0 and p.get("injured_weeks", 0) == 0][:11]
    if healthy_starters and random.random() < 0.40:
        cp = random.choice(healthy_starters)
        cp["yellow_cards"] = cp.get("yellow_cards", 0) + 1
        m_min = random.randint(52, 86)
        if cp["yellow_cards"] >= 4:
            cp["suspended_weeks"] = 1
            cp["yellow_cards"] = 0
            events.append({"minute": m_min, "type": "coach_mistake", "text": f"🟨 4. SARI KART! {cp['name']} cezalı duruma düştü, sonraki maç oynamayacak!"})
        else:
            events.append({"minute": m_min, "type": "coach_action", "text": f"🟨 SARI KART: {cp['name']} sert faul yaptı ({cp['yellow_cards']}/4 kart)."})

    if healthy_starters and random.random() < 0.03:
        rp = random.choice(healthy_starters)
        rp["suspended_weeks"] = 2
        events.append({"minute": random.randint(65, 88), "type": "coach_mistake", "text": f"🟥 DOĞRUDAN KIRMIZI KART! {rp['name']} hakemi protesto ettiği için atıldı (2 maç ceza)!"})

    if healthy_starters and random.random() < 0.10:
        ip = random.choice(healthy_starters)
        iw = random.randint(1, 3)
        ip["injured_weeks"] = iw
        events.append({"minute": random.randint(55, 82), "type": "coach_mistake", "text": f"🩹 SAKATLIK ŞOKU: {ip['name']} arka adalesini tutarak kenara geldi ({iw} hafta yok)."})

    # Maç tamamlandığı için mevcut cezaların ve sakatlıkların 1 hafta azalması
    for p in state["squad"]:
        if p.get("suspended_weeks", 0) > 0:
            p["suspended_weeks"] -= 1
        if p.get("injured_weeks", 0) > 0:
            p["injured_weeks"] -= 1

    # ==================== 2. DEVRE OYUNCU DEĞİŞİKLİKLERİ (63 - 76. Dakikalar) ====================
    healthy_bench = [p for p in state["squad"][11:] if p.get("suspended_weeks", 0) == 0 and p.get("injured_weeks", 0) == 0 and not is_gk(p)]
    subbed_in_players = []
    subbed_out_players = []
    
    if len(healthy_bench) >= 2 and len(outfield_starters) >= 2:
        # En yorgun 2 saha içi oyuncuyu tespit et
        tired_starters = sorted(outfield_starters, key=lambda x: x.get("stamina", 100))[:2]
        # En zinde 2 yedek oyuncuyu oyuna sok
        freshest_bench = sorted(healthy_bench, key=lambda x: x.get("stamina", 100), reverse=True)[:2]
        
        for so, si in zip(tired_starters, freshest_bench):
            subbed_out_players.append(so)
            subbed_in_players.append(si)
            sub_min = random.randint(63, 76)
            events.append({
                "minute": sub_min,
                "type": "coach_action",
                "text": f"🔄 OYUNCU DEĞİŞİKLİĞİ: {si['name']} ({si['pos']}) oyuna girdi, yorulan {so['name']} kenara alındı."
            })

    # ==================== OYUNCU YORGUNLUK VE KONDİSYON (STAMINA) GÜNCELLEMESİ ====================
    # Kaleciler maçta koşmaz, kondisyonu neredeyse hiç düşmez (0-2) -> 3 maçta bir kaleci değiştirme devri bitti!
    # Saha içi oyuncuları dengeli yorulur (5-8 kondisyon) -> 4-5 maç rahat oynarlar
    # Dinlenen yedekler ve oynamayanlar hızla yenilenir (+25 ile +35 kondisyon)
    upgrades = state.setdefault("club_upgrades", {"stadium": 1, "transit": 1, "merch": 1, "academy": 1, "broadcast": 1})
    academy_lvl = upgrades.get("academy", 1)
    academy_recovery_bonus = (academy_lvl - 1) * 3  # Her seviye +3 ekstra kondisyon yenilenmesi

    for idx, p in enumerate(state["squad"]):
        cur_stam = p.get("stamina", 100)
        p_is_gk = is_gk(p)
        if idx < 11:
            if p in subbed_out_players:
                fatigue = random.randint(4, 6) # Erken çıkan oyuncu daha az yorulur
            elif p_is_gk:
                fatigue = random.randint(0, 2) # Kaleci kondisyonu maçta neredeyse hiç düşmez!
            else:
                fatigue = random.randint(5, 8) # Saha içi oyuncuları dengeli yorulur (4-5 maç kesintisiz)
            if "fizik_kondisyon" in t_skills:
                fatigue = max(1, int(fatigue * 0.60)) # Gladyatör Kondisyonu: %40 daha az yorulma
            p["stamina"] = max(25, cur_stam - fatigue)
        else:
            if p in subbed_in_players:
                fatigue = random.randint(2, 4) # 25 dk oynayan yedek hafif yorulur
                if "fizik_kondisyon" in t_skills:
                    fatigue = max(1, int(fatigue * 0.60))
                p["stamina"] = max(30, cur_stam - fatigue)
            else:
                recovery = (35 if p_is_gk else random.randint(25, 35)) + academy_recovery_bonus
                p["stamina"] = min(100, cur_stam + recovery)

    # Hasılat ve Finans Hesaplamaları (Tesis Geliştirmeleri ve Konser/Etkinlik Bonusu Dahil)
    ticket_income = 0
    store_income = 0
    fan_trust = state.get("fan_trust", 50)
    concert_active = state.get("stadium_concert_active", False)
    stadium_lvl = upgrades.get("stadium", 1)
    transit_lvl = upgrades.get("transit", 1)
    merch_lvl = upgrades.get("merch", 1)
    broadcast_lvl = upgrades.get("broadcast", 1)

    if is_home:
        # Bilet Fiyatı & Stadyum Seviyesi Çarpanı (Kullanıcı talebi doğrultusunda %50-60 düşürüldü)
        ticket_price = (320 if is_derby else 160) + ((stadium_lvl - 1) * 20)
        
        # Taraftar Güveni %60 Altındaysa Maça İlgi Ciddi Düşer!
        if fan_trust < 60 and not concert_active:
            # Taraftar boykotu: %60 altındaki her puan doluluğu %1.2 düşürür
            penalty = (60 - fan_trust) * 0.012
            base_occ = max(0.25, (fan_trust / 100.0) - penalty)
        else:
            base_occ = min(1.0, (fan_trust + (20 if is_derby else 0)) / 100.0)

        # Şehir Ulaşım Altyapısı minimum doluluk tabanı sağlar (seviye başına +%3 doluluk garantisi)
        transit_min_occ = 0.35 + ((transit_lvl - 1) * 0.05)
        occupancy = min(1.0, max(transit_min_occ, base_occ))

        # Öncesinde konser/festival düzenlendiyse ek doluluk
        if concert_active:
            occupancy = min(1.0, occupancy + 0.15)
            state["stadium_concert_active"] = False  # Etkinlik kullanıldı

        ticket_income = int(state["stadium_capacity"] * ticket_price * occupancy * 0.45)

        # Forma Satış & Mağaza Geliri (Forma Tasarım & Kalite Seviyesi Çarpanı)
        merch_multiplier = 1.0 + ((merch_lvl - 1) * 0.25)
        store_income = int(fan_trust * (160_000 if is_derby else 70_000) * merch_multiplier)
    else:
        travel_cost = 2_500_000 if is_derby else 1_400_000
        state["budget"] = max(0, state["budget"] - travel_cost)
        store_income = int(fan_trust * 35_000 * (1.0 + ((merch_lvl - 1) * 0.15)))

    # TV Yayın Geliri (Yayın & Medya Gücü Seviyesi Bonusu: Seviye başına +%15)
    base_tv = 5_000_000 if is_derby else 2_500_000
    tv_income = int(base_tv * (1.0 + ((broadcast_lvl - 1) * 0.15)))

    weekly_wage_expense = sum(p["wage"] for p in state["squad"]) // 34 + (state["coach"]["salary"] // 34)

    # Sabit Pasif Masraflar: Stadyum & Tesis Bakımı + İdari Personel/Sağlık/Lojistik
    facility_maintenance = 2_200_000
    staff_and_travel = 1_600_000

    # Bankalar Birliği Borç Faizi Kesintisi
    debt_interest = int(state.get("debt", 200_000_000) * 0.003)

    # Sponsorluk Haftalık Hak Ediş Geliri (%60'ı 34 haftaya bölünür)
    weekly_sponsor_income = 0
    for sp in state.get("finances", {}).get("active_sponsors", []):
        weekly_sponsor_income += int((sp.get("income_season", 0) * 0.60) / 34)

    total_income = ticket_income + store_income + tv_income + weekly_sponsor_income
    total_expenses = weekly_wage_expense + facility_maintenance + staff_and_travel + debt_interest
    net_income = total_income - total_expenses
    state["budget"] += net_income

    state["finances"]["last_ticket_income"] = ticket_income
    state["finances"]["last_store_income"] = store_income
    state["finances"]["last_tv_income"] = tv_income
    state["finances"]["last_sponsor_income"] = weekly_sponsor_income
    state["finances"]["last_wage_expense"] = weekly_wage_expense
    state["finances"]["last_facility_expense"] = facility_maintenance
    state["finances"]["last_staff_expense"] = staff_and_travel
    state["finances"]["last_debt_interest"] = debt_interest
    state["finances"]["last_total_expense"] = total_expenses
    state["finances"]["last_net_income"] = net_income

    # Transfer Tahtası ve Borç Kuralı
    if state["budget"] < -30_000_000:
        state["transfer_ban"] = True
        state["transfer_window_open"] = False
        state["news"].insert(0, "⚠️ TFF & BANKALAR BİRLİĞİ: Kulüp borç limitini aştığı için Transfer Tahtası KAPATILDI!")
    else:
        state["transfer_ban"] = False

    # ==================== OYUNCU REYTİNGLERİ VE OYNAMA DAKİKALARI (SOFASCORE) ====================
    player_ratings = []
    
    # Süre alan oyuncular haritası: player_name -> dakika
    match_played_map = {}
    for p in state["squad"][:11]:
        match_played_map[p["name"]] = 65 if p in subbed_out_players else 90
    for si in subbed_in_players:
        match_played_map[si["name"]] = 25
    for p in state["squad"][11:]:
        if p["name"] in scorers and p["name"] not in match_played_map:
            match_played_map[p["name"]] = 20

    for p in state["squad"]:
        played_mins = match_played_map.get(p["name"], 0)
        p["minutes_played"] = p.get("minutes_played", 0) + played_mins
        if played_mins > 0:
            p["matches_played"] = p.get("matches_played", 0) + 1
            
            # Sofascore Reytingi
            base_rtg = 6.4 + random.uniform(-0.4, 0.6)
            if my_score > opp_score:
                base_rtg += random.uniform(0.9, 1.4)
            elif my_score < opp_score:
                base_rtg -= random.uniform(0.7, 1.3)

            if p["name"] in scorers:
                base_rtg += 1.4
            if is_gk(p) and opp_score == 0:
                base_rtg += 1.1

            final_rtg = min(9.9, max(4.5, round(base_rtg, 1)))
            p.setdefault("ratings_history", []).append(final_rtg)
            p["avg_rating"] = round(sum(p["ratings_history"]) / len(p["ratings_history"]), 1)

            p_goals = scorers.count(p["name"])
            p["goals"] = p.get("goals", 0) + p_goals

            player_ratings.append({
                "name": p["name"],
                "pos": p["pos"],
                "rating": final_rtg,
                "goals": p_goals,
                "minutes": played_mins,
                "is_sub": p["name"] not in [x["name"] for x in state["squad"][:11]]
            })

    # Puan Durumu Güncellemesi
    my_stand = next(s for s in state["standings"] if s["name"] == state["club_name"])
    opp_stand = next(s for s in state["standings"] if s["name"] == opponent_name)

    my_stand["played"] += 1
    opp_stand["played"] += 1
    my_stand["gf"] += my_score
    my_stand["ga"] += opp_score
    opp_stand["gf"] += opp_score
    opp_stand["ga"] += my_score
    my_stand["gd"] = my_stand["gf"] - my_stand["ga"]
    opp_stand["gd"] = opp_stand["gf"] - opp_stand["ga"]

    match_result = ""
    coach_statement = ""
    t_sk_obj = state.setdefault("tactical_skills", {"unlocked": [], "mastery_points": 3})
    if my_score > opp_score:
        my_stand["wins"] += 1
        my_stand["points"] += 3
        opp_stand["losses"] += 1
        match_result = "Galibiyet"
        state["fan_trust"] = min(100, state["fan_trust"] + (4 if is_derby else 2))
        state["board_trust"] = min(100, state["board_trust"] + 3)
        state["coach"]["moral"] = min(100, state["coach"]["moral"] + 10)
        pts_earned = 3 if is_derby else 2
        t_sk_obj["mastery_points"] = t_sk_obj.get("mastery_points", 0) + pts_earned
        events.append({"minute": 90, "type": "coach_action", "text": f"⭐ TAKTİKSEL USTALIK: Zaferle kulübümüze +{pts_earned} Yetenek Puanı (TP) kazandırıldı!"})
        coach_statement = f"{state['coach']['name']}: 'Sahada aslanlar gibi savaşan futbolcularımı ve başkanımızı kutluyorum. Bu galibiyet camiamıza armağan olsun!'"
    elif my_score == opp_score:
        my_stand["draws"] += 1
        my_stand["points"] += 1
        opp_stand["draws"] += 1
        opp_stand["points"] += 1
        match_result = "Beraberlik"
        t_sk_obj["mastery_points"] = t_sk_obj.get("mastery_points", 0) + 1

        # Kolay rakibe karşı puan kaybı kontrolü: Güç farkı belirginse ağır fatura!
        is_underdog = (opp_pwr < my_pwr - 3)
        if is_underdog:
            fan_drop = random.randint(4, 7)
            state["fan_trust"] = max(10, state["fan_trust"] - fan_drop)
            state["board_trust"] = max(10, state["board_trust"] - 4)
            if state.get("coach"):
                state["coach"]["stress"] = min(100, state["coach"].get("stress", 20) + 20)
                state["coach"]["moral"] = max(20, state["coach"].get("moral", 80) - 12)
            coach_statement = f"{state['coach']['name']}: 'Zayıf rakibimiz karşısında çok net fırsatları harcadık. Bu 2 puan kaybı bizi yaraladı, üzerimizdeki baskı tavan yaptı.'"
            state["news"].insert(0, f"⚠️ TARAFTAR VE BASIN İSYANDA: Kolay rakip {opponent_name} karşısında kaybedilen 2 puan sabırları taşırdı! Hoca hedef tahtasında (-%{fan_drop} Güven)!")
        else:
            state["fan_trust"] = max(10, state["fan_trust"] - 1)
            coach_statement = f"{state['coach']['name']}: 'Zorlu bir 90 dakikaydı. 1 puan fena değil ama hatalarımızdan ders çıkarıp önümüze bakacağız.'"
    else:
        my_stand["losses"] += 1
        opp_stand["wins"] += 1
        opp_stand["points"] += 3
        match_result = "Mağlubiyet"
        state["fan_trust"] = max(10, state["fan_trust"] - (6 if is_derby else 3))
        state["board_trust"] = max(10, state["board_trust"] - 4)
        state["coach"]["moral"] = max(20, state["coach"]["moral"] - 12)
        coach_statement = f"{state['coach']['name']}: 'Taraftarımızdan ve başkanımızdan özür diliyoruz. Bu sonuç bize yakışmadı, gereken neyse yapacağız!'"

    # ==================== LİGİN DİĞER MAÇLARININ SİMÜLASYONU ====================
    # Biz maç yaparken ligdeki diğer 16 takım da birbiriyle oynar ve puan toplar!
    other_matches = simulate_other_league_matches(state, opponent_name)

    # Yeraltı Yasadışı Bahis & Şike Kuponu Sonuçlandırma
    ug = state.setdefault("underground", {})
    active_bet = ug.get("active_bet")
    if active_bet:
        b_type = active_bet.get("bet_type")
        bet_amount = active_bet.get("amount", 0)
        payout = active_bet.get("potential_payout", 0)
        is_won = False

        h1_my = h1.get("my_score", 0)
        h1_opp = h1.get("opp_score", 0)
        total_goals = my_score + opp_score

        if b_type == "win":
            is_won = (my_score > opp_score)
        elif b_type == "opponent_win":
            is_won = (opp_score > my_score)
        elif b_type == "over35":
            is_won = (total_goals >= 4)
        elif b_type == "first_half_draw":
            is_won = (h1_my == h1_opp)
        elif b_type == "btts_yes":
            is_won = (my_score >= 1 and opp_score >= 1)
        elif b_type == "red_card":
            is_won = any(ev.get("type") == "coach_mistake" and "KIRMIZI" in ev.get("text", "") for ev in events)
        elif b_type == "total_goals_2_3":
            is_won = (2 <= total_goals <= 3)
        elif b_type == "ht_ft":
            is_won = (h1_my <= h1_opp and my_score > opp_score) or (my_score > opp_score and random.random() < 0.65)

        if is_won:
            state["budget"] += payout
            if b_type == "opponent_win":
                # Kendi takımının mağlubiyetine bahis oynayıp kazandı! Şike skandalı & Ağır taraftar güveni kaybı!
                state["fan_trust"] = max(10, state["fan_trust"] - 20)
                state["board_trust"] = max(10, state["board_trust"] - 15)
                state["media_trust"] = max(10, state["media_trust"] - 15)
                state["news"].insert(0, f"💸 KİRLİ PARA & ŞİKE VURGUNU: Kendi takımınızın mağlubiyetine oynadığınız kupon tuttu (+{format_money_val(payout)})! Ancak tribünler 'Yönetim maçı bilerek sattı!' diyerek tesisleri bastı!")
            else:
                state["news"].insert(0, f"🤑 MERDİVENALTI VURGUN: Yasadışı kupon tuttu! Kasaya +{format_money_val(payout)} nakit kara para girdi!")
        else:
            state["news"].insert(0, f"💸 KUPON YATTI: Yasadışı bahis tutmadı! {format_money_val(bet_amount)} nakit buhar oldu.")

        # MASAK / TFF Polis Baskını & Soruşturma Riski
        risk = active_bet.get("risk_pct", 15)
        if b_type == "opponent_win":
            risk += 25  # Kendi maçını satan daha çabuk yakalanır!

        if random.randint(1, 100) <= risk:
            fine = 25_000_000
            state["budget"] -= fine
            my_stand["points"] = max(0, my_stand["points"] - 3)
            state["fan_trust"] = max(10, state["fan_trust"] - 20)
            state["board_trust"] = max(10, state["board_trust"] - 25)
            ug["under_investigation"] = True
            ug["caught_count"] = ug.get("caught_count", 0) + 1
            state["news"].insert(0, f"🚨 MASAK & POLİS BASKINI: Yasadışı bahis ve şike ağı deşifre oldu! TFF kulübün 3 PUANINI SİLDİ, 25M ₺ para cezası kesildi!")

        ug["last_bet"] = {
            "won": is_won,
            "title": active_bet.get("title", ""),
            "payout": payout if is_won else 0,
            "amount": bet_amount
        }
        ug["active_bet"] = None

    if ug.get("active_deal"):
        ug["active_deal"] = None

    # Rakip Kulüp Şike Anlaşması İhlali Kontrolü (Parayı alıp maçı satmayan başkan cezalandırılır)
    active_bribe = state.get("active_bribe_deal")
    if active_bribe:
        bribe_club = active_bribe.get("from_club", "Rakip Kulüp")
        bribe_amt = active_bribe.get("amount", 50_000_000)
        # Eğer maçı satmadık ve kazandıysak veya berabere kaldıysak:
        if my_score >= opp_score:
            retaliation_cost = int(bribe_amt * 1.5)
            state["budget"] -= retaliation_cost
            state["fan_trust"] = max(10, state["fan_trust"] - 15)
            state["board_trust"] = max(10, state["board_trust"] - 15)
            state["news"].insert(0, f"🩸 MAFYA & KARANLIK İNTİKAM: {bribe_club} başkanından aldığınız {format_money_val(bribe_amt)} şike parasının gereğini yapmayıp maçı kazandınız! Karşı tarafın karanlık bağlantıları kulüp hesaplarına ve kasaya el koyup {format_money_val(retaliation_cost)} ceza kesti!")
        else:
            state["news"].insert(0, f"🤝 KARANLIK DOSYA KAPANDI: {bribe_club} ile yapılan kirli anlaşma gereği maç kaybedildi, ses çıkarılmadı.")
        state["active_bribe_deal"] = None

    # ==================== BANKALAR BİRLİĞİ VE BORÇ DENETİMİ ====================
    bc = state.setdefault("bank_consortium", {
        "total_debt": state.get("debt", 500_000_000),
        "weekly_installment": 6_500_000,
        "unpaid_weeks": 0,
        "sanction_level": 0
    })
    bc["total_debt"] = state.get("debt", 500_000_000)

    # Eğer borç varsa ve kulüp bütçesi aşırı eksiye inmişse
    if bc["total_debt"] > 0:
        if state["budget"] < -15_000_000:
            bc["unpaid_weeks"] += 1
            if bc["unpaid_weeks"] >= 2 and bc["sanction_level"] < 1:
                bc["sanction_level"] = 1
                state["transfer_ban"] = True
                state["news"].insert(0, "🏦 BANKALAR BİRLİĞİ İHTARI: Borç taksitleri aksadı! Kulübe TRANSFER YASAĞI getirildi.")
            elif bc["unpaid_weeks"] >= 4 and bc["sanction_level"] < 2:
                bc["sanction_level"] = 2
                seized = int(ticket_income * 0.40)
                state["budget"] = max(0, state["budget"] - seized)
                state["news"].insert(0, f"🏛️ BANKALAR BİRLİĞİ TEMLİK KOYDU: Haftalık tribün gelirinin %40'ına ({format_money_val(seized)}) doğrudan el konuldu!")
            elif bc["unpaid_weeks"] >= 6 and bc["sanction_level"] < 3:
                bc["sanction_level"] = 3
                my_stand["points"] = max(0, my_stand["points"] - 3)
                state["news"].insert(0, "🚨 TFF MALİ DİSİPLİN CEZASI: Bankalar Birliği anlaşması ihlal edildiği için KULÜBÜN 3 PUANI SİLİNDİ!")
        else:
            if bc["unpaid_weeks"] > 0:
                bc["unpaid_weeks"] = max(0, bc["unpaid_weeks"] - 1)
                if bc["unpaid_weeks"] == 0:
                    bc["sanction_level"] = 0
                    state["transfer_ban"] = False

    # ==================== RAKİP KULÜP BAŞKANLARINDAN ŞİKE / TEŞVİK TEKLİFİ ====================
    # Her 4-5 haftada bir sürpriz karanlık teklif mektubu
    if state["week"] % 4 == 0 and not state.get("incoming_bribe_offer"):
        other_rivals = [t for t in TEAMS_DB if t["name"] != state["club_name"] and t.get("is_big")]
        if other_rivals:
            rival = random.choice(other_rivals)
            offer_type = random.choice(["match_fixing", "incentive"])
            if offer_type == "match_fixing":
                bribe_amt = random.randint(55_000_000, 110_000_000)
                state["incoming_bribe_offer"] = {
                    "from_club": rival["name"],
                    "type": "match_fixing",
                    "amount": bribe_amt,
                    "title": f"🤫 {rival['name']} Başkanından Reddedilemez Çanta Teklifi",
                    "desc": f"'{rival['name']} Başkanı özel kuryeyle haber gönderdi: Önümüzdeki maçta as oyuncuları dinlendirip maçı bize bırakırsanız, kulüp kasasına el altından tam {format_money_val(bribe_amt)} nakit bavul aktaracağız! (Not: Anlaşmayı kabul edip as kadroyla çıkıp maçı kazanırsanız mafya ve camia bedel ödetir!)'"
                }
            else:
                incentive_amt = random.randint(35_000_000, 75_000_000)
                state["incoming_bribe_offer"] = {
                    "from_club": rival["name"],
                    "type": "incentive",
                    "amount": incentive_amt,
                    "title": f"💼 {rival['name']} Başkanından Dev Teşvik Primi",
                    "desc": f"'{rival['name']} Başkanı şampiyonluk yolundaki rakipleri için aracı gönderdi: Sıradaki maçta rakibinizden puan koparırsanız kulübünüze el altından {format_money_val(incentive_amt)} teşvik primi aktaracağız.'"
                }
            state["news"].insert(0, f"📩 GİZLİ MEKTUP: {rival['name']} cephesinden kulüp binasına kapalı zarf içinde gizli bir teklif ulaştı!")

    state["standings"].sort(key=lambda s: (s["points"], s["gd"], s["gf"]), reverse=True)

    cur_fixture = next(f for f in state["fixtures"] if f["week"] == state["week"])
    cur_fixture["played"] = True
    cur_fixture["my_score"] = my_score
    cur_fixture["opp_score"] = opp_score
    cur_fixture["result"] = match_result

    # Hafta İlerletme & Takvim Güncellemesi (Maç tamamlandı, takvim Pazar gününe geçer)
    state["week"] += 1
    try:
        cur_dt = datetime.date.fromisoformat(cur_fixture.get("date", state.get("current_date", "2026-08-15")))
        state["current_date"] = (cur_dt + datetime.timedelta(days=1)).isoformat()
    except Exception:
        pass
    state["transfer_window_open"] = is_transfer_window_open(state.get("current_date", "2026-08-16"), state.get("season", 1))

    # 1. Gayrimenkul / Hazine Arazisi Projesi İlerlemesi
    re_data = state.setdefault("real_estate", {"land_acres": 250, "active_project": None, "completed": []})
    if re_data.get("active_project"):
        proj = re_data["active_project"]
        proj["weeks_left"] = max(0, proj.get("weeks_left", 1) - 1)
        if proj["weeks_left"] == 0:
            p_type = proj.get("type")
            p_name = proj.get("name")
            if p_type == "mall":
                state["budget"] += 150_000_000
                state["fan_trust"] = min(100, state.get("fan_trust", 50) + 10)
                state["news"].insert(0, f"🏢 MÜJDE: {p_name} projesi tamamlandı! Kulüp kasasına 150M ₺ sıcak nakit girdi!")
            elif p_type == "academy":
                state["youth_facility"] = state.get("youth_facility", 1) + 2
                upg = state.setdefault("club_upgrades", {})
                upg["academy"] = upg.get("academy", 1) + 1
                for p in state.get("squad", []):
                    if "Altyapı" in p.get("name", "") or p.get("age", 25) <= 22:
                        p["overall"] = min(96, p.get("overall", 75) + 3)
                state["team_power"] = round(sum(p["overall"] for p in state["squad"][:11]) / 11)
                state["news"].insert(0, f"🎓 MÜJDE: {p_name} tamamlandı! Altyapı gençlerinin gücü +3 arttı, modern tesis açıldı!")
            elif p_type == "stadium":
                state["stadium_capacity"] = state.get("stadium_capacity", 25000) + 20000
                state["fan_trust"] = min(100, state.get("fan_trust", 50) + 15)
                state["news"].insert(0, f"🏟️ MÜJDE: {p_name} açıldı! Kapasite +20.000 artarak {state['stadium_capacity']:,} oldu!")
            re_data.setdefault("completed", []).append(dict(proj))
            re_data["active_project"] = None

    # 2. Kiralık Oyuncuların Haftalık Maç & Gelişim İlerlemesi
    still_loaned = []
    returned_now = []
    for lp in state.setdefault("loaned_players", []):
        lp["weeks_left"] = max(0, lp.get("weeks_left", 17) - 1)
        lp["loan_weeks_left"] = lp["weeks_left"]
        mins = random.randint(75, 90)
        lp["minutes_played"] = lp.get("minutes_played", 0) + mins
        lp["loan_minutes_played"] = lp["minutes_played"]
        lp["matches_played"] = lp.get("matches_played", 0) + 1
        lp["loan_matches_played"] = lp["matches_played"]
        if lp["matches_played"] % 3 == 0 and lp.get("age", 20) <= 23:
            lp["overall"] = min(92, lp.get("overall", 72) + 1)
            lp["growth"] = lp.get("growth", 0) + 1
            state["news"].insert(0, f"📈 KİRALIK GELİŞİMİ: {lp['name']}, {lp.get('loan_club', 'Kiralık Kulübü')} formasıyla haftanın 11'ine seçildi! (+{lp['growth']} OVR, Güncel: {lp['overall']})")

        # Kiralık süresi dolan oyuncu bedelsiz geri döner
        if lp["weeks_left"] == 0:
            restored = enrich_player({
                "name": lp["name"],
                "pos": lp.get("pos") or lp.get("position", "CM"),
                "age": lp.get("age", 21),
                "overall": lp["overall"],
                "wage": lp.get("original_wage", 3_000_000),
                "val": int(lp["overall"] * 850_000)
            })
            restored["minutes_played"] = lp.get("minutes_played", 0)
            restored["matches_played"] = lp.get("matches_played", 0)
            state["squad"].append(restored)
            returned_now.append(f"{lp['name']} (+{lp.get('growth', 0)} OVR)")
        else:
            still_loaned.append(lp)
    state["loaned_players"] = still_loaned
    if returned_now:
        state["squad"] = rebalance_and_validate_squad(state["squad"], state.get("club_name", ""))
        state["team_power"] = round(sum(p["overall"] for p in state["squad"][:11]) / 11)
        state["my_radar"] = calculate_team_radar(state["squad"])
        state["news"].insert(0, f"🔙 KİRALIK DÖNÜŞÜ: Kiralık süresi tamamlanan {', '.join(returned_now)} gelişimini tamamlayarak as kadromuza geri döndü!")

    # 3. Dinamik Sponsor Teklifleri Taze Tutma
    if len(state.get("incoming_sponsor_offers", [])) < 2:
        new_offers = generate_incoming_sponsor_offers(state, 2)
        state.setdefault("incoming_sponsor_offers", []).extend(new_offers)
    if state["week"] > state["max_weeks"]:
        state["season_finished"] = True
        state["election_pending"] = True
        final_rank = next(i for i, s in enumerate(state["standings"]) if s["name"] == state["club_name"]) + 1
        if final_rank == 1:
            state["season_result"] = "champion"
            state["budget"] += 150_000_000
            state["fan_trust"] = 100
            state["board_trust"] = 100
            state["news"].insert(0, f"🏆 ŞAMPİYON {state['club_name']}! KUPA MÜZEMİZDE! 150M ₺ ÖDÜL KAZANILDI!")
        elif final_rank <= 4:
            state["season_result"] = "europe"
            state["budget"] += 60_000_000
            state["news"].insert(0, f"🌟 {state['club_name']} Avrupa Kupalarına katılmaya hak kazandı!")
        else:
            state["season_result"] = "mid"

    # Transfer Pencereleri Takvim Yönetimi
    tw_details = get_transfer_window_details(state.get("current_date", "2026-08-16"), season)
    prev_tw_open = state.get("transfer_window_open", False)
    state["transfer_window_open"] = tw_details["is_open"]
    state["transfer_window"] = tw_details
    state["transfer_day"] = tw_details.get("days_left", 1)
    if prev_tw_open and not tw_details["is_open"]:
        state["news"].insert(0, "🛑 TRANSFER DÖNEMİ KAPANDI! Transfer tahtası kapalıdır.")
    elif not prev_tw_open and tw_details["is_open"]:
        state["news"].insert(0, "🔥 TRANSFER DÖNEMİ RESMEN AÇILDI! Kulüpler masaya oturuyor!")

    # Transfer penceresi açıksa ligdeki diğer takımlar da transfer hamleleri yapar & bize teklif getirir
    if state.get("transfer_window_open"):
        simulate_cpu_transfers(state, count=random.choice([1, 2]))

    opp_logo = (opp_team.get("logo") if opp_team else "") or ""
    home_name = state["club_name"] if is_home else opponent_name
    away_name = opponent_name if is_home else state["club_name"]
    home_logo = state.get("logo", "") if is_home else opp_logo
    away_logo = opp_logo if is_home else state.get("logo", "")

    match_data = {
        "is_home": is_home,
        "home_name": home_name,
        "away_name": away_name,
        "home_tag": "EV SAHİBİ" if is_home else "DEPLASMAN (BİZ)",
        "away_tag": "DEPLASMAN (RAKİP)" if is_home else "EV SAHİBİ",
        "home_logo": home_logo,
        "away_logo": away_logo,
        "home_score": my_score if is_home else opp_score,
        "away_score": opp_score if is_home else my_score,
        "result": match_result,
        "events": events,
        "ticket_income": ticket_income,
        "store_income": store_income,
        "player_ratings": player_ratings,
        "coach_press_statement": coach_statement,
        "stats": {
            "possession": max(30, min(70, 50 + int((my_pwr - opp_pwr) * 0.8))),
            "shots_my": max(4, my_score * 2 + random.randint(6, 14)),
            "shots_opp": max(3, opp_score * 2 + random.randint(4, 11)),
            "xg_my": round(my_score * 0.55 + 0.9, 2),
            "xg_opp": round(opp_score * 0.55 + 0.8, 2),
            "coach_mistakes": coach_mistakes
        }
    }

    state["last_match"] = match_data
    save_state(state)
    ACTIVE_MATCH_CACHE.clear()

    return {"match": match_data, "state": state}

# Geriye dönük uyumluluk: api_play_match doğrudan iki yarıyı birleştirip oynatır
@app.post("/api/match/play")
def api_play_match_legacy(req: Half1Request):
    h1_res = api_match_half1(req)
    h2_res = api_match_half2(HalftimeActionRequest(action="praise"))
    return h2_res

# ==================== SİYASET VE CUMHURBAŞKANLIĞI HİBE SİSTEMİ ====================
class PoliticsActionRequest(BaseModel):
    action_type: str # 'ankara_visit', 'gov_project', 'pro_statement'

@app.post("/api/politics/action")
def api_politics_action(req: PoliticsActionRequest):
    state = get_state()
    pol = state.get("political_power", 50)
    
    if req.action_type == "ankara_visit":
        cost = 2_000_000
        if state["budget"] < cost:
            raise HTTPException(status_code=400, detail="Bakanlık ve Ankara bürokrasi ziyareti için 2M € bütçe gerekli!")
        state["budget"] -= cost
        state["political_power"] = min(100, pol + 10)
        state["media_trust"] = min(100, state.get("media_trust", 70) + 4)
        msg = "Ankara Ziyareti Başarılı: Spor Bakanlığı ve üst düzey bürokratlarla temas sağlandı (+10 Siyaset, +4 Medya)!"
    elif req.action_type == "gov_project":
        cost = 8_000_000
        if state["budget"] < cost:
            raise HTTPException(status_code=400, detail="Devlet destekli gençlik & tesis projesi için 8M € bütçe gerekli!")
        state["budget"] -= cost
        state["political_power"] = min(100, pol + 16)
        state["fan_trust"] = min(100, state["fan_trust"] + 8)
        msg = "Devlet Destekli Sosyal Proje: Kulüp gençlik akademisi protokolü imzalandı (+16 Siyaset, +8 Taraftar)!"
    elif req.action_type == "pro_statement":
        cur_week = state.get("week", 1)
        last_week = state.get("last_pro_statement_week", -99)
        if cur_week - last_week < 2:
            raise HTTPException(status_code=400, detail="Lobi demeci çok sık verilemez! Kamuoyunu inandırıcı kılmak için en az 2 hafta ara vermelisiniz.")
        state["last_pro_statement_week"] = cur_week
        state["political_power"] = min(100, pol + 8)
        state["fan_trust"] = max(10, state["fan_trust"] - 4)
        msg = "Hükümet & TFF Lehine Basın Açıklaması: Siyasi kanatta memnuniyet yarattı (+8 Siyaset, -4 Muhalif Taraftar)."
    else:
        raise HTTPException(status_code=400, detail="Geçersiz aksiyon!")

    state["news"].insert(0, msg)
    save_state(state)
    return {"message": msg, "state": state}

@app.post("/api/politics/presidential-grant")
def api_presidential_grant():
    state = get_state()
    cur_season = state.get("season", 1)
    
    # 1. Kural: Sezonda Sadece 1 Kez Deneme Hakkı
    if state.get("presidential_grant_used_season") == cur_season:
        raise HTTPException(
            status_code=400,
            detail=f"{cur_season}. Sezon için Cumhurbaşkanlığı hibe başvuru hakkınızı zaten kullandınız! Saray kapısı sezonda sadece 1 kez çalınabilir. Yeni başvuru hakkı: Gelecek Sezon."
        )

    pol = state.get("political_power", 50)
    # 2. Kural: Giriş Eşiği Artırıldı (En az %65)
    if pol < 65:
        raise HTTPException(
            status_code=400, 
            detail=f"Siyasi nüfuzunuz Cumhurbaşkanlığı makamına ulaşmak için yetersiz! (Mevcut: %{pol} • En az %65 Siyasi Nüfuz gereklidir)."
        )

    # Hak tüketildi olarak kaydet (başarılı ya da başarısız fark etmeksizin)
    state["presidential_grant_used_season"] = cur_season

    # 1. Senaryo: Siyaset %85 Üstü -> Hazine Arazisi Hibe Talebi (%40 Kabul)
    if pol >= 85:
        success = (random.random() < 0.40)
        if success:
            acres = 15
            grant_cash = 25_000_000
            if "real_estate" not in state or not isinstance(state["real_estate"], dict):
                state["real_estate"] = {"land_acres": 0}
            state["real_estate"]["land_acres"] = state["real_estate"].get("land_acres", 0) + acres
            state["budget"] += grant_cash
            state["fan_trust"] = min(100, state["fan_trust"] + 8)
            state["board_trust"] = min(100, state["board_trust"] + 12)
            msg = f"CUMHURBAŞKANLIĞI KARARNAMESİ: Sayın Cumhurbaşkanı kulübümüze {acres} DÖNÜM HAZİNE ARAZİSİ ve {format_money_val(grant_cash)} altyapı fonu tahsis etti!"
            state["news"].insert(0, msg)
            save_state(state)
            return {"status": "success", "type": "land", "message": msg, "state": state}
        else:
            # Ret ve Skandal!
            state["fan_trust"] = max(10, state["fan_trust"] - 15)
            state["board_trust"] = max(10, state["board_trust"] - 15)
            state["media_trust"] = max(10, state.get("media_trust", 70) - 15)
            state["political_power"] = max(20, pol - 15)
            msg = "SARAY KAPISINDAN RET! Cumhurbaşkanlığı arazi talebini veto etti. Muhalif basın 'Kulüp eli boş döndü' manşetleri attı (-15 Siyaset, -15 Kongre)!"
            state["news"].insert(0, msg)
            save_state(state)
            return {"status": "rejected", "type": "land", "message": msg, "state": state}

    # 2. Senaryo: Siyaset %65 - %84 Arası -> Acil Kulüp Destek Hibesi (%25 Kabul)
    else:
        success = (random.random() < 0.25)
        if success:
            grant_money = 20_000_000
            state["budget"] += grant_money
            state["board_trust"] = min(100, state["board_trust"] + 8)
            msg = f"SARAYDAN MÜJDE: Cumhurbaşkanlığı Acil Kulüp Fonu'ndan kulübümüze {format_money_val(grant_money)} nakit destek onaylandı!"
            state["news"].insert(0, msg)
            save_state(state)
            return {"status": "success", "type": "cash", "message": msg, "state": state}
        else:
            # Ret ve Kamuoyu Baskısı
            state["fan_trust"] = max(10, state["fan_trust"] - 10)
            state["board_trust"] = max(10, state["board_trust"] - 10)
            state["political_power"] = max(20, pol - 10)
            msg = "HİBE TALEBİ REDDEDİLDİ: Cumhurbaşkanlığı makamı bütçe disiplini gerekçesiyle hibe talebini geri çevirdi (-10 Siyaset)."
            state["news"].insert(0, msg)
            save_state(state)
            return {"status": "rejected", "type": "cash", "message": msg, "state": state}

# ==================== TARAFTAR İLİŞKİLERİ VE TRİBÜN YÖNETİMİ ====================
class FanActionRequest(BaseModel):
    action_type: str # 'tribune_meeting', 'away_bus_support', 'ticket_discount', 'open_training'

@app.post("/api/fan/action")
def api_fan_action(req: FanActionRequest):
    state = get_state()
    cur_week = state.get("week", 1)
    
    if req.action_type == "tribune_meeting":
        cost = 400_000
        last_week = state.get("last_fan_tribune_week", -99)
        if cur_week - last_week < 2:
            raise HTTPException(status_code=400, detail="Tribün liderleriyle görüşme çok sık yapılamaz! En az 2 hafta ara vermelisiniz.")
        if state["budget"] < cost:
            raise HTTPException(status_code=400, detail=f"İstişare yemeği ve organizasyon için {format_money_val(cost)} bütçe gerekli!")
        state["budget"] -= cost
        state["last_fan_tribune_week"] = cur_week
        state["fan_trust"] = min(100, state.get("fan_trust", 50) + 8)
        state["team_morale"] = min(100, state.get("team_morale", 70) + 4)
        msg = "Tribün Liderleriyle İstişare Yemeği: Amigolar ve derneklerle buluşuldu, tam destek sözü alındı (+8 Taraftar, +4 Moral)."

    elif req.action_type == "away_bus_support":
        cost = 1_200_000
        last_week = state.get("last_fan_bus_week", -99)
        if cur_week - last_week < 2:
            raise HTTPException(status_code=400, detail="Deplasman seferberliği en az 2 hafta arayla düzenlenebilir.")
        if state["budget"] < cost:
            raise HTTPException(status_code=400, detail=f"Deplasman otobüsleri ve bilet fonu için {format_money_val(cost)} bütçe gerekli!")
        state["budget"] -= cost
        state["last_fan_bus_week"] = cur_week
        state["fan_trust"] = min(100, state.get("fan_trust", 50) + 12)
        state["away_fan_boost"] = True
        msg = "Deplasman Seferberliği: 40 otobüs kaldırıldı ve deplasman biletleri kulüpçe karşılandı (+12 Taraftar Güveni)."

    elif req.action_type == "ticket_discount":
        last_week = state.get("last_fan_discount_week", -99)
        if cur_week - last_week < 3:
            raise HTTPException(status_code=400, detail="Bilet indirimi en az 3 hafta arayla yapılabilir.")
        state["last_fan_discount_week"] = cur_week
        state["fan_trust"] = min(100, state.get("fan_trust", 50) + 10)
        state["board_trust"] = max(10, state.get("board_trust", 60) - 3)
        msg = "Halk Günü Bilet İndirimi: İç saha biletlerinde %50 indirim ilan edildi (+10 Taraftar, -3 Yönetim Güveni)."

    elif req.action_type == "open_training":
        cost = 300_000
        last_week = state.get("last_fan_training_week", -99)
        if cur_week - last_week < 2:
            raise HTTPException(status_code=400, detail="Açık antrenman en az 2 hafta arayla düzenlenebilir.")
        if state["budget"] < cost:
            raise HTTPException(status_code=400, detail=f"Stadyum organizasyonu için {format_money_val(cost)} bütçe gerekli!")
        state["budget"] -= cost
        state["last_fan_training_week"] = cur_week
        state["fan_trust"] = min(100, state.get("fan_trust", 50) + 6)
        state["team_morale"] = min(100, state.get("team_morale", 70) + 6)
        msg = "Meşaleli Açık İdman: Binlerce taraftarın katılımıyla stadyumda şov yapıldı (+6 Taraftar, +6 Takım Morali)."

    else:
        raise HTTPException(status_code=400, detail="Geçersiz taraftar aksiyonu!")

    state["news"].insert(0, msg)
    save_state(state)
    return {"message": msg, "state": state}

# ==================== KONGRE & DİVAN KURULU YÖNETİMİ ====================
class BoardActionRequest(BaseModel):
    action_type: str # 'board_meeting', 'financial_report', 'staff_bonus', 'vote_of_confidence'

@app.post("/api/board/action")
def api_board_action(req: BoardActionRequest):
    state = get_state()
    cur_week = state.get("week", 1)
    cur_season = state.get("season", 1)

    if req.action_type == "board_meeting":
        cost = 600_000
        last_week = state.get("last_board_meeting_week", -99)
        if cur_week - last_week < 2:
            raise HTTPException(status_code=400, detail="Olağanüstü yönetim zirvesi en az 2 hafta arayla yapılabilir.")
        if state["budget"] < cost:
            raise HTTPException(status_code=400, detail=f"Zirve ve organizasyon için {format_money_val(cost)} bütçe gerekli!")
        state["budget"] -= cost
        state["last_board_meeting_week"] = cur_week
        state["board_trust"] = min(100, state.get("board_trust", 60) + 8)
        state["media_trust"] = min(100, state.get("media_trust", 70) + 4)
        msg = "Olağanüstü Yönetim Kurulu Zirvesi: Duayenler ve kurul üyeleriyle tam mutabakata varıldı (+8 Yönetim, +4 Medya)."

    elif req.action_type == "financial_report":
        last_week = state.get("last_board_audit_week", -99)
        if cur_week - last_week < 3:
            raise HTTPException(status_code=400, detail="Şeffaf mali rapor en az 3 hafta arayla sunulabilir.")
        state["last_board_audit_week"] = cur_week
        state["board_trust"] = min(100, state.get("board_trust", 60) + 7)
        state["media_trust"] = min(100, state.get("media_trust", 70) + 5)
        msg = "Şeffaf Mali İbra Raporu: Bağımsız denetim raporu genel kurula sunuldu ve alkış aldı (+7 Yönetim, +5 Medya)."

    elif req.action_type == "staff_bonus":
        cost = 2_000_000
        last_week = state.get("last_board_bonus_week", -99)
        if cur_week - last_week < 4:
            raise HTTPException(status_code=400, detail="Kulüp personeli prim dağıtımı en az 4 hafta arayla yapılabilir.")
        if state["budget"] < cost:
            raise HTTPException(status_code=400, detail=f"Personel prim fonu için {format_money_val(cost)} bütçe gerekli!")
        state["budget"] -= cost
        state["last_board_bonus_week"] = cur_week
        state["board_trust"] = min(100, state.get("board_trust", 60) + 10)
        state["team_morale"] = min(100, state.get("team_morale", 70) + 5)
        msg = "İdari ve Tesis Personeli Prim Dağıtımı: Kulüp emekçilerine moral primi dağıtıldı (+10 Yönetim, +5 Takım Morali)."

    elif req.action_type == "vote_of_confidence":
        if state.get("board_confidence_season") == cur_season:
            raise HTTPException(status_code=400, detail="Güven oylaması sezonda yalnızca 1 kez talep edilebilir!")
        cost = 1_000_000
        if state["budget"] < cost:
            raise HTTPException(status_code=400, detail=f"Kongre çağrısı ve salon masrafları için {format_money_val(cost)} bütçe gerekli!")
        state["budget"] -= cost
        state["board_confidence_season"] = cur_season
        
        cur_board = state.get("board_trust", 60)
        if cur_board >= 50:
            state["board_trust"] = min(100, cur_board + 15)
            state["fan_trust"] = min(100, state.get("fan_trust", 50) + 6)
            msg = "Güven Oylaması Zaferi: Genel kurul yönetime tam itimat ve açık çek verdi (+15 Yönetim, +6 Taraftar)!"
        else:
            state["board_trust"] = max(15, cur_board - 12)
            msg = "Güven Oylamasında Çatlak Sesler: Muhalefet sert eleştiriler yöneltti ve kongre gergin geçti (-12 Yönetim Güveni)!"

    else:
        raise HTTPException(status_code=400, detail="Geçersiz kongre aksiyonu!")

    state["news"].insert(0, msg)
    save_state(state)
    return {"message": msg, "state": state}

# ==================== TAKIM KAPTANI & KADRO HUZURSUZLUKLARI ====================
@app.get("/api/captain/report")
def api_captain_report():
    state = get_state()
    squad = state["squad"]
    captain = state.get("captain_name") or get_captain_name(squad)
    week = state.get("week", 1)

    harmony = state.get("squad_harmony", 80)
    summary_text = ""
    if harmony >= 85:
        summary_text = f"Kaptan {captain}: 'Başkanım soyunma odasında kolej havası var. Herkes birbirine kenetlendi, şampiyonluk yolunda tam gaz ilerliyoruz.'"
    elif harmony >= 65:
        summary_text = f"Kaptan {captain}: 'Başkanım takımda genel durum fena değil ama bazı arkadaşlar maaş dengesizliğinden ve az süre almaktan şikayetçi.'"
    else:
        summary_text = f"Kaptan {captain}: 'Başkanım acil toplantı lazım! Takımda gruplaşma var ve bazı oyuncular antrenmana isteksiz çıkıyor.'"

    wage_demands = []
    # Otantik ve performansa dayalı zam talepleri:
    cur_season = state.get("season", 1)
    if week >= 3:
        candidates = []
        for p in squad:
            # Bu sezon zaten zam görüşmesi yapılmışsa bir daha ASLA zam isteyemez!
            if p.get("wage_resolved_season") == cur_season:
                continue

            ovr = p.get("overall", 75)
            wage = p.get("wage", 3_000_000)
            contract = p.get("contract_years", 2)
            
            if ovr >= 80 and wage < 12_000_000:
                candidates.append((p, "Ligdeki üstün performansı ve takımın kilit ismi olması sebebiyle zam istiyor.", 1.45))
            elif any(pos in to_fifa_pos(p.get("pos", "")) for pos in ["ST", "LW", "RW"]) and ovr >= 77 and wage < 8_000_000:
                candidates.append((p, "Son haftalardaki hücum katkısıyla parladı. Menajeri kulübe zam talebini iletti.", 1.50))
            elif contract == 1 and ovr >= 78:
                candidates.append((p, "Sözleşmesinin son senesinde. Bedelsiz ayrılmamak adına zamlı yeni kontrat talep ediyor.", 1.35))

        for p, reason, multiplier in candidates[:2]:
            curr_w = p.get("wage", 3_000_000)
            max_market = get_realistic_market_wage(p.get("overall", 75))
            demanded_w = min(max_market, max(int(curr_w * multiplier), curr_w + 1_500_000))
            wage_demands.append({
                "name": p["name"],
                "pos": p["pos"],
                "age": p.get("age", 25),
                "potential": p.get("potential", p.get("overall", 75) + 3),
                "is_youth": p.get("age", 25) < 26,
                "current_wage": curr_w,
                "demanded_wage": demanded_w,
                "contract_years": p.get("contract_years", 2),
                "morale": p.get("morale", 80),
                "reason": reason
            })

    unhappy_players = [p for p in squad if p.get("morale", 80) < 70]

    return {
        "captain_name": captain,
        "squad_harmony": harmony,
        "summary": summary_text,
        "unhappy_players": [p["name"] for p in unhappy_players[:3]],
        "wage_demands": wage_demands
    }

class WageNegotiationRequest(BaseModel):
    player_name: str
    decision: str # 'accept' (%30 zam), 'reject' (reddet), 'renew_2yr' (%15 zam + 2 yıl sözleşme)

@app.post("/api/player/wage-negotiation")
def api_wage_negotiation(req: WageNegotiationRequest):
    state = get_state()
    player = next((p for p in state["squad"] if p["name"] == req.player_name), None)
    if not player:
        raise HTTPException(status_code=404, detail="Oyuncu bulunamadı!")

    cur_season = state.get("season", 1)
    # Bu sezon bu oyuncu için zam konusunu kesin olarak kapat:
    player["wage_resolved_season"] = cur_season
    player["wage_resolved_week"] = state.get("week", 1)

    if req.decision == "accept":
        player["wage"] = int(player["wage"] * 1.30)
        player["morale"] = 100
        state["squad_harmony"] = min(100, state.get("squad_harmony", 80) + 6)
        msg = f"🤝 {player['name']} ile anlaşma sağlandı! Maaşına %30 zam yapıldı. Bu sezon yeni bir zam talebi gelmeyecek."
    elif req.decision == "renew_2yr":
        player["wage"] = int(player["wage"] * 1.15)
        player["contract_years"] = player.get("contract_years", 1) + 2
        player["morale"] = 92
        state["squad_harmony"] = min(100, state.get("squad_harmony", 80) + 4)
        msg = f"📑 {player['name']} sözleşmesini 2 YIL UZATTI (+%15 makul zam). Bu sezon dosya kapandı."
    else: # reject
        player["morale"] = max(20, player.get("morale", 80) - 25)
        state["squad_harmony"] = max(30, state.get("squad_harmony", 80) - 5)
        msg = f"❌ {player['name']} için zam talebi reddedildi! Dosya sezon sonuna kadar donduruldu."

    state["news"].insert(0, msg)
    save_state(state)
    return {"message": msg, "state": state}

# ==================== BANKALAR BİRLİĞİ BORÇ ÖDEME SİSTEMİ ====================
class PayDebtRequest(BaseModel):
    amount: int # Ödenecek tutar (örn: 10_000_000, 25_000_000, 50_000_000 veya tümü)

@app.post("/api/finances/pay-debt")
def api_pay_debt(req: PayDebtRequest):
    state = get_state()
    cur_debt = state.get("debt", 500_000_000)
    if cur_debt <= 0:
        return {"message": "Kulübün Bankalar Birliği'ne hiç borcu bulunmuyor! Mali bağımsızlık ilan edildi.", "state": state}

    pay_amount = min(cur_debt, req.amount)
    if state["budget"] < pay_amount:
        raise HTTPException(status_code=400, detail=f"Kasada yeterli nakit yok! Gerekli: {format_money_val(pay_amount)}, Mevcut: {format_money_val(state['budget'])}")

    state["budget"] -= pay_amount
    state["debt"] = max(0, cur_debt - pay_amount)
    
    bc = state.setdefault("bank_consortium", {})
    bc["total_debt"] = state["debt"]
    bc["unpaid_weeks"] = 0
    if state["debt"] == 0:
        bc["sanction_level"] = 0
        state["transfer_ban"] = False
        msg = "🎉 TARİHİ AN: Bankalar Birliği borcunun TAMAMI KAPATILDI! Kulüp finansal prangalarından kurtuldu!"
    else:
        bc["sanction_level"] = max(0, bc.get("sanction_level", 0) - 1)
        if bc["sanction_level"] == 0:
            state["transfer_ban"] = False
        msg = f"🏦 BANKALAR BİRLİĞİ ÖDEMESİ: {format_money_val(pay_amount)} anapara borcu kapatıldı! Kalan Borç: {format_money_val(state['debt'])}"

    state["board_trust"] = min(100, state["board_trust"] + 8)
    state["fan_trust"] = min(100, state["fan_trust"] + 6)
    state["news"].insert(0, msg)
    save_state(state)
    return {"message": msg, "state": state}

# ==================== BANKALAR BİRLİĞİ KREDİ ÇEKME SİSTEMİ ====================
class TakeLoanRequest(BaseModel):
    amount: int # 25_000_000, 50_000_000, 100_000_000

@app.post("/api/finances/take-loan")
def api_take_loan(req: TakeLoanRequest):
    state = get_state()
    if req.amount not in [25_000_000, 50_000_000, 100_000_000]:
        raise HTTPException(status_code=400, detail="Geçersiz kredi tutarı! Seçenekler: 25M, 50M veya 100M ₺")
    
    cur_debt = state.get("debt", 0)
    if cur_debt > 650_000_000:
        raise HTTPException(status_code=400, detail="Mevcut borcunuz tavan seviyede! Bankalar Birliği yeni kredi talebini onaylamadı.")
    
    interest_fee = int(req.amount * 0.08) # %8 banka finansman komisyonu
    state["budget"] += req.amount
    state["debt"] = cur_debt + req.amount + interest_fee
    
    bc = state.setdefault("bank_consortium", {})
    bc["total_debt"] = state["debt"]
    
    state["board_trust"] = max(20, state.get("board_trust", 50) - 4)
    msg = f"🏦 BANKALAR BİRLİĞİ KREDİSİ: Kulüp kasasına {format_money_val(req.amount)} nakit girdi! (%8 faiz/masrafla toplam borca {format_money_val(req.amount + interest_fee)} eklendi)."
    state["news"].insert(0, msg)
    save_state(state)
    return {"message": msg, "state": state}

# ==================== RAKİP BAŞKANDAN ŞİKE / TEŞVİK YANITI ====================
class BribeResponseRequest(BaseModel):
    decision: str # 'accept' veya 'reject'

@app.post("/api/underground/bribe-response")
def api_bribe_response(req: BribeResponseRequest):
    state = get_state()
    offer = state.get("incoming_bribe_offer")
    if not offer:
        raise HTTPException(status_code=400, detail="Aktif bir gizli teklif bulunmuyor!")

    amt = offer.get("amount", 25_000_000)
    from_club = offer.get("from_club", "Rakip Kulüp")
    b_type = offer.get("type", "match_fixing")

    if req.decision == "accept":
        state["budget"] += amt
        state["fan_trust"] = max(10, state["fan_trust"] - 15)
        state["board_trust"] = max(10, state["board_trust"] - 10)
        state["media_trust"] = max(10, state.get("media_trust", 70) - 12)
        if b_type == "match_fixing":
            state["active_bribe_deal"] = {
                "from_club": from_club,
                "amount": amt,
                "target_week": state.get("week", 1)
            }
        msg = f"🤝 KARANLIK ANLAŞMA: {from_club} başkanının çantası kabul edildi! Kasaya el altından +{format_money_val(amt)} girdi. (Gereği yerine getirilmezse mafya ve karşı kulüp hesap sorar!)"
    else:
        state["fan_trust"] = min(100, state["fan_trust"] + 12)
        state["board_trust"] = min(100, state["board_trust"] + 6)
        state["media_trust"] = min(100, state.get("media_trust", 70) + 10)
        msg = f"🛡️ ONUR DOKTRİNİ: {from_club} başkanının kirli teklifi masaya fırlatıldı! 'Bizim formamız ve armamız satılık değildir!' (-Şike Reddedildi, +12 Taraftar Güveni)."

    state["incoming_bribe_offer"] = None
    state["news"].insert(0, msg)
    save_state(state)
    return {"message": msg, "state": state}

# ==================== TEKNİK DİREKTÖR GELECEK VİZYONU ====================
class CoachVisionRequest(BaseModel):
    vision_focus: str # 'youth', 'gegenpress', 'defensive', 'setpiece', 'wage_discipline'

@app.post("/api/coach/future-vision")
def api_coach_future_vision(req: CoachVisionRequest):
    state = get_state()
    coach = state["coach"]
    current_week = state.get("week", 1)
    current_half = 1 if current_week <= 17 else 2

    # Sınırlandırma: Her yarı sezonda sadece 1 kez vizyon toplantısı yapılabilir!
    if state.get("coach_vision_used_half") == current_half:
        next_period = "18. Hafta (2. Devre Başı)" if current_half == 1 else "Gelecek Sezon"
        raise HTTPException(
            status_code=400,
            detail=f"Hoca vizyon toplantısı bu yarı sezonda zaten tamamlandı! Yeni stratejik hak: {next_period}."
        )

    if req.vision_focus == "youth":
        # Altyapı akademisinden 18 yaşında yüksek potansiyelli (Wonderkid) genç yetenek
        name = random.choice(["Erencan Aktaş", "Baran Yılmaz", "Semih Güler", "Oğuzhan Kaya", "Yusuf Demirbaş"])
        pos = random.choice(["SAĞ KANAT", "SOL KANAT", "MERKEZ OS", "STP", "SANTRAFOR"])
        academy_star = {
            "name": name,
            "pos": pos,
            "age": 18,
            "overall": 78,
            "potential": 90,
            "is_youth": True,
            "is_foreign": False,
            "wage": 2_000_000,
            "val": 28_000_000,
            "skills": {"pac": 88, "sho": 78, "pas": 77, "dri": 82, "def": 58, "phy": 74},
            "contract_years": 5,
            "morale": 100,
            "yellow_cards": 0,
            "suspended_weeks": 0,
            "injured_weeks": 0
        }
        state["squad"].append(academy_star)
        msg = f"🌟 AKADEMİ REFORMU: 18 yaşındaki süper yetenek {name} ({pos} • POT: 90) A takıma kazandırıldı ve 5 yıllık sözleşme imzalandı!"
    elif req.vision_focus == "gegenpress" or req.vision_focus == "attacking":
        for p in state["squad"]:
            if "skills" in p:
                p["skills"]["sho"] = min(99, p["skills"].get("sho", 75) + 3)
                p["skills"]["pac"] = min(99, p["skills"].get("pac", 75) + 3)
                p["skills"]["dri"] = min(99, p["skills"].get("dri", 75) + 2)
        coach["style"] = "Yüksek Pres & Amansız Gegenpressing"
        coach["attack"] = min(99, coach.get("attack", 70) + 4)
        msg = f"⚡ GEGENPRESS KAMPI: {coach['name']} tüm takımı yüksek pres ve hücum temposuna soktu (+3 Hız, +3 Şut, +2 Dripling)!"
    elif req.vision_focus == "defensive":
        for p in state["squad"]:
            if "skills" in p:
                p["skills"]["def"] = min(99, p["skills"].get("def", 75) + 4)
                p["skills"]["phy"] = min(99, p["skills"].get("phy", 75) + 3)
        coach["style"] = "Catenaccio & Çelik Defans Bloğu"
        coach["defense"] = min(99, coach.get("defense", 70) + 5)
        msg = f"🛡️ SAVUNMA DOKTRİNİ: {coach['name']} tüm takıma İtalyan savunma disiplini aşıladı (+4 Defans, +3 Fizik Direnç)!"
    elif req.vision_focus == "setpiece":
        for p in state["squad"]:
            if "skills" in p:
                p["skills"]["pas"] = min(99, p["skills"].get("pas", 75) + 4)
                p["skills"]["sho"] = min(99, p["skills"].get("sho", 75) + 2)
        coach["style"] = "Duran Top & Taktiksel Frikik Organizasyonu"
        msg = f"🎯 DURAN TOP KAMPI: Korner ve frikik taktikleri baştan yazıldı (+4 Pas, +2 Şut kalitesi)!"
    elif req.vision_focus == "wage_discipline":
        total_saved = 0
        for p in state["squad"]:
            old_w = p.get("wage", 3_000_000)
            new_w = max(1_000_000, int(old_w * 0.90))
            total_saved += (old_w - new_w)
            p["wage"] = new_w
        coach["moral"] = min(100, coach.get("moral", 80) + 5)
        state["political_power"] = min(100, state.get("political_power", 55) + 6)
    elif req.vision_focus == "tiki_taka":
        for p in state["squad"]:
            if "skills" in p:
                p["skills"]["pas"] = min(99, p["skills"].get("pas", 75) + 5)
                p["skills"]["dri"] = min(99, p["skills"].get("dri", 75) + 3)
        coach["style"] = "İspanyol Tiki-Taka & Yüksek Top Hakimiyeti"
        coach["moral"] = min(100, coach.get("moral", 80) + 8)
        msg = f"🌀 TİKİ-TAKA REFORMU: {coach['name']} takıma kusursuz pas organizasyonu aşıladı (+5 Pas, +3 Dripling, Top Hakimiyeti Garantisi)!"
    elif req.vision_focus == "counter_attack":
        for p in state["squad"]:
            if "skills" in p:
                p["skills"]["pac"] = min(99, p["skills"].get("pac", 75) + 5)
                p["skills"]["sho"] = min(99, p["skills"].get("sho", 75) + 3)
        coach["style"] = "Şimşek Kontra-Atak & Hızlı Geçiş Doktrini"
        msg = f"⚡ ŞİMŞEK GEÇİŞ KAMPI: {coach['name']} takımı kontra-atak canavarına dönüştürdü (+5 Hız, +3 Şut, Deplasmanlarda Ölümcül Tehdit)!"
    elif req.vision_focus == "scout_revolution":
        # Avrupa'dan 19 yaşında yüksek potansiyelli yabancı wonderkid
        foreign_names = [("Lucas Moreau", "LW", "Fransa"), ("Mateo Silva", "ST", "Brezilya"), ("Kacper Zielinski", "CAM", "Polonya"), ("Jonas Lindqvist", "CB", "İsveç")]
        f_name, f_pos, f_cnt = random.choice(foreign_names)
        wonderkid = {
            "name": f_name,
            "pos": f_pos,
            "age": 19,
            "overall": 79,
            "potential": 91,
            "is_youth": True,
            "is_foreign": True,
            "wage": 3_500_000,
            "val": 35_000_000,
            "skills": {"pac": 89, "sho": 81, "pas": 79, "dri": 85, "def": 55, "phy": 76},
            "contract_years": 5,
            "morale": 100,
            "yellow_cards": 0,
            "suspended_weeks": 0,
            "injured_weeks": 0
        }
        state["squad"].append(wonderkid)
        msg = f"🌍 GLOBAL SCOUT OPERASYONU: {coach['name']} tavsiyesiyle {f_cnt}'den 19 yaşındaki süper yetenek {f_name} ({f_pos} • POT: 91) kadroya katıldı!"
    elif req.vision_focus == "mental_resilience":
        for p in state["squad"]:
            p["morale"] = 100
        state["squad_harmony"] = 100
        state["fan_trust"] = min(100, state["fan_trust"] + 8)
        coach["moral"] = 100
        msg = "🧠 ŞAMPİYONLUK MENTALİTESİ: Tüm oyunculara kriz yönetimi ve şampiyonluk karakteri aşılandı! (Takım ahengi & moraller %100 tavan yaptı)!"
    else:
        raise HTTPException(status_code=400, detail="Geçersiz vizyon odağı!")

    state["coach_vision_used_half"] = current_half
    state["news"].insert(0, msg)
    save_state(state)
    return {"message": msg, "state": state}

# ==================== MAÇ SONU HOCA BRİFİNGİ & OYUNCU DİYALOĞU ====================
class CoachPostMatchTalkRequest(BaseModel):
    action: str # 'bonus' (1M prim), 'praise' (tebrik), 'warn' (sert uyarı & yedek), 'fine' (500K ceza)
    player_name: str

@app.post("/api/coach/post-match-talk")
def api_coach_post_match_talk(req: CoachPostMatchTalkRequest):
    state = get_state()
    player = next((p for p in state["squad"] if p["name"] == req.player_name), None)
    coach = state.get("coach", {})
    
    if req.action == "bonus":
        if state["budget"] < 250_000:
            raise HTTPException(status_code=400, detail="Kasada 250.000 € prim bütçesi yok!")
        state["budget"] -= 250_000
        if player: player["morale"] = 100
        coach["moral"] = min(100, coach.get("moral", 80) + 4)
        state["fan_trust"] = min(100, state.get("fan_trust", 80) + 2)
        msg = f"MAÇ PRİMİ: {req.player_name} için 250.000 € maç primi ödendi. Oyuncunun morali yükseldi!"
    elif req.action == "praise":
        coach["moral"] = min(100, coach.get("moral", 80) + 5)
        if player: player["morale"] = min(100, player.get("morale", 80) + 5)
        msg = f"TEBRİK: Teknik Direktör ve {req.player_name} kutlandı. Soyunma odasında motivasyon arttı."
    elif req.action == "warn":
        if player:
            player["morale"] = max(40, player.get("morale", 80) - 10)
            squad = state["squad"]
            p_idx = next((i for i, x in enumerate(squad) if x["name"] == req.player_name), -1)
            if 0 <= p_idx < 11 and len(squad) > 11:
                squad[p_idx], squad[11] = squad[11], squad[p_idx]
        coach["moral"] = min(100, coach.get("moral", 80) + 3)
        state["squad_harmony"] = min(100, state.get("squad_harmony", 80) + 4)
        msg = f"SERT UYARI: {req.player_name} yetersiz performansı sebebiyle uyarıldı ve yedek kulübesine çekildi."
    elif req.action == "fine":
        state["budget"] += 100_000
        if player: player["morale"] = max(30, player.get("morale", 80) - 15)
        msg = f"PARA CEZASI: Disiplinsizlik sebebiyle {req.player_name}'a 100.000 € ceza kesildi ve kulüp kasasına aktarıldı."
    else:
        msg = "Görüşme tamamlandı."
        
    state["news"].insert(0, msg)
    save_state(state)
    return {"message": msg, "state": state}

# ==================== KULÜP BAŞKANLARIYLA TRANSFER PAZARLIĞI ====================
class ClubBidRequest(BaseModel):
    target_team_id: str
    player_name: str
    bid_fee: int

@app.post("/api/transfer/negotiate-club")
def api_negotiate_club(req: ClubBidRequest):
    state = get_state()
    if not state.get("transfer_window_open", True):
        raise HTTPException(status_code=400, detail="Transfer penceresi şu anda kapalıdır! Yalnızca Yaz Dönemi (1-4. Hafta) ve Kış Dönemi (18-21. Hafta) arasında transfer yapılabilir.")
    if state.get("transfer_ban", False):
        raise HTTPException(status_code=400, detail="Kulübün transfer tahtası mali limit aşımı sebebiyle kapalıdır!")

    target_team = next((t for t in TEAMS_DB if t["id"] == req.target_team_id), None)
    if not target_team:
        raise HTTPException(status_code=404, detail="Kulüp bulunamadı!")

    target_squad = get_team_squad(state, target_team["id"])
    player = next((p for p in target_squad if p["name"] == req.player_name), None)
    if not player:
        raise HTTPException(status_code=404, detail="Oyuncu kulüp kadrosunda bulunamadı!")

    player_val = player.get("val", 30_000_000)
    contract_years = player.get("contract_years", 2)

    # Sözleşmesi 1 yıl kaldıysa indirimli kabul edilir
    min_acceptable = int(player_val * 0.85) if contract_years == 1 else player_val

    if req.bid_fee >= min_acceptable:
        return {
            "status": "club_accepted",
            "message": f"{target_team['name']} Başkanı: 'Teklifinizi kabul ediyoruz Sayın Başkan. Bonservis konusunda anlaştık, artık oyuncuyla görüşebilirsiniz.'",
            "required_wage": int(player.get("wage", 10_000_000) * 1.15),
            "sign_bonus": int(player_val * 0.1)
        }
    else:
        counter_offer = int(player_val * 1.1)
        return {
            "status": "club_rejected",
            "message": f"{target_team['name']} Başkanı: '{req.bid_fee:,} ₺ çok düşük bir teklif! {player['name']} için en az {counter_offer:,} ₺ isteriz.'",
            "counter_fee": counter_offer
        }

class PlayerContractRequest(BaseModel):
    target_team_id: Optional[str] = None
    player_name: str
    bid_fee: int
    offered_wage: int
    sign_bonus: int

@app.post("/api/transfer/sign-negotiated-player")
def api_sign_negotiated_player(req: PlayerContractRequest):
    state = get_state()
    if not state.get("transfer_window_open", True):
        raise HTTPException(status_code=400, detail="Transfer penceresi şu anda kapalıdır! Yalnızca Yaz Dönemi (1-4. Hafta) ve Kış Dönemi (18-21. Hafta) arasında transfer yapılabilir.")
    if state.get("transfer_ban", False):
        raise HTTPException(status_code=400, detail="Kulübün transfer tahtası mali limit aşımı sebebiyle kapalıdır!")

    if any(p.get("name", "").strip().lower() == req.player_name.strip().lower() for p in state.get("squad", [])):
        raise HTTPException(status_code=400, detail=f"'{req.player_name}' zaten kadronuzda yer alıyor! Çift transfer yapılamaz.")

    total_upfront = req.bid_fee + req.sign_bonus
    if state["budget"] < total_upfront:
        raise HTTPException(status_code=400, detail=f"Bütçeniz yetersiz! Gereken anlık nakit: {total_upfront:,} ₺")

    # Oyuncuyu bul (Diğer takımlardan, serbestlerden veya dünya yıldızlarından)
    found_player = None
    source_name = "Transfer Pazarı"

    # 1. Dünya Yıldızları kontrolü
    for s in WORLD_SUPERSTARS:
        if s["name"] == req.player_name:
            found_player = dict(s)
            source_name = "Dünya Yıldızı"
            break

    # 1.5 Yerli Yıldızlar kontrolü
    if not found_player:
        for ts in TURKISH_STARS:
            if ts["name"] == req.player_name:
                found_player = dict(ts)
                source_name = ts.get("current_club", "Avrupa Kulübü")
                break

    # 1.8 Scout Portföyü kontrolü
    if not found_player:
        for sc in SCOUT_PICKS:
            if sc["name"] == req.player_name:
                found_player = dict(sc)
                source_name = sc.get("current_club", "Scout Portföyü")
                break

    # 2. Serbest Oyuncular kontrolü
    if not found_player:
        for f in FREE_AGENTS:
            if f["name"] == req.player_name:
                found_player = dict(f)
                source_name = "Serbest Transfer"
                break

    # 3. Süper Lig takımlarından kontrol
    if not found_player and req.target_team_id:
        target_team = next((t for t in TEAMS_DB if t["id"] == req.target_team_id), None)
        if target_team:
            target_squad = get_team_squad(state, target_team["id"])
            p = next((x for x in target_squad if x["name"] == req.player_name), None)
            if p:
                found_player = dict(p)
                source_name = target_team["name"]
                # Oyuncuyu diğer kulübün canlı kadrosundan çıkar!
                state.setdefault("league_squads", {})[target_team["id"]] = [x for x in target_squad if x["name"] != req.player_name]

    if not found_player:
        raise HTTPException(status_code=404, detail="Oyuncu bulunamadı!")

    # Oyuncu kabul kriteri: Teklif edilen maaş
    min_wage = int(found_player.get("salary", found_player.get("wage", 10_000_000)))
    if req.offered_wage < int(min_wage * 0.9):
        raise HTTPException(status_code=400, detail=f"Oyuncu teklifi reddetti: 'Bu maaş seviyesi kariyer planlarıma uymuyor (En az {min_wage:,} ₺ bekliyor)!'")

    state["budget"] -= total_upfront
    player_data = {
        "name": found_player["name"],
        "pos": found_player["pos"],
        "age": found_player["age"],
        "overall": found_player.get("real_pot", found_player.get("overall", 80)),
        "wage": req.offered_wage,
        "val": found_player.get("price", found_player.get("val", 30_000_000)),
        "contract_years": 3,
        "morale": 95
    }
    if "is_foreign" in found_player:
        player_data["is_foreign"] = found_player["is_foreign"]
    new_entry = enrich_player(player_data)
    state["squad"].append(new_entry)
    state["team_power"] = round(sum(p["overall"] for p in state["squad"][:11]) / 11)
    state["my_radar"] = calculate_team_radar(state["squad"])
    state["fan_trust"] = min(100, state["fan_trust"] + 8)

    msg = f"🔥 YILIN TRANSFERİ: {new_entry['name']} ({new_entry['pos']}), {source_name} kulübünden takımımıza resmen katıldı!"
    state["news"].insert(0, msg)
    save_state(state)
    return {"message": msg, "state": state}

# ==================== KULÜPLERDEN OYUNCU KİRALAMA & PAZARLIK ====================
class LoanNegotiateRequest(BaseModel):
    target_team_id: Optional[str] = None
    club_name: Optional[str] = None
    player_name: str
    offered_fee: int
    wage_coverage_pct: int = 100
    buy_option: Optional[int] = None

@app.post("/api/transfer/negotiate-loan")
def api_negotiate_loan(req: LoanNegotiateRequest):
    state = get_state()
    if not state.get("transfer_window_open", True):
        raise HTTPException(status_code=400, detail="Transfer penceresi şu anda kapalıdır!")
    if state.get("transfer_ban", False):
        raise HTTPException(status_code=400, detail="Kulübün transfer tahtası mali limit aşımı sebebiyle kapalıdır!")

    target_player = None
    target_club_name = req.club_name or "Rakip Kulüp"
    target_squad = None
    
    if req.target_team_id:
        target_team = next((t for t in TEAMS_DB if t["id"] == req.target_team_id), None)
        if target_team:
            target_club_name = target_team["name"]
            target_squad = get_team_squad(state, target_team["id"])
            p_cand = next((p for p in target_squad if p["name"] == req.player_name), None)
            if p_cand:
                target_player = dict(p_cand)

    if not target_player:
        for s in WORLD_SUPERSTARS + TURKISH_STARS + SCOUT_PICKS:
            if s["name"] == req.player_name:
                target_player = dict(s)
                target_club_name = s.get("current_club", target_club_name)
                break

    if not target_player:
        raise HTTPException(status_code=404, detail="Oyuncu bulunamadı!")

    p_val = target_player.get("val", target_player.get("price", 25_000_000))
    p_age = target_player.get("age", 24)
    p_ovr = target_player.get("overall", 75)
    base_wage = target_player.get("salary", target_player.get("wage", 8_000_000))

    # Kural 1: Çok yaşlı ve dokunulmaz süperyıldızlar (29+ yaş ve 84+ güç) kiralık verilmez
    if p_age >= 29 and p_ovr >= 84 and req.offered_fee < int(p_val * 0.22):
        return {
            "status": "rejected",
            "message": f"{target_club_name} Yönetimi: '{target_player['name']} takımımızın vazgeçilmez oyuncularından biridir, kiralık vermeyi düşünmüyoruz.'"
        }

    # Kural 2: Asgari kiralama bedeli kontrolü
    min_loan_fee = max(800_000, int(p_val * (0.05 if p_age <= 23 else 0.08)))
    if req.offered_fee < min_loan_fee:
        counter_fee = max(1_500_000, int(p_val * 0.12))
        return {
            "status": "rejected",
            "message": f"{target_club_name} Yönetimi: '{format_money_val(req.offered_fee)} kiralama bedeli yetersiz. {target_player['name']} için en az {format_money_val(counter_fee)} talep ediyoruz.'",
            "counter_fee": counter_fee
        }

    if req.wage_coverage_pct < 60:
        return {
            "status": "rejected",
            "message": f"{target_club_name} Yönetimi: 'Maaş karşılama oranınız çok düşük! En az %60 maaş karşılama şartımız bulunmaktadır.'"
        }

    wage_to_pay = int(base_wage * (req.wage_coverage_pct / 100.0))
    return {
        "status": "loan_accepted",
        "message": f"{target_club_name} Yönetimi: 'Kiralık teklifiniz kabul edildi. Sözleşme şartlarında mutabık kaldık.'",
        "player_name": target_player["name"],
        "loan_fee": req.offered_fee,
        "wage_coverage_pct": req.wage_coverage_pct,
        "weekly_wage": wage_to_pay,
        "buy_option": req.buy_option
    }

class SignLoanPlayerRequest(BaseModel):
    target_team_id: Optional[str] = None
    club_name: Optional[str] = None
    player_name: str
    loan_fee: int
    wage_coverage_pct: int = 100
    buy_option: Optional[int] = None

@app.post("/api/transfer/sign-loan-player")
def api_sign_loan_player(req: SignLoanPlayerRequest):
    state = get_state()
    if not state.get("transfer_window_open", True):
        raise HTTPException(status_code=400, detail="Transfer penceresi şu anda kapalıdır!")
    if state.get("transfer_ban", False):
        raise HTTPException(status_code=400, detail="Kulübün transfer tahtası mali limit aşımı sebebiyle kapalıdır!")

    if any(p.get("name", "").strip().lower() == req.player_name.strip().lower() for p in state.get("squad", [])):
        raise HTTPException(status_code=400, detail=f"'{req.player_name}' zaten kadronuzda yer alıyor!")

    if state["budget"] < req.loan_fee:
        raise HTTPException(status_code=400, detail=f"Bütçeniz yetersiz! Kiralama bedeli: {req.loan_fee:,} ₺")

    target_player = None
    target_club_name = req.club_name or "Dış Kulüp"
    
    if req.target_team_id:
        target_team = next((t for t in TEAMS_DB if t["id"] == req.target_team_id), None)
        if target_team:
            target_club_name = target_team["name"]
            target_squad = get_team_squad(state, target_team["id"])
            p_found = next((p for p in target_squad if p["name"] == req.player_name), None)
            if p_found:
                target_player = dict(p_found)
                state.setdefault("league_squads", {})[target_team["id"]] = [x for x in target_squad if x["name"] != req.player_name]

    if not target_player:
        for s in WORLD_SUPERSTARS + TURKISH_STARS + SCOUT_PICKS:
            if s["name"] == req.player_name:
                target_player = dict(s)
                target_club_name = s.get("current_club", target_club_name)
                break

    if not target_player:
        raise HTTPException(status_code=404, detail="Oyuncu bulunamadı!")

    base_wage = target_player.get("salary", target_player.get("wage", 8_000_000))
    covered_wage = int(base_wage * (req.wage_coverage_pct / 100.0))

    state["budget"] -= req.loan_fee

    loan_p = enrich_player({
        "name": target_player["name"],
        "pos": target_player["pos"],
        "age": target_player["age"],
        "overall": target_player.get("real_pot", target_player.get("overall", 78)),
        "wage": covered_wage,
        "val": target_player.get("price", target_player.get("val", 25_000_000)),
        "contract_years": 1,
        "morale": 92,
        "is_inbound_loan": True,
        "parent_club": target_club_name,
        "parent_team_id": req.target_team_id,
        "loan_weeks_left": 17,
        "buy_option": req.buy_option
    })
    if "is_foreign" in target_player:
        loan_p["is_foreign"] = target_player["is_foreign"]

    state["squad"].append(loan_p)
    state["team_power"] = round(sum(p["overall"] for p in state["squad"][:11]) / 11)
    state["my_radar"] = calculate_team_radar(state["squad"])
    state["fan_trust"] = min(100, state["fan_trust"] + 5)

    opt_text = f" ({format_money_val(req.buy_option)} satın alma opsiyonuyla)" if req.buy_option else ""
    msg = f"🔄 KİRALIK TRANSFER: {loan_p['name']} ({loan_p['pos']}), {target_club_name} kulübünden {format_money_val(req.loan_fee)} bedelle kiralık olarak takımımıza katıldı{opt_text}!"
    state["news"].insert(0, msg)
    save_state(state)
    return {"message": msg, "state": state}

class BuyLoanOptionRequest(BaseModel):
    player_name: str

@app.post("/api/transfer/buy-loan-option")
def api_buy_loan_option(req: BuyLoanOptionRequest):
    state = get_state()
    player = next((p for p in state["squad"] if p["name"] == req.player_name and p.get("is_inbound_loan")), None)
    if not player:
        raise HTTPException(status_code=404, detail="Kiralık oyuncu veya satın alma opsiyonu bulunamadı!")
    buy_opt = player.get("buy_option")
    if not buy_opt or buy_opt <= 0:
        raise HTTPException(status_code=400, detail="Bu oyuncunun satın alma opsiyonu bulunmuyor!")
    if state["budget"] < buy_opt:
        raise HTTPException(status_code=400, detail=f"Bütçeniz yetersiz! Opsiyon bedeli: {buy_opt:,} ₺")

    state["budget"] -= buy_opt
    player["is_inbound_loan"] = False
    player.pop("parent_club", None)
    player.pop("parent_team_id", None)
    player.pop("buy_option", None)
    player["contract_years"] = 3
    player["morale"] = min(100, player.get("morale", 90) + 10)
    state["fan_trust"] = min(100, state["fan_trust"] + 6)
    
    msg = f"💎 OPSİYON KULLANILDI: {player['name']} için {format_money_val(buy_opt)} ödenerek bonservisi tamamen kulübümüze kazandırıldı! (3 Yıllık Sözleşme)"
    state["news"].insert(0, msg)
    save_state(state)
    return {"message": msg, "state": state}

# ==================== ÖZEL KALEM & BAŞKANLIK DİLEMMALARI HAVUZU ====================
SECRETARY_EVENTS_POOL = [
    {
        "id": "tff_riva_dinner",
        "title": "TFF Riva Gala Yemeği Daveti",
        "secretary_note": "Başkanım, TFF Başkanı ve Kulüpler Birliği sizi Riva Tesisleri'ndeki özel akşam yemeğine davet etti. Hakem atamaları ve yeni yayın ihalesi konuşulacak.",
        "options": [
            {
                "id": "attend",
                "text": "Bizzat Katıl & Lobi Yap",
                "desc": "Kulübün haklarını doğrudan masada savunursunuz.",
                "cost": 15000,
                "effects": {"political_power": 6, "fan_trust": 3, "budget": -15000},
                "result": "Riva'daki yemekte TFF yönetimiyle sıcak temas kurdunuz. Kulübün lobi gücü arttı."
            },
            {
                "id": "send_rep",
                "text": "Asbaşkanı Gönder",
                "desc": "Yoğunluğunuzu gerekçe gösterip temsilci yollarsınız.",
                "cost": 2500,
                "effects": {"budget": -2500},
                "result": "Asbaşkanınız kulübü temsil etti. Standart bir toplantı geçti."
            },
            {
                "id": "boycott",
                "text": "Yemeği Boykot Et & Bildiri Yayınla",
                "desc": "'Adaletsiz düzene alet olmayız!' diyerek gitmezsiniz.",
                "cost": 0,
                "effects": {"fan_trust": 8, "political_power": -7, "media_trust": 5},
                "result": "Boykot kararınız taraftardan büyük alkış aldı! Ancak federasyon yönetimiyle ipler gerildi."
            }
        ]
    },
    {
        "id": "press_confrontation",
        "title": "Tesis Çıkışında Basın Kuşatması",
        "secretary_note": "Başkanım, antrenman tesisi çıkışında çok sayıda muhabir bekliyor. Son transferler ve hakem kararları hakkında mikrofon uzatıyorlar.",
        "options": [
            {
                "id": "hardline",
                "text": "Sert Konuş ('Algı Operasyonu Yapmayın!')",
                "desc": "Medyaya ve rakiplere gözdağı verirsiniz.",
                "cost": 0,
                "effects": {"fan_trust": 6, "media_trust": -6},
                "result": "Açıklamalarınız manşetlere taşındı! Taraftar dik duruşunuzu benimsedi."
            },
            {
                "id": "calm",
                "text": "Sakin & Profesyonel Mesajlar Ver",
                "desc": "Şampiyonluk inancını koruyarak güven veren açıklamalar yaparsınız.",
                "cost": 0,
                "effects": {"media_trust": 6, "fan_trust": 2},
                "result": "Basın olgun ve güven veren tavrınızı övdü. Medyayla ilişkiler toparlandı."
            },
            {
                "id": "no_comment",
                "text": "Gülümse ve 'Yorum Yok' De",
                "desc": "Aracınıza binip konuşmadan uzaklaşırsınız.",
                "cost": 0,
                "effects": {},
                "result": "Soruları yanıtsız bıraktınız, gündem hızla duruldu."
            }
        ]
    },
    {
        "id": "nightclub_scandal",
        "title": "Yıldız Oyuncunun Gece Kaçamağı",
        "secretary_note": "Başkanım, özel kalem istihbaratı: Takımın kilit yıldızlarından biri maçtan iki gece önce Boğaz'daki bir gece kulübünde sabah 04:00'e kadar eğlenirken kameralara yakalandı!",
        "options": [
            {
                "id": "fine_player",
                "text": "60.000 € Ağır Para Cezası Kes",
                "desc": "Disiplin talimatını uygulayıp kulüp kasasına ceza tahsil edersiniz.",
                "cost": 0,
                "effects": {"budget": 60000, "fan_trust": 4},
                "result": "Oyuncuya 60.000 € para cezası kesildi. Takımda disiplin mesajı net şekilde verildi."
            },
            {
                "id": "cover_up",
                "text": "Medyayı Arayıp Haberi Sildir",
                "desc": "Basın danışmanları üzerinden magazin haberini engellersiniz.",
                "cost": 20000,
                "effects": {"budget": -20000, "media_trust": -3},
                "result": "Haber manşetlerden düşürüldü ancak kulüp kasasından 20.000 € basın ilişkileri masrafı çıktı."
            },
            {
                "id": "bench_order",
                "text": "Hocaya Talimat Ver: 'Kulübeye Çekilsin!'",
                "desc": "Oyuncuyu sıradaki maçta kulübeye hapsettirirsiniz.",
                "cost": 0,
                "effects": {"fan_trust": 3},
                "result": "Hoca başkanın talimatıyla oyuncuyu yedeğe çekti. Soyunma odasında ciddiyet arttı."
            }
        ]
    },
    {
        "id": "vip_sponsor_lunch",
        "title": "Holding Patronuyla VIP Loca Görüşmesi",
        "secretary_note": "Başkanım, dev bir holding yönetim kurulu başkanı stadyumun en prestijli locasını kiralamak ve kulübe göğüs/kol desteği vermek için acil öğle yemeği talep ediyor.",
        "options": [
            {
                "id": "agree_deal",
                "text": "Boğaz'da Ağırla & Anlaşmayı İmzala",
                "desc": "Sponsoru özel olarak ağırlayıp anlaşmayı bağlarsınız.",
                "cost": 10000,
                "effects": {"budget": 240000, "fan_trust": 2},
                "result": "Yemek harika geçti! Holding kulübe 250.000 € nakit sponsorluk ödedi (10.000 € ziyafet masrafı)."
            },
            {
                "id": "hard_bargain",
                "text": "Fiyatı Artır (Pazarlık Yap)",
                "desc": "Yüksekten uçarak daha büyük para koparmaya çalışırsınız.",
                "cost": 0,
                "effects": {"budget": 350000},
                "result": "Holding patronu kulübün büyüklüğüne saygı duyup 350.000 €'ya imza attı!"
            },
            {
                "id": "decline",
                "text": "Daha İyi Teklif Bekle",
                "desc": "Teklifi yeterli bulmayıp masadan kalkarsınız.",
                "cost": 0,
                "effects": {},
                "result": "Görüşme sonuçsuz kaldı. Alternatif sponsor arayışı sürüyor."
            }
        ]
    },
    {
        "id": "pitch_turf_crisis",
        "title": "Stadyum Zemininde Acil Çim Krizi",
        "secretary_note": "Başkanım, stadyum müdüründen acil rapor var: Aşırı yağışlar ve drenaj tıkanması yüzünden zemin balçığa dönüştü. Hoca ve futbolcular sakatlık endişesiyle isyanda.",
        "options": [
            {
                "id": "hybrid_turf",
                "text": "Hollanda'dan Hibrit Çim Getirt (85.000 €)",
                "desc": "En üst standart hibrit çim serilir, sakatlık riski sıfırlanır.",
                "cost": 85000,
                "effects": {"budget": -85000, "fan_trust": 5},
                "result": "Yeni hibrit zemin serildi! Oyuncular ve teknik heyet zemine hayran kaldı."
            },
            {
                "id": "patch_up",
                "text": "Ekonomik Yama ve Havalandırma Yap (20.000 €)",
                "desc": "Mevcut çimi kurtaracak geçici müdahale yapılır.",
                "cost": 20000,
                "effects": {"budget": -20000},
                "result": "Zemin idare edecek seviyeye getirildi, maliyet düşük tutuldu."
            },
            {
                "id": "ignore",
                "text": "Masraf Yapma ('Olduğu Gibi Oynansın')",
                "desc": "Kasadaki parayı harcamayı reddedersiniz.",
                "cost": 0,
                "effects": {"fan_trust": -3},
                "result": "Zemin bozuk kaldı. Maç öncesi teknik direktör basın toplantısında zeminden şikayet etti."
            }
        ]
    },
    {
        "id": "referee_assignment_storm",
        "title": "MHK Tartışmalı Hakemi Atadı!",
        "secretary_note": "Başkanım, Merkez Hakem Kurulu sıradaki kritik maçımıza taraftarımızın sabıkalı gördüğü hakemi atadı. Sosyal medya ayağa kalktı, kulüpten açıklama bekleniyor.",
        "options": [
            {
                "id": "fire_statement",
                "text": "Zehir Zemberek Resmi Bildiri Yayınla",
                "desc": "'Düdüğünü astırırız!' tonunda sert bir bildiri geçer.",
                "cost": 0,
                "effects": {"fan_trust": 10, "political_power": -5, "media_trust": 5},
                "result": "Resmi sitenizdeki bildiri milyonlarca etkileşim aldı! Camia arkanızda kenetlendi."
            },
            {
                "id": "call_federation",
                "text": "TFF Başkanını Doğrudan Ara",
                "desc": "Kulislere inip kapalı kapılar ardında hakem hakkında garanti istersiniz.",
                "cost": 0,
                "effects": {"political_power": 5},
                "result": "TFF Başkanı dikkatli olunacağı sözünü verdi. Kulise hakimiyetiniz takdir edildi."
            },
            {
                "id": "stay_silent",
                "text": "Sessiz Kal & 'Sahada Konuşacağız' De",
                "desc": "Hakem polemiğine girmeyip takımı motive edersiniz.",
                "cost": 0,
                "effects": {"fan_trust": -2, "media_trust": 3},
                "result": "Polemikten uzak durdunuz, takım maça konsantre oldu."
            }
        ]
    },
    {
        "id": "board_opposition_revolt",
        "title": "Divan Kurulu Muhalefeti Hesap Soruyor",
        "secretary_note": "Başkanım, kulübün eski yöneticileri ve muhalif divan üyeleri kulüp lokalinde toplanmış. 'Maaş bütçesi ve transfer harcamaları nereye gidiyor?' diye kazan kaldırıyorlar.",
        "options": [
            {
                "id": "host_dinner",
                "text": "Büyük Bir Ziyafet Verip Gönüllerini Al",
                "desc": "Lüks restoranda ağırlayıp projelerinizi anlatırsınız.",
                "cost": 15000,
                "effects": {"budget": -15000, "political_power": 8},
                "result": "Muhalifler ziyafetten mest ayrıldı. Başkanlık otoriteniz perçinlendi."
            },
            {
                "id": "show_numbers",
                "text": "Mali Tabloları Yüzlerine Çarp",
                "desc": "Kulübün şeffaf hesaplarıyla muhalefeti susturursunuz.",
                "cost": 0,
                "effects": {"political_power": 6, "media_trust": 4},
                "result": "Net finansal sunumunuz muhalefeti susturdu, camiada takdir topladınız."
            },
            {
                "id": "dismiss",
                "text": "'Biz İşimize Bakıyoruz' Diyerek Muhatap Alma",
                "desc": "Muhalifleri kale almazsınız.",
                "cost": 0,
                "effects": {"political_power": -6},
                "result": "Muhalif üyeler basına sızdırarak yönetimi eleştirmeye devam etti."
            }
        ]
    }
]

# ==================== OYUN TAKVİMİ & GÜN İLERLETME ENDPOINTS ====================
def advance_calendar_day_internal(state: Dict[str, Any]) -> Dict[str, Any]:
    season = state.get("season", 1)
    cur_date_str = state.get("current_date", "2026-08-10")
    try:
        cur_dt = datetime.date.fromisoformat(cur_date_str)
    except Exception:
        cur_dt = datetime.date(2026, 8, 10)
    
    next_dt = cur_dt + datetime.timedelta(days=1)
    state["current_date"] = next_dt.isoformat()

    # Döviz Kuru Dalgalanması (1 € = X ₺)
    cur_rate = state.get("exchange_rate", 38.5)
    if random.random() < 0.25:
        drift = round(random.uniform(-0.06, 0.12), 2)
        state["exchange_rate"] = round(max(34.0, cur_rate + drift), 2)
    
    # Transfer penceresi kontrolü
    tw_details = get_transfer_window_details(state["current_date"], season)
    window_open = tw_details["is_open"]
    prev_window_open = state.get("transfer_window_open", False)
    state["transfer_window_open"] = window_open
    state["transfer_window"] = tw_details
    state["transfer_day"] = tw_details.get("days_left", 1)

    # Pencere kapandı mı / açıldı mı bülteni
    if prev_window_open and not window_open:
        state["news"].insert(0, f"🛑 TRANSFER DÖNEMİ KAPANDI! ({format_turkish_date(state['current_date'])}) Transfer tahtası kapandı.")
    elif not prev_window_open and window_open:
        state["news"].insert(0, f"🔥 ARA TRANSFER DÖNEMİ AÇILDI! ({format_turkish_date(state['current_date'])}) Kulüpler masaya oturuyor.")

    # Transfer penceresi açıksa CPU transferleri & gelen teklif simülasyonu
    new_bid = None
    if window_open:
        if random.random() < 0.25:
            simulate_cpu_transfers(state, count=1)
        if state.get("squad") and random.random() < 0.22 and len(state.get("incoming_bids", [])) < 3:
            new_bid = generate_squad_incoming_bid(state)

    # Sıradaki fikstür kontrolü
    cur_week = state.get("week", 1)
    next_fix = next((f for f in state.get("fixtures", []) if f["week"] == cur_week and not f.get("played")), None)
    
    is_matchday = False
    if next_fix and state["current_date"] == next_fix.get("date"):
        is_matchday = True

    # Sekreterya & Özel Kalem Olayı (Günün Olayı)
    secretary_ev = None
    if not is_matchday and not state.get("pending_secretary_event") and random.random() < 0.28:
        ev_proto = random.choice(SECRETARY_EVENTS_POOL)
        secretary_ev = copy.deepcopy(ev_proto)
        state["pending_secretary_event"] = secretary_ev
        state["secretary_agenda"] = f"Önemli Görüşme: {secretary_ev['title']}"
        state.setdefault("secretary_inbox", []).insert(0, {
            "date": state["current_date"],
            "title": secretary_ev["title"],
            "note": secretary_ev["secretary_note"]
        })
        if len(state["secretary_inbox"]) > 10:
            state["secretary_inbox"] = state["secretary_inbox"][:10]
    elif not state.get("pending_secretary_event"):
        weekday_num = next_dt.weekday()
        weekday_names = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]
        day_name = weekday_names[weekday_num]
        if is_matchday and next_fix:
            state["secretary_agenda"] = f"MAÇ GÜNÜ: {next_fix['opponent']} karşılaşması için stadyum hazırlandı."
        else:
            default_agendas = [
                f"{day_name} mesaisi: Tesislerde antrenman takibi ve idari işler yürütülüyor.",
                f"{day_name} mesaisi: Basın bülteni incelendi, sponsor temsilcileriyle iletişim sağlandı.",
                f"{day_name} mesaisi: Finans departmanı nakit akışını ve döviz kurunu kontrol etti.",
                f"{day_name} mesaisi: Altyapı antrenörleri genç yetenek gelişim raporunu iletti."
            ]
            state["secretary_agenda"] = random.choice(default_agendas)

    return {
        "current_date": state["current_date"],
        "is_matchday": is_matchday,
        "next_fix": next_fix,
        "new_bid": new_bid,
        "window_open": window_open,
        "secretary_event": secretary_ev
    }

@app.get("/api/calendar")
def api_get_calendar():
    state = get_state()
    season = state.get("season", 1)
    cur_date_str = state.get("current_date", "2026-08-10")
    cur_week = state.get("week", 1)
    
    next_fix = next((f for f in state.get("fixtures", []) if f["week"] == cur_week and not f.get("played")), None)
    window_details = get_transfer_window_details(cur_date_str, season)
    is_matchday = bool(next_fix and cur_date_str == next_fix.get("date"))

    return {
        "current_date": cur_date_str,
        "current_date_formatted": format_turkish_date(cur_date_str),
        "current_date_full": format_turkish_date_full(cur_date_str),
        "season": season,
        "week": cur_week,
        "max_weeks": state.get("max_weeks", 34),
        "transfer_window": window_details,
        "next_fixture": next_fix,
        "is_matchday": is_matchday,
        "fixtures": state.get("fixtures", []),
        "exchange_rate": state.get("exchange_rate", 38.5),
        "secretary_agenda": state.get("secretary_agenda", ""),
        "pending_secretary_event": state.get("pending_secretary_event"),
        "secretary_inbox": state.get("secretary_inbox", [])
    }

@app.post("/api/calendar/advance-day")
def api_calendar_advance_day():
    state = get_state()
    cur_week = state.get("week", 1)
    next_fix = next((f for f in state.get("fixtures", []) if f["week"] == cur_week and not f.get("played")), None)

    # Eğer bugün zaten maç günüyse ve maç oynanmadıysa durdur
    if next_fix and state.get("current_date") == next_fix.get("date"):
        return {
            "status": "stopped",
            "stopped_reason": "must_play_match",
            "message": f"Bugün maç günü! {next_fix['opponent']} karşılaşmasına çıkmadan bir sonraki güne geçemezsiniz.",
            "state": state
        }

    res = advance_calendar_day_internal(state)
    msg = f"Tarih: {format_turkish_date_full(state['current_date'])}"
    stopped_reason = "normal"
    
    if res.get("secretary_event"):
        stopped_reason = "secretary_event"
        msg = f"ÖZEL KALEM BİLDİRİMİ: {res['secretary_event']['title']}"
    elif res["is_matchday"]:
        stopped_reason = "matchday"
        msg = f"MAÇ GÜNÜ! {res['next_fix']['opponent']} ile karşılaşma günü geldi!"
        state["news"].insert(0, msg)
    elif res["new_bid"]:
        stopped_reason = "incoming_bid"
        msg = f"TRANSFER TEKLİFİ! {res['new_bid']['player_name']} için {res['new_bid']['club']} kulübünden teklif var!"
        state["news"].insert(0, msg)

    save_state(state)
    return {
        "status": "ok",
        "stopped_reason": stopped_reason,
        "message": msg,
        "state": state
    }

class AdvanceToDateReq(BaseModel):
    target_date: str

@app.post("/api/calendar/advance-to-date")
def api_calendar_advance_to_date(req: AdvanceToDateReq):
    state = get_state()
    cur_dt = datetime.date.fromisoformat(state.get("current_date", "2026-08-10"))
    try:
        tgt_dt = datetime.date.fromisoformat(req.target_date)
    except Exception:
        raise HTTPException(status_code=400, detail="Geçersiz tarih formatı (YYYY-MM-DD bekleniyor)!")

    if tgt_dt <= cur_dt:
        raise HTTPException(status_code=400, detail="Hedef tarih bugünden ileri bir tarih olmalıdır!")

    days_to_advance = min((tgt_dt - cur_dt).days, 90)
    stopped_reason = "target_reached"
    stop_msg = f"📅 {format_turkish_date(tgt_dt.isoformat())} tarihine ulaşıldı."

    for _ in range(days_to_advance):
        # Maç günü kontrolü
        cur_week = state.get("week", 1)
        next_fix = next((f for f in state.get("fixtures", []) if f["week"] == cur_week and not f.get("played")), None)
        if next_fix and state.get("current_date") == next_fix.get("date"):
            stopped_reason = "matchday"
            stop_msg = f"MAÇ GÜNÜ GELDİ! ({next_fix['opponent']} karşılaşması)"
            break

        step_res = advance_calendar_day_internal(state)

        if step_res.get("secretary_event"):
            stopped_reason = "secretary_event"
            stop_msg = f"ÖZEL KALEM BİLDİRİMİ: {step_res['secretary_event']['title']}"
            break

        if step_res["new_bid"]:
            stopped_reason = "incoming_bid"
            stop_msg = f"TRANSFER TEKLİFİ! {step_res['new_bid']['player_name']} için resmi teklif geldi!"
            break

        if step_res["is_matchday"]:
            stopped_reason = "matchday"
            stop_msg = f"MAÇ GÜNÜ GELDİ! ({step_res['next_fix']['opponent']} karşılaşması)"
            break

    save_state(state)
    return {
        "status": "ok",
        "stopped_reason": stopped_reason,
        "message": stop_msg,
        "state": state
    }

@app.post("/api/calendar/advance-to-matchday")
def api_calendar_advance_to_matchday():
    state = get_state()
    cur_week = state.get("week", 1)
    next_fix = next((f for f in state.get("fixtures", []) if f["week"] == cur_week and not f.get("played")), None)
    if not next_fix:
        raise HTTPException(status_code=400, detail="Oynanacak maç bulunamadı!")
    
    tgt_date = next_fix.get("date")
    if not tgt_date or tgt_date <= state.get("current_date", ""):
        return {"status": "ok", "stopped_reason": "already_matchday", "message": "Zaten maç günündesiniz!", "state": state}

    req = AdvanceToDateReq(target_date=tgt_date)
    return api_calendar_advance_to_date(req)

# ==================== ÖZEL KALEM & SEKRETERYA ENDPOINTS ====================
class SecretaryEventResponseReq(BaseModel):
    event_id: str
    option_id: str

@app.post("/api/secretary/respond-event")
def api_secretary_respond_event(req: SecretaryEventResponseReq):
    state = get_state()
    ev = state.get("pending_secretary_event")
    if not ev or ev.get("id") != req.event_id:
        state["pending_secretary_event"] = None
        save_state(state)
        return {"status": "ok", "message": "Karar kayda geçti.", "state": state}

    selected_opt = next((o for o in ev.get("options", []) if o.get("id") == req.option_id), None)
    if not selected_opt:
        state["pending_secretary_event"] = None
        save_state(state)
        return {"status": "ok", "message": "Karar kayda geçti.", "state": state}

    # Efektleri uygula
    effects = selected_opt.get("effects", {})
    if "budget" in effects:
        state["budget"] += effects["budget"]
    if "fan_trust" in effects:
        state["fan_trust"] = max(0, min(100, state["fan_trust"] + effects["fan_trust"]))
    if "political_power" in effects:
        state["political_power"] = max(0, min(100, state.get("political_power", 50) + effects["political_power"]))
    if "media_trust" in effects:
        state["media_trust"] = max(0, min(100, state.get("media_trust", 50) + effects["media_trust"]))

    result_text = selected_opt.get("result", "Kararınız uygulandı.")
    state["news"].insert(0, f"💼 BAŞKANLIK KARARI: {result_text}")
    state["secretary_agenda"] = f"Son Karar: {ev['title']} ({selected_opt['text']})"
    state["pending_secretary_event"] = None

    save_state(state)
    return {
        "status": "ok",
        "message": result_text,
        "state": state
    }

# ==================== GERÇEK TRANSFER PAZARLIĞI & AYARTMA ====================
class CustomNegotiateRequest(BaseModel):
    player_name: str
    target_team_id: Optional[str] = None
    bid_fee: int
    offered_wage: int
    sign_bonus: int = 0

@app.post("/api/transfer/custom-negotiate")
def api_custom_negotiate(req: CustomNegotiateRequest):
    state = get_state()
    if not state.get("transfer_window_open", True):
        raise HTTPException(status_code=400, detail="Transfer penceresi şu anda kapalıdır!")
    if state.get("transfer_ban", False):
        raise HTTPException(status_code=400, detail="Kulübün transfer tahtası mali limit aşımı sebebiyle kapalıdır!")

    if any(p.get("name", "").strip().lower() == req.player_name.strip().lower() for p in state.get("squad", [])):
        raise HTTPException(status_code=400, detail=f"'{req.player_name}' zaten kadronuzda yer alıyor!")

    found_player = None
    source_club = "Transfer Pazarı"

    if req.target_team_id:
        target_team = next((t for t in TEAMS_DB if t["id"] == req.target_team_id), None)
        if target_team:
            target_squad = get_team_squad(state, target_team["id"])
            p = next((x for x in target_squad if x["name"].strip().lower() == req.player_name.strip().lower()), None)
            if p:
                found_player = dict(p)
                source_club = target_team["name"]

    if not found_player:
        for t in TEAMS_DB:
            target_squad = get_team_squad(state, t["id"])
            p = next((x for x in target_squad if x["name"].strip().lower() == req.player_name.strip().lower()), None)
            if p:
                found_player = dict(p)
                source_club = t["name"]
                req.target_team_id = t["id"]
                break

    if not found_player:
        all_sources = WORLD_SUPERSTARS + TURKISH_STARS + SCOUT_PICKS + FREE_AGENTS
        for item in all_sources:
            if item.get("name", "").strip().lower() == req.player_name.strip().lower():
                found_player = dict(item)
                source_club = item.get("club") or item.get("current_club") or "Transfer Pazarı"
                break

    if not found_player:
        for club, players in EUROPEAN_CLUBS_MARKET.items():
            for ep in players:
                if ep.get("name", "").strip().lower() == req.player_name.strip().lower():
                    found_player = dict(ep)
                    found_player["price"] = ep.get("val", 30_000_000)
                    found_player["salary"] = ep.get("wage", 5_000_000)
                    source_club = club
                    break
            if found_player:
                break

    if not found_player:
        raise HTTPException(status_code=404, detail="Oyuncu bulunamadı!")

    player_val = found_player.get("price") or found_player.get("val", 25_000_000)
    player_wage = found_player.get("salary") or found_player.get("wage", 3_000_000)

    # Ayartılmışsa değer %35 düşer
    if found_player.get("is_tapped_up") or state.get("tapped_up_players", {}).get(found_player["name"]):
        player_val = int(player_val * 0.65)

    min_acceptable_fee = int(player_val * 0.85)
    min_acceptable_wage = int(player_wage * 0.85)

    total_upfront = req.bid_fee + req.sign_bonus
    if state["budget"] < total_upfront:
        raise HTTPException(status_code=400, detail=f"Bütçeniz yetersiz! Kasada {state['budget']:,} € var, gereken peşinat: {total_upfront:,} €")

    if req.bid_fee >= min_acceptable_fee and req.offered_wage >= min_acceptable_wage:
        state["budget"] -= total_upfront
        if req.target_team_id:
            target_squad = get_team_squad(state, req.target_team_id)
            state.setdefault("league_squads", {})[req.target_team_id] = [x for x in target_squad if x["name"] != found_player["name"]]

        player_data = {
            "name": found_player["name"],
            "pos": found_player["pos"],
            "age": found_player["age"],
            "overall": found_player.get("real_pot", found_player.get("overall", 80)),
            "wage": req.offered_wage,
            "val": player_val,
            "contract_years": 3,
            "morale": 95
        }
        if "is_foreign" in found_player:
            player_data["is_foreign"] = found_player["is_foreign"]
        new_entry = enrich_player(player_data)
        state["squad"].append(new_entry)
        state["team_power"] = round(sum(p["overall"] for p in state["squad"][:11]) / 11)
        state["my_radar"] = calculate_team_radar(state["squad"])
        state["fan_trust"] = min(100, state["fan_trust"] + 8)

        msg = f"Anlaşma Sağlandı: {new_entry['name']}, {source_club} kulübünden {format_money_val(req.bid_fee)} bonservis ve yıllık {format_money_val(req.offered_wage)} maaşla kadromuza katıldı."
        state["news"].insert(0, msg)
        save_state(state)
        return {
            "status": "accepted",
            "message": msg,
            "state": state
        }
    elif req.bid_fee < int(player_val * 0.5):
        return {
            "status": "insult_rejected",
            "message": f"{source_club} Yönetimi: 'Teklifiniz piyasa gerçeklerinden çok uzak. Bu şartlarda masada kalamayız.'",
            "counter_fee": player_val,
            "counter_wage": player_wage
        }
    else:
        counter_fee = int(player_val * 1.05) if req.bid_fee < min_acceptable_fee else req.bid_fee
        counter_wage = int(player_wage * 1.1) if req.offered_wage < min_acceptable_wage else req.offered_wage
        return {
            "status": "counter_offer",
            "message": f"{source_club} ve oyuncu temsilcisi karşı teklif sundu: Bonservis için {format_money_val(counter_fee)}, yıllık maaş için {format_money_val(counter_wage)} talep ediliyor.",
            "counter_fee": counter_fee,
            "counter_wage": counter_wage
        }

class TapUpPlayerRequest(BaseModel):
    player_name: str
    target_team_id: Optional[str] = None
    bribe_bonus: int = 150_000

@app.post("/api/transfer/tap-up-player")
def api_tap_up_player(req: TapUpPlayerRequest):
    state = get_state()
    if not state.get("transfer_window_open", True):
        raise HTTPException(status_code=400, detail="Transfer penceresi kapalıyken ön görüşme yapılamaz!")

    if not req.target_team_id:
        for t in TEAMS_DB:
            target_squad = get_team_squad(state, t["id"])
            if any(x["name"].strip().lower() == req.player_name.strip().lower() for x in target_squad):
                req.target_team_id = t["id"]
                break

    if state["budget"] < req.bribe_bonus:
        raise HTTPException(status_code=400, detail=f"Temsilciyle özel temas ve imza ön ödemesi için bütçe yetersiz ({format_money_val(req.bribe_bonus)})!")

    state["budget"] -= req.bribe_bonus

    success_chance = 0.65 + (state.get("political_power", 50) - 50) * 0.003
    roll = random.random()

    if roll < success_chance:
        state.setdefault("tapped_up_players", {})[req.player_name] = True
        msg = f"Ön Temas Başarılı: {req.player_name} ve menajeriyle prensipte anlaşıldı. Oyuncunun ayrılık talebi sonrası kulüp bonservis beklentisini %35 indirdi."
        state["news"].insert(0, msg)
        save_state(state)
        return {
            "status": "success",
            "message": msg,
            "discount_pct": 35,
            "state": state
        }
    else:
        penalty_fee = 450_000
        state["budget"] = max(0, state["budget"] - penalty_fee)
        state["political_power"] = max(0, state.get("political_power", 50) - 12)
        state["fan_trust"] = max(0, state.get("fan_trust", 50) - 6)
        msg = f"Usulsüz Görüşme Skandalı: {req.player_name} cephesiyle temas basına sızdı. TFF kulübümüze {format_money_val(penalty_fee)} para cezası kesti."
        state["news"].insert(0, msg)
        save_state(state)
        return {
            "status": "scandal",
            "message": msg,
            "penalty_fee": penalty_fee,
            "state": state
        }

@app.post("/api/transfer/advance-day")
def api_transfer_advance_day():
    return api_calendar_advance_day()

class RespondBidRequest(BaseModel):
    bid_id: str
    action: str # 'accept', 'reject', 'counter'

@app.post("/api/transfer/respond-incoming-bid")
def api_respond_incoming_bid(req: RespondBidRequest):
    state = get_state()
    bids = state.get("incoming_bids", [])
    bid = next((b for b in bids if b["id"] == req.bid_id), None)
    if not bid:
        raise HTTPException(status_code=404, detail="Teklif bulunamadı!")

    player = next((p for p in state["squad"] if p["name"] == bid["player_name"]), None)
    if not player:
        raise HTTPException(status_code=404, detail="Oyuncu kadroda bulunamadı!")

    if req.action in ["accept", "counter"]:
        # TFF Asgari Kadro & Kaleci Kuralı
        if len(state["squad"]) <= 14:
            raise HTTPException(status_code=400, detail="TFF Asgari Kadro Kuralı: Kadronuzda en az 14 profesyonel futbolcu bulunmak zorundadır! Daha fazla oyuncu satışı yapamazsınız.")
        if is_gk(player) and sum(1 for p in state["squad"] if is_gk(p)) <= 1:
            raise HTTPException(status_code=400, detail="TFF Kuralı: Takımda en az 1 kaleci bulunmak zorundadır! Kadronuzdaki tek kaleciyi satamazsınız.")

    # Alıcı kulüp Süper Lig takımı mı kontrol et
    buying_team = next((t for t in TEAMS_DB if t["name"] == bid["club"] or t["id"] == bid.get("target_team_id")), None)
    is_loan = (bid.get("bid_type") == "loan")

    if req.action == "accept":
        if is_loan:
            loan_fee = bid.get("loan_fee") or bid.get("offer_val", 0)
            state["budget"] += loan_fee
            state["squad"] = [p for p in state["squad"] if p["name"] != player["name"]]
            
            # Kiralık havuzuna kaydet
            loan_entry = {
                "name": player["name"],
                "pos": player["pos"],
                "age": player.get("age", 22),
                "overall": player["overall"],
                "loan_club": bid["club"],
                "league": "Süper Lig / Dış Lig",
                "weeks_left": bid.get("duration_weeks", 15),
                "minutes_played": 0,
                "matches_played": 0,
                "growth": 0,
                "original_wage": player.get("wage", 3_000_000),
                "saved_wage": int(player.get("wage", 3_000_000) * (bid.get("wage_coverage_pct", 100) / 100.0)),
                "buy_option": bid.get("buy_option")
            }
            state.setdefault("loaned_players", []).append(loan_entry)
            
            if buying_team:
                b_squad = get_team_squad(state, buying_team["id"])
                b_squad.append(enrich_player(dict(player)))
                state.setdefault("league_squads", {})[buying_team["id"]] = b_squad

            opt_str = f" ({format_money_val(bid['buy_option'])} opsiyonla)" if bid.get("buy_option") else ""
            msg = f"🤝 KİRALAMA ANLAŞMASI: {player['name']} ({player['pos']}), {format_money_val(loan_fee)} kiralama bedeliyle {bid['club']} kulübüne kiralandı{opt_str}! (Maaşın %{bid.get('wage_coverage_pct', 100)}'ü karşılanacak)"
        else:
            state["budget"] += bid["offer_val"]
            state["squad"] = [p for p in state["squad"] if p["name"] != player["name"]]
            if buying_team:
                b_squad = get_team_squad(state, buying_team["id"])
                b_squad.append(enrich_player(dict(player)))
                state.setdefault("league_squads", {})[buying_team["id"]] = b_squad
                msg = f"🚨 LİG İÇİ FLAŞ SATIŞ: {player['name']}, {format_money_val(bid['offer_val'])} karşılığında doğrudan rakibimiz {buying_team['name']} kadrosuna katıldı!"
            else:
                msg = f"💰 OYUNCU SATILDI: {player['name']}, {format_money_val(bid['offer_val'])} karşılığında {bid['club']} kulübüne transfer oldu!"

        state["squad"] = rebalance_and_validate_squad(state["squad"], state.get("club_name", ""))
        state["team_power"] = round(sum(p["overall"] for p in state["squad"][:11]) / 11)
        state["my_radar"] = calculate_team_radar(state["squad"])
        state["incoming_bids"] = [b for b in state.get("incoming_bids", []) if b["id"] != bid["id"]]

        if state.get("captain_name") == player["name"]:
            new_captain = get_captain_name(state["squad"])
            state["captain_name"] = new_captain
            state["news"].insert(0, f"🎖️ YENİ KAPTAN: {player['name']}'ın takımdan ayrılmasıyla kaptanlık pazubandı {new_captain}'a devredildi.")

    elif req.action == "counter":
        if is_loan:
            loan_fee = bid.get("loan_fee") or bid.get("offer_val", 0)
            # %55 şansla kiralama bedeli artışı kabul edilir (+%30)
            if random.random() < 0.55:
                extra = int(loan_fee * 1.30)
                state["budget"] += extra
                state["squad"] = [p for p in state["squad"] if p["name"] != player["name"]]
                loan_entry = {
                    "name": player["name"],
                    "pos": player["pos"],
                    "age": player.get("age", 22),
                    "overall": player["overall"],
                    "loan_club": bid["club"],
                    "league": "Süper Lig / Dış Lig",
                    "weeks_left": bid.get("duration_weeks", 15),
                    "minutes_played": 0,
                    "matches_played": 0,
                    "growth": 0,
                    "original_wage": player.get("wage", 3_000_000),
                    "saved_wage": int(player.get("wage", 3_000_000) * (bid.get("wage_coverage_pct", 100) / 100.0)),
                    "buy_option": bid.get("buy_option")
                }
                state.setdefault("loaned_players", []).append(loan_entry)
                if buying_team:
                    b_squad = get_team_squad(state, buying_team["id"])
                    b_squad.append(enrich_player(dict(player)))
                    state.setdefault("league_squads", {})[buying_team["id"]] = b_squad
                state["squad"] = rebalance_and_validate_squad(state["squad"], state.get("club_name", ""))
                state["team_power"] = round(sum(p["overall"] for p in state["squad"][:11]) / 11)
                state["my_radar"] = calculate_team_radar(state["squad"])
                state["incoming_bids"] = [b for b in state.get("incoming_bids", []) if b["id"] != bid["id"]]
                msg = f"🤝 KİRALIK PAZARLIĞI BAŞARILI: {bid['club']} artırdığımız kiralama bedelini kabul etti! {player['name']} {format_money_val(extra)} bedelle kiralandı!"
            else:
                state["incoming_bids"] = [b for b in state.get("incoming_bids", []) if b["id"] != bid["id"]]
                msg = f"❌ {bid['club']} artırılan kiralama bedelini yüksek bularak kiralık teklifini geri çekti."
        else:
            # Bonservis pazarlığı (%50 şansla kabul)
            if random.random() < 0.50:
                extra = int(bid["offer_val"] * 1.25)
                state["budget"] += extra
                state["squad"] = [p for p in state["squad"] if p["name"] != player["name"]]
                state["squad"] = rebalance_and_validate_squad(state["squad"], state.get("club_name", ""))
                state["team_power"] = round(sum(p["overall"] for p in state["squad"][:11]) / 11)
                state["my_radar"] = calculate_team_radar(state["squad"])
                state["incoming_bids"] = [b for b in state.get("incoming_bids", []) if b["id"] != bid["id"]]

                if state.get("captain_name") == player["name"]:
                    new_captain = get_captain_name(state["squad"])
                    state["captain_name"] = new_captain
                    state["news"].insert(0, f"🎖️ YENİ KAPTAN: {player['name']}'ın takımdan ayrılmasıyla kaptanlık pazubandı {new_captain}'a devredildi.")

                if buying_team:
                    b_squad = get_team_squad(state, buying_team["id"])
                    b_squad.append(enrich_player(dict(player)))
                    state.setdefault("league_squads", {})[buying_team["id"]] = b_squad
                    msg = f"🤝 PAZARLIK BAŞARILI: {bid['club']} artırdığımız teklifi kabul etti! {player['name']} {format_money_val(extra)} bedelle {buying_team['name']} kadrosuna katıldı!"
                else:
                    msg = f"🤝 PAZARLIK BAŞARILI: {bid['club']} artırdığımız teklifi kabul etti! {player['name']} {format_money_val(extra)} bedelle satıldı!"
            else:
                state["incoming_bids"] = [b for b in state.get("incoming_bids", []) if b["id"] != bid["id"]]
                msg = f"❌ {bid['club']} karşı teklifimizi çok bularak masadan kalktı. Transfer iptal oldu."
    else: # reject
        state["incoming_bids"] = [b for b in state.get("incoming_bids", []) if b["id"] != bid["id"]]
        val_name = "kiralık" if is_loan else "bonservis"
        val_amt = bid.get("loan_fee") if is_loan else bid.get("offer_val")
        msg = f"🚫 TEKLİF REDDEDİLDİ: {player['name']} için {bid['club']} tarafından iletilen {format_money_val(val_amt)} {val_name} teklifi geri çevrildi."

    state["news"].insert(0, msg)
    save_state(state)
    return {"message": msg, "state": state}

    state["news"].insert(0, msg)
    save_state(state)
    return {"message": msg, "state": state}

# ==================== TRANSFER MARKET (DÜNYA YILDIZLARI, YERLİ YILDIZLAR, SCOUT & SERBESTLER) ====================
@app.get("/api/transfer/market")
def api_transfer_market():
    state = get_state()
    # Kendi kadromuzdaki ve kiralıktaki oyuncuların normalize edilmiş adları
    squad_names = {p.get("name", "").strip().lower() for p in state.get("squad", []) if p.get("name")}
    loaned_names = {p.get("name", "").strip().lower() for p in state.get("loaned_players", []) if p.get("name")}
    my_names = squad_names | loaned_names

    # Kendi kadromuzdaki ve kiralıktaki oyuncuları pazardan filtrele
    filtered_stars = [p for p in WORLD_SUPERSTARS if p.get("name", "").strip().lower() not in my_names]
    filtered_turkish = [p for p in TURKISH_STARS if p.get("name", "").strip().lower() not in my_names]
    filtered_free = [p for p in FREE_AGENTS if p.get("name", "").strip().lower() not in my_names]
    filtered_scouts = [p for p in SCOUT_PICKS if p.get("name", "").strip().lower() not in my_names]

    return {
        "world_stars": [enrich_player(dict(p)) for p in filtered_stars],
        "turkish_stars": [enrich_player(dict(p)) for p in filtered_turkish],
        "free_agents": [enrich_player(dict(p)) for p in filtered_free],
        "scout_picks": [enrich_player(dict(p)) for p in filtered_scouts]
    }

# ==================== SEZON GEÇİŞİ & SEÇİM ====================
class ElectionVoteRequest(BaseModel):
    promise: str # 'stadium', 'stars', 'financial_discipline'

@app.post("/api/election/run")
def api_run_election(req: ElectionVoteRequest):
    state = get_state()
    if not state.get("election_pending"):
        raise HTTPException(status_code=400, detail="Şu anda aktif bir başkanlık seçimi yok!")

    base_vote = int((state["board_trust"] * 0.5) + (state["fan_trust"] * 0.4))
    if req.promise == "stadium":
        base_vote += 8
    elif req.promise == "stars":
        base_vote += 10
    else:
        base_vote += 6

    user_votes = min(88, max(25, base_vote + random.randint(-4, 4)))
    opp_votes = 100 - user_votes
    won = user_votes >= 50
    state["election_pending"] = False

    if won:
        state["board_trust"] = min(100, state["board_trust"] + 15)
        state["fan_trust"] = min(100, state["fan_trust"] + 10)
        state["election_result"] = {
            "won": True,
            "user_votes": user_votes,
            "opp_votes": opp_votes,
            "msg": f"TEBRİKLER! Oyların %{user_votes}'ini alarak yeniden kulüp başkanı seçildiniz!"
        }
        state["news"].insert(0, f"🏛️ KONGRE SONUCU: Başkan {state['president_name']} güven tazeledi (%{user_votes})!")
    else:
        state["election_result"] = {
            "won": False,
            "user_votes": user_votes,
            "opp_votes": opp_votes,
            "msg": f"KAYBETTİNİZ! Muhalefet oyların %{opp_votes}'ini alarak başkanlığı kazandı."
        }
        state["is_started"] = False
        state["news"].insert(0, f"⚡ SEÇİMDE ŞOK: Muhalefet adayı seçimi kazandı!")

    save_state(state)
    return {"result": state["election_result"], "state": state}

@app.post("/api/season/next")
def api_next_season():
    state = get_state()
    if not state.get("season_finished"):
        if state.get("week") == 1 and state.get("fixtures"):
            return state
        elif state.get("week", 1) > state.get("max_weeks", 34):
            state["season_finished"] = True
        else:
            raise HTTPException(status_code=400, detail="Mevcut sezon henüz bitmedi!")

    state["season"] = state.get("season", 1) + 1
    state["week"] = 1
    state["max_weeks"] = 34
    state["season_finished"] = False
    state["season_result"] = None
    state["election_result"] = None
    state["election_pending"] = False

    state["fixtures"] = generate_fixtures(state["club_name"], TEAMS_DB)
    state["standings"] = generate_initial_standings(TEAMS_DB)
    state["transfer_window_open"] = True
    state["transfer_day"] = 1
    state["transfer_max_days"] = 10

    # Yeni sezonda tüm oyuncuların kondisyonunu yenile
    for p in state.get("squad", []):
        p["stamina"] = 100
        p["minutes_played"] = 0
        p["matches_played"] = 0

    # Yeni sezon öncesi ligdeki rakipler büyük transfer hamleleri yapar
    simulate_cpu_transfers(state, count=4)

    # Borç durumu kontrolü (Kullanıcı borcu kapattıysa yeni sezonda asla 500M borçla başlamaz!)
    cur_debt = state.get("debt", 0)
    bc = state.setdefault("bank_consortium", {})
    if cur_debt <= 0:
        state["debt"] = 0
        bc["total_debt"] = 0
        bc["sanction_level"] = 0
        bc["unpaid_weeks"] = 0
        state["transfer_ban"] = False
        state["news"].insert(0, "✨ MALİ BAĞIMSIZLIK: Borçsuz kulübümüz yeni sezona sıfır borçla tertemiz başladı!")
    else:
        bc["total_debt"] = cur_debt

    # Kiralıktan dönen oyuncuları kadroya geri dahil et
    returning_loans = []
    still_loaned = []
    for lp in state.get("loaned_players", []):
        if lp.get("weeks_left", 0) <= 0:
            p_obj = enrich_player({
                "name": lp["name"],
                "pos": lp["pos"],
                "age": lp.get("age", 21) + 1,
                "overall": lp["overall"],
                "wage": lp.get("original_wage", 5_000_000),
                "val": int(lp["overall"] * 800_000)
            })
            p_obj["minutes_played"] = 0
            p_obj["matches_played"] = 0
            state["squad"].append(p_obj)
            returning_loans.append(f"{lp['name']} (+{lp.get('growth', 0)} OVR)")
        else:
            still_loaned.append(lp)
    state["loaned_players"] = still_loaned
    if returning_loans:
        state["news"].insert(0, f"🔙 KİRALIKTAN DÖNÜŞ: {', '.join(returning_loans)} gelişimini tamamlayarak as kadroya katıldı!")

    # Bize kiralık gelen oyuncuları ana kulüplerine geri gönder (Opsiyonu kullanılmamış olanlar)
    returned_inbound = []
    kept_squad = []
    for p in state.get("squad", []):
        if p.get("is_inbound_loan"):
            parent = p.get("parent_club", "Dış Kulüp")
            returned_inbound.append(f"{p['name']} ({parent})")
            if p.get("parent_team_id"):
                p_clean = dict(p)
                p_clean.pop("is_inbound_loan", None)
                p_clean.pop("parent_club", None)
                p_clean.pop("parent_team_id", None)
                p_clean.pop("buy_option", None)
                state.setdefault("league_squads", {}).setdefault(p["parent_team_id"], []).append(enrich_player(p_clean))
        else:
            kept_squad.append(p)
    state["squad"] = kept_squad
    if returned_inbound:
        state["news"].insert(0, f"👋 KİRALIK SÖZLEŞMESİ BİTENLER: {', '.join(returned_inbound)} kiralık sözleşmeleri bittiği için ana kulüplerine geri döndüler.")

    # Yeni sezon taze sponsor teklifleri
    state["incoming_sponsor_offers"] = generate_incoming_sponsor_offers(state, 3)

    state["news"].insert(0, f"📅 {state['season']}. Sezon (34 Hafta) fikstürü çekildi, maraton başladı!")
    save_state(state)
    return state

# ==================== DİĞER KLASİK SERVİSLER ====================
@app.get("/api/scout/candidates")
def api_scout_candidates():
    return SCOUT_CANDIDATES

@app.get("/api/sponsors/available")
def api_get_sponsors():
    state = get_state()
    active_sponsors = state.get("finances", {}).get("active_sponsors", [])
    active_types = {s.get("type") for s in active_sponsors}
    active_ids = {s.get("id") for s in active_sponsors}

    # Mevcut lig sıralaması
    rank = 1
    for i, s in enumerate(state.get("standings", [])):
        if s["name"] == state.get("club_name"):
            rank = i + 1
            break

    result = []
    for sp in AVAILABLE_SPONSORS:
        item = dict(sp)
        item["is_signed"] = (item["id"] in active_ids) or (item["type"] in active_types)

        # Kriter Kontrolü
        can_sign = True
        reason_unmet = ""

        if sp.get("req_fan") and state.get("fan_trust", 50) < sp["req_fan"]:
            can_sign = False
            reason_unmet = f"Taraftar güveni yetersiz (%{state.get('fan_trust', 50)} / %{sp['req_fan']} gerekli)"
        elif sp.get("req_rank") and rank > sp["req_rank"]:
            can_sign = False
            reason_unmet = f"Lig sıralaması yetersiz ({rank}. sıradasınız, ilk {sp['req_rank']} gerekli)"
        elif sp.get("req_stadium") and state.get("stadium_capacity", 25000) < sp["req_stadium"]:
            can_sign = False
            reason_unmet = f"Stadyum kapasitesi yetersiz ({state.get('stadium_capacity', 25000):,} / {sp['req_stadium']:,} gerekli)"
        elif sp.get("req_board") and state.get("board_trust", 50) < sp["req_board"]:
            can_sign = False
            reason_unmet = f"Kongre güveni yetersiz (%{state.get('board_trust', 50)} / %{sp['req_board']} gerekli)"
        elif sp.get("req_no_debt_limit") and state.get("budget", 0) < -30_000_000:
            can_sign = False
            reason_unmet = "Kulüp borç sınırını aşmış durumda (Transfer/Mali kısıt)"

        item["can_sign"] = can_sign
        item["reason_unmet"] = reason_unmet
        result.append(item)
    return result

class SignSponsorRequest(BaseModel):
    sponsor_id: str

@app.post("/api/sponsors/sign")
def api_sign_sponsor(req: SignSponsorRequest):
    state = get_state()
    sp = next((s for s in AVAILABLE_SPONSORS if s["id"] == req.sponsor_id), None)
    if not sp:
        raise HTTPException(status_code=404, detail="Sponsor bulunamadı!")

    finances = state.setdefault("finances", {})
    active = finances.setdefault("active_sponsors", [])

    for existing in active:
        if existing.get("id") == sp["id"]:
            raise HTTPException(status_code=400, detail=f"{sp['name']} anlaşması zaten aktif! Sezon sonuna kadar geçerlidir.")
        if existing.get("type") == sp.get("type"):
            type_tr = {"chest": "Göğüs", "stadium": "Stadyum", "back": "Forma Sırt", "arm": "Forma Kol & Şort", "health": "Sağlık"}.get(sp.get("type"), "Bu alanda")
            raise HTTPException(status_code=400, detail=f"{type_tr} sponsoru olarak zaten '{existing.get('name')}' ile sözleşmeniz var! Birden fazla sponsor bağlanamaz.")

    # Kriter doğrulama
    rank = 1
    for i, s in enumerate(state.get("standings", [])):
        if s["name"] == state.get("club_name"):
            rank = i + 1
            break

    if sp.get("req_fan") and state.get("fan_trust", 50) < sp["req_fan"]:
        raise HTTPException(status_code=400, detail=f"Sponsor kriteri karşılanamadı: Taraftar güveni en az %{sp['req_fan']} olmalıdır.")
    if sp.get("req_rank") and rank > sp["req_rank"]:
        raise HTTPException(status_code=400, detail=f"Sponsor kriteri karşılanamadı: Takımınız ligde ilk {sp['req_rank']} sırada olmalıdır.")
    if sp.get("req_stadium") and state.get("stadium_capacity", 25000) < sp["req_stadium"]:
        raise HTTPException(status_code=400, detail=f"Sponsor kriteri karşılanamadı: Stadyum kapasitesi en az {sp['req_stadium']:,} olmalıdır.")
    if sp.get("req_board") and state.get("board_trust", 50) < sp["req_board"]:
        raise HTTPException(status_code=400, detail=f"Sponsor kriteri karşılanamadı: Kongre güveni en az %{sp['req_board']} olmalıdır.")
    if sp.get("req_no_debt_limit") and state.get("budget", 0) < -30_000_000:
        raise HTTPException(status_code=400, detail="Sponsor kriteri karşılanamadı: Kulübün mali limit aşımı bulunuyor.")

    upfront = int(sp["income_season"] * 0.40)
    weekly_payout = int((sp["income_season"] * 0.60) / 34)
    state["budget"] += upfront
    active.append({
        "id": sp["id"],
        "type": sp["type"],
        "name": sp["name"],
        "income_season": sp["income_season"],
        "upfront": upfront,
        "weekly_payout": weekly_payout,
        "downside": sp.get("downside", "")
    })
    msg = f"✍️ RESMİ SPONSORLUK: {sp['name']} kulübümüzle 1 sezonluk anlaşma imzaladı (+{format_money_val(upfront)} peşin, haftalık +{format_money_val(weekly_payout)})!"
    state["news"].insert(0, msg)
    save_state(state)
    return {"message": msg, "state": state}

# ==================== SCOUT ŞEFİ KOVMA & İŞE ALMA ====================
@app.post("/api/scout/fire")
def api_scout_fire():
    state = get_state()
    scout = state.get("scout") or state.get("club_scout")
    if not scout or scout.get("is_vacant"):
        raise HTTPException(status_code=400, detail="Mevcut bir scout şefi zaten bulunmuyor!")
    tazminat = 2_000_000
    if state["budget"] < tazminat:
        raise HTTPException(status_code=400, detail="Scout ekibini kovmak için 2.000.000 ₺ fesih tazminatı kasada bulunmalıdır!")
    state["budget"] -= tazminat
    old_name = scout.get("name", "Scout Şefi")
    vacant = {
        "id": "vacant",
        "name": "Kadro Boş (Scout Aranıyor)",
        "role": "Görevde kimse yok",
        "rating": 50,
        "salary": 0,
        "region": "-",
        "is_vacant": True
    }
    state["scout"] = vacant
    state["club_scout"] = vacant
    msg = f"🚪 Scout Şefi {old_name} ile yollar ayrıldı (2M ₺ fesih tazminatı ödendi). Yeni bir scout şefi istihdam edebilirsiniz."
    state["news"].insert(0, msg)
    save_state(state)
    return {"message": msg, "state": state}

class HireScoutRequest(BaseModel):
    scout_id: str

@app.post("/api/scout/hire")
def api_scout_hire(req: HireScoutRequest):
    state = get_state()
    cand = next((c for c in SCOUT_CANDIDATES if c["id"] == req.scout_id), None)
    if not cand:
        raise HTTPException(status_code=404, detail="Aday bulunamadı!")
    peşinat = cand["salary"] // 4
    if state["budget"] < peşinat:
        raise HTTPException(status_code=400, detail=f"Scout şefinin ilk peşinatı için kasada en az {format_money_val(peşinat)} nakit bulunmalıdır!")
    state["budget"] -= peşinat
    state["scout"] = dict(cand)
    state["club_scout"] = dict(cand)
    msg = f"👔 Yeni Scout Şefi: {cand['name']} ({cand['role']} - %{cand['rating']}) kulübümüzde göreve başladı!"
    state["news"].insert(0, msg)
    save_state(state)
    return {"message": msg, "state": state}

class UndergroundDealRequest(BaseModel):
    deal_type: str

@app.post("/api/underground/deal")
def api_underground_deal(req: UndergroundDealRequest):
    state = get_state()
    ug = state["underground"]
    if ug.get("active_deal"):
        raise HTTPException(status_code=400, detail="Zaten sıradaki maç için bir anlaşma var!")

    if req.deal_type == "referee":
        cost = 18_000_000
        if state["budget"] < cost:
            raise HTTPException(status_code=400, detail="Yetersiz bütçe (18M ₺)!")
        state["budget"] -= cost
        ug["active_deal"] = {"type": "referee", "name": "Hakem Heyetini Bağlama", "success_rate": 88, "risk": 18}
    elif req.deal_type == "opponent_gk":
        cost = 26_000_000
        if state["budget"] < cost:
            raise HTTPException(status_code=400, detail="Yetersiz bütçe (26M ₺)!")
        state["budget"] -= cost
        ug["active_deal"] = {"type": "opponent_gk", "name": "Rakip Kaleciye Çanta Para", "success_rate": 94, "risk": 28}

    save_state(state)
    return {"message": "Karanlık anlaşma sağlandı. Çanta teslim edildi.", "state": state}

def calculate_dynamic_betting_odds(state: Dict[str, Any]) -> Dict[str, Any]:
    cur_fixture = next((f for f in state.get("fixtures", []) if f["week"] == state.get("week", 1)), None)
    if not cur_fixture:
        opp_name = "Rakip"
        opp_power = 75
        is_home = True
    else:
        opp_name = cur_fixture["opponent"]
        is_home = cur_fixture.get("is_home", True)
        opp_team = next((t for t in TEAMS_DB if t["name"] == opp_name or t["id"] == opp_name), None)
        opp_power = opp_team.get("power", 75) if opp_team else 75

    my_power = state.get("team_power", 75)
    diff = my_power - opp_power
    if is_home:
        diff += 4  # Ev sahibi avantajı

    win_odds = max(1.25, min(4.50, round(1.85 - (diff * 0.05), 2)))
    opp_win_odds = max(1.30, min(6.50, round(2.80 + (diff * 0.08), 2)))
    over35_odds = max(1.80, min(3.80, round(2.35 + (0.05 if opp_power > 80 else -0.05), 2)))
    ht_ft_odds = max(3.00, min(7.50, round(4.10 + (abs(diff) * 0.04), 2)))
    btts_odds = max(1.50, min(2.60, round(1.75 + (0.04 if diff > 5 else -0.03), 2)))
    ht_draw_odds = max(1.90, min(3.20, round(2.15 + (0.03 if abs(diff) < 3 else -0.02), 2)))
    red_card_odds = 3.65
    goals_2_3_odds = 2.05

    return {
        "opponent": opp_name,
        "is_home": is_home,
        "my_power": my_power,
        "opp_power": opp_power,
        "diff": diff,
        "markets": {
            "win": {
                "title": f"🟢 {state.get('club_name')} Galibiyeti",
                "odds": win_odds,
                "risk_pct": 14 if diff >= 0 else 26,
                "desc": f"{'İç saha avantajıyla ' if is_home else 'Deplasmanda '}temiz 3 puan senaryosu"
            },
            "btts_yes": {
                "title": "⚽ Karşılıklı Gol Var (KG Var)",
                "odds": btts_odds,
                "risk_pct": 16,
                "desc": "İki takımın da kaleleri havalandıracağı açık futbol senaryosu"
            },
            "first_half_draw": {
                "title": "🤝 İlk Yarı Beraberlik",
                "odds": ht_draw_odds,
                "risk_pct": 18,
                "desc": "İlk 45 dakikanın temkinli ve kilitli geçeceği taktik savaşı"
            },
            "total_goals_2_3": {
                "title": "🎯 Toplam 2-3 Gol",
                "odds": goals_2_3_odds,
                "risk_pct": 15,
                "desc": "Süper Lig ortalamasında kontrollü ve dengeli skor kuponu"
            },
            "over35": {
                "title": "🔥 3.5 Gol Üstü (En az 4 gol)",
                "odds": over35_odds,
                "risk_pct": 22,
                "desc": "Savunmaların çöktüğü, karşılıklı gollü çılgın maç senaryosu"
            },
            "red_card": {
                "title": "🟥 Maçta Kırmızı Kart Çıkar",
                "odds": red_card_odds,
                "risk_pct": 28,
                "desc": "Hakemin oyundan ihraç kararı vereceği gergin ve sert 90 dakika"
            },
            "ht_ft": {
                "title": "⚡ İY Yenik / MS Galibiyet (1/2 Çevirme)",
                "odds": ht_ft_odds,
                "risk_pct": 34,
                "desc": "Ağır şike ve hakem operasyonu ile ters köşe çevirme"
            },
            "opponent_win": {
                "title": f"🔴 {opp_name} Galibiyeti (Maçı Sat / Ters Kupon)",
                "odds": opp_win_odds,
                "risk_pct": 38,
                "desc": "Kendi takımının mağlubiyetine karanlık kasa kuponu yatır (Yüksek Kazanç, Ağır Taraftar İsyanı Riski!)"
            }
        }
    }

@app.get("/api/underground/odds")
def api_underground_odds():
    state = get_state()
    odds_calc = calculate_dynamic_betting_odds(state)
    markets_list = []
    for k, v in odds_calc["markets"].items():
        markets_list.append({
            "type": k,
            "title": v["title"],
            "odds": v["odds"],
            "risk_pct": v["risk_pct"],
            "desc": v["desc"]
        })
    return {
        "opponent": odds_calc["opponent"],
        "is_home": odds_calc["is_home"],
        "my_power": odds_calc["my_power"],
        "opp_power": odds_calc["opp_power"],
        "active_bet": state.get("underground", {}).get("active_bet"),
        "markets": markets_list
    }

class UndergroundBetRequest(BaseModel):
    bet_type: str
    amount: int

@app.post("/api/underground/bet")
def api_underground_bet(req: UndergroundBetRequest):
    state = get_state()
    ug = state.setdefault("underground", {})
    if ug.get("active_bet"):
        raise HTTPException(status_code=400, detail="Zaten sıradaki maç için aktif bir yasadışı kuponunuz var!")

    if req.amount < 5_000_000:
        raise HTTPException(status_code=400, detail="Minimum yasadışı bahis tutarı 5M ₺'dir!")
    if state["budget"] < req.amount:
        raise HTTPException(status_code=400, detail="Yetersiz bütçe! Kasada bu kadar nakit para yok.")

    odds_calc = calculate_dynamic_betting_odds(state)
    bet_info = odds_calc["markets"].get(req.bet_type)
    if not bet_info:
        raise HTTPException(status_code=400, detail="Geçersiz bahis türü!")

    state["budget"] -= req.amount
    potential_payout = int(req.amount * bet_info["odds"])

    ug["active_bet"] = {
        "bet_type": req.bet_type,
        "title": bet_info["title"],
        "amount": req.amount,
        "odds": bet_info["odds"],
        "potential_payout": potential_payout,
        "risk_pct": bet_info["risk_pct"],
        "week": state["week"]
    }

    save_state(state)
    return {
        "message": f"Karanlık kupon yapıldı! Yatırılan: {format_money_val(req.amount)} • Oran: {bet_info['odds']}x • Olası Kazanç: {format_money_val(potential_payout)}",
        "state": state
    }

# ==================== TARAFTAR SOSYAL MEDYA & TRİBÜN SESİ ====================
@app.get("/api/fans/social-feed")
def api_fans_social_feed():
    state = get_state()
    fan_trust = state.get("fan_trust", 50)
    club = state.get("club_name", "Kulüp")
    coach_name = state.get("coach", {}).get("name", "Hoca")

    rank = 1
    for i, s in enumerate(state.get("standings", [])):
        if s["name"] == club:
            rank = i + 1
            break

    posts = []
    if rank == 1:
        posts.append({
            "author": f"@{club.replace(' ', '').lower()}_fanatik",
            "name": f"{club} Sevdalısı",
            "tag": "Tribün",
            "text": f"Lideriz lider! Bu sene o kupa bu müzeye gelecek inşallah! 🏆🔥",
            "likes": 3410,
            "sentiment": "positive",
            "time": "10dk önce"
        })
    elif rank <= 4:
        posts.append({
            "author": "@tribun_lideri",
            "name": "Tribün Gözü",
            "tag": "Tribün Lideri",
            "text": f"{rank}. sıradayız ama oyun tatmin etmiyor. {coach_name} takımı daha hücumcu oynatmalı!",
            "likes": 1820,
            "sentiment": "neutral",
            "time": "25dk önce"
        })
    else:
        posts.append({
            "author": "@öfkeli_taraftar",
            "name": "Arma Uğruna",
            "tag": "Kongre Üyesi",
            "text": f"{rank}. sırada olmak bu büyük armaya hakarettir! Yönetim transfer yapsın, hoca da aklını başına alsın!",
            "likes": 4200,
            "sentiment": "negative",
            "time": "5dk önce"
        })

    if state.get("transfer_window_open", False):
        posts.append({
            "author": "@transfer_nobeti",
            "name": "Transfer Merkezi",
            "tag": "Gazeteci",
            "text": f"KULİS: {club} yönetimi Avrupa devlerinden elit oyuncularla masada! Taraftar dünya çapında forvet ve stoper bekliyor.",
            "likes": 2150,
            "sentiment": "positive",
            "time": "1sa önce"
        })
    else:
        posts.append({
            "author": "@genc_tribun",
            "name": "Gençlik Kolları",
            "tag": "Taraftar",
            "text": "Altyapı akademisindeki genç pırlantalara daha çok şans verilsin! Geleceğimiz özkaynağımızda.",
            "likes": 1280,
            "sentiment": "neutral",
            "time": "2sa önce"
        })

    if fan_trust >= 75:
        posts.append({
            "author": "@baskanin_yanindayiz",
            "name": "Büyük Arma",
            "tag": "Taraftar",
            "text": f"Büyük Başkan arkandayız! Kulübün mali disiplini ve vizyonu 10 numara. Kapalı gişe oynamaya devam!",
            "likes": 3100,
            "sentiment": "positive",
            "time": "3sa önce"
        })
    else:
        posts.append({
            "author": "@bilet_pahali",
            "name": "Halkın Takımı",
            "tag": "Taraftar",
            "text": "Bilet ve kombine fiyatları cep yakıyor! Yönetim acil öğrenci ve aile tribünü indirimi getirmeli.",
            "likes": 2450,
            "sentiment": "negative",
            "time": "4sa önce"
        })

    return {
        "fan_trust": fan_trust,
        "club_rank": rank,
        "feed": posts,
        "demands": [
            "🏆 Lig şampiyonluğu veya ilk 3 garantisi",
            "⚽ Hücum futbolu ve bol gollü galibiyetler",
            "🌍 Avrupa kulüplerinden elit yabancı transferleri",
            "🎟️ Makul bilet ve forma fiyatları"
        ]
    }

# ==================== TEKNİK DİREKTÖR TRANSFER TAVSİYESİ ====================
# ==================== TEKNİK DİREKTÖR TRANSFER TAVSİYESİ ====================
@app.get("/api/coach/transfer-recommendation")
def api_coach_transfer_recommendation():
    state = get_state()
    squad = state.get("squad", [])
    coach = state.get("coach", {})
    squad_names = {p.get("name", "") for p in squad}
    budget = max(15_000_000, state.get("budget", 40_000_000))

    # İlk 11 mevkilerinin gerçek güç ortalamalarını ve en zayıf noktasını tespit et
    starter_pos_map = {}
    for p in squad[:11]:
        sp = to_fifa_pos(p.get("pos", ""))
        starter_pos_map.setdefault(sp, []).append(p.get("overall", 75))
    
    starter_strength = {}
    for pos in ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST"]:
        ratings = starter_pos_map.get(pos, [])
        if ratings:
            starter_strength[pos] = sum(ratings) / len(ratings)
        else:
            starter_strength[pos] = 68 # İlk 11'de bu mevkide oyuncu yoksa acil açık!
    
    # En düşük reytingli ilk 11 mevkisini seç
    sorted_needs = sorted(starter_strength.items(), key=lambda x: x[1])
    target_pos, lowest_ovr = sorted_needs[0]

    reasons_dict = {
        "GK": "Kalede güven veren, refleksleri üst düzey bir file bekçisi önceliğimiz olmalı.",
        "CB": "Stoper hattımız hava toplarında ve rakip kontra ataklarda çok açık veriyor.",
        "LB": "Sol bekte savunmayı toparlayacak ve çizgiye inecek tempolu bir isme ihtiyacımız var.",
        "RB": "Sağ bekte hücum bindirmesi yapacak ve kanadı kapatacak modern bir bek şart.",
        "CDM": "Savunma önünde rakip atakları süpürecek fizikli bir 6 numara (Ön Libero) gerekiyor.",
        "CM": "Orta sahada pas trafiğini yönetecek ve oyunu iki yönlü oynayacak bir maestroya ihtiyacımız var.",
        "CAM": "Forvet arkasında kilit pas atacak ve skor yükünü çekecek bir 10 numara eksikliği çekiyoruz.",
        "LW": "Sol kanatta adam eksiltecek ve ceza sahasına sokulacak patlayıcı bir kanat forvet lazım.",
        "RW": "Sağ kanatta bire birde etkili, içeri kat edip şut çeken bir kanat hücumcusu arıyoruz.",
        "ST": "Gol yollarında tıkanıyoruz. Bitirici ve güçlü bir santrafor şart."
    }

    reason = reasons_dict.get(target_pos, "Takımımızın zayıf kalan bu mevkisine doğrudan ilk 11 oyuncusu öneriyorum.")
    if lowest_ovr >= 82:
        reason = f"İlk 11'imiz dengeli görünse de uzun maratonda {target_pos} mevkisinde kalite ve rotasyon derinliğine ihtiyacımız var."

    # Aday havuzu (Bütçeye uygun, mantıklı adaylar)
    all_potential_candidates = []
    max_affordable_val = int(budget * 1.35)
    max_affordable_wage = max(6_000_000, int(budget * 0.35))

    for club, p_list in EUROPEAN_CLUBS_MARKET.items():
        for p in p_list:
            if to_fifa_pos(p.get("pos", "")) == target_pos and p.get("name") not in squad_names:
                all_potential_candidates.append({
                    "name": p["name"],
                    "club": club,
                    "pos": target_pos,
                    "overall": p.get("overall", 80),
                    "val": p.get("val", 35_000_000),
                    "wage": p.get("wage", 10_000_000)
                })

    for p in FREE_AGENTS:
        if to_fifa_pos(p.get("pos", "")) == target_pos and p.get("name") not in squad_names:
            all_potential_candidates.append({
                "name": p["name"],
                "club": "Serbest",
                "pos": target_pos,
                "overall": p.get("real_pot", p.get("claimed_pot", 80)),
                "val": 0,
                "wage": p.get("salary", 15_000_000)
            })

    for p in TURKISH_STARS:
        if to_fifa_pos(p.get("pos", "")) == target_pos and p.get("name") not in squad_names:
            all_potential_candidates.append({
                "name": p["name"],
                "club": p.get("current_club", "Avrupa Kulübü"),
                "pos": target_pos,
                "overall": p.get("real_pot", 84),
                "val": p.get("price", 35_000_000),
                "wage": p.get("salary", 15_000_000)
            })

    # Bütçeye uygun olanları önceliklendir (Fahiş fiyatlı yıldızları ele)
    affordable = [c for c in all_potential_candidates if c.get("val", 0) <= max_affordable_val and c.get("wage", 0) <= max_affordable_wage]
    if not affordable:
        affordable = sorted(all_potential_candidates, key=lambda x: x.get("val", 999_999_999))[:3]
    
    rec_players = sorted(affordable, key=lambda x: x["overall"], reverse=True)[:3]
    while len(rec_players) < 3:
        target_ovr = min(84, max(76, round(lowest_ovr + 3)))
        t_val = int(target_ovr * random.randint(280_000, 390_000))
        t_wage = int(target_ovr * random.randint(70_000, 110_000))
        rec_players.append({
            "name": f"Scout Radarı {target_pos} Hedefi",
            "club": "Avrupa Scout Havuzu",
            "pos": target_pos,
            "overall": target_ovr,
            "val": t_val,
            "wage": t_wage
        })

    # Mevki güç ortalamaları
    gk_ovr = max((p.get("overall", 70) for p in squad if is_gk(p)), default=70)
    defs = [p.get("overall", 70) for p in squad if to_fifa_pos(p.get("pos", "")) in ["CB", "LB", "RB"]]
    def_avg = (sum(defs) / len(defs)) if defs else 70
    mids = [p.get("overall", 70) for p in squad if to_fifa_pos(p.get("pos", "")) in ["CDM", "CM", "CAM"]]
    mid_avg = (sum(mids) / len(mids)) if mids else 70
    fwds = [p.get("overall", 70) for p in squad if to_fifa_pos(p.get("pos", "")) in ["LW", "RW", "ST"]]
    fwd_avg = (sum(fwds) / len(fwds)) if fwds else 70

    return {
        "coach_name": coach.get("name", "Teknik Direktör"),
        "target_pos": target_pos,
        "reason": reason,
        "ratings": {
            "gk": round(gk_ovr),
            "def": round(def_avg),
            "mid": round(mid_avg),
            "fwd": round(fwd_avg)
        },
        "candidates": rec_players
    }

# ==================== OYUNCU KİRALAMA SERVİSLERİ ====================
@app.get("/api/players/loan-list")
def api_loan_list():
    state = get_state()
    squad = state.get("squad", [])
    loaned = state.get("loaned_players", [])
    candidates = []
    for idx, p in enumerate(squad):
        is_young = p.get("age", 25) <= 24 or "Altyapı" in p.get("name", "")
        is_bench = (idx >= 11)
        if is_young or is_bench:
            candidates.append({
                "id": idx,
                "name": p["name"],
                "pos": p["pos"],
                "position": p["pos"],
                "age": p.get("age", 21),
                "overall": p.get("overall", 72),
                "wage": p.get("wage", 2_000_000),
                "salary": p.get("wage", 2_000_000),
                "is_starter": (idx < 11)
            })
    return {
        "candidates": candidates,
        "eligible": candidates,
        "loaned": loaned,
        "active_loans": loaned,
        "clubs": POTENTIAL_LOAN_CLUBS,
        "potential_clubs": POTENTIAL_LOAN_CLUBS
    }

class LoanOutRequest(BaseModel):
    player_name: Optional[str] = None
    player_id: Optional[Any] = None
    club_name: Optional[str] = None
    club: Optional[str] = None
    weeks: Optional[int] = None
    duration_weeks: Optional[int] = None

@app.post("/api/players/loan-out")
def api_loan_out(req: LoanOutRequest):
    state = get_state()
    squad = state.get("squad", [])
    target_name = req.player_name
    if not target_name and req.player_id is not None:
        try:
            p_idx = int(req.player_id)
            if 0 <= p_idx < len(squad):
                target_name = squad[p_idx]["name"]
        except (ValueError, TypeError):
            pass
    if not target_name:
        raise HTTPException(status_code=400, detail="Kiralığa gönderilecek oyuncu belirtilmedi!")

    player_idx = next((i for i, p in enumerate(squad) if p["name"] == target_name), None)
    if player_idx is None:
        raise HTTPException(status_code=404, detail="Oyuncu kadroda bulunamadı!")

    if len(squad) <= 14:
        raise HTTPException(status_code=400, detail="TFF Asgari Kadro Kuralı: Kadronuzda en az 14 profesyonel futbolcu kalmalıdır!")

    player = squad.pop(player_idx)
    target_club_name = req.club_name or req.club or POTENTIAL_LOAN_CLUBS[0]["name"]
    target_club = next((c for c in POTENTIAL_LOAN_CLUBS if c["name"] == target_club_name), POTENTIAL_LOAN_CLUBS[0])
    weeks_val = req.weeks or req.duration_weeks or 17

    loan_entry = {
        "name": player["name"],
        "pos": player["pos"],
        "position": player["pos"],
        "age": player.get("age", 20),
        "overall": player["overall"],
        "original_ovr": player["overall"],
        "loan_club": target_club["name"],
        "league": target_club["league"],
        "weeks_left": weeks_val,
        "loan_weeks_left": weeks_val,
        "minutes_played": 0,
        "loan_minutes_played": 0,
        "matches_played": 0,
        "loan_matches_played": 0,
        "growth": 0,
        "original_wage": player.get("wage", 3_000_000),
        "saved_wage": int(player.get("wage", 3_000_000) * target_club.get("wage_cover", 1.0))
    }

    state.setdefault("loaned_players", []).append(loan_entry)
    state["squad"] = squad
    state["team_power"] = round(sum(p["overall"] for p in state["squad"][:11]) / 11) if len(state["squad"]) >= 11 else 70
    state["my_radar"] = calculate_team_radar(state["squad"])

    msg = f"🤝 KİRALAMA ANLAŞMASI: {player['name']} ({player['pos']}), {weeks_val} haftalığına {target_club['name']} kulübüne kiralandı! Oyuncunun maaş yükünden kurtulduk ve düzenli 90 dk süre alacak."
    state["news"].insert(0, msg)
    save_state(state)
    return {"message": msg, "state": state}

class RecallLoanRequest(BaseModel):
    player_name: Optional[str] = None
    player_id: Optional[Any] = None

@app.post("/api/players/recall-loan")
def api_recall_loan(req: RecallLoanRequest):
    state = get_state()
    loaned = state.get("loaned_players", [])
    target_name = req.player_name
    if not target_name and req.player_id is not None:
        try:
            lp_i = int(req.player_id)
            if 0 <= lp_i < len(loaned):
                target_name = loaned[lp_i]["name"]
        except (ValueError, TypeError):
            pass
    if not target_name:
        raise HTTPException(status_code=400, detail="Geri çağrılacak kiralık oyuncu belirtilmedi!")

    lp_idx = next((i for i, p in enumerate(loaned) if p["name"] == target_name), None)
    if lp_idx is None:
        raise HTTPException(status_code=404, detail=f"'{target_name}' isimli kiralık oyuncu kaydı bulunamadı!")

    fee = 4_000_000
    if state["budget"] < fee:
        raise HTTPException(status_code=400, detail=f"Bütçeniz yetersiz! Kiralıktan erken çağırma fesih bedeli: {format_money_val(fee)} (Mevcut Kasa: {format_money_val(state['budget'])})")

    state["budget"] -= fee
    lp = loaned.pop(lp_idx)

    restored_p = enrich_player({
        "name": lp["name"],
        "pos": lp.get("pos") or lp.get("position", "CM"),
        "age": lp.get("age", 21),
        "overall": lp["overall"],
        "wage": lp.get("original_wage", 3_000_000),
        "val": int(lp["overall"] * 850_000)
    })
    restored_p["minutes_played"] = lp.get("minutes_played", 0)
    restored_p["matches_played"] = lp.get("matches_played", 0)

    state["squad"].append(restored_p)
    state["squad"] = rebalance_and_validate_squad(state["squad"], state.get("club_name", ""))
    state["team_power"] = round(sum(p["overall"] for p in state["squad"][:11]) / 11)
    state["my_radar"] = calculate_team_radar(state["squad"])

    msg = f"🔙 GERİ ÇAĞIRMA: {lp['name']}, 4M ₺ fesih bedeli ödenerek {lp.get('loan_club', 'Kiralık Kulübü')} kulübünden geri çağrıldı ve as kadroya katıldı (+{lp.get('growth', 0)} OVR gelişim)!"
    state["news"].insert(0, msg)
    save_state(state)
    return {"message": msg, "state": state}

# ==================== TAKTİK & KÜLTÜR YETENEK AĞACI (SKILL TREE) ====================
@app.get("/api/skills/tree")
def api_get_skills_tree():
    state = get_state()
    t_skills = state.setdefault("tactical_skills", {"unlocked": [], "mastery_points": 3})
    unlocked = t_skills.get("unlocked", [])
    points = t_skills.get("mastery_points", 0)
    
    tree_list = []
    for skill_id, s in TACTICAL_SKILLS_DATA.items():
        is_unlocked = skill_id in unlocked
        reqs = s.get("requires", [])
        can_unlock = False
        if is_unlocked:
            can_unlock = False
        elif not reqs:
            can_unlock = (points >= s["cost"])
        else:
            can_unlock = any(r in unlocked for r in reqs) and (points >= s["cost"])
        
        tree_list.append({
            **s,
            "is_unlocked": is_unlocked,
            "can_unlock": can_unlock
        })
    
    return {
        "mastery_points": points,
        "skills": tree_list
    }

class UnlockSkillRequest(BaseModel):
    skill_id: str

@app.post("/api/skills/unlock")
def api_unlock_skill(req: UnlockSkillRequest):
    state = get_state()
    t_skills = state.setdefault("tactical_skills", {"unlocked": [], "mastery_points": 3})
    unlocked = t_skills.setdefault("unlocked", [])
    
    if req.skill_id not in TACTICAL_SKILLS_DATA:
        raise HTTPException(status_code=404, detail="Yetenek bulunamadı!")
    if req.skill_id in unlocked:
        raise HTTPException(status_code=400, detail="Bu yetenek zaten açılmış!")
    
    s_info = TACTICAL_SKILLS_DATA[req.skill_id]
    cost = s_info["cost"]
    if t_skills.get("mastery_points", 0) < cost:
        raise HTTPException(status_code=400, detail=f"Yetersiz Yetenek Puanı! Gerekli: {cost} TP, Mevcut: {t_skills.get('mastery_points', 0)} TP")
    
    reqs = s_info.get("requires", [])
    if reqs and not any(r in unlocked for r in reqs):
        raise HTTPException(status_code=400, detail="Önceki kademedeki temel yeteneklerden en az birini açmanız gerekir!")
    
    t_skills["mastery_points"] -= cost
    unlocked.append(req.skill_id)
    msg = f"⚡ YETENEK AÇILDI: '{s_info['name']}' aktif edildi! {s_info['desc']}"
    state["news"].insert(0, msg)
    save_state(state)
    return {"message": msg, "state": state}

# ==================== DİNAMİK SPONSORLUK TEKLİFLERİ ====================
@app.get("/api/sponsors/offers")
def api_get_sponsor_offers():
    state = get_state()
    offers = state.get("incoming_sponsor_offers", [])
    if not offers:
        offers = generate_incoming_sponsor_offers(state, 3)
        state["incoming_sponsor_offers"] = offers
        save_state(state)
    return {
        "offers": offers,
        "active_sponsors": state.get("finances", {}).get("active_sponsors", [])
    }

class RespondSponsorOfferRequest(BaseModel):
    offer_id: str
    action: str # "accept", "bargain", "reject"

@app.post("/api/sponsors/respond")
def api_respond_sponsor_offer(req: RespondSponsorOfferRequest):
    state = get_state()
    offers = state.get("incoming_sponsor_offers", [])
    offer_idx = next((i for i, o in enumerate(offers) if o["id"] == req.offer_id), None)
    if offer_idx is None:
        raise HTTPException(status_code=404, detail="Sponsorluk teklifi bulunamadı!")
    
    offer = offers[offer_idx]
    finances = state.setdefault("finances", {})
    active_sponsors = finances.setdefault("active_sponsors", [])
    
    if req.action == "accept":
        active_sponsors = [s for s in active_sponsors if s.get("type") != offer["category"]]
        active_sponsors.append({
            "id": offer["id"],
            "type": offer["category"],
            "name": offer["company"],
            "income_season": offer["offer_amount"],
            "condition": offer["condition"]
        })
        finances["active_sponsors"] = active_sponsors
        
        upfront = offer.get("upfront_amount", int(offer["offer_amount"] * 0.30))
        state["budget"] += upfront
        state["board_trust"] = min(100, state.get("board_trust", 50) + 6)
        
        offers.pop(offer_idx)
        state["incoming_sponsor_offers"] = offers
        msg = f"✍️ DEV SPONSORLUK İMZALANDI: {offer['company']} ile {offer['category_label']} anlaşması sağlandı! {format_money_val(upfront)} peşin imza parası kasaya girdi!"
        state["news"].insert(0, msg)
        save_state(state)
        return {"message": msg, "state": state, "offers": offers}
        
    elif req.action == "bargain":
        if not offer.get("can_bargain", True):
            raise HTTPException(status_code=400, detail="Bu teklifle daha önce pazarlık yapıldı!")
        
        if random.random() < 0.65:
            bonus_pct = random.randint(12, 20)
            added_amt = int(offer["offer_amount"] * (bonus_pct / 100.0))
            offer["offer_amount"] += added_amt
            offer["upfront_amount"] = int(offer["offer_amount"] * (offer.get("upfront_pct", 30) / 100.0))
            offer["can_bargain"] = False
            msg = f"💼 PAZARLIK BAŞARILI: {offer['company']} teklifini +%{bonus_pct} artırarak {format_money_val(offer['offer_amount'])} seviyesine çıkardı!"
        else:
            offers.pop(offer_idx)
            state["incoming_sponsor_offers"] = offers
            msg = f"❌ PAZARLIK ÇIKMAZA GİRDİ: {offer['company']} yöneticileri artırım talebini kabul etmeyip masadan kalktı!"
        
        state["news"].insert(0, msg)
        save_state(state)
        return {"message": msg, "state": state, "offers": offers}
        
    elif req.action == "reject":
        offers.pop(offer_idx)
        state["incoming_sponsor_offers"] = offers
        msg = f"🗑️ {offer['company']} sponsorluk teklifi reddedildi."
        state["news"].insert(0, msg)
        save_state(state)
        return {"message": msg, "state": state, "offers": offers}
        
    else:
        raise HTTPException(status_code=400, detail="Geçersiz aksiyon!")

# ==================== AVRUPA KULÜPLERİ TRANSFER PAZARI ====================
class SignEuropeanPlayerRequest(BaseModel):
    club_name: str
    player_name: str

@app.get("/api/transfer/european-market")
def api_transfer_european_market():
    state = get_state()
    squad_names = {p.get("name", "").strip().lower() for p in state.get("squad", []) if p.get("name")}
    loaned_names = {p.get("name", "").strip().lower() for p in state.get("loaned_players", []) if p.get("name")}
    my_names = squad_names | loaned_names

    out = {}
    for club, players in EUROPEAN_CLUBS_MARKET.items():
        out[club] = [enrich_player(dict(p)) for p in players if p.get("name", "").strip().lower() not in my_names]
    return out

@app.post("/api/transfer/sign-european-player")
def api_sign_european_player(req: SignEuropeanPlayerRequest):
    state = get_state()
    if not state.get("transfer_window_open", True):
        raise HTTPException(status_code=400, detail="Transfer penceresi şu anda kapalıdır!")
    if state.get("transfer_ban", False):
        raise HTTPException(status_code=400, detail="Kulübün transfer tahtası mali limit aşımı sebebiyle kapalıdır!")

    if any(p.get("name", "").strip().lower() == req.player_name.strip().lower() for p in state.get("squad", [])):
        raise HTTPException(status_code=400, detail=f"'{req.player_name}' zaten kadronuzda yer alıyor! Çift transfer yapılamaz.")

    players = EUROPEAN_CLUBS_MARKET.get(req.club_name, [])
    player = next((p for p in players if p["name"] == req.player_name), None)
    if not player:
        raise HTTPException(status_code=404, detail="Oyuncu bulunamadı!")

    fee = player["val"]
    sign_bonus = int(fee * 0.1)
    total_cost = fee + sign_bonus
    if state["budget"] < total_cost:
        raise HTTPException(status_code=400, detail=f"Bütçe yetersiz! Bonservis + İmza Parası: {format_money_val(total_cost)} nakit gereklidir.")

    state["budget"] -= total_cost
    new_p = enrich_player({
        "name": player["name"],
        "pos": player["pos"],
        "age": player["age"],
        "overall": player["overall"],
        "potential": player.get("potential", player["overall"] + 2),
        "wage": player["wage"],
        "val": player["val"],
        "contract_years": 4,
        "is_foreign": True,
        "morale": 95
    })
    state["squad"].append(new_p)
    state["squad"] = rebalance_and_validate_squad(state["squad"], state.get("club_name", ""))
    state["team_power"] = round(sum(p["overall"] for p in state["squad"][:11]) / 11)
    state["my_radar"] = calculate_team_radar(state["squad"])
    state["fan_trust"] = min(100, state["fan_trust"] + 8)

    msg = f"🌍 AVRUPA BOMBASI: {req.club_name} kulübünden {new_p['name']} ({new_p['pos']} - OVR {new_p['overall']}) kulübümüze imza attı!"
    state["news"].insert(0, msg)
    save_state(state)
    return {"message": msg, "state": state}

@app.delete("/api/underground/bet")
def api_underground_cancel_bet():
    state = get_state()
    ug = state.setdefault("underground", {})
    bet = ug.get("active_bet")
    if not bet:
        raise HTTPException(status_code=400, detail="İptal edilecek aktif bir kupon bulunamadı.")

    refund = int(bet["amount"] * 0.85)
    state["budget"] += refund
    ug["active_bet"] = None
    save_state(state)
    return {
        "message": f"Yasadışı kupon bozduruldu. %15 komisyon kesilerek {format_money_val(refund)} kasaya iade edildi.",
        "state": state
    }

class RealEstateProjRequest(BaseModel):
    project_type: str

@app.post("/api/realestate/start")
def api_realestate_start(req: RealEstateProjRequest):
    state = get_state()
    re = state["real_estate"]
    if re.get("active_project"):
        raise HTTPException(status_code=400, detail="Zaten devam eden bir proje var!")

    if req.project_type == "mall":
        cost = 60_000_000
        if state["budget"] < cost:
            raise HTTPException(status_code=400, detail="Yetersiz bütçe (60M ₺)!")
        state["budget"] -= cost
        re["active_project"] = {"name": "Kulüp Rezidans & AVM", "type": "mall", "weeks_left": 4, "benefit": "+150M ₺ Sıcak Para"}
    elif req.project_type == "academy":
        cost = 40_000_000
        if state["budget"] < cost:
            raise HTTPException(status_code=400, detail="Yetersiz bütçe (40M ₺)!")
        state["budget"] -= cost
        re["active_project"] = {"name": "Futbol Altyapı Kampüsü", "type": "academy", "weeks_left": 3, "benefit": "+5 Takım Gücü"}
    elif req.project_type == "stadium":
        cost = 85_000_000
        if state["budget"] < cost:
            raise HTTPException(status_code=400, detail="Yetersiz bütçe (85M ₺)!")
        state["budget"] -= cost
        re["active_project"] = {"name": "Mega Arena Genişletme", "type": "stadium", "weeks_left": 5, "benefit": "+20.000 Kapasite"}

    save_state(state)
    return {"message": "Proje temeli atıldı.", "state": state}

class CoachDialogAction(BaseModel):
    action: str

@app.post("/api/coach/dialog")
def api_coach_dialog(req: CoachDialogAction):
    state = get_state()
    coach = state.get("coach")

    if not coach or state.get("coach_vacant", False):
        if req.action == "fire":
            return {
                "message": "Kulüpte görevde teknik direktör bulunmuyor! Lütfen yeni hoca seçin.",
                "state": state,
                "coach_vacant": True,
                "coaches": AVAILABLE_COACHES_MARKET
            }
        raise HTTPException(status_code=400, detail="Kulüpte görevde bir teknik direktör bulunmuyor!")

    msg = ""
    if req.action == "pass":
        state["coach_dialog_pending"] = False
        msg = f"Hoca {coach['name']}: 'Görüşmek üzere Başkanım, bir sonraki maça konsantreyiz.'"
    elif req.action == "praise_bonus":
        bonus = 4_000_000
        if state["budget"] < bonus:
            raise HTTPException(status_code=400, detail="Kasada prim için para yok!")
        state["budget"] -= bonus
        coach["moral"] = min(100, coach["moral"] + 15)
        state["fan_trust"] = min(100, state["fan_trust"] + 3)
        msg = f"Hoca {coach['name']}: 'Teşekkürler Başkanım! Prim takımı uçuracak.'"
    elif req.action == "criticize":
        coach["ego"] = max(30, coach["ego"] - 10)
        coach["defense"] = min(95, coach["defense"] + 3)
        msg = f"Hoca {coach['name']}: 'Eleştirinizi aldım Başkanım, hataları çözeceğiz.'"
    elif req.action == "fire":
        tazminat = int(coach["salary"] * 0.5)
        if state["budget"] < tazminat:
            raise HTTPException(status_code=400, detail="Hocayı kovacak tazminat bütçeniz yok!")
        state["budget"] -= tazminat
        old_coach_name = coach["name"]
        state["coach_vacant"] = True
        state["coach"] = None
        msg = f"⚡ AYRILIK: {old_coach_name} görevden alındı! {format_money_val(tazminat)} tazminat ödendi. Lütfen yeni teknik direktörünüzü seçin."
        state["news"].insert(0, msg)
        state["coach_dialog_pending"] = False
        save_state(state)
        return {
            "message": msg,
            "state": state,
            "coach_vacant": True,
            "coaches": [c for c in AVAILABLE_COACHES_MARKET if c["name"] != old_coach_name]
        }

    state["coach_dialog_pending"] = False
    save_state(state)
    return {"message": msg, "state": state}

@app.post("/api/coach/fire")
def api_coach_fire():
    state = get_state()
    coach = state.get("coach")
    if not coach or state.get("coach_vacant", False):
        raise HTTPException(status_code=400, detail="Kulüpte görevde bir teknik direktör bulunmuyor!")

    tazminat = int(coach.get("salary", 25_000_000) * 0.4)
    if state["budget"] < tazminat:
        raise HTTPException(status_code=400, detail=f"Hocayı kovmak için kasada en az {format_money_val(tazminat)} fesih tazminatı bulunmalıdır!")

    state["budget"] -= tazminat
    old_coach_name = coach["name"]
    state["coach_vacant"] = True
    state["coach"] = None
    state["fan_trust"] = max(10, state["fan_trust"] - 4)
    msg = f"⚡ RESMİ AYRILIK: {old_coach_name} ile sözleşme tek taraflı feshedildi! ({format_money_val(tazminat)} fesih tazminatı ödendi). Yeni hoca arayışı başladı."
    state["news"].insert(0, msg)
    save_state(state)
    return {
        "message": msg,
        "state": state,
        "coach_vacant": True,
        "coaches": [c for c in AVAILABLE_COACHES_MARKET if c["name"] != old_coach_name]
    }

@app.get("/api/coach/market")
def api_get_coach_market():
    state = get_state()
    current_name = state.get("coach", {}).get("name") if state.get("coach") else None
    available = [c for c in AVAILABLE_COACHES_MARKET if c["name"] != current_name]
    return {
        "coaches": available,
        "coach_vacant": state.get("coach_vacant", False),
        "current_coach": state.get("coach")
    }

class HireCoachRequest(BaseModel):
    coach_id: str

@app.post("/api/coach/hire")
def api_hire_coach(req: HireCoachRequest):
    state = get_state()
    candidate = next((c for c in AVAILABLE_COACHES_MARKET if c["id"] == req.coach_id), None)
    if not candidate:
        raise HTTPException(status_code=404, detail="Teknik direktör bulunamadı!")

    sign_fee = 2_000_000
    if state["budget"] < sign_fee:
        raise HTTPException(status_code=400, detail=f"Hocaya imza parası vermek için en az {format_money_val(sign_fee)} bütçe gereklidir!")

    state["budget"] -= sign_fee
    state["coach"] = {
        "name": candidate["name"],
        "style": candidate["style"],
        "rating": candidate["rating"],
        "attack": candidate["attack"],
        "defense": candidate["defense"],
        "youth": candidate["youth"],
        "press_rel": candidate["press_rel"],
        "ego": candidate["ego"],
        "salary": candidate["salary"],
        "photo": candidate["photo"],
        "traits": candidate["traits"],
        "moral": 90,
        "trust": 85,
        "stress": 10,
        "mistakes_count": 0,
        "praised_count": 0,
        "tactical_vision": candidate["style"]
    }
    state["coach_vacant"] = False
    state["fan_trust"] = min(100, state["fan_trust"] + 8)
    state["board_trust"] = min(100, state["board_trust"] + 6)

    msg = f"✍️ RESMİ ANLAŞMA: Kulübümüz, tecrübeli teknik direktör {candidate['name']} ile sözleşme imzaladı! ({format_money_val(sign_fee)} imza parası ödendi)"
    state["news"].insert(0, msg)
    save_state(state)
    return {"message": msg, "state": state}

class CoachInstructionRequest(BaseModel):
    instruction: str

@app.post("/api/coach/instruction")
def api_coach_instruction(req: CoachInstructionRequest):
    state = get_state()
    coach = state.get("coach")
    if not coach:
        raise HTTPException(status_code=400, detail="Kulüpte görevde bir teknik direktör yok!")

    c_name = coach.get("name", "Teknik Direktör")
    msg = ""

    if req.instruction == "rotate_squad":
        state["next_match_rotation"] = True
        state["next_match_tactic"] = None
        # As kadroya doğrudan dinlenme ve zindelik
        for p in state.get("squad", [])[:11]:
            p["stamina"] = min(100, p.get("stamina", 80) + 18)
        msg = f"Hoca {c_name}: 'Sayın Başkanım, talimatınız başım üstüne. Önümüzdeki maçta as yıldızlarımızı dinlendirip, kulübedeki aç ve hazır oyuncularımıza forma vereceğim. Rotasyon takıma nefes aldıracak.'"
    
    elif req.instruction == "all_out_attack":
        state["next_match_rotation"] = False
        state["next_match_tactic"] = "all_out_attack"
        coach["attack"] = min(99, coach.get("attack", 80) + 4)
        msg = f"Hoca {c_name}: 'Hücum futbolu bizim genlerimizde var Başkanım! Rakibin üzerine tüm hatlarımızla gideceğiz, tribünleri coşturacağız!'"
    
    elif req.instruction == "park_the_bus":
        state["next_match_rotation"] = False
        state["next_match_tactic"] = "park_the_bus"
        coach["defense"] = min(99, coach.get("defense", 80) + 5)
        msg = f"Hoca {c_name}: 'Çok akıllıca Başkanım. Önümüzdeki maçta savunma bloklarını sıkılaştıracağız, kaleyi gole kapatıp sabırla bekleyeceğiz.'"

    elif req.instruction == "trust_youth":
        state["next_match_rotation"] = False
        state["next_match_tactic"] = "trust_youth"
        coach["youth"] = min(99, coach.get("youth", 80) + 5)
        for p in state.get("squad", []):
            if p.get("is_youth"):
                p["morale"] = min(100, p.get("morale", 80) + 15)
        msg = f"Hoca {c_name}: 'Geleceğimizi inşa ediyoruz Başkanım! Altyapıdan çıkan genç yeteneklere daha fazla şans ve sorumluluk vereceğim.'"

    elif req.instruction == "boost_morale":
        coach["moral"] = min(100, coach.get("moral", 80) + 12)
        coach["stress"] = max(5, coach.get("stress", 20) - 15)
        msg = f"Hoca {c_name}: 'Bu destek ve güveniniz bana güç verdi Başkanım. Siz arkamızda durdukça bu takımı zirveye taşırız!'"
    
    else:
        msg = f"Hoca {c_name}: 'Mesajınızı aldım Başkanım, gereken analizi yapacağız.'"

    state["news"].insert(0, f"🗣️ BAŞKAN - HOCA ZİRVESİ: {msg}")
    save_state(state)
    return {"message": msg, "instruction": req.instruction, "state": state}

class TerminateContractRequest(BaseModel):
    player_name: str

@app.post("/api/squad/terminate-contract")
def api_terminate_contract(req: TerminateContractRequest):
    state = get_state()
    squad = state.get("squad", [])
    player_idx = next((i for i, p in enumerate(squad) if p["name"].lower() == req.player_name.lower()), None)
    if player_idx is None:
        raise HTTPException(status_code=404, detail="Oyuncu kadroda bulunamadı!")
    
    player = squad[player_idx]
    if player_idx < 11:
        raise HTTPException(status_code=400, detail="İlk 11'deki oyuncunun sözleşmesi doğrudan feshedilemez! Önce yedeğe çekiniz.")

    # Fesih bedeli (Yıllık maaşının %25'i kadar karşılıklı fesih tazminatı)
    termination_cost = int(player.get("wage", 4_000_000) * 0.25)
    if state["budget"] < termination_cost:
        raise HTTPException(status_code=400, detail=f"Fesih tazminatını ödeyecek bütçeniz yok! Gereken: {format_money_val(termination_cost)}")

    state["budget"] -= termination_cost
    squad.pop(player_idx)
    state["squad"] = squad
    state["team_power"] = round(sum(p["overall"] for p in state["squad"][:11]) / 11) if len(state["squad"]) >= 11 else 70
    state["my_radar"] = calculate_team_radar(state["squad"])

    msg = f"📄 KARŞILIKLI FESİH: {player['name']} ({player['pos']}) ile olan sözleşme {format_money_val(termination_cost)} tazminat ödenerek feshedildi!"
    state["news"].insert(0, msg)
    save_state(state)
    return {"message": msg, "cost": termination_cost, "state": state}

class CoachConfrontPlayingTimeRequest(BaseModel):
    player_name: str

@app.post("/api/coach/confront-playing-time")
def api_coach_confront_playing_time(req: CoachConfrontPlayingTimeRequest):
    state = get_state()
    coach = state.get("coach", {})
    player = next((p for p in state.get("squad", []) if p["name"] == req.player_name), None)
    if not player:
        raise HTTPException(status_code=404, detail="Oyuncu kadroda bulunamadı!")

    mins = player.get("minutes_played", 0)
    matches = player.get("matches_played", 0)
    overall = player.get("overall", 75)
    ego = coach.get("ego", 70)
    coach_name = coach.get("name", "Teknik Direktör")

    # Reaksiyon ve yanıt oluşturma
    if ego >= 78:
        coach["ego"] = max(30, ego - 5)
        coach["trust"] = max(40, coach.get("trust", 80) - 3)
        player["morale"] = min(100, player.get("morale", 80) + 12)
        response_msg = (
            f"Hoca {coach_name}: 'Sayın Başkanım, takımın taktiksel dengesi ve ilk 11 tercihi benim teknik sorumluluğumda. "
            f"{player['name']} kaliteli bir oyuncu ({overall} Reyting) fakat sistemime tam oturmuyor. "
            f"Yine de uyarınızı dikkate alacağım, önümüzdeki maçlarda rotasyonda kendisine mutlaka şans tanıyacağım.'"
        )
    else:
        coach["trust"] = min(100, coach.get("trust", 80) + 4)
        player["morale"] = min(100, player.get("morale", 80) + 20)
        response_msg = (
            f"Hoca {coach_name}: 'Çok haklısınız Başkanım! {player['name']} bu sezon yalnızca {mins} dakika ({matches} maç) süre alabildi. "
            f"Antrenmanda da hırslı. Önümüzdeki maçta kendisine doğrudan ilk 11'de veya 2. yarıda kesinlikle forma vereceğim!'"
        )

    news_msg = f"🗣️ BAŞKAN VE HOCA ZİRVESİ: Başkan, {player['name']}'ın ({mins} dk süre) yedek kalması sebebiyle Hoca {coach_name}'ye hesap sordu!"
    state["news"].insert(0, news_msg)
    save_state(state)

    return {
        "message": response_msg,
        "player_name": player["name"],
        "minutes_played": mins,
        "matches_played": matches,
        "overall": overall,
        "coach_name": coach_name,
        "coach_photo": coach.get("photo", "/static/coach_senol_gunes.png"),
        "state": state
    }

# ==================== GÜNLÜK GİRİŞ ÖDÜLÜ (5.000.000 ₺) ====================
@app.post("/api/daily-reward/claim")
def api_claim_daily_reward():
    state = get_state()
    now_ts = int(time.time())
    last_claim = state.get("last_daily_claim", 0)
    cooldown = 24 * 3600  # 24 saat

    if now_ts - last_claim < cooldown:
        remaining_hours = max(1, int((cooldown - (now_ts - last_claim)) / 3600))
        raise HTTPException(status_code=400, detail=f"Bugünkü başkanlık ödülünüzü zaten aldınız! Kalan süre: ~{remaining_hours} saat.")

    reward_amt = 5_000_000
    state["budget"] += reward_amt
    state["last_daily_claim"] = now_ts
    msg = f"🎁 DÜZENLİ GİRİŞ ÖDÜLÜ: Sadık Başkanlık Desteği olarak kasaya +{format_money_val(reward_amt)} hibe aktarıldı!"
    state["news"].insert(0, msg)
    save_state(state)
    return {"message": msg, "reward": reward_amt, "state": state}

# ==================== KULÜP GELİŞTİRME & PASİF GELİR SKILL AĞACI ====================
class ClubUpgradeRequest(BaseModel):
    branch: str  # 'stadium', 'transit', 'merch', 'academy', 'broadcast'

FACILITY_UPGRADE_CONFIG = {
    "stadium": {
        "title": "Stadyum & VIP Loca Kapasitesi",
        "costs": [0, 25_000_000, 45_000_000, 75_000_000, 120_000_000],
        "cap_boost": [0, 3000, 5000, 8000, 12000],
        "desc": "Bilet başına +50 ₺ ek gelir ve tribün genişletmesi."
    },
    "transit": {
        "title": "Şehir Raylı Sistem & Maç Günü Ulaşımı",
        "costs": [0, 20_000_000, 35_000_000, 60_000_000, 95_000_000],
        "desc": "Stadyum doluluğunda taban garantisi (+%5) ve ulaşım konforu."
    },
    "merch": {
        "title": "Global Lisanslı Forma & Tasarım Atölyesi",
        "costs": [0, 18_000_000, 32_000_000, 55_000_000, 85_000_000],
        "desc": "Kulüp mağazası forma satış gelirlerine +%25 pasif çarpan."
    },
    "academy": {
        "title": "Futbol Gelişim Akademisi & Sağlık Merkezi",
        "costs": [0, 22_000_000, 40_000_000, 65_000_000, 100_000_000],
        "desc": "Yedek oyuncuların kondisyon yenilenmesine +3 hız ve genç oyuncu gelişimi."
    },
    "broadcast": {
        "title": "Kulüp Televizyonu & Dijital Medya Ağı",
        "costs": [0, 20_000_000, 38_000_000, 62_000_000, 90_000_000],
        "desc": "Maç başı TV yayın haklarına +%15 ek yayın geliri."
    }
}

@app.get("/api/club/upgrades")
def api_get_club_upgrades():
    state = get_state()
    upgrades = state.setdefault("club_upgrades", {"stadium": 1, "transit": 1, "merch": 1, "academy": 1, "broadcast": 1})
    result = {}
    for k, conf in FACILITY_UPGRADE_CONFIG.items():
        cur_lvl = upgrades.get(k, 1)
        next_cost = conf["costs"][cur_lvl] if cur_lvl < 5 else None
        result[k] = {
            "title": conf["title"],
            "level": cur_lvl,
            "max_level": 5,
            "next_cost": next_cost,
            "desc": conf["desc"],
            "can_upgrade": (cur_lvl < 5 and state["budget"] >= (next_cost or 0))
        }
    return {"upgrades": result, "budget": state["budget"]}

@app.post("/api/club/upgrade")
def api_club_upgrade(req: ClubUpgradeRequest):
    state = get_state()
    upgrades = state.setdefault("club_upgrades", {"stadium": 1, "transit": 1, "merch": 1, "academy": 1, "broadcast": 1})
    conf = FACILITY_UPGRADE_CONFIG.get(req.branch)
    if not conf:
        raise HTTPException(status_code=400, detail="Geçersiz tesis/proje dalı!")

    cur_lvl = upgrades.get(req.branch, 1)
    if cur_lvl >= 5:
        raise HTTPException(status_code=400, detail="Bu tesis dalı maksimum seviyeye (5. Seviye) ulaşmıştır!")

    cost = conf["costs"][cur_lvl]
    if state["budget"] < cost:
        raise HTTPException(status_code=400, detail=f"Yetersiz bütçe! Bu seviye için {format_money_val(cost)} gereklidir.")

    state["budget"] -= cost
    upgrades[req.branch] = cur_lvl + 1

    if req.branch == "stadium":
        cap_add = conf["cap_boost"][cur_lvl]
        state["stadium_capacity"] = state.get("stadium_capacity", 25000) + cap_add
        msg = f"🏟️ STADYUM GELİŞTİRİLDİ: Kapasite +{cap_add:,} artırıldı ({state['stadium_capacity']:,} koltuk)! Seviye {cur_lvl + 1}'e yükseltildi."
    elif req.branch == "transit":
        msg = f"🚇 ULAŞIM REFORMU: Metro ve metrobüs hatları stada bağlandı! Maç günü taban doluluk garantisi yükseldi (Seviye {cur_lvl + 1})."
    elif req.branch == "merch":
        msg = f"👕 FORMA & MAĞAZA REFORMU: Elit forma tedarik anlaşması yapıldı! Mağaza hasılatı çarpanı arttı (Seviye {cur_lvl + 1})."
    elif req.branch == "academy":
        msg = f"🌱 AKADEMİ & SAĞLIK MERKEZİ: Tesisler yenilendi! Oyuncuların kondisyon toparlanma hızı arttı (Seviye {cur_lvl + 1})."
    else:
        msg = f"📡 DİJİTAL YAYIN GELİŞTİRMESİ: Kulüp medya stüdyosu açıldı! Haftalık TV gelirlerine +%15 ek katkı sağlandı (Seviye {cur_lvl + 1})."

    state["board_trust"] = min(100, state["board_trust"] + 4)
    state["fan_trust"] = min(100, state["fan_trust"] + 5)
    state["news"].insert(0, msg)
    save_state(state)
    return {"message": msg, "state": state}

# ==================== MAÇ ÖNCESİ ETKİNLİK / KONSER DÜZENLEME ====================
class OrganizeEventRequest(BaseModel):
    event_type: str  # 'rock_concert', 'fan_carnival', 'celebrity_show'

@app.post("/api/events/organize")
def api_organize_event(req: OrganizeEventRequest):
    state = get_state()
    cur_fixture = next((f for f in state.get("fixtures", []) if f["week"] == state.get("week", 1)), None)
    if not cur_fixture or not cur_fixture.get("is_home", True):
        raise HTTPException(status_code=400, detail="Etkinlik ve konserler yalnızca iç saha maçlarından önce düzenlenebilir!")

    if state.get("stadium_concert_active", False):
        raise HTTPException(status_code=400, detail="Bu maç için zaten aktif bir stadyum etkinliği organize edildi!")

    cost = 6_000_000
    if req.event_type == "rock_concert":
        cost = 10_000_000
        fan_boost = 14
        title = "Dev Stadyum Rock Konseri"
    elif req.event_type == "celebrity_show":
        cost = 8_000_000
        fan_boost = 11
        title = "Ünlüler Gösteri Maçı & Işık Şovu"
    else:
        cost = 5_000_000
        fan_boost = 8
        title = "Büyük Taraftar Festivali & Karnaval"

    if state["budget"] < cost:
        raise HTTPException(status_code=400, detail=f"Etkinlik organizasyonu için {format_money_val(cost)} bütçe gereklidir!")

    state["budget"] -= cost
    state["fan_trust"] = min(100, state["fan_trust"] + fan_boost)
    state["stadium_concert_active"] = True
    msg = f"🎉 {title.upper()} ORGANİZE EDİLDİ: Tribün ateşi yeniden alevlendi (+{fan_boost} Taraftar Güveni, Maçta Kapalı Gişe Desteği)!"
    state["news"].insert(0, msg)
    save_state(state)
    return {"message": msg, "state": state}

# ==================== MAĞLUBİYET / MAÇ SONRASI BASIN AÇIKLAMASI ====================
class PostMatchPressRequest(BaseModel):
    statement_type: str  # 'blame_referee', 'support_team', 'promise_transfer', 'criticize_coach'

@app.post("/api/match/press-statement")
def api_post_match_press(req: PostMatchPressRequest):
    state = get_state()
    last_match = state.get("last_match")
    if not last_match:
        raise HTTPException(status_code=400, detail="Henüz tamamlanmış bir maç bulunmuyor!")

    if req.statement_type == "blame_referee":
        # Hakeme yüklen: Taraftar alkışlar, TFF ve basın ceza riski
        state["fan_trust"] = min(100, state["fan_trust"] + 6)
        state["media_trust"] = max(10, state.get("media_trust", 70) - 8)
        msg = "🎤 SERT BASIN BİLDİRİSİ: 'Bu operasyon çocukları hakemlerle Türk futbolu bir yere varamaz! Hakkımızı kimseye yedirmeyiz!' (+6 Taraftar, -8 Basın)."
    elif req.statement_type == "support_team":
        # Takıma sahip çık: Hoca ve takım morali yükselir
        state["coach"]["moral"] = min(100, state["coach"]["moral"] + 10)
        state["squad_harmony"] = min(100, state.get("squad_harmony", 80) + 6)
        msg = "🎤 SAHİP ÇIKMA DEMECİ: 'Futbolcularıma ve teknik heyetime güvenim tam. Bu yolun sonu şampiyonluktur!' (+10 Hoca Morali, +6 Takım Huzuru)."
    elif req.statement_type == "promise_transfer":
        # Transfer sözü: Taraftar coşar, beklenti yükselir
        state["fan_trust"] = min(100, state["fan_trust"] + 8)
        state["board_trust"] = max(10, state["board_trust"] - 4)
        msg = "🎤 TRANSFER MÜJDESİ: 'Eksiklerimizi gördük. Taraftarımız müsterih olsun, Avrupa'dan yıldız oyuncuları getireceğiz!' (+8 Taraftar, -4 Kongre Mali Kaygısı)."
    else:  # criticize_coach
        # Hocayı açıkça uyar: Hoca ego kırılır, taraftarın bir kısmı destekler
        state["coach"]["moral"] = max(20, state["coach"]["moral"] - 15)
        state["fan_trust"] = min(100, state["fan_trust"] + 4)
        msg = f"🎤 HOCAYA SERT UYARI: 'Sayın {state['coach']['name']} taktiklerini acilen gözden geçirmelidir. Bu kulübün sabrı sonsuz değildir!' (-15 Hoca Morali, +4 Taraftar)."

    state["news"].insert(0, msg)
    save_state(state)
    return {"message": msg, "state": state}

@app.get("/")
def get_root_index():
    return FileResponse(
        os.path.join(STATIC_DIR, "index.html"),
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static_assets")
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 5055))
    uvicorn.run(app, host="0.0.0.0", port=port)
