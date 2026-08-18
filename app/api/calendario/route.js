import { NextResponse } from "next/server";
import ICAL from "ical.js";
import { FUSO, giorniFa, oggi, settimanaCorrente } from "@/lib/data";

export const dynamic = "force-dynamic";

/**
 * Più agende, non una.
 *
 * Una vita sola sta in tre calendari — il lavoro, la famiglia, gli impegni
 * fissi — e una scheda che ne mostra uno solo racconta una giornata che non
 * esiste. Ogni agenda si legge per conto suo: se una non risponde, le altre si
 * vedono lo stesso, con scritto quale manca. Una scheda che sparisce tutta
 * perché un indirizzo è scaduto è il modo più veloce per smettere di fidarsene.
 */

// Indietro poco, avanti molto: guardare la settimana scorsa serve raramente,
// sapere cosa c'è fra tre settimane serve sempre.
const GIORNI_INDIETRO = 7;
const GIORNI_AVANTI = 120;
const CACHE_MS = 5 * 60 * 1000;

// I colori delle agende. Sono neutri apposta: nel resto della dashboard il
// colore ha un significato preciso (verde bene, rosso male), e un'agenda non è
// né bene né male. Servono solo a distinguere tre righe fra loro.
const COLORI = ["#2f6fed", "#7c3aed", "#0e9488", "#c2410c", "#db2777"];

/**
 * Le agende, lette dalle variabili d'ambiente.
 *
 * Formato di GOOGLE_CALENDAR_ICAL_URLS: un'agenda per riga, o separate da
 * punto e virgola. Il nome davanti all'uguale è facoltativo:
 *
 *     Lavoro = https://calendar.google.com/.../basic.ics
 *     Famiglia = https://calendar.google.com/.../basic.ics
 *
 * Il vecchio GOOGLE_CALENDAR_ICAL_URL continua a funzionare: chi ha già una
 * sola agenda configurata non deve toccare niente.
 */
