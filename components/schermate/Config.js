"use client";

import { useEffect, useState } from "react";
import Griglia from "@/components/Griglia";
import { postJson } from "@/lib/useDati";
import { STORICO, VERSIONE } from "@/lib/versione";

/**
 * Config: il posto delle impostazioni, una alla volta.
 *
 * Oggi ci sono le prime due vere: il tema (chiaro, scuro, o come il
 * sistema, salvato sul browser) e i dati dell'utente, nome, cognome e il
 * cambio della password. La password nuova finisce su Airtable come hash e
 * da lì in poi vince su quella delle variabili d'ambiente, che resta la via
 * di recupero: svuotare il campo PasswordHash sul Profilo la fa tornare
 * valida.
 */
export default function Config({ attiva, dati, ricarica }) {
  return (
    <Griglia id="config" attiva={attiva}>
      <SceltaTema />
      <Utente profilo={dati?.profilo} ricarica={ricarica} />
      <CambioPassword />
      <Versione />
    </Griglia>
  );
}

/* ------------------------------------------------------------------ tema */

const TEMI = [
  { id: "chiaro", nome: "Chiaro" },
  { id: "scuro", nome: "Scuro" },
  { id: "sistema", nome: "Come il sistema" },
];

function SceltaTema() {
  // Parte da "sistema" e legge la scelta vera solo sul browser: il server
  // non conosce il localStorage, e i due disegni devono coincidere.
  const [tema, setTema] = useState("sistema");
  useEffect(() => {
    const salvato = localStorage.getItem("tema");
    if (salvato === "chiaro" || salvato === "scuro") setTema(salvato);
  }, []);

  const scegli = (id) => {
    setTema(id);
    if (id === "sistema") {
      localStorage.removeItem("tema");
      delete document.documentElement.dataset.tema;
    } else {
      localStorage.setItem("tema", id);
      document.documentElement.dataset.tema = id;
    }
  };

  return (
    <section className="card col-6">
      <header>
        <h2>Tema</h2>
        <div className="spacer" />
        <span className="hint">vale per questo browser</span>
      </header>
      <div className="body">
        <div className="scelte-tema">
          {TEMI.map((t) => (
            <button key={t.id} aria-pressed={tema === t.id} onClick={() => scegli(t.id)}>
              {t.nome}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- utente */

function Utente({ profilo, ricarica }) {
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [nomeSistema, setNomeSistema] = useState("");
  const [esito, setEsito] = useState(null);

  // I campi si riempiono quando il profilo arriva, ma senza calpestare
  // quello che stai scrivendo: solo finché sono ancora vuoti.
  useEffect(() => {
    if (profilo && nome === "" && cognome === "" && nomeSistema === "") {
      setNome(profilo.nome ?? "");
      setCognome(profilo.cognome ?? "");
      setNomeSistema(profilo.nomeSistema ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profilo]);

  const salva = async () => {
    setEsito(null);
    try {
      await postJson(
        "/api/profilo",
        { nome: nome.trim(), cognome: cognome.trim(), nomeSistema: nomeSistema.trim() },
        "PATCH"
      );
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
        <span className="hint">chi sei, per il Profilo</span>
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
          <label>
            Nome del sistema
            <input
              value={nomeSistema}
              onChange={(e) => setNomeSistema(e.target.value)}
              placeholder="vuoto = quello di partenza"
            />
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

function Versione() {
  return (
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
  );
}
