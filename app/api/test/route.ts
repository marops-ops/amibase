import { NextResponse } from "next/server";
import { existsSync } from "fs";
import { join } from "path";

export async function GET() {
  const path = join(process.cwd(), "public", "data", "enk", "03.json");
  const exists = existsSync(path);
  return NextResponse.json({ exists, cwd: process.cwd() });
}
