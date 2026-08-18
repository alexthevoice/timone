import { NextResponse } from "next/server";
import { aggiornaObiettivo, eliminaObiettivo } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function PATCH(richiesta, { params }) {
  const { id } = await params;
  const patch = await richiesta.json().catch(() => ({}));
  await aggiornaObiettivo(id, patch);
  return NextResponse.json({ ok: true });
}

/**
 * Gli obiettivi escono dalla lista solo così: a mano.
 * Non c'è nessuna logica legata al cambio di settimana o di mese, ed è il punto
 * della scheda. Un'abitudine è una misurazione e si azzera; un obiettivo è una
 * promessa, e una promessa non smette di esistere lunedì mattina.
 */
export async function DELETE(richiesta, { params }) {
  const { id } = await params;
  await eliminaObiettivo(id);
  return NextResponse.json({ ok: true });
}
