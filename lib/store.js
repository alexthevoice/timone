/**
 * L'unico punto di accesso ai dati.
 *
 * Nessuna rotta e nessun componente tocca Airtable direttamente: tutti chiedono
 * qui. Il giorno in cui il database cambia, si riscrive questo file e basta.
 * Se invece le letture fossero sparse in venti componenti, quel giorno
 * diventerebbe un fine settimana.
 */

import {
  TABELLE,
  aggiorna,
  aggiornaTante,
  caricaAllegato,
  configurato,
  crea,
  creaTante,
  elimina,
  json,
  leggiTutte,
  leggiUna,
} from "@/lib/airtable";
import { adessoIso, oggi } from "@/lib/data";
import { conta, modalitaValida } from "@/lib/modalita";
import { SETTORI_PREDEFINITI } from "@/lib/settori";
import { leggiNumero } from "@/lib/numeri";
import {
  normalizzaPriorita,
  prioritaConRegole,
  quadranteConRegole,
  quadranteValido,
} from "@/lib/quadranti";

export { configurato };

/* ------------------------------------------------------------------ profilo */

const PROFILO_PREDEFINITO = {
  nome: "",
  cognome: "",
  nomeSistema: "",
  interfaccia: null,
  configurato: false,
  ruolo: "",
  citta: "",
  focus: "",
  obiettivoCalorico: 2200,
  // Mezz'ora per cinque giorni: un traguardo che si può tenere davvero, e che
  // fallito di poco resta comunque una settimana in cui hai studiato.
  minutiFormazione: 150,
  // Il peso a cui vuoi arrivare. Vuoto vuol dire "non lo sto rincorrendo":
  // la curva del peso resta, sparisce solo la riga del traguardo.
  pesoObiettivo: null,
  abitudini: [],
  // Le colonne del Kanban dei Cicli Aperti, in ordine. Vuoto = i predefiniti.
  settori: [],
};

export async function leggiProfilo() {
  if (!configurato()) return { ...PROFILO_PREDEFINITO };
  const righe = await leggiTutte(TABELLE.profilo, { maxRecords: 1 });
  const r = righe[0];
  if (!r) return { ...PROFILO_PREDEFINITO };
  return {
    id: r.id,
    nome: r.Nome ?? "",
    cognome: r.Cognome ?? "",
    nomeSistema: r.NomeSistema ?? "",
    interfaccia: json(r.Interfaccia, null),
    configurato: Boolean(r.ConfiguratoIl),
    ruolo: r.Ruolo ?? "",
    citta: r.Citta ?? "",
    focus: r.FocusDelGiorno ?? "",
    obiettivoCalorico: r.ObiettivoCalorico ?? PROFILO_PREDEFINITO.obiettivoCalorico,
    minutiFormazione: r.MinutiFormazione ?? PROFILO_PREDEFINITO.minutiFormazione,
    pesoObiettivo: r.PesoObiettivo ?? null,
    abitudini: json(r.Abitudini, []),
    settori: json(r.Settori, []),
  };
}

export async function aggiornaProfilo(patch) {
  const attuale = await leggiProfilo();
  const campi = {};
  if (patch.nome !== undefined) campi.Nome = patch.nome;
  if (patch.cognome !== undefined) campi.Cognome = patch.cognome;
  if (patch.nomeSistema !== undefined) campi.NomeSistema = patch.nomeSistema;
  if (patch.interfaccia !== undefined) campi.Interfaccia = JSON.stringify(patch.interfaccia, null, 2);
  // Il wizard timbra la fine con "configurato": true; rimetterlo a false
  // (da Config, "rifai la configurazione") lo fa ripartire al prossimo giro.
  if (patch.configurato === true) campi.ConfiguratoIl = adessoIso();
  if (patch.configurato === false) campi.ConfiguratoIl = null;
  if (patch.ruolo !== undefined) campi.Ruolo = patch.ruolo;
  if (patch.citta !== undefined) campi.Citta = patch.citta;
  if (patch.focus !== undefined) campi.FocusDelGiorno = patch.focus;
  if (patch.obiettivoCalorico !== undefined) campi.ObiettivoCalorico = patch.obiettivoCalorico;
  if (patch.minutiFormazione !== undefined) campi.MinutiFormazione = patch.minutiFormazione;
  if (patch.pesoObiettivo !== undefined) campi.PesoObiettivo = patch.pesoObiettivo === null ? null : Number(patch.pesoObiettivo);
  if (patch.abitudini !== undefined) campi.Abitudini = JSON.stringify(patch.abitudini, null, 2);
  if (patch.settori !== undefined) campi.Settori = JSON.stringify(patch.settori, null, 2);

  if (attuale.id) await aggiorna(TABELLE.profilo, attuale.id, campi);
  else await crea(TABELLE.profilo, campi);
  return leggiProfilo();
}

/**
 * L'hash della password vive nel Profilo ma non esce da queste due funzioni:
 * leggiProfilo non lo tocca apposta, perché quel profilo finisce nel browser.
 */
export async function leggiPasswordHash() {
  const righe = await leggiTutte(TABELLE.profilo, { maxRecords: 1 });
  return righe[0]?.PasswordHash || null;
}

export async function impostaPasswordHash(saleEHash) {
  const righe = await leggiTutte(TABELLE.profilo, { maxRecords: 1 });
  if (righe[0]?.id) return aggiorna(TABELLE.profilo, righe[0].id, { PasswordHash: saleEHash });
  return crea(TABELLE.profilo, { PasswordHash: saleEHash });
}

/* ------------------------------------------------------------------ persone */

export async function leggiPersone() {
  const righe = await leggiTutte(TABELLE.persone);
  return righe.map((r) => ({
    id: r.id,
    nome: r.Nome ?? "",
    organizzazione: r.Organizzazione ?? "",
    tipo: r.Tipo ?? null,
    note: r.Note ?? "",
    ultimoContatto: r.UltimoContatto ?? null,
  }));
}

/** Cerca una persona per nome, e se non c'è la crea. Torna il suo id. */
export async function trovaOCreaPersona(nome) {
  const pulito = String(nome ?? "").trim();
  if (!pulito) return null;
  const esistente = await leggiUna(
    TABELLE.persone,
    `LOWER({Nome}) = "${pulito.toLowerCase().replace(/"/g, '\\"')}"`
  );
  if (esistente) return esistente.id;
  const nuova = await crea(TABELLE.persone, { Nome: pulito, CreatoIl: adessoIso() });
  return nuova.id;
}

export async function segnaContatto(personaId) {
  if (!personaId) return;
  await aggiorna(TABELLE.persone, personaId, { UltimoContatto: oggi() });
}

/* --------------------------------------------------------------------- task */

