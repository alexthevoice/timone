"use client";

import { useEffect, useState } from "react";
import Griglia from "@/components/Griglia";
import { leggiBlocco } from "@/lib/incolla";
import { MODULI, SCHEDE_HOME, SCHEMI } from "@/lib/moduli";
import { postJson } from "@/lib/useDati";
import { STORICO, VERSIONE } from "@/lib/versione";

/**
 * Config: il posto delle impostazioni, una alla volta.
 *
 * Qui si governa l'interfaccia: quali moduli sono accesi, in che ordine
 * stanno il menu e la Home, di che colore è la casa. Il nome del sistema
 * NON sta qui: si sceglie nel wizard del primo accesso, che da qui si può
 * rifare (coi valori già compilati). Spegnere un modulo non cancella mai
 * niente: toglie la vista, i dati restano.
 */
export default function Config({ attiva, dati, interfaccia, ricarica }) {
  const salvaInterfaccia = async (patch) => {
    await postJson("/api/profilo", { interfaccia: { ...interfaccia, ...patch } }, "PATCH");
    await ricarica();
  };

  return (
    <Griglia id="config" attiva={attiva}>
      <Aspetto interfaccia={interfaccia} salva={salvaInterfaccia} />
      <Moduli interfaccia={interfaccia} salva={salvaInterfaccia} />
      <OrdineMenu interfaccia={interfaccia} salva={salvaInterfaccia} />
      <OrdineHome interfaccia={interfaccia} salva={salvaInterfaccia} />
      <Utente profilo={dati?.profilo} ricarica={ricarica} />
      <Abitudini profilo={dati?.profilo} ricarica={ricarica} />
      <CambioPassword />
      <Versione ricarica={ricarica} />
    </Griglia>
  );
}

/* --------------------------------------------------------------- aspetto */

const TEMI = [
  { id: "chiaro", nome: "Chiaro" },
  { id: "scuro", nome: "Scuro" },
  { id: "sistema", nome: "Come il sistema" },
];

