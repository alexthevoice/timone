"use client";

import { useState } from "react";
import { postJson } from "@/lib/useDati";
import { giorniDaIso } from "@/lib/giorni";

/**
 * Chi non senti da troppo.
 *
 * L'anagrafica ha da sempre un campo "ultimo contatto" che nessuna schermata
 * guardava, quindi nessuno lo aggiornava, quindi non serviva a niente: il giro
 * completo. Qui invece è l'unica cosa che conta — i nomi in cima sono quelli
 * che stai perdendo per silenzio, non per incapacità.
 *
 * Chi non l'hai mai segnato viene per primo: "mai" è un'informazione, non un
 * buco. E il pulsante scrive la data di oggi, che è l'unico modo perché quel
 * campo resti vero senza aprire Airtable.
 */
const QUANTI = 6;

export default function Persone({ persone = [], oggiIso, ricarica }) {
  const [lavoro, setLavoro] = useState(null);

  const ordinate = [...persone]
    .filter((p) => p.nomeCompleto || p.nome)
    .map((p) => ({ ...p, giorni: giorniDaIso(p.ultimoContatto, oggiIso) }))
    .sort((a, b) => {
      if (a.giorni === null && b.giorni === null) return (a.nomeCompleto || a.nome).localeCompare(b.nomeCompleto || b.nome, "it");
      if (a.giorni === null) return -1;
      if (b.giorni === null) return 1;
      return b.giorni - a.giorni;
    })
    .slice(0, QUANTI);

  const sentito = async (p) => {
    setLavoro(p.id);
    try {
      await postJson(`/api/persone/${p.id}`, { sentitoOggi: true }, "PATCH");
      await ricarica();
    } finally {
      setLavoro(null);
    }
  };

  return (
    <section className="card col-4" id="card-persone">
      <header>
        <h2>Chi non senti da troppo</h2>
        <div className="spacer" />
        <span className="hint">{persone.length} in rubrica</span>
      </header>
      <div className="body">
        {ordinate.length === 0 ? (
          <div style={{ color: "var(--text-faint)", fontSize: 13, lineHeight: 1.5 }}>
            La rubrica è vuota. Si riempie da sola: scrivi un nome nella casella Persona di una
            cosa da fare e quella persona nasce qui.
          </div>
        ) : (
          <div className="rubrica">
            {ordinate.map((p) => (
              <div className="riga" key={p.id}>
                <span className="nome">{p.nomeCompleto || p.nome}</span>
                {p.organizzazione && <span className="org">{p.organizzazione}</span>}
                <span className={`da num ${p.giorni === null || p.giorni > 60 ? "neg" : ""}`}>
                  {p.giorni === null ? "mai" : p.giorni === 0 ? "oggi" : `${p.giorni} g`}
                </span>
                <button className="mini" disabled={lavoro === p.id} onClick={() => sentito(p)}>
                  {lavoro === p.id ? "…" : "sentito"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
