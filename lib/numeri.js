/**
 * Tutta la formattazione dei numeri vive qui, così la regola sta in un posto
 * solo e vale ovunque.
 *
 * minimumGroupingDigits: 1 non è pignoleria. L'italiano non raggruppa i numeri
 * di quattro cifre: 7150 resta 7150 e 12400 diventa 12.400. Giusto in un testo,
 * sbagliato in una colonna, dove l'occhio inciampa a ogni riga.
 */

const OPZIONI = { minimumGroupingDigits: 1 };

const intero = new Intl.NumberFormat("it-IT", { ...OPZIONI, maximumFractionDigits: 0 });
const decimale = new Intl.NumberFormat("it-IT", {
  ...OPZIONI,
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** 12400 -> "12.400" */
export const num = (n) => intero.format(n ?? 0);

/** 78.25 -> "78,3" */
export const num1 = (n) => decimale.format(n ?? 0);

/** 12400 -> "12.400 €" */
export const euro = (n) => `${intero.format(n ?? 0)} €`;

/** 3140 -> "+3.140", -980 -> "-980", 0 -> "0" */
export const delta = (n) => {
  const v = n ?? 0;
  return v > 0 ? `+${intero.format(v)}` : intero.format(v);
};

/**
 * La classe di colore di una variazione.
 *
 * Attenzione: il segno meno non è di per sé negativo. Un peso che scende può
 * essere esattamente quello che volevi. È la metrica a decidere il colore, non
 * il segno: `versoBuono` dice se salire è la direzione giusta.
 */
export const coloreDelta = (n, versoBuono = "su") => {
  const v = n ?? 0;
  if (v === 0) return "";
  const sale = v > 0;
  const bene = versoBuono === "su" ? sale : !sale;
  return bene ? "pos" : "neg";
};

/** 0.6431 -> "64%" */
export const percento = (q) => `${Math.round((q ?? 0) * 100)}%`;

/**
 * Legge un numero scritto da un essere umano o da un telefono.
 *
 * Serve a una cosa sola: quello che arriva da Comandi Rapidi non è mai un
 * numero pulito. Un campione di Salute messo in un campo di testo diventa
 * "3466 conteggio", una distanza diventa "6,4 km", e in italiano i migliaia
 * si separano col punto.
 *
 * Le regole, in ordine, e nessuna di queste indovina:
 *
 * 1. Si toglie l'unità in coda ("conteggio", "km", "kg", "min"): è testo dopo
 *    il numero, non è ambiguo.
 * 2. La virgola è sempre decimale. In italiano lo è.
 * 3. Il punto è decimale TRANNE quando separa gruppi di tre cifre fino in
 *    fondo — "3.466" sono tremilaquattrocentosessantasei, non tre virgola
 *    quattro. La distinzione è decidibile guardando la forma, quindi si
 *    guarda invece di tirare a indovinare: sbagliarla vuol dire passi
 *    sbagliati di mille volte, e nessuno se ne accorgerebbe.
 * 4. Tutto il resto torna null, e chi chiama deve dirlo. Un numero letto male
 *    è peggio di un numero mancante, perché ha l'aria di essere giusto.
 */
export function leggiNumero(grezzo) {
  if (typeof grezzo === "number") return Number.isFinite(grezzo) ? grezzo : null;
  if (grezzo === undefined || grezzo === null) return null;

  const testo = String(grezzo).trim();
  if (!testo) return null;

  // Il numero deve stare in testa: "3466 conteggio" sì, "circa 3466" no.
  const inTesta = testo.match(/^[-+]?[\d.,\s]+/);
  if (!inTesta) return null;

  let n = inTesta[0].replace(/\s/g, "");

  if (n.includes(",")) {
    // Con la virgola in gioco, il punto può solo essere separatore di migliaia.
    n = n.replace(/\./g, "").replace(",", ".");
  } else if (/^[-+]?\d{1,3}(\.\d{3})+$/.test(n)) {
    // Solo punti, e ogni gruppo è di tre cifre fino in fondo: sono migliaia.
    n = n.replace(/\./g, "");
  }

  const valore = Number(n);
  return Number.isFinite(valore) ? valore : null;
}
