"use client";

import { useEffect, useRef, useState } from "react";
import { Graffetta } from "@/components/Icone";
import { postJson } from "@/lib/useDati";
import { PRIORITA_MAX, PRIORITA_MIN, QUADRANTI } from "@/lib/quadranti";

/**
 * Il pannello di dettaglio di un task, uno solo per tutta la dashboard.
 *
 * Lo aprono sia il CRM sia i Quadranti. Averne due copie voleva dire che il
 * giorno in cui si aggiunge un campo lo si aggiunge in uno dei due, e per
 * qualche settimana la stessa cosa si modifica in due modi diversi a seconda
 * di dove l'hai cliccata.
 *
 * Segue sempre l'IDENTIFICATIVO e mai la posizione in lista: mentre è aperto,
 * una cattura può inserire una riga in testa e da quel momento staresti
 * modificando l'elemento sbagliato.
 */

const FASCE = [
  { id: "ritardo", nome: "In ritardo" },
  { id: "oggi", nome: "Oggi" },
  { id: "settimana", nome: "Questa settimana" },
  { id: "avanti", nome: "Più avanti" },
];

const TEMPERATURE = [
  ["hot", "Caldo"],
  ["warm", "Tiepido"],
  ["cold", "Freddo"],
];

const PRIORITA = Array.from(
  { length: PRIORITA_MAX - PRIORITA_MIN + 1 },
  (_, i) => PRIORITA_MIN + i
);

