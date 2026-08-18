/**
 * Crea le undici tabelle su una base Airtable vuota.
 *
 * Si lancia una volta, all'inizio, contro una base appena creata:
 *
 *     node --env-file=.env.local strumenti/crea-tabelle.mjs
 *
 * Serve un token con i permessi schema.bases:write e data.records:write
 * sulla base indicata da AIRTABLE_BASE_ID. È idempotente: le tabelle che
 * esistono già si saltano, quelle che mancano si creano. Non tocca mai
 * i dati, quindi rilanciarlo non fa danni.
 *
 * L'ordine non è casuale: Persone prima di Task, perché Task ha il campo
 * collegato Persona e Airtable vuole che la tabella collegata esista già.
 * Il campo inverso su Persone lo crea Airtable da solo.
 */

const BASE = process.env.AIRTABLE_BASE_ID;
const CHIAVE = process.env.AIRTABLE_API_KEY;

if (!BASE || !CHIAVE) {
  console.error("Mancano AIRTABLE_API_KEY o AIRTABLE_BASE_ID. Guarda .env.local.example.");
  process.exit(1);
}

const { creaTabelle } = await import("../lib/tabelle.mjs");

const { create, saltate } = await creaTabelle(BASE, CHIAVE);
for (const nome of saltate) console.log(`· ${nome}: c'è già, la salto.`);
for (const nome of create) console.log(`✓ ${nome}: creata.`);
console.log("\nFatto. Ora la dashboard può leggere e scrivere.");
