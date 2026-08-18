/**
 * Le undici tabelle, campi e scelte comprese, in un posto solo.
 *
 * Le usano in due: lo script strumenti/crea-tabelle.mjs (da terminale) e la
 * rotta /api/admin/tabelle (dal browser, dopo il login). Le scelte dei campi
 * a elenco DEVONO combaciare con il codice: fasce e temperatura con
 * lib/store.js, destinazioni e urgenze con lib/classify.js, periodi con
 * PERIODI in lib/store.js, modalità e conversioni con lib/modalita.js.
 */

const testo = (name, description) => ({ name, type: "singleLineText", ...(description ? { description } : {}) });
const testoLungo = (name, description) => ({ name, type: "multilineText", ...(description ? { description } : {}) });
const numero = (name, precision, description) => ({ name, type: "number", options: { precision }, ...(description ? { description } : {}) });
const dataGiorno = (name, description) => ({ name, type: "date", options: { dateFormat: { name: "iso" } }, ...(description ? { description } : {}) });
const dataOra = (name, description) => ({
  name,
  type: "dateTime",
  options: { dateFormat: { name: "iso" }, timeFormat: { name: "24hour" }, timeZone: "client" },
  ...(description ? { description } : {}),
});
const scelta = (name, valori, description) => ({
  name,
  type: "singleSelect",
  options: { choices: valori.map((v) => ({ name: v })) },
  ...(description ? { description } : {}),
});
const scelte = (name, valori, description) => ({
  name,
  type: "multipleSelects",
  options: { choices: valori.map((v) => ({ name: v })) },
  ...(description ? { description } : {}),
});
const spunta = (name, description) => ({
  name,
  type: "checkbox",
  options: { icon: "check", color: "greenBright" },
  ...(description ? { description } : {}),
});

/* ------------------------------------------------------------- le tabelle */

/**
 * Le scelte dei campi a elenco DEVONO combaciare con il codice:
 * fasce e temperatura con lib/store.js, destinazioni e urgenze con
 * lib/classify.js, periodi con PERIODI in lib/store.js, modalità e
 * conversioni con lib/modalita.js. Se aggiungi un valore nel codice,
 * va aggiunto anche qui (o direttamente sulla base).
 */
