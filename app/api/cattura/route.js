import { NextResponse } from "next/server";
import { scriviNellaScheda } from "@/lib/cattura";
import { smista } from "@/lib/classify";
import { scriviCattura, scriviMemoria } from "@/lib/store";

// Le rotte che servono dati non si fanno mettere in cache: senza questa riga
// Next può servire una risposta congelata e tu vedi il dato di prima.
export const dynamic = "force-dynamic";

/**
 * La rotta di cattura.
 *
 * Riceve un testo, lo fa smistare, e scrive in tre posti: nelle catture
 * grezze, in memoria, e nella scheda di destinazione. Restituisce dove è
 * finito, così l'interfaccia può dirlo.
 */
export async function POST(richiesta) {
  const { testo, provenienza } = await richiesta.json().catch(() => ({}));
  const pulito = String(testo ?? "").trim();

  if (!pulito) {
    return NextResponse.json({ errore: "Manca il testo" }, { status: 400 });
  }

  const esito = await smista(pulito);

  const cattura = await scriviCattura({
    testo: pulito,
    titolo: esito.titolo,
    provenienza: provenienza ?? "dashboard",
    destinazione: esito.destinazione,
    urgenza: esito.urgenza,
    via: esito.via,
  });

  // La memoria e la scheda di destinazione non si aspettano a vicenda:
  // partono insieme.
  const [, creato] = await Promise.all([
    scriviMemoria({ testo: pulito, provenienza: "cattura", origine: cattura.id }),
    scriviNellaScheda(esito, pulito),
  ]);

  return NextResponse.json({
    destinazione: esito.destinazione,
    titolo: esito.titolo,
    persona: esito.persona,
    urgenza: esito.urgenza,
    via: esito.via,
    catturaId: cattura.id,
    creatoId: creato?.id ?? null,
  });
}
