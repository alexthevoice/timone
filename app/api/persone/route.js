import { NextResponse } from "next/server";
import { creaPersona } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Una persona nuova in Rubrica. Basta il nome o il cognome: il resto dopo. */
export async function POST(richiesta) {
  const dati = await richiesta.json().catch(() => ({}));
  try {
    const riga = await creaPersona(dati);
    return NextResponse.json({ ok: true, id: riga.id });
  } catch (e) {
    return NextResponse.json({ errore: String(e.message || e).slice(0, 200) }, { status: 400 });
  }
}
