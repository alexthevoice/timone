"use client";

import { useState } from "react";
import Griglia from "@/components/Griglia";
import PannelloTask from "@/components/PannelloTask";
import { Croce } from "@/components/Icone";
import { postJson } from "@/lib/useDati";
import { QUADRANTI, etichettaScadenza, ordinaPerFare } from "@/lib/quadranti";

/**
 * La croce.
 *
 * Quattro caselle disposte come vanno disposte: urgente a sinistra, importante
 * in alto. Non è decorazione — è la disposizione che fa vedere il problema
 * senza doverlo spiegare. Se la colonna di sinistra è piena e Q2 è vuoto, la
 * settimana te lo dice da sola.
 *
 * Q2 è verde e ha il bordo pieno perché è l'unico quadrante in cui si
 * costruisce qualcosa. Il colore ha significato anche qui.
 */

const ORDINE = ["Q1", "Q2", "Q3", "Q4"];

export default function Quadranti({ attiva, dati, modifica, ricarica, aperto, onAperto }) {
  const [inVolo, setInVolo] = useState(null);
  const [lavoro, setLavoro] = useState(null);

  if (!dati) {
    return (
      <Griglia id="quadranti" attiva={attiva}>
        <section className="card col-12">
          <div className="body" style={{ padding: 16, color: "var(--text-faint)" }}>
            Sto leggendo i tuoi dati…
          </div>
        </section>
      </Griglia>
    );
  }

  const task = dati.task;
  const elemento = task.find((t) => t.id === aperto) ?? null;
  const scoperti = task.filter((t) => !t.quadrante).length;

  const dentro = (q) =>
    task.filter((t) => (t.quadrante ?? t.quadranteProposto) === q).sort(ordinaPerFare);

  const sposta = (id, quadrante) => {
    const attuale = task.find((t) => t.id === id);
    if (!attuale || attuale.quadrante === quadrante) return;
    modifica(
      (d) => ({
        ...d,
        task: d.task.map((t) => (t.id === id ? { ...t, quadrante, quadranteProposto: quadrante } : t)),
      }),
      () => postJson(`/api/task/${id}`, { quadrante }, "PATCH")
    );
  };

  /**
   * Il pulsante che chiama il modello. È un pulsante e non un automatismo:
   * il caricamento di una pagina non chiama mai il modello, e chiedere a
   * Claude di rifare la stessa classificazione a ogni apertura sarebbe la
   * regola più costosa del sistema, infranta nel punto più banale.
   */
  const assegna = async (tutti) => {
    setLavoro(tutti ? "Sto rifacendo tutti i quadranti…" : "Sto assegnando i mancanti…");
    try {
      const d = await postJson("/api/quadranti", { tutti });
      await ricarica();
      setLavoro(
        d.aggiornati === 0
          ? "Erano già tutti a posto."
          : `${d.aggiornati} sistemati${d.via === "regole" ? " con le regole: il modello non ha risposto" : ""}.`
      );
    } catch (e) {
      setLavoro(`Non ha funzionato: ${e.message}`);
    }
    setTimeout(() => setLavoro(null), 6000);
  };

  return (
    <>
      <Griglia id="quadranti" attiva={attiva}>
        <section className="card col-12" id="card-quadranti">
          <header>
            <Croce />
            <h2>Quadranti del tempo</h2>
            <div className="spacer" />
            {lavoro && <span className="hint">{lavoro}</span>}
            {scoperti > 0 && (
              <span className="band oggi">{scoperti} senza quadrante</span>
            )}
            <button className="btn" onClick={() => assegna(false)}>
              Assegna i mancanti
            </button>
            <button className="btn" onClick={() => assegna(true)}>
              Rifai tutto
            </button>
          </header>

          <div className="body">
            <div className="croce">
              <div className="assi">
                <span className="ax urg">Urgente</span>
                <span className="ax nonurg">Non urgente</span>
              </div>

              <div className="lato">
                <span className="ax imp">Importante</span>
                <span className="ax nonimp">Non importante</span>
              </div>

              <div className="quadri">
                {ORDINE.map((id) => {
                  const q = QUADRANTI.find((x) => x.id === id);
                  const dentroQ = dentro(id);
                  return (
                    <div
                      className="quadro"
                      data-q={id}
                      key={id}
                      onDragOver={(ev) => ev.preventDefault()}
                      onDrop={(ev) => {
                        ev.preventDefault();
                        const trascinato = ev.dataTransfer.getData("text/plain") || inVolo;
                        if (trascinato) sposta(trascinato, id);
                        setInVolo(null);
                      }}
                    >
                      <div className="tq">
                        <span className="q">{id}</span>
                        <span className="nome">{q.nome}</span>
                        <span className="azione">{q.azione}</span>
                        <span className="n num">{dentroQ.length}</span>
                      </div>
                      <div className="spiega">{q.spiega}</div>
                      <div className="cards">
                        {dentroQ.length === 0 ? (
                          <div className="vuoto">
                            {id === "Q2"
                              ? "Vuoto. È il quadrante che conta: se resta così, stai solo spegnendo incendi."
                              : id === "Q4"
                                ? "Vuoto, ed è la cosa giusta."
                                : "Niente qui."}
                          </div>
                        ) : (
                          dentroQ.map((t) => (
                            <CartaQ
                              key={t.id}
                              t={t}
                              oggiIso={dati.oggi}
                              onApri={onAperto}
                              onTrascina={setInVolo}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="foot">
            Le carte in grigio chiaro hanno un quadrante solo proposto: trascinale o aprile per
            confermarlo. Trascinare una carta la sposta di quadrante.
          </div>
        </section>
      </Griglia>

      {attiva && elemento && (
        <PannelloTask
          elemento={elemento}
          etichette={[...new Set(task.flatMap((t) => t.tag ?? []))].sort()}
          persone={dati.persone ?? []}
          modifica={modifica}
          ricarica={ricarica}
          onChiudi={() => onAperto(null)}
        />
      )}
    </>
  );
}

function CartaQ({ t, oggiIso, onApri, onTrascina }) {
  const scadenza = etichettaScadenza(t.scadenza, oggiIso);
  return (
    <div
      className="tcard"
      data-proposto={!t.quadrante || undefined}
      draggable
      onDragStart={(ev) => {
        ev.dataTransfer.setData("text/plain", t.id);
        onTrascina(t.id);
      }}
      onClick={() => onApri(t.id)}
    >
      <div className="t">
        <span className={`prio p${t.priorita ?? t.prioritaProposta}`}>
          {t.priorita ?? t.prioritaProposta}
        </span>
        {t.titolo}
      </div>
      <div className="row">
        <span className={`temp ${t.temperatura}`} />
        {(t.persone ?? []).length > 0 && <span className="p">{t.persone.join(" · ")}</span>}
        {scadenza && <span className={`scad ${scadenza.tono}`}>{scadenza.testo}</span>}
        {(t.allegati ?? []).length > 0 && <span className="tag">{t.allegati.length} file</span>}
      </div>
    </div>
  );
}
