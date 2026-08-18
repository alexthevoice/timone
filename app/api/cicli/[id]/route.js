import { NextResponse } from "next/server";
import { aggiornaCiclo, eliminaCiclo, promuoviCiclo } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function PATCH(richiesta, { params }) {
  const { id } = await params;
  const corpo = await richiesta.json().catch(() => ({}));
  await aggiornaCiclo(id, corpo);
  return NextResponse.json({ ok: true });
}

/**
 * La promozione: il ciclo diventa un task con fascia e scadenza.
 * POST e non PATCH perché nasce una riga nuova altrove: è una creazione,
 * il ciclo è solo il punto di partenza.
 */
export async function POST(richiesta, { params }) {
  const { id } = await params;
  const corpo = await richiesta.json().catch(() => ({}));
  try {
    const task = await promuoviCiclo(id, corpo);
    return NextResponse.json({ ok: true, taskId: task.id });
  } catch (errore) {
    return NextResponse.json({ errore: errore.message }, { status: 400 });
  }
}

export async function DELETE(richiesta, { params }) {
  const { id } = await params;
  await eliminaCiclo(id);
  return NextResponse.json({ ok: true });
}
