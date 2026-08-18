/**
 * "Che giorno è oggi?" ha una sola risposta in tutto il codice: questa.
 *
 * Il server vive in UTC. In Italia la mezzanotte UTC è l'una di notte
 * d'inverno e le due d'estate. Se la data la calcolasse il server, le
 * abitudini si azzererebbero mentre sei ancora sveglio e la lettura fatta
 * a mezzanotte e mezza finirebbe sul giorno sbagliato. Senza nessun errore
 * a segnalarlo: non è un errore, è un'altra mezzanotte.
 *
 * Quindi: chiunque abbia bisogno di una data la chiede qui.
 */

export const FUSO = process.env.USER_TIMEZONE || "Europe/Rome";

/** Le parti di una data, lette nel fuso dell'utente. */
function parti(quando = new Date(), fuso = FUSO) {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: fuso,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const p = Object.fromEntries(f.formatToParts(quando).map((x) => [x.type, x.value]));
  return p;
}

/** La data di oggi come YYYY-MM-DD, nel fuso dell'utente. È la chiave del log. */
export function oggi(quando = new Date(), fuso = FUSO) {
  const p = parti(quando, fuso);
  return `${p.year}-${p.month}-${p.day}`;
}

/** L'ora corrente come HH:MM, nel fuso dell'utente. */
export function oraLocale(quando = new Date(), fuso = FUSO) {
  const p = parti(quando, fuso);
  return `${p.hour === "24" ? "00" : p.hour}:${p.minute}`;
}

/** La data di N giorni fa (o avanti, con numeri negativi), come YYYY-MM-DD. */
export function giorniFa(n, quando = new Date(), fuso = FUSO) {
  const base = new Date(`${oggi(quando, fuso)}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() - n);
  return base.toISOString().slice(0, 10);
}

/**
 * La data di N giorni dopo una data data, come YYYY-MM-DD.
 *
 * Parte da una data esplicita, non da oggi: serve a srotolare un programma a
 * partire dal suo primo giorno. Il mezzogiorno UTC nel mezzo è quello che
 * tiene il conto giusto anche quando in mezzo cambia l'ora legale.
 */
export function piuGiorni(data, n) {
  const base = new Date(`${data}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + n);
  return base.toISOString().slice(0, 10);
}

/** Le date degli ultimi N giorni, dalla più vecchia a oggi. */
export function ultimiGiorni(n, quando = new Date(), fuso = FUSO) {
  return Array.from({ length: n }, (_, i) => giorniFa(n - 1 - i, quando, fuso));
}

/**
 * I sette giorni della settimana che contiene una data, da lunedì a domenica.
 *
 * Prende una data esplicita e non "adesso": è quello che permette al calendario
 * di andare avanti e indietro fra le settimane senza mentire sul fuso. Una
 * settimana calcolata con `new Date()` del browser e una calcolata dal server
 * possono essere due settimane diverse per un'ora di differenza.
 */
export function settimanaDi(data) {
  const d = new Date(`${data}T12:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // lunedì = 0
  return Array.from({ length: 7 }, (_, i) => {
    const g = new Date(d);
    g.setUTCDate(g.getUTCDate() - dow + i);
    return g.toISOString().slice(0, 10);
  });
}

/** I sette giorni della settimana corrente, da lunedì a domenica. */
export function settimanaCorrente(quando = new Date(), fuso = FUSO) {
  return settimanaDi(oggi(quando, fuso));
}

/** Quanti giorni ci sono fra due date YYYY-MM-DD. Negativo se la seconda è prima. */
export function distanzaGiorni(da, a) {
  if (!da || !a) return null;
  const x = new Date(`${da}T12:00:00Z`);
  const y = new Date(`${a}T12:00:00Z`);
  return Math.round((y - x) / 86400000);
}

/**
 * Il giorno locale di un momento salvato in ISO (che è UTC).
 *
 * Tagliare i primi dieci caratteri di una stringa ISO sembra innocuo e non lo
 * è: una cattura fatta alle 00:30 italiane è salvata come le 22:30 del giorno
 * prima, e tagliando si ottiene il giorno sbagliato. È la trappola del fuso
 * che si riaffaccia dove i dati si mostrano invece che dove si scrivono.
 */
export function giornoDaIso(iso, fuso = FUSO) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return oggi(d, fuso);
}

/** Quanti giorni sono passati da un momento (ISO o YYYY-MM-DD) a oggi. */
export function giorniDa(dataIso, quando = new Date(), fuso = FUSO) {
  if (!dataIso) return null;
  const giorno = giornoDaIso(dataIso, fuso);
  const a = new Date(`${giorno}T12:00:00Z`);
  const b = new Date(`${oggi(quando, fuso)}T12:00:00Z`);
  return Math.round((b - a) / 86400000);
}

/** Il momento esatto, in ISO, da scrivere nei campi data e ora. */
export function adessoIso() {
  return new Date().toISOString();
}
