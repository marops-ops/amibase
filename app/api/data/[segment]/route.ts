import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SEGMENT_FILTER: Record<string, (q: any) => any> = {
  ENK: (q) => q.eq("form", "ENK"),
  SMB: (q) => q.in("form", ["AS","ANS","DA","NUF"]).gte("ansatte", 1).lte("ansatte", 49),
  MID: (q) => q.in("form", ["AS","ANS","NUF"]).gte("ansatte", 50).lte("ansatte", 200),
  STOR: (q) => q.in("form", ["AS","ANS","NUF"]).gte("ansatte", 201),
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ segment: string }> }
) {
  const { segment } = await params;
  const key = segment.toUpperCase();

  if (!SEGMENT_FILTER[key]) {
    return NextResponse.json({ error: "Ukjent segment" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "0");

  // ENK er stor — bruk stor pageSize
  const pageSize = key === "ENK" ? 10000 : 1000;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("enheter")
    .select("orgnr,navn,form,ansatte,adresse,postnummer,poststed,fylke,fylkekode,nace,kategori,regnskap", { count: "exact" })
    .range(from, to);

  query = SEGMENT_FILTER[key](query);

  const { data, error, count } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    enheter: data ?? [],
    antall: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
    oppdatert: new Date().toISOString(),
  });
}
