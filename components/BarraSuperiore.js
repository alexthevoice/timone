"use client";

import { useEffect, useState } from "react";
import { NOME } from "@/lib/app";
import { useOrologio } from "@/lib/useOrologio";
import { ULTIMA_MODIFICA, VERSIONE } from "@/lib/versione";

/**
 * La barra in cima, col menu a panino.
 *
 * Le schermate non stanno più in fila nella barra: si aprono dalle tre
 * barrette in alto a sinistra, come sugli altri strumenti di casa. La barra
 * tiene solo quello che serve a colpo d'occhio: dove sei, se i dati
 * arrivano, la versione e l'ora.
 */
const SCHERMATE = [
  { id: "home", nome: "Home" },
  { id: "cicli", nome: "Cicli Aperti" },
  { id: "quadranti", nome: "Quadranti" },
  { id: "allenamento", nome: "Allenamento" },
  { id: "crm", nome: "CRM" },
  { id: "finanze", nome: "Finanze" },
  { id: "review", nome: "Review" },
];

export default function BarraSuperiore({ schermata, onSchermata, errore }) {
  // L'orologio parte solo sul browser: se lo disegnasse anche il server,
  // i due orari non coinciderebbero e React protesterebbe.
  const { ora } = useOrologio();
  const [aperto, setAperto] = useState(false);

  // Escape chiude il menu, come qualsiasi altra cosa aperta.
  useEffect(() => {
    if (!aperto) return;
    const chiudi = (e) => e.key === "Escape" && setAperto(false);
    window.addEventListener("keydown", chiudi);
    return () => window.removeEventListener("keydown", chiudi);
  }, [aperto]);

  const vai = (id) => {
    onSchermata(id);
    setAperto(false);
  };

  const attuale = [...SCHERMATE, { id: "config", nome: "Config" }].find((s) => s.id === schermata);

  return (
    <>
      <header className="topbar">
        <button
          className="panino"
          aria-label="Apri il menu"
          aria-expanded={aperto}
          onClick={() => setAperto((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>

        <div className="brand">
          <span className="dot" /> {NOME}
          {attuale && attuale.id !== "home" ? <span className="dove"> · {attuale.nome}</span> : null}
        </div>

        <div className="spacer" />

        <div className="meta">
          {errore ? (
            <span
              className="pill"
              title={errore}
              style={{ background: "var(--bad-soft)", color: "var(--bad)" }}
            >
              <span className="dot" style={{ background: "currentColor" }} /> dati non raggiungibili
            </span>
          ) : (
            <span className="pill live">
              <span className="dot" /> in linea
            </span>
          )}
          <a
            className="pill"
            href="/api/admin/export"
            title="Scarica tutto quello che il sistema sa di te, in un file solo"
            style={{ textDecoration: "none" }}
          >
            backup
          </a>
          {/* Prima dell'ora: è il posto dove l'occhio passa comunque, e serve a
              capire in un attimo se questa scheda è vecchia di due giorni. */}
          <span className="versione num" title={`Ultimo giro: ${ULTIMA_MODIFICA}`}>
            {VERSIONE}
          </span>
          <span className="num">{ora ?? "--:--"}</span>
        </div>
      </header>

      {aperto && (
        <>
          <div className="drawer-sfondo" onClick={() => setAperto(false)} />
          <nav className="drawer">
            {SCHERMATE.map((s) => (
              <button key={s.id} aria-current={schermata === s.id} onClick={() => vai(s.id)}>
                {s.nome}
              </button>
            ))}
            <div className="riga-divisoria" />
            <button aria-current={schermata === "config"} onClick={() => vai("config")}>
              Config
            </button>
          </nav>
        </>
      )}
    </>
  );
}
