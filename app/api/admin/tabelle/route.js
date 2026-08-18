import { NextResponse } from "next/server";
import { creaTabelle } from "@/lib/tabelle.mjs";

export const dynamic = "force-dynamic";
// Undici tabelle sono dodici chiamate ad Airtable in fila: meglio abbondare.
export const maxDuration = 60;

/**
 * Crea le tabelle dal browser, per chi non ha un terminale.
 *
 * È il gemello cliccabile di strumenti/crea-tabelle.mjs: dopo il deploy e il
 * login si visita /api/admin/tabelle e le undici tabelle compaiono sulla base.
 * Idempotente come lo script: quelle che ci sono già si saltano, i dati non
 * si toccano mai, quindi rivisitarla per sbaglio non fa danni.
 *
 * Sta dietro il cancello (proxy.js): senza cookie di sessione o x-api-secret
 * non risponde. È un GET con un effetto, e non è una svista: il pubblico di
 * questa rotta è una persona al primo avvio, con un browser e basta, e la
 * barra degli indirizzi è l'unico POST che ha.
 */
async function esegui() {
  const base = process.env.AIRTABLE_BASE_ID;
  const chiave = process.env.AIRTABLE_API_KEY;
  if (!base || !chiave) {
    return NextResponse.json(
      { errore: "Mancano AIRTABLE_BASE_ID o AIRTABLE_API_KEY fra le variabili d'ambiente." },
      { status: 503 }
    );
  }

  try {
    const { create, saltate } = await creaTabelle(base, chiave);
    return NextResponse.json({
      ok: true,
      create,
      saltate,
      nota: create.length
        ? "Fatto: ricarica la dashboard e le schede prenderanno vita."
        : "Le tabelle c'erano già tutte: non ho toccato niente.",
    });
  } catch (errore) {
    console.error("[tabelle]", errore.message);
    // Il caso più comune: il token non ha il permesso schema.bases:write.
    return NextResponse.json(
      {
        errore: errore.message,
        controlla:
          "Il token Airtable deve avere i permessi schema.bases:read e schema.bases:write, e l'accesso a questa base.",
      },
      { status: 502 }
    );
  }
}

export async function GET() {
  return esegui();
}

export async function POST() {
  return esegui();
}
