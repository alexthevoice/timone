import { NextResponse } from "next/server";
import { segnaPeso } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Il peso di un giorno.
 *
 * Rotta sua e non un pezzo di /api/allenamento, perché il peso non dipende dal
 * programma: si scrive anche in un giorno di riposo, e continuerà a esistere
 * l'8 novembre quando il programma sarà finito. Se vivesse dentro la spunta
 * dell'allenamento, il giorno che il programma finisce sparirebbe la bilancia.
 */
export async function POST(richiesta) {
  const { data, peso } = await richiesta.json().catch(() => ({}));

  try {
    const esito = await segnaPeso(data, peso === undefined ? "" : peso);
    return NextResponse.json({ ok: true, ...esito });
  } catch (errore) {
    console.error("[peso]", errore.message);
    return NextResponse.json({ errore: errore.message }, { status: 400 });
  }
}