export const FASCE = ["ritardo", "oggi", "settimana", "avanti"];
const PESO_FASCIA = { ritardo: 0, oggi: 1, settimana: 2, avanti: 3 };
const PESO_TEMP = { hot: 0, warm: 1, cold: 2 };

function ordinaTask(a, b) {
  const f = (PESO_FASCIA[a.fascia] ?? 9) - (PESO_FASCIA[b.fascia] ?? 9);
  if (f) return f;
  const t = (PESO_TEMP[a.temperatura] ?? 9) - (PESO_TEMP[b.temperatura] ?? 9);
  if (t) return t;
  return (a.posizione ?? 0) - (b.posizione ?? 0);
}

export async function leggiTask({ includiCompletati = false } = {}) {
  const [righe, persone] = await Promise.all([leggiTutte(TABELLE.task), leggiPersone()]);
  const perId = new Map(persone.map((p) => [p.id, p]));
  const giorno = oggi();

  return righe
    .filter((r) => includiCompletati || !r.CompletatoIl)
    .map((r) => {
      // Airtable collega più persone da sempre: era questo codice a prenderne
      // una sola. Una cosa da fare in due è la normalità — la chiamata con il
      // dealer e il suo commercialista, la riunione con due soci — e scriverne
      // uno solo vuol dire che l'altro non la vede più passare da nessuna parte.
      const personeId = Array.isArray(r.Persona) ? r.Persona : [];
      const nomi = personeId.map((x) => perId.get(x)?.nome).filter(Boolean);
      const base = {
        id: r.id,
        titolo: r.Titolo ?? "",
        nota: r.Nota ?? "",
        fascia: r.Fascia ?? "avanti",
        temperatura: r.Temperatura ?? "cold",
        personeId,
        persone: nomi,
        // `persona` resta il primo nome: è quello che le liste strette mostrano
        // quando non c'è spazio per tutti.
        personaId: personeId[0] ?? null,
        persona: nomi[0] ?? null,
        tag: r.Tag ?? [],
        posizione: r.Posizione ?? 0,
        // La scadenza arriva da Airtable come YYYY-MM-DD: non passa da new Date(),
        // che la sposterebbe di un giorno nella metà sbagliata dell'anno.
        scadenza: r.Scadenza ? String(r.Scadenza).slice(0, 10) : null,
        allegati: (r.Allegati ?? []).map((a) => ({
          id: a.id,
          nome: a.filename,
          tipo: a.type ?? "",
          dimensione: a.size ?? 0,
          indirizzo: a.url,
          miniatura: a.thumbnails?.small?.url ?? null,
        })),
        creatoIl: r.CreatoIl ?? null,
        completatoIl: r.CompletatoIl ?? null,
      };

      // Un task senza quadrante sparisce dalla croce, e una croce bucata non si
      // guarda più. Quello dedotto NON viene scritto sulla riga: resta una
      // proposta finché il modello o tu non decidete davvero.
      const quadrante = quadranteValido(r.Quadrante);
      return {
        ...base,
        quadrante,
        quadranteProposto: quadrante ?? quadranteConRegole(base, giorno),
        priorita: normalizzaPriorita(r.Priorita),
        prioritaProposta:
          normalizzaPriorita(r.Priorita) ??
          prioritaConRegole(base, quadrante ?? quadranteConRegole(base, giorno)),
      };
    })
    .sort(ordinaTask);
}

export async function creaTask({
  titolo,
  nota,
  fascia,
  temperatura,
  persona,
  persone,
  tag,
  quadrante,
  priorita,
  scadenza,
}) {
  const fasciaValida = FASCE.includes(fascia) ? fascia : "oggi";

  // I nuovi elementi entrano in testa alla loro fascia: la posizione è più
  // bassa di tutte quelle che ci sono già. Basta leggere la riga più in alto
  // di quella fascia, non tutta la tabella: sulla cattura ogni giro su
  // Airtable è tempo che passi a guardare la barra.
  const nomi = (Array.isArray(persone) ? persone : [persona]).map((x) => String(x ?? "").trim()).filter(Boolean);
  const [personeId, primo] = await Promise.all([
    Promise.all(nomi.map((n) => trovaOCreaPersona(n))),
    leggiTutte(TABELLE.task, {
      filterByFormula: `{Fascia} = "${fasciaValida}"`,
      maxRecords: 1,
      "sort[0][field]": "Posizione",
      "sort[0][direction]": "asc",
    }),
  ]);

  const testa = primo.length ? (primo[0].Posizione ?? 0) - 1 : 0;

  // Quadrante e priorità si scrivono solo se qualcuno li ha decisi davvero:
  // il modello o l'utente. Quelli dedotti dalle regole restano proposte
  // (`quadranteProposto` in lettura) e sulla riga non finiscono mai —
  // altrimenti non si distingue più cosa è stato deciso e cosa indovinato.
  return crea(TABELLE.task, {
    Titolo: titolo,
    Nota: nota ?? "",
    Fascia: fasciaValida,
    Temperatura: temperatura ?? "warm",
    Persona: personeId.filter(Boolean).length ? personeId.filter(Boolean) : undefined,
    Tag: tag ?? undefined,
    Posizione: testa,
    Quadrante: quadranteValido(quadrante) ?? undefined,
    Priorita: normalizzaPriorita(priorita) ?? undefined,
    Scadenza: scadenza || undefined,
    CreatoIl: adessoIso(),
  });
}

export async function aggiornaTask(id, patch) {
  const campi = {};
  if (patch.titolo !== undefined) campi.Titolo = patch.titolo;
  if (patch.nota !== undefined) campi.Nota = patch.nota;
  if (patch.fascia !== undefined) campi.Fascia = patch.fascia;
  if (patch.temperatura !== undefined) campi.Temperatura = patch.temperatura;
  if (patch.tag !== undefined) campi.Tag = patch.tag;
  if (patch.posizione !== undefined) campi.Posizione = patch.posizione;
  if (patch.quadrante !== undefined) campi.Quadrante = quadranteValido(patch.quadrante) ?? "";
  if (patch.priorita !== undefined) campi.Priorita = normalizzaPriorita(patch.priorita) ?? null;
  // Svuotare una scadenza e non metterla mai sono due gesti diversi: il primo
  // deve arrivare ad Airtable come null, non sparire dalla patch.
  if (patch.scadenza !== undefined) campi.Scadenza = patch.scadenza || null;
  // `persone` è l'elenco completo, `persona` la scorciatoia per una sola: la
  // seconda esiste perché la cattura e la barra in fondo scrivono un nome solo.
  if (patch.persone !== undefined) {
    const nomi = (patch.persone ?? []).map((x) => String(x ?? "").trim()).filter(Boolean);
    const ids = (await Promise.all(nomi.map((n) => trovaOCreaPersona(n)))).filter(Boolean);
    campi.Persona = ids;
  } else if (patch.persona !== undefined) {
    const personaId = patch.persona ? await trovaOCreaPersona(patch.persona) : null;
    campi.Persona = personaId ? [personaId] : [];
  }
  return aggiorna(TABELLE.task, id, campi);
}

