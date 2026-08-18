"use client";

import { useState } from "react";

/**
 * Il prompt pronto, dove serve.
 *
 * Un riquadro discreto con un bottone solo: Copia. L'utente lo incolla alla
 * sua intelligenza artificiale (quella che usa già) e torna qui col blocco
 * generato, o con la procedura fatta. Il testo si può anche aprire e
 * leggere, per chi vuole sapere cosa sta incollando.
 */
export default function PromptPronto({ titolo, testo }) {
  const [copiato, setCopiato] = useState(false);
  const [aperto, setAperto] = useState(false);

  const copia = async () => {
    try {
      await navigator.clipboard.writeText(testo);
    } catch {
      // Niente permesso appunti: si apre il testo e lo si copia a mano.
      setAperto(true);
    }
    setCopiato(true);
    setTimeout(() => setCopiato(false), 2500);
  };

  return (
    <div className="prompt-pronto">
      <div className="testa">
        <span className="tit">{titolo}</span>
        <button className="mini" onClick={() => setAperto((v) => !v)}>
          {aperto ? "nascondi" : "leggi"}
        </button>
        <button className="copia" onClick={copia}>
          {copiato ? "Copiato ✓" : "Copia il prompt"}
        </button>
      </div>
      <div className="sotto">
        Incollalo alla tua AI (Claude, ChatGPT, Gemini, quella che usi), rispondi
        alle sue domande, e torna qui.
      </div>
      {aperto && <pre className="testo">{testo}</pre>}
    </div>
  );
}
