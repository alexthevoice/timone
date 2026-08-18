"use client";

import { useState } from "react";
import { Mirino, Spunta } from "@/components/Icone";
import { num } from "@/lib/numeri";
import { postJson } from "@/lib/useDati";

/**
 * Cinque orizzonti, in fila, sempre in Home.
 *
 * La settimana e il mese dicono cosa fai. L'anno, l'anno prossimo e i cinque
 * anni dicono perché. Una meta a cinque anni scritta in un documento che apri
 * due volte l'anno non è una meta: è un ricordo. Sta qui, sotto le cose di
 * oggi, e la rivedi ogni volta che apri la dashboard — che è tutto il punto.
 *
 * L'anno prossimo non è un doppione di quest'anno: da settembre in poi metà di
 * quello che decidi non entra più in dicembre, e senza una colonna dove
 * metterlo finisce fra le mete a cinque anni, dove nessuno lo guarda con la
 * fretta giusta.
 *
 * Nessuno di questi si azzera da solo, nemmeno quello della settimana. Un
 * obiettivo è una promessa, non una misurazione: si chiude o si toglie a mano.
 * Compreso il passaggio d'anno: il primo di gennaio le promesse dell'anno
 * prossimo non scivolano da sole in "quest'anno", si spostano a mano.
 */

/**
 * Le colonne. L'anno lo dice il server (`oggiIso`) e non `new Date()`: la data
 * ha una sola voce in questo programma, e il 31 dicembre alle 23:30 il fuso del
 * server direbbe già l'anno dopo.
 */
const colonneDi = (anno) => [
  { periodo: "settimana", titolo: "Questa settimana", sotto: "cosa chiudo entro domenica" },
  { periodo: "mese", titolo: "Questo mese", sotto: "compreso almeno un corso" },
  {
    periodo: "anno",
    titolo: `Quest'anno`,
    sotto: anno ? `cosa deve essere vero a dicembre ${anno}` : "cosa deve essere vero a dicembre",
  },
  {
    periodo: "annoProssimo",
    titolo: "L'anno prossimo",
    sotto: anno ? `dove voglio essere a dicembre ${anno + 1}` : "dove voglio essere l'anno dopo",
  },
  { periodo: "5anni", titolo: "Le mete a 5 anni", sotto: "dove sto andando" },
];

