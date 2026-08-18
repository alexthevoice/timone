import { NextResponse } from "next/server";
import { giorniDa, oggi, ultimiGiorni } from "@/lib/data";
import { eFermo } from "@/lib/fermo";
import {
  configurato,
  leggiCatture,
  leggiLog,
  leggiLogIntervallo,
  leggiFormazione,
  leggiObiettivi,
  leggiPersone,
  leggiProfilo,
  leggiProgrammaAttivo,
  leggiTask,
} from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Tutto quello che serve alla Home, in una chiamata sola.
 *
 * Airtable risponde in qualche centinaio di millisecondi per richiesta: cinque
 * chiamate in fila dal browser sarebbero due secondi di attesa. Qui partono
 * tutte insieme dal server e l'attesa è quella della più lenta.
 *
 * Nessuna chiamata al modello: questa rotta legge e basta. È la regola che
 * vale più soldi di tutte.
 */
export async function GET() {
  if (!configurato()) {
    return NextResponse.json(
      { errore: "Airtable non è configurato: mancano AIRTABLE_BASE_ID o AIRTABLE_API_KEY." },
      { status: 503 }
    );
  }

  const giorno = oggi();
  const finestra = ultimiGiorni(30);

  const [profilo, task, logOggi, log30, obiettivi, catture, allenamento, persone, formazione] =
    await Promise.all([
    leggiProfilo(),
    leggiTask(),
    leggiLog(giorno),
    leggiLogIntervallo(finestra[0], giorno),
    leggiObiettivi(),
    leggiCatture(6),
    // Se la tabella non c'è ancora, la dashboard non deve morire per questo:
    // una scheda in meno è un fastidio, una pagina bianca è un guasto.
    leggiProgrammaAttivo(giorno).catch((e) => {
      console.error("[dashboard] programma non leggibile:", e.message);
      return null;
    }),
    // I nomi di casa servono per il completamento automatico quando si attacca
    // una persona a una cosa da fare. Senza elenco si riscrive il nome a mano
    // ogni volta, e "Giulia" e "giulia" diventano due persone diverse.
    leggiPersone(),
    // Sessanta giorni: bastano per la settimana, il mese e il confronto con la
    // settimana prima, e sono poche righe.
    leggiFormazione(ultimiGiorni(60)[0], giorno).catch((e) => {
      console.error("[dashboard] formazione non leggibile:", e.message);
      return [];
    }),
  ]);

  return NextResponse.json({
    profilo,
    task,
    persone,
    formazione,
    logOggi,
    obiettivi,
    catture,
    allenamento,
    // I dati dell'orologio escono dagli stessi trenta giorni già letti per la
    // striscia: una scheda in più non deve costare una lettura in più.
    salute: {
      oggi: logOggi.salute ?? {},
      storia: log30
        .map((l) => ({ data: l.data, ...(l.salute ?? {}) }))
        .filter((s) => Object.keys(s).length > 1),
    },
    striscia: calcolaStriscia(log30, giorno),
    blocchi: calcolaBlocchi(task, giorno),
    oggi: giorno,
  });
}

/**
 * I giorni consecutivi, contando all'indietro da oggi, con almeno
 * un'abitudine completata.
 *
 * Oggi non spezza la striscia se è ancora vuoto: la giornata non è finita.
 */
function calcolaStriscia(log30, giorno) {
  const perData = new Map(log30.map((l) => [l.data, l]));
  const haQualcosa = (data) => {
    const l = perData.get(data);
    if (!l) return false;
    return Object.values(l.abitudini ?? {}).some((v) => v === true || Number(v) > 0);
  };

  let striscia = 0;
  const date = ultimiGiorni(30).reverse(); // da oggi all'indietro
  for (const [i, data] of date.entries()) {
    if (haQualcosa(data)) striscia += 1;
    else if (i === 0 && data === giorno) continue; // oggi non ha ancora spezzato niente
    else break;
  }
  return striscia;
}

/**
 * Cosa è fermo: quello che è scaduto e quello che aspetta da troppo.
 *
 * Prima erano solo le righe in fascia "ritardo", e la fascia la si sposta a
 * mano: bastava non toccarla perché la scheda restasse vuota per sempre mentre
 * le cose invecchiavano. La regola vera sta in lib/fermo.js, condivisa con la
 * Review: qui si aggiunge solo l'età e si tengono i sei peggiori.
 */
function calcolaBlocchi(task, giorno) {
  return task
    .map((t) => ({ ...t, giorni: giorniDa(t.creatoIl) ?? 0 }))
    .filter((t) => eFermo(t, giorno))
    .sort((a, b) => b.giorni - a.giorni)
    .slice(0, 6);
}
