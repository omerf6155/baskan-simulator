import os
import json
import random
import contextvars
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from teams_data import TEAMS_DB

app = FastAPI(title="Sayin Baskan Simulator - Super Lig Genisletilmis Surum")

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
    if sid == "default":
        return SAVE_FILE
    return os.path.join(SAVES_DIR, f"{sid}.json")

# ==================== DÜNYA YILDIZLARI & TRANSFER HAVUZU ====================
WORLD_SUPERSTARS = [
    {"name": "Erling Haaland", "age": 26, "pos": "SANTRAFOR", "claimed_pot": 92, "real_pot": 92, "price": 260_000_000, "salary": 75_000_000, "is_star": True, "desc": "Manchester City'nin gol makinesi. Süper Lig'e gelirse yer yerinden oynar."},
    {"name": "Kylian Mbappé", "age": 27, "pos": "SOL KANAT", "claimed_pot": 93, "real_pot": 93, "price": 280_000_000, "salary": 85_000_000, "is_star": True, "desc": "Dünyanın en hızlı ve durdurulamaz hücumcusu."},
    {"name": "Kevin De Bruyne", "age": 35, "pos": "MERKEZ OS", "claimed_pot": 90, "real_pot": 90, "price": 130_000_000, "salary": 58_000_000, "is_star": True, "desc": "Miras bırakacak bir pas dehası ve oyun kurucu."},
    {"name": "Victor Osimhen", "age": 27, "pos": "SANTRAFOR", "claimed_pot": 89, "real_pot": 89, "price": 170_000_000, "salary": 52_000_000, "is_star": True, "desc": "Fiziksel güç, hava hakimiyeti ve bitiricilik abidesi."},
    {"name": "Vinícius Júnior", "age": 26, "pos": "SOL KANAT", "claimed_pot": 92, "real_pot": 92, "price": 250_000_000, "salary": 72_000_000, "is_star": True, "desc": "Sambacı dripling cambazı, savunmaları darmadağın eder."},
    {"name": "Rodri", "age": 30, "pos": "ÖN LİBERO", "claimed_pot": 91, "real_pot": 91, "price": 200_000_000, "salary": 62_000_000, "is_star": True, "desc": "Ballon d'Or sahibi kusursuz orta saha çimentosu."},
    {"name": "Alphonso Davies", "age": 25, "pos": "SOL BEK", "claimed_pot": 87, "real_pot": 87, "price": 110_000_000, "salary": 38_000_000, "is_star": True, "desc": "Sol kanadın hızlı treni, savunma ve bindirme ustası."},
    {"name": "Achraf Hakimi", "age": 27, "pos": "SAĞ BEK", "claimed_pot": 88, "real_pot": 88, "price": 125_000_000, "salary": 42_000_000, "is_star": True, "desc": "Dünyanın en modern ve skorer sağ beki."},
    {"name": "Rúben Dias", "age": 29, "pos": "STP", "claimed_pot": 89, "real_pot": 89, "price": 145_000_000, "salary": 48_000_000, "is_star": True, "desc": "Kusursuz pozisyon bilgisine sahip lider stoper."},
    {"name": "Thibaut Courtois", "age": 34, "pos": "KL", "claimed_pot": 89, "real_pot": 89, "price": 85_000_000, "salary": 40_000_000, "is_star": True, "desc": "Kalesinde devleşen dünyanın sayılı eldivenlerinden."}
]

FREE_AGENTS = [
    {"name": "N'Golo Kanté", "age": 35, "pos": "ÖN LİBERO", "claimed_pot": 84, "real_pot": 84, "price": 0, "salary": 26_000_000, "sign_bonus": 12_000_000, "is_free": True, "desc": "Sözleşmesi bitti. Ciğersiz pres ustası, bedelsiz imza fırsatı."},
    {"name": "Memphis Depay", "age": 32, "pos": "SANTRAFOR", "claimed_pot": 82, "real_pot": 82, "price": 0, "salary": 22_000_000, "sign_bonus": 10_000_000, "is_free": True, "desc": "Serbest oyuncu. Bire birde etkili forvet ve kanat forvet."},
    {"name": "Sergio Ramos", "age": 40, "pos": "STP", "claimed_pot": 80, "real_pot": 80, "price": 0, "salary": 16_000_000, "sign_bonus": 8_000_000, "is_free": True, "desc": "Efsane lider stoper. Soyunma odasına karakter katar."},
    {"name": "James Rodríguez", "age": 35, "pos": "FORVET ARKASI", "claimed_pot": 81, "real_pot": 81, "price": 0, "salary": 15_000_000, "sign_bonus": 7_000_000, "is_free": True, "desc": "Usta sol ayak, ölümcül frikikler ve kilit paslar."},
    {"name": "Anthony Martial", "age": 30, "pos": "FORVET", "claimed_pot": 79, "real_pot": 79, "price": 0, "salary": 14_000_000, "sign_bonus": 6_000_000, "is_free": True, "desc": "Serbest kaldı. Yüksek potansiyelli hamle santraforu."}
]

