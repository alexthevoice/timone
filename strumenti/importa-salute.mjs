/**
 * Lo storico di Apple Salute dentro la dashboard, una volta sola.
 *
 * PERCHÉ ESISTE. La dashboard riceve i dati del giorno dal telefono, con
 * Comandi Rapidi, e non può andarseli a prendere: Apple non espone Salute su
 * internet, quindi non c'è nessun indirizzo a cui chiedere i passi di ieri.
 * L'unico modo di avere il passato è il file che l'app Salute sa esportare:
 * Salute → la tua foto in alto a destra → "Esporta tutti i dati sanitari".
 * Esce un `esportazione.zip` con dentro `apple_health_export/export.xml`.
 *
 * COSA FA. Legge quel file una riga alla volta — può essere di centinaia di
 * mega, e caricarlo tutto in memoria vuol dire vederlo morire a metà — mette
 * insieme i numeri giorno per giorno e li manda a /api/salute, un giorno per
 * chiamata, con la stessa porta che usa il telefono.
 *
 * COME SI USA:
 *
 *   node strumenti/importa-salute.mjs export.xml --da 2026-01-01 --prova
 *   node strumenti/importa-salute.mjs export.xml --da 2026-01-01 --scrivi
 *
 * Di suo NON scrive: stampa cosa manderebbe. Serve `--scrivi` per fare sul
 * serio, perché questo tocca la produzione e i giorni già scritti a mano.
 *
 * DUE REGOLE CHE NON SI TOCCANO.
 *
 * 1. **Il giorno di oggi non si tocca.** Quello arriva dal telefono ed è più
 *    fresco di qualsiasi esportazione, che è una fotografia del momento in cui
 *    l'hai chiesta. Sovrascriverlo vorrebbe dire riportare indietro i passi.
 * 2. **Un campo che nel file non c'è non si manda.** La rotta tiene il valore
 *    di prima quando un campo non arriva, ed è giusto così: se in un giorno
 *    manca il sonno, quel giorno resta senza sonno, non con uno zero. Uno zero
 *    dice "non hai dormito", ed è una bugia diversa da "non lo so".
 *
 * Le variabili le legge da .env.local: OS_URL (o NEXT_PUBLIC_APP_URL) e
 * API_SECRET, gli stessi del comando sul telefono.
 */
import fs from "node:fs";
import readline from "node:readline";

const [file, ...resto] = process.argv.slice(2);
const opzione = (nome, valorePredefinito = null) => {
  const i = resto.indexOf(`--${nome}`);
  return i === -1 ? valorePredefinito : (resto[i + 1] ?? true);
};
const SCRIVI = resto.includes("--scrivi");
const DA = opzione("da", "0000-01-01");
const A = opzione("a", "9999-12-31");

const BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const SEGRETO = process.env.API_SECRET;

if (!file || !fs.existsSync(file)) {
  console.error("Serve il percorso di export.xml.\n  node strumenti/importa-salute.mjs export.xml --da 2026-01-01");
  process.exit(1);
}
if (SCRIVI && !SEGRETO) {
  console.error("Manca API_SECRET: lancia con --env-file=.env.local");
  process.exit(1);
}

/**
 * Come si mette insieme una giornata, misura per misura.
 *
 * Non è un dettaglio tecnico: i passi si sommano, il battito a riposo si fa
 * la media, il peso è l'ultima pesata della giornata. Sommare i battiti
 * darebbe un numero enorme e perfettamente insensato.
 */
const TIPI = {
  HKQuantityTypeIdentifierStepCount: { campo: "passi", come: "somma" },
  HKQuantityTypeIdentifierActiveEnergyBurned: { campo: "calorieAttive", come: "somma" },
  HKQuantityTypeIdentifierAppleExerciseTime: { campo: "esercizioMinuti", come: "somma" },
  HKQuantityTypeIdentifierDistanceWalkingRunning: { campo: "distanzaKm", come: "somma" },
  HKQuantityTypeIdentifierRestingHeartRate: { campo: "frequenzaRiposo", come: "media" },
  HKQuantityTypeIdentifierHeartRateVariabilitySDNN: { campo: "hrv", come: "media" },
  HKQuantityTypeIdentifierVO2Max: { campo: "vo2max", come: "ultimo" },
  HKQuantityTypeIdentifierBodyMass: { campo: "peso", come: "ultimo" },
  HKCategoryTypeIdentifierAppleStandHour: { campo: "inPiediOre", come: "oreInPiedi" },
  HKCategoryTypeIdentifierSleepAnalysis: { campo: "sonnoMinuti", come: "sonno" },
};

const giorni = new Map();
const perGiorno = (g) => {
  if (!giorni.has(g)) giorni.set(g, {});
  return giorni.get(g);
};

