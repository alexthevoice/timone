import { NextResponse } from "next/server";
import { ID_MODALITA, modalitaValida } from "@/lib/modalita";
import { segnaAllenamento } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * La spunta dell'allenamento del giorno, con la modalità usata.
 *
 * Non calcola qui la data: quella è già scritta nella riga, e la riga è stata
 * creata all'importazione con il fuso dell'utente. Una spunta fatta a
 * mezzanotte e mezza deve restare sul giorno che stai finendo, non su quello
 * che il server ha già iniziato.
 *
 * Una modalità sbagliata non passa in silenzio: se si accettasse qualunque
 * stringa, il conteggio delle S, C ed E — che è tutto il senso della cosa —
 * si riempirebbe di categorie inventate senza che nessuno se ne accorga.
 */
export async function POST(richiesta) {
  const { id, fatto = true, modalita, peso } = await richiesta.json().catch(() => ({}));
  if (!id) return NextResponse.json({ errore: "Manca l'allenamento" }, { status: 400 });

  if (peso !== undefined && peso !== null && peso !== "" && !Number.isFinite(Number(peso))) {
    return NextResponse.json({ errore: "Il peso non è un numero" }, { status: 400 });
  }

  if (fatto && modalita !== undefined && modalita !== null && !modalitaValida(modalita)) {
    return NextResponse.json(
      { errore: `Modalità sconosciuta: "${modalita}". Sono ${ID_MODALITA.join(", ")}.` },
      { status: 400 }
    );
  }

  try {
    const riga = await segnaAllenamento(id, { fatto: Boolean(fatto), modalita, peso });
    return NextResponse.json({ ok: true, allenamento: riga });
  } catch (errore) {
    console.error("[allenamento]", errore.message);
    return NextResponse.json({ errore: errore.message }, { status: 500 });
  }
}
