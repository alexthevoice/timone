/**
 * La lettura dei blocchi incollati.
 *
 * Il patto con l'utente è: chiedi alla TUA intelligenza artificiale (Claude,
 * ChatGPT, Gemini, quella che usi) di prepararti il blocco col prompt che ti
 * diamo noi, copialo, incollalo qui. Le AI però incartano quasi sempre il
 * JSON nei recinti di codice (```json ... ```), e spesso ci mettono una riga
 * di cortesia prima e una dopo: questa funzione sbuccia e legge, e quando
 * non ci riesce dice PERCHÉ, così l'errore si può rincollare all'AI che ha
 * scritto il blocco e farselo correggere.
 */
export function leggiBlocco(testo) {
  let t = String(testo ?? "").trim();
  if (!t) return { errore: "Non c'è niente da leggere: incolla il blocco." };

  // Via i recinti di codice, ovunque siano: si tiene quello che c'è dentro.
  const recinto = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (recinto) t = recinto[1].trim();

  // Se c'è testo di contorno, si prova a isolare la prima struttura JSON.
  if (!t.startsWith("{") && !t.startsWith("[")) {
    const apre = t.search(/[{[]/);
    if (apre === -1) {
      return { errore: "Nel testo incollato non c'è nessun blocco JSON: ricontrolla di aver copiato la risposta intera." };
    }
    t = t.slice(apre);
  }
  const chiude = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
  if (chiude !== -1) t = t.slice(0, chiude + 1);

  try {
    return { valore: JSON.parse(t) };
  } catch (e) {
    return {
      errore: `Il blocco non si legge come JSON (${e.message}). Rincolla questo errore alla tua AI e chiedile di correggere il blocco.`,
    };
  }
}
