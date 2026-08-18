"use client";

import { NOME } from "@/lib/app";
import { VERSIONE } from "@/lib/versione";

/**
 * Il guasto fuori dalla pagina, cioè nell'impaginazione stessa.
 *
 * Questo file sostituisce tutto, `<html>` compreso, quindi il foglio di stile
 * della dashboard qui non c'è: i colori sono scritti a mano, ed è l'unico
 * punto del programma dove è giusto che sia così.
 */
export default function ErroreGlobale({ error, reset }) {
  const vecchia = /chunk|dynamically imported module|Loading .* failed|Importing a module script failed/i
    .test(String(error?.message ?? ""));

  return (
    <html lang="it">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          background: "#0A1B33",
          color: "#F1F5F9",
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
        }}
      >
        <div style={{ maxWidth: 460, width: "100%" }}>
          <div style={{ fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", color: "#7E93AC" }}>
            {NOME} {VERSIONE}
          </div>
          <h1 style={{ fontSize: 22, margin: "10px 0 8px", fontWeight: 600 }}>
            Si è inceppato qualcosa
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: "#B6C4D6", margin: "0 0 18px" }}>
            {vecchia
              ? "Questa pagina era aperta da prima dell'ultimo rilascio e sta cercando pezzi che non ci sono più. Ricaricando torna tutto."
              : "Il guasto è nel browser, non nei tuoi dati: niente di quello che hai segnato è andato perso."}
          </p>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => reset?.()}
              style={{
                padding: "9px 14px", borderRadius: 9, border: "none", cursor: "pointer",
                background: "#E8A838", color: "#0D2240", fontSize: 13.5, fontWeight: 500,
              }}
            >
              Riprova
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "9px 14px", borderRadius: 9, border: "1px solid #3A5A82", cursor: "pointer",
                background: "#1B3B63", color: "#F1F5F9", fontSize: 13.5, fontWeight: 500,
              }}
            >
              Ricarica la pagina
            </button>
          </div>

          {error?.message && (
            <pre
              style={{
                marginTop: 18, padding: 12, borderRadius: 9, background: "#133256",
                border: "1px solid #29486E", color: "#B6C4D6", fontSize: 12,
                whiteSpace: "pre-wrap", overflowWrap: "anywhere",
              }}
            >
              {error.message}
              {error.digest ? `\n\ncodice ${error.digest}` : ""}
            </pre>
          )}
        </div>
      </body>
    </html>
  );
}
