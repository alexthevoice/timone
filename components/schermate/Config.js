"use client";

import Griglia from "@/components/Griglia";
import { STORICO, VERSIONE } from "@/lib/versione";

/**
 * Config: il posto delle impostazioni.
 *
 * Per ora tiene la carta d'identità del sistema (versione e storico dei
 * giri): le impostazioni vere arriveranno qui una alla volta, quando ognuna
 * avrà un motivo per esistere. Meglio una pagina onesta con poco dentro che
 * dieci interruttori che non fanno niente.
 */
export default function Config({ attiva }) {
  return (
    <Griglia id="config" attiva={attiva}>
      <section className="card col-6">
        <header>
          <h2>Config</h2>
          <div className="spacer" />
          <span className="hint">le impostazioni arriveranno qui, una alla volta</span>
        </header>
        <div className="body">
          <div style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.6 }}>
            Per ora da qui non si regola niente: i settori dei Cicli Aperti si
            governano dalla loro schermata, il resto vive nelle variabili
            d&apos;ambiente. Quando un&apos;impostazione meriterà un interruttore,
            comparirà in questa pagina.
          </div>
        </div>
      </section>

      <section className="card col-6">
        <header>
          <h2>Versione {VERSIONE}</h2>
          <div className="spacer" />
          <span className="hint">un giro, una riga</span>
        </header>
        <div className="body">
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 420, overflowY: "auto" }}>
            {STORICO.slice(0, 12).map(([giro, cosa]) => (
              <div key={giro} style={{ display: "flex", gap: 10, fontSize: 12.5, lineHeight: 1.5 }}>
                <span className="num" style={{ color: "var(--text-faint)", flex: "0 0 34px" }}>
                  {giro}
                </span>
                <span style={{ color: "var(--text-dim)" }}>{cosa}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Griglia>
  );
}