export default function Obiettivi({ obiettivi, oggiIso, modifica }) {
  const [nuovo, setNuovo] = useState({});

  const anno = /^\d{4}-/.test(oggiIso ?? "") ? Number(oggiIso.slice(0, 4)) : null;
  const COLONNE = colonneDi(anno);

  const lista = (p) => obiettivi?.[p] ?? [];

  const aggiungi = async (periodo) => {
    const nome = (nuovo[periodo] ?? "").trim();
    if (!nome) return;
    setNuovo((n) => ({ ...n, [periodo]: "" }));
    await modifica(
      (d) => ({
        ...d,
        obiettivi: {
          ...d.obiettivi,
          [periodo]: [
            ...(d.obiettivi?.[periodo] ?? []),
            { id: `nuovo-${Date.now()}`, nome, periodo, fatto: false, posizione: 9999 },
          ],
        },
      }),
      () => postJson("/api/obiettivi", { nome, periodo })
    );
  };

  const suTutti = (fn) => (d) => ({
    ...d,
    obiettivi: Object.fromEntries(
      Object.entries(d.obiettivi ?? {}).map(([p, righe]) => [p, fn(righe)])
    ),
  });

  const spunta = (o) =>
    modifica(
      suTutti((righe) => righe.map((x) => (x.id === o.id ? { ...x, fatto: !x.fatto } : x))),
      () => postJson(`/api/obiettivi/${o.id}`, { fatto: !o.fatto }, "PATCH")
    );

  const togli = (o) =>
    modifica(
      suTutti((righe) => righe.filter((x) => x.id !== o.id)),
      () => postJson(`/api/obiettivi/${o.id}`, {}, "DELETE")
    );

  /** A che punto sei, e dove vuoi arrivare. Vuoto vuol dire "non si misura". */
  const misura = (o, patch) =>
    modifica(
      suTutti((righe) => righe.map((x) => (x.id === o.id ? { ...x, ...patch } : x))),
      () => postJson(`/api/obiettivi/${o.id}`, patch, "PATCH")
    );

  return (
    <section className="card col-12" id="card-obiettivi">
      <header>
        <Mirino />
        <h2>Obiettivi</h2>
        <div className="spacer" />
        <span className="hint">non si azzerano mai da soli: si chiudono o si tolgono a mano</span>
      </header>

      <div className="body">
        <div className="goals">
          {COLONNE.map(({ periodo, titolo, sotto }) => {
            const righe = lista(periodo);
            const chiusi = righe.filter((o) => o.fatto).length;
            return (
              <div key={periodo} className="colonna-obiettivo" data-periodo={periodo}>
                <h3>
                  {titolo}
                  {righe.length > 0 && (
                    <span className="n num">
                      {chiusi}/{righe.length}
                    </span>
                  )}
                </h3>
                <div className="sotto">{sotto}</div>

                {righe.length === 0 && (
                  <div style={{ color: "var(--text-faint)", fontSize: 12.5, padding: "8px 0" }}>
                    {periodo === "5anni"
                      ? "Ancora niente. È la colonna che vale di più: scrivici due o tre cose e lasciale lì."
                      : periodo === "annoProssimo"
                        ? "Quello che non ci sta più in questo dicembre va scritto qui, non rimandato a un file."
                        : "Niente, per ora."}
                  </div>
                )}

                {righe.map((o) => (
                  <Meta key={o.id} o={o} onSpunta={spunta} onTogli={togli} onMisura={misura} />
                ))}

                <div className="add">
                  <input
                    value={nuovo[periodo] ?? ""}
                    onChange={(e) => setNuovo((n) => ({ ...n, [periodo]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && aggiungi(periodo)}
                    placeholder="+ aggiungi, poi Invio"
                    style={{
                      background: "none",
                      border: "none",
                      outline: "none",
                      width: "100%",
                      font: "inherit",
                      color: "inherit",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/**
 * Un obiettivo, con o senza misura.
 *
 * "Arrivare a 200 clienti" spuntato a metà anno non dice se sei a metà strada
 * o fermo: o zero o cento. Con un numero e un traguardo diventa una barra, e la
 * barra è l'unica cosa che a settembre ti dice la verità.
 *
 * La misura è facoltativa apposta: "fare un corso di formazione" non ha un
 * numero, e inventargliene uno vorrebbe dire misurare per il gusto di misurare.
 */
function Meta({ o, onSpunta, onTogli, onMisura }) {
  const [apre, setApre] = useState(false);
  const [valore, setValore] = useState("");
  const [target, setTarget] = useState("");

  const haMisura = Number.isFinite(o.target) && o.target > 0;
  const quanto = haMisura ? Math.max(0, Math.min(100, ((o.valore ?? 0) / o.target) * 100)) : 0;

  const salva = () => {
    const v = valore.trim() === "" ? (o.valore ?? 0) : Number(valore.replace(",", "."));
    const t = target.trim() === "" ? o.target : Number(target.replace(",", "."));
    setApre(false);
    setValore("");
    setTarget("");
    if (!Number.isFinite(v) || !Number.isFinite(t)) return;
    onMisura(o, { valore: v, target: t });
  };

  return (
    <div className="goal" data-done={o.fatto}>
      <span className="box" onClick={() => onSpunta(o)} style={{ cursor: "pointer" }}>
        {o.fatto && <Spunta />}
      </span>
      <span className="n">{o.nome}</span>

      {haMisura ? (
        <span className="prog num" onClick={() => setApre((v) => !v)} title="Aggiorna il numero">
          {num(o.valore ?? 0)}/{num(o.target)}
        </span>
      ) : (
        <span className="prog misura" onClick={() => setApre((v) => !v)} title="Dagli un numero">
          {o.progresso ? o.progresso : "misura"}
        </span>
      )}

      <span className="x" onClick={() => onTogli(o)} style={{ cursor: "pointer" }}>
        ×
      </span>

      {haMisura && (
        <span className="barra-meta" style={{ gridColumn: "1 / -1" }}>
          <i style={{ width: `${Math.max(2, quanto)}%` }} />
        </span>
      )}

      {apre && (
        <span className="misura-form" style={{ gridColumn: "1 / -1" }}>
          <input
            autoFocus
            inputMode="decimal"
            placeholder={o.valore != null ? String(o.valore) : "a che punto"}
            value={valore}
            onChange={(e) => setValore(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && salva()}
          />
          <span className="fra">su</span>
          <input
            inputMode="decimal"
            placeholder={o.target != null ? String(o.target) : "traguardo"}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && salva()}
          />
          <button className="mini" onClick={salva}>
            segna
          </button>
          {haMisura && (
            <button className="mini" onClick={() => { setApre(false); onMisura(o, { valore: null, target: null }); }}>
              togli la misura
            </button>
          )}
        </span>
      )}
    </div>
  );
}
