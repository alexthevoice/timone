"use client";

import { useState } from "react";
import { postJson } from "@/lib/useDati";
import { giorniDaIso } from "@/lib/giorni";
import { num } from "@/lib/numeri";

/**
 * La formazione, misurata in tempo.
 *
 * Il corso è un obiettivo e sta fra gli obiettivi, con il suo traguardo. Qui
 * c'è l'unica cosa che dice se ti stai formando davvero: i minuti che ci hai
 * messo questa settimana. "Fare un corso" spuntato a dicembre non distingue chi
 * ha studiato tutto l'anno da chi ha guardato tre video il 28.
 *
 * La settimana e non il giorno: studiare non è un'abitudine quotidiana, e una
 * striscia di giorni qui produrrebbe solo sensi di colpa il martedì. Sette
 * giorni sono abbastanza perché una giornata storta non conti, e abbastanza
 * pochi perché non si possa rimandare a settembre.
 */
const TIPI = ["corso", "libro", "podcast", "video", "articolo", "evento", "pratica"];

/** Le ore scritte come si leggono: 95 minuti diventano "1h 35". */
function oreMinuti(minuti) {
  const m = Math.max(0, Math.round(minuti));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}`;
}

export default function Formazione({ sessioni = [], obiettivoSettimana = 150, oggiIso, ricarica }) {
  const [aperto, setAperto] = useState(false);
  const [titolo, setTitolo] = useState("");
  const [minuti, setMinuti] = useState("");
  const [tipo, setTipo] = useState("corso");
  const [errore, setErrore] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const giorni = (s) => giorniDaIso(s.data, oggiIso);
  const settimana = sessioni.filter((s) => (giorni(s) ?? 999) < 7);
  const settimanaPrima = sessioni.filter((s) => {
    const g = giorni(s) ?? 999;
    return g >= 7 && g < 14;
  });

  const somma = (righe) => righe.reduce((t, s) => t + (Number(s.minuti) || 0), 0);
  const fatti = somma(settimana);
  const prima = somma(settimanaPrima);
  const quota = obiettivoSettimana > 0 ? Math.min(100, (fatti / obiettivoSettimana) * 100) : 0;

  const salva = async () => {
    const nome = titolo.trim();
    if (!nome || salvando) return;
    setSalvando(true);
    setErrore(null);
    try {
      await postJson("/api/formazione", { titolo: nome, tipo, minuti, data: oggiIso });
      setTitolo("");
      setMinuti("");
      await ricarica();
    } catch (e) {
      setErrore(e.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <section className="card col-4" id="card-formazione">
      <header>
        <h2>Formazione</h2>
        <div className="spacer" />
        <button
          className="piu"
          aria-pressed={aperto}
          title={aperto ? "Chiudi" : "Segna una sessione"}
          onClick={() => setAperto((v) => !v)}
        >
          {aperto ? "×" : "+"}
        </button>
      </header>

      <div className="body">
        {aperto && (
          <div className="nuovo">
            <input
              className="titolo"
              autoFocus
              value={titolo}
              onChange={(e) => setTitolo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") salva();
                if (e.key === "Escape") setAperto(false);
              }}
              placeholder="Cosa hai studiato?"
            />
            <div className="riga2">
              <input
                className="etichetta"
                inputMode="numeric"
                value={minuti}
                onChange={(e) => setMinuti(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && salva()}
                placeholder="minuti"
              />
              <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                {TIPI.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <button className="btn primary" onClick={salva} disabled={!titolo.trim() || salvando}>
                {salvando ? "…" : "Segna"}
              </button>
            </div>
            {errore && <div className="gate-err">{errore}</div>}
          </div>
        )}

        <div className="form-cifra">
          <span className="v num">{oreMinuti(fatti)}</span>
          <span className="su">
            su {oreMinuti(obiettivoSettimana)} questa settimana
          </span>
        </div>
        <div className="kbar">
          <i style={{ width: `${Math.max(2, quota)}%`, background: fatti >= obiettivoSettimana ? "var(--ok)" : "var(--accent)" }} />
        </div>
        <div className="form-sotto">
          {prima > 0
            ? `la settimana prima ${oreMinuti(prima)}`
            : "la settimana prima non avevi segnato niente"}
          {settimana.length > 0 && ` · ${settimana.length} ${settimana.length === 1 ? "sessione" : "sessioni"}`}
        </div>

        {sessioni.length > 0 && (
          <div className="form-lista">
            {sessioni.slice(0, 4).map((s) => (
              <div className="riga" key={s.id}>
                <span className="quando num">
                  {s.data ? s.data.slice(8, 10) + "/" + s.data.slice(5, 7) : "—"}
                </span>
                <span className="t">{s.titolo}</span>
                {s.tipo && <span className="tag">{s.tipo}</span>}
                <span className="min num">{num(s.minuti)}′</span>
              </div>
            ))}
          </div>
        )}

        {sessioni.length === 0 && !aperto && (
          <div className="form-sotto" style={{ marginTop: 12, lineHeight: 1.5 }}>
            Ancora niente segnato. Col <b>+</b> qui sopra: cosa hai studiato, quanti minuti, che
            tipo. Vale anche mezz'ora di manuale di una finanziaria: se è tempo speso a capire, è
            formazione.
          </div>
        )}
      </div>
    </section>
  );
}
