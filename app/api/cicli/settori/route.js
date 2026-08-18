import { NextResponse } from "next/server";
import { creaSettore, eliminaSettore, leggiSettori, rinominaSettore } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Le colonne del Kanban dei Cicli Aperti: si creano, si rinominano, si tolgono. */
export async function GET() {
  return NextResponse.json({ settori: await leggiSettori() });
}

export async function POST(richiesta) {
  const { nome } = await richiesta.json().catch(() => ({}));
  try {
    return NextResponse.json({ ok: true, settori: await creaSettore(nome) });
  } catch (errore) {
    return NextResponse.json({ errore: errore.message }, { status: 400 });
  }
}

export async function PATCH(richiesta) {
  const { vecchio, nuovo } = await richiesta.json().catch(() => ({}));
  try {
    const esito = await rinominaSettore(vecchio, nuovo);
    return NextResponse.json({ ok: true, ...esito });
  } catch (errore) {
    return NextResponse.json({ errore: errore.message }, { status: 400 });
  }
}

export async function DELETE(richiesta) {
  const { nome } = await richiesta.json().catch(() => ({}));
  if (!String(nome ?? "").trim()) {
    return NextResponse.json({ errore: "Manca il nome della colonna" }, { status: 400 });
  }
  const esito = await eliminaSettore(nome);
  return NextResponse.json({ ok: true, ...esito });
}
