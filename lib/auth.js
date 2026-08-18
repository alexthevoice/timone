/**
 * Il cancello: password singola e cookie firmato.
 *
 * Per un sistema con un utente solo un login OAuth completo è impalcatura
 * sproporzionata. Una password lunga, verificata una volta, che lascia un
 * cookie firmato crittograficamente: firmato significa che non lo puoi
 * fabbricare a mano dal browser.
 *
 * Usa la Web Crypto API e non il modulo crypto di Node, così lo stesso codice
 * gira sia nel proxy sia nelle rotte.
 */

export const COOKIE = "sessione";
export const DURATA_GIORNI = 30;

const codifica = new TextEncoder();

function segreto() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("Manca AUTH_SECRET: senza, i cookie di sessione non si possono firmare.");
  return s;
}

async function chiave() {
  return crypto.subtle.importKey(
    "raw",
    codifica.encode(segreto()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function base64url(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function firma(testo) {
  return base64url(await crypto.subtle.sign("HMAC", await chiave(), codifica.encode(testo)));
}

/** Un cookie è "scadenza.firma": senza AUTH_SECRET non si fabbrica. */
export async function coniaSessione() {
  const scadenza = Date.now() + DURATA_GIORNI * 86400_000;
  const corpo = String(scadenza);
  return `${corpo}.${await firma(corpo)}`;
}

export async function sessioneValida(valore) {
  if (!valore || typeof valore !== "string") return false;
  const punto = valore.lastIndexOf(".");
  if (punto < 1) return false;

  const corpo = valore.slice(0, punto);
  const attesa = await firma(corpo);
  if (!confrontoATempoCostante(valore.slice(punto + 1), attesa)) return false;

  const scadenza = Number(corpo);
  return Number.isFinite(scadenza) && scadenza > Date.now();
}

/**
 * Confronto a tempo costante: un confronto normale esce al primo carattere
 * diverso, e quel tempo in più racconta quanti caratteri erano giusti.
 */
export function confrontoATempoCostante(a, b) {
  const x = String(a ?? "");
  const y = String(b ?? "");
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

/* ------------------------------------------------- la password cambiabile */

/**
 * La password si può cambiare da Config senza toccare le variabili
 * d'ambiente: quella scelta si salva su Airtable come PBKDF2 (mai in
 * chiaro), e al login vince sulla DASHBOARD_PASSWORD di partenza. Se il
 * campo è vuoto — il primo giorno, o dopo averlo svuotato a mano per
 * recuperare l'accesso — vale la variabile d'ambiente.
 *
 * Centomila iterazioni: abbastanza da rendere inutile un furto della
 * riga, poco abbastanza da non farsi sentire a ogni login.
 */
const ITERAZIONI = 100_000;

async function derivaHash(password, sale) {
  const chiaveGrezza = await crypto.subtle.importKey(
    "raw",
    codifica.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bit = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: codifica.encode(sale), iterations: ITERAZIONI },
    chiaveGrezza,
    256
  );
  return base64url(bit);
}

/** Torna "sale$hash", pronto da salvare. */
export async function fabbricaHashPassword(password) {
  const sale = base64url(crypto.getRandomValues(new Uint8Array(16)).buffer);
  return `${sale}$${await derivaHash(password, sale)}`;
}

export async function passwordCombacia(password, saleEHash) {
  const punto = String(saleEHash ?? "").indexOf("$");
  if (punto < 1) return false;
  const sale = saleEHash.slice(0, punto);
  const atteso = saleEHash.slice(punto + 1);
  return confrontoATempoCostante(await derivaHash(password, sale), atteso);
}

export const OPZIONI_COOKIE = {
  name: COOKIE,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: DURATA_GIORNI * 86400,
};
