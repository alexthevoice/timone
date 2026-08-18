import { NextResponse } from "next/server";
import { creaTask, leggiTask, riordinaFascia } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(richiesta) {
  const includiCompletati =
    new URL(richiesta.url).searchParams.get("completati") === "si";
  return NextResponse.json({ task: await leggiTask({ includiCompletati }) });
}

export async function POST(richiesta) {
  const corpo = await richiesta.json().catch(() => ({}));
  if (!corpo.titolo?.trim()) {
    return NextResponse.json({ errore: "Manca il titolo" }, { status: 400 });
  }
  const creato = await creaTask(corpo);
  return NextResponse.json({ id: creato.id });
}

/**
 * Il riordino del Kanban.
 *
 * Quell'ordine non è cosmesi: è la tua priorità, ed è esattamente quello che
 * Session usa per scegliere le tre cose del mattino. Al rilascio di una carta
 * si riscrivono le posizioni della fascia toccata — esistono schemi più furbi,
 * pensati per non riscrivere migliaia di righe, ma tu ne hai qualche decina e
 * la versione semplice è quella che non si rompe.
 */
export async function PATCH(richiesta) {
  const { fascia, ordine } = await richiesta.json().catch(() => ({}));
  if (!fascia || !Array.isArray(ordine)) {
    return NextResponse.json({ errore: "Servono fascia e ordine" }, { status: 400 });
  }
  await riordinaFascia(fascia, ordine);
  return NextResponse.json({ ok: true });
}
