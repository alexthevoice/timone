"use client";

import { Goccia, Spunta } from "@/components/Icone";
import { postJson } from "@/lib/useDati";

/**
 * Le abitudini di oggi, e la striscia dei giorni di fila.
 *
 * La striscia sta qui e non in una scheda sua: è la misura di quanto stanno
 * tenendo le abitudini, e leggerla lontano da loro voleva dire un numero senza
 * il suo contesto.
 *
 * I contatori si segnano a parziali, uno alla volta e visibili tutti.
 *
 * La versione a un solo bottone che fa "+1" e si azzera in fondo sembra più
 * semplice, e lo è finché non sbagli: da lì in poi l'unico modo di correggere
 * è cliccare fino a farlo girare, e dopo due giorni non sai più a che punto
 * sei. Con le caselle in fila il numero non si ricostruisce a memoria, si
 * guarda — e cliccare la terza casella vuol dire "sono a tre", sempre, anche
 * se prima ne avevi segnate sei.
 */
export default function Abitudini({ profilo, logOggi, striscia, modifica }) {
  const abitudini = profilo.abitudini ?? [];
  const stato = logOggi.abitudini ?? {};

  const quota = (a) => {
    if (a.tipo === "contatore") {
      const obiettivo = Number(a.obiettivo) || 1;
      return Math.min(1, (Number(stato[a.id]) || 0) / obiettivo);
    }
    return stato[a.id] ? 1 : 0;
  };

  const percentuale = abitudini.length
    ? Math.round((abitudini.reduce((s, a) => s + quota(a), 0) / abitudini.length) * 100)
    : 0;
  const circonferenza = 2 * Math.PI * 35;

  /** Un valore preciso, non un passo avanti: è quello che rende correggibile la giornata. */
  const porta = (a, valore) =>
    modifica(
      (d) => ({
        ...d,
        logOggi: { ...d.logOggi, abitudini: { ...(d.logOggi.abitudini ?? {}), [a.id]: valore } },
      }),
      () => postJson("/api/abitudini", { id: a.id, valore })
    );

  const gira = (a) =>
    modifica(
      (d) => {
        const s = { ...(d.logOggi.abitudini ?? {}) };
        s[a.id] = !s[a.id];
        return { ...d, logOggi: { ...d.logOggi, abitudini: s } };
      },
      () => postJson("/api/abitudini", { id: a.id })
    );

  return (
    <section className="card col-3" id="card-abitudini">
      <header>
        <h2>Abitudini</h2>
        <div className="spacer" />
        <span className="hint">oggi</span>
      </header>

      <div className="body">
        {abitudini.length === 0 ? (
          <div style={{ color: "var(--text-faint)", fontSize: 13 }}>
            Nessuna abitudine nel profilo. Si configurano lì, non nel codice.
          </div>
        ) : (
          <>
            <div className="habits">
              <div className="ring">
                <svg width="84" height="84" viewBox="0 0 84 84">
                  <circle cx="42" cy="42" r="35" stroke="var(--surface-3)" strokeWidth="8" fill="none" />
                  <circle
                    cx="42"
                    cy="42"
                    r="35"
                    stroke="var(--accent)"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={circonferenza.toFixed(1)}
                    strokeDashoffset={(circonferenza * (1 - percentuale / 100)).toFixed(1)}
                  />
                </svg>
                <div className="val">{percentuale}%</div>
              </div>

              <div className="habit-list">
                {abitudini
                  .filter((a) => a.tipo !== "contatore")
                  .map((a) => (
                    <div
                      className="habit"
                      key={a.id}
                      data-done={Boolean(stato[a.id])}
                      onClick={() => gira(a)}
                    >
                      <span className="box">{stato[a.id] && <Spunta />}</span>
                      <span className="name">{a.nome}</span>
                    </div>
                  ))}
              </div>
            </div>

            {abitudini
              .filter((a) => a.tipo === "contatore")
              .map((a) => (
                <Contatore
                  key={a.id}
                  a={a}
                  valore={Number(stato[a.id]) || 0}
                  onPorta={(v) => porta(a, v)}
                />
              ))}
          </>
        )}

        <div className="streak">
          <strong className="num">{striscia}</strong>
          {striscia === 1 ? "giorno di fila" : "giorni di fila"} con almeno un&apos;abitudine
        </div>
      </div>
    </section>
  );
}

/**
 * Quanto sta in un bicchiere, per le abitudini che si misurano anche in litri.
 *
 * Otto bicchieri sono due litri: il conto "6/8" dice a che punto sei nel
 * gesto, i litri dicono quanto hai bevuto davvero, ed è il secondo il numero
 * che si ricorda. Il litraggio si ricava dall'obiettivo, quindi il giorno che
 * i bicchieri diventano dieci il conto resta giusto da solo.
 */
const LITRI_OBIETTIVO = { acqua: 2 };

function Contatore({ a, valore, onPorta }) {
  const obiettivo = Number(a.obiettivo) || 1;
  const caselle = Array.from({ length: obiettivo }, (_, i) => i + 1);
  const fatta = valore >= obiettivo;
  const litriTotali = LITRI_OBIETTIVO[a.id] ?? null;
  const litri = litriTotali === null ? null : (litriTotali / obiettivo) * valore;

  return (
    <div className="contatore" data-done={fatta || undefined}>
      <div className="testa">
        <span className="name">{a.nome}</span>
        {litri !== null && (
          <span className="litri num">
            {litri.toLocaleString("it-IT", { maximumFractionDigits: 2 })} di {litriTotali} litri
          </span>
        )}
        <span className="count num">
          {valore}/{obiettivo}
        </span>
      </div>
      <div className="caselle">
        {caselle.map((n) => (
          <button
            key={n}
            className="casella"
            data-piena={n <= valore || undefined}
            // Ricliccare la casella su cui sei già segna "una di meno": è il
            // gesto per correggere senza azzerare tutto.
            onClick={() => onPorta(valore === n ? n - 1 : n)}
            title={valore === n ? `Torna a ${n - 1}` : `Segna ${n}`}
            aria-label={`${a.nome}: ${n} su ${obiettivo}`}
          >
            <Goccia />
          </button>
        ))}
      </div>
    </div>
  );
}
