/**
 * I quadranti del tempo.
 *
 * Due domande sole, e la risposta non è mai "dipende": è urgente? è
 * importante? Le due risposte fanno una croce con quattro caselle, e ogni cosa
 * da fare sta in una sola di quelle.
 *
 * Il punto della croce non è catalogare: è vedere quanto della giornata se ne
 * va in Q1 e Q3 — le cose che urlano — e quanto ne resta a Q2, che è l'unico
 * quadrante in cui si costruisce qualcosa. Un elenco in cui Q2 è vuoto è un
 * elenco che sta spegnendo incendi da mesi.
 *
 * Qui dentro non si parla né con Airtable né con il modello: solo le
 * definizioni e la regola stupida che assegna un quadrante quando il modello
 * non c'è. Vale la stessa promessa della cattura: meglio un quadrante
 * approssimativo che un task senza casa.
 */

export const QUADRANTI = [
  {
    id: "Q1",
    nome: "Crisi",
    azione: "Fallo adesso",
    urgente: true,
    importante: true,
    spiega: "Urgente e importante. Scadenze vere, problemi che bruciano.",
  },
  {
    id: "Q2",
    nome: "Qualità",
    azione: "Mettilo in agenda",
    urgente: false,
    importante: true,
    spiega: "Importante ma non urgente. È qui che si costruisce: se resta vuoto, stai solo spegnendo incendi.",
  },
  {
    id: "Q3",
    nome: "Interruzioni",
    azione: "Delegalo o accorcialo",
    urgente: true,
    importante: false,
    spiega: "Urgente per qualcun altro, non importante per te. Richieste, riunioni che potevano essere un messaggio.",
  },
  {
    id: "Q4",
    nome: "Spreco",
    azione: "Toglilo",
    urgente: false,
    importante: false,
    spiega: "Né urgente né importante. Se resta qui un mese, cancellalo senza rimpianti.",
  },
];

export const ID_QUADRANTI = QUADRANTI.map((q) => q.id);

export const PRIORITA_MIN = 1;
export const PRIORITA_MAX = 5;

/** Riporta una priorità dentro 1-5, o null se non è un numero. */
export function normalizzaPriorita(valore) {
  const n = Number(valore);
  if (!Number.isFinite(n)) return null;
  return Math.min(PRIORITA_MAX, Math.max(PRIORITA_MIN, Math.round(n)));
}

export function quadranteValido(valore) {
  return ID_QUADRANTI.includes(valore) ? valore : null;
}

/** Da urgente/importante alla casella della croce. */
export function dallaCroce(urgente, importante) {
  return QUADRANTI.find((q) => q.urgente === Boolean(urgente) && q.importante === Boolean(importante)).id;
}

/**
 * Il quadrante di un task, dedotto da quello che già si sa di lui.
 *
 * È la rete di sicurezza, non la strada principale: il quadrante buono lo
 * propone il modello quando la cosa entra nel sistema. Ma un task senza
 * quadrante sparisce dalla croce, e una croce con dei buchi non si guarda più.
 */
export function quadranteConRegole(task, oggiIso) {
  const urgente =
    task.fascia === "ritardo" ||
    task.fascia === "oggi" ||
    (task.scadenza && oggiIso ? giorniAllaScadenza(task.scadenza, oggiIso) <= 2 : false);

  // "Importante" non è "urgente detto più forte": qui vuol dire che se non lo
  // fai, fra un mese te ne accorgi. La temperatura calda e i tag di lavoro
  // sono l'approssimazione migliore che questi dati permettono.
  const tag = task.tag ?? [];
  const importante =
    task.temperatura === "hot" ||
    tag.some((t) => ["contratti", "offerte", "numeri", "formazione"].includes(t));

  return dallaCroce(urgente, importante);
}

/**
 * La priorità di riserva, da 1 a 5.
 *
 * Q1 e le cose calde stanno in alto, Q4 in fondo. Serve solo a non avere una
 * colonna vuota: la priorità vera è quella che correggi tu.
 */
export function prioritaConRegole(task, quadrante) {
  const q = quadrante ?? task.quadrante ?? "Q2";
  const base = { Q1: 1, Q2: 3, Q3: 4, Q4: 5 }[q] ?? 3;
  const caldo = task.temperatura === "hot" ? -1 : task.temperatura === "cold" ? 1 : 0;
  return normalizzaPriorita(base + caldo);
}

/** Quanti giorni mancano a una scadenza. Negativo vuol dire già passata. */
export function giorniAllaScadenza(scadenza, oggiIso) {
  if (!scadenza || !oggiIso) return null;
  const a = new Date(`${String(scadenza).slice(0, 10)}T12:00:00Z`);
  const b = new Date(`${oggiIso}T12:00:00Z`);
  return Math.round((a - b) / 86400000);
}

/**
 * Come si legge una scadenza a colpo d'occhio.
 *
 * Il colore ha significato: rosso per quello che è già passato, arancione per
 * quello che scade, neutro per il resto. Decide la distanza, non il segno.
 */
export function etichettaScadenza(scadenza, oggiIso) {
  const g = giorniAllaScadenza(scadenza, oggiIso);
  if (g === null) return null;
  if (g < -1) return { testo: `${-g} giorni fa`, tono: "neg" };
  if (g === -1) return { testo: "ieri", tono: "neg" };
  if (g === 0) return { testo: "oggi", tono: "due" };
  if (g === 1) return { testo: "domani", tono: "due" };
  if (g <= 7) return { testo: `fra ${g} giorni`, tono: "due" };
  return {
    testo: new Date(`${String(scadenza).slice(0, 10)}T12:00:00Z`).toLocaleDateString("it-IT", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }),
    tono: "",
  };
}

/**
 * L'ordine della to-do: prima la priorità, poi chi scade prima, poi il
 * quadrante. Una lista ordinata per data sola mette in cima le sciocchezze
 * che scadono oggi; una ordinata per priorità sola non ti dice mai cosa fare
 * per primo fra due cose da 1.
 */
export function ordinaPerFare(a, b) {
  const pa = a.priorita ?? 3;
  const pb = b.priorita ?? 3;
  if (pa !== pb) return pa - pb;

  const sa = a.scadenza ?? "9999-12-31";
  const sb = b.scadenza ?? "9999-12-31";
  if (sa !== sb) return sa < sb ? -1 : 1;

  const qa = ID_QUADRANTI.indexOf(a.quadrante ?? "Q2");
  const qb = ID_QUADRANTI.indexOf(b.quadrante ?? "Q2");
  return qa - qb;
}