function Aspetto({ interfaccia, salva }) {
  const [tema, setTema] = useState("sistema");
  useEffect(() => {
    const salvato = localStorage.getItem("tema");
    if (salvato === "chiaro" || salvato === "scuro") setTema(salvato);
  }, []);

  const scegliTema = (id) => {
    setTema(id);
    if (id === "sistema") {
      localStorage.removeItem("tema");
      delete document.documentElement.dataset.tema;
    } else {
      localStorage.setItem("tema", id);
      document.documentElement.dataset.tema = id;
    }
  };

  const scegliSchema = async (id) => {
    if (id === "navy") {
      delete document.documentElement.dataset.schema;
      localStorage.removeItem("schema");
    } else {
      document.documentElement.dataset.schema = id;
      localStorage.setItem("schema", id);
    }
    await salva({ tema: { schema: id } });
  };

  return (
    <section className="card col-6">
      <header>
        <h2>Aspetto</h2>
        <div className="spacer" />
        <span className="hint">lo schema è tuo ovunque, la luce vale per questo browser</span>
      </header>
      <div className="body">
        <div className="scelta-schemi">
          {SCHEMI.map((s) => (
            <button key={s.id} aria-pressed={interfaccia.tema.schema === s.id} onClick={() => scegliSchema(s.id)}>
              <span className="pallini">
                {s.pallini.map((c) => (
                  <i key={c} style={{ background: c }} />
                ))}
              </span>
              {s.nome}
            </button>
          ))}
        </div>
        <div className="scelte-tema" style={{ marginTop: 12 }}>
          {TEMI.map((t) => (
            <button key={t.id} aria-pressed={tema === t.id} onClick={() => scegliTema(t.id)}>
              {t.nome}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- moduli */

function Moduli({ interfaccia, salva }) {
  return (
    <section className="card col-6">
      <header>
        <h2>Moduli</h2>
        <div className="spacer" />
        <span className="hint">spegnere non cancella niente: i dati restano</span>
      </header>
      <div className="body">
        <div className="scelta-moduli">
          {MODULI.map((m) => (
            <label key={m.id}>
              <input
                type="checkbox"
                checked={interfaccia.moduli[m.id] !== false}
                onChange={(e) => salva({ moduli: { ...interfaccia.moduli, [m.id]: e.target.checked } })}
              />
              {m.nome}
            </label>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------- ordine del menu */

function sposta(lista, indice, verso) {
  const nuovo = [...lista];
  const a = indice + verso;
  if (a < 0 || a >= nuovo.length) return lista;
  [nuovo[indice], nuovo[a]] = [nuovo[a], nuovo[indice]];
  return nuovo;
}

function OrdineMenu({ interfaccia, salva }) {
  return (
    <section className="card col-6">
      <header>
        <h2>Il menu</h2>
        <div className="spacer" />
        <span className="hint">Home sta in cima e Config in fondo, il resto lo ordini tu</span>
      </header>
      <div className="body">
        <div className="riordino">
          {interfaccia.menu.map((id, i) => {
            const m = MODULI.find((x) => x.id === id);
            if (!m?.schermata) return null;
            const spento = interfaccia.moduli[id] === false;
            return (
              <div className="voce" key={id} data-spenta={spento}>
                <span className="n">{m.nome}</span>
                {spento && <span className="hint">spento</span>}
                <button onClick={() => salva({ menu: sposta(interfaccia.menu, i, -1) })} title="Su">↑</button>
                <button onClick={() => salva({ menu: sposta(interfaccia.menu, i, 1) })} title="Giù">↓</button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------ sezioni della Home */

function OrdineHome({ interfaccia, salva }) {
  return (
    <section className="card col-6">
      <header>
        <h2>La Home</h2>
        <div className="spacer" />
        <span className="hint">le sezioni, nell&apos;ordine che vuoi tu</span>
      </header>
      <div className="body">
        <div className="riordino">
          {interfaccia.home.map((id, i) => {
            const s = SCHEDE_HOME.find((x) => x.id === id);
            if (!s) return null;
            const spenta = s.modulo && interfaccia.moduli[s.modulo] === false;
            return (
              <div className="voce" key={id} data-spenta={spenta}>
                <span className="n">{s.nome}</span>
                {spenta && <span className="hint">col modulo spento</span>}
                <button onClick={() => salva({ home: sposta(interfaccia.home, i, -1) })} title="Su">↑</button>
                <button onClick={() => salva({ home: sposta(interfaccia.home, i, 1) })} title="Giù">↓</button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- utente */

function Utente({ profilo, ricarica }) {
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [esito, setEsito] = useState(null);

  // I campi si riempiono quando il profilo arriva, ma senza calpestare
  // quello che stai scrivendo: solo finché sono ancora vuoti.
  useEffect(() => {
    if (profilo && nome === "" && cognome === "") {
      setNome(profilo.nome ?? "");
      setCognome(profilo.cognome ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profilo]);

  const salva = async () => {
    setEsito(null);
    try {
      await postJson("/api/profilo", { nome: nome.trim(), cognome: cognome.trim() }, "PATCH");
      setEsito({ ok: true, testo: "Salvato." });
      await ricarica?.();
    } catch (e) {
      setEsito({ ok: false, testo: e.message });
    }
  };

  return (
    <section className="card col-6">
      <header>
        <h2>Utente</h2>
        <div className="spacer" />
        <span className="hint">il nome del sistema si sceglie rifacendo il wizard</span>
      </header>
      <div className="body">
        <div className="modulo-config">
          <label>
            Nome
            <input value={nome} onChange={(e) => setNome(e.target.value)} />
          </label>
          <label>
            Cognome
            <input value={cognome} onChange={(e) => setCognome(e.target.value)} />
          </label>
          <button className="btn-salva" onClick={salva}>
            Salva
          </button>
          {esito && <span className={`esito ${esito.ok ? "ok" : "male"}`}>{esito.testo}</span>}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- abitudini */

/**
 * Le abitudini da tracciare: fin qui si cambiavano solo a mano su Airtable.
 * Il blocco lo scrive l'AI dell'utente col prompt pronto della guida, e si
 * incolla qui: la scheda in Home si aggiorna al salvataggio.
 */
function Abitudini({ profilo, ricarica }) {
  const [testo, setTesto] = useState("");
  const [esito, setEsito] = useState(null);

  const attuali = profilo?.abitudini ?? [];

  const salva = async () => {
    setEsito(null);
    const { valore, errore } = leggiBlocco(testo);
    if (errore) return setEsito({ ok: false, testo: errore });
    const lista = Array.isArray(valore) ? valore : valore?.abitudini;
    if (!Array.isArray(lista) || !lista.length) {
      return setEsito({ ok: false, testo: 'Il blocco deve essere un elenco di abitudini. Rincolla questo messaggio alla tua AI.' });
    }
    const storte = lista.filter(
      (a) => !a?.id || !a?.nome || !["spunta", "contatore"].includes(a?.tipo) || (a.tipo === "contatore" && !(Number(a.obiettivo) > 0))
    );
    if (storte.length) {
      return setEsito({
        ok: false,
        testo: `Ogni abitudine vuole id, nome e tipo ("spunta" o "contatore", il contatore con un obiettivo maggiore di zero). Non tornano: ${storte.map((a) => a?.nome ?? a?.id ?? "?").join(", ")}.`,
      });
    }
    try {
      await postJson("/api/profilo", { abitudini: lista }, "PATCH");
      setTesto("");
      setEsito({ ok: true, testo: "Salvate: le trovi nella scheda Abitudini in Home." });
      await ricarica?.();
    } catch (e) {
      setEsito({ ok: false, testo: e.message });
    }
  };

  return (
    <section className="card col-6">
      <header>
        <h2>Abitudini</h2>
        <div className="spacer" />
        <span className="hint">il prompt per fartele scrivere dalla tua AI è nella guida</span>
      </header>
      <div className="body">
        <div className="modulo-config">
          <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
            {attuali.length
              ? `Adesso tracci: ${attuali.map((a) => a.nome).join(", ")}.`
              : "Non stai ancora tracciando nessuna abitudine."}
          </div>
          <textarea
            value={testo}
            onChange={(e) => setTesto(e.target.value)}
            placeholder={'[ { "id": "acqua", "nome": "Acqua", "tipo": "contatore", "obiettivo": 8 } ]'}
            rows={5}
            style={{
              width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 12.5,
              fontFamily: "var(--font-mono)", background: "var(--surface-2)",
              border: "1px solid var(--border)", outline: "none", color: "var(--text)", resize: "vertical",
            }}
          />
          <button className="btn-salva" onClick={salva}>
            Sostituisci le abitudini
          </button>
          {esito && <span className={`esito ${esito.ok ? "ok" : "male"}`}>{esito.testo}</span>}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- password */

function CambioPassword() {
  const [attuale, setAttuale] = useState("");
  const [nuova, setNuova] = useState("");
  const [conferma, setConferma] = useState("");
  const [esito, setEsito] = useState(null);

  const cambia = async () => {
    setEsito(null);
    if (nuova !== conferma) {
      setEsito({ ok: false, testo: "La conferma non coincide con la nuova password." });
      return;
    }
    try {
      await postJson("/api/auth/password", { attuale, nuova });
      setAttuale("");
      setNuova("");
      setConferma("");
      setEsito({ ok: true, testo: "Password cambiata: dal prossimo accesso vale la nuova." });
    } catch (e) {
      setEsito({ ok: false, testo: e.message });
    }
  };

  return (
    <section className="card col-6">
      <header>
        <h2>Password</h2>
        <div className="spacer" />
        <span className="hint">serve quella attuale, e la nuova due volte</span>
      </header>
      <div className="body">
        <div className="modulo-config">
          <label>
            Password attuale
            <input type="password" value={attuale} onChange={(e) => setAttuale(e.target.value)} autoComplete="current-password" />
          </label>
          <label>
            Nuova password
            <input type="password" value={nuova} onChange={(e) => setNuova(e.target.value)} autoComplete="new-password" />
          </label>
          <label>
            Ripeti la nuova
            <input type="password" value={conferma} onChange={(e) => setConferma(e.target.value)} autoComplete="new-password" />
          </label>
          <button className="btn-salva" onClick={cambia}>
            Cambia password
          </button>
          {esito && <span className={`esito ${esito.ok ? "ok" : "male"}`}>{esito.testo}</span>}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- versione */

function Versione({ ricarica }) {
  const rifaiWizard = async () => {
    if (!window.confirm("Rifare la configurazione iniziale? I valori attuali restano precompilati.")) return;
    await postJson("/api/profilo", { configurato: false }, "PATCH");
    await ricarica?.();
  };

  return (
    <section className="card col-6">
      <header>
        <h2>Versione {VERSIONE}</h2>
        <div className="spacer" />
        <span className="hint">un giro, una riga</span>
      </header>
      <div className="body">
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 360, overflowY: "auto" }}>
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
      <div className="foot">
        <button className="btn" onClick={rifaiWizard}>
          Rifai la configurazione iniziale
        </button>
        <div style={{ flex: 1 }} />
        <span>nome, moduli e colori, coi valori già compilati</span>
      </div>
    </section>
  );
}