/** Attacca un file a un task. Si aggiunge a quelli che ci sono già. */
export async function allegaAlTask(id, file) {
  return caricaAllegato(TABELLE.task, id, "Allegati", file);
}

/** Stacca un allegato da un task, lasciando gli altri dove sono. */
export async function staccaDalTask(id, allegatoId) {
  const riga = await leggiUna(TABELLE.task, `RECORD_ID() = "${id}"`);
  const restano = (riga?.Allegati ?? []).filter((a) => a.id !== allegatoId).map((a) => ({ id: a.id }));
  return aggiorna(TABELLE.task, id, { Allegati: restano });
}

/** Completare non cancella: la riga resta, con la sua data. */
export async function completaTask(id) {
  const fatto = await aggiorna(TABELLE.task, id, { CompletatoIl: adessoIso() });
  await scriviRegistro("task-completato", fatto.Titolo ?? id);
  return fatto;
}

/**
 * Riapre una cosa chiusa.
 *
 * Completare non cancella, quindi tornare indietro è solo togliere la data. La
 * riga resta la stessa — stesso titolo, stessa persona, stessi allegati — e
 * questo conta: rifarla da capo vorrebbe dire perdere quello che c'era attaccato
 * e falsare la review, che conta le cose chiuse.
 *
 * Nel registro si scrive anche la riapertura. Una settimana in cui si chiude e
 * si riapre la stessa cosa tre volte dice qualcosa che il solo "chiusa" nasconde.
 */
export async function riapriTask(id) {
  const fatto = await aggiorna(TABELLE.task, id, { CompletatoIl: null });
  await scriviRegistro("task-riaperto", fatto.Titolo ?? id);
  return fatto;
}

export async function eliminaTask(id) {
  return elimina(TABELLE.task, id);
}

/** Al rilascio di una carta si riscrivono le posizioni della fascia toccata. */
export async function riordinaFascia(fascia, idInOrdine) {
  return aggiornaTante(
    TABELLE.task,
    idInOrdine.map((id, i) => ({ id, campi: { Fascia: fascia, Posizione: i } }))
  );
}

/* ------------------------------------------------------------ cicli aperti */

/**
 * I cicli aperti: i pensieri scaricati a terra prima che diventino impegni.
 *
 * Non sono task e non devono diventarlo per forza: un ciclo non ha fascia,
 * scadenza né quadrante, ha solo un titolo e il settore a cui appartiene.
 * Il punto è liberare la testa: si scrive, si parcheggia nella colonna
 * giusta, e SOLO quando è il momento si promuove a task, con la sua data.
 *
 * Promuovere non cancella: la riga resta con PromossoIl e l'id del task
 * nato da lei, così si vede dove è finito ogni pensiero. Il Kanban mostra
 * solo i cicli ancora aperti.
 */

export async function leggiCicli() {
  const righe = await leggiTutte(TABELLE.cicli, {
    filterByFormula: `{PromossoIl} = ""`,
  });
  return righe
    .map((r) => ({
      id: r.id,
      titolo: r.Titolo ?? "",
      nota: r.Nota ?? "",
      settore: r.Settore ?? null,
      posizione: r.Posizione ?? 0,
      creatoIl: r.CreatoIl ?? null,
    }))
    .sort((a, b) => (a.posizione ?? 0) - (b.posizione ?? 0));
}

export async function creaCiclo({ titolo, settore, nota }) {
  const pulito = String(titolo ?? "").trim();
  if (!pulito) throw new Error("Un ciclo senza titolo non libera nessuna testa.");

  // In testa alla sua colonna, come i task nella loro fascia: l'ultimo
  // pensiero è quello più caldo.
  const dovE = settore
    ? `{Settore} = "${String(settore).replace(/"/g, '\\"')}"`
    : `{Settore} = ""`;
  const primo = await leggiTutte(TABELLE.cicli, {
    filterByFormula: `AND(${dovE}, {PromossoIl} = "")`,
    maxRecords: 1,
    "sort[0][field]": "Posizione",
    "sort[0][direction]": "asc",
  });
  const testa = primo.length ? (primo[0].Posizione ?? 0) - 1 : 0;

  return crea(TABELLE.cicli, {
    Titolo: pulito.slice(0, 200),
    Nota: nota ?? "",
    // typecast è già attivo in lib/airtable.js: un settore nuovo scritto qui
    // diventa una scelta nuova su Airtable, cioè una colonna nuova del Kanban.
    Settore: settore ? String(settore).trim() : undefined,
    Posizione: testa,
    CreatoIl: adessoIso(),
  });
}

export async function aggiornaCiclo(id, patch) {
  const campi = {};
  if (patch.titolo !== undefined) campi.Titolo = String(patch.titolo).slice(0, 200);
  if (patch.nota !== undefined) campi.Nota = patch.nota ?? "";
  if (patch.settore !== undefined) campi.Settore = patch.settore ? String(patch.settore).trim() : null;
  if (patch.posizione !== undefined) campi.Posizione = patch.posizione;
  return aggiorna(TABELLE.cicli, id, campi);
}

/** Al rilascio di una carta si riscrivono le posizioni della colonna toccata. */
export async function riordinaCicli(settore, idInOrdine) {
  return aggiornaTante(
    TABELLE.cicli,
    idInOrdine.map((id, i) => ({ id, campi: { Settore: settore || null, Posizione: i } }))
  );
}

/**
 * La promozione: il ciclo diventa un task vero, con fascia e scadenza.
 *
 * Il ciclo NON si cancella: gli si scrive quando è successo e quale task è
 * nato da lui. Sparisce dal Kanban (che mostra solo gli aperti) ma resta la
 * traccia, per la stessa ragione per cui completare un task non lo cancella.
 */
export async function promuoviCiclo(id, { fascia, scadenza, temperatura, quadrante, priorita } = {}) {
  const riga = await leggiUna(TABELLE.cicli, `RECORD_ID() = "${id}"`);
  if (!riga) throw new Error("Questo ciclo non esiste.");
  if (riga.PromossoIl) throw new Error("Questo ciclo è già stato promosso.");

  const task = await creaTask({
    titolo: riga.Titolo,
    nota: [riga.Nota, riga.Settore ? `Dal ciclo aperto · ${riga.Settore}` : "Dal ciclo aperto"]
      .filter(Boolean)
      .join("\n"),
    fascia: fascia ?? "settimana",
    temperatura: temperatura ?? "warm",
    tag: riga.Settore ? [riga.Settore] : undefined,
    quadrante,
    priorita,
    scadenza,
  });

  await aggiorna(TABELLE.cicli, id, { PromossoIl: adessoIso(), TaskId: task.id });
  await scriviRegistro("ciclo-promosso", `${riga.Titolo}${riga.Settore ? ` · ${riga.Settore}` : ""}`);
  return task;
}

