import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const JSON_SEGMENTS = ["SMB", "MID", "STOR", "ENK_SOR", "ENK_NORD"];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ segment: string }> }
) {
  const { segment } = await params;
  const key = segment.toUpperCase();

  // ENK kombinerer SOR + NORD fra JSON
  if (key === "ENK") {
    try {
      const sor = JSON.parse(readFileSync(join(process.cwd(), "data", "ENK_SOR.json"), "utf-8"));
      const nord = JSON.parse(readFileSync(join(process.cwd(), "data", "ENK_NORD.json"), "utf-8"));
      const alle = [...sor.enheter, ...nord.enheter];
      return NextResponse.json({ enheter: alle, antall: alle.length, totalPages: 1, oppdatert: sor.oppdatert });
    } catch {
      return NextResponse.json({ error: "ENK data ikke tilgjengelig" }, { status: 404 });
    }
  }

  // SMB, MID, STOR fra JSON
  if (["SMB","MID","STOR"].includes(key)) {
    try {
      const path = join(process.cwd(), "data", `${key}.json`);
      const data = JSON.parse(readFileSync(path, "utf-8"));
      return NextResponse.json({ enheter: data.enheter, antall: data.antall, totalPages: 1, oppdatert: data.oppdatert });
    } catch {
      return NextResponse.json({ error: "Data ikke tilgjengelig" }, { status: 404 });
    }
  }

  return NextResponse.json({ error: "Ukjent segment" }, { status: 400 });
}
