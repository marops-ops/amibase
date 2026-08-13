import requests
import csv
import json
import os
import io
import gzip
import sys
from datetime import datetime
from supabase import create_client

sys.path.insert(0, os.path.dirname(__file__))
from nace_kategorier import get_nace_kategori

LASTNED_URL = "https://data.brreg.no/enhetsregisteret/api/enheter/lastned/csv"

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

FYLKENAVN = {
    "03":"Oslo","11":"Rogaland","15":"Møre og Romsdal","18":"Nordland",
    "31":"Østfold","32":"Akershus","33":"Buskerud","34":"Innlandet",
    "39":"Vestfold","40":"Telemark","42":"Agder","46":"Vestland",
    "50":"Trøndelag","55":"Troms","56":"Finnmark",
}

def get_fylke(kommunenummer):
    if not kommunenummer:
        return ""
    return FYLKENAVN.get(str(kommunenummer)[:2], str(kommunenummer)[:2])

def last_ned_alle():
    print("Laster ned hele Enhetsregisteret (CSV)...")
    r = requests.get(LASTNED_URL, timeout=300)
    r.raise_for_status()
    innhold = r.content
    if innhold[:2] == b'\x1f\x8b':
        innhold = gzip.decompress(innhold)
    tekst = innhold.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(tekst, newline=""), delimiter=",")
    enheter = list(reader)
    print(f"  ✓ {len(enheter):,} enheter lastet ned")
    return enheter

def parse_enhet(e):
    kommnr = str(e.get("forretningsadresse.kommunenummer", "") or "")
    fylkekode = kommnr[:2] if kommnr else ""
    ansatte_raw = e.get("antallAnsatte", "")
    try:
        ansatte = int(ansatte_raw) if ansatte_raw else None
    except ValueError:
        ansatte = None
    nace_kode = e.get("naeringskode1.kode", "") or ""
    return {
        "orgnr": e.get("organisasjonsnummer", ""),
        "navn": e.get("navn", ""),
        "form": e.get("organisasjonsform.kode", ""),
        "ansatte": ansatte,
        "adresse": e.get("forretningsadresse.adresse", ""),
        "postnummer": e.get("forretningsadresse.postnummer", ""),
        "poststed": e.get("forretningsadresse.poststed", ""),
        "fylke": get_fylke(kommnr),
        "fylkekode": fylkekode,
        "nace": nace_kode,
        "kategori": get_nace_kategori(nace_kode),
        "regnskap": None,
        "oppdatert": datetime.now().isoformat(),
    }

def upsert_batch(supabase, batch):
    try:
        supabase.table("enheter").upsert(batch, on_conflict="orgnr").execute()
    except Exception as e:
        print(f"  ⚠ Feil ved upsert: {e}")

def main():
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    alle = last_ned_alle()

    segmenter = {
        "ENK":  {"form": ["ENK"],                "fra": None, "til": None},
        "SMB":  {"form": ["AS","ANS","DA","NUF"], "fra": 1,   "til": 49},
        "MID":  {"form": ["AS","ANS","NUF"],      "fra": 50,  "til": 200},
        "STOR": {"form": ["AS","ANS","NUF"],      "fra": 201, "til": None},
    }

    print("\nSegmenterer og laster til Supabase...")
    for key, cfg in segmenter.items():
        resultat = []
        for e in alle:
            if e.get("konkurs", "").strip().lower() == "true":
                continue
            if e.get("underAvvikling", "").strip().lower() == "true":
                continue
            form = e.get("organisasjonsform.kode", "").strip()
            if form not in cfg["form"]:
                continue
            ansatte_raw = e.get("antallAnsatte", "")
            try:
                ansatte = int(ansatte_raw) if ansatte_raw else None
            except ValueError:
                ansatte = None
            if cfg["fra"] is not None and (ansatte is None or ansatte < cfg["fra"]):
                continue
            if cfg["til"] is not None and ansatte is not None and ansatte > cfg["til"]:
                continue
            resultat.append(parse_enhet(e))

        print(f"\n▶ {key}: {len(resultat):,} enheter → Supabase...")
        batch_size = 500
        for i in range(0, len(resultat), batch_size):
            batch = resultat[i:i+batch_size]
            upsert_batch(supabase, batch)
            if i % 10000 == 0:
                print(f"  {i:,}/{len(resultat):,}...", flush=True)
        print(f"  ✓ {key} ferdig")

    print("\n✓ Ferdig!")

if __name__ == "__main__":
    main()
