import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  // Hent alle unike kategorier via distinct
  const { data, error } = await supabase
    .rpc("get_unike_kategorier");

  if (error || !data) {
    // Fallback: hent fra nace_kategorier direkte
    const kategorier = [
      "Anlegg & infrastruktur","Annen industri","Apotek & farmasøytisk",
      "Arkitekter & rådgivende ingeniører","Avfall & gjenvinning","Barnehage",
      "Barnevern & sosiale tjenester","Bilhandel & deler","Byggevirksomhet",
      "Drikkevarer & bryggeri","Detaljhandel","Eiendomsdrift & vedlikehold",
      "Eiendomsutvikling & -forvaltning","Elektronikk & elektrisk utstyr",
      "Engroshandel","Film, foto & video","Finans, bank & investering",
      "Fiskehandel","Fiske & havbruk","Forsikring","Forskning & FoU",
      "Forlag & innholdsproduksjon","Fornybar energi & strøm",
      "Frisør, skjønnhet & velvære","HR, rekruttering & bemanning",
      "Hotell & overnatting","Inkasso & kredittjenester",
      "Informasjonstjenester & databaser","Jordbruk & landbruk",
      "Juridiske tjenester & advokater","Kjemikalier & plast",
      "Kontortjenester & administrasjon","Kringkasting & radio",
      "Kurs & etterutdanning","Lagring & lager","Landtransport & speditør",
      "Ledelseskonsulenter & strategi","Legekontor & spesialisthelsetjeneste",
      "Lotteri & spill","Lufttransport","Maskiner & utstyr","Metall & stål",
      "Metallvarer & verksted","Motorkjøretøy & deler","Møbler & trebearbeiding",
      "Næringsmiddelproduksjon","Offentlig forvaltning","Olje & gass",
      "Papir & emballasje","Post & budtjenester","Programvareutvikling & IT",
      "Regnskap & bokføring","Reklame & mediebyråer","Renhold & vask",
      "Reparasjon av forbruksvarer","Reise & turisme","Restauranter & kafeer",
      "Sjøtransport & shipping","Skogbruk","Spesialisert bygg & installasjon",
      "Sport, fritid & kultur","Sykehjem & hjemmetjenester","Telekommunikasjon",
      "Tekstil & bekledning","Treningssenter & idrett","Tannlege & tannhelse",
      "Utdanning & skole","Vannforsyning","Vakt & sikkerhet","Veterinær & dyreklinikk",
      "Andre personlige tjenester","Annet","Ukjent","Bergverk & utvinning",
      "Frivillige organisasjoner & ideell","Frivillige organisasjoner",
    ].sort();
    return NextResponse.json({ kategorier });
  }

  return NextResponse.json({ kategorier: data.sort() });
}