export default function PannelloTask({
  elemento,
  etichette = [],
  persone = [],
  modifica,
  ricarica,
  onChiudi,
}) {
  const [nota, setNota] = useState(elemento.nota ?? "");
  const [caricando, setCaricando] = useState(false);
  const [erroreFile, setErroreFile] = useState(null);
  const [nuovaEtichetta, setNuovaEtichetta] = useState("");
  const [nuovaPersona, setNuovaPersona] = useState("");
  const scelta = useRef(null);

  useEffect(() => setNota(elemento.nota ?? ""), [elemento.id, elemento.nota]);

  // Cambiando elemento le caselle "nuova" si svuotano: un nome mezzo scritto
  // che resta lì mentre sotto c'è un'altra cosa da fare è il modo più facile
  // per attaccarlo alla riga sbagliata.
  useEffect(() => {
    setNuovaEtichetta("");
    setNuovaPersona("");
  }, [elemento.id]);

  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onChiudi();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onChiudi]);

  const campo = (patch) =>
    modifica(
      (d) => ({ ...d, task: d.task.map((t) => (t.id === elemento.id ? { ...t, ...patch } : t)) }),
      () => postJson(`/api/task/${elemento.id}`, patch, "PATCH")
    );

  const completa = async () => {
    onChiudi();
    await modifica(
      (d) => ({ ...d, task: d.task.filter((t) => t.id !== elemento.id) }),
      () => postJson(`/api/task/${elemento.id}`, { completa: true }, "PATCH")
    );
    await ricarica();
  };

  const elimina = async () => {
    onChiudi();
    await modifica(
      (d) => ({ ...d, task: d.task.filter((t) => t.id !== elemento.id) }),
      () => postJson(`/api/task/${elemento.id}`, {}, "DELETE")
    );
  };

  /**
   * Il caricamento di un file non passa da `modifica`: non c'è nessun modo
   * onesto di mostrare subito un allegato che non è ancora arrivato. Qui si
   * aspetta davvero, e si rilegge quando è finito.
   */
  const carica = async (file) => {
    if (!file) return;
    setErroreFile(null);
    setCaricando(true);
    try {
      const modulo = new FormData();
      modulo.append("file", file);
      const r = await fetch(`/api/task/${elemento.id}/allegati`, { method: "POST", body: modulo });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.errore ?? `il caricamento ha risposto ${r.status}`);
      await ricarica();
    } catch (e) {
      setErroreFile(e.message);
    } finally {
      setCaricando(false);
      if (scelta.current) scelta.current.value = "";
    }
  };

  const stacca = async (allegatoId) => {
    setCaricando(true);
    try {
      await fetch(`/api/task/${elemento.id}/allegati?allegato=${allegatoId}`, { method: "DELETE" });
      await ricarica();
    } finally {
      setCaricando(false);
    }
  };

  const allegati = elemento.allegati ?? [];

  return (
    <aside className="panel" id="panel-task">
      <header>
        <h2>Dettaglio</h2>
        <div className="spacer" style={{ flex: 1 }} />
        <button className="btn" onClick={onChiudi}>
          Esc
        </button>
      </header>

      <div className="body">
        <div className="field">
          <div className="k">Titolo</div>
          <input
            className="in"
            defaultValue={elemento.titolo}
            key={elemento.id}
            onBlur={(e) =>
              e.target.value.trim() &&
              e.target.value !== elemento.titolo &&
              campo({ titolo: e.target.value.trim() })
            }
            style={{ width: "100%", outline: "none" }}
          />
        </div>

        <div className="field">
          <div className="k">Nota</div>
          <textarea
            className="in"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            onBlur={() => nota !== (elemento.nota ?? "") && campo({ nota })}
          />
        </div>

        <div className="field">
          <div className="k">Quadrante</div>
          <div className="chips">
            {QUADRANTI.map((q) => (
              <span
                className={`chip q${q.id}`}
                key={q.id}
                aria-pressed={elemento.quadrante === q.id}
                onClick={() => campo({ quadrante: q.id })}
                title={q.spiega}
              >
                {q.id} · {q.nome}
              </span>
            ))}
          </div>
          {!elemento.quadrante && (
            <div className="suggerito">
              Non assegnato. Il sistema lo metterebbe in{" "}
              <b>{elemento.quadranteProposto}</b>: clicca per confermare.
            </div>
          )}
        </div>

        <div className="field">
          <div className="k">Priorità</div>
          <div className="chips">
            {PRIORITA.map((p) => (
              <span
                className="chip"
                key={p}
                aria-pressed={elemento.priorita === p}
                onClick={() => campo({ priorita: p })}
                title={p === 1 ? "Per primo" : p === 5 ? "Può aspettare" : undefined}
              >
                {p}
              </span>
            ))}
          </div>
          {elemento.priorita === null && (
            <div className="suggerito">
              Non assegnata. Il sistema proporrebbe <b>{elemento.prioritaProposta}</b>.
            </div>
          )}
        </div>

        <div className="field">
          <div className="k">Scadenza</div>
          <input
            className="in"
            type="date"
            key={`${elemento.id}-scadenza`}
            defaultValue={elemento.scadenza ?? ""}
            onChange={(e) => campo({ scadenza: e.target.value || null })}
            style={{ width: "100%", outline: "none" }}
          />
        </div>

        <div className="field">
          <div className="k">Fascia</div>
          <div className="chips">
            {FASCE.map((f) => (
              <span
                className="chip"
                key={f.id}
                aria-pressed={elemento.fascia === f.id}
                onClick={() => campo({ fascia: f.id })}
              >
                {f.nome}
              </span>
            ))}
          </div>
        </div>

        <div className="field">
          <div className="k">Temperatura</div>
          <div className="chips">
            {TEMPERATURE.map(([id, nome]) => (
              <span
                className="chip"
                key={id}
                aria-pressed={elemento.temperatura === id}
                onClick={() => campo({ temperatura: id })}
              >
                {nome}
              </span>
            ))}
          </div>
        </div>

        {/* Come le etichette: chi c'è già si clicca, e si scrive solo chi non
            c'è ancora. Riscrivere il nome ogni volta vuol dire che prima o poi
            "Giulia" e "giulia" diventano due persone diverse, e da lì
            il CRM racconta due storie separate della stessa.
            Più di una si può: una chiamata col dealer e il suo commercialista
            è una cosa sola con due nomi sopra, e tenerne uno vuol dire che
            l'altro non la vede più passare. */}
        <div className="field">
          <div className="k">Persone</div>
          <div className="chips">
            {[...new Set([...(elemento.persone ?? []), ...persone.map((p) => p.nome)].filter(Boolean))]
              .sort((a, b) => a.localeCompare(b, "it"))
              .map(
              (nome) => {
                const messa = (elemento.persone ?? []).includes(nome);
                return (
                  <span
                    className="chip"
                    key={nome}
                    aria-pressed={messa}
                    onClick={() =>
                      campo({
                        persone: messa
                          ? (elemento.persone ?? []).filter((x) => x !== nome)
                          : [...(elemento.persone ?? []), nome],
                      })
                    }
                  >
                    {nome}
                  </span>
                );
              }
            )}
          </div>
          <input
            className="in"
            key={`${elemento.id}-persona`}
            value={nuovaPersona}
            placeholder="+ persona nuova, poi Invio"
            onChange={(ev) => setNuovaPersona(ev.target.value)}
            onKeyDown={(ev) => {
              if (ev.key !== "Enter") return;
              const nome = nuovaPersona.trim();
              setNuovaPersona("");
              if (!nome || (elemento.persone ?? []).includes(nome)) return;
              campo({ persone: [...(elemento.persone ?? []), nome] });
            }}
            style={{ width: "100%", outline: "none", marginTop: 8 }}
          />
        </div>

        {/* Le etichette sono quelle di Airtable, che le crea da sola appena ne
            scrivi una nuova. Qui compaiono tutte quelle già usate, così la
            seconda volta si clicca invece di riscriverla: "casa" e "Casa"
            sarebbero due etichette diverse, e l'elenco smetterebbe di servire. */}
        <div className="field">
          <div className="k">Etichette</div>
          <div className="chips">
            {[...new Set([...(elemento.tag ?? []), ...etichette])]
              .sort((a, b) => a.localeCompare(b, "it"))
              .map((e) => {
              const messa = (elemento.tag ?? []).includes(e);
              return (
                <span
                  className="chip"
                  key={e}
                  aria-pressed={messa}
                  onClick={() =>
                    campo({
                      tag: messa
                        ? (elemento.tag ?? []).filter((x) => x !== e)
                        : [...(elemento.tag ?? []), e],
                    })
                  }
                >
                  {e}
                </span>
              );
            })}
          </div>
          <input
            className="in"
            value={nuovaEtichetta}
            placeholder="+ etichetta nuova, poi Invio"
            onChange={(ev) => setNuovaEtichetta(ev.target.value)}
            onKeyDown={(ev) => {
              if (ev.key !== "Enter") return;
              const nome = nuovaEtichetta.trim();
              if (!nome || (elemento.tag ?? []).includes(nome)) return setNuovaEtichetta("");
              setNuovaEtichetta("");
              campo({ tag: [...(elemento.tag ?? []), nome] });
            }}
            style={{ width: "100%", outline: "none", marginTop: 8 }}
          />
        </div>

        <div className="field">
          <div className="k">Allegati</div>
          {allegati.length > 0 && (
            <div className="allegati">
              {allegati.map((a) => (
                <div className="allegato" key={a.id}>
                  {a.miniatura ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.miniatura} alt="" />
                  ) : (
                    <span className="ext">{(a.nome.split(".").pop() ?? "?").slice(0, 4)}</span>
                  )}
                  <a href={a.indirizzo} target="_blank" rel="noreferrer" className="n">
                    {a.nome}
                  </a>
                  <span className="peso num">{Math.max(1, Math.round(a.dimensione / 1024))} kB</span>
                  <span className="x" onClick={() => stacca(a.id)}>
                    ×
                  </span>
                </div>
              ))}
            </div>
          )}
          <label className="add" style={{ cursor: caricando ? "wait" : "pointer" }}>
            <Graffetta />
            {caricando ? "sto caricando…" : "aggiungi un file o una foto"}
            <input
              ref={scelta}
              type="file"
              hidden
              disabled={caricando}
              onChange={(e) => carica(e.target.files?.[0])}
            />
          </label>
          {erroreFile && <div className="gate-err" style={{ marginTop: 8 }}>{erroreFile}</div>}
        </div>
      </div>

      <div className="foot">
        <button className="btn ok" onClick={completa}>
          Completa
        </button>
        <div style={{ flex: 1 }} />
        <button className="btn danger" onClick={elimina}>
          Elimina
        </button>
      </div>
    </aside>
  );
}