function agende() {
  const grezzo = [process.env.GOOGLE_CALENDAR_ICAL_URLS, process.env.GOOGLE_CALENDAR_ICAL_URL]
    .filter(Boolean)
    .join("\n");

  const voci = grezzo
    .split(/[\n;]+/)
    .map((r) => r.trim())
    .filter(Boolean);

  const viste = new Set();
  const fuori = [];

  for (const voce of voci) {
    // L'uguale dentro l'indirizzo non deve confondere: si divide sul primo, e
    // solo se quello che c'è prima non è già un indirizzo.
    const taglio = voce.indexOf("=");
    const forse = taglio > 0 ? voce.slice(0, taglio).trim() : "";
    const haNome = forse && !/^https?:/i.test(forse) && !forse.includes("/");

    const indirizzo = (haNome ? voce.slice(taglio + 1) : voce).trim();
    if (!/^https?:\/\//i.test(indirizzo) || viste.has(indirizzo)) continue;
    viste.add(indirizzo);

    fuori.push({
      nome: haNome ? forse : `Agenda ${fuori.length + 1}`,
      indirizzo,
      colore: COLORI[fuori.length % COLORI.length],
    });
  }

  return fuori;
}

// La cache sta sul server, non nel browser: questa scade da sola e la controlli
// tu, quella del browser no — e il giorno in cui il calendario "non si aggiorna"
// non sapresti dove guardare.
//
// Onestà: online la memoria è per istanza, e le istanze nascono e muoiono tra
// una richiesta e l'altra. Quindi è un sollievo quando c'è, non una garanzia.
const cache = new Map();

export async function GET(richiesta) {
  const elenco = agende();
  const giorno = oggi();

  if (!elenco.length) {
    return rispondi({
      eventi: [],
      sorgenti: [],
      settimana: settimanaCorrente(),
      oggiIso: giorno,
      da: giorniFa(GIORNI_INDIETRO),
      a: giorniFa(-GIORNI_AVANTI),
      configurato: false,
    });
  }

  const forza = new URL(richiesta.url).searchParams.get("forza") === "si";

  // Le agende partono tutte insieme: tre letture in fila sarebbero tre attese
  // sommate, e l'attesa la guardi tu.
  const letture = await Promise.all(elenco.map((a) => leggiAgenda(a, forza)));

  const eventi = letture
    .flatMap((l) => l.eventi)
    .sort((a, b) => a.inizio.localeCompare(b.inizio));

  return rispondi({
    eventi,
    sorgenti: letture.map(({ nome, colore, errore, daCache, quanti }) => ({
      nome,
      colore,
      errore,
      daCache,
      quanti,
    })),
    settimana: settimanaCorrente(),
    oggiIso: giorno,
    da: giorniFa(GIORNI_INDIETRO),
    a: giorniFa(-GIORNI_AVANTI),
    configurato: true,
  });
}

async function leggiAgenda(agenda, forza) {
  const { nome, colore, indirizzo } = agenda;
  const salvata = cache.get(indirizzo);

  if (!forza && salvata?.eventi && Date.now() - salvata.quando < CACHE_MS) {
    return { nome, colore, eventi: tinge(salvata.eventi, agenda), daCache: true, quanti: salvata.eventi.length };
  }

  try {
    const risposta = await fetch(indirizzo, { cache: "no-store" });
    if (!risposta.ok) throw new Error(`ha risposto ${risposta.status}`);

    const eventi = interpreta(await risposta.text());
    cache.set(indirizzo, { quando: Date.now(), eventi });
    return { nome, colore, eventi: tinge(eventi, agenda), daCache: false, quanti: eventi.length };
  } catch (errore) {
    console.error(`[calendario] ${nome}:`, errore.message);
    // Se la cache c'è, meglio un'agenda di cinque minuti fa che una scheda rotta.
    if (salvata?.eventi) {
      return {
        nome,
        colore,
        eventi: tinge(salvata.eventi, agenda),
        daCache: true,
        errore: errore.message,
        quanti: salvata.eventi.length,
      };
    }
    return { nome, colore, eventi: [], errore: errore.message, quanti: 0 };
  }
}

const tinge = (eventi, { nome, colore }) => eventi.map((e) => ({ ...e, agenda: nome, colore }));

function rispondi(corpo, stato = 200) {
  const r = NextResponse.json(corpo, { status: stato });
  // Il browser non conserva niente: la cache è la nostra, lato server.
  r.headers.set("Cache-Control", "no-store, max-age=0");
  return r;
}

/**
 * Il parser è quello di Mozilla, JavaScript puro.
 *
 * Non è pignoleria sulla libreria: alcune delle più diffuse si appoggiano a
 * funzioni native di Node che il bundler serverless rompe in fase di deploy,
 * con errori che non c'entrano niente col calendario.
 */
function interpreta(testo) {
  const radice = new ICAL.Component(ICAL.parse(testo));
  const daQui = new Date(`${giorniFa(GIORNI_INDIETRO)}T00:00:00Z`);
  const finoA = new Date(`${giorniFa(-GIORNI_AVANTI)}T23:59:59Z`);

  const eventi = [];

  for (const voce of radice.getAllSubcomponents("vevent")) {
    const evento = new ICAL.Event(voce);
    if (!evento.startDate) continue;

    if (!evento.isRecurring()) {
      spingi(eventi, evento.startDate, evento.endDate, evento, daQui, finoA);
      continue;
    }

    // "Riunione ogni lunedì alle 9" nel formato iCal è UN SOLO evento con
    // attaccata una regola di ripetizione. Chi legge gli eventi senza espandere
    // le regole non vede nessuno dei suoi impegni ricorrenti — e la scheda
    // sembra funzionare, perché gli eventi singoli ci sono. È un'assenza.
    //
    // La guardia è alta quanto la finestra è larga: quattro mesi di "ogni
    // giorno" sono centoventi occorrenze, e fermarsi a quattrocento con tre
    // agende attive vuol dire tagliare gli impegni di novembre senza dirlo.
    const espansione = evento.iterator();
    let quando;
    let guardia = 0;
    while ((quando = espansione.next()) && guardia++ < 2000) {
      const inizio = quando.toJSDate();
      if (inizio > finoA) break; // la finestra è finita: si smette
      if (inizio < daQui) continue; // senza fine genera occorrenze all'infinito
      const durata = evento.duration ? evento.duration.toSeconds() * 1000 : 3600000;
      spingi(eventi, quando, null, evento, daQui, finoA, new Date(inizio.getTime() + durata));
    }
  }

  return eventi;
}

function spingi(eventi, inizio, fine, evento, daQui, finoA, fineCalcolata) {
  const dataInizio = inizio.toJSDate ? inizio.toJSDate() : inizio;
  if (dataInizio < daQui || dataInizio > finoA) return;

  const dataFine =
    fineCalcolata ?? (fine?.toJSDate ? fine.toJSDate() : new Date(dataInizio.getTime() + 3600000));

  eventi.push({
    titolo: evento.summary || "(senza titolo)",
    luogo: evento.location || null,
    tuttoIlGiorno: Boolean(inizio.isDate),
    inizio: dataInizio.toISOString(),
    fine: dataFine.toISOString(),
    giorno: giornoLocale(dataInizio),
    ora: inizio.isDate ? null : oraLocale(dataInizio),
    oraFine: inizio.isDate ? null : oraLocale(dataFine),
  });
}

// Tutti gli orari si mostrano nel fuso dell'utente, non in quello del server.
const giornoLocale = (d) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);

const oraLocale = (d) =>
  new Intl.DateTimeFormat("it-IT", {
    timeZone: FUSO,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