export async function eliminaCiclo(id) {
  return elimina(TABELLE.cicli, id);
}

/**
 * Le colonne del Kanban sono un dato, non una costante: vivono nel Profilo
 * (campo Settori, JSON ordinato). Finché non decidi i tuoi reparti valgono
 * i predefiniti; dal primo ritocco in poi l'elenco è tuo.
 */
export async function leggiSettori() {
  const profilo = await leggiProfilo();
  return profilo.settori?.length ? profilo.settori : [...SETTORI_PREDEFINITI];
}

export async function creaSettore(nome) {
  const pulito = String(nome ?? "").trim();
  if (!pulito) throw new Error("Un settore senza nome non è una colonna.");
  const attuali = await leggiSettori();
  if (attuali.some((s) => s.toLowerCase() === pulito.toLowerCase())) return attuali;
  const nuovi = [...attuali, pulito];
  await aggiornaProfilo({ settori: nuovi });
  return nuovi;
}

/**
 * Rinominare una colonna rinomina anche i cicli che ci stanno dentro,
 * promossi compresi: la storia deve continuare a chiamarsi come la parete.
 */
export async function rinominaSettore(vecchio, nuovo) {
  const da = String(vecchio ?? "").trim();
  const a = String(nuovo ?? "").trim();
  if (!da || !a) throw new Error("Servono il nome vecchio e quello nuovo.");

  const attuali = await leggiSettori();
  await aggiornaProfilo({ settori: attuali.map((s) => (s === da ? a : s)) });

  const righe = await leggiTutte(TABELLE.cicli, {
    filterByFormula: `{Settore} = "${da.replace(/"/g, '\\"')}"`,
  });
  if (righe.length) {
    await aggiornaTante(TABELLE.cicli, righe.map((r) => ({ id: r.id, campi: { Settore: a } })));
  }
  return { rinominati: righe.length };
}

/**
 * Eliminare una colonna non elimina i pensieri: i cicli ancora aperti
 * scivolano in "Da smistare", che è il contrario di perderli. I promossi
 * tengono il nome che avevano: sono storia, non parete.
 */
export async function eliminaSettore(nome) {
  const da = String(nome ?? "").trim();
  const attuali = await leggiSettori();
  await aggiornaProfilo({ settori: attuali.filter((s) => s !== da) });

  const aperti = await leggiTutte(TABELLE.cicli, {
    filterByFormula: `AND({Settore} = "${da.replace(/"/g, '\\"')}", {PromossoIl} = "")`,
  });
  if (aperti.length) {
    await aggiornaTante(TABELLE.cicli, aperti.map((r) => ({ id: r.id, campi: { Settore: null } })));
  }
  return { spostati: aperti.length };
}


/* ----------------------------------------------------------------- catture */

export async function leggiCatture(limite = 20) {
  const righe = await leggiTutte(TABELLE.catture, {
    maxRecords: limite,
    "sort[0][field]": "CreatoIl",
    "sort[0][direction]": "desc",
  });
  return righe.map((r) => ({
    id: r.id,
    titolo: r.Titolo ?? "",
    testo: r.Testo ?? "",
    provenienza: r.Provenienza ?? null,
    destinazione: r.Destinazione ?? null,
    urgenza: r.Urgenza ?? null,
    via: r.ViaClassificazione ?? null,
    creatoIl: r.CreatoIl ?? null,
  }));
}

export async function scriviCattura({ testo, titolo, provenienza, destinazione, urgenza, via }) {
  return crea(TABELLE.catture, {
    Titolo: titolo ?? testo.slice(0, 80),
    Testo: testo,
    Provenienza: provenienza ?? "dashboard",
    Destinazione: destinazione ?? null,
    Urgenza: urgenza ?? null,
    ViaClassificazione: via ?? null,
    CreatoIl: adessoIso(),
  });
}

/* ------------------------------------------------------------ log giornalieri */

const LOG_VUOTO = { abitudini: {}, pasti: [], finanze: null, salute: {} };

function mappaLog(r) {
  return {
    id: r.id,
    data: r.Data,
    abitudini: json(r.Abitudini, {}),
    pasti: json(r.Pasti, []),
    finanze: json(r.Finanze, null),
    salute: json(r.Salute, {}),
  };
}

export async function leggiLog(data = oggi()) {
  const r = await leggiUna(TABELLE.log, `{Data} = "${data}"`);
  return r ? mappaLog(r) : { data, ...LOG_VUOTO };
}

/** Legge i log di un intervallo di date, dalla più vecchia alla più recente. */
export async function leggiLogIntervallo(da, a) {
  const righe = await leggiTutte(TABELLE.log, {
    filterByFormula: `AND({Data} >= "${da}", {Data} <= "${a}")`,
  });
  return righe.map(mappaLog).sort((x, y) => x.data.localeCompare(y.data));
}

/** Aggiorna il log di un giorno, creando la riga se non esiste. */
export async function aggiornaLog(data, patch) {
  const attuale = await leggiLog(data);
  const nuovo = typeof patch === "function" ? patch(attuale) : { ...attuale, ...patch };
  const campi = {
    Data: data,
    Abitudini: JSON.stringify(nuovo.abitudini ?? {}),
    Pasti: JSON.stringify(nuovo.pasti ?? []),
    Finanze: nuovo.finanze ? JSON.stringify(nuovo.finanze) : "",
    Salute: JSON.stringify(nuovo.salute ?? {}),
  };
  if (attuale.id) await aggiorna(TABELLE.log, attuale.id, campi);
  else await crea(TABELLE.log, campi);
  return leggiLog(data);
}

/* ------------------------------------------------------------- allenamenti */

/**
 * Un programma datato non è né un task né un'abitudine.
 *
 * I task vivono a fasce ("oggi", "questa settimana") e non hanno una data
 * vera; le abitudini si ripetono per sempre e non sanno cosa si fa oggi di
 * preciso. Un programma di dodici settimane ha un primo giorno, un ultimo e
 * un contenuto diverso ogni giorno: gli serve una tabella sua.
 */

