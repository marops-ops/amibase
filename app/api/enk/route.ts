import { NextRequest, NextResponse } from "next/server";

const BASE = "https://data.brreg.no/enhetsregisteret/api/enheter";

const FYLKENAVN: Record<string, string> = {
  "03":"Oslo","11":"Rogaland","15":"Møre og Romsdal","18":"Nordland",
  "31":"Østfold","32":"Akershus","33":"Buskerud","34":"Innlandet",
  "39":"Vestfold","40":"Telemark","42":"Agder","46":"Vestland",
  "50":"Trøndelag","55":"Troms","56":"Finnmark",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = searchParams.get("page") || "0";

  const params = new URLSearchParams({
    organisasjonsform: "ENK",
    konkurs: "false",
    underAvvikling: "false",
    size: "100",
    page,
  });

  const res = await fetch(`${BASE}?${params}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });

  if (!res.ok) return NextResponse.json({ enheter: [], totalPages: 0 });

  const data = await res.json();
  const items = data?._embedded?.enheter ?? [];
  const totalPages = data?.page?.totalPages ?? 1;

  const enheter = items.map((e: any) => {
    const adr = e.forretningsadresse ?? {};
    const kommnr = String(adr.kommunenummer ?? "");
    const fylkekode = kommnr.slice(0, 2);
    return {
      orgnr: e.organisasjonsnummer ?? "",
      navn: e.navn ?? "",
      form: "ENK",
      ansatte: e.antallAnsatte ?? "",
      adresse: (adr.adresse ?? []).join(", "),
      postnummer: adr.postnummer ?? "",
      poststed: adr.poststed ?? "",
      fylke: FYLKENAVN[fylkekode] ?? fylkekode,
      fylkekode,
      nace: e.naeringskode1?.kode ?? "",
      kategori: "",
      regnskap: null,
    };
  });

  return NextResponse.json({ enheter, totalPages });
}
