"use client";

import { useEffect, useState } from "react";
import { NOME } from "@/lib/app";
import { MODULI } from "@/lib/moduli";
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
/** Il menu si costruisce dai moduli accesi, nell'ordine scelto dall'utente. */
function vociMenu(interfaccia) {
  const voci = [{ id: "home", nome: "Home" }];
  for (const id of interfaccia?.menu ?? []) {
    const m = MODULI.find((x) => x.id === id);
    if (m?.schermata && interfaccia.moduli[m.id] !== false) voci.push({ id: m.id, nome: m.nome });
  }
  return voci;
}

export default function BarraSuperiore({ schermata, onSchermata, errore, interfaccia, nome = NOME }) {
  const SCHERMATE = vociMenu(interfaccia);
  // L'orologio parte solo sul browser: se lo disegnasse anche il server,
  // i due orari non coinciderebbero e React protesterebbe.
  const { ora } = useOrologio();
  const [aperto, setAperto] = useState(false);

  // Il titolo della finestra segue il nome scelto: dal client, così non
  // dipende da nessuna cache di metadata.
  useEffect(() => {
    if (nome) document.title = nome;
  }, [nome]);

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
          <span className="dot" /> {nome}
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

      {/* Il cassetto resta montato anche da chiuso: è quello che permette
          l'animazione di uscita, un elemento smontato non scivola da nessuna
          parte. Chiuso non si clicca (pointer-events) e non si vede. */}
      <div className="drawer-sfondo" data-aperto={aperto} onClick={() => setAperto(false)} />
      <nav className="drawer" data-aperto={aperto} aria-hidden={!aperto}>
        {/* Il cassetto si presenta: il nome della casa in alto, poi la barra
            che lo separa dalle stanze. */}
        <div className="drawer-brand">
          <span className="dot" /> {nome}
        </div>
        <div className="riga-divisoria" />
        {SCHERMATE.map((s) => (
          <button key={s.id} tabIndex={aperto ? 0 : -1} aria-current={schermata === s.id} onClick={() => vai(s.id)}>
            {s.nome}
          </button>
        ))}
        <div className="riga-divisoria" />
        <button tabIndex={aperto ? 0 : -1} aria-current={schermata === "config"} onClick={() => vai("config")}>
          Config
        </button>
      </nav>
    </>
  );
}