function mappaAllenamento(r) {
  return {
    id: r.id,
    programma: r.Programma ?? "",
    data: r.Data ?? null,
    giorno: r.Giorno ?? null,
    settimana: r.Settimana ?? null,
    fase: r.Fase ?? "",
    tipo: r.Tipo ?? null,
    // Quale riga della tabella di conversione usare per le versioni corte.
    // Di solito coincide col tipo, ma non sempre: la deduzione sta tutta in
    // lib/modalita.js, qui si legge e basta.
    conversione: r.Conversione ?? null,
    titolo: r.Titolo ?? "",
    dettaglio: r.Dettaglio ?? "",
    target: r.Target ?? "",
    pesata: Boolean(r.Pesata),
    fattoIl: r.FattoIl ?? null,
    modalita: modalitaValida(r.Modalita),
    peso: r.Peso ?? null,
  };
}

/** L'allenamento di un giorno, o null se quel giorno non c'è programma. */
export async function leggiAllenamento(data = oggi()) {
  const r = await leggiUna(TABELLE.allenamenti, `{Data} = "${data}"`);
  return r ? mappaAllenamento(r) : null;
}

/** Gli allenamenti di un intervallo di date, dal più vecchio al più recente. */
export async function leggiAllenamenti(da, a) {
  const righe = await leggiTutte(TABELLE.allenamenti, {
    filterByFormula: `AND({Data} >= "${da}", {Data} <= "${a}")`,
  });
  return righe.map(mappaAllenamento).sort((x, y) => (x.giorno ?? 0) - (y.giorno ?? 0));
}

/**
 * Il programma in corso, già pronto per la scheda: il giorno di oggi, la sua
 * settimana e quanto manca alla fine.
 *
 * Legge la tabella intera in una volta invece di fare tre giri (oggi, la
 * settimana, il conteggio): un programma sono ottantaquattro righe, che stanno
 * in una pagina sola di Airtable. Tre chiamate in fila costerebbero mezzo
 * secondo in più a ogni apertura della dashboard.
 *
 * "In corso" vuol dire che oggi cade fra il primo e l'ultimo giorno. Se un
 * programma deve ancora partire si mostra lo stesso, con il conto dei giorni
 * che mancano: sparire fino al giorno dell'inizio sarebbe il modo più veloce
 * per dimenticarselo.
 */
export async function leggiProgrammaAttivo(data = oggi()) {
  const righe = (await leggiTutte(TABELLE.allenamenti)).map(mappaAllenamento);
  if (!righe.length) return null;

  const perNome = new Map();
  for (const r of righe) {
    if (!perNome.has(r.programma)) perNome.set(r.programma, []);
    perNome.get(r.programma).push(r);
  }

  const programmi = [...perNome.entries()]
    .map(([nome, giorni]) => {
      const ordinati = giorni.sort((a, b) => (a.giorno ?? 0) - (b.giorno ?? 0));
      return {
        nome,
        giorni: ordinati,
        primo: ordinati[0]?.data ?? null,
        ultimo: ordinati[ordinati.length - 1]?.data ?? null,
      };
    })
    .sort((a, b) => String(a.primo).localeCompare(String(b.primo)));

  const scelto =
    programmi.find((p) => p.primo <= data && data <= p.ultimo) ??
    programmi.find((p) => p.primo > data) ??
    programmi[programmi.length - 1];

  const diOggi = scelto.giorni.find((r) => r.data === data) ?? null;
  const numeroSettimana = diOggi?.settimana ?? (data < scelto.primo ? 1 : scelto.giorni[scelto.giorni.length - 1].settimana);
  const settimana = scelto.giorni.filter((r) => r.settimana === numeroSettimana);

  // Tutti i pesi segnati, in ordine: è la curva. Non costa una lettura in più,
  // le righe sono già qui.
  const pesi = scelto.giorni
    .filter((r) => Number.isFinite(r.peso))
    .map((r) => ({ data: r.data, giorno: r.giorno, peso: r.peso }));

  // Le dodici settimane raggruppate: la schermata del programma le vuole tutte,
  // e sono già qui — rileggerle con una seconda chiamata sarebbe mezzo secondo
  // buttato per dati che abbiamo in mano.
  const settimane = [];
  for (const r of scelto.giorni) {
    const n = r.settimana ?? 1;
    let s = settimane.find((x) => x.numero === n);
    if (!s) {
      s = { numero: n, fase: r.fase, target: "", giorni: [] };
      settimane.push(s);
    }
    s.giorni.push(r);
    if (r.target) s.target = r.target;
  }
  for (const s of settimane) s.conteggio = conta(s.giorni);

  return {
    nome: scelto.nome,
    oggi: diOggi,
    settimana,
    settimane,
    conteggio: conta(scelto.giorni),
    numeroSettimana,
    fase: settimana[0]?.fase ?? "",
    target: settimana.find((r) => r.target)?.target ?? "",
    fatti: scelto.giorni.filter((r) => r.fattoIl).length,
    totale: scelto.giorni.length,
    primo: scelto.primo,
    ultimo: scelto.ultimo,
    pesi,
    partenza: pesi[0]?.peso ?? null,
    ultimoPeso: pesi[pesi.length - 1] ?? null,
    stato: data < scelto.primo ? "non iniziato" : data > scelto.ultimo ? "finito" : "in corso",
  };
}

/**
 * La spunta di un giorno.
 *
 * Spuntare un allenamento segna anche l'abitudine "allenamento" del giorno:
 * una spunta sola, così la striscia dei giorni di fila resta vera senza
 * doversi ricordare di cliccare due volte. Il peso, quando c'è, finisce anche
 * nel log della salute, che è il posto dove il resto del sistema lo cerca.
 */
export async function segnaAllenamento(id, { fatto = true, modalita, peso } = {}) {
  // Togliere la spunta azzera anche la modalità: una seduta "non fatta" che si
  // porta dietro un "fatta in emergenza" è una riga che racconta due cose
  // diverse, e il conteggio delle modalità — che è il dato per cui esistono —
  // conterebbe giornate mai fatte.
  const campi = {
    FattoIl: fatto ? adessoIso() : "",
    Modalita: fatto ? (modalitaValida(modalita) ?? "standard") : "",
  };
  if (peso !== undefined && peso !== null && peso !== "") campi.Peso = Number(peso);

  const riga = await aggiorna(TABELLE.allenamenti, id, campi);
  const giorno = riga.Data ?? oggi();

  await aggiornaLog(giorno, (attuale) => ({
    ...attuale,
    abitudini: { ...(attuale.abitudini ?? {}), allenamento: Boolean(fatto) },
    salute: campi.Peso ? { ...(attuale.salute ?? {}), peso: campi.Peso } : attuale.salute,
  }));

  if (fatto) {
    await scriviRegistro(
      "allenamento-fatto",
      `${riga.Titolo ?? id} · ${campi.Modalita}`,
      `allenamento-${giorno}`
    );
  }
  return mappaAllenamento(riga);
}

