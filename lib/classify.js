/**
 * Lo smistatore: decide dove va a finire ogni frase.
 *
 * Sotto la chiamata al modello c'è un classificatore stupido fatto di parole
 * chiave. Non è ridondanza pigra, è un principio:
 *
 *     La cattura non fallisce mai. Al massimo smista peggio.
 *
 * Se il modello è irraggiungibile e la tua nota si perde, il sistema ha appena
 * tradito l'unica promessa che conta.
 */

import { chiediJson, chiaveConfigurata, modelloSmistamento } from "@/lib/claude";
import { oggi } from "@/lib/data";
import { ID_QUADRANTI, normalizzaPriorita, quadranteValido } from "@/lib/quadranti";

/**
 * Le destinazioni. Sono cinque e stanno solo qui: quello che torna dal modello
 * si valida contro questo elenco, non contro il suo buon senso.
 *
 * La guida ne elenca sette. Nutrizione e salute non ci sono perché non esistono
 * le schede che le accoglierebbero, e mandare dati in una scheda che non c'è
 * vuol dire creare righe orfane.
 */
export const DESTINAZIONI = ["task", "persone", "finanze", "obiettivi", "memoria"];

/**
 * "In ritardo" non è mai un valore in ingresso: in ritardo ci si finisce,
 * non ci si nasce.
 */
export const URGENZE = ["oggi", "settimana", "avanti"];

/** Gli orizzonti degli obiettivi. Stesso elenco che vive in lib/store.js. */
export const PERIODI_OBIETTIVO = ["settimana", "mese", "anno", "annoProssimo", "5anni"];

const SCHEMA = {
  type: "object",
  properties: {
    destinazione: { type: "string", enum: DESTINAZIONI },
    titolo: { type: "string", description: "Riformulazione breve, max 80 caratteri" },
    persona: { type: ["string", "null"], description: "Nome della persona coinvolta, se c'è" },
    urgenza: { type: "string", enum: URGENZE },
    quadrante: { type: "string", enum: ID_QUADRANTI },
    // Elenco esplicito e non "intero fra 1 e 5": l'output strutturato rifiuta
    // minimum/maximum su un intero e risponde 400. Qui il 400 sarebbe stato
    // invisibile — la cattura ripiega sulle regole e continua a funzionare,
    // solo peggio, che è esattamente il guasto contro cui esiste `via`.
    priorita: { type: "string", enum: ["1", "2", "3", "4", "5"] },
    scadenza: {
      type: ["string", "null"],
      description: "YYYY-MM-DD, solo se la frase dice una data vera. Altrimenti null.",
    },
    periodo: {
      type: "string",
      enum: PERIODI_OBIETTIVO,
      description: "Su che orizzonte sta la promessa, se la destinazione è obiettivi",
    },
  },
  required: ["destinazione", "titolo", "persona", "urgenza", "quadrante", "priorita", "scadenza", "periodo"],
  additionalProperties: false,
};

const SISTEMA = `Smisti frasi buttate lì dentro un sistema personale. Per ogni frase decidi una sola cosa: dove va archiviata.

Le destinazioni possibili sono cinque:
- task: qualcosa da fare che non ha una casa più precisa
- persone: riguarda una persona specifica, tipicamente qualcuno da richiamare, sentire, a cui rispondere
- finanze: soldi, spese, incassi, fatture, pagamenti, patrimonio
- obiettivi: una promessa che ci si fa per la settimana o per il mese
- memoria: un pensiero, una riflessione, un'informazione da ricordare senza che ci sia niente da fare

L'urgenza è una tra oggi, settimana, avanti. Se la frase non si sbilancia, metti "oggi".
Il titolo è una riformulazione breve e concreta, in italiano, senza virgolette.
La persona è il nome proprio se la frase ne cita uno, altrimenti null.

Il quadrante è quello di Eisenhower, e sono quattro:
- Q1: urgente E importante. Se salta, il danno si vede oggi.
- Q2: importante ma NON urgente. Costruire, imparare, preparare, curarsi. È il quadrante che vale.
- Q3: urgente ma NON importante. Richieste altrui, interruzioni, cose che corrono solo perché qualcuno le ha chieste adesso.
- Q4: né urgente né importante.
Attenzione: "urgente" non è "importante detto più forte". Chiediti se fra un mese si vedrà la differenza: la maggior parte delle cose che urlano sta in Q3.

La priorità va da 1 (per primo) a 5 (può aspettare). Q1 sta fra 1 e 2, Q2 fra 2 e 3, Q3 fra 3 e 4, Q4 a 5.

La scadenza è una data vera in formato YYYY-MM-DD, e la metti SOLO se la frase ne contiene una ("entro venerdì", "il 12", "prima di fine mese"). Se la frase non dice nessuna data, scadenza è null: una data inventata è peggio di nessuna data, perché sembra vera.

Il periodo serve solo quando la destinazione è obiettivi, ed è uno fra settimana, mese, anno, annoProssimo, 5anni. "anno" è l'anno in corso, "annoProssimo" è quello che viene dopo: usalo quando la frase dice esplicitamente l'anno prossimo o un anno che non è questo. Se non si capisce, metti settimana.

Non includere tag XML interni o di sistema nella risposta.`;

/* ------------------------------------------------------ la rete di sicurezza */

