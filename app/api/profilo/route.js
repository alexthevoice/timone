import { NextResponse } from "next/server";
import { aggiornaProfilo, leggiProfilo } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ profilo: await leggiProfilo() });
}

/** I dati dell'utente, da Config: nome, cognome e il resto del Profilo. */
export async function PATCH(richiesta) {
  const corpo = await richiesta.json().catch(() => ({}));
  const profilo = await aggiornaProfilo(corpo);
  return NextResponse.json({ ok: true, profilo });
}
