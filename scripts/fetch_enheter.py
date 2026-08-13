import requests
import csv
import json
import os
import io
import gzip
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))
from nace_kategorier import get_nace_kategori

LASTNED_URL = "https://data.brreg.no/enhetsregisteret/api/enheter/lastned/csv"

FYLKENAVN = {
    "03":"Oslo","11":"Rogaland","15":"Møre og Romsdal","18":"Nordland",
    "31":"Østfold","32":"Akershus","33":"Buskerud","34":"Innlandet",
    "39":"Vestfold","40":"Telemark","42":"Agder","46":"Vestland",
    "50":"Trøndelag","55":"Troms","56":"Finnmark",
}

# Split ENK i to: Sør og Nord
ENK_SOR = {"03","11","31","32","33","34","39","40","42","46"}
ENK_NORD = {"15","18","50","55","56"}

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
        "ansatte": ansatte if ansatte is not None else "",
        "adresse": e.get("forretningsadresse.adresse", ""),
        "postnummer": e.get("forretningsadresse.postnummer", ""),
        "poststed": e.get("forretningsadresse.poststed", ""),
        "fylke": get_fylke(kommnr),
        "fylkekode": fylkekode,
        "nace": nace_kode,
        "kategori": get_nace_kategori(nace_kode),
        "regnskap": None,
    }

def main():
    os.makedirs("data", exist_ok=True)
    ts = datetime.now().isoformat()
    alle = last_ned_alle()

    segmenter = {
        "SMB":  {"form": ["AS","ANS","DA","NUF"], "fra": 1,   "til": 49},
        "MID":  {"form": ["AS","ANS","NUF"],      "fra": 50,  "til": 200},
        "STOR": {"form": ["AS","ANS","NUF"],      "fra": 201, "til": None},
    }

    print("\nSegmenterer...")
    for key, cfg in segmenter.items():
        resultat = []
        for e in alle:
            if e.get("konkurs", "").strip().lower() == "true": continue
            if e.get("underAvvikling", "").strip().lower() == "true": continue
            form = e.get("organisasjonsform.kode", "").strip()
            if form not in cfg["form"]: continue
            ansatte_raw = e.get("antallAnsatte", "")
            try:
                ansatte = int(ansatte_raw) if ansatte_raw else None
            except ValueError:
                ansatte = None
            if cfg["fra"] is not None and (ansatte is None or ansatte < cfg["fra"]): continue
            if cfg["til"] is not None and ansatte is not None and ansatte > cfg["til"]: continue
            resultat.append(parse_enhet(e))

        out = {"oppdatert": ts, "antall": len(resultat), "enheter": resultat}
        with open(f"data/{key}.json", "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
        print(f"  ✓ {key}: {len(resultat):,} → data/{key}.json")

    # ENK delt i Sør og Nord
    enk_sor, enk_nord, enk_ukjent = [], [], []
    for e in alle:
        if e.get("konkurs", "").strip().lower() == "true": continue
        if e.get("underAvvikling", "").strip().lower() == "true": continue
        if e.get("organisasjonsform.kode", "").strip() != "ENK": continue
        parsed = parse_enhet(e)
        if parsed["fylkekode"] in ENK_SOR:
            enk_sor.append(parsed)
        elif parsed["fylkekode"] in ENK_NORD:
            enk_nord.append(parsed)
        else:
            enk_ukjent.append(parsed)

    # Ukjente fylker fordeles på Sør
    enk_sor.extend(enk_ukjent)

    for key, data in [("ENK_SOR", enk_sor), ("ENK_NORD", enk_nord)]:
        out = {"oppdatert": ts, "antall": len(data), "enheter": data}
        with open(f"data/{key}.json", "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
        print(f"  ✓ {key}: {len(data):,} → data/{key}.json")

    print("\n✓ Ferdig!")

if __name__ == "__main__":
    main()
