import { NextResponse } from "next/server";
import { COOKIE, sessioneValida } from "@/lib/auth";
import { adessoIso, oggi } from "@/lib/data";
import { TABELLE, leggiTutte } from "@/lib/airtable";

export const dynamic = "force-dynamic";

export const VERSIONE_SCHEMA = 1;

/**
 * Tutto il database in un file solo.
 *
 * Questa è la rotta che restituisce ogni riga che il sistema sa di te, quindi
 * la porta di servizio qui non entra: accetta SOLO un cookie di sessione
 * valido, e rifiuta esplicitamente l'intestazione x-api-secret, che invece va
 * bene ovunque altro. Un segreto in una scorciatoia del telefono non deve
 * poter scaricare il tuo patrimonio, i tuoi contatti e le tue riflessioni.
 *
 * Ed è anche la tua via d'uscita: è quello che ti permette di lasciare
 * Airtable, o Vercel, o entrambi, senza ricominciare da zero. Un sistema
 * personale da cui non puoi portare via i dati non è tuo del tutto.
 */
export async function GET(richiesta) {
  if (richiesta.headers.get("x-api-secret")) {
    return NextResponse.json(
      { errore: "Su questa rotta il segreto delle API non vale: serve la tua sessione." },
      { status: 401 }
    );
  }

  const cookie = richiesta.cookies.get(COOKIE)?.value;
  if (!(await sessioneValida(cookie))) {
    return NextResponse.json({ errore: "Non autorizzato" }, { status: 401 });
  }

  const dati = await raccogliTutto();

  return new NextResponse(JSON.stringify(dati, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="backup-${oggi()}.json"`,
      "Cache-Control": "no-store",
    },
  });
}

/** Usata anche dal cron del backup: la funzione è una sola. */
export async function raccogliTutto() {
  const nomi = Object.entries(TABELLE);
  const contenuto = await Promise.all(nomi.map(([, tabella]) => leggiTutte(tabella)));

  const tabelle = Object.fromEntries(nomi.map(([chiave], i) => [chiave, contenuto[i]]));

  return {
    generatoIl: adessoIso(),
    versioneSchema: VERSIONE_SCHEMA,
    base: process.env.AIRTABLE_BASE_ID ?? null,
    conteggi: Object.fromEntries(Object.entries(tabelle).map(([k, v]) => [k, v.length])),
    tabelle,
  };
}