export const TABELLE_SCHEMA = [
  {
    name: "Profilo",
    description: "Una riga sola. Chi sei, il focus del giorno, le abitudini da tracciare.",
    fields: [
      testo("Nome"),
      testo("Ruolo"),
      testo("Citta"),
      testoLungo("FocusDelGiorno"),
      testoLungo("Abitudini", "JSON: [{id, nome, tipo: 'spunta'|'contatore', obiettivo}]"),
      numero("ObiettivoCalorico", 0),
      numero("MinutiFormazione", 0, "Minuti di formazione a settimana che ti sei promesso. Vuoto vale 150."),
      numero("PesoObiettivo", 1, "Il peso a cui vuoi arrivare, in kg. Vuoto = la curva del peso non mostra nessun traguardo."),
    ],
  },
  {
    name: "Persone",
    description: "Le persone del CRM. Ogni task può essere legato a una o più di queste.",
    fields: [
      testo("Nome"),
      testo("Organizzazione"),
      scelta("Tipo", ["lavoro", "cliente", "fornitore", "personale", "altro"]),
      testoLungo("Note"),
      dataGiorno("UltimoContatto"),
      dataOra("CreatoIl"),
    ],
  },
  {
    name: "Task",
    description: "Le cose da fare. Fasce invece di scadenze secche: le liste a scadenza marciscono.",
    fields: [
      testo("Titolo"),
      testoLungo("Nota"),
      scelta("Fascia", ["ritardo", "oggi", "settimana", "avanti"]),
      scelta("Temperatura", ["hot", "warm", "cold"]),
      { name: "Persona", type: "multipleRecordLinks", options: { linkedTableId: "@Persone" } },
      scelte("Tag", ["finanze", "lavoro", "personale"], "Etichette libere: se ne aggiungono scrivendole."),
      numero("Posizione", 0),
      scelta("Quadrante", ["Q1", "Q2", "Q3", "Q4"], "Eisenhower: Q1 urgente e importante, Q2 importante, Q3 urgente, Q4 nessuno dei due."),
      dataGiorno("Scadenza", "Facoltativa: la fascia resta il modo principale di ordinare."),
      numero("Priorita", 0, "Da 1 (per primo) a 5. La propone il sistema, la decidi tu."),
      { name: "Allegati", type: "multipleAttachments" },
      dataOra("CreatoIl"),
      dataOra("CompletatoIl"),
    ],
  },
  {
    name: "CicliAperti",
    description: "I pensieri scaricati a terra prima che diventino impegni: una riga per ciclo, la colonna del Kanban è il settore.",
    fields: [
      testo("Titolo"),
      testoLungo("Nota", "Dettagli buttati lì insieme al pensiero, se servono"),
      scelta("Settore", ["Amministrazione", "Personale", "IT", "Vendite"], "La colonna del Kanban: se ne aggiungono scrivendole"),
      numero("Posizione", 0),
      dataOra("CreatoIl"),
      dataOra("PromossoIl", "Quando è diventato un task. Vuoto = ancora aperto"),
      testo("TaskId", "La riga Task nata dalla promozione, per ritrovarla"),
    ],
  },
  {
    name: "Catture",
    description: "Tutto quello che entra, grezzo, prima dello smistamento. La via dice chi ha deciso: modello o regole.",
    fields: [
      testo("Titolo", "La riformulazione breve fatta dallo smistatore"),
      testoLungo("Testo", "Il testo grezzo, come è arrivato"),
      scelta("Provenienza", ["dashboard", "telegram", "telegram-voce", "script"]),
      scelta("Destinazione", ["task", "persone", "finanze", "obiettivi", "memoria"]),
      scelta("Urgenza", ["oggi", "settimana", "avanti"]),
      scelta("ViaClassificazione", ["modello", "regole"]),
      dataOra("CreatoIl"),
    ],
  },
  {
    name: "LogGiornalieri",
    description: "Una riga per giorno. La Data è testo YYYY-MM-DD calcolato nel fuso dell'utente, non dal server.",
    fields: [
      testo("Data", "YYYY-MM-DD nel fuso di USER_TIMEZONE. È la chiave della riga."),
      testoLungo("Abitudini", "JSON: {idAbitudine: true | numero}"),
      testoLungo("Pasti", "JSON, per un'eventuale scheda nutrizione futura"),
      testoLungo("Finanze", "JSON, libero per usi futuri"),
      testoLungo("Salute", "JSON: peso e misure dell'orologio"),
    ],
  },
  {
    name: "Obiettivi",
    description: "Le promesse, su cinque orizzonti. Tabella sua e non riga del log: gli obiettivi non si azzerano mai da soli.",
    fields: [
      testo("Nome"),
      scelta("Periodo", ["settimana", "mese", "anno", "annoProssimo", "5anni"]),
      spunta("Fatto"),
      testo("Progresso", "Facoltativo, es. 3/5"),
      numero("Valore", 0, "A che punto sei, in numero. Con Target accanto diventa la barra di avanzamento."),
      numero("Target", 0, "Il numero da raggiungere. Vuoto = non si misura, si spunta e basta."),
      numero("Posizione", 0),
      dataOra("CreatoIl"),
    ],
  },
  {
    name: "Memoria",
    description: "Ogni cosa che passa dal sistema lascia una traccia qui. È il materiale con cui le domande rispondono citando le fonti.",
    fields: [
      testoLungo("Testo"),
      scelta("Provenienza", ["cattura", "task-chiuso", "diario", "sistema"]),
      testo("Origine", "Riferimento alla riga da cui arriva, per citare la fonte"),
      dataOra("CreatoIl"),
      testoLungo("Embedding", "Vuoto per ora. Serve il giorno in cui le voci diventano troppe per passarle tutte al modello."),
    ],
  },
  {
    name: "Registro",
    description: "Chi ha fatto cosa e quando. Serve alla review, al conto delle chiamate al modello e a non mandare due briefing lo stesso giorno.",
    fields: [
      testo("Evento", "es. task-completato, briefing-inviato, domanda"),
      testoLungo("Dettaglio"),
      testo("Chiave", "Chiave di unicità, es. briefing-2026-01-15: per non ripetere un lavoro già fatto"),
      dataOra("QuandoIl"),
    ],
  },
  {
    name: "Allenamenti",
    description: "Un programma datato: una riga per giorno. Ha un inizio e una fine, e una data vera invece di una fascia.",
    fields: [
      testo("Titolo", "Cosa si fa quel giorno, in una riga."),
      testo("Data", "YYYY-MM-DD nel fuso di USER_TIMEZONE, come in LogGiornalieri."),
      testo("Programma", "Il nome del programma. Serve a tenerne più di uno e a non importare due volte lo stesso."),
      numero("Giorno", 0, "Il numero del giorno nel programma, da 1."),
      numero("Settimana", 0, "Il numero della settimana, da 1."),
      testo("Fase", "Il nome della settimana, es. Partenza."),
      scelta("Tipo", ["tapis", "camminata", "intervalli", "circuito", "piscina", "riposo"], "Che tipo di seduta è."),
      scelta("Conversione", ["camminata", "circuito", "intervalli", "piscina", "riposo"], "Quale riga della tabella di conversione usare per le versioni corte. Di solito coincide col Tipo."),
      testoLungo("Dettaglio", "Il passo passo della seduta."),
      testo("Target", "Un target indicativo di fine settimana, dove previsto."),
      spunta("Pesata", "Il giorno in cui ci si pesa."),
      testo("FattoIl", "Il momento ISO della spunta. Vuoto = non fatto."),
      numero("Peso", 1, "Il peso segnato quel giorno, in kg."),
      scelta("Modalita", ["standard", "cliente", "emergenza"], "Con quale delle tre versioni è stata fatta la seduta."),
    ],
  },
  {
    name: "Formazione",
    description: "Le sessioni di studio: una riga per sessione, non per corso. Il corso è un obiettivo, la sessione è il tempo che ci hai messo davvero.",
    fields: [
      testo("Titolo", "Cosa hai studiato: il nome del corso, del libro, del video."),
      scelta("Tipo", ["corso", "libro", "podcast", "video", "articolo", "evento", "pratica"]),
      numero("Minuti", 0, "Quanto ci hai messo davvero, in minuti."),
      dataGiorno("Data", "Il giorno della sessione."),
      testo("Fonte", "Chi l'ha fatto: autore, piattaforma, relatore."),
      testoLungo("Note", "Cosa ti porti a casa. Una riga basta."),
      dataOra("CreatoIl"),
    ],
  },
];


