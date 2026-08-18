/**
 * I prompt pronti, dentro i moduli.
 *
 * L'utente non deve andare a cercarli nella guida: dove serve un contenuto
 * (il programma, le abitudini) o una procedura (l'orologio, il calendario),
 * il prompt sta lì, con il bottone per copiarlo. Si incolla alla propria AI,
 * qualunque sia, e si torna con il blocco o con la cosa fatta.
 *
 * File client-safe, senza dipendenze. La copia comoda da leggere vive anche
 * nella guida (PROMPT-PRONTI.md): se cambi qui, cambia anche là.
 */

export const PROMPT_ALLENAMENTO = `Preparami un programma di allenamento personalizzato. Prima fammi le domande che ti servono (il mio livello, quanti giorni a settimana, quanto tempo per seduta, che attrezzatura ho, un eventuale obiettivo), poi generami SOLO un blocco JSON in questo formato esatto, senza testo prima o dopo:

{
  "nome": "Nome del programma",
  "giorni": [
    {
      "giorno": 1,
      "settimana": 1,
      "fase": "Nome della settimana (es. Partenza)",
      "tipo": "camminata",
      "titolo": "Cosa si fa, in una riga (es. Camminata 40')",
      "dettaglio": "Il passo passo della seduta, in poche righe",
      "pesata": true
    }
  ]
}

Regole del formato:
- "giorno" parte da 1 e cresce di 1 per OGNI giorno del programma, compresi i giorni di riposo (che hanno "tipo": "riposo").
- "settimana" è il numero della settimana, da 1.
- "tipo" è uno solo fra: camminata, tapis, circuito, intervalli, piscina, riposo.
- "pesata": true va messa su un giorno fisso a settimana (per esempio il primo), sugli altri si omette.
- "titolo" con la durata in minuti tra apici (es. 40'), perché la dashboard la legge da lì.
- Ogni seduta deve avere senso anche in versione accorciata: la dashboard gestisce tre modalità (piena, 40 minuti, 20 minuti) in automatico.`;

export const PROMPT_ABITUDINI = `Aiutami a scegliere le abitudini quotidiane da tracciare: fammi qualche domanda su cosa voglio migliorare, proponimene poche (da 2 a 5: quelle che si tengono davvero), poi generami SOLO un blocco JSON in questo formato esatto, senza testo prima o dopo:

[
  { "id": "acqua", "nome": "Acqua", "tipo": "contatore", "obiettivo": 8 },
  { "id": "lettura", "nome": "Lettura", "tipo": "spunta" }
]

Regole del formato:
- "id" è una parola sola, minuscola, senza spazi né accenti.
- "tipo" è "spunta" (fatto o non fatto) oppure "contatore" (si conta quante volte al giorno, e allora serve "obiettivo" maggiore di zero).`;

/**
 * L'orologio non si "genera": si collega, una volta sola, con un comando di
 * Comandi Rapidi su iPhone. Il prompt porta la procedura DENTRO l'AI
 * dell'utente, che lo accompagna passo per passo.
 */
export const promptSalute = (indirizzo) => `Guidami passo passo, una cosa alla volta chiedendomi conferma di quello che vedo, a creare su iPhone il comando di Comandi Rapidi che ogni sera manda i miei dati Salute alla mia dashboard personale. La procedura tecnica esatta è questa:

1. App Comandi Rapidi, tocca +, nuovo comando.
2. Azione "Trova campioni di dati sanitari": Tipo Passi, "Data di inizio è oggi", e SOPRATTUTTO "Raggruppa per: Giorno" (senza, tornano centinaia di campioni invece del totale). Poi "Imposta variabile" con nome passi.
3. Ripeti con un blocco INDIPENDENTE per ogni altra misura che voglio (calorie attive, minuti di esercizio, battito a riposo, sonno in minuti, distanza km, peso). Attenzione: Comandi Rapidi tende ad agganciare l'uscita dell'azione precedente trasformando il blocco in un "Filtra", che torna sempre vuoto: ogni misura vuole il suo "Trova".
4. Azione "Ottieni contenuto di un URL":
   - indirizzo: ${indirizzo}/api/salute
   - metodo: POST
   - intestazione: x-api-secret con il valore del mio API_SECRET (lo recupero da Vercel: il mio progetto, Settings, Environment Variables)
   - corpo JSON, un campo per misura, con i campi impostati come TESTO (non Numero: una variabile vuota come numero rompe tutto il messaggio). I nomi dei campi accettati: passi, calorieAttive, esercizioMinuti, inPiediOre, distanzaKm, frequenzaRiposo, hrv, sonnoMinuti, vo2max, peso. Al posto dei valori, le variabili dei passaggi 2 e 3. Mando solo i campi che ho davvero.
5. Nella scheda Automazione: +, "Ora del giorno", le 23:30, ogni giorno, "Esegui immediatamente" senza chiedere conferma, e scelgo il comando appena creato.
6. Prova finale: eseguo il comando a mano e controllo che i numeri compaiano nella scheda Salute della dashboard.`;

export const PROMPT_CALENDARIO = `Guidami passo passo, una cosa alla volta chiedendomi conferma di quello che vedo, a collegare il mio Google Calendar alla mia dashboard personale. La procedura tecnica esatta è questa:

1. Su calendar.google.com: impostazioni del calendario che voglio vedere, sezione "Integra il calendario", copio l'"Indirizzo segreto in formato iCal" (NON quello pubblico). Quell'indirizzo è una password: chi lo ha legge il mio calendario.
2. Su vercel.com: il mio progetto, Settings, Environment Variables, aggiungo la variabile GOOGLE_CALENDAR_ICAL_URLS con valore nel formato: NomeAgenda = indirizzo-segreto. Più agende si separano con punto e virgola, ognuna col suo nome davanti all'uguale.
3. Rifaccio il deploy: scheda Deployments, i tre puntini sull'ultimo, Redeploy.
4. Prova finale: ricarico la dashboard e la scheda Calendario mostra le mie settimane.`;
