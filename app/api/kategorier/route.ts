import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from("enheter")
    .select("kategori")
    .not("kategori", "is", null)
    .limit(10000);

  if (error) return NextResponse.json({ kategorier: [] });

  const unike = [...new Set((data ?? []).map((r: any) => r.kategori).filter(Boolean))].sort();
  return NextResponse.json({ kategorier: unike });
}
