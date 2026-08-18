/**
 * Dove atterra una cattura smistata.
 *
 * Questo pezzo esisteva in due copie, una nella rotta di cattura e una nel
 * webhook di Telegram, e le due copie avevano già cominciato a divergere: il
 * webhook buttava via quadrante, priorità e scadenza decisi dal modello, e la
 * destinazione "finanze" non atterrava da nessuna parte mentre la risposta
 * diceva "nelle finanze". Una copia sola, e tutte le vie dicono la verità.
 *
 * "Finanze" non ha una scheda sua da scrivere: la schermata Finanze è in sola
 * lettura dall'app di casa. Una cattura finanze diventa una cosa da fare con
 * l'etichetta `finanze`, che è dove la ritrovi davvero.
 */

import { creaObiettivo, creaTask, segnaContatto, trovaOCreaPersona } from "@/lib/store";

/** Se la destinazione ha una scheda dedicata, ci scrive dentro. */
export async function scriviNellaScheda(esito, testo) {
  if (["task", "persone", "finanze"].includes(esito.destinazione)) {
    const creato = await creaTask({
      titolo: esito.titolo,
      nota: testo === esito.titolo ? "" : testo,
      fascia: esito.urgenza,
      temperatura: esito.urgenza === "oggi" ? "hot" : "warm",
      persona: esito.persona,
      tag: esito.destinazione === "finanze" ? ["finanze"] : undefined,
      quadrante: esito.quadrante,
      priorita: esito.priorita,
      scadenza: esito.scadenza,
    });

    // Segnare il contatto è utile alla review ("chi non senti da troppo"), ma
    // non è il motivo per cui stai aspettando: parte e non lo aspettiamo.
    if (esito.persona) {
      trovaOCreaPersona(esito.persona)
        .then(segnaContatto)
        .catch((e) => console.error("[cattura] ultimo contatto non aggiornato:", e.message));
    }
    return creato;
  }

  if (esito.destinazione === "obiettivi") {
    return creaObiettivo({ nome: esito.titolo, periodo: esito.periodo ?? "settimana" });
  }

  return null;
}
