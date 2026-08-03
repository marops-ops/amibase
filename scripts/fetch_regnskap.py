import requests
import json
import os
import time

REGNSKAP_URL = "https://data.brreg.no/regnskapsregisteret/regnskap/{}"

def hent_regnskap(orgnr):
    try:
        r = requests.get(
            REGNSKAP_URL.format(orgnr),
            timeout=15,
            headers={"Accept": "application/json"}
        )
        if not r.ok:
            return None
        data = r.json()
        items = data if isinstance(data, list) else [data]
        if not items:
            return None
        siste = sorted(items, key=lambda x: x.get("regnskapsperiode", {}).get("fraDato", ""), reverse=True)[0]
        inntekter = siste.get("resultatregnskapResultat", {}).get("driftsresultat", {}).get("driftsinntekter", {}).get("sumDriftsinntekter") or 0
        driftsresultat = siste.get("resultatregnskapResultat", {}).get("driftsresultat", {}).get("driftsresultat") or 0
        aarsresultat = siste.get("resultatregnskapResultat", {}).get("aarsresultat") or 0
        aar = (siste.get("regnskapsperiode", {}).get("fraDato") or "")[:4]
        if inntekter > 0:
            margin = driftsresultat / inntekter
            lonnsomhet = "god" if margin > 0.1 else "ok" if margin >= 0 else "lav"
        else:
            lonnsomhet = "ingen"
        return {
            "aar": aar,
            "inntekter": inntekter,
            "driftsresultat": driftsresultat,
            "aarsresultat": aarsresultat,
            "lonnsomhet": lonnsomhet,
        }
    except Exception:
        return None

def main():
    segmenter = ["SMB", "MID", "STOR"]

    for key in segmenter:
        path = f"data/{key}.json"
        if not os.path.exists(path):
            print(f"  ⚠ {path} ikke funnet, hopper over")
            continue

        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        enheter = data["enheter"]
        total = len(enheter)
        print(f"\n▶ {key}: henter regnskap for {total:,} enheter...")

        for i, e in enumerate(enheter):
            if e.get("regnskap"):
                continue
            e["regnskap"] = hent_regnskap(e["orgnr"])
            time.sleep(0.05)
            if i % 1000 == 0:
                print(f"  {i:,}/{total:,}...", flush=True)
                with open(path, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, separators=(",", ":"))

        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, separators=(",", ":"))

        med = sum(1 for e in enheter if e.get("regnskap"))
        print(f"  ✓ {med:,} av {total:,} har regnskap")

    print("\n✓ Ferdig!")

if __name__ == "__main__":
    main()
