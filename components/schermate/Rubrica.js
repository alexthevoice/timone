"use client";

import { useEffect, useMemo, useState } from "react";
import Griglia from "@/components/Griglia";
import { postJson } from "@/lib/useDati";

/**
 * La Rubrica: le persone, coi loro recapiti e i loro task.
 *
 * A sinistra l'elenco, ordinato per cognome; a destra la persona aperta, coi
 * campi modificabili sul posto e sotto i task collegati, aperti e chiusi,
 * cliccabili: portano al pannello del task nel CRM.
 *
 * Il pannello segue l'IDENTIFICATIVO, mai la posizione in lista: mentre è
 * aperto, una cattura può inserire una riga in testa.
 */
const CAMPI = [
  { id: "cognome", nome: "Cognome" },
  { id: "nome", nome: "Nome" },
  { id: "telefono", nome: "Telefono", tipo: "tel" },
  { id: "mail", nome: "Mail", tipo: "email" },
];

const vuota = { cognome: "", nome: "", telefono: "", mail: "", note: "" };

/** "Rossi Anna", o quel che c'è: mai una riga senza niente da leggere. */
const etichetta = (p) =>
  [p.cognome, p.nome].filter(Boolean).join(" ") || p.organizzazione || p.mail || "(senza nome)";

export default function Rubrica({ attiva, dati, ricarica, onApriTask }) {
  const [apertaId, setApertaId] = useState(null);
  const [bozza, setBozza] = useState(null);
  const [nuova, setNuova] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [errore, setErrore] = useState(null);
  const [tutti, setTutti] = useState(null);

  // Il carico della dashboard porta solo i task aperti: qui servono anche i
  // chiusi, che si chiedono a parte quando la schermata si apre (come fa il
  // CRM per la vista Chiusi).
  useEffect(() => {
    if (!attiva) return;
    let vivo = true;
    fetch("/api/task?completati=si", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => vivo && Array.isArray(d.task) && setTutti(d.task))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [attiva, dati]);

  const persone = useMemo(() => {
    const elenco = [...(dati?.persone ?? [])];
    const chiave = (p) => `${p.cognome || p.nome || "zzz"} ${p.nome}`.toLowerCase();
    elenco.sort((a, b) => chiave(a).localeCompare(chiave(b), "it"));
    return elenco;
  }, [dati?.persone]);

  const aperta = persone.find((p) => p.id === apertaId) ?? null;

  // La bozza si riallinea quando cambi persona, non a ogni ricarica: mentre
  // scrivi un telefono, un giro di dati freschi non deve mangiarti le dita.
  useEffect(() => {
    setBozza(aperta ? { ...vuota, ...aperta } : null);
    setErrore(null);
  }, [apertaId]); // eslint-disable-line react-hooks/exhaustive-deps

  const taskDella = (id) =>
    (tutti ?? dati?.task ?? []).filter((t) => (t.personeId ?? []).includes(id));

  const salva = async () => {
    setSalvando(true);
    setErrore(null);
    try {
      if (nuova) {
        const r = await postJson("/api/persone", bozza);
        setNuova(false);
        setApertaId(r.id);
      } else {
        await postJson(`/api/persone/${apertaId}`, bozza, "PATCH");
      }
      await ricarica();
    } catch (e) {
      setErrore(String(e.message || e));
    }
    setSalvando(false);
  };

  const eliminaAperta = async () => {
    if (!aperta) return;
    if (!confirm(`Eliminare ${etichetta(aperta)} dalla Rubrica? I suoi task restano.`)) return;
    setSalvando(true);
    try {
      await postJson(`/api/persone/${aperta.id}`, {}, "DELETE");
      setApertaId(null);
      await ricarica();
    } catch (e) {
      setErrore(String(e.message || e));
    }
    setSalvando(false);
  };

  const apriNuova = () => {
    setNuova(true);
    setApertaId(null);
    setBozza({ ...vuota });
    setErrore(null);
  };

  const compilata = nuova ? bozza : aperta ? bozza : null;

  return (
    <Griglia id="rubrica" attiva={attiva}>
      <section className="card col-4" id="card-rubrica-elenco">
        <header>
          <h2>Rubrica</h2>
          <div className="spacer" />
          <span className="hint num">{persone.length}</span>
          <button className="btn" onClick={apriNuova}>+ nuova</button>
        </header>
        <div className="body">
          <ul className="rubrica-elenco">
            {persone.map((p) => (
              <li key={p.id}>
                <button
                  aria-current={p.id === apertaId}
                  onClick={() => { setNuova(false); setApertaId(p.id); }}
                >
                  <span className="chi">{etichetta(p)}</span>
                  {p.organizzazione && <span className="dove">{p.organizzazione}</span>}
                </button>
              </li>
            ))}
            {persone.length === 0 && (
              <li className="niente">Nessuno in rubrica: la prima persona la scrivi con “+ nuova”.</li>
            )}
          </ul>
        </div>
      </section>

      <section className="card col-8" id="card-rubrica-scheda">
        <header>
          <h2>{nuova ? "Persona nuova" : compilata ? etichetta(compilata) : "La scheda"}</h2>
          <div className="spacer" />
          {!nuova && aperta && (
            <button className="btn danger" onClick={eliminaAperta} disabled={salvando}>
              elimina
            </button>
          )}
        </header>
        <div className="body">
          {!compilata ? (
            <p className="rubrica-vuoto">
              Scegli una persona dall'elenco, o creane una nuova. I task collegati compaiono qui sotto.
            </p>
          ) : (
            <>
              <div className="rubrica-campi">
                {CAMPI.map((c) => (
                  <label key={c.id}>
                    {c.nome}
                    <input
                      type={c.tipo ?? "text"}
                      value={bozza[c.id] ?? ""}
                      onChange={(e) => setBozza((v) => ({ ...v, [c.id]: e.target.value }))}
                    />
                  </label>
                ))}
                <label className="larga">
                  Note
                  <textarea
                    rows={3}
                    value={bozza.note ?? ""}
                    onChange={(e) => setBozza((v) => ({ ...v, note: e.target.value }))}
                  />
                </label>
              </div>
              <div className="rubrica-azioni">
                <button className="btn primary" onClick={salva} disabled={salvando}>
                  {salvando ? "Salvo…" : nuova ? "Crea la persona" : "Salva le modifiche"}
                </button>
                {errore && <span className="male">{errore}</span>}
              </div>

              {!nuova && aperta && (
                <div className="rubrica-task">
                  <h3>I suoi task</h3>
                  {taskDella(aperta.id).length === 0 && (
                    <p className="rubrica-vuoto">Nessun task collegato, per ora.</p>
                  )}
                  <ul>
                    {taskDella(aperta.id).map((t) => (
                      <li key={t.id}>
                        <button
                          onClick={() => onApriTask(t.id)}
                          data-chiuso={Boolean(t.completatoIl)}
                          title="Apri il task nel CRM"
                        >
                          <span className="pallino" />
                          <span className="tit">{t.titolo}</span>
                          <span className="stato">
                            {t.completatoIl ? "chiuso" : t.fascia}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </Griglia>
  );
}
