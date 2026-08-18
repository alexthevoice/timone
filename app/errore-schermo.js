"use client";

import { NOME } from "@/lib/app";
import { VERSIONE } from "@/lib/versione";

/**
 * La schermata di emergenza, quando qualcosa si rompe nel browser.
 *
 * Prima non c'era, e senza una schermata di emergenza propria Next.js mette la
 * sua: fondo bianco, inglese, "This page couldn't load" e due pulsanti. Dice
 * che qualcosa è andato storto e nient'altro — non quale versione stavi
 * guardando, non cosa è successo, e soprattutto non che a volte basta
 * ricaricare perché la pagina era rimasta aperta da prima di un rilascio.
 *
 * Il messaggio del guasto si mostra per esteso apposta. Questa dashboard ha un
 * utente solo, che è anche quello che poi lo riporta a me: nasconderglielo
 * vorrebbe dire chiedergli di aprire la console del browser per copiarlo.
 */
export default function ErroreSchermo({ error, reset }) {
  // Un pezzo di codice che non si scarica quasi sempre vuol dire una cosa
  // sola: la pagina è aperta da prima dell'ultimo rilascio e sta cercando file
  // che quel rilascio ha sostituito. Ricaricare basta, e vale dirlo.
  const vecchia = /chunk|dynamically imported module|Loading .* failed|Importing a module script failed/i
    .test(String(error?.message ?? ""));

  return (
    <div className="crash">
      <div className="riquadro">
        <div className="marchio">{NOME} {VERSIONE}</div>
        <h1>Si è inceppato qualcosa</h1>
        <p>
          {vecchia
            ? "Questa pagina era aperta da prima dell'ultimo rilascio e sta cercando pezzi che non ci sono più. Ricaricando torna tutto."
            : "Il guasto è nel browser, non nei tuoi dati: niente di quello che hai segnato è andato perso."}
        </p>

        <div className="fila">
          <button className="btn primary" onClick={() => reset?.()}>
            Riprova
          </button>
          <button className="btn" onClick={() => window.location.reload()}>
            Ricarica la pagina
          </button>
        </div>

        {error?.message && (
          <pre className="dettaglio">
            {error.message}
            {error.digest ? `\n\ncodice ${error.digest}` : ""}
          </pre>
        )}
      </div>
    </div>
  );
}
