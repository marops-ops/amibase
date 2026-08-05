export interface BransjeGruppe {
  label: string;
  kategorier: string[];
}

export const BRANSJE_GRUPPER: BransjeGruppe[] = [
  {
    label: "Bygg, eiendom & anlegg",
    kategorier: [
      "Byggevirksomhet",
      "Anlegg & infrastruktur",
      "Spesialisert bygg & installasjon",
      "Eiendomsutvikling & -forvaltning",
      "Arkitekter & rådgivende ingeniører",
    ],
  },
  {
    label: "Handel & detaljhandel",
    kategorier: [
      "Detaljhandel",
      "Engroshandel",
      "Bilhandel & deler",
      "Netthandel & postordre",
    ],
  },
  {
    label: "Mat, drikke & overnatting",
    kategorier: [
      "Restauranter & kafeer",
      "Hotell & overnatting",
      "Næringsmiddelproduksjon",
      "Drikkevarer & bryggeri",
    ],
  },
  {
    label: "Transport & logistikk",
    kategorier: [
      "Landtransport & speditør",
      "Sjøtransport & shipping",
      "Lufttransport",
      "Lagring & lager",
      "Post & budtjenester",
    ],
  },
  {
    label: "Teknologi & digitale tjenester",
    kategorier: [
      "Programvareutvikling & IT",
      "Telekommunikasjon",
      "Informasjonstjenester & databaser",
      "Film, foto & video",
    ],
  },
  {
    label: "Markedsføring & kommunikasjon",
    kategorier: [
      "Reklame & mediebyråer",
      "Kringkasting & radio",
      "Forlag & innholdsproduksjon",
    ],
  },
  {
    label: "Økonomi, regnskap & juss",
    kategorier: [
      "Regnskap & bokføring",
      "Revisjon",
      "Regnskap & bokføring",
      "Juridiske tjenester & advokater",
      "Finans, bank & investering",
      "Forsikring",
      "Inkasso & kredittjenester",
    ],
  },
  {
    label: "Konsulent & rådgivning",
    kategorier: [
      "Ledelseskonsulenter & strategi",
      "HR, rekruttering & bemanning",
      "Skatte- & avgiftsrådgivning",
    ],
  },
  {
    label: "Helse & omsorg",
    kategorier: [
      "Legekontor & spesialisthelsetjeneste",
      "Tannlege & tannhelse",
      "Fysioterapi & rehabilitering",
      "Psykologi & psykisk helse",
      "Apotek & farmasøytisk",
      "Sykehjem & hjemmetjenester",
      "Barnevern & sosiale tjenester",
      "Veterinær & dyreklinikk",
    ],
  },
  {
    label: "Utdanning & opplæring",
    kategorier: [
      "Utdanning & skole",
      "Barnehage",
      "Kurs & etterutdanning",
    ],
  },
  {
    label: "Industri & produksjon",
    kategorier: [
      "Metall & stål",
      "Metallvarer & verksted",
      "Maskiner & utstyr",
      "Elektronikk & elektrisk utstyr",
      "Kjemikalier & plast",
      "Møbler & trebearbeiding",
      "Papir & emballasje",
      "Tekstil & bekledning",
      "Motorkjøretøy & deler",
      "Annen industri",
    ],
  },
  {
    label: "Energi, miljø & ressurser",
    kategorier: [
      "Olje & gass",
      "Fornybar energi & strøm",
      "Vannforsyning",
      "Avfall & gjenvinning",
    ],
  },
  {
    label: "Primærnæring",
    kategorier: [
      "Jordbruk & landbruk",
      "Skogbruk",
      "Fiske & havbruk",
      "Bergverk & utvinning",
    ],
  },
  {
    label: "Personlige tjenester & fritid",
    kategorier: [
      "Frisør, skjønnhet & velvære",
      "Treningssenter & idrett",
      "Sport, fritid & kultur",
      "Reise & turisme",
      "Reparasjon av forbruksvarer",
      "Andre personlige tjenester",
    ],
  },
  {
    label: "Renhold, vakt & facility",
    kategorier: [
      "Renhold & vask",
      "Vakt & sikkerhet",
      "Eiendomsdrift & vedlikehold",
      "Kontortjenester & administrasjon",
    ],
  },
  {
    label: "Offentlig, ideell & org",
    kategorier: [
      "Offentlig forvaltning",
      "Frivillige organisasjoner & ideell",
      "Lotteri & spill",
    ],
  },
  {
    label: "Forskning & utvikling",
    kategorier: [
      "Forskning & FoU",
    ],
  },
];

export function getAlleKategorier(): string[] {
  return BRANSJE_GRUPPER.flatMap(g => g.kategorier);
}
