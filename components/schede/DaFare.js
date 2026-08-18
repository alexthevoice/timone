"use client";

import { useRef, useState } from "react";
import { Croce, Graffetta } from "@/components/Icone";
import { postJson } from "@/lib/useDati";
import { QUADRANTI, etichettaScadenza, giorniAllaScadenza, ordinaPerFare } from "@/lib/quadranti";

/**
 * La to-do vera: cosa fare, in che quadrante sta, entro quando.
 *
 * È l'elenco che i Quadranti mostrano a croce, qui srotolato in colonna e
 * ordinato per priorità. Le due schede leggono gli stessi dati: la croce serve
 * a vedere lo squilibrio, questa a lavorare.
 *
 * Il filtro per quadrante non è un vezzo: "fammi vedere solo il Q2" è la
 * domanda che si fa quando ci si accorge di aver passato la settimana a
 * rincorrere.
 *
 * Il "+" apre la riga per scriverne una nuova. Fino a ieri si poteva solo
 * dettarla alla barra in fondo, che è comodo per una cosa al volo e sbagliato
 * per travasare una lista: lì il modello smista e tu non decidi niente, qui
 * scegli data, etichetta e quadrante mentre scrivi.
 */

const QUANTI = 8;

export default function DaFare({ task, persone = [], oggiIso, modifica, ricarica, onApriTask }) {
  const [filtro, setFiltro] = useState(null);
  const [tutte, setTutte] = useState(false);
  const [aperto, setAperto] = useState(false);

  const inLista = task
    .filter((t) => !filtro || (t.quadrante ?? t.quadranteProposto) === filtro)
    .sort(ordinaPerFare);

  const viste = tutte ? inLista : inLista.slice(0, QUANTI);

  const chiudi = (t) =>
    modifica(
      (d) => ({ ...d, task: d.task.filter((x) => x.id !== t.id) }),
      () => postJson(`/api/task/${t.id}`, { completa: true }, "PATCH")
    ).then(ricarica);

  return (
    <section className="card col-5" id="card-dafare">
      <header>
        <Croce />
        <h2>Da fare</h2>
        <div className="spacer" />
        <div className="filtriq">
          {QUADRANTI.map((q) => (
            <button
              key={q.id}
              className={`fq q${q.id}`}
              aria-current={filtro === q.id}
              title={`${q.nome} · ${q.azione}`}
              onClick={() => setFiltro(filtro === q.id ? null : q.id)}
            >
              {q.id}
            </button>
          ))}
        </div>
        <button
          className="piu"
          aria-pressed={aperto}
          title={aperto ? "Chiudi" : "Aggiungi una cosa da fare"}
          onClick={() => setAperto((v) => !v)}
        >
          {aperto ? "×" : "+"}
        </button>
      </header>

      <div className="body">
        {aperto && (
          <Nuovo
            etichette={[...new Set(task.flatMap((t) => t.tag ?? []))].sort()}
            persone={persone}
            oggiIso={oggiIso}
            ricarica={ricarica}
            onChiudi={() => setAperto(false)}
            onApriTask={onApriTask}
          />
        )}

        {viste.length === 0 ? (
          <div style={{ color: "var(--text-faint)", fontSize: 13, padding: "8px 0" }}>
            {filtro ? `Niente in ${filtro}.` : "Lista vuota."}
          </div>
        ) : (
          <div className="todo">
            {viste.map((t) => {
              const scadenza = etichettaScadenza(t.scadenza, oggiIso);
              const q = t.quadrante ?? t.quadranteProposto;
              return (
                <div className="riga" key={t.id}>
                  <span
                    className="box"
                    title="Fatto"
                    onClick={() => chiudi(t)}
                    style={{ cursor: "pointer" }}
                  />
                  <span className={`prio p${t.priorita ?? t.prioritaProposta}`}>
                    {t.priorita ?? t.prioritaProposta}
                  </span>
                  <span className="t" onClick={() => onApriTask(t.id)}>
                    {t.titolo}
                  </span>
                  {(t.persone ?? []).length > 0 && <span className="p">{t.persone.join(" · ")}</span>}
                  <span className={`qbadge q${q}`} data-proposto={!t.quadrante || undefined}>
                    {q}
                  </span>
                  <span className={`scad ${scadenza?.tono ?? ""}`}>
                    {scadenza ? scadenza.testo : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="foot">
        <span>
          {inLista.length} {inLista.length === 1 ? "cosa" : "cose"}
          {filtro ? ` in ${filtro}` : ""}
        </span>
        <div style={{ flex: 1 }} />
        {inLista.length > QUANTI && (
          <button className="btn" onClick={() => setTutte((v) => !v)}>
            {tutte ? "mostra le prime otto" : `mostra tutte (${inLista.length})`}
          </button>
        )}
      </div>
    </section>
  );
}

/**
 * La fascia dedotta dalla scadenza.
 *
 * Senza una data resta quella di sempre e non si inventa niente. Con una data
 * la fascia è già scritta lì dentro, e farla scegliere a mano vorrebbe dire
 * poter mettere "più avanti" a una cosa che scade domani.
 */
function fasciaDa(scadenza, oggiIso) {
  const giorni = giorniAllaScadenza(scadenza, oggiIso);
  if (giorni === null) return undefined;
  if (giorni <= 0) return "oggi";
  return giorni <= 7 ? "settimana" : "avanti";
}

/**
 * La riga per scriverne una nuova.
 *
 * Dopo il salvataggio resta aperta e tiene data, etichetta e quadrante: una
 * lista si travasa di fila, e rimettere "casa" venti volte è il modo più
 * sicuro perché alla quinta si smetta di metterla. Si azzerano solo il titolo
 * e il file, che sono le due cose che cambiano ogni volta.
 *
 * Il file si sceglie qui ma si carica dopo: l'allegato ha bisogno di una riga a
 * cui attaccarsi, quindi prima nasce il task e subito dopo parte il file. Se il
 * caricamento fallisce il task resta, e lo dice: perdere il titolo appena
 * scritto perché una foto era troppo grande sarebbe la punizione sbagliata.
 */
function Nuovo({ etichette, persone = [], oggiIso, ricarica, onChiudi, onApriTask }) {
  const [titolo, setTitolo] = useState("");
  const [scadenza, setScadenza] = useState("");
  const [quadrante, setQuadrante] = useState(null);
  const [etichetta, setEtichetta] = useState("");
  const [persona, setPersona] = useState("");
  const [file, setFile] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [errore, setErrore] = useState(null);
  const [ultimo, setUltimo] = useState(null);
  const campoTitolo = useRef(null);
  const campoFile = useRef(null);

  const salva = async () => {
    const nome = titolo.trim();
    if (!nome || salvando) return;
    setSalvando(true);
    setErrore(null);
    try {
      const { id } = await postJson("/api/task", {
        titolo: nome,
        scadenza: scadenza || undefined,
        quadrante: quadrante ?? undefined,
        tag: etichetta.trim() ? [etichetta.trim()] : undefined,
        persona: persona.trim() || undefined,
        fascia: fasciaDa(scadenza || null, oggiIso),
      });

      if (file && id) {
        const modulo = new FormData();
        modulo.append("file", file);
        const r = await fetch(`/api/task/${id}/allegati`, { method: "POST", body: modulo });
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          setErrore(`"${nome}" è stato creato, ma il file no: ${d.errore ?? r.status}`);
        }
      }

      setUltimo({ id, titolo: nome });
      setTitolo("");
      setFile(null);
      if (campoFile.current) campoFile.current.value = "";
      campoTitolo.current?.focus();
      await ricarica();
    } catch (e) {
      setErrore(e.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="nuovo">
      <input
        ref={campoTitolo}
        className="titolo"
        autoFocus
        value={titolo}
        onChange={(e) => setTitolo(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") salva();
          if (e.key === "Escape") onChiudi();
        }}
        placeholder="Cosa c'è da fare?"
      />

      <div className="riga2">
        <input
          type="date"
          value={scadenza}
          onChange={(e) => setScadenza(e.target.value)}
          title="Scadenza"
        />

        <div className="chips">
          {QUADRANTI.map((q) => (
            <span
              key={q.id}
              className={`chip q${q.id}`}
              aria-pressed={quadrante === q.id}
              title={`${q.nome} · ${q.azione}`}
              onClick={() => setQuadrante(quadrante === q.id ? null : q.id)}
            >
              {q.id}
            </span>
          ))}
        </div>

        <input
          className="etichetta"
          list="etichette-note"
          value={etichetta}
          onChange={(e) => setEtichetta(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && salva()}
          placeholder="etichetta"
        />
        <datalist id="etichette-note">
          {etichette.map((e) => (
            <option key={e} value={e} />
          ))}
        </datalist>

        {/* Il nome si può anche scrivere per esteso: se in rubrica non c'è,
            la persona nasce con questa cosa da fare. L'elenco serve a non
            farne nascere due con la stessa faccia e una lettera diversa. */}
        <input
          className="etichetta persona"
          list="persone-note"
          value={persona}
          onChange={(e) => setPersona(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && salva()}
          placeholder="persona"
        />
        <datalist id="persone-note">
          {persone.map((p) => (
            <option key={p.id ?? p.nome} value={p.nome} />
          ))}
        </datalist>

        <label className="file" title={file ? file.name : "Allega un file o una foto"}>
          <Graffetta />
          <span>{file ? file.name.slice(0, 18) : "allega"}</span>
          <input
            ref={campoFile}
            type="file"
            hidden
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <button className="btn primary" onClick={salva} disabled={!titolo.trim() || salvando}>
          {salvando ? "…" : "Aggiungi"}
        </button>
      </div>

      {errore && <div className="gate-err">{errore}</div>}

      <div className="aiuto">
        Invio salva e resta qui per la prossima: data, quadrante, etichetta e persona restano come
        li hai messi.
        {ultimo && (
          <>
            {" "}
            Ultima: <b>{ultimo.titolo}</b>{" "}
            <button className="mini" onClick={() => onApriTask(ultimo.id)}>
              aprila
            </button>
          </>
        )}
      </div>
    </div>
  );
}
