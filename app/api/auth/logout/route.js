import { NextResponse } from "next/server";
import { COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const risposta = NextResponse.json({ ok: true });
  risposta.cookies.set({ name: COOKIE, value: "", path: "/", maxAge: 0 });
  return risposta;
}
