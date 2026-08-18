"use client";

import { useEffect, useState } from "react";
import Griglia from "@/components/Griglia";
import PannelloTask from "@/components/PannelloTask";
import { Lente } from "@/components/Icone";
import { postJson } from "@/lib/useDati";
import { etichettaScadenza } from "@/lib/quadranti";

const FASCE = [
  { id: "ritardo", nome: "In ritardo", temp: "hot" },
  { id: "oggi", nome: "Oggi", temp: "warm" },
  { id: "settimana", nome: "Questa settimana", temp: "cold" },
  { id: "avanti", nome: "Più avanti", temp: "cold" },
];

const CHIAVE_VISTA = "dashboard.crm.vista";

function Carta({ e, oggiIso, onApri, onTrascina }) {
  const scadenza = etichettaScadenza(e.scadenza, oggiIso);
  return (
    <div
      className="tcard"
      draggable
      onDragStart={(ev) => {
        ev.dataTransfer.setData("text/plain", e.id);
        onTrascina(e.id);
      }}
      onClick={() => onApri(e.id)}
    >
      <div className="t">
        <span className={`prio p${e.priorita ?? e.prioritaProposta}`}>
          {e.priorita ?? e.prioritaProposta}
        </span>
        {e.titolo}
      </div>
      <div className="row">
        <span className={`temp ${e.temperatura}`} />
        <span className="p">{(e.persone ?? []).join(" · ") || "—"}</span>
        <span
          className={`qbadge q${e.quadrante ?? e.quadranteProposto}`}
          data-proposto={!e.quadrante || undefined}
        >
          {e.quadrante ?? e.quadranteProposto}
        </span>
        {scadenza && <span className={`scad ${scadenza.tono}`}>{scadenza.testo}</span>}
        {(e.tag ?? []).map((t) => (
          <span className="tag" key={t}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Le cose chiuse, e il modo di rimetterle in piedi.
 *
 * Non stanno nel carico della dashboard e si leggono solo quando si apre questa
 * vista: sono il grosso dell'archivio e crescono per sempre, mentre il resto
 * della Home ha bisogno solo di quello che è ancora aperto.
 *
 * Riaprire non ricrea niente: toglie la data di chiusura dalla stessa riga, che
 * si riprende i suoi allegati, la sua persona e il suo posto. Rifarla da capo
 * vorrebbe dire perdere tutto quello che ci era attaccato.
 */
function Chiusi({ ricarica }) {
  const [righe, setRighe] = useState(null);
  const [lavoro, setLavoro] = useState(null);

  const leggi = async () => {
    const r = await fetch("/api/task?completati=si", { cache: "no-store" });
    const d = await r.json().catch(() => ({}));
    setRighe(
      (d.task ?? [])
        .filter((t) => t.completatoIl)
        .sort((a, b) => String(b.completatoIl).localeCompare(String(a.completatoIl)))
    );
  };

  useEffect(() => {
    leggi();
  }, []);

  const riapri = async (t) => {
    setLavoro(t.id);
    try {
      await postJson(`/api/task/${t.id}`, { completa: false }, "PATCH");
      await leggi();
      // La lista aperta sta da un'altra parte: senza questa, la cosa riaperta
      // ricompare nel CRM solo al prossimo caricamento della pagina.
      await ricarica();
    } finally {
      setLavoro(null);
    }
  };

  if (righe === null) {
    return (
      <div style={{ color: "var(--text-faint)", fontSize: 13, padding: "12px 2px" }}>
        Sto leggendo l&apos;archivio…
      </div>
    );
  }

  if (righe.length === 0) {
    return (
      <div style={{ color: "var(--text-faint)", fontSize: 13, padding: "12px 2px" }}>
        Non hai ancora chiuso niente.
      </div>
    );
  }

  return (
    <div className="chiusi">
      {righe.map((t) => (
        <div className="riga" key={t.id}>
          <span className="quando num">{String(t.completatoIl).slice(0, 10).split("-").reverse().slice(0, 2).join("/")}</span>
          <span className="t">{t.titolo}</span>
          {t.persona && <span className="p">{t.persona}</span>}
          {(t.tag ?? []).map((x) => (
            <span className="tag" key={x}>
              {x}
            </span>
          ))}
          <button className="mini" disabled={lavoro === t.id} onClick={() => riapri(t)}>
            {lavoro === t.id ? "…" : "riapri"}
          </button>
        </div>
      ))}
    </div>
  );
}

export default function Crm({ attiva, dati, modifica, ricarica, aperto, onAperto }) {
  const [vista, setVista] = useState("kanban");
  const [domanda, setDomanda] = useState("");
  const [filtro, setFiltro] = useState(null);
  const [inVolo, setInVolo] = useState(null);

  // La vista scelta sopravvive al ricaricamento: se ogni mattina la dashboard
  // si è dimenticata come la vuoi, ogni mattina paghi un piccolo pedaggio.
  useEffect(() => {
    const salvata = localStorage.getItem(CHIAVE_VISTA);
    if (salvata) setVista(salvata);
  }, []);
  useEffect(() => {
    localStorage.setItem(CHIAVE_VISTA, vista);
  }, [vista]);

  if (!dati) {
    return (
      <Griglia id="crm" attiva={attiva}>
        <section className="card col-12">
          <div className="body" style={{ padding: 16, color: "var(--text-faint)" }}>
            Sto leggendo i tuoi dati…
          </div>
        </section>
      </Griglia>
    );
  }

  const tutti = dati.task;
  const visibili = filtro ? tutti.filter((t) => filtro.includes(t.id)) : tutti;

  // Il pannello segue l'IDENTIFICATIVO, mai la posizione in lista: mentre è
  // aperto, una cattura può inserire una riga in testa e da quel momento
  // staresti modificando l'elemento sbagliato.
  const elemento = tutti.find((t) => t.id === aperto) ?? null;

  // Chi ha almeno una cosa, più il gruppo di chi non ha nessuno: una cosa
  // assegnata a due persone compare sotto tutte e due, perché riguarda tutte e due.
  const persone = [...new Set(tutti.flatMap((t) => ((t.persone ?? []).length ? t.persone : [null])))].sort((a, b) => {
    if (a === null) return 1;
    if (b === null) return -1;
    return a.localeCompare(b, "it");
  });

  const spostaInFascia = async (id, fascia) => {
    const dentro = tutti.filter((t) => t.fascia === fascia && t.id !== id).map((t) => t.id);
    const ordine = [id, ...dentro];
    await modifica(
      (d) => ({
        ...d,
        task: d.task.map((t) => (t.id === id ? { ...t, fascia, posizione: -1 } : t)),
      }),
      () => postJson("/api/task", { fascia, ordine }, "PATCH")
    );
    await ricarica();
  };

  const cerca = async () => {
    const q = domanda.trim();
    if (!q) return setFiltro(null);
    try {
      const d = await postJson("/api/cerca", { domanda: q });
      setFiltro(d.id ?? []);
    } catch {
      // La ricerca non si rompe mai: al massimo diventa meno intelligente.
      const testo = q.toLowerCase();
      setFiltro(
        tutti
          .filter((t) =>
            [t.titolo, t.nota, t.persona, ...(t.tag ?? [])]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(testo)
          )
          .map((t) => t.id)
      );
    }
  };

  return (
    <>
      <Griglia id="crm" attiva={attiva}>
        <section className="card col-12" id="card-crm">
          <header>
            <h2>CRM</h2>
            <div className="spacer" />
            <span className="hint">{visibili.length} elementi</span>
            <div className="views">
              <button aria-current={vista === "kanban"} onClick={() => setVista("kanban")}>
                Kanban
              </button>
              <button aria-current={vista === "persona"} onClick={() => setVista("persona")}>
                Per persona
              </button>
              <button aria-current={vista === "chiusi"} onClick={() => setVista("chiusi")}>
                Chiusi
              </button>
            </div>
          </header>
          <div className="body">
            <div className="search">
              <Lente />
              <input
                value={domanda}
                onChange={(e) => setDomanda(e.target.value)}
                onKeyDown={(e) => {
                  // Solo a Invio, mai mentre digiti: ogni tasto sarebbe una chiamata.
                  if (e.key === "Enter") cerca();
                  if (e.key === "Escape") {
                    setDomanda("");
                    setFiltro(null);
                  }
                }}
                placeholder="Cosa posso chiudere in dieci minuti mentre aspetto il treno?"
              />
              {filtro ? (
                <button
                  className="pill"
                  onClick={() => {
                    setDomanda("");
                    setFiltro(null);
                  }}
                >
                  togli il filtro
                </button>
              ) : (
                <span className="pill">Invio</span>
              )}
            </div>

            {/* I chiusi vengono per primi apposta: quando non è rimasto niente
                di aperto, "il CRM è vuoto" nascondeva proprio la vista che
                serve per riprendersi quello che si è chiuso per sbaglio. */}
            {vista === "chiusi" ? (
              <Chiusi ricarica={ricarica} />
            ) : tutti.length === 0 ? (
              <div style={{ color: "var(--text-faint)", fontSize: 13, padding: "12px 2px" }}>
                Non c&apos;è niente di aperto. Quello che hai chiuso sta in <b>Chiusi</b>, qui
                sopra, e da lì si rimette in piedi con un clic. Per aggiungere: il <b>+</b> nella
                scheda Da fare in Home, o la barra qui in fondo.
              </div>
            ) : vista === "kanban" ? (
              <div className="kanban">
                {FASCE.map((f) => {
                  const dentro = visibili.filter((e) => e.fascia === f.id);
                  return (
                    <div
                      className="col"
                      key={f.id}
                      onDragOver={(ev) => ev.preventDefault()}
                      onDrop={(ev) => {
                        ev.preventDefault();
                        const id = ev.dataTransfer.getData("text/plain") || inVolo;
                        if (id) spostaInFascia(id, f.id);
                        setInVolo(null);
                      }}
                    >
                      <h3>
                        <span className={`temp ${f.temp}`} /> {f.nome}
                        <span className="n">{dentro.length}</span>
                      </h3>
                      <div className="cards">
                        {dentro.map((e) => (
                          <Carta key={e.id} e={e} oggiIso={dati.oggi} onApri={onAperto} onTrascina={setInVolo} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="byperson">
                {persone.map((p) => {
                  const dentro = visibili.filter((e) =>
                    p === null ? !(e.persone ?? []).length : (e.persone ?? []).includes(p)
                  );
                  if (dentro.length === 0) return null;
                  return (
                    <div className="pgroup" key={p ?? "senza"}>
                      <h3>
                        {p ?? "Senza persona"}
                        <span className="n">{dentro.length}</span>
                      </h3>
                      <div className="cards">
                        {dentro.map((e) => (
                          <Carta key={e.id} e={e} oggiIso={dati.oggi} onApri={onAperto} onTrascina={setInVolo} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </Griglia>

      {attiva && elemento && (
        <PannelloTask
          elemento={elemento}
          etichette={[...new Set(tutti.flatMap((t) => t.tag ?? []))].sort()}
          persone={dati.persone ?? []}
          modifica={modifica}
          ricarica={ricarica}
          onChiudi={() => onAperto(null)}
        />
      )}
    </>
  );
}
