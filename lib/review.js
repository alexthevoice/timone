/**
 * La settimana che si chiude, con i dati veri.
 *
 * Prima questa schermata era tutta inventata: numeri scritti a mano, con in
 * cima un riquadro che lo dichiarava. Una review finta è peggio di nessuna
 * review — si guarda per tre giorni, poi si impara a non guardarla, e quando
 * arrivano i dati veri non la si riapre più.
 *
 * La finestra è la settimana **di calendario**, lunedì-domenica, e non gli
 * ultimi sette giorni: una review serve a chiudere qualcosa, e "gli ultimi
 * sette giorni" non si chiudono mai. Il confronto è con la settimana prima,
 * perché un numero da solo non dice se sta andando bene.
 *
 * Qui non si scrive niente e non si chiama nessun modello: si legge quello che
 * le altre schede hanno già scritto.
 */
import { giorniDa, oggi, settimanaDi } from "@/lib/data";
import { eFermo } from "@/lib/fermo";
import { leggiFormazione, leggiLogIntervallo, leggiPersone, leggiProfilo, leggiTask } from "@/lib/store";

const settimanaPrimaDi = (giorni) => {
  const lunedi = new Date(`${giorni[0]}T12:00:00Z`);
  lunedi.setUTCDate(lunedi.getUTCDate() - 7);
  return settimanaDi(lunedi.toISOString().slice(0, 10));
};

/** Il giorno locale di un momento salvato in ISO. */
const giornoDi = (iso) => (iso ? String(iso).slice(0, 10) : null);

export async function leggiReview(giorno = oggi()) {
  const questa = settimanaDi(giorno);
  const prima = settimanaPrimaDi(questa);
  const dentro = (data, sette) => data && data >= sette[0] && data <= sette[6];

  const [task, persone, log, formazione, profilo] = await Promise.all([
    leggiTask({ includiCompletati: true }),
    leggiPersone(),
    leggiLogIntervallo(prima[0], questa[6]),
    leggiFormazione(prima[0], questa[6]),
    leggiProfilo(),
  ]);

  const chiusiIn = (sette) =>
    task.filter((t) => dentro(giornoDi(t.completatoIl), sette));
  const apertiIn = (sette) => task.filter((t) => dentro(giornoDi(t.creatoIl), sette));

  const chiusi = chiusiIn(questa);
  const aperti = apertiIn(questa);

  // Le abitudini della settimana: la media dei giorni, contando solo quelli
  // già passati. Includere i giorni che devono ancora arrivare vorrebbe dire
  // che il lunedì la settimana è sempre al quattordici per cento.
  const abitudini = profilo.abitudini ?? [];
  const quotaGiorno = (riga) => {
    if (!abitudini.length) return null;
    const stato = riga?.abitudini ?? {};
    const somma = abitudini.reduce((s, a) => {
      if (a.tipo === "contatore") {
        const obiettivo = Number(a.obiettivo) || 1;
        return s + Math.min(1, (Number(stato[a.id]) || 0) / obiettivo);
      }
      return s + (stato[a.id] ? 1 : 0);
    }, 0);
    return somma / abitudini.length;
  };

  const mediaAbitudini = (sette) => {
    const passati = sette.filter((d) => d <= giorno);
    if (!passati.length) return null;
    const quote = passati
      .map((d) => quotaGiorno(log.find((l) => l.data === d)))
      .filter((q) => q !== null);
    if (!quote.length) return null;
    return Math.round((quote.reduce((s, q) => s + q, 0) / quote.length) * 100);
  };

  const minutiIn = (sette) =>
    formazione.filter((f) => dentro(f.data, sette)).reduce((s, f) => s + (f.minuti || 0), 0);

  // Cosa è slittato: la stessa regola della scheda "Cosa è fermo" in Home,
  // presa da lib/fermo.js. Non una copia: due definizioni diverse della stessa
  // cosa, in due schermate, sarebbero due verità diverse.
  const aperte = task.filter((t) => !t.completatoIl);
  const slittati = aperte
    .map((t) => ({ ...t, giorni: giorniDa(t.creatoIl) ?? 0 }))
    .filter((t) => eFermo(t, giorno))
    .sort((a, b) => b.giorni - a.giorni)
    .slice(0, 6);

  // La settimana che arriva: quello che scade nei prossimi sette giorni, per
  // priorità. Non un consiglio inventato — le tre cose sono già scritte nelle
  // scadenze, basta leggerle.
  const prossima = settimanaDi(
    new Date(new Date(`${questa[6]}T12:00:00Z`).getTime() + 86400000).toISOString().slice(0, 10)
  );
  const inArrivo = aperte
    .filter((t) => t.scadenza && t.scadenza >= giorno && t.scadenza <= prossima[6])
    .sort(
      (a, b) =>
        (a.priorita ?? a.prioritaProposta ?? 5) - (b.priorita ?? b.prioritaProposta ?? 5) ||
        String(a.scadenza).localeCompare(String(b.scadenza))
    )
    .slice(0, 3);

  const silenzio = persone
    .map((p) => ({
      nome: p.nome,
      organizzazione: p.organizzazione,
      giorni: p.ultimoContatto ? giorniDa(p.ultimoContatto) : null,
    }))
    .filter((p) => p.nome)
    .sort((a, b) => (b.giorni ?? 99999) - (a.giorni ?? 99999))
    .slice(0, 5);

  return {
    settimana: { dal: questa[0], al: questa[6] },
    numeri: {
      chiusi: { ora: chiusi.length, prima: chiusiIn(prima).length },
      aperti: { ora: aperti.length, prima: apertiIn(prima).length },
      abitudini: { ora: mediaAbitudini(questa), prima: mediaAbitudini(prima) },
      formazione: { ora: minutiIn(questa), prima: minutiIn(prima) },
    },
    chiusi: chiusi
      .sort((a, b) => String(b.completatoIl).localeCompare(String(a.completatoIl)))
      .slice(0, 8)
      .map((t) => ({ id: t.id, titolo: t.titolo, persone: t.persone ?? [], quando: giornoDi(t.completatoIl) })),
    slittati: slittati.map((t) => ({
      id: t.id,
      titolo: t.titolo,
      giorni: t.giorni,
      scadenza: t.scadenza,
      temperatura: t.temperatura,
    })),
    silenzio,
    inArrivo: inArrivo.map((t) => ({
      id: t.id,
      titolo: t.titolo,
      scadenza: t.scadenza,
      priorita: t.priorita ?? t.prioritaProposta,
      persone: t.persone ?? [],
    })),
  };
}
