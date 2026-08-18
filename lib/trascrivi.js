/**
 * La trascrizione delle note vocali.
 *
 * L'audio di Telegram arriva in OGG. Whisper lo gestisce, ma solo se il file
 * gli viene passato con il tipo di contenuto giusto: con un MIME sbagliato o
 * un nome senza estensione non protesta — restituisce una stringa vuota.
 * È un sintomo così anonimo che senza saperlo prima ci si perde un'ora.
 */

const MIME_PER_ESTENSIONE = {
  oga: "audio/ogg",
  ogg: "audio/ogg",
  opus: "audio/ogg",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  wav: "audio/wav",
  webm: "audio/webm",
};

export function chiaveOpenAiConfigurata() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function trascrivi(blob, percorsoOriginale = "audio.oga") {
  const chiave = process.env.OPENAI_API_KEY;
  if (!chiave) throw new Error("Manca OPENAI_API_KEY: senza, i vocali non si trascrivono");

  const estensione = (percorsoOriginale.split(".").pop() || "oga").toLowerCase();
  const mime = MIME_PER_ESTENSIONE[estensione] ?? "audio/ogg";
  const nome = `nota.${estensione}`;

  const modulo = new FormData();
  // Nome CON estensione e tipo esplicito: sono le due cose che decidono se
  // torna il testo o una stringa vuota.
  modulo.append("file", new File([blob], nome, { type: mime }));
  modulo.append("model", process.env.OPENAI_TRASCRIZIONE_MODEL || "whisper-1");
  modulo.append("language", "it");

  const risposta = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${chiave}` },
    body: modulo,
  });

  if (!risposta.ok) {
    const corpo = await risposta.text();
    throw new Error(`Trascrizione fallita (${risposta.status}): ${corpo.slice(0, 200)}`);
  }

  const { text } = await risposta.json();
  const pulito = String(text ?? "").trim();
  if (!pulito) {
    throw new Error(
      `Trascrizione vuota. Di solito è il tipo di contenuto: ho mandato ${mime} come ${nome}.`
    );
  }
  return pulito;
}
