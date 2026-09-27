# -*- coding: utf-8 -*-
import pprint
import teams_data

def reorder_squad(squad):
    gks = [p for p in squad if "KL" in p["pos"]]
    defs = [p for p in squad if any(k in p["pos"] for k in ["STP", "BEK", "DEFANS"])]
    mids = [p for p in squad if any(k in p["pos"] for k in ["OS", "LİBERO", "ARKASI"])]
    fwds = [p for p in squad if any(k in p["pos"] for k in ["KANAT", "SANTRAFOR", "FORVET"]) and "ARKASI" not in p["pos"]]

    gks.sort(key=lambda x: x["overall"], reverse=True)
    defs.sort(key=lambda x: x["overall"], reverse=True)
    mids.sort(key=lambda x: x["overall"], reverse=True)
    fwds.sort(key=lambda x: x["overall"], reverse=True)

    # Starting 11: Exactly 1 GK, 4 DEF, 3 MID, 3 FWD
    starters = []
    if gks:
        starters.append(gks[0])
    starters.extend(defs[:4])
    starters.extend(mids[:3])
    starters.extend(fwds[:3])

    # Bench: Exactly 1 GK, 2 DEF, 2 MID, 2 FWD
    bench = []
    if len(gks) > 1:
        bench.append(gks[1])
    bench.extend(defs[4:6])
    bench.extend(mids[3:5])
    bench.extend(fwds[3:5])

    full = starters + bench
    all_names = {p["name"] for p in full}
    rem = [p for p in squad if p["name"] not in all_names]
    rem.sort(key=lambda x: x["overall"], reverse=True)
    while len(full) < 18 and rem:
        full.append(rem.pop(0))

    return full

updated_teams = []
for t in teams_data.TEAMS_DB:
    new_squad = reorder_squad(t["squad"])
    gk_count = len([p for p in new_squad[:11] if "KL" in p["pos"]])
    def_count = len([p for p in new_squad[:11] if any(k in p["pos"] for k in ["STP", "BEK", "DEFANS"])])
    mid_count = len([p for p in new_squad[:11] if any(k in p["pos"] for k in ["OS", "LİBERO", "ARKASI"])])
    fwd_count = len([p for p in new_squad[:11] if any(k in p["pos"] for k in ["KANAT", "SANTRAFOR", "FORVET"]) and "ARKASI" not in p["pos"]])
    print(f"{t['name']:20} -> Starter XI: {gk_count} GK, {def_count} DEF, {mid_count} MID, {fwd_count} FWD | Total: {len(new_squad)}")
    t["squad"] = new_squad
    # Recalculate team power based on the true starting 11
    t["power"] = int(sum(p["overall"] for p in new_squad[:11]) / 11)
    updated_teams.append(t)

with open("teams_data.py", "w", encoding="utf-8") as f:
    f.write("# -*- coding: utf-8 -*-\n")
    f.write("# 18 Süper Lig Kulübü - Transfermarkt 2026/2027 (Gerçekçi 4-3-3 İlk 11 + Yedekler)\n\n")
    f.write("TEAMS_DB = ")
    f.write(pprint.pformat(updated_teams, indent=4, width=120, sort_dicts=False))
    f.write("\n")

print("\nSuccessfully updated teams_data.py with real 4-3-3 tactical starting XI!")
