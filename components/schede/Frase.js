"use client";

import { fraseDelGiorno } from "@/lib/frasi";

/**
 * La frase del giorno.
 *
 * Sta in Home, larga, sopra le cose da fare: è l'unica riga della dashboard che
 * non chiede niente e non misura niente. Ha senso proprio perché è l'unica —
 * due frasi motivazionali diventano decorazione, e la decorazione si smette di
 * leggerla dopo tre giorni.
 *
 * La data la dà il server (`oggiIso`), non `new Date()`: alle 23:50 il fuso del
 * server direbbe già domani, e la frase cambierebbe mentre la stai leggendo.
 */
export default function Frase({ oggiIso }) {
  const { testo, autore } = fraseDelGiorno(oggiIso);

  return (
    <section className="card col-12" id="card-frase">
      <div className="body frase">
        <p className="testo">{testo}</p>
        <p className="autore">{autore}</p>
      </div>
    </section>
  );
}
