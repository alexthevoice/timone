import { NextResponse } from "next/server";
import { versioni } from "@/lib/modalita";
import { chiediAClaude, chiaveConfigurata } from "@/lib/claude";
import { giorniFa, oggi } from "@/lib/data";
import { scrivi, telegramConfigurato } from "@/lib/telegram";
import {
  leggiAllenamento,
  leggiLog,
  leggiObiettivi,
  leggiProfilo,
  leggiTask,
  registroHa,
  scriviRegistro,
} from "@/lib/store";

export const dynamic = "force-dynamic";
// Un briefing è qualche lettura e una chiamata al modello: se ci mette più di
// una decina di secondi, il problema sta nelle letture, non nel modello.
export const maxDuration = 60;

const SISTEMA = `Scrivi il briefing del mattino per una persona, in italiano.

Massimo 14 righe. Niente convenevoli, niente "buongiorno", niente riepilogo di quello che ti ho dato.
Vai al punto: cosa lo aspetta oggi, cosa è rimasto indietro, cosa conviene togliersi di torno per primo.
Se non c'è quasi niente da dire, dillo in due righe invece di allungare il brodo.
Puoi usare il grassetto <b>così</b> e il corsivo <i>così</i>: è un messaggio Telegram.

QUANDO C'È UN ALLENAMENTO, chiudi sempre con tre righe corte in questa forma, senza commentarle:
<b>S 60'</b> — la versione standard, in poche parole
<b>C 40'</b> — la versione cliente, in poche parole
<b>E 20'</b> — la versione emergenza, in poche parole
Servono a scegliere guardando la giornata che ha davanti: se ne ometti una, nei giorni pieni salta invece di accorciare.
Se la seduta risulta già fatta, dillo in una riga e non ripetere le tre versioni.`;

