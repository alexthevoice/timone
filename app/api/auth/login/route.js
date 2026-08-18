import { NextResponse } from "next/server";
import { OPZIONI_COOKIE, confrontoATempoCostante, coniaSessione, passwordCombacia } from "@/lib/auth";
import { leggiPasswordHash } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Il login.
 *
 * Accetta due forme:
 *  - un form vero (application/x-www-form-urlencoded), e risponde con un
 *    redirect che porta già il cookie. È la strada del browser, e non passa
 *    da nessun JavaScript: il cookie viene impostato dalla stessa risposta che
 *    ti sposta, quindi non c'è modo che si perda per strada.
 *  - JSON, per gli script e per le prove da riga di comando.
 */
export async function POST(richiesta) {
  const tipo = richiesta.headers.get("content-type") ?? "";
  const daForm = tipo.includes("form");

  let password = "";
  let da = "/";

  if (daForm) {
    const modulo = await richiesta.formData();
    password = String(modulo.get("password") ?? "");
    const chiesto = String(modulo.get("da") ?? "");
    // Solo percorsi interni: "//altrosito.it" comincia con / ma porta fuori.
    if (chiesto.startsWith("/") && !chiesto.startsWith("//")) da = chiesto;
  } else {
    const corpo = await richiesta.json().catch(() => ({}));
    password = String(corpo.password ?? "");
  }

  const indietro = (percorso, errore, stato) =>
    daForm
      ? NextResponse.redirect(new URL(percorso, richiesta.url), 303)
      : NextResponse.json({ errore }, { status: stato });

  // La password scelta da Config (hash su Airtable) vince su quella di
  // partenza nelle variabili d'ambiente. Se Airtable non risponde si ripiega
  // sulla variabile: chiudersi fuori di casa perché il database dorme no.
  const salvata = await leggiPasswordHash().catch(() => null);
  const attesa = process.env.DASHBOARD_PASSWORD;
  if (!salvata && !attesa) {
    return indietro(
      "/login?errore=configurazione",
      "DASHBOARD_PASSWORD non è impostata: il cancello non può funzionare.",
      500
    );
  }

  const buona = salvata
    ? await passwordCombacia(password, salvata)
    : confrontoATempoCostante(password, attesa);
  if (!buona) {
    await new Promise((r) => setTimeout(r, 400));
    return indietro("/login?errore=1", "Password sbagliata", 401);
  }

  const risposta = daForm
    ? NextResponse.redirect(new URL(da, richiesta.url), 303)
    : NextResponse.json({ ok: true });

  risposta.cookies.set({ ...OPZIONI_COOKIE, value: await coniaSessione() });
  risposta.headers.set("Cache-Control", "no-store");
  return risposta;
}
