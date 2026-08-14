import requests
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from supabase import create_client

REGNSKAP_URL = "https://data.brreg.no/regnskapsregisteret/regnskap/{}"

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

MAX_WORKERS = 25       # samtidige Brreg-kall
BATCH_UPSERT = 200     # antall rader per batch-skriving til Supabase

def hent_regnskap(orgnr):
    try:
        r = requests.get(
            REGNSKAP_URL.format(orgnr),
            timeout=15,
            headers={"Accept": "application/json"}
        )
        if not r.ok:
            return orgnr, None
        data = r.json()
        items = data if isinstance(data, list) else [data]
        if not items:
            return orgnr, None
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
        return orgnr, {
            "aar": aar,
            "inntekter": inntekter,
            "driftsresultat": driftsresultat,
            "aarsresultat": aarsresultat,
            "lonnsomhet": lonnsomhet,
        }
    except Exception:
        return orgnr, None

def get_supabase():
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def batch_upsert(supabase, rader, retries=3):
    """Skriver en liste med {orgnr, regnskap} i én upsert i stedet for N enkeltkall."""
    if not rader:
        return 0
    payload = [{"orgnr": r["orgnr"], "regnskap": r["regnskap"]} for r in rader]
    for attempt in range(retries):
        try:
            supabase.table("enheter").upsert(payload, on_conflict="orgnr").execute()
            return len(payload)
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(2)
                supabase = get_supabase()
            else:
                print(f"  ⚠ Batch feilet ({len(payload)} rader): {e}")
    return 0

def main():
    supabase = get_supabase()

    print("Henter orgnr uten regnskap...")
    alle_orgnr = []
    page = 0
    while True:
        res = supabase.table("enheter") \
            .select("orgnr") \
            .in_("form", ["AS", "ANS", "DA", "NUF"]) \
            .is_("regnskap", "null") \
            .range(page * 1000, (page + 1) * 1000 - 1) \
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
    pending = []

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(hent_regnskap, orgnr): orgnr for orgnr in alle_orgnr}
        ferdig = 0
        for future in as_completed(futures):
            orgnr, regnskap = future.result()
            ferdig += 1
            if regnskap:
                pending.append({"orgnr": orgnr, "regnskap": regnskap})

            if len(pending) >= BATCH_UPSERT:
                oppdatert += batch_upsert(supabase, pending)
                pending = []

            if ferdig % 1000 == 0:
                print(f"  {ferdig:,}/{total:,} — {oppdatert:,} oppdatert...", flush=True)

    if pending:
        oppdatert += batch_upsert(supabase, pending)

    print(f"\n✓ Ferdig! {oppdatert:,} av {total:,} fikk regnskapstall")

if __name__ == "__main__":
    main()