export async function GET(richiesta) {
  const segreto = process.env.CRON_SECRET;
  const intestazione = richiesta.headers.get("authorization");

  // Senza questo controllo, questo indirizzo è un pulsante pubblico che
  // consuma il tuo budget di API a ogni clic.
  if (!segreto || intestazione !== `Bearer ${segreto}`) {
    return NextResponse.json({ errore: "Non autorizzato" }, { status: 401 });
  }

  const giorno = oggi();
  const chiave = `briefing-${giorno}`;

  // Idempotente: se per qualsiasi motivo parte due volte, tu ricevi un
  // briefing solo.
  if (await registroHa(chiave)) {
    return NextResponse.json({ ok: true, saltato: "il briefing di oggi è già partito" });
  }

  if (!telegramConfigurato()) {
    return NextResponse.json({ ok: true, saltato: "Telegram non è configurato" });
  }
  if (!chiaveConfigurata()) {
    return NextResponse.json({ ok: true, saltato: "manca la chiave del modello" });
  }

  const ieri = giorniFa(1);
  const [profilo, task, obiettivi, eventi, allenamento, logIeri] = await Promise.all([
    leggiProfilo(),
    leggiTask(),
    leggiObiettivi(),
    eventiDiOggi(richiesta),
    leggiAllenamento(giorno).catch(() => null),
    leggiLog(ieri).catch(() => null),
  ]);

  const diOggi = task.filter((t) => t.fascia === "ritardo" || t.fascia === "oggi");
  const slittati = task.filter((t) => t.fascia === "ritardo");

  // I dati dell'orologio arrivano solo se l'automazione sul telefono gira: se
  // si ferma, nessuno se ne accorge finché un grafico non resta bucato.
  // `aggiornatoIl` lo scrive solo la rotta Salute, quindi è la firma
  // dell'invio: il peso battuto a mano non conta come "l'orologio ha parlato".
  const orologioTace = logIeri !== null && !logIeri.salute?.aggiornatoIl;

  const contesto = [
    `Oggi è ${giorno}.` + (profilo.focus ? ` Il focus dichiarato: ${profilo.focus}.` : ""),
    eventi.length
      ? `IN CALENDARIO OGGI:\n${eventi.map((e) => `- ${e.ora ?? "tutto il giorno"} ${e.titolo}`).join("\n")}`
      : "IN CALENDARIO OGGI: niente.",
    diOggi.length
      ? `DA FARE OGGI:\n${diOggi
          .map((t) => `- [${t.fascia}] ${t.titolo}${t.persona ? ` (con ${t.persona})` : ""}`)
          .join("\n")}`
      : "DA FARE OGGI: niente in scadenza.",
    slittati.length ? `IN RITARDO DA PRIMA DI ${ieri}: ${slittati.length} cose.` : null,
    // Le tre versioni, non solo quella standard. Se la giornata è piena, la
    // scelta va potuta fare direttamente dal messaggio del mattino: chi legge
    // alle sette e vede solo "sessanta minuti" che non ha, salta e basta.
    allenamento ? righeAllenamento(allenamento) : null,
    orologioTace
      ? `IERI L'OROLOGIO HA TACIUTO: per il ${ieri} non è arrivato nessun dato da Comandi Rapidi. Dillo in una riga, senza drammi: quasi sempre l'automazione sul telefono non è partita.`
      : null,
    obiettivi.settimana.length
      ? `OBIETTIVI DELLA SETTIMANA:\n${obiettivi.settimana
          .map((o) => `- ${o.fatto ? "fatto" : "da fare"}: ${o.nome}`)
          .join("\n")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  const { testo } = await chiediAClaude({
    sistema: SISTEMA,
    domanda: contesto,
    maxTokens: 8000,
    effort: "medium",
  });

  const messaggio = testo.trim() || "Oggi non c'è niente di segnato.";
  await scrivi(messaggio);

  // Il registro è quello che rende innocua una seconda esecuzione.
  await scriviRegistro("briefing-inviato", messaggio.slice(0, 500), chiave);

  return NextResponse.json({
    ok: true,
    giorno,
    inviato: true,
    eventi: eventi.length,
    task: diOggi.length,
  });
}

/** Il calendario passa dalla sua rotta, che ha già la cache e il parser. */
async function eventiDiOggi(richiesta) {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL || new URL(richiesta.url).origin;
    const r = await fetch(`${base}/api/calendario`, {
      headers: { "x-api-secret": process.env.API_SECRET ?? "" },
      cache: "no-store",
    });
    if (!r.ok) return [];
    const d = await r.json();
    return (d.eventi ?? []).filter((e) => e.giorno === oggi());
  } catch (errore) {
    console.error("[briefing] calendario non raggiungibile:", errore.message);
    return [];
  }
}

/*
 * L'ORARIO DEL CRON È IN UTC. SEMPRE.
 *
 * In vercel.json c'è "0 5 * * *". In Italia siamo un'ora avanti d'inverno e
 * due d'estate, quindi quello sono le 6 del mattino in inverno e le 7 in
 * estate. Non c'è modo di dire a Vercel "le 7 ora italiana": o si sceglie un
 * orario che va bene tutto l'anno, o due volte l'anno si cambia una cifra.
 *
 * Segnatelo, perché quando l'ora legale si sposta e il briefing arriva un'ora
 * prima si perde tempo a cercare un bug che non c'è.
 */

/**
 * L'allenamento del giorno, con le due versioni corte accanto a quella piena.
 *
 * Non è ridondanza: la modalità si sceglie al mattino, guardando la giornata
 * che si ha davanti, e il messaggio del mattino è esattamente il momento in
 * cui la si sceglie. Metterci solo la versione da sessanta minuti vuol dire
 * che nei giorni pieni si salta invece di accorciare.
 */
function righeAllenamento(a) {
  const v = versioni(a);
  const testa =
    `ALLENAMENTO DI OGGI (giorno ${a.giorno} di 84, settimana ${a.settimana}, ${a.fase})` +
    (a.fattoIl ? ` — GIÀ FATTO in modalità ${a.modalita ?? "standard"}` : "") +
    ":";

  const righe = [
    `- STANDARD 60': ${a.titolo}. ${a.dettaglio}`,
    `- CLIENTE 40': ${v.cliente.titolo}. ${v.cliente.dettaglio}`,
    `- EMERGENZA 20': ${v.emergenza.titolo}. ${v.emergenza.dettaglio}`,
  ];

  if (a.pesata) {
    righe.push(
      `- Oggi è giorno di pesata${a.target ? `, target indicativo ${a.target}` : ""}.`
    );
  }

  return [testa, ...righe].join("\n");
}
