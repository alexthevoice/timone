"use client";

import { useState } from "react";
import { useOrologio } from "@/lib/useOrologio";
import { postJson } from "@/lib/useDati";
import { etichettaScadenza, ordinaPerFare, PRIORITA_MAX, PRIORITA_MIN } from "@/lib/quadranti";

/**
 * L'angolo in alto a sinistra: che giorno è, che ore sono, e le tre cose.
 *
 * Non c'è nessun nome e nessuna faccia. Questa dashboard ha un utente solo, che
 * il proprio nome lo sa: una scheda che glielo ripete ogni mattina occupa il
 * posto migliore dello schermo per dire una cosa che non serve a nessuno.
 *
 * Sotto ci va quello che scade oggi, in ordine di priorità: né il domani né il
 * resto del mucchio, che vivono nella scheda Da fare.
 */

const PRIORITA = Array.from(
  { length: PRIORITA_MAX - PRIORITA_MIN + 1 },
  (_, i) => PRIORITA_MIN + i
);

/**
 * Cosa scade oggi, in ordine di priorità.
 *
 * Solo oggi e quello che è già scaduto. Il domani non entra: una scheda che
 * mescola oggi e la settimana prossima non dice più da dove cominciare, ed è
 * l'unica cosa che questo angolo dello schermo deve dire. La lista di tutto
 * esiste già e sta due riquadri più in là.
 *
 * Quello che è scaduto ieri resta, e va in cima: non è futuro, è in ritardo.
 */
export function scadonoOggi(task, oggiIso) {
  return task.filter((t) => t.scadenza && oggiIso && t.scadenza <= oggiIso).sort(ordinaPerFare);
}

export default function Adesso({ task, oggiIso, focus, modifica, onApriTask }) {
  const { ora, data, saluto } = useOrologio();
  const oggi = scadonoOggi(task, oggiIso);
  const inRitardo = oggi.filter((t) => t.scadenza < oggiIso).length;

  return (
    <section className="card col-4" id="card-adesso">
      <div className="body adesso">
        <div className="quando">
          <div className="giorno">{data ?? " "}</div>
          <div className="riga-ora">
            <span className="orario num">{ora ?? "--:--"}</span>
            <span className="saluto">{saluto ?? " "}</span>
          </div>
        </div>

        {focus && (
          <div className="focus">
            <div className="label">Il filo di oggi</div>
            <div className="value">{focus}</div>
          </div>
        )}

        <div className="today">
          <div className="lab">
            In scadenza oggi
            {inRitardo > 0 && (
              <span className="band ritardo" style={{ marginLeft: 8 }}>
                {inRitardo} in ritardo
              </span>
            )}
          </div>
          {oggi.length === 0 ? (
            <div className="task-row" style={{ cursor: "default" }}>
              <span className="t" style={{ color: "var(--text-faint)" }}>
                Niente in scadenza oggi.
              </span>
            </div>
          ) : (
            oggi.map((t) => (
              <RigaCosa key={t.id} t={t} oggiIso={oggiIso} modifica={modifica} onApri={onApriTask} />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function RigaCosa({ t, oggiIso, modifica, onApri }) {
  const [apre, setApre] = useState(false);
  const scadenza = etichettaScadenza(t.scadenza, oggiIso);
  const priorita = t.priorita ?? t.prioritaProposta;

  const cambia = (p) => {
    setApre(false);
    modifica(
      (d) => ({ ...d, task: d.task.map((x) => (x.id === t.id ? { ...x, priorita: p } : x)) }),
      () => postJson(`/api/task/${t.id}`, { priorita: p }, "PATCH")
    );
  };

  return (
    <div className="task-row" onClick={() => onApri(t.id)}>
      <span
        className={`prio p${priorita}`}
        data-proposta={t.priorita === null || undefined}
        title={t.priorita === null ? "Priorità proposta: clicca per fissarla" : "Priorità"}
        onClick={(e) => {
          e.stopPropagation();
          setApre((v) => !v);
        }}
      >
        {priorita}
      </span>

      {apre && (
        <span className="scelta-prio" onClick={(e) => e.stopPropagation()}>
          {PRIORITA.map((p) => (
            <button key={p} aria-current={p === priorita} onClick={() => cambia(p)}>
              {p}
            </button>
          ))}
        </span>
      )}

      <span className={`temp ${t.temperatura}`} />
      <span className="t">{t.titolo}</span>
      {(t.persone ?? []).length > 0 && <span className="p">{t.persone.join(" · ")}</span>}
      {scadenza && <span className={`scad ${scadenza.tono}`}>{scadenza.testo}</span>}
      <span className={`qbadge q${t.quadrante ?? t.quadranteProposto}`}>
        {t.quadrante ?? t.quadranteProposto}
      </span>
    </div>
  );
}
