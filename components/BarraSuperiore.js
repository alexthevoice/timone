"use client";

import { useEffect } from "react";
import { NOME } from "@/lib/app";
import { MODULI } from "@/lib/moduli";
import { useOrologio } from "@/lib/useOrologio";
import { ULTIMA_MODIFICA, VERSIONE } from "@/lib/versione";

/**
 * La barra in cima, con le schermate in fila.
 *
 * Il menu a panino ha fatto un giro e non è piaciuto: le voci tornano nella
 * barra, sempre sott'occhio. Si costruiscono dai moduli accesi, nell'ordine
 * scelto da Config, con Home in testa e Config in fondo. Sul telefono la
 * fila scorre di lato invece di andare a capo.
 */
function vociMenu(interfaccia) {
  const voci = [{ id: "home", nome: "Home" }];
  for (const id of interfaccia?.menu ?? []) {
    const m = MODULI.find((x) => x.id === id);
    if (m?.schermata && interfaccia.moduli[m.id] !== false) voci.push({ id: m.id, nome: m.nome });
  }
  voci.push({ id: "config", nome: "Config" });
  return voci;
}

export default function BarraSuperiore({ schermata, onSchermata, errore, interfaccia, nome = NOME }) {
  const SCHERMATE = vociMenu(interfaccia);
  // L'orologio parte solo sul browser: se lo disegnasse anche il server,
  // i due orari non coinciderebbero e React protesterebbe.
  const { ora } = useOrologio();

  // Il titolo della finestra segue il nome scelto: dal client, così non
  // dipende da nessuna cache di metadata.
  useEffect(() => {
    if (nome) document.title = nome;
  }, [nome]);

  return (
    <header className="topbar">
      <div className="brand">
        <span className="dot" /> {nome}
      </div>

      <nav className="nav">
        {SCHERMATE.map((s) => (
          <button key={s.id} aria-current={schermata === s.id} onClick={() => onSchermata(s.id)}>
            {s.nome}
          </button>
        ))}
      </nav>

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
  );
}
