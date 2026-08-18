/**
 * Il minimo che serve per parlare con Telegram.
 * Nessuna libreria: sono tre chiamate HTTP.
 */

const RADICE = "https://api.telegram.org";

const token = () => process.env.TELEGRAM_BOT_TOKEN;

export function telegramConfigurato() {
  return Boolean(token() && process.env.TELEGRAM_USER_ID);
}

async function chiama(metodo, corpo) {
  const t = token();
  if (!t) throw new Error("Manca TELEGRAM_BOT_TOKEN");

  const risposta = await fetch(`${RADICE}/bot${t}/${metodo}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  const dati = await risposta.json();
  if (!dati.ok) throw new Error(`Telegram ${metodo}: ${dati.description ?? "non ha funzionato"}`);
  return dati.result;
}

export function scrivi(testo, extra = {}) {
  return chiama("sendMessage", {
    chat_id: process.env.TELEGRAM_USER_ID,
    text: testo,
    parse_mode: "HTML",
    ...extra,
  });
}

export function rispondiA(chatId, testo, extra = {}) {
  return chiama("sendMessage", { chat_id: chatId, text: testo, parse_mode: "HTML", ...extra });
}

/**
 * Il pulsante che gira sul telefono finché non gli rispondi.
 * Va chiamata SEMPRE su una callback_query, anche quando non fai altro.
 */
export function chiudiPulsante(callbackId, testo) {
  return chiama("answerCallbackQuery", {
    callback_query_id: callbackId,
    text: testo,
    show_alert: false,
  });
}

export function modificaTesto(chatId, messageId, testo, extra = {}) {
  return chiama("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text: testo,
    parse_mode: "HTML",
    ...extra,
  });
}

/** Scarica un file dal bot e lo restituisce come Blob. */
export async function scaricaFile(fileId) {
  const info = await chiama("getFile", { file_id: fileId });
  const risposta = await fetch(`${RADICE}/file/bot${token()}/${info.file_path}`);
  if (!risposta.ok) throw new Error(`Non riesco a scaricare l'audio: ${risposta.status}`);
  return {
    blob: await risposta.blob(),
    percorso: info.file_path,
  };
}

/** Il mittente sta in posti diversi a seconda del tipo di aggiornamento. */
export function mittente(aggiornamento) {
  return (
    aggiornamento?.message?.from?.id ??
    aggiornamento?.callback_query?.from?.id ??
    aggiornamento?.edited_message?.from?.id ??
    null
  );
}
