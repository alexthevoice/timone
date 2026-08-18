"use client";

import { NOME } from "@/lib/app";
import { useOrologio } from "@/lib/useOrologio";
import { ULTIMA_MODIFICA, VERSIONE } from "@/lib/versione";

/** La barra in cima: le schermate, e basta. */
const SCHERMATE = [
  { id: "home", nome: "Home" },
  { id: "quadranti", nome: "Quadranti" },
  { id: "allenamento", nome: "Allenamento" },
  { id: "crm", nome: "CRM" },
  { id: "review", nome: "Review" },
];

export default function BarraSuperiore({ schermata, onSchermata, errore }) {
  // L'orologio parte solo sul browser: se lo disegnasse anche il server,
  // i due orari non coinciderebbero e React protesterebbe.
  const { ora } = useOrologio();

  return (
    <header className="topbar">
      <div className="brand">
        <span className="dot" /> {NOME}
      </div>

      <nav className="nav">
        {SCHERMATE.map((s) => (
          <button
            key={s.id}
            aria-current={schermata === s.id}
            onClick={() => onSchermata(s.id)}
          >
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
