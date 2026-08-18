/**
 * Il registro dei moduli: cosa può accendersi e spegnersi, in un posto solo.
 *
 * Un modulo è una schermata del menu, una o più schede della Home, o tutte e
 * due le cose. Il menu e la Home si disegnano leggendo questo elenco filtrato
 * dalla configurazione dell'utente (Profilo, campo Interfaccia): spegnere un
 * modulo qui non cancella nessun dato, toglie solo la vista.
 *
 * Il cuore non è un modulo e non si spegne: la cattura, i task, gli
 * obiettivi, le abitudini e Config sono il motivo per cui la dashboard
 * esiste. File senza dipendenze apposta: lo leggono server e browser.
 */

export const MODULI = [
  { id: "cicli", nome: "Cicli Aperti", schermata: true, schede: [] },
  { id: "quadranti", nome: "Quadranti", schermata: true, schede: [] },
  { id: "allenamento", nome: "Allenamento", schermata: true, schede: ["allenamento"] },
  { id: "crm", nome: "CRM", schermata: true, schede: ["persone"] },
  { id: "review", nome: "Review", schermata: true, schede: [] },
  { id: "calendario", nome: "Calendario", schermata: false, schede: ["calendario"] },
  { id: "salute", nome: "Salute", schermata: false, schede: ["salute"] },
  { id: "formazione", nome: "Formazione", schermata: false, schede: ["formazione"] },
];

/** Le schede della Home: quelle senza `modulo` sono il cuore, sempre in casa. */
export const SCHEDE_HOME = [
  { id: "adesso", nome: "Adesso" },
  { id: "dafare", nome: "Da fare" },
  { id: "abitudini", nome: "Abitudini" },
  { id: "frase", nome: "La frase del giorno" },
  { id: "obiettivi", nome: "Obiettivi" },
  { id: "formazione", nome: "Formazione", modulo: "formazione" },
  { id: "calendario", nome: "Calendario", modulo: "calendario" },
  { id: "persone", nome: "Chi non senti da troppo", modulo: "crm" },
  { id: "allenamento", nome: "Allenamento", modulo: "allenamento" },
  { id: "salute", nome: "Salute", modulo: "salute" },
  { id: "blocchi", nome: "Cosa è fermo" },
  { id: "catture", nome: "Ultime cose buttate dentro" },
];

/** Gli schemi colore curati. Ogni schema ha la sua versione chiara e scura nel CSS. */
export const SCHEMI = [
  { id: "navy", nome: "Navy e ambra", pallini: ["#133256", "#E8A838"] },
  { id: "grafite", nome: "Grafite", pallini: ["#1C1F26", "#4C9AFF"] },
  { id: "bosco", nome: "Bosco", pallini: ["#1D3B2A", "#D9A441"] },
  { id: "carta", nome: "Carta", pallini: ["#4A3F35", "#C96F4A"] },
];

export const INTERFACCIA_PREDEFINITA = {
  moduli: Object.fromEntries(MODULI.map((m) => [m.id, true])),
  menu: MODULI.filter((m) => m.schermata).map((m) => m.id),
  home: SCHEDE_HOME.map((s) => s.id),
  tema: { schema: "navy" },
};

/**
 * La configurazione salvata può essere vecchia, parziale o sporca: qui si
 * completa coi predefiniti, si buttano gli id che non esistono più e si
 * aggiunge in coda quello che è nato dopo. Così un campo scritto sei mesi fa
 * non rompe mai la Home di oggi.
 */
export function normalizzaInterfaccia(grezza) {
  const base = INTERFACCIA_PREDEFINITA;
  const g = grezza && typeof grezza === "object" ? grezza : {};

  const moduli = { ...base.moduli };
  for (const [id, attivo] of Object.entries(g.moduli ?? {})) {
    if (id in moduli) moduli[id] = Boolean(attivo);
  }

  const pulisci = (lista, valide) => {
    const buone = (Array.isArray(lista) ? lista : []).filter((id) => valide.includes(id));
    return [...buone, ...valide.filter((id) => !buone.includes(id))];
  };

  return {
    moduli,
    menu: pulisci(g.menu, base.menu),
    home: pulisci(g.home, base.home),
    tema: { schema: SCHEMI.some((s) => s.id === g.tema?.schema) ? g.tema.schema : "navy" },
  };
}

/** Una scheda della Home si vede se il suo modulo è acceso (o se è cuore). */
export function schedaVisibile(id, interfaccia) {
  const scheda = SCHEDE_HOME.find((s) => s.id === id);
  if (!scheda) return false;
  return !scheda.modulo || interfaccia.moduli[scheda.modulo] !== false;
}
