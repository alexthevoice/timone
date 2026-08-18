/**
 * Le tre modalità della giornata.
 *
 * Non sono tre programmi: sono tre versioni della stessa giornata. Quella
 * scritta sul calendario è la Standard; le altre due esistono perché il modo
 * più comune di far morire un programma non è la fatica, è la giornata in cui
 * non ci stanno sessanta minuti e allora non si fa niente.
 *
 * La regola che tiene in piedi tutto: se non ci stanno 60' fai 40', se non ci
 * stanno 40' fai 20'. Quello che salti non si recupera il giorno dopo.
 *
 * Qui dentro non si parla né con Airtable né col modello: c'è solo la tabella
 * di conversione e la funzione che, data una riga del programma, scrive le tre
 * versioni per esteso.
 */

export const MODALITA = [
  {
    id: "standard",
    sigla: "S",
    nome: "Standard",
    minuti: 60,
    quando: "Giornata normale",
    spiega: "Fai quello che c'è scritto nel calendario, per intero.",
  },
  {
    id: "cliente",
    sigla: "C",
    nome: "Cliente",
    minuti: 40,
    quando: "Parti presto o torni tardi",
    spiega:
      "Versione corta, meglio al mattino prima di uscire che alle nove di sera con la testa altrove.",
  },
  {
    id: "emergenza",
    sigla: "E",
    nome: "Emergenza",
    minuti: 20,
    quando: "Giornata ingestibile",
    spiega: "Venti minuti e basta. Il giorno conta lo stesso, e non si recupera la sera tardi.",
  },
];

export const ID_MODALITA = MODALITA.map((m) => m.id);

export const REGOLA_ANTI_SALTO =
  "Se non ci stanno 60', fai 40'. Se non ci stanno 40', fai 20'. Quello che salti non si recupera il giorno dopo, e una seduta ridotta non è un fallimento: è il programma che sta funzionando come deve.";

export function modalitaValida(valore) {
  return ID_MODALITA.includes(valore) ? valore : null;
}

export const perId = (id) => MODALITA.find((m) => m.id === id) ?? null;

/* ------------------------------------------------- la tabella di conversione */

/**
 * Le versioni corte non sono centosessantotto allenamenti nuovi.
 *
 * Dipendono solo dal tipo di giornata, quindi sono cinque righe di tabella e
 * non ottantaquattro casi. Scriverli uno per uno avrebbe voluto dire tre
 * elenchi da tenere allineati a mano ogni volta che si tocca una seduta.
 */
export const CONVERSIONI = [
  {
    id: "camminata",
    nome: "Camminata",
    cliente: {
      titolo: "Tapis 40' sostenuto",
      dettaglio: "40 minuti sul walking pad a passo sostenuto, 5,5-5,7 km/h.",
    },
    emergenza: {
      titolo: "Tapis 20' sostenuto",
      dettaglio: "20 minuti sul walking pad a 5,5-6 km/h. Passo deciso, niente riscaldamento lungo.",
    },
  },
  {
    id: "circuito",
    nome: "Con circuito",
    cliente: {
      titolo: "Tapis 25' sostenuto + circuito ×2",
      dettaglio:
        "25 minuti sul walking pad a passo sostenuto, poi 2 giri di circuito. Sempre due giri, qualunque numero ci sia sul calendario.",
    },
    emergenza: {
      titolo: "Tapis 20' sostenuto",
      dettaglio: "20 minuti sul walking pad a 5,5-6 km/h. Oggi il circuito salta.",
    },
  },
  {
    id: "intervalli",
    nome: "A intervalli",
    cliente: {
      titolo: "Intervalli 40'",
      dettaglio:
        "40 minuti a intervalli: breve riscaldamento, poi alterna 5' a 6 km/h e 3' a 5-5,3. Negli ultimi minuti rallenta.",
    },
    emergenza: {
      titolo: "Tapis 20' a intervalli corti",
      dettaglio: "20 minuti così: 5' a 5,3 km/h, 10' a 6 km/h, 5' a 5,3 km/h.",
    },
  },
  {
    id: "piscina",
    nome: "Con piscina",
    cliente: {
      titolo: "Tapis 40' sostenuto, piscina facoltativa",
      dettaglio:
        "40 minuti sul walking pad a passo sostenuto. La piscina è un bonus: se salta non si recupera e non toglie niente al programma.",
    },
    emergenza: {
      titolo: "Tapis 20' sostenuto",
      dettaglio: "20 minuti sul walking pad a passo sostenuto. Niente piscina.",
    },
  },
  {
    id: "riposo",
    nome: "Riposo",
    cliente: { titolo: "Riposo", dettaglio: "Riposo, in tutte e tre le modalità." },
    emergenza: { titolo: "Riposo", dettaglio: "Riposo, in tutte e tre le modalità." },
  },
];

export const ID_CONVERSIONI = CONVERSIONI.map((c) => c.id);

/**
 * Quale riga di conversione usare per una seduta.
 *
 * Il campo esplicito vince sempre. Il tipo è solo il valore predefinito,
 * perché due giorni su ottantaquattro non coincidono: il primo è di tipo
 * circuito ma si accorcia come una camminata, e il diciottesimo è di tipo
 * intervalli ma si accorcia come un circuito.
 *
 * Dedurlo leggendo il titolo sarebbe stato più corto da scrivere e sbagliato
 * da mantenere: basta cambiare una parola in un titolo e la conversione cambia
 * senza che nessuno se ne accorga.
 */
export function conversioneDi(riga) {
  if (ID_CONVERSIONI.includes(riga?.conversione)) return riga.conversione;
  // "tapis" è il nome interno della camminata: stessa cosa, nome diverso.
  if (riga?.tipo === "tapis") return "camminata";
  if (ID_CONVERSIONI.includes(riga?.tipo)) return riga.tipo;
  return "camminata";
}

/**
 * Le tre versioni di una giornata, scritte per esteso.
 *
 * Per esteso e non in sigla: il senso di tutta questa faccenda è non dover
 * tradurre a mente alle sette di sera "circuito ×3, ma in versione corta,
 * quanto sarebbe?".
 */
export function versioni(riga) {
  if (!riga) return null;
  const c = CONVERSIONI.find((x) => x.id === conversioneDi(riga));

  return {
    conversione: c.id,
    standard: { titolo: riga.titolo, dettaglio: riga.dettaglio },
    cliente: c.cliente,
    emergenza: c.emergenza,
  };
}

/** La versione di una singola modalità. */
export function versione(riga, modalita) {
  const tutte = versioni(riga);
  if (!tutte) return null;
  return tutte[modalita] ?? tutte.standard;
}

/**
 * Il conto delle modalità su un insieme di giorni.
 *
 * È il numero che serve davvero: se le C e le E sono la maggioranza, il
 * problema non è la volontà, è l'orario in cui si prova ad allenarsi. Un
 * programma che conta solo i giorni fatti quel dato non te lo dice.
 */
export function conta(giorni) {
  const c = { standard: 0, cliente: 0, emergenza: 0, fatti: 0, totale: giorni.length };
  for (const g of giorni) {
    if (!g.fattoIl) continue;
    c.fatti += 1;
    // Una seduta spuntata prima che esistessero le modalità non ha modalità.
    // Contarla come standard sarebbe comodo e falso.
    if (c[g.modalita] !== undefined) c[g.modalita] += 1;
  }
  return c;
}
