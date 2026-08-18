import { NextResponse } from "next/server";
import { aggiornaTask, completaTask, eliminaTask, riapriTask } from "@/lib/store";

export const dynamic = "force-dynamic";

// In Next 16 i parametri della rotta arrivano come Promise: vanno attesi.
export async function PATCH(richiesta, { params }) {
  const { id } = await params;
  const patch = await richiesta.json().catch(() => ({}));

  // Completare non cancella: l'elemento resta nei dati con la sua data, ed è
  // il materiale con cui la review di fine settimana dirà cosa hai chiuso.
  if (patch.completa) {
    await completaTask(id);
    return NextResponse.json({ ok: true, completato: true });
  }

  // E si torna indietro: `completa: false` toglie la data e la riga ricompare
  // dov'era, con i suoi allegati. Il controllo è === false apposta, perché un
  // patch senza quel campo non deve riaprire niente.
  if (patch.completa === false) {
    await riapriTask(id);
    return NextResponse.json({ ok: true, riaperto: true });
  }

  await aggiornaTask(id, patch);
  return NextResponse.json({ ok: true });
}

export async function DELETE(richiesta, { params }) {
  const { id } = await params;
  await eliminaTask(id);
  return NextResponse.json({ ok: true });
}
