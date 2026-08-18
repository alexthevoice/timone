import { NextResponse } from "next/server";
import { COOKIE, confrontoATempoCostante, sessioneValida } from "@/lib/auth";

/**
 * Il cancello. In Next 16 questo file si chiama proxy.js: middleware.js e
 * deprecato e rinominato, la funzionalita e la stessa.
 *
 * Intercetta ogni richiesta. Se non c'e un cookie valido, si finisce sulla
 * pagina di login.
 *
 * LE ECCEZIONI SONO LA PARTE PERICOLOSA. Tre cose devono passare senza cookie,
 * perche a bussare non e un browser con una sessione. Ognuna deve avere una
 * sua serratura, altrimenti una rotta esclusa e non protetta e peggio di
 * nessun cancello: da l'impressione di essere al sicuro.
 *
 *   /login e /api/auth/*     -> altrimenti non potresti mai entrare.
 *                               Si proteggono da sole: non espongono nulla.
 *   /api/telegram/webhook    -> bussa Telegram, che non conosce la tua password.
 *                               Si protegge da sola: intestazione col segreto
 *                               (X-Telegram-Bot-Api-Secret-Token) e controllo
 *                               che il mittente sia il tuo ID utente.
 *   /api/cron/*              -> bussa la piattaforma.
 *                               Si protegge da sola: Authorization: Bearer
 *                               confrontato con CRON_SECRET.
 */
const APERTE = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/telegram/webhook",
];

function eAperta(percorso) {
  return APERTE.includes(percorso) || percorso.startsWith("/api/cron/");
}

function conNoindex(risposta) {
  // Con il cancello attivo i crawler non entrano comunque, ma e una riga e ti
  // copre nella finestra in cui qualcosa e configurato male.
  risposta.headers.set("X-Robots-Tag", "noindex, nofollow");
  return risposta;
}

export async function proxy(richiesta) {
  const { pathname, search } = richiesta.nextUrl;

  if (eAperta(pathname)) return conNoindex(NextResponse.next());

  // Accesso da script e scorciatoie del telefono, senza passare dal login.
  const segretoApi = process.env.API_SECRET;
  const intestazione = richiesta.headers.get("x-api-secret");
  if (segretoApi && intestazione && confrontoATempoCostante(intestazione, segretoApi)) {
    return conNoindex(NextResponse.next());
  }

  if (await sessioneValida(richiesta.cookies.get(COOKIE)?.value)) {
    return conNoindex(NextResponse.next());
  }

  // Le rotte API rispondono 401: un redirect verso una pagina HTML, a chi si
  // aspetta del JSON, sembra un guasto e non un rifiuto.
  if (pathname.startsWith("/api/")) {
    return conNoindex(
      NextResponse.json({ errore: "Non autorizzato" }, { status: 401 })
    );
  }

  const login = new URL("/login", richiesta.url);
  if (pathname !== "/") login.searchParams.set("da", pathname + search);
  return conNoindex(NextResponse.redirect(login));
}

export const config = {
  // Senza matcher il proxy girerebbe anche sui file statici e sulle immagini,
  // e il cancello bloccherebbe il CSS della pagina di login.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
