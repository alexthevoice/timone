import path from "node:path";
import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // La cartella genitore ha un suo package-lock.json e Turbopack risalirebbe fin lì.
  // La radice del progetto è questa, e basta dirglielo.
  // fileURLToPath e non URL.pathname: il percorso contiene uno spazio, che
  // in un URL diventa %20 e poi non corrisponde a nessuna cartella vera.
  turbopack: {
    root: path.dirname(fileURLToPath(import.meta.url)),
  },

  // Il programma di allenamento è una pagina HTML autosufficiente, la stessa
  // che si stampa in due facciate A4: sta in public/ e non fra i componenti,
  // perché non deve leggere niente e non deve cambiare quando cambia la
  // dashboard. Questa riga serve solo a dargli un indirizzo pulito.
  async rewrites() {
    return [{ source: "/programma", destination: "/programma.html" }];
  },
};

export default nextConfig;
