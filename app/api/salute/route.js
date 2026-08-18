import { NextResponse } from "next/server";
import { giorniFa, oggi } from "@/lib/data";
import { CAMPI_SALUTE, leggiLog, leggiSalute, scriviSalute } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * I dati dell'orologio.
 *
 * Apple non pubblica Salute su internet: non esiste nessun indirizzo a cui un
 * server possa chiedere i passi di ieri, e non è una dimenticanza — è la
 * scelta di tenere quei dati sul telefono. Quindi il verso è l'opposto di
 * quello che verrebbe da immaginare: non siamo noi ad andare a prenderli, è il
 * telefono che ce li manda, con un'automazione di Comandi Rapidi che gira una
 * volta al giorno.
 *
 * Da qui discende tutto il resto:
 *
 * - La rotta accetta un invio parziale. Il comando della sera manda i passi,
 *   quello del mattino il sonno: chi arriva dopo non deve cancellare quello
 *   che ha scritto chi è arrivato prima.
 * - La data la decide chi manda, non il server. Un invio fatto alle 23:50 che
 *   arriva alle 00:01 riguarda il giorno che sta finendo.
 * - Non c'è nessun cookie: la scorciatoia del telefono si autentica con
 *   l'intestazione x-api-secret, che il proxy già riconosce.
 */
export async function POST(richiesta) {
  const corpo = await richiesta.json().catch(() => ({}));
  const giorno = /^\d{4}-\d{2}-\d{2}$/.test(corpo.data ?? "") ? corpo.data : oggi();

  // Comandi Rapidi non ha un modo comodo di costruire un oggetto annidato:
  // accettiamo sia i campi al primo livello sia dentro "misure".
  const misure = { ...corpo, ...(corpo.misure ?? {}) };

  // Cosa è arrivato, testuale e senza interpretazioni. È l'unico punto in cui
  // si può vedere la differenza fra "il telefono ha mandato un numero sbagliato"
  // e "il numero si è rotto qui dentro": in Comandi Rapidi lo stesso blocco può
  // mandare un valore diverso a seconda di come viene lanciato, e senza questa
  // riga l'unico modo di saperlo è indovinare.
  console.log(
    "[salute] ricevuto",
    JSON.stringify({
      data: giorno,
      valori: Object.fromEntries(
        Object.entries(misure)
          .filter(([k]) => k !== "data" && k !== "misure")
          .slice(0, 12)
          .map(([k, v]) => [k, String(v).slice(0, 40)])
      ),
    })
  );

  try {
    const esito = await scriviSalute(giorno, misure);
    console.log("[salute] scritti", JSON.stringify(esito.scritti), "vuoti", JSON.stringify(esito.vuoti ?? []));
    return NextResponse.json({ ok: true, ...esito });
  } catch (errore) {
    console.error("[salute]", errore.message);
    // Chi sta costruendo il comando lo sta facendo sul telefono, e quella
    // risposta è l'unica finestra che ha su cosa è arrivato davvero. Un "non
    // leggibile" senza il valore ricevuto è un vicolo cieco.
    return NextResponse.json(
      {
        errore: errore.message,
        ...(errore.dettagli ?? {}),
        ricevuto: Object.fromEntries(
          Object.entries(misure).slice(0, 12).map(([k, v]) => [k, String(v).slice(0, 60)])
        ),
        campiAccettati: CAMPI_SALUTE,
      },
      { status: 400 }
    );
  }
}

/** Quello che serve alla scheda: oggi, e i trenta giorni per la curva. */
export async function GET(richiesta) {
  const giorni = Math.min(365, Math.max(7, Number(new URL(richiesta.url).searchParams.get("giorni")) || 30));
  const giorno = oggi();

  try {
    const [log, storia] = await Promise.all([
      leggiLog(giorno),
      leggiSalute(giorniFa(giorni - 1), giorno),
    ]);
    return NextResponse.json({
      oggi: log.salute ?? {},
      oggiIso: giorno,
      storia,
      campi: CAMPI_SALUTE,
    });
  } catch (errore) {
    console.error("[salute]", errore.message);
    return NextResponse.json({ errore: errore.message }, { status: 500 });
  }
}
