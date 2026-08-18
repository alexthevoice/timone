# Timone

Una dashboard personale a un utente solo: task, calendario, abitudini,
obiettivi, allenamento e una memoria che risponde alle domande citando da
dove viene quello che dice.

Le parli — a voce o scrivendo — e lei archivia da sola nel posto giusto.

Il nome è tuo: si cambia in un minuto con la variabile `NEXT_PUBLIC_APP_NAME`
(o in `lib/app.js`), e da lì cambia in barra, nel login e nel titolo della
finestra.

## Com'è fatta

| Livello | Scelta |
|---|---|
| Framework | Next.js, App Router, JavaScript |
| Dati | Airtable |
| Modello | Claude (uno veloce per lo smistamento, uno bravo per le risposte) |
| Trascrizione | Whisper di OpenAI, per i vocali di Telegram (facoltativo) |
| Calendario | indirizzi segreti iCal di Google, più agende, in sola lettura |
| Salute | Comandi Rapidi di iPhone, che spedisce qui i dati dell'orologio |
| Accesso | password singola e cookie firmato |
| Dove gira | Vercel |

## Per farla partire

```bash
cp .env.local.example .env.local   # e riempi i valori, sono tutti spiegati lì
npm install
node --env-file=.env.local strumenti/crea-tabelle.mjs   # crea le 10 tabelle su una base Airtable vuota
npm run dev
```

Serve almeno `ANTHROPIC_API_KEY`, `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`,
`AUTH_SECRET` e `DASHBOARD_PASSWORD`. Il resto accende un pezzo per volta:
il calendario, Telegram, il briefing del mattino.

Per metterla online: un repo tuo su GitHub, "Import" su Vercel, le stesse
variabili nel pannello del progetto, e il dominio che ne esce è la tua
dashboard. Senza chiave del modello la cattura funziona lo stesso, smistata
dalle regole a parole chiave: il sistema degrada, non si rompe.

## Le regole di casa

Stanno in [CLAUDE.md](./CLAUDE.md) e non sono decorazione: sono le cose che,
se si dimenticano, si pagano. Le prime cinque:

1. Tutte le letture e le scritture passano da `lib/store.js`.
2. Il caricamento di una pagina non chiama mai il modello.
3. "Che giorno è oggi" ha una sola risposta nel codice, nel fuso dell'utente.
4. La cattura non fallisce mai: se il modello non risponde, smistano le regole,
   e la via di classificazione finisce accanto a ogni cattura.
5. Gli obiettivi non si azzerano mai da soli.

## La versione

In alto a destra, prima dell'orologio, c'è un numero tipo `v1.001`, e lo stesso
numero sta sulla schermata di accesso. Non è un numero di rilascio: conta i
giri di lavoro fatti sulla dashboard, e si alza di uno ogni volta che si mette
mano a qualcosa. Vive in [`lib/versione.js`](./lib/versione.js) insieme allo
storico — una riga per giro, che dice cosa è cambiato.

Serve a una cosa concreta: guardare lo schermo e capire se quello che stai
vedendo è l'ultima versione o una pagina rimasta aperta da ieri in un'altra
scheda del browser.

## L'allenamento a tre modalità

Un programma datato non ha una versione sola. Ogni giornata si può fare in tre
modi — **Standard 60'**, **Cliente 40'**, **Emergenza 20'** — e la regola che
li tiene insieme è una: se non ci stanno sessanta minuti fai quaranta, se non
ci stanno quaranta fai venti. Quello che salti non si recupera il giorno dopo.

Non sono tre programmi: le versioni corte dipendono solo dal tipo di giornata,
quindi sono una tabella di poche righe in [`lib/modalita.js`](./lib/modalita.js)
e non centinaia di allenamenti scritti a mano.

Il programma lo carichi tu, con una chiamata a `/api/allenamento/importa`
(il formato è spiegato lì dentro): la schermata **Allenamento** lo mostra come
un foglio stampato, con tre pulsanti S / C / E per ogni giorno. Il conto delle
modalità in fondo è il dato che serve davvero: se le C e le E sono la
maggioranza, il problema non è la volontà, è l'orario in cui provi ad allenarti.

## I dati dell'orologio, da iPhone

Apple non pubblica Salute su internet: non esiste nessun indirizzo a cui questo
server possa chiedere i tuoi passi, e non è una dimenticanza — quei dati stanno
sul telefono e ci restano. L'unica strada vera è il verso opposto: è il
telefono che, una volta al giorno, legge Salute e li spedisce qui.