/**
 * Il peso di un giorno qualsiasi, non solo dei giorni di pesata.
 *
 * Il programma prevede cinque pesate ufficiali, ma il peso vero lo si segue
 * salendo sulla bilancia quando capita: cinque punti in ottantaquattro giorni
 * non fanno una curva, fanno cinque numeri slegati. Il peso vive in due posti
 * per due motivi diversi — sulla riga dell'allenamento perché è lì che lo
 * scrivi, nel log della salute perché è lì che il resto del sistema lo cerca —
 * e questa funzione è l'unico posto che li tiene allineati.
 *
 * Scrivere una stringa vuota cancella: un peso battuto male va potuto togliere,
 * altrimenti resta a sporcare la curva per sempre.
 */
export async function segnaPeso(data, peso) {
  const giorno = data || oggi();
  const cancella = peso === null || peso === "";
  const valore = cancella ? null : leggiNumero(peso);

  if (!cancella && valore === null) {
    throw new Error("Il peso non è un numero.");
  }

  const riga = await leggiUna(TABELLE.allenamenti, `{Data} = "${giorno}"`);
  if (riga) await aggiorna(TABELLE.allenamenti, riga.id, { Peso: valore });

  const log = await aggiornaLog(giorno, (attuale) => {
    const salute = { ...(attuale.salute ?? {}) };
    if (cancella) delete salute.peso;
    else salute.peso = valore;
    return { ...attuale, salute };
  });

  return { data: giorno, peso: valore, salute: log.salute };
}

/* ------------------------------------------------------------------- salute */

/**
 * I numeri che arrivano dall'orologio.
 *
 * Apple non espone Salute su internet: nessun server può andare a prendersi i
 * passi di ieri. L'unica strada vera è il contrario — è il telefono che, una
 * volta al giorno, legge Salute e li spedisce qui. Quindi questa funzione non
 * va MAI a cercare niente: riceve, e basta.
 *
 * Riceve anche più volte lo stesso giorno, perché i passi delle otto di
 * mattina non sono quelli delle undici di sera. L'ultimo invio vince campo per
 * campo: mandare solo i passi non deve cancellare il sonno mandato prima.
 */
/**
 * I limiti di plausibilità, e non sono pignoleria.
 *
 * Comandi Rapidi, quando la variabile punta a un elenco invece che a un
 * numero, incolla i valori uno dietro l'altro: venti passi, ventuno, cinquanta
 * diventano "202150". Il risultato è un numero perfettamente valido — e
 * completamente falso. Se entra, la media dei passi è rovinata per sempre e la
 * scala del grafico schiaccia tutti gli altri giorni a zero, senza che niente
 * segnali un problema.
 *
 * Quindi ogni misura ha un intervallo dentro cui un essere umano può stare.
 * Fuori da lì non si arrotonda e non si indovina: si rifiuta e si dice perché.
 *
 * Il terzo numero è quante cifre dopo la virgola ha senso tenere. Apple
 * restituisce l'energia attiva come 202.1559999999999: non è sbagliato, ma
 * sono tredici cifre di rumore che finiscono nel file di backup e nelle medie.
 * I passi sono passi interi, il peso ha un decimale perché la bilancia ne ha
 * uno. Si arrotonda quando si scrive, una volta sola.
 */
const LIMITI = {
  passi: [0, 200000, 0],
  calorieAttive: [0, 20000, 0],
  esercizioMinuti: [0, 1440, 0],
  inPiediOre: [0, 24, 1],
  distanzaKm: [0, 500, 2],
  frequenzaRiposo: [20, 220, 0],
  hrv: [0, 500, 0],
  sonnoMinuti: [0, 1440, 0],
  vo2max: [5, 90, 1],
  peso: [20, 400, 1],
};

export const CAMPI_SALUTE = Object.keys(LIMITI);

export async function scriviSalute(data, misure) {
  const giorno = data || oggi();
  const puliti = {};
  const scartati = [];
  const vuoti = [];

  for (const campo of CAMPI_SALUTE) {
    const v = misure?.[campo];
    // Un campo che arriva vuoto è la cosa più insidiosa di tutte: in Comandi
    // Rapidi vuol dire che quel blocco non ha trovato niente — il caso classico
    // è la seconda misura agganciata all'uscita della prima, che diventa un
    // "Filtra" e cerca l'esercizio dentro i passi. Qui si tiene il valore di
    // prima, che è giusto (un invio parziale non deve cancellare), ma va DETTO:
    // altrimenti sullo schermo resta il numero di stamattina con l'aria di
    // essere quello di adesso, e non c'è modo di accorgersene.
    if (v === undefined || v === null || v === "") {
      if (campo in (misure ?? {})) vuoti.push(campo);
      continue;
    }
    // Da Comandi Rapidi non arriva mai un numero pulito: un campione di Salute
    // in un campo di testo diventa "3466 conteggio". leggiNumero sa toglierlo.
    const n = leggiNumero(v);
    // Un numero che non è un numero non entra: meglio un campo che manca di un
    // grafico che disegna NaN e non lo dice.
    if (n === null) {
      scartati.push({ campo, arrivato: String(v).slice(0, 60), perche: "non è un numero" });
      continue;
    }

    const [minimo, massimo, decimali] = LIMITI[campo];
    if (n < minimo || n > massimo) {
      scartati.push({
        campo,
        arrivato: String(v).slice(0, 60),
        perche: `fuori dai limiti umani (${minimo} - ${massimo})`,
      });
      continue;
    }

    puliti[campo] = Number(n.toFixed(decimali));
  }

  if (!Object.keys(puliti).length) {
    // L'errore dice cosa è arrivato, non solo che non andava bene: chi sta
    // costruendo un comando sul telefono non ha nessun altro modo di guardarci
    // dentro, e "non leggibile" senza il valore è un vicolo cieco.
    const visti = Object.keys(misure ?? {}).filter((k) => CAMPI_SALUTE.includes(k));
    const errore = new Error("Non è arrivata nessuna misura leggibile.");
    errore.dettagli = {
      campiRiconosciuti: visti,
      scartati,
      // Se non ne ha riconosciuto nemmeno il nome, il problema è un altro:
      // il campo si chiama in un altro modo, o il corpo non è JSON.
      nota: !visti.length
        ? "Nessun nome di campo riconosciuto: controlla come si chiamano nel corpo della richiesta."
        : scartati.every((s) => s.perche.startsWith("fuori"))
          ? "I nomi e i valori sono numeri veri, ma nessuno è plausibile. Di solito vuol dire che la variabile punta all'elenco dei campioni invece che alla loro somma, e Comandi Rapidi li ha incollati uno dietro l'altro."
          : "I nomi dei campi sono giusti, ma i valori non si leggono come numeri.",
    };
    throw errore;
  }

  const log = await aggiornaLog(giorno, (attuale) => ({
    ...attuale,
    salute: {
      ...(attuale.salute ?? {}),
      ...puliti,
      aggiornatoIl: adessoIso(),
      // Cosa portava l'ultimo invio. Serve alla scheda per distinguere un numero
      // appena arrivato da uno rimasto lì da un invio di tre ore fa: con un solo
      // orologio per tutta la riga sembrano freschi tutti e due.
      ultimiCampi: Object.keys(puliti),
    },
  }));

  // Il peso segnato dall'orologio o dalla bilancia deve comparire anche sulla
  // riga dell'allenamento, altrimenti la scheda mostra un peso e il grafico
  // un altro.
  if (puliti.peso !== undefined) {
    const riga = await leggiUna(TABELLE.allenamenti, `{Data} = "${giorno}"`);
    if (riga) await aggiorna(TABELLE.allenamenti, riga.id, { Peso: puliti.peso });
  }

  // Gli scartati si dicono anche quando il resto è andato bene: un invio che
  // risponde "ok" mentre due misure su sei sono finite nel cestino è il modo
  // più veloce per accorgersene fra tre settimane, guardando un grafico bucato.
  return {
    data: giorno,
    salute: log.salute,
    scritti: Object.keys(puliti),
    ...(scartati.length ? { scartati } : {}),
    ...(vuoti.length
      ? {
          vuoti,
          nota: `Questi campi sono arrivati vuoti e il valore di prima è rimasto com'era: ${vuoti.join(", ")}. In Comandi Rapidi di solito vuol dire che quel blocco è agganciato all'uscita di quello sopra ed è diventato un "Filtra": ogni misura vuole il suo "Trova campioni di dati sanitari", con Raggruppa per: Giorno.`,
        }
      : {}),
  };
}

