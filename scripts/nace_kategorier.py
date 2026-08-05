# 3-sifret overstyring for spesifikke NACE-koder
NACE_3_SIFFER = {
    "69.1": "Juridiske tjenester & advokater",
    "69.2": "Regnskap & bokføring",
    "86.1": "Sykehus & spesialisthelsetjeneste",
    "86.2": "Legekontor & spesialisthelsetjeneste",
    "86.9": "Legekontor & spesialisthelsetjeneste",
    "85.1": "Barnehage",
    "85.2": "Utdanning & skole",
    "85.3": "Utdanning & skole",
    "85.4": "Kurs & etterutdanning",
    "85.5": "Kurs & etterutdanning",
    "45.1": "Bilhandel & deler",
    "45.2": "Bilhandel & deler",
    "45.3": "Bilhandel & deler",
    "45.4": "Bilhandel & deler",
}

NACE_2_SIFFER = {
    "01":"Jordbruk & landbruk","02":"Skogbruk","03":"Fiske & havbruk",
    "05":"Bergverk & utvinning","06":"Olje & gass","07":"Bergverk & utvinning",
    "08":"Bergverk & utvinning","09":"Olje & gass",
    "10":"Næringsmiddelproduksjon","11":"Drikkevarer & bryggeri","12":"Annen industri",
    "13":"Tekstil & bekledning","14":"Tekstil & bekledning","15":"Tekstil & bekledning",
    "16":"Møbler & trebearbeiding","17":"Papir & emballasje","18":"Forlag & innholdsproduksjon",
    "19":"Olje & gass","20":"Kjemikalier & plast","21":"Apotek & farmasøytisk",
    "22":"Kjemikalier & plast","23":"Metallvarer & verksted","24":"Metall & stål",
    "25":"Metallvarer & verksted","26":"Elektronikk & elektrisk utstyr",
    "27":"Elektronikk & elektrisk utstyr","28":"Maskiner & utstyr",
    "29":"Motorkjøretøy & deler","30":"Motorkjøretøy & deler",
    "31":"Møbler & trebearbeiding","32":"Annen industri","33":"Maskiner & utstyr",
    "35":"Fornybar energi & strøm","36":"Vannforsyning",
    "37":"Avfall & gjenvinning","38":"Avfall & gjenvinning","39":"Avfall & gjenvinning",
    "41":"Byggevirksomhet","42":"Anlegg & infrastruktur","43":"Spesialisert bygg & installasjon",
    "45":"Bilhandel & deler","46":"Engroshandel","47":"Detaljhandel",
    "49":"Landtransport & speditør","50":"Sjøtransport & shipping","51":"Lufttransport",
    "52":"Lagring & lager","53":"Post & budtjenester",
    "55":"Hotell & overnatting","56":"Restauranter & kafeer",
    "58":"Forlag & innholdsproduksjon","59":"Film, foto & video","60":"Kringkasting & radio",
    "61":"Telekommunikasjon","62":"Programvareutvikling & IT","63":"Informasjonstjenester & databaser",
    "64":"Finans, bank & investering","65":"Forsikring","66":"Inkasso & kredittjenester",
    "68":"Eiendomsutvikling & -forvaltning","69":"Juridiske tjenester & advokater",
    "70":"Ledelseskonsulenter & strategi","71":"Arkitekter & rådgivende ingeniører",
    "72":"Forskning & FoU","73":"Reklame & mediebyråer","74":"Film, foto & video",
    "75":"Veterinær & dyreklinikk","77":"Eiendomsdrift & vedlikehold",
    "78":"HR, rekruttering & bemanning","79":"Reise & turisme",
    "80":"Vakt & sikkerhet","81":"Renhold & vask","82":"Kontortjenester & administrasjon",
    "84":"Offentlig forvaltning","85":"Utdanning & skole",
    "86":"Legekontor & spesialisthelsetjeneste","87":"Sykehjem & hjemmetjenester",
    "88":"Barnevern & sosiale tjenester","90":"Sport, fritid & kultur",
    "91":"Sport, fritid & kultur","92":"Lotteri & spill","93":"Treningssenter & idrett",
    "94":"Frivillige organisasjoner & ideell","95":"Reparasjon av forbruksvarer",
    "96":"Frisør, skjønnhet & velvære","97":"Andre personlige tjenester",
    "98":"Andre personlige tjenester","99":"Andre personlige tjenester",
}

def get_nace_kategori(kode):
    if not kode:
        return "Ukjent"
    # Prøv 3-sifret kode først (f.eks. "69.2")
    if len(kode) >= 4:
        tre = kode[:4]  # f.eks. "69.2"
        if tre in NACE_3_SIFFER:
            return NACE_3_SIFFER[tre]
    # Fallback til 2-sifret
    return NACE_2_SIFFER.get(kode[:2], "Annet")
