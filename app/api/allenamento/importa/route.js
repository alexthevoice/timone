import { NextResponse } from "next/server";
import { piuGiorni } from "@/lib/data";
import { importaProgramma } from "@/lib/store";

export const dynamic = "force-dynamic";
// Un programma lungo sono molte chiamate ad Airtable in fila: con il tempo
// predefinito di dieci secondi si finirebbe a metà, e mezzo programma dentro
// è peggio di nessun programma.
export const maxDuration = 60;

/**
 * Srotola un programma a partire da una data e lo scrive.
 *
 * Il programma arriva nel corpo della richiesta, non da un file nel codice:
 * ognuno carica il suo. La forma è questa:
 *
 *   {
 *     "inizio": "2026-09-01",
 *     "programma": {
 *       "nome": "Il mio programma",
 *       "giorni": [
 *         { "giorno": 1, "settimana": 1, "fase": "Base", "tipo": "camminata",
 *           "titolo": "Camminata 40'", "dettaglio": "Passo svelto, senza fermarsi",
 *           "target": "", "pesata": true },
 *         ...
 *       ]
 *     }
 *   }
 *
 * `giorno` parte da 1 e le date si srotolano da `inizio`: il giorno 1 è
 * l'inizio, il giorno 8 è una settimana dopo. `conversione` è facoltativo e
 * serve alle versioni corte (vedi lib/modalita.js); se manca vale il tipo.
 *
 * Si chiama una volta, a mano o guidati dalla propria guida. Di suo non
 * sovrascrive niente: se il programma è già dentro risponde e basta. Per
 * rifarlo da un'altra data serve dirlo esplicitamente con "sostituisci",
 * perché quello cancella anche le spunte già date.
 */
export async function POST(richiesta) {
  const { inizio, programma, sostituisci = false } = await richiesta.json().catch(() => ({}));

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(inizio ?? ""))) {
    return NextResponse.json(
      { errore: 'Serve "inizio" nel formato YYYY-MM-DD: è il giorno 1 del programma.' },
      { status: 400 }
    );
  }
  const nome = String(programma?.nome ?? "").trim();
  const giorni = Array.isArray(programma?.giorni) ? programma.giorni : [];
  if (!nome || !giorni.length) {
    return NextResponse.json(
      { errore: 'Serve "programma" con un "nome" e un elenco "giorni" non vuoto.' },
      { status: 400 }
    );
  }
  if (giorni.some((g) => !Number.isInteger(g.giorno) || g.giorno < 1)) {
    return NextResponse.json(
      { errore: 'Ogni voce di "giorni" deve avere "giorno" intero a partire da 1.' },
      { status: 400 }
    );
  }

  try {
    const righe = giorni.map((g) => ({
      programma: nome,
      giorno: g.giorno,
      data: piuGiorni(inizio, g.giorno - 1),
      settimana: g.settimana ?? Math.ceil(g.giorno / 7),
      fase: g.fase ?? "",
      tipo: g.tipo ?? null,
      conversione: g.conversione ?? g.tipo ?? null,
      titolo: g.titolo ?? "",
      dettaglio: g.dettaglio ?? "",
      target: g.target ?? "",
      pesata: Boolean(g.pesata),
    }));

    const esito = await importaProgramma(righe, { sostituisci: Boolean(sostituisci) });

    return NextResponse.json({
      ok: true,
      programma: nome,
      dal: righe[0].data,
      al: righe[righe.length - 1].data,
      ...esito,
      ...(esito.saltato
        ? { nota: "Il programma c'è già. Per rifarlo da un'altra data, ripeti con sostituisci: true." }
        : {}),
    });
  } catch (errore) {
    console.error("[importa programma]", errore.message);
    return NextResponse.json({ errore: errore.message }, { status: 500 });
  }
}