/** La salute di un intervallo di giorni, dal più vecchio al più recente. */
export async function leggiSalute(da, a) {
  const log = await leggiLogIntervallo(da, a);
  return log
    .map((l) => ({ data: l.data, ...(l.salute ?? {}) }))
    .filter((s) => CAMPI_SALUTE.some((c) => s[c] !== undefined));
}

/**
 * Allinea le righe già in tabella al contenuto nuovo del programma.
 *
 * Serve quando il contenuto cambia — un testo riscritto, un campo nuovo — e
 * reimportare non è un'opzione perché cancellerebbe le spunte e i pesi già
 * segnati. Aggancia per numero di giorno, che è l'unica cosa che non cambia
 * mai, e tocca SOLO i campi del contenuto: data, spunta, modalità e peso
 * restano dove sono.
 *
 * Torna l'elenco di cosa ha cambiato, campo per campo. Un aggiornamento
 * silenzioso su ottantaquattro righe è il modo più rapido di non sapere più
 * cosa c'è scritto nel proprio programma. Con `scrivi: false` calcola e basta,
 * così si può guardare cosa succederebbe prima che succeda.
 */
export async function allineaProgramma(righe, { nome, scrivi = true } = {}) {
  const nomeProgramma = nome ?? righe[0]?.programma;
  if (!nomeProgramma) throw new Error("Senza il nome del programma non so quali righe allineare.");

  const esistenti = await leggiTutte(TABELLE.allenamenti, {
    filterByFormula: `{Programma} = "${String(nomeProgramma).replace(/"/g, '\\"')}"`,
  });
  const perGiorno = new Map(esistenti.map((r) => [r.Giorno, r]));

  const CAMPI = [
    ["Titolo", "titolo"],
    ["Dettaglio", "dettaglio"],
    ["Tipo", "tipo"],
    ["Conversione", "conversione"],
    ["Fase", "fase"],
    ["Settimana", "settimana"],
  ];

  const daScrivere = [];
  const cambiamenti = [];

  for (const nuova of righe) {
    const vecchia = perGiorno.get(nuova.giorno);
    if (!vecchia) continue;

    const campi = {};
    for (const [colonna, chiave] of CAMPI) {
      const prima = vecchia[colonna] ?? null;
      const dopo = nuova[chiave] ?? null;
      if (prima !== dopo) {
        campi[colonna] = dopo;
        cambiamenti.push({ giorno: nuova.giorno, campo: colonna, prima, dopo });
      }
    }
    if (Object.keys(campi).length) daScrivere.push({ id: vecchia.id, campi });
  }

  if (scrivi && daScrivere.length) {
    await aggiornaTante(TABELLE.allenamenti, daScrivere);
    await scriviRegistro(
      "programma-allineato",
      `${nomeProgramma}: ${daScrivere.length} righe, ${cambiamenti.length} campi`
    );
  }

  return {
    scritto: Boolean(scrivi),
    trovate: esistenti.length,
    aggiornate: daScrivere.length,
    mancanti: righe.filter((r) => !perGiorno.has(r.giorno)).map((r) => r.giorno),
    cambiamenti,
  };
}

/**
 * Importa un programma intero.
 *
 * Idempotente sul nome: se quel programma è già dentro non lo raddoppia, e
 * chi chiama decide se prima ripulire. Un programma importato due volte
 * significa due schede "oggi" e nessun modo di sapere quale spuntare.
 */
export async function importaProgramma(righe, { sostituisci = false } = {}) {
  const nome = righe[0]?.programma;
  if (!nome) throw new Error("Il programma non ha un nome: senza, non si può reimportare.");

  const esistenti = await leggiTutte(TABELLE.allenamenti, {
    filterByFormula: `{Programma} = "${String(nome).replace(/"/g, '\\"')}"`,
    fields: ["Data"],
  });

  if (esistenti.length && !sostituisci) {
    return { creati: 0, esistenti: esistenti.length, saltato: true };
  }
  for (const r of esistenti) await elimina(TABELLE.allenamenti, r.id);

  const creati = await creaTante(
    TABELLE.allenamenti,
    righe.map((r) => ({
      Titolo: r.titolo,
      Data: r.data,
      Programma: r.programma,
      Giorno: r.giorno,
      Settimana: r.settimana,
      Fase: r.fase,
      Tipo: r.tipo,
      Conversione: r.conversione,
      Dettaglio: r.dettaglio,
      Target: r.target || undefined,
      Pesata: r.pesata,
    }))
  );

  await scriviRegistro("programma-importato", `${nome}: ${creati.length} giorni dal ${righe[0].data}`);
  return { creati: creati.length, esistenti: esistenti.length, saltato: false };
}

/* --------------------------------------------------------------- obiettivi */