SCOUT_CANDIDATES = [
    {"id": "sc1", "name": "Cemil 'Kartal Göz' Kaya", "role": "Yerli Lig Kurdu", "rating": 72, "salary": 3_000_000, "region": "Türkiye & Alt Ligler"},
    {"id": "sc2", "name": "Eduardo Da Silva", "role": "Güney Amerika Uzmanı", "rating": 85, "salary": 7_000_000, "region": "Brezilya & Arjantin"},
    {"id": "sc3", "name": "Klaus Richter", "role": "Avrupa Veri Analisti", "rating": 90, "salary": 10_000_000, "region": "Almanya & Fransa"},
    {"id": "sc4", "name": "Murat Çırak", "role": "Çaylak Gözlemci", "rating": 60, "salary": 1_500_000, "region": "Amatör Ligler"}
]

AVAILABLE_SPONSORS = [
    {"id": "sp1", "type": "chest", "name": "Türk Hava Yolları", "income_season": 65_000_000, "desc": "Göğüs Sponsorluğu - Prestijli ana ortaklık."},
    {"id": "sp2", "type": "chest", "name": "Global Borsa & Finans", "income_season": 90_000_000, "desc": "Devasa kripto ve fintech sponsorluğu."},
    {"id": "sp3", "type": "stadium", "name": "Mega Telekom Arena", "income_season": 95_000_000, "desc": "Stadyum İsim Hakkı - 3 yıllık anlaşma."},
    {"id": "sp4", "type": "back", "name": "Uludağ İçecek", "income_season": 32_000_000, "desc": "Forma Sırt ve Kol Sponsorluğu."}
]

