"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * I dati della dashboard, con la regola numero 4: ogni gesto risponde subito.
 *
 * Clicchi una spunta e la spunta appare, POI parte la scrittura. Se la
 * scrittura fallisce, si rilegge lo stato vero dal server, così lo schermo non
 * resta a raccontare una cosa mai salvata.
 *
 * E la protezione contro la gara di tempi: al montaggio parte una lettura, e
 * se quella lettura è lenta e arriva DOPO il tuo primo clic, la sua risposta è
 * la fotografia di prima e ti cancellerebbe il clic. Ogni lettura si segna la
 * generazione in cui è partita; ogni modifica alza la generazione; le risposte
 * di letture vecchie si buttano.
 */
export function useDashboard() {
  const [dati, setDati] = useState(null);
  const [errore, setErrore] = useState(null);
  const generazione = useRef(0);

  const ricarica = useCallback(async () => {
    const mia = generazione.current;
    try {
      const r = await fetch("/api/dashboard", { cache: "no-store" });
      const d = await r.json();
      // Una risposta partita prima dell'ultima modifica non deve mai
      // sovrascrivere un clic appena fatto.
      if (mia !== generazione.current) return;
      if (!r.ok) {
        setErrore(d.errore ?? "Non riesco a leggere i dati");
        return;
      }
      setErrore(null);
      setDati(d);
    } catch {
      if (mia === generazione.current) setErrore("Non riesco a raggiungere il server");
    }
  }, []);

  useEffect(() => {
    ricarica();
  }, [ricarica]);

  /**
   * Applica subito una modifica sullo schermo, poi la scrive.
   * Se la scrittura fallisce, rilegge la verità dal server.
   */
  const modifica = useCallback(
    async (aggiornaSubito, scrivi) => {
      generazione.current += 1;
      if (aggiornaSubito) setDati((d) => (d ? aggiornaSubito(d) : d));
      try {
        const r = await scrivi();
        if (r && r.ok === false) throw new Error("scrittura rifiutata");
      } catch (e) {
        console.error("[dashboard] scrittura fallita, rileggo lo stato vero:", e.message);
        await ricarica();
        return false;
      }
      return true;
    },
    [ricarica]
  );

  return { dati, errore, ricarica, modifica };
}

/** Il calendario ha una rotta sua: è l'unica che va a bussare fuori. */
export function useCalendario() {
  const [cal, setCal] = useState(null);

  useEffect(() => {
    let vivo = true;
    fetch("/api/calendario", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => vivo && setCal(d))
      .catch(() => vivo && setCal({ errore: "non raggiungibile", eventi: [] }));
    return () => {
      vivo = false;
    };
  }, []);

  return cal;
}

export async function postJson(percorso, corpo, metodo = "POST") {
  const r = await fetch(percorso, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo ?? {}),
    cache: "no-store",
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.errore ?? `${percorso} ha risposto ${r.status}`);
  return d;
}