Si fa con **Comandi Rapidi**, in dieci minuti e una volta sola.

**Il comando.** Apri Comandi Rapidi sull'iPhone, tocca `+` e aggiungi, in
quest'ordine:

1. **Trova campioni di dati sanitari** — Tipo: *Passi*, *Data di inizio è oggi*,
   Unità: *conteggio*, e soprattutto **Raggruppa per: Giorno**. Poi **Imposta
   variabile** → `passi`.

   Il raggruppamento è il punto: senza, l'azione restituisce le centinaia di
   campioni singoli che l'iPhone registra in una giornata invece del totale.
   Con "Giorno" torna un numero solo, e Salute aggrega come si deve — somma
   per passi, calorie e minuti, media per battito e peso.
2. Ripeti con un blocco **indipendente** per ogni altra misura. Attenzione:
   Comandi Rapidi tende ad agganciare l'uscita dell'azione precedente e a
   trasformare la seconda in un *Filtra* — quello cerca le calorie dentro i
   passi e torna sempre vuoto. Ogni misura vuole il suo Trova.
3. **Ottieni contenuto di un URL**, e qui la parte che conta:
   - indirizzo: `https://IL-TUO-DOMINIO/api/salute`
   - metodo: **POST**
   - intestazioni: `x-api-secret` con dentro il valore di `API_SECRET`
   - corpo della richiesta: **JSON**, con un campo per misura, così:

   ```json
   {
     "passi": 8432,
     "calorieAttive": 410,
     "esercizioMinuti": 38,
     "frequenzaRiposo": 58,
     "sonnoMinuti": 427,
     "distanzaKm": 6.4,
     "peso": 82.4
   }
   ```

   Al posto dei numeri metti le variabili dei passi 1 e 2, e imposta i campi
   come **Testo** e non come Numero: il giorno in cui una misura non ha
   campioni la variabile è vuota, e un campo numerico vuoto rompe tutto il
   messaggio, mentre come testo passa liscio e il server lo ignora. **Manda
   solo i campi che hai davvero**: un campo che non arriva resta com'era, un
   campo mandato a zero diventa uno zero, e uno zero è una bugia diversa da un
   dato mancante.

**L'automazione.** Nella scheda *Automazione*, `+` → *Ora del giorno* → le
23:30, ogni giorno, **Esegui immediatamente** e senza chiedere conferma. Scegli
il comando appena creato. Da lì in poi non ci pensi più.

Qualche nota che evita mezz'ora di tentativi:

- **La data la decidi tu.** Puoi aggiungere `"data": "2026-08-16"` al JSON. Se
  non c'è, vale il giorno di oggi calcolato nel fuso di `USER_TIMEZONE`.
- **Si può mandare più volte al giorno.** L'ultimo invio vince campo per campo:
  un comando che manda solo i passi non cancella il sonno mandato prima.
- **Il peso arriva anche da qui.** Se hai una bilancia collegata a Salute, il
  peso entra da solo. Oppure lo detti al bot Telegram: "peso 82,4".
- **I campi accettati** sono `passi`, `calorieAttive`, `esercizioMinuti`,
  `inPiediOre`, `distanzaKm`, `frequenzaRiposo`, `hrv`, `sonnoMinuti`,
  `vo2max`, `peso`. Quelli che non riconosce li ignora, e se non ne riconosce
  nessuno risponde con l'elenco di quelli buoni.

### Lo storico, una volta sola

Il comando manda il giorno in corso. Per gli anni indietro c'è l'esportazione
dell'app Salute: **Salute → la tua foto in alto a destra → Esporta tutti i dati
sanitari**. Esce un `esportazione.zip`; dentro c'è `apple_health_export/export.xml`.

    node --env-file=.env.local strumenti/importa-salute.mjs export.xml --da 2025-01-01
    node --env-file=.env.local strumenti/importa-salute.mjs export.xml --da 2025-01-01 --scrivi

Legge il file una riga alla volta, mette insieme i numeri giorno per giorno e
li manda alla stessa rotta che usa il telefono. Senza `--scrivi` non scrive
niente e stampa solo cosa manderebbe. **Il giorno di oggi non lo tocca**:
quello arriva dal telefono ed è più fresco dell'esportazione.

## Il backup

Il pulsante *backup* nella barra in alto scarica ogni riga che il sistema sa di
te, in un file solo. È anche la via d'uscita: da lì si va via da Airtable, da
Vercel, o da entrambi, senza ricominciare da zero.

## Licenza

MIT. Vedi [LICENSE](./LICENSE).