# ==================== OYUNCU VE RADAR İSTATİSTİKLERİ ====================
def enrich_player(p: Dict[str, Any]) -> Dict[str, Any]:
    pos = str(p.get("pos", "MERKEZ OS")).upper()
    ovr = int(p.get("overall", 75))

    skills = p.get("skills")
    if not skills or len(skills) < 6:
        # Radar İstatistikleri: pac (Hız), sho (Şut), pas (Pas), dri (Dripling), def (Defans), phy (Fizik)
        if "KL" in pos:
            skills = {
                "pac": max(42, min(85, ovr - 22)),
                "sho": max(20, min(65, ovr - 38)),
                "pas": max(50, min(86, ovr - 12)),
                "dri": max(40, min(75, ovr - 24)),
                "def": max(65, min(95, ovr - 4)),
                "phy": max(65, min(96, ovr - 2))
            }
        elif any(k in pos for k in ["BEK", "STP"]):
            skills = {
                "pac": max(62, min(96, ovr - (4 if "BEK" in pos else 11))),
                "sho": max(38, min(78, ovr - 26)),
                "pas": max(60, min(88, ovr - 10)),
                "dri": max(56, min(86, ovr - 14)),
                "def": max(72, min(99, ovr + 3)),
                "phy": max(70, min(98, ovr + 2))
            }
        elif any(k in pos for k in ["OS", "LİBERO", "ARKASI"]):
            skills = {
                "pac": max(64, min(93, ovr - 8)),
                "sho": max(64, min(91, ovr - 5)),
                "pas": max(74, min(99, ovr + 4)),
                "dri": max(72, min(98, ovr + 2)),
                "def": max(52, min(90, ovr - (4 if "LİBERO" in pos else 16))),
                "phy": max(65, min(94, ovr - 5))
            }
        else: # FORVET, KANAT, SANTRAFOR
            skills = {
                "pac": max(75, min(99, ovr + (4 if "KANAT" in pos else -2))),
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

    # Yabancı / Yerli Kontrolü (Süper Lig Kuralı)
    name_lower = str(p.get("name", "")).lower()
    turkish_indicators = ["ç", "ğ", "ı", "ö", "ş", "ü", "ahmet", "mehmet", "ali", "ömer", "can", "kerem", "barış", "uğurcan", "ferdi", "semih", "irfan", "mert", "samet", "eren", "enes", "hakan", "yusuf", "abdülkerim", "okay", "berke", "kaan", "cenk", "ozan", "salih", "taylan", "orhan", "serdar", "batagov", "deniz", "güler", "kaya", "yılmaz", "demir", "çelik", "özkan", "gökhan"]
    p["is_foreign"] = not (any(c in name_lower for c in ["ç", "ğ", "ı", "ö", "ş", "ü"]) or any(w in name_lower.split() for w in turkish_indicators))

    # Sakatlık & Kart Cezaları
    if "yellow_cards" not in p:
        p["yellow_cards"] = 0
    if "suspended_weeks" not in p:
        p["suspended_weeks"] = 0
    if "injured_weeks" not in p:
        p["injured_weeks"] = 0

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

# ==================== 34 HAFTALIK ÇİFT DEVRE FİKSTÜR ====================
def generate_fixtures(my_team_name: str, teams: List[Dict]):
    other_teams = [t for t in teams if t["name"] != my_team_name]
    random.shuffle(other_teams)
    fixtures = []
    
    # 1. Devre (17 Hafta: 1 - 17)
    for w in range(1, len(other_teams) + 1):
        opp = other_teams[w - 1]
        is_home = (w % 2 == 1)
        fixtures.append({
            "week": w,
            "round": 1,
            "opponent": opp["name"],
            "opponent_short": opp.get("short", "RAK"),
            "opponent_pwr": opp["power"],
            "opponent_is_big": opp.get("is_big", False),
            "is_home": is_home,
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
        fixtures.append({
            "week": week_num,
            "round": 2,
            "opponent": opp["name"],
            "opponent_short": opp.get("short", "RAK"),
            "opponent_pwr": opp["power"],
            "opponent_is_big": opp.get("is_big", False),
            "is_home": is_home,
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

def default_career_state(chosen_team_id: str = "trabzonspor", president_name: str = "Ömer Başkan", is_started: bool = True):
    team = next((t for t in TEAMS_DB if t["id"] == chosen_team_id), TEAMS_DB[0])
    fixtures = generate_fixtures(team["name"], TEAMS_DB)
    standings = generate_initial_standings(TEAMS_DB)
    
    # Kadroyu radar yetenekleriyle zenginleştir
    enriched_squad = [enrich_player(dict(p)) for p in team["squad"]]

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
        "max_weeks": 34, # 18 takım çift devreli lig = 34 hafta
        "season_finished": False,
        "season_result": None,
        "election_pending": False,
        "election_result": None,
        "team_power": team["power"],
        "budget": team["budget"],
        "debt": 250_000_000 if team.get("is_big") else 120_000_000,
        "fan_trust": team["fan_base"],
        "board_trust": 78,
        "political_power": 55, # Siyaset nüfuzu %0 - %100
        "media_trust": 70, # Basınla İlişkiler %0 - %100
        "stadium_capacity": team["stadium_cap"],
        "stadium_level": 1,
        "coach": {
            **team["coach"],
            "moral": 82,
            "trust": 78,
            "mistakes_count": 0,
            "praised_count": 0,
            "tactical_vision": "Yüksek Tempolu Hücum & Alan Daraltma"
        },
        "scout": SCOUT_CANDIDATES[0],
        "squad": enriched_squad,
        "fixtures": fixtures,
        "standings": standings,
        "captain_name": get_captain_name(enriched_squad),
        "squad_harmony": 82, # Takım içi huzur
        "transfer_day": 1,
        "transfer_max_days": 7,
        "transfer_window_open": True,
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
                        state["squad"] = [enrich_player(p) for p in state["squad"]]
                    if "max_weeks" not in state or state["max_weeks"] < 34:
                        state["max_weeks"] = 34
                    if "political_power" not in state:
                        state["political_power"] = 55
                    if "media_trust" not in state:
                        state["media_trust"] = 70
                    if "captain_name" not in state:
                        state["captain_name"] = get_captain_name(state.get("squad", []))
                    if "squad_harmony" not in state:
                        state["squad_harmony"] = 80
                    if "incoming_bids" not in state:
                        state["incoming_bids"] = []
                    return state
        except Exception:
            pass

    # Eğer varsayılan ana save dosyası varsa ve session default ise oradan yükle
    if sid == "default" and os.path.exists(SAVE_FILE):
        try:
            with open(SAVE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass

    state = default_career_state("trabzonspor", is_started=False)
    save_state(state, sid)
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
            "coach_name": t["coach"]["name"]
        }
        for t in TEAMS_DB
    ]

@app.get("/api/teams/all-squads")
def api_get_all_squads():
    # 18 takımın tam kadroları (Maaş, değer, sözleşme yılı, radar)
    result = []
    for t in TEAMS_DB:
        enriched = [enrich_player(dict(p)) for p in t["squad"]]
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
        squad[req.index1], squad[req.index2] = squad[req.index2], squad[req.index1]
        state["squad"] = squad
        state["my_radar"] = calculate_team_radar(squad)
        state["team_power"] = round(sum(p["overall"] for p in squad[:11]) / 11)
        save_state(state)
        return {"status": "ok", "state": state}
    raise HTTPException(status_code=400, detail="Geçersiz oyuncu sıralaması!")

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

@app.post("/api/reset")
def api_reset():
    state = default_career_state("trabzonspor", is_started=False)
    save_state(state)
    return state

# ==================== İKİ DEVRELİ MAÇ SİMÜLASYONU & SOYUNMA ODASI ====================
# Geçici maç hafızası (1. yarı ile 2. yarı arası köprü)
ACTIVE_MATCH_CACHE: Dict[str, Any] = {}

class Half1Request(BaseModel):
    press_boost: Optional[str] = None # 'derby_bonus', 'threaten_ref', 'provoke', 'calm'

@app.post("/api/match/half1")
def api_match_half1(req: Half1Request):
    state = get_state()
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

    # 1. Devre Gol Simülasyonu (Dakika 5 - 45)
    events = []
    my_score = 0
    opp_score = 0
    coach_mistakes = 0

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

    my_attackers = [p["name"] for p in healthy_squad if any(pos in p["pos"] for pos in ["FOR", "SANTRAFOR", "KANAT"])] or starting_xi
    my_midfielders = [p["name"] for p in healthy_squad if any(pos in p["pos"] for pos in ["OS", "MERKEZ", "LİBERO", "ARKASI"])] or starting_xi

    if opp_team and opp_team.get("squad"):
        opp_attackers = [p["name"] for p in opp_team["squad"] if any(pos in p["pos"] for pos in ["FOR", "SANTRAFOR", "KANAT"])] or [f"{opponent_name} Forveti"]
        opp_mids = [p["name"] for p in opp_team["squad"] if any(pos in p["pos"] for pos in ["OS", "MERKEZ", "LİBERO", "ARKASI"])] or [f"{opponent_name} Yıldızı"]
    else:
        opp_attackers = [f"{opponent_name} Forveti"]
        opp_mids = [f"{opponent_name} Yıldızı"]

    for m in range(5, 46, 5):
        roll = random.randint(1, 100)
        goal_chance_my = 12 + int((my_pwr - opp_pwr) * 0.9) + ref_bonus
        goal_chance_opp = 12 - int((my_pwr - opp_pwr) * 0.5)

        if roll < goal_chance_my:
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
        elif roll > (100 - goal_chance_opp):
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

    opp_team = next((t for t in TEAMS_DB if t["name"] == opponent_name), None)
    starting_xi = [p["name"] for p in state["squad"][:11]]
    my_attackers = [p["name"] for p in state["squad"] if any(pos in p["pos"] for pos in ["FOR", "SANTRAFOR", "KANAT"])] or starting_xi
    my_midfielders = [p["name"] for p in state["squad"] if any(pos in p["pos"] for pos in ["OS", "MERKEZ", "LİBERO", "ARKASI"])] or starting_xi

    if opp_team and opp_team.get("squad"):
        opp_attackers = [p["name"] for p in opp_team["squad"] if any(pos in p["pos"] for pos in ["FOR", "SANTRAFOR", "KANAT"])] or [f"{opponent_name} Forveti"]
        opp_mids = [p["name"] for p in opp_team["squad"] if any(pos in p["pos"] for pos in ["OS", "MERKEZ", "LİBERO", "ARKASI"])] or [f"{opponent_name} Yıldızı"]
    else:
        opp_attackers = [f"{opponent_name} Forveti"]
        opp_mids = [f"{opponent_name} Yıldızı"]

    # 2. Devre Gol Simülasyonu (Dakika 50 - 90)
    for m in range(50, 91, 5):
        roll = random.randint(1, 100)
        goal_chance_my = 12 + int((my_pwr - opp_pwr) * 0.9) + h1["ref_bonus"]
        goal_chance_opp = 12 - int((my_pwr - opp_pwr) * 0.5)

        if roll < goal_chance_my:
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
        elif roll > (100 - goal_chance_opp):
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

    # 2. Devre Kart ve Sakatlık Olayları
    healthy_starters = [p for p in state["squad"] if p.get("suspended_weeks", 0) == 0 and p.get("injured_weeks", 0) == 0][:11]
    if healthy_starters and random.random() < 0.45:
        cp = random.choice(healthy_starters)
        cp["yellow_cards"] = cp.get("yellow_cards", 0) + 1
        m_min = random.randint(52, 86)
        if cp["yellow_cards"] >= 4:
            cp["suspended_weeks"] = 1
            cp["yellow_cards"] = 0
            events.append({"minute": m_min, "type": "coach_mistake", "text": f"🟨 4. SARI KART! {cp['name']} cezalı duruma düştü, sonraki maç oynamayacak!"})
        else:
            events.append({"minute": m_min, "type": "coach_action", "text": f"🟨 SARI KART: {cp['name']} sert faul yaptı ({cp['yellow_cards']}/4 kart)."})

    if healthy_starters and random.random() < 0.04:
        rp = random.choice(healthy_starters)
        rp["suspended_weeks"] = 2
        events.append({"minute": random.randint(65, 88), "type": "coach_mistake", "text": f"🟥 DOĞRUDAN KIRMIZI KART! {rp['name']} hakemi protesto ettiği için atıldı (2 maç ceza)!"})

    if healthy_starters and random.random() < 0.12:
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

    # Hasılat ve Finans Hesaplamaları
    ticket_income = 0
    store_income = 0
    if is_home:
        ticket_price = 1_350 if is_derby else 500
        occupancy = min(1.0, (state["fan_trust"] + (25 if is_derby else 0)) / 100.0)
        ticket_income = int(state["stadium_capacity"] * ticket_price * occupancy)
        store_income = int(state["fan_trust"] * (350_000 if is_derby else 120_000))
    else:
        travel_cost = 3_500_000 if is_derby else 2_000_000
        state["budget"] = max(0, state["budget"] - travel_cost)
        store_income = int(state["fan_trust"] * 60_000)

    tv_income = 14_000_000 if is_derby else 7_000_000
    weekly_wage_expense = sum(p["wage"] for p in state["squad"]) // 34 + (state["coach"]["salary"] // 34)

    # Bankalar Birliği Borç Faizi Kesintisi
    debt_interest = int(state.get("debt", 200_000_000) * 0.003)
    net_income = (ticket_income + store_income + tv_income) - weekly_wage_expense - debt_interest
    state["budget"] += net_income

    state["finances"]["last_ticket_income"] = ticket_income
    state["finances"]["last_store_income"] = store_income
    state["finances"]["last_tv_income"] = tv_income
    state["finances"]["last_wage_expense"] = weekly_wage_expense
    state["finances"]["last_debt_interest"] = debt_interest

    # Transfer Tahtası ve Borç Kuralı
    if state["budget"] < -30_000_000:
        state["transfer_ban"] = True
        state["transfer_window_open"] = False
        state["news"].insert(0, "⚠️ TFF & BANKALAR BİRLİĞİ: Kulüp borç limitini aştığı için Transfer Tahtası KAPATILDI!")
    else:
        state["transfer_ban"] = False

    # Oyuncu Reytingleri (Sofascore)
    player_ratings = []
    match_players = list(state["squad"][:11])
    sub_scorers = [p for p in state["squad"][11:] if p["name"] in scorers]
    for sub in sub_scorers:
        if sub not in match_players:
            match_players.append(sub)

    for p in match_players:
        base_rtg = 6.4 + random.uniform(-0.4, 0.6)
        if my_score > opp_score:
            base_rtg += random.uniform(0.9, 1.4)
        elif my_score < opp_score:
            base_rtg -= random.uniform(0.7, 1.3)

        if p["name"] in scorers:
            base_rtg += 1.4
        if p["pos"] == "KL" and opp_score == 0:
            base_rtg += 1.1

        final_rtg = min(9.9, max(4.5, round(base_rtg, 1)))
        player_ratings.append({
            "name": p["name"],
            "pos": p["pos"],
            "rating": final_rtg,
            "goals": scorers.count(p["name"]),
            "is_sub": p in sub_scorers
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
    if my_score > opp_score:
        my_stand["wins"] += 1
        my_stand["points"] += 3
        opp_stand["losses"] += 1
        match_result = "Galibiyet"
        state["fan_trust"] = min(100, state["fan_trust"] + (4 if is_derby else 2))
        state["board_trust"] = min(100, state["board_trust"] + 3)
        state["coach"]["moral"] = min(100, state["coach"]["moral"] + 10)
        coach_statement = f"{state['coach']['name']}: 'Sahada aslanlar gibi savaşan futbolcularımı ve başkanımızı kutluyorum. Bu galibiyet camiamıza armağan olsun!'"
    elif my_score == opp_score:
        my_stand["draws"] += 1
        my_stand["points"] += 1
        opp_stand["draws"] += 1
        opp_stand["points"] += 1
        match_result = "Beraberlik"
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

    state["standings"].sort(key=lambda s: (s["points"], s["gd"], s["gf"]), reverse=True)

    cur_fixture = next(f for f in state["fixtures"] if f["week"] == state["week"])
    cur_fixture["played"] = True
    cur_fixture["my_score"] = my_score
    cur_fixture["opp_score"] = opp_score
    cur_fixture["result"] = match_result

    # Hafta İlerletme
    state["week"] += 1
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

    # Hafta 17 tamamlandığında ARA TRANSFER penceresini aç
    if state["week"] == 18:
        state["transfer_window_open"] = True
        state["transfer_day"] = 1
        state["transfer_max_days"] = 7
        state["news"].insert(0, "🔥 ARA TRANSFER DÖNEMİ RESMEN AÇILDI! Kulüpler masaya oturuyor!")

    opp_logo = (opp_team.get("logo") if opp_team else "") or ""
    home_name = state["club_name"] if is_home else opponent_name
    away_name = opponent_name if is_home else state["club_name"]
    home_logo = state.get("logo", "") if is_home else opp_logo
    away_logo = opp_logo if is_home else state.get("logo", "")

    match_data = {
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
        cost = 4_000_000
        if state["budget"] < cost:
            raise HTTPException(status_code=400, detail="Bakanlık ve Ankara ziyareti için 4M ₺ bütçe gerekli!")
        state["budget"] -= cost
        state["political_power"] = min(100, pol + 10)
        state["media_trust"] = min(100, state.get("media_trust", 70) + 4)
        msg = "🏛️ Ankara Ziyareti Başarılı: Spor Bakanlığı ve üst düzey bürokratlarla temas sağlandı (+10 Siyaset)!"
    elif req.action_type == "gov_project":
        cost = 15_000_000
        if state["budget"] < cost:
            raise HTTPException(status_code=400, detail="Devlet destekli gençlik & tesis projesi için 15M ₺ bütçe gerekli!")
        state["budget"] -= cost
        state["political_power"] = min(100, pol + 16)
        state["fan_trust"] = min(100, state["fan_trust"] + 8)
        msg = "🤝 Devlet Destekli Sosyal Proje: Kulüp gençlik akademisi protokolü imzalandı (+16 Siyaset, +8 Taraftar)!"
    elif req.action_type == "pro_statement":
        state["political_power"] = min(100, pol + 8)
        state["fan_trust"] = max(10, state["fan_trust"] - 4)
        msg = "📢 Hükümet & TFF Lehine Basın Açıklaması: Siyasi kanatta memnuniyet yarattı (+8 Siyaset, -4 Muhalif Taraftar)."
    else:
        raise HTTPException(status_code=400, detail="Geçersiz aksiyon!")

    state["news"].insert(0, msg)
    save_state(state)
    return {"message": msg, "state": state}

@app.post("/api/politics/presidential-grant")
def api_presidential_grant():
    state = get_state()
    pol = state.get("political_power", 50)

    if pol < 50:
        raise HTTPException(status_code=400, detail="Siyasi nüfuzunuz Cumhurbaşkanlığı makamına ulaşmak için yetersiz! (En az %50 Siyasi Nüfuz gereklidir)")

    # 1. Senaryo: Siyaset %90 Üstü -> Mega Hazine Arazisi Hibe Talebi (%80 Kabul)
    if pol >= 90:
        success = (random.random() < 0.80)
        if success:
            acres = 35
            state["real_estate"]["land_acres"] += acres
            state["budget"] += 50_000_000
            state["fan_trust"] = min(100, state["fan_trust"] + 15)
            state["board_trust"] = min(100, state["board_trust"] + 20)
            msg = f"🏛️ CUMHURBAŞKANLIĞI KARARNAMESİ: Sayın Cumhurbaşkanı kulübümüze {acres} DÖNÜM HAZİNE ARAZİSİ ve 50M ₺ altyapı hibesi tahsis etti!"
            state["news"].insert(0, msg)
            save_state(state)
            return {"status": "success", "type": "land", "message": msg, "state": state}
        else:
            # Ret ve Skandal!
            state["fan_trust"] = max(10, state["fan_trust"] - 25)
            state["board_trust"] = max(10, state["board_trust"] - 25)
            state["media_trust"] = max(10, state.get("media_trust", 70) - 20)
            state["political_power"] = max(20, pol - 20)
            msg = "❌ SARAY KAPISINDAN RET! Cumhurbaşkanlığı arazi talebini veto etti. Muhalif medya 'Kulüp rezil oldu' manşetleri attı!"
            state["news"].insert(0, msg)
            save_state(state)
            return {"status": "rejected", "type": "land", "message": msg, "state": state}

    # 2. Senaryo: Siyaset %50 - %89 Arası -> Acil Nakit Hibe Talebi (%35 Kabul)
    else:
        success = (random.random() < 0.35)
        if success:
            grant_money = 120_000_000
            state["budget"] += grant_money
            state["board_trust"] = min(100, state["board_trust"] + 12)
            msg = f"💰 SARAYDAN MÜJDE: Cumhurbaşkanlığı Acil Kulüp Fonu'ndan kulübümüze {grant_money:,} ₺ NAKİT HİBE onaylandı!"
            state["news"].insert(0, msg)
            save_state(state)
            return {"status": "success", "type": "cash", "message": msg, "state": state}
        else:
            # Ret ve Kamuoyu Baskısı
            state["fan_trust"] = max(10, state["fan_trust"] - 15)
            state["board_trust"] = max(10, state["board_trust"] - 15)
            state["media_trust"] = max(10, state.get("media_trust", 70) - 10)
            state["political_power"] = max(20, pol - 10)
            msg = "❌ HİBE TALEBİ REDDEDİLDİ! Cumhurbaşkanlığı kaynak yetersizliği gerekçesiyle talebi geri çevirdi. Basın 'Başkan Ankara'dan eli boş döndü' yazdı!"
            state["news"].insert(0, msg)
            save_state(state)
            return {"status": "rejected", "type": "cash", "message": msg, "state": state}

# ==================== TAKIM KAPTANI & KADRO HUZURSUZLUKLARI ====================
@app.get("/api/captain/report")
def api_captain_report():
    state = get_state()
    squad = state["squad"]
    captain = state.get("captain_name") or get_captain_name(squad)

    # Huzursuz veya zam talep eden oyuncuları filtrele
    unhappy_players = [p for p in squad if p.get("morale", 80) < 70]
    wage_demanding = [p for p in squad if p.get("contract_years", 2) == 1 or p.get("overall", 75) >= 83 and p.get("wage", 0) < 15_000_000]

    harmony = state.get("squad_harmony", 80)
    summary_text = ""
    if harmony >= 85:
        summary_text = f"Kaptan {captain}: 'Başkanım soyunma odasında kolej havası var. Herkes birbirine kenetlendi, şampiyonluk yolunda tam gaz ilerliyoruz.'"
    elif harmony >= 65:
        summary_text = f"Kaptan {captain}: 'Başkanım takımda genel durum fena değil ama bazı arkadaşlar maaş dengesizliğinden ve az süre almaktan şikayetçi.'"
    else:
        summary_text = f"Kaptan {captain}: 'Başkanım acil toplantı lazım! Takımda gruplaşma var ve bazı oyuncular antrenmana isteksiz çıkıyor.'"

    return {
        "captain_name": captain,
        "squad_harmony": harmony,
        "summary": summary_text,
        "unhappy_players": [p["name"] for p in unhappy_players[:3]],
        "wage_demands": [
            {
                "name": p["name"],
                "pos": p["pos"],
                "current_wage": p["wage"],
                "demanded_wage": int(p["wage"] * 1.3),
                "contract_years": p.get("contract_years", 2),
                "morale": p.get("morale", 80)
            }
            for p in wage_demanding[:4]
        ]
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

    if req.decision == "accept":
        player["wage"] = int(player["wage"] * 1.30)
        player["morale"] = 100
        state["squad_harmony"] = min(100, state.get("squad_harmony", 80) + 6)
        msg = f"🤝 {player['name']} ile el sıkışıldı! Maaşına %30 zam yapıldı, morali zirveye çıktı."
    elif req.decision == "renew_2yr":
        player["wage"] = int(player["wage"] * 1.15)
        player["contract_years"] = player.get("contract_years", 1) + 2
        player["morale"] = 92
        state["squad_harmony"] = min(100, state.get("squad_harmony", 80) + 4)
        msg = f"📑 {player['name']} sözleşmesini 2 YIL UZATTI (+%15 makul zam)."
    else: # reject
        player["morale"] = max(20, player.get("morale", 80) - 30)
        state["squad_harmony"] = max(30, state.get("squad_harmony", 80) - 8)
        msg = f"❌ {player['name']} için zam talebi reddedildi! Oyuncunun morali çöktü, ayrılmak isteyebilir."

    state["news"].insert(0, msg)
    save_state(state)
    return {"message": msg, "state": state}

# ==================== TEKNİK DİREKTÖR GELECEK VİZYONU ====================
class CoachVisionRequest(BaseModel):
    vision_focus: str # 'youth' (altyapı genci çıkar), 'defensive' (savunma kampı), 'attacking' (hücum temposu)

@app.post("/api/coach/future-vision")
def api_coach_future_vision(req: CoachVisionRequest):
    state = get_state()
    coach = state["coach"]

    if req.vision_focus == "youth":
        # Akademiden genç bir yetenek kadroya katılır
        academy_star = {
            "name": random.choice(["Erencan Aktaş", "Baran Yılmaz", "Semih Güler", "Oğuzhan Kaya"]),
            "pos": random.choice(["KANAT", "MERKEZ OS", "STP", "SANTRAFOR"]),
            "age": 18,
            "overall": 77,
            "wage": 2_500_000,
            "val": 22_000_000,
            "skills": {"pac": 85, "sho": 76, "pas": 75, "dri": 80, "def": 55, "phy": 72},
            "contract_years": 4,
            "morale": 100
        }
        state["squad"].append(academy_star)
        msg = f"🌟 ALTYAPIDAN YENİ YILDIZ: Hoca {coach['name']}, 18 yaşındaki {academy_star['name']} ({academy_star['pos']}) yeteneğini A takıma çıkardı!"
    elif req.vision_focus == "defensive":
        for p in state["squad"]:
            if "skills" in p and "def" in p["skills"]:
                p["skills"]["def"] = min(99, p["skills"]["def"] + 3)
                p["skills"]["phy"] = min(99, p["skills"]["phy"] + 2)
        coach["style"] = "Kaya Gibi Defans & Hızlı Kontratak"
        msg = f"🛡️ SAVUNMA DOKTRİNİ: {coach['name']} tüm takımı çelik gibi savunma disiplinine soktu (+3 Takım Defansı)!"
    else: # attacking
        for p in state["squad"]:
            if "skills" in p and "sho" in p["skills"]:
                p["skills"]["sho"] = min(99, p["skills"]["sho"] + 3)
                p["skills"]["pac"] = min(99, p["skills"]["pac"] + 2)
        coach["style"] = "Yüksek Pres & Tam Saha Baskın Hücum"
        msg = f"⚡ HÜCUM ŞOVU: {coach['name']} takımı tam saha baskı ve fırtına hücum sistemine geçirdi (+3 Takım Şutu)!"

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
    target_team = next((t for t in TEAMS_DB if t["id"] == req.target_team_id), None)
    if not target_team:
        raise HTTPException(status_code=404, detail="Kulüp bulunamadı!")

    player = next((p for p in target_team["squad"] if p["name"] == req.player_name), None)
    if not player:
        raise HTTPException(status_code=404, detail="Oyuncu bulunamadı!")

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
            p = next((x for x in target_team["squad"] if x["name"] == req.player_name), None)
            if p:
                found_player = dict(p)
                source_name = target_team["name"]

    if not found_player:
        raise HTTPException(status_code=404, detail="Oyuncu bulunamadı!")

    # Oyuncu kabul kriteri: Teklif edilen maaş
    min_wage = int(found_player.get("salary", found_player.get("wage", 10_000_000)))
    if req.offered_wage < int(min_wage * 0.9):
        raise HTTPException(status_code=400, detail=f"Oyuncu teklifi reddetti: 'Bu maaş seviyesi kariyer planlarıma uymuyor (En az {min_wage:,} ₺ bekliyor)!'")

    state["budget"] -= total_upfront
    new_entry = enrich_player({
        "name": found_player["name"],
        "pos": found_player["pos"],
        "age": found_player["age"],
        "overall": found_player.get("real_pot", found_player.get("overall", 80)),
        "wage": req.offered_wage,
        "val": found_player.get("price", found_player.get("val", 30_000_000)),
        "contract_years": 3,
        "morale": 95
    })
    state["squad"].append(new_entry)
    state["team_power"] += int((new_entry["overall"] - 72) * 0.3)
    state["fan_trust"] = min(100, state["fan_trust"] + 8)

    msg = f"🔥 YILIN TRANSFERİ: {new_entry['name']} ({new_entry['pos']}) kulübümüze resmen imzayı attı!"
    state["news"].insert(0, msg)
    save_state(state)
    return {"message": msg, "state": state}

# ==================== TRANSFER GÜNÜ İLERLETME & BİZE GELEN TEKLİFLER ====================
@app.post("/api/transfer/advance-day")
def api_transfer_advance_day():
    state = get_state()
    state["transfer_day"] = state.get("transfer_day", 1) + 1
    max_days = state.get("transfer_max_days", 7)

    # Rastgele bir oyuncumuza dış kulüplerden transfer teklifi oluştur
    if state["squad"] and random.random() < 0.65:
        target_player = random.choice(state["squad"][:11])
        offering_clubs = ["Aston Villa", "Sevilla", "Bologna", "Lille", "Ajax", "Sporting", "Al-Hilal", "Lazio"]
        club = random.choice(offering_clubs)
        offer_val = int(target_player.get("val", 30_000_000) * random.uniform(0.95, 1.4))
        
        bid = {
            "id": f"bid_{random.randint(1000, 9999)}",
            "club": club,
            "player_name": target_player["name"],
            "pos": target_player["pos"],
            "offer_val": offer_val
        }
        state["incoming_bids"] = [bid] # Güncel teklif
        state["news"].insert(0, f"💼 TRANSFER TEKLİFİ: {club}, {target_player['name']} için {offer_val:,} ₺ bonservis teklif etti!")

    if state["transfer_day"] > max_days:
        state["transfer_window_open"] = False
        msg = "🏁 TRANSFER DÖNEMİ SONA ERDİ! Pencereler kapandı, takımlar lig maçlarına odaklanıyor."
    else:
        msg = f"📅 Transfer Penceresinde {state['transfer_day']}. Gün başladı (Son {max_days - state['transfer_day'] + 1} Gün)!"

    state["news"].insert(0, msg)
    save_state(state)
    return {"message": msg, "state": state}

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

    if req.action == "accept":
        state["budget"] += bid["offer_val"]
        state["squad"] = [p for p in state["squad"] if p["name"] != player["name"]]
        state["incoming_bids"] = []
        msg = f"💰 OYUNCU SATILDI: {player['name']}, {bid['offer_val']:,} ₺ karşılığında {bid['club']} kulübüne transfer oldu!"
    elif req.action == "counter":
        # %50 şansla karşı kulüp ekstra %25 kabul eder
        if random.random() < 0.50:
            extra = int(bid["offer_val"] * 1.25)
            state["budget"] += extra
            state["squad"] = [p for p in state["squad"] if p["name"] != player["name"]]
            state["incoming_bids"] = []
            msg = f"🤝 PAZARLIK BAŞARILI: {bid['club']} artırdığımız teklifi kabul etti! {player['name']} {extra:,} ₺ bedelle satıldı!"
        else:
            state["incoming_bids"] = []
            msg = f"❌ {bid['club']} karşı teklifimizi çok bularak masadan kalktı. Transfer iptal oldu."
    else: # reject
        state["incoming_bids"] = []
        msg = f"🚫 TEKLİF REDDEDİLDİ: {player['name']} için gelen {bid['offer_val']:,} ₺ teklif geri çevrildi."

    state["news"].insert(0, msg)
    save_state(state)
    return {"message": msg, "state": state}

# ==================== TRANSFER MARKİKET (DÜNYA YILDIZLARI & SERBESTLER) ====================
@app.get("/api/transfer/market")
def api_transfer_market():
    # Klasik yetenekler + Serbest Oyuncular + Dünya Yıldızları
    return {
        "world_stars": WORLD_SUPERSTARS,
        "free_agents": FREE_AGENTS,
        "scout_picks": [
            {"name": "Mateo 'El Nino' Silva", "age": 19, "pos": "FORVET", "claimed_pot": 88, "real_pot": 89, "price": 50_000_000, "salary": 16_000_000, "desc": "Brezilya'da 18 maçta 16 gol attı."},
            {"name": "Lamine Diallo", "age": 23, "pos": "STOPER", "claimed_pot": 85, "real_pot": 85, "price": 38_000_000, "salary": 13_000_000, "desc": "Fransa Ligue 2'den kaya gibi genç stoper."},
            {"name": "Kerem Eren", "age": 18, "pos": "KANAT", "claimed_pot": 83, "real_pot": 86, "price": 20_000_000, "salary": 7_000_000, "desc": "Alt ligden fırlayan yerli pırlanta kanat oyuncusu."}
        ]
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

    # Hoca sezon sonu oyuncu önerilerini hazırla
    weak_positions = ["STP", "FORVET", "SOL BEK"]
    state["coach_recommendations"] = [
        {"name": "Mateo 'El Nino' Silva", "pos": "FORVET", "val": 50_000_000, "overall": 88, "reason": "Hücum hattımızın gol kısırlığını tamamen çözecek dünya çapında yetenek."},
        {"name": "Lamine Diallo", "pos": "STP", "val": 38_000_000, "overall": 85, "reason": "Defanstaki hava topları zaafımızı kapatacak kule stoper."},
        {"name": "Achraf Hakimi", "pos": "SAĞ BEK", "val": 125_000_000, "overall": 88, "reason": "Sağ kanadımızı şampiyonlar ligi seviyesine taşıyacak rüya transfer."}
    ]

    state["news"].insert(0, f"📅 {state['season']}. Sezon (34 Hafta) fikstürü çekildi, maraton başladı!")
    save_state(state)
    return state

# ==================== DİĞER KLASİK SERVİSLER ====================
@app.get("/api/scout/candidates")
def api_scout_candidates():
    return SCOUT_CANDIDATES

@app.get("/api/sponsors/available")
def api_get_sponsors():
    return AVAILABLE_SPONSORS

class SignSponsorRequest(BaseModel):
    sponsor_id: str

@app.post("/api/sponsors/sign")
def api_sign_sponsor(req: SignSponsorRequest):
    state = get_state()
    sp = next((s for s in AVAILABLE_SPONSORS if s["id"] == req.sponsor_id), None)
    if not sp:
        raise HTTPException(status_code=404, detail="Sponsor bulunamadı!")
    state["budget"] += sp["income_season"]
    state["finances"]["active_sponsors"].append(sp)
    state["news"].insert(0, f"🤝 YENİ SPONSOR: {sp['name']} (+{sp['income_season']:,} ₺)!")
    save_state(state)
    return {"message": f"{sp['name']} sponsoru imzalandı!", "state": state}

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
    coach = state["coach"]

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
        new_coach = random.choice([t["coach"] for t in TEAMS_DB if t["coach"]["name"] != coach["name"]])
        state["coach"] = {
            **new_coach,
            "moral": 80,
            "trust": 75,
            "mistakes_count": 0,
            "praised_count": 0,
            "tactical_vision": "Yüksek Tempolu Hücum & Alan Daraltma"
        }
        msg = f"{coach['name']} görevden alındı! Yeni teknik direktör: {new_coach['name']}!"

    state["coach_dialog_pending"] = False
    save_state(state)
    return {"message": msg, "state": state}

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static_assets")
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 5055))
    uvicorn.run(app, host="0.0.0.0", port=port)
