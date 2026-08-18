import { NextResponse } from "next/server";
import { creaCiclo, leggiCicli, riordinaCicli } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ cicli: await leggiCicli() });
}

export async function POST(richiesta) {
  const corpo = await richiesta.json().catch(() => ({}));
  if (!corpo.titolo?.trim()) {
    return NextResponse.json({ errore: "Manca il titolo" }, { status: 400 });
  }
  const creato = await creaCiclo(corpo);
  return NextResponse.json({ id: creato.id });
}

/** Il riordino del Kanban: stessa forma di /api/task, colonna = settore. */
export async function PATCH(richiesta) {
  const { settore, ordine } = await richiesta.json().catch(() => ({}));
  if (settore === undefined || !Array.isArray(ordine)) {
    return NextResponse.json({ errore: "Servono settore e ordine" }, { status: 400 });
  }
  await riordinaCicli(settore, ordine);
  return NextResponse.json({ ok: true });
}
