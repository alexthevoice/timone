/**
 * La versione del programma.
 *
 * Il numero dopo l'1 non è un numero di rilascio nel senso classico: conta i
 * giri di lavoro fatti su questa dashboard, uno per ogni tornata di modifiche.
 * Serve a una cosa sola e concreta — guardare lo schermo e sapere se quello
 * che stai vedendo è già la versione con le ultime modifiche o è la pagina di
 * prima rimasta aperta in un'altra scheda.
 *
 * REGOLA: a ogni tornata di modifiche si alza di uno, e si aggiunge una riga
 * allo storico qui sotto. Un numero che si alza senza dire cosa è cambiato
 * dopo tre mesi non serve più a niente.
 *
 * Compare in due posti: in alto a destra nella barra, e sulla schermata di
 * accesso — dove serve di più, perché è l'unico punto in cui si guarda lo
 * schermo prima che i dati siano caricati.
 */

export const GIRO = 2;

export const VERSIONE = `v1.${String(GIRO).padStart(3, "0")}`;

/** Cosa è cambiato a ogni giro, dal più recente. Una riga per giro. */
export const STORICO = [
  [2, "Il conteggio dei giorni del programma si legge dai dati, non più cablato a 84"],
  [1, "Il kit appena aperto: la dashboard com'è arrivata, prima delle tue modifiche"],
];

export const ULTIMA_MODIFICA = STORICO[0][1];