/**
 * Quattro orizzonti, non due.
 *
 * La settimana e il mese dicono cosa fai; l'anno e i cinque anni dicono perché.
 * Stanno nella stessa tabella e nella stessa scheda apposta: una meta a cinque
 * anni scritta in un file che apri due volte l'anno non è una meta, è un
 * ricordo. Qui la rivedi ogni volta che apri la dashboard.
 */
export const PERIODI = ["settimana", "mese", "anno", "annoProssimo", "5anni"];

export async function leggiObiettivi() {
  const righe = await leggiTutte(TABELLE.obiettivi);
  const mappa = (r) => ({
    id: r.id,
    nome: r.Nome ?? "",
    periodo: PERIODI.includes(r.Periodo) ? r.Periodo : "settimana",
    fatto: Boolean(r.Fatto),
    progresso: r.Progresso ?? null,
    // Un obiettivo con un target è una misura, non una casella: "arrivare a 200
    // clienti" spuntato a metà anno non dice se sei a metà strada o fermo.
    valore: typeof r.Valore === "number" ? r.Valore : null,
    target: typeof r.Target === "number" ? r.Target : null,
    posizione: r.Posizione ?? 0,
  });
  const tutti = righe.map(mappa).sort((a, b) => a.posizione - b.posizione);
  return Object.fromEntries(PERIODI.map((p) => [p, tutti.filter((o) => o.periodo === p)]));
}

export async function creaObiettivo({ nome, periodo, progresso, valore, target }) {
  return crea(TABELLE.obiettivi, {
    Nome: nome,
    Periodo: PERIODI.includes(periodo) ? periodo : "settimana",
    Progresso: progresso ?? "",
    Valore: Number.isFinite(Number(valore)) ? Number(valore) : undefined,
    Target: Number.isFinite(Number(target)) ? Number(target) : undefined,
    Posizione: Date.now() % 100000,
    CreatoIl: adessoIso(),
  });
}

export async function aggiornaObiettivo(id, patch) {
  const campi = {};
  if (patch.nome !== undefined) campi.Nome = patch.nome;
  if (patch.fatto !== undefined) campi.Fatto = patch.fatto;
  if (patch.progresso !== undefined) campi.Progresso = patch.progresso;
  // Svuotare una misura e non averla mai messa sono due gesti diversi: il primo
  // deve arrivare come null, non sparire dalla patch.
  if (patch.valore !== undefined) campi.Valore = patch.valore === null ? null : Number(patch.valore);
  if (patch.target !== undefined) campi.Target = patch.target === null ? null : Number(patch.target);
  if (patch.periodo !== undefined && PERIODI.includes(patch.periodo)) campi.Periodo = patch.periodo;
  return aggiorna(TABELLE.obiettivi, id, campi);
}

export async function eliminaObiettivo(id) {
  return elimina(TABELLE.obiettivi, id);
}

/* -------------------------------------------------------------- formazione */

/**
 * Le sessioni di studio.
 *
 * Una riga per sessione, non per corso: il corso è un obiettivo e vive fra gli
 * obiettivi, con il suo traguardo; qui c'è il tempo che ci hai messo davvero,
 * che è l'unica cosa che dice se ti stai formando o se te lo stai raccontando.
 *
 * Non c'è nessuna spunta "finito": una sessione fatta è fatta. Le abitudini si
 * azzerano, le promesse si chiudono, il tempo passato no.
 */
export async function leggiFormazione(da, a) {
  const righe = await leggiTutte(TABELLE.formazione, {
    filterByFormula: `AND(IS_AFTER({Data}, "${da}"), IS_BEFORE({Data}, "${a}"))`,
    "sort[0][field]": "Data",
    "sort[0][direction]": "desc",
  });
  return righe.map((r) => ({
    id: r.id,
    titolo: r.Titolo ?? "",
    tipo: r.Tipo ?? null,
    minuti: Number(r.Minuti) || 0,
    data: r.Data ? String(r.Data).slice(0, 10) : null,
    fonte: r.Fonte ?? "",
    note: r.Note ?? "",
  }));
}

export async function creaFormazione({ titolo, tipo, minuti, data, fonte, note }) {
  const quanti = leggiNumero(minuti);
  if (!String(titolo ?? "").trim()) throw new Error("Manca il titolo.");
  if (quanti === null || quanti <= 0 || quanti > 1440) {
    throw new Error("I minuti devono essere un numero fra 1 e 1440.");
  }
  return crea(TABELLE.formazione, {
    Titolo: String(titolo).trim(),
    Tipo: tipo || undefined,
    Minuti: Math.round(quanti),
    Data: data || oggi(),
    Fonte: fonte ?? "",
    Note: note ?? "",
    CreatoIl: adessoIso(),
  });
}

export async function eliminaFormazione(id) {
  return elimina(TABELLE.formazione, id);
}

/* ----------------------------------------------------------------- memoria */

export async function leggiMemoria(limite = 300) {
  const righe = await leggiTutte(TABELLE.memoria, {
    maxRecords: limite,
    "sort[0][field]": "CreatoIl",
    "sort[0][direction]": "desc",
  });
  return righe.map((r) => ({
    id: r.id,
    testo: r.Testo ?? "",
    provenienza: r.Provenienza ?? null,
    origine: r.Origine ?? null,
    creatoIl: r.CreatoIl ?? null,
  }));
}

export async function scriviMemoria({ testo, provenienza, origine }) {
  return crea(TABELLE.memoria, {
    Testo: testo,
    Provenienza: provenienza ?? "cattura",
    Origine: origine ?? "",
    CreatoIl: adessoIso(),
  });
}

/* ---------------------------------------------------------------- registro */

export async function scriviRegistro(evento, dettaglio, chiave) {
  return crea(TABELLE.registro, {
    Evento: evento,
    Dettaglio: typeof dettaglio === "string" ? dettaglio : JSON.stringify(dettaglio ?? {}),
    Chiave: chiave ?? "",
    QuandoIl: adessoIso(),
  });
}

/** Serve a non rifare un lavoro già fatto: il briefing di oggi, per esempio. */
export async function registroHa(chiave) {
  const r = await leggiUna(TABELLE.registro, `{Chiave} = "${chiave}"`);
  return Boolean(r);
}

export async function leggiRegistro(limite = 200) {
  const righe = await leggiTutte(TABELLE.registro, {
    maxRecords: limite,
    "sort[0][field]": "QuandoIl",
    "sort[0][direction]": "desc",
  });
  return righe.map((r) => ({
    id: r.id,
    evento: r.Evento ?? "",
    dettaglio: r.Dettaglio ?? "",
    chiave: r.Chiave ?? "",
    quandoIl: r.QuandoIl ?? null,
  }));
}
