"use client";

import { useEffect, useState } from "react";

/**
 * Orologio che parte solo lato client.
 *
 * Finché il componente non è montato torna null: il server disegna il
 * segnaposto, il browser disegna lo stesso segnaposto, poi il browser
 * aggiorna. Senza questo, l'ora del server e quella del browser non
 * coincidono mai e React protesta con un errore di hydration.
 */
export function useOrologio() {
  const [adesso, setAdesso] = useState(null);

  useEffect(() => {
    setAdesso(new Date());
    const id = setInterval(() => setAdesso(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!adesso) return { ora: null, data: null, saluto: null, adesso: null };

  const hh = String(adesso.getHours()).padStart(2, "0");
  const mm = String(adesso.getMinutes()).padStart(2, "0");

  const h = adesso.getHours();
  const saluto =
    h < 5 ? "Buonanotte" : h < 13 ? "Buongiorno" : h < 18 ? "Buon pomeriggio" : "Buonasera";

  return {
    adesso,
    ora: `${hh}:${mm}`,
    saluto,
    data: adesso.toLocaleDateString("it-IT", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  };
}
