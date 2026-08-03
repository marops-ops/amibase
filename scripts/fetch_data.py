import requests
import csv
import json
import os
import io
import gzip
import time
from datetime import datetime

LASTNED_URL = "https://data.brreg.no/enhetsregisteret/api/enheter/lastned/csv"
REGNSKAP_URL = "https://data.brreg.no/regnskapsregisteret/regnskap/{}"

FYLKENAVN = {
    "03":"Oslo","11":"Rogaland","15":"Møre og Romsdal","18":"Nordland",
    "31":"Østfold","32":"Akershus","33":"Buskerud","34":"Innlandet",
    "39":"Vestfold","40":"Telemark","42":"Agder","46":"Vestland",
    "50":"Trøndelag","55":"Troms","56":"Finnmark",
}

# NACE 2-sifret kode -> lesbar kategori (matcher lib/bransjer.ts)
NACE_KATEGORIER = {
    # Primærnæring
    "01": "Jordbruk & landbruk",
    "02": "Skogbruk",
    "03": "Fiske & havbruk",
    "05": "Bergverk & utvinning",
    "06": "Olje & gass",
    "07": "Bergverk & utvinning",
    "08": "Bergverk & utvinning",
    "09": "Olje & gass",
    # Industri
    "10": "Næringsmiddelproduksjon",
    "11": "Drikkevarer & bryggeri",
    "12": "Annen industri",
    "13": "Tekstil & bekledning",
    "14": "Tekstil & bekledning",
    "15": "Tekstil & bekledning",
    "16": "Møbler & trebearbeiding",
    "17": "Papir & emballasje",
    "18": "Forlag & innholdsproduksjon",
    "19": "Olje & gass",
    "20": "Kjemikalier & plast",
    "21": "Apotek & farmasøytisk",
    "22": "Kjemikalier & plast",
    "23": "Metallvarer & verksted",
    "24": "Metall & stål",
    "25": "Metallvarer & verksted",
    "26": "Elektronikk & elektrisk utstyr",
    "27": "Elektronikk & elektrisk utstyr",
    "28": "Maskiner & utstyr",
    "29": "Motorkjøretøy & deler",
    "30": "Motorkjøretøy & deler",
    "31": "Møbler & trebearbeiding",
    "32": "Annen industri",
    "33": "Maskiner & utstyr",
    # Energi
    "35": "Fornybar energi & strøm",
    "36": "Vannforsyning",
    "37": "Avfall & gjenvinning",
    "38": "Avfall & gjenvinning",
    "39": "Avfall & gjenvinning",
    # Bygg
    "41": "Byggevirksomhet",
    "42": "Anlegg & infrastruktur",
    "43": "Spesialisert bygg & installasjon",
    # Handel
    "45": "Bilhandel & deler",
    "46": "Engroshandel",
    "47": "Detaljhandel",
    # Transport
    "49": "Landtransport & speditør",
    "50": "Sjøtransport & shipping",
    "51": "Lufttransport",
    "52": "Lagring & lager",
    "53": "Post & budtjenester",
    # Overnatting & servering
    "55": "Hotell & overnatting",
    "56": "Restauranter & kafeer",
    # Informasjon
    "58": "Forlag & innholdsproduksjon",
    "59": "Film, foto & video",
    "60": "Kringkasting & radio",
    "61": "Telekommunikasjon",
    "62": "Programvareutvikling & IT",
    "63": "Informasjonstjenester & databaser",
    # Finans
    "64": "Finans, bank & investering",
    "65": "Forsikring",
    "66": "Inkasso & kredittjenester",
    # Eiendom
    "68": "Eiendomsutvikling & -forvaltning",
    # Faglig
    "69": "Juridiske tjenester & advokater",
    "70": "Ledelseskonsulenter & strategi",
    "71": "Arkitekter & rådgivende ingeniører",
    "72": "Forskning & FoU",
    "73": "Reklame & mediebyråer",
    "74": "Film, foto & video",
    "75": "Veterinær & dyreklinikk",
    # Utleie & tjenester
    "77": "Eiendomsdrift & vedlikehold",
    "78": "HR, rekruttering & bemanning",
    "79": "Reise & turisme",
    "80": "Vakt & sikkerhet",
    "81": "Renhold & vask",
    "82": "Kontortjenester & administrasjon",
    # Offentlig
    "84": "Offentlig forvaltning",
    # Utdanning
    "85": "Utdanning & skole",
    # Helse
    "86": "Legekontor & spesialisthelsetjeneste",
    "87": "Sykehjem & hjemmetjenester",
    "88": "Barnevern & sosiale tjenester",
    # Kultur
    "90": "Sport, fritid & kultur",
    "91": "Sport, fritid & kultur",
    "92": "Lotteri & spill",
    "93": "Treningssenter & idrett",
    # Org
    "94": "Frivillige organisasjoner & ideell",
    # Personlig
    "95": "Reparasjon av forbruksvarer",
    "96": "Frisør, skjønnhet & velvære",
    "97": "Andre personlige tjenester",
    "98": "Andre personlige tjenester",
    "99": "Andre personlige tjenester",
}

def get_nace_kategori(kode):
    if not kode:
        return "Ukjent"
    return NACE_KATEGORIER.get(kode[:2], "Annet")

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

def hent_regnskap_batch(orgnumre, batch_size=20):
    resultat = {}
    total = len(orgnumre)
    for i in range(0, total, batch_size):
        batch = orgnumre[i:i+batch_size]
        for orgnr in batch:
            try:
                r = requests.get(
                    REGNSKAP_URL.format(orgnr),
                    timeout=15,
                    headers={"Accept": "application/json"}
                )
                if not r.ok:
                    continue
                data = r.json()
                items = data if isinstance(data, list) else [data]
                if not items:
                    continue
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
                resultat[orgnr] = {
                    "aar": aar,
                    "inntekter": inntekter,
                    "driftsresultat": driftsresultat,
                    "aarsresultat": aarsresultat,
                    "lonnsomhet": lonnsomhet,
                }
            except Exception:
                continue
            time.sleep(0.05)
        if i % 500 == 0:
            print(f"    Regnskap: {min(i+batch_size, total):,}/{total:,}...", flush=True)
    return resultat

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
        "ENK":  {"form": ["ENK"],                 "fra": None, "til": None,  "regnskap": False},
        "SMB":  {"form": ["AS","ANS","DA","NUF"],  "fra": 1,   "til": 49,   "regnskap": True},
        "MID":  {"form": ["AS","ANS","NUF"],       "fra": 50,  "til": 200,  "regnskap": True},
        "STOR": {"form": ["AS","ANS","NUF"],       "fra": 201, "til": None, "regnskap": True},
    }

    print("\nSegmenterer...")
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

        print(f"\n▶ {key}: {len(resultat):,} enheter")

        if cfg["regnskap"] and resultat:
            print(f"  Henter regnskapstall...")
            orgnumre = [e["orgnr"] for e in resultat]
            regnskap_data = hent_regnskap_batch(orgnumre)
            for e in resultat:
                e["regnskap"] = regnskap_data.get(e["orgnr"])
            med_regnskap = sum(1 for e in resultat if e["regnskap"])
            print(f"  ✓ Regnskap hentet for {med_regnskap:,} av {len(resultat):,}")

        out = {"oppdatert": ts, "antall": len(resultat), "enheter": resultat}
        path = f"data/{key}.json"
        with open(path, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
        print(f"  → {path} lagret")

    print("\n✓ Ferdig!")

if __name__ == "__main__":
    main()