/* ------------------------------------------------------------ la creazione */

/**
 * Crea le tabelle che mancano su una base, in ordine. Idempotente: quelle che
 * esistono già si saltano, i dati non si toccano mai. Torna il resoconto.
 */
export async function creaTabelle(base, chiave) {
  const radice = `https://api.airtable.com/v0/meta/bases/${base}/tables`;

  async function chiama(metodo, indirizzo, corpo) {
    const r = await fetch(indirizzo, {
      method: metodo,
      headers: { Authorization: `Bearer ${chiave}`, "Content-Type": "application/json" },
      ...(corpo ? { body: JSON.stringify(corpo) } : {}),
    });
    const dati = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`Airtable ${r.status}: ${JSON.stringify(dati).slice(0, 300)}`);
    return dati;
  }

  const esistenti = await chiama("GET", radice).then((d) => d.tables ?? []);
  const perNome = new Map(esistenti.map((t) => [t.name, t]));
  const create = [];
  const saltate = [];

  for (const tabella of TABELLE_SCHEMA) {
    if (perNome.has(tabella.name)) {
      saltate.push(tabella.name);
      continue;
    }
    // Il campo collegato si risolve ora: "@Persone" diventa l'id vero della
    // tabella, che a questo punto esiste perché l'ordine dell'elenco lo impone.
    const fields = tabella.fields.map((f) => {
      if (f.options?.linkedTableId?.startsWith?.("@")) {
        const nome = f.options.linkedTableId.slice(1);
        const collegata = perNome.get(nome);
        if (!collegata) throw new Error(`${tabella.name}: la tabella collegata ${nome} non esiste ancora.`);
        return { ...f, options: { linkedTableId: collegata.id } };
      }
      return f;
    });
    const creata = await chiama("POST", radice, { name: tabella.name, description: tabella.description, fields });
    perNome.set(tabella.name, creata);
    create.push(tabella.name);
  }

  return { create, saltate };
}
