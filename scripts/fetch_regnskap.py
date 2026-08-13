import requests
import os
import time
from supabase import create_client

REGNSKAP_URL = "https://data.brreg.no/regnskapsregisteret/regnskap/{}"

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

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
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Hent kun orgnr som mangler regnskap (regnskap is null)
    # Kun AS/ANS/NUF/DA — ENK har ikke regnskap
    print("Henter orgnr uten regnskap...")
    
    alle_orgnr = []
    page = 0
    while True:
        res = supabase.table("enheter")\
            .select("orgnr")\
            .in_("form", ["AS","ANS","DA","NUF"])\
            .is_("regnskap", "null")\
            .range(page * 1000, (page + 1) * 1000 - 1)\
            .execute()
        
        batch = [r["orgnr"] for r in (res.data or [])]
        alle_orgnr.extend(batch)
        
        if len(batch) < 1000:
            break
        page += 1

    total = len(alle_orgnr)
    print(f"  ✓ {total:,} bedrifter mangler regnskap")

    if total == 0:
        print("Ingen nye å hente — alt er oppdatert!")
        return

    oppdatert = 0
    for i, orgnr in enumerate(alle_orgnr):
        regnskap = hent_regnskap(orgnr)
        if regnskap:
            supabase.table("enheter")\
                .update({"regnskap": regnskap})\
                .eq("orgnr", orgnr)\
                .execute()
            oppdatert += 1
        
        time.sleep(0.05)
        
        if i % 1000 == 0:
            print(f"  {i:,}/{total:,} — {oppdatert:,} oppdatert...", flush=True)

    print(f"\n✓ Ferdig! {oppdatert:,} av {total:,} fikk regnskapstall")

if __name__ == "__main__":
    main()
