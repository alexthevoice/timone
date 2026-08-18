/**
 * Il pezzo che parla con Airtable. Grezzo, senza sapere niente del dominio:
 * il dominio sta in lib/store.js, che è l'unico a importare questo file.
 *
 * Gira solo sul server. La chiave di Airtable non deve mai finire nel browser:
 * chiunque apra gli strumenti di sviluppo vede tutto quello che la pagina ha
 * caricato, e quella chiave legge e scrive tutta la base.
 */

if (typeof window !== "undefined") {
  throw new Error(
    "lib/airtable.js è codice da server. Se lo vedi qui, un componente client lo sta importando: passa da una rotta API."
  );
}

const BASE = process.env.AIRTABLE_BASE_ID;
const CHIAVE = process.env.AIRTABLE_API_KEY;
const RADICE = "https://api.airtable.com/v0";

export const TABELLE = {
  profilo: "Profilo",
  persone: "Persone",
  task: "Task",
  catture: "Catture",
  log: "LogGiornalieri",
  obiettivi: "Obiettivi",
  memoria: "Memoria",
  registro: "Registro",
  allenamenti: "Allenamenti",
  formazione: "Formazione",
};

export function configurato() {
  return Boolean(BASE && CHIAVE);
}

function esigiConfigurazione() {
  if (!configurato()) {
    throw new Error(
      "Mancano AIRTABLE_BASE_ID o AIRTABLE_API_KEY. Guarda .env.local.example."
    );
  }
}

async function chiama(percorso, opzioni = {}, tentativo = 0) {
  esigiConfigurazione();
  const risposta = await fetch(`${RADICE}/${BASE}/${percorso}`, {
    ...opzioni,
    headers: {
      Authorization: `Bearer ${CHIAVE}`,
      "Content-Type": "application/json",
      ...(opzioni.headers || {}),
    },
    cache: "no-store",
  });

  // Airtable accetta 5 richieste al secondo per base. Da soli non ci si arriva
  // quasi mai, ma quando succede va aspettato invece che fallire.
  if (risposta.status === 429 && tentativo < 4) {
    await new Promise((r) => setTimeout(r, 400 * (tentativo + 1)));
    return chiama(percorso, opzioni, tentativo + 1);
  }

  if (!risposta.ok) {
    const corpo = await risposta.text();
    throw new Error(`Airtable ${risposta.status} su ${percorso}: ${corpo.slice(0, 300)}`);
  }
  return risposta.json();
}

/** Tutte le righe di una tabella, seguendo la paginazione. */
export async function leggiTutte(tabella, parametri = {}) {
  const righe = [];
  let offset;
  do {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(parametri)) {
      if (v === undefined || v === null) continue;
      if (Array.isArray(v)) v.forEach((x, i) => q.append(`${k}[${i}]`, x));
      else q.set(k, String(v));
    }
    if (offset) q.set("offset", offset);
    const dati = await chiama(`${encodeURIComponent(tabella)}?${q}`);
    righe.push(...dati.records);
    offset = dati.offset;
  } while (offset);
  return righe.map(pulisci);
}

/** La prima riga che soddisfa una formula, o null. */
export async function leggiUna(tabella, formula) {
  const righe = await leggiTutte(tabella, { filterByFormula: formula, maxRecords: 1 });
  return righe[0] ?? null;
}

export async function crea(tabella, campi) {
  const dati = await chiama(encodeURIComponent(tabella), {
    method: "POST",
    body: JSON.stringify({ fields: campi, typecast: true }),
  });
  return pulisci(dati);
}

export async function aggiorna(tabella, id, campi) {
  const dati = await chiama(`${encodeURIComponent(tabella)}/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ fields: campi, typecast: true }),
  });
  return pulisci(dati);
}

/** Anche in scrittura le righe vanno a blocchi di dieci. */
export async function creaTante(tabella, righe) {
  const fatte = [];
  for (let i = 0; i < righe.length; i += 10) {
    const dati = await chiama(encodeURIComponent(tabella), {
      method: "POST",
      body: JSON.stringify({
        records: righe.slice(i, i + 10).map((campi) => ({ fields: campi })),
        typecast: true,
      }),
    });
    fatte.push(...dati.records.map(pulisci));
  }
  return fatte;
}

/** Airtable accetta al massimo dieci righe per chiamata. */
export async function aggiornaTante(tabella, voci) {
  const fatte = [];
  for (let i = 0; i < voci.length; i += 10) {
    const blocco = voci.slice(i, i + 10);
    const dati = await chiama(encodeURIComponent(tabella), {
      method: "PATCH",
      body: JSON.stringify({
        records: blocco.map((v) => ({ id: v.id, fields: v.campi })),
        typecast: true,
      }),
    });
    fatte.push(...dati.records.map(pulisci));
  }
  return fatte;
}

export async function elimina(tabella, id) {
  await chiama(`${encodeURIComponent(tabella)}/${id}`, { method: "DELETE" });
  return { id, eliminato: true };
}

/**
 * Carica un file dentro un campo allegati.
 *
 * Passa da un altro dominio, `content.airtable.com`, e non da quello delle
 * righe: è l'unico modo di mandare un file senza prima pubblicarlo da qualche
 * parte su internet con un indirizzo aperto a tutti. Il file si aggiunge a
 * quelli che ci sono già, non li sostituisce.
 *
 * Il limite è cinque megabyte per file, e non è nostro: è di Airtable. Meglio
 * dirlo prima che vedere un errore criptico dopo trenta secondi di caricamento.
 */
export const LIMITE_ALLEGATO = 5 * 1024 * 1024;

export async function caricaAllegato(tabellaId, rigaId, campo, { nome, tipo, base64 }) {
  esigiConfigurazione();

  const risposta = await fetch(
    `https://content.airtable.com/v0/${BASE}/${rigaId}/${encodeURIComponent(campo)}/uploadAttachment`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${CHIAVE}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        contentType: tipo || "application/octet-stream",
        file: base64,
        filename: nome || "allegato",
      }),
      cache: "no-store",
    }
  );

  if (!risposta.ok) {
    const corpo = await risposta.text();
    throw new Error(`Airtable ${risposta.status} sul caricamento: ${corpo.slice(0, 300)}`);
  }
  return risposta.json();
}

function pulisci(riga) {
  return { id: riga.id, ...riga.fields };
}

/** Legge un campo che contiene JSON, senza rompersi se dentro c'è spazzatura. */
export function json(valore, seVuoto) {
  if (valore === undefined || valore === null || valore === "") return seVuoto;
  if (typeof valore === "object") return valore;
  try {
    return JSON.parse(valore);
  } catch {
    return seVuoto;
  }
}
