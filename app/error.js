"use client";

import ErroreSchermo from "./errore-schermo";

/**
 * Il guasto dentro la pagina: la barra e l'impaginazione restano, cambia solo
 * quello che c'era rotto. Il foglio di stile è già caricato, quindi la
 * schermata di emergenza esce vestita come il resto della dashboard.
 */
export default function Errore({ error, reset }) {
  return <ErroreSchermo error={error} reset={reset} />;
}
