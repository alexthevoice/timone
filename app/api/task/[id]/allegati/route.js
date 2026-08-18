import { NextResponse } from "next/server";
import { LIMITE_ALLEGATO } from "@/lib/airtable";
import { allegaAlTask, staccaDalTask } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * I file attaccati a un task.
 *
 * Il file arriva dal browser come multipart e riparte verso Airtable come
 * base64. Non si appoggia da nessuna parte nel mezzo: nessuna cartella
 * temporanea, nessun indirizzo pubblico da ricordarsi di ripulire.
 *
 * Il limite di cinque megabyte è di Airtable, non nostro, ed è meglio dirlo
 * subito che far aspettare mezzo minuto un caricamento che finirà male.
 */
export async function POST(richiesta, { params }) {
  const { id } = await params;

  let modulo;
  try {
    modulo = await richiesta.formData();
  } catch {
    return NextResponse.json({ errore: "Non è arrivato nessun file" }, { status: 400 });
  }

  const file = modulo.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ errore: "Non è arrivato nessun file" }, { status: 400 });
  }

  if (file.size > LIMITE_ALLEGATO) {
    return NextResponse.json(
      { errore: `Il file pesa troppo: il limite è ${Math.round(LIMITE_ALLEGATO / 1024 / 1024)} MB.` },
      { status: 413 }
    );
  }

  try {
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    await allegaAlTask(id, { nome: file.name, tipo: file.type, base64 });
    // Non si rimanda indietro l'elenco degli allegati: quello che risponde
    // Airtable al caricamento non è la riga aggiornata, e restituirlo come se
    // lo fosse significherebbe mandare al browser una lista che sembra vera e
    // non lo è. Chi ha caricato rilegge, che costa una chiamata ed è onesto.
    return NextResponse.json({ ok: true, nome: file.name });
  } catch (errore) {
    console.error("[allegati]", errore.message);
    return NextResponse.json({ errore: errore.message }, { status: 500 });
  }
}

export async function DELETE(richiesta, { params }) {
  const { id } = await params;
  const allegato = new URL(richiesta.url).searchParams.get("allegato");
  if (!allegato) {
    return NextResponse.json({ errore: "Manca l'allegato da togliere" }, { status: 400 });
  }

  try {
    await staccaDalTask(id, allegato);
    return NextResponse.json({ ok: true });
  } catch (errore) {
    console.error("[allegati]", errore.message);
    return NextResponse.json({ errore: errore.message }, { status: 500 });
  }
}
