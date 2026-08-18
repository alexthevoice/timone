import { NextResponse } from "next/server";
import { scriviNellaScheda } from "@/lib/cattura";
import { smista } from "@/lib/classify";
import { trascrivi } from "@/lib/trascrivi";
import {
  chiudiPulsante,
  mittente,
  modificaTesto,
  rispondiA,
  scaricaFile,
} from "@/lib/telegram";
import { aggiornaTask, creaCiclo, scriviCattura, scriviMemoria, segnaPeso } from "@/lib/store";

export const dynamic = "force-dynamic";

const NOME_DESTINAZIONE = {
  task: "nei task",
  persone: "nel CRM",
  finanze: "nei task, con l'etichetta finanze",
  obiettivi: "negli obiettivi",
  memoria: "in memoria",
};

const ETICHETTA_FASCIA = {
  ritardo: "In ritardo",
  oggi: "Oggi",
  settimana: "Questa settimana",
  avanti: "Più avanti",
};

/**
 * Il webhook di Telegram.
 *
 * Sta fuori dal cancello per forza: a bussare è Telegram, che non conosce la
 * tua password. Quindi si protegge da solo, con due serrature indipendenti:
 * l'intestazione col segreto, e il controllo che il mittente sia tu. Senza la
 * seconda, chiunque trovi il nome del bot può scrivere nel tuo sistema.
 *
 * E risponde SEMPRE 200. Se rispondesse con un errore, Telegram riproverebbe
 * a consegnare lo stesso messaggio, e ti ritroveresti la stessa nota
 * archiviata cinque volte. L'errore si gestisce dentro, la risposta resta buona.
 */
