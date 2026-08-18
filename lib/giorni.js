/**
 * Quanti giorni sono passati da una data, senza far decidere niente al fuso.
 *
 * Le date qui dentro sono stringhe YYYY-MM-DD e vanno confrontate come tali:
 * passarle da `new Date()` vuol dire che a fine mese, di sera, un giorno si
 * sposta e il conto viene sbagliato di uno. Il fuso lo decide il server una
 * volta sola, in `lib/data.js`, e qui arriva già la data di oggi.
 */
export function giorniDaIso(data, oggiIso) {
  const da = String(data ?? "").slice(0, 10);
  const a = String(oggiIso ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(da) || !/^\d{4}-\d{2}-\d{2}$/.test(a)) return null;
  return Math.round((Date.parse(`${a}T12:00:00Z`) - Date.parse(`${da}T12:00:00Z`)) / 86400000);
}