function aggiungi(giorno, campo, come, valore, minuti) {
  const d = perGiorno(giorno);
  const v = (d[campo] ??= { somma: 0, n: 0, ultimo: null });
  if (come === "somma") v.somma += valore;
  else if (come === "media") { v.somma += valore; v.n += 1; }
  else if (come === "ultimo") v.ultimo = valore;
  else if (come === "sonno") v.somma += minuti;
  else if (come === "oreInPiedi") v.somma += 1;
}

const chiave = (data) => String(data).slice(0, 10);

/** "2026-08-17 23:10:00 +0200" -> una data vera, fuso compreso. */
const aData = (s) => new Date(String(s).replace(" ", "T").replace(/ ([+-]\d{2})(\d{2})$/, "$1:$2"));
const minutiFra = (da, a) => {
  const minuti = (aData(a) - aData(da)) / 60000;
  return Number.isFinite(minuti) ? Math.max(0, minuti) : 0;
};

// Le date nell'esportazione sono locali ("2026-08-17 21:34:12 +0200"): il
// giorno sono i primi dieci caratteri, e va bene così. Convertirle in UTC
// sposterebbe di un giorno tutto quello che succede dopo le due di notte.
const RECORD = /^\s*<Record type="([^"]+)"[^>]*?startDate="([^"]+)"[^>]*?endDate="([^"]+)"[^>]*?value="([^"]*)"/;

const flusso = readline.createInterface({
  input: fs.createReadStream(file, { encoding: "utf8" }),
  crlfDelay: Infinity,
});

let righe = 0;
for await (const riga of flusso) {
  righe += 1;
  const m = RECORD.exec(riga);
  if (!m) continue;
  const [, tipo, inizio, fine, grezzo] = m;
  const regola = TIPI[tipo];
  if (!regola) continue;

  const giorno = chiave(inizio);
  if (giorno < DA || giorno > A) continue;

  if (regola.come === "sonno") {
    // "InBed" è il tempo a letto, non il sonno: contarlo vorrebbe dire dare
    // per dormite anche le due ore passate a leggere.
    if (!/Asleep/i.test(grezzo)) continue;
    aggiungi(giorno, regola.campo, regola.come, 0, minutiFra(inizio, fine));
    continue;
  }
  if (regola.come === "oreInPiedi") {
    if (!/Stood/i.test(grezzo)) continue;
    aggiungi(giorno, regola.campo, regola.come, 0, 0);
    continue;
  }

  const valore = Number(grezzo);
  if (!Number.isFinite(valore)) continue;
  aggiungi(giorno, regola.campo, regola.come, valore, 0);
}

const oggi = new Date().toLocaleDateString("sv-SE", { timeZone: process.env.USER_TIMEZONE || "Europe/Rome" });

const daMandare = [...giorni.entries()]
  .filter(([giorno]) => giorno < oggi) // oggi lo sa meglio il telefono
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([giorno, misure]) => {
    const corpo = { data: giorno };
    for (const [campo, v] of Object.entries(misure)) {
      const come = Object.values(TIPI).find((t) => t.campo === campo)?.come;
      const valore =
        come === "media" ? (v.n ? v.somma / v.n : null)
        : come === "ultimo" ? v.ultimo
        : v.somma;
      if (valore === null || !Number.isFinite(valore)) continue;
      corpo[campo] = Math.round(valore * 100) / 100;
    }
    return corpo;
  })
  .filter((c) => Object.keys(c).length > 1);

console.log(`${righe.toLocaleString("it-IT")} righe lette · ${daMandare.length} giorni da mandare`);
if (daMandare.length) {
  console.log("primo:", JSON.stringify(daMandare[0]));
  console.log("ultimo:", JSON.stringify(daMandare[daMandare.length - 1]));
}

if (!SCRIVI) {
  console.log("\nProva soltanto: niente è stato scritto. Rilancia con --scrivi per mandarli davvero.");
  process.exit(0);
}

let fatti = 0;
for (const corpo of daMandare) {
  const r = await fetch(`${BASE}/api/salute`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-secret": SEGRETO },
    body: JSON.stringify(corpo),
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    console.log(`NO  ${corpo.data} ${r.status} ${JSON.stringify(d).slice(0, 160)}`);
  } else {
    fatti += 1;
    if (fatti % 25 === 0) console.log(`… ${fatti}/${daMandare.length}`);
  }
  // Airtable regge cinque richieste al secondo e ogni giorno è una scrittura:
  // andare più veloce vuol dire farsi rifiutare a metà storico.
  await new Promise((r) => setTimeout(r, 260));
}
console.log(`Fatto: ${fatti} giorni scritti su ${daMandare.length}.`);
