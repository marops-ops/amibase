import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const ENK_FYLKER = ["03","11","15","18","21","31","32","33","34","39","40","42","46","50","55","56"];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ segment: string }> }
) {
  const { segment } = await params;
  const key = segment.toUpperCase();
  const allowed = ["ENK","SMB","MID","STOR"];
  if (!allowed.includes(key)) return NextResponse.json({ error: "Ukjent" }, { status: 400 });

  try {
    if (key === "ENK") {
      const alle: any[] = [];
      for (const f of ENK_FYLKER) {
        const path = join(process.cwd(), "public", "data", "enk", `${f}.json`);
        if (existsSync(path)) {
          const data = JSON.parse(readFileSync(path, "utf-8"));
          alle.push(...(data.enheter ?? []));
        }
      }
      return NextResponse.json({ enheter: alle, antall: alle.length, totalPages: 1 },
        { headers: { "Content-Type": "application/json" } });
    }

    const path = join(process.cwd(), "public", "data", `${key}.json`);
    const data = JSON.parse(readFileSync(path, "utf-8"));
    return NextResponse.json({ enheter: data.enheter, antall: data.antall, totalPages: 1 });
  } catch(e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