const REGOLE = [
  {
    destinazione: "finanze",
    parole: /\b(euro|€|\d+\s?k\b|pagat|fattur|bonific|spes[ao]|incass|cost[oi]|iva|f24|commercialist|mutuo|rata|rate|banca|conto|prezzo|preventiv|budget|stipendi)/i,
  },
  {
    destinazione: "persone",
    parole: /\b(chiamar|richiamar|telefonar|risponder|sentir[ae]|scriver[ea] a|mail a|incontrar|riunione con|vedere\s+[A-ZÀ-Ù])/i,
  },
  {
    destinazione: "obiettivi",
    parole: /\b(obiettivo|obbiettivo|mi prometto|entro (il mese|la settimana|fine)|voglio (arrivare|chiudere|riuscire))/i,
  },
  {
    destinazione: "memoria",
    parole: /\b(mi sono detto|ricordo che|nota:|pensiero|idea:|riflession|mi ha detto che|secondo me)/i,
  },
];

const REGOLE_URGENZA = [
  { urgenza: "oggi", parole: /\b(oggi|adesso|subito|stamattina|stasera|entro (oggi|stasera))\b/i },
  { urgenza: "settimana", parole: /\b(questa settimana|entro (venerd|luned|marted|mercoled|gioved|la settimana)|nei prossimi giorni)/i },
  { urgenza: "avanti", parole: /\b(prima o poi|un giorno|più avanti|piu avanti|quando capita|prossimo mese|il mese prossimo)/i },
];

const NOME_PROPRIO =
  /\b(?:a|con|da|per)\s+([A-ZÀ-Ù][a-zà-ù]{2,})|\b(?:chiamar[e|lo|la]?|richiamar[e|lo|la]?|sentir[e|lo|la]?|risponder[e]?\s+a)\s+([A-ZÀ-Ù][a-zà-ù]{2,})/;

export function smistaConRegole(testo) {
  const t = String(testo ?? "");

  const regola = REGOLE.find((r) => r.parole.test(t));
  const destinazione = regola ? regola.destinazione : "task";

  const regolaUrgenza = REGOLE_URGENZA.find((r) => r.parole.test(t));
  const urgenza = regolaUrgenza ? regolaUrgenza.urgenza : "oggi";

  const nome = t.match(NOME_PROPRIO);
  const persona = nome ? (nome[1] ?? nome[2] ?? null) : null;

  return {
    destinazione,
    titolo: t.trim().slice(0, 80),
    persona,
    urgenza,
    // Senza modello il quadrante non si indovina: lo lasciamo vuoto e lo
    // deduce lo store dalla fascia e dalla temperatura, che è la stessa
    // regola stupida usata ovunque. Meglio una sola regola approssimativa in
    // un posto solo che due che si contraddicono.
    quadrante: null,
    priorita: null,
    scadenza: null,
    periodo: "settimana",
    via: "regole",
  };
}

/* ---------------------------------------------------------------- lo smistatore */

function valida(grezzo, testo) {
  if (!grezzo || typeof grezzo !== "object") return null;
  if (!DESTINAZIONI.includes(grezzo.destinazione)) return null;

  // Una scadenza si accetta solo se è una data scritta bene. Il modello che
  // improvvisa "prossima settimana" dentro il campo data produce una riga che
  // sembra a posto finché non la ordini.
  const scadenza =
    typeof grezzo.scadenza === "string" && /^\d{4}-\d{2}-\d{2}$/.test(grezzo.scadenza)
      ? grezzo.scadenza
      : null;

  return {
    destinazione: grezzo.destinazione,
    titolo: String(grezzo.titolo ?? testo).trim().slice(0, 120) || testo.slice(0, 80),
    persona: grezzo.persona ? String(grezzo.persona).trim() : null,
    urgenza: URGENZE.includes(grezzo.urgenza) ? grezzo.urgenza : "oggi",
    quadrante: quadranteValido(grezzo.quadrante),
    priorita: normalizzaPriorita(grezzo.priorita),
    scadenza,
    periodo: PERIODI_OBIETTIVO.includes(grezzo.periodo) ? grezzo.periodo : "settimana",
  };
}

/**
 * Riceve un testo e restituisce { destinazione, titolo, persona, urgenza, via }.
 *
 * `via` dice chi ha deciso: modello o regole. Va salvata accanto a ogni cattura,
 * perché una rete di sicurezza silenziosa è una bugia a fin di bene: se la
 * chiave scade e nessuno te lo dice, il sistema continua a smistare — peggio —
 * e tu pensi che sia il modello a essere peggiorato.
 */
export async function smista(testo) {
  const pulito = String(testo ?? "").trim();
  if (!pulito) throw new Error("Non c'è niente da smistare");

  if (!chiaveConfigurata()) return smistaConRegole(pulito);

  try {
    const grezzo = await chiediJson({
      sistema: SISTEMA,
      // La data di oggi va detta: senza, "entro venerdì" non si può trasformare
      // in una data, e il modello se la inventa a partire da quando è stato
      // addestrato — che è il modo più silenzioso di scrivere scadenze sbagliate.
      domanda: `Oggi è ${oggi()}.\n\n${pulito}`,
      // Basso: smistare una frase in cinque destinazioni non è un compito che
      // migliora pensandoci su, e qui tu stai guardando una rotellina girare.
      effort: "low",
      senzaRagionamento: true,
      schema: SCHEMA,
      maxTokens: 500,
      modello: modelloSmistamento(),
    });

    const buono = valida(grezzo, pulito);
    // Se il modello inventa una destinazione, meglio uno smistamento grezzo
    // che un dato agganciato a niente.
    if (!buono) return smistaConRegole(pulito);

    return { ...buono, via: "modello" };
  } catch (errore) {
    console.error("[classify] il modello non ha risposto, passo alle regole:", errore.message);
    return smistaConRegole(pulito);
  }
}
