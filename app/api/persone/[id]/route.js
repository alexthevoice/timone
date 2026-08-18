import { NextResponse } from "next/server";
import { segnaContatto } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * "Sentito oggi".
 *
 * Un gesto solo, e per ora l'unico che serve: la data dell'ultimo contatto è
 * il campo che rende utile l'anagrafica, ed è anche quello che nessuno aggiorna
 * mai se per farlo bisogna aprire Airtable.
 */
export async function PATCH(richiesta, { params }) {
  const { id } = await params;
  const patch = await richiesta.json().catch(() => ({}));
  if (patch.sentitoOggi) {
    await segnaContatto(id);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ errore: "Niente da fare" }, { status: 400 });
}
