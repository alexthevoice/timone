"use client";

import { useEffect, useRef, useState } from "react";
import { Invia, Microfono } from "@/components/Icone";
import { postJson } from "@/lib/useDati";

const NOME_DESTINAZIONE = {
  task: "nei task",
  persone: "nel CRM",
  finanze: "nelle finanze",
  obiettivi: "negli obiettivi",
  memoria: "in memoria",
};

const TESTO_STATO = {
  riposo: "pronto",
  ascolto: "ti ascolto…",
  elaborazione: "smisto…",
  domanda: "cerco…",
};

/**
 * Domanda o cosa da archiviare?
 *
 * Sta tutto nella stessa barra perché è come funziona nella tua testa: non
 * decidi in anticipo se quello che stai per dire è un'informazione o una
 * domanda. Lo dici e basta.
 */
const PAROLE_INTERROGATIVE =
  /^(chi|cosa|che|come|quando|dove|perch[ée]|quanto|quanti|quante|quale|quali|mi ricordi|ricordami|dimmi|fammi sapere|c'?[eè]|ci sono|ho gi[àa])\b/i;

function èUnaDomanda(testo) {
  const t = testo.trim();
  return t.endsWith("?") || PAROLE_INTERROGATIVE.test(t);
}

export default function BarraCattura({ onCatturato }) {
  const [stato, setStato] = useState("riposo");
  const [testo, setTesto] = useState("");
  const [esito, setEsito] = useState(null);
  const [risposta, setRisposta] = useState(null);
  const riconoscimento = useRef(null);
  const campo = useRef(null);

  // Il riconoscimento vocale è quello del browser: niente da installare e
  // niente servizi di terzi. Funziona bene nella famiglia Chrome e a macchia
  // di leopardo altrove — e l'audio esce comunque verso i server del browser.
  useEffect(() => {
    const Riconoscitore =
      typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!Riconoscitore) return;

    const r = new Riconoscitore();
    r.lang = "it-IT";
    r.interimResults = true;
    r.continuous = false;

    r.onresult = (e) => {
      setTesto(
        Array.from(e.results)
          .map((x) => x[0].transcript)
          .join("")
      );
    };
    r.onend = () => setStato((s) => (s === "ascolto" ? "riposo" : s));
    r.onerror = () => setStato("riposo");

    riconoscimento.current = r;
    return () => r.abort?.();
  }, []);

  useEffect(() => {
    const esc = (e) => e.key === "Escape" && setRisposta(null);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, []);

  const microfono = () => {
    const r = riconoscimento.current;
    if (!r) {
      setEsito("il microfono qui non c'è");
      setTimeout(() => setEsito(null), 2500);
      return;
    }
    if (stato === "ascolto") {
      r.stop();
      setStato("riposo");
    } else {
      setTesto("");
      setStato("ascolto");
      r.start();
    }
  };

  const invia = async () => {
    const pulito = testo.trim();
    if (!pulito || stato === "elaborazione" || stato === "domanda") return;

    if (èUnaDomanda(pulito)) return chiedi(pulito);
    return archivia(pulito);
  };

  const archivia = async (pulito) => {
    setStato("elaborazione");
    setEsito(null);
    try {
      const d = await postJson("/api/cattura", {
        testo: pulito,
        provenienza: stato === "ascolto" ? "voce" : "dashboard",
      });
      setTesto("");
      setEsito(`finita ${NOME_DESTINAZIONE[d.destinazione] ?? d.destinazione}`);
      onCatturato?.();
    } catch (e) {
      setEsito(`non salvata: ${e.message}`);
    } finally {
      setStato("riposo");
      setTimeout(() => setEsito(null), 3000);
      campo.current?.focus();
    }
  };

  const chiedi = async (pulito) => {
    setStato("domanda");
    setEsito(null);
    setRisposta({ domanda: pulito, testo: null });
    try {
      const d = await postJson("/api/domande", { domanda: pulito });
      setRisposta({ domanda: pulito, testo: d.risposta, voci: d.voci });
      setTesto("");
    } catch (e) {
      setRisposta({ domanda: pulito, errore: e.message });
    } finally {
      setStato("riposo");
    }
  };

  return (
    <div className="capture" id="capture-bar">
      {risposta && (
        <div className="answer">
          <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 6 }}>
            {risposta.domanda}
          </div>
          {risposta.errore ? (
            <span style={{ color: "var(--bad)" }}>{risposta.errore}</span>
          ) : risposta.testo == null ? (
            <span style={{ color: "var(--text-faint)" }}>sto guardando nella memoria…</span>
          ) : (
            <div style={{ whiteSpace: "pre-wrap" }}>{risposta.testo}</div>
          )}
          {risposta.voci != null && (
            <div className="src">Ho guardato {risposta.voci} voci · Esc per chiudere</div>
          )}
          <button
            className="btn"
            style={{ position: "absolute", top: 10, right: 12, padding: "2px 8px" }}
            onClick={() => setRisposta(null)}
          >
            ×
          </button>
        </div>
      )}
      <div className="wrap">
        <button
          className="mic"
          title="Parla"
          data-listening={stato === "ascolto"}
          onClick={microfono}
        >
          <Microfono />
        </button>
        <input
          ref={campo}
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && invia()}
          placeholder="Di' una cosa, o fai una domanda…"
          disabled={stato === "elaborazione" || stato === "domanda"}
        />
        <span className={`state ${esito ? "done" : ""}`}>{esito ?? TESTO_STATO[stato]}</span>
        <button className="send" title="Invia" onClick={invia}>
          <Invia />
        </button>
      </div>
    </div>
  );
}
