import { NextResponse } from "next/server";
import { aggiornaPersona, eliminaPersona, segnaContatto } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Una persona della Rubrica.
 *
 * PATCH fa due mestieri: il gesto rapido "sentito oggi" (l'unico che esisteva
 * prima), e la modifica dei campi dell'anagrafica. DELETE la elimina: i suoi
 * task restano, Airtable scioglie il collegamento da solo.
 */
export async function PATCH(richiesta, { params }) {
  const { id } = await params;
  const patch = await richiesta.json().catch(() => ({}));
  if (patch.sentitoOggi) {
    await segnaContatto(id);
    return NextResponse.json({ ok: true });
  }
  try {
    await aggiornaPersona(id, patch);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ errore: String(e.message || e).slice(0, 200) }, { status: 500 });
  }
}

export async function DELETE(richiesta, { params }) {
  const { id } = await params;
  try {
    await eliminaPersona(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ errore: String(e.message || e).slice(0, 200) }, { status: 500 });
  }
}
