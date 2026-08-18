/**
 * L'unico punto da cui si parla con Claude.
 *
 * Il nome del modello sta in una variabile d'ambiente, non scritto a mano in
 * giro per i file: i nomi dei modelli cambiano, e trovarli sparsi nel codice
 * il giorno che ne cambi uno è un pomeriggio buttato.
 */

import Anthropic from "@anthropic-ai/sdk";

const MODELLO = process.env.ANTHROPIC_MODEL || "claude-opus-5";

/**
 * Lo smistamento può girare su un modello diverso dalle risposte.
 * Sono due mestieri con due esigenze opposte: smistare deve essere veloce
 * perché tu stai aspettando davanti alla barra, rispondere deve essere bravo
 * perché stai leggendo una cosa che riguarda la tua vita.
 * Se la variabile non c'è, si usa lo stesso modello di tutto il resto.
 */
const MODELLO_SMISTAMENTO = process.env.ANTHROPIC_MODEL_SMISTAMENTO || MODELLO;

let cliente = null;

export function chiaveConfigurata() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function client() {
  if (!cliente) cliente = new Anthropic();
  return cliente;
}

/**
 * Non tutti i modelli accettano `effort`: i più piccoli rispondono 400.
 *
 * Senza questa rete, mettere un modello veloce sullo smistamento sembrava
 * funzionare — in realtà ogni chiamata falliva e smistavano le regole, in
 * silenzio. È lo stesso guasto contro cui serve la via di classificazione:
 * il sistema continua a fare il suo lavoro, solo peggio, e nessuno te lo dice.
 */
const senzaEffort = new Set();

function togliEffort(richiesta) {
  const { effort, ...resto } = richiesta.output_config ?? {};
  const seconda = { ...richiesta };
  if (Object.keys(resto).length) seconda.output_config = resto;
  else delete seconda.output_config;
  return seconda;
}

async function conRitentoSenzaEffort(richiesta) {
  // Una volta scoperto, non lo chiediamo più: il ritento costa un giro intero.
  if (senzaEffort.has(richiesta.model)) {
    return client().messages.create(togliEffort(richiesta));
  }

  try {
    return await client().messages.create(richiesta);
  } catch (errore) {
    const parla = String(errore?.message ?? "");
    if (errore?.status !== 400 || !/effort/i.test(parla)) throw errore;

    senzaEffort.add(richiesta.model);
    console.warn(
      `[claude] ${richiesta.model} non accetta effort: da qui in poi non glielo chiedo.`
    );
    return client().messages.create(togliEffort(richiesta));
  }
}

/**
 * Una chiamata a Claude.
 *
 * @param {object} opzioni
 * @param {string} opzioni.sistema          il prompt di sistema
 * @param {string} opzioni.domanda          il messaggio dell'utente
 * @param {number} opzioni.maxTokens        tetto su RAGIONAMENTO + TESTO insieme.
 *   È la trappola numero uno: con un tetto basso il ragionamento se lo mangia
 *   tutto e il testo non arriva mai, l'endpoint risponde vuoto e sembra rotto.
 * @param {string} opzioni.effort           low | medium | high | xhigh | max
 * @param {boolean} opzioni.senzaRagionamento
 *   Su claude-opus-5 il ragionamento è ACCESO di default. Spegnerlo si può solo
 *   con effort "high" o inferiore: con xhigh o max l'API risponde 400.
 * @param {object} opzioni.schema           schema JSON per l'output strutturato
 */
export async function chiediAClaude({
  sistema,
  domanda,
  maxTokens = 4000,
  effort = "high",
  senzaRagionamento = false,
  schema = null,
  modello = MODELLO,
}) {
  if (!chiaveConfigurata()) {
    throw new Error("ANTHROPIC_API_KEY non è impostata");
  }

  const outputConfig = { effort };
  if (schema) {
    outputConfig.format = { type: "json_schema", schema };
  }

  const richiesta = {
    model: modello,
    max_tokens: maxTokens,
    system: sistema,
    output_config: outputConfig,
    messages: [{ role: "user", content: domanda }],
  };

  if (senzaRagionamento) {
    if (effort === "xhigh" || effort === "max") {
      throw new Error(
        `Non si può spegnere il ragionamento con effort "${effort}": l'API risponde 400. Usa "high" o meno.`
      );
    }
    richiesta.thinking = { type: "disabled" };
  }

  const risposta = await conRitentoSenzaEffort(richiesta);

  // I blocchi di testo vanno concatenati TUTTI, saltando quelli di
  // ragionamento: prendere solo il primo blocco vuol dire prendere il
  // pensiero, o solo un pezzo della risposta.
  const testo = risposta.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  return { testo, risposta, motivoStop: risposta.stop_reason };
}

/**
 * Come sopra, ma torna direttamente l'oggetto.
 *
 * Con lo schema il modello non può produrre altro che JSON valido. L'estrazione
 * tra graffe resta come rete di sicurezza: costa due righe e copre il giorno in
 * cui si cambia fornitore o si toglie lo schema.
 */
export async function chiediJson(opzioni) {
  const { testo, motivoStop } = await chiediAClaude(opzioni);

  if (motivoStop === "max_tokens") {
    throw new Error(
      "Il modello si è fermato per limite di token: alza maxTokens, il ragionamento si è mangiato il budget."
    );
  }
  if (motivoStop === "refusal") {
    throw new Error("Il modello ha rifiutato di rispondere.");
  }

  try {
    return JSON.parse(testo);
  } catch {
    const apre = testo.indexOf("{");
    const chiude = testo.lastIndexOf("}");
    if (apre === -1 || chiude <= apre) {
      throw new Error(`Risposta non interpretabile come JSON: ${testo.slice(0, 200)}`);
    }
    return JSON.parse(testo.slice(apre, chiude + 1));
  }
}

export const modelloInUso = () => MODELLO;
export const modelloSmistamento = () => MODELLO_SMISTAMENTO;