export async function POST(richiesta) {
  const atteso = process.env.TELEGRAM_WEBHOOK_SECRET;
  const arrivato = richiesta.headers.get("x-telegram-bot-api-secret-token");
  if (!atteso || arrivato !== atteso) {
    // Qui il 401 ci sta: non è Telegram che bussa.
    return NextResponse.json({ errore: "no" }, { status: 401 });
  }

  let aggiornamento;
  try {
    aggiornamento = await richiesta.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const mio = String(process.env.TELEGRAM_USER_ID ?? "");
  const chi = String(mittente(aggiornamento) ?? "");
  if (!mio || chi !== mio) {
    console.warn("[telegram] messaggio da un mittente che non sei tu:", chi);
    return NextResponse.json({ ok: true });
  }

  try {
    if (aggiornamento.callback_query) await gestisciPulsante(aggiornamento.callback_query);
    else if (aggiornamento.message) await gestisciMessaggio(aggiornamento.message);
  } catch (errore) {
    console.error("[telegram]", errore);
    try {
      const chat = aggiornamento.message?.chat?.id ?? aggiornamento.callback_query?.message?.chat?.id;
      if (chat) await rispondiA(chat, `Qualcosa è andato storto: ${errore.message}`);
    } catch {
      /* se non riesco nemmeno a dirtelo, pazienza: 200 lo devo dare comunque */
    }
  }

  return NextResponse.json({ ok: true });
}

/* -------------------------------------------------------------- i messaggi */

async function gestisciMessaggio(messaggio) {
  const chat = messaggio.chat.id;

  let testo = messaggio.text?.trim() ?? "";
  let provenienza = "telegram";

  if (messaggio.voice || messaggio.audio) {
    const file = messaggio.voice ?? messaggio.audio;
    const { blob, percorso } = await scaricaFile(file.file_id);
    testo = await trascrivi(blob, percorso);
    provenienza = "telegram-voce";
  }

  if (!testo) {
    await rispondiA(chat, "Non ho capito cosa mandarmi: scrivimi o mandami un vocale.");
    return;
  }

  // "peso 99,5" non è una nota da smistare: è il numero del giorno, e va
  // dritto dove il resto del sistema lo cerca. Vale anche detto a voce.
  // Solo con la parola "peso" davanti: un numero nudo resta una cattura.
  // Il punto o l'esclamativo in coda ci sono quasi sempre nei vocali
  // trascritti ("Peso 99,5."): non devono far cadere il comando nella cattura.
  const comandoPeso = testo.match(/^peso[\s:]*([\d]+(?:[.,]\d+)?)\s*(?:kg)?\s*[.!]?\s*$/i);
  if (comandoPeso) {
    const esito = await segnaPeso(null, comandoPeso[1]);
    await rispondiA(
      chat,
      `Peso di oggi segnato: <b>${String(esito.peso).replace(".", ",")} kg</b>.`
    );
    return;
  }

  // "ciclo Vendite: richiamare la concessionaria" scarica a terra un pensiero
  // senza passare dallo smistatore: niente urgenze, niente task, solo la
  // colonna giusta del Kanban. Senza settore ("ciclo: ...") finisce in
  // "Da smistare". Come "peso": un comando esplicito, non una destinazione.
  const comandoCiclo = testo.match(/^ciclo(?:\s+([^:]{1,40}))?\s*:\s*(.+)$/is);
  if (comandoCiclo) {
    const settore = comandoCiclo[1]?.trim();
    const creato = await creaCiclo({ titolo: comandoCiclo[2].trim(), settore });
    await rispondiA(
      chat,
      `Ciclo aperto: <b>${scappa(creato.Titolo)}</b> · ${settore ? scappa(settore) : "da smistare"}`
    );
    return;
  }

  const esito = await smista(testo);

  const cattura = await scriviCattura({
    testo,
    titolo: esito.titolo,
    provenienza,
    destinazione: esito.destinazione,
    urgenza: esito.urgenza,
    via: esito.via,
  });

  const [, creato] = await Promise.all([
    scriviMemoria({ testo, provenienza: "cattura", origine: cattura.id }),
    scriviNellaScheda(esito, testo),
  ]);

  const righe = [
    provenienza === "telegram-voce" ? `<i>“${scappa(testo)}”</i>` : null,
    `<b>${scappa(esito.titolo)}</b>`,
    `→ ${NOME_DESTINAZIONE[esito.destinazione] ?? esito.destinazione}` +
      (creato ? ` · ${ETICHETTA_FASCIA[esito.urgenza] ?? esito.urgenza}` : "") +
      (esito.via === "regole" ? " · smistata dalle regole" : ""),
  ].filter(Boolean);

  // I pulsanti servono a correggere l'urgenza con un tocco. Il modello sbaglia
  // l'urgenza più spesso della categoria, e correggerla mentre cammini è la
  // differenza tra fidarsi del sistema e rimettere a posto tutto la sera.
  const tastiera = creato
    ? {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "Oggi", callback_data: `u:${creato.id}:oggi` },
              { text: "Settimana", callback_data: `u:${creato.id}:settimana` },
              { text: "Più avanti", callback_data: `u:${creato.id}:avanti` },
            ],
          ],
        },
      }
    : {};

  await rispondiA(chat, righe.join("\n"), tastiera);
}

/* --------------------------------------------------------------- i pulsanti */

async function gestisciPulsante(query) {
  // Sempre: altrimenti il pulsante resta a girare sul telefono.
  const [tipo, id, valore] = String(query.data ?? "").split(":");

  if (tipo !== "u" || !id || !valore) {
    await chiudiPulsante(query.id, "Non so cosa farci");
    return;
  }

  await aggiornaTask(id, { fascia: valore });
  await chiudiPulsante(query.id, `Spostato in ${ETICHETTA_FASCIA[valore] ?? valore}`);

  const messaggio = query.message;
  if (messaggio) {
    const testo = messaggio.text ?? "";
    await modificaTesto(
      messaggio.chat.id,
      messaggio.message_id,
      `${scappa(testo.split("\n").slice(0, -1).join("\n") || testo)}\n→ ${ETICHETTA_FASCIA[valore]} ✓`,
      { reply_markup: { inline_keyboard: [] } }
    );
  }
}

/* ----------------------------------------------------------------- comodità */

const scappa = (t) =>
  String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
