/**
 * Cosa conta come "fermo", in un posto solo.
 *
 * La scheda "Cosa è fermo" in Home e gli "slittati" della Review usano questa
 * stessa regola: prima erano due copie, e la Review aveva già perso per strada
 * la fascia "ritardo" — un task messo lì a mano compariva in Home e spariva
 * dalla Review. Due definizioni della stessa parola sono due verità diverse.
 *
 * Dieci giorni non è un numero sacro: è la distanza oltre la quale una cosa
 * che volevi fare "questa settimana" ha già saltato una settimana intera.
 */
export const FERMO_DA_GIORNI = 10;

/** Il task deve già avere `giorni` (l'età dalla creazione) addosso. */
export function eFermo(t, giorno) {
  return (
    t.fascia === "ritardo" ||
    (t.scadenza && t.scadenza < giorno) ||
    (t.giorni ?? 0) >= FERMO_DA_GIORNI
  );
}
