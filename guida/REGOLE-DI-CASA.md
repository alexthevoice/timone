# Le regole di casa

Sono le regole con cui questo codice è scritto, ognuna con la sua ragione.
Servono a te e al tuo Claude quando, a dashboard funzionante, comincerete a
modificarla: rispettandole, le modifiche non rompono le promesse su cui
tutto si regge. È lo stesso contenuto del file CLAUDE.md del repository,
che Claude Code legge da solo.

Dashboard personale a un utente solo: task, calendario, abitudini, obiettivi,
allenamento e una memoria che risponde citando le fonti. Il database è
Airtable, il modello è Claude, gira su Vercel. Il nome dell'app vive in
`lib/app.js` (o nella variabile `NEXT_PUBLIC_APP_NAME`): è l'unico posto.

## Le regole che non si negoziano

1. **Tutte le letture e le scritture passano da `lib/store.js`.** Nessuna rotta e
   nessun componente tocca Airtable direttamente. Il giorno in cui si cambia
   database si riscrive quel file e basta.
2. **Il caricamento di una pagina non chiama mai il modello.** Le schede leggono
   l'ultimo dato salvato. Il modello parte solo per: una cattura, una domanda, un
   pulsante premuto, il cron. Questa regola vale soldi veri.
3. **"Che giorno è oggi?" ha una sola risposta nel codice:** la funzione in
   `lib/data.js`, che usa il fuso di `USER_TIMEZONE`. Mai `new Date()` sparso in
   giro per calcolare una data di archiviazione. Il server vive in UTC e la sua
   mezzanotte non è la tua.
4. **La cattura non fallisce mai.** Se il modello non risponde, si smista con le
   regole a parole chiave. Meglio una nota nella casella sbagliata che una nota
   persa.
5. **Le destinazioni sono cinque e stanno in un posto solo** (`lib/classify.js`):
   task, persone, finanze, obiettivi, memoria. Quello che torna dal modello si
   valida contro quell'elenco: se inventa una chiave, si passa alle regole.
   **"Finanze" non ha una scheda sua:** una cattura finanze atterra fra i task
   con l'etichetta `finanze`, e la risposta lo dice così com'è. Dove atterra
   ogni destinazione sta in `lib/cattura.js`, in una copia sola per tutte le
   vie (dashboard e Telegram).
6. **Linguaggio: JavaScript, non TypeScript.** Niente Tailwind, niente ESLint,
   niente cartella `src`.
7. **I numeri stanno fermi:** allineati a destra, cifre a larghezza fissa,
   `minimumGroupingDigits: 1` (altrimenti in colonna `7150` e `12.400` non si
   confrontano). Tutta la formattazione dei numeri vive in `lib/numeri.js`.
8. **Il colore ha significato:** verde per la direzione giusta, rosso per il
   contrario, arancione per ciò che scade. Decide la metrica, non il segno.
9. **La versione si alza a ogni giro.** `lib/versione.js` tiene un contatore e
   uno storico: a ogni tornata di modifiche si alza `GIRO` di uno e si aggiunge
   una riga a `STORICO`. Il numero compare in barra e sulla schermata di
   accesso, e serve a capire a colpo d'occhio se quella che si sta guardando è
   l'ultima versione o una pagina rimasta aperta da ieri.

## Scelte da non "correggere" per sbaglio

- **Gli obiettivi non si azzerano mai da soli.** Non sono agganciati a settimana
  o mese: vivono in una loro tabella, e si chiudono o si rimuovono a mano. Se un
  giorno sembrano "da agganciare al periodo", è il riflesso sbagliato: un
  obiettivo è una promessa, non una misurazione.
  Gli orizzonti sono **cinque** (`settimana`, `mese`, `anno`, `annoProssimo`,
  `5anni`) e stanno tutti nella stessa scheda, in Home. Le mete a cinque anni
  non vanno spostate in una pagina loro: una meta che si apre due volte l'anno
  non è una meta, è un ricordo. Il punto è rivederle ogni volta che si apre la
  dashboard.
  L'elenco vive in due posti che devono restare uguali (`lib/store.js` e
  `lib/classify.js`) e in un terzo che non è codice: le scelte del campo
  `Periodo` su Airtable. Un orizzonte nuovo che non è fra quelle scelte viene
  rifiutato dalla scrittura, quindi si aggiunge prima lì.
  **Il passaggio d'anno è a mano**, come tutto il resto qui: il primo di gennaio
  le promesse dell'anno prossimo non scivolano da sole in "quest'anno". Farlo
  scivolare in automatico vorrebbe dire che un obiettivo cambia significato
  mentre dormi.

- **I quadranti sono di Eisenhower e stanno in `lib/quadranti.js`.** Q1 urgente
  e importante, Q2 importante e non urgente, Q3 urgente e non importante, Q4 né
  l'uno né l'altro. Nella croce urgente sta a sinistra e importante in alto, e
  quella disposizione non è decorazione: è quello che fa vedere lo squilibrio
  senza spiegarlo.
  Un task **senza** quadrante non sparisce dalla croce: lo store gli attacca un
  `quadranteProposto` calcolato con le regole, che **non viene scritto** sulla
  riga. Resta una proposta finché non la conferma il modello o l'utente. Stessa
  cosa per `prioritaProposta`. Non "sistemare" scrivendo la proposta in
  automatico: quel giorno l'utente non saprebbe più cosa ha deciso lui e cosa ha
  deciso il sistema.
  Il pulsante *Assegna i mancanti* chiama il modello, ed è un pulsante apposta:
  la regola 2 vale anche qui.

- **La priorità va da 1 a 5 e negli schemi si scrive come elenco di stringhe.**
  L'output strutturato dell'API rifiuta `minimum`/`maximum` su un intero e
  risponde 400. Il guasto sarebbe invisibile: la cattura ripiega sulle regole e
  continua a funzionare, solo peggio. Se serve un intervallo, si elenca.

- **L'allenamento ha tre modalità, non tre programmi.** Standard 60', Cliente
  40', Emergenza 20': sono tre versioni della stessa giornata, e la regola che
  le tiene insieme è "se non ci stanno 60' fai 40', se non ci stanno 40' fai
  20'". Vivono in `lib/modalita.js` insieme alla **tabella di conversione**,
  che ha una riga per tipo di giornata e non una per seduta.
  Quale riga usare lo dice il campo **`conversione`**, esplicito per riga, col
  tipo come valore predefinito. Non dedurlo dal titolo: in un programma vero
  capita che una seduta si accorci come un tipo diverso dal suo, e basta
  cambiare una parola in un titolo perché la conversione cambi in silenzio.
  La modalità si scrive alla spunta e **si azzera togliendola**: una riga "non
  fatta" che si porta dietro un "fatta in emergenza" falsa il conteggio, che è
  l'unica ragione per cui le modalità esistono. Se le C e le E sono la
  maggioranza, il problema è l'orario, non la volontà.
  **I giorni futuri non si spuntano**, né nella schermata né nella scheda in
  Home: una seduta segnata in anticipo è un dato falso.

- **Il programma di allenamento arriva dal corpo della richiesta**, non da un
  file nel codice: ognuno carica il suo con `/api/allenamento/importa`
  (`inizio` + `programma` con i suoi giorni). Il contenuto si aggiorna con
  `/api/allenamento/allinea`, non reimportando: `importa` con `sostituisci`
  cancella spunte, modalità e pesi; `allinea` aggancia per numero di giorno e
  riscrive solo i testi e le classificazioni. Di suo mostra cosa cambierebbe:
  per scrivere davvero serve `"scrivi": true`.

- **Il peso si segna tutti i giorni**, non solo nei giorni di pesata, e passa da
  `segnaPeso` in `lib/store.js`, l'unico posto che tiene allineate le due
  copie: `Allenamenti.Peso` (dove lo scrivi) e `LogGiornalieri.Salute.peso`
  (dove il resto del sistema lo cerca). Pochi punti sparsi non fanno una curva.
  **La casella per scriverlo è una sola, ed è nella scheda Salute** (o il
  comando "peso 82,5" al bot Telegram). Nella scheda Allenamento il peso si
  legge e basta. La rotta è `/api/peso` e non un pezzo di `/api/allenamento`:
  il peso deve continuare a esistere quando il programma sarà finito.
  **Il traguardo del peso sta nel Profilo** (`PesoObiettivo`), non nel codice:
  vuoto vuol dire che la curva non mostra nessuna riga da rincorrere.

- **Le agende del calendario sono più di una.** `GOOGLE_CALENDAR_ICAL_URLS`
  accetta un elenco, con il nome davanti all'uguale. Ognuna si legge per conto
  suo: se una non risponde, le altre si vedono lo stesso e la scheda dice quale
  manca. La finestra è di quattro mesi e si carica **tutta in una volta**: le
  settimane si sfogliano senza tornare al server.
  Attenzione alla guardia sull'espansione delle ricorrenze: è alta quanto la
  finestra è larga. Abbassarla taglia gli impegni degli ultimi mesi in silenzio.

- **I dati Salute arrivano, non si vanno a prendere.** Apple non espone Salute
  su internet: è l'iPhone che, con un'automazione di Comandi Rapidi, manda i
  numeri a `/api/salute` con l'intestazione `x-api-secret`. Da cui due cose che
  non vanno "sistemate": l'invio è **parziale** (l'ultimo vince campo per campo,
  mandare i passi non deve cancellare il sonno) e la scheda **non inventa mai
  uno zero** al posto di un dato che non è arrivato. Un trattino dice "non l'ho
  ricevuto", uno zero dice "non hai fatto un passo", e sono due cose diverse.

- **I contatori delle abitudini si segnano a valore esatto.** `/api/abitudini`
  accetta `valore`, non solo il passo avanti. La versione a un bottone solo che
  fa +1 e si azzera in fondo sembra più semplice, e lo è finché non sbagli: da
  lì in poi correggere vuol dire cliccare fino a far girare il contatore, e dopo
  due giorni non sai più a che punto sei e smetti di segnare.

- **Un programma di allenamento non è né un task né un'abitudine.** I task
  vivono a fasce ("oggi", "questa settimana") e non hanno una data vera; le
  abitudini si ripetono per sempre e non sanno cosa si fa oggi di preciso. Un
  programma ha un primo giorno, un ultimo e un contenuto diverso ogni giorno:
  per questo ha una tabella sua (`Allenamenti`) e le date si srotolano
  all'importazione con `piuGiorni`, non a ogni lettura. Spuntare la seduta del
  giorno segna anche l'abitudine `allenamento`: due caselle per la stessa cosa
  che dicono cose diverse sono peggio di una sola.

- **Il CSS di `app/globals.css` viene dal mockup** in `mockup/dashboard.html` e
  non va riscritto. I colori sono variabili in cima: per cambiare l'accento si
  tocca una riga sola.

- **Il pannello di dettaglio del CRM segue l'identificativo**, mai la posizione
  in lista: mentre è aperto, una cattura può inserire una riga in testa.

- **Il conto delle chiamate al modello sta nel Registro:** le domande e le
  ricerche scrivono un evento con modello e token. Senza, il costo API del mese
  resta una stima a occhio.

## Airtable, e come si creano le tabelle

Le dieci tabelle si creano su una base vuota con:

    node --env-file=.env.local strumenti/crea-tabelle.mjs

Lo script è idempotente e non tocca mai i dati. Le scelte dei campi a elenco
devono combaciare con il codice: se aggiungi un valore in `lib/classify.js` o
`lib/store.js`, aggiungilo anche sulla base (o viceversa).

Airtable non ha ricerca vettoriale. La memoria funziona passando il contesto al
modello, che con qualche migliaio di voci va bene ed è spesso più preciso della
ricerca per somiglianza. Il campo `Embedding` resta vuoto apposta: serve il
giorno in cui le voci diventano troppe.

## Una trappola d'ambiente da conoscere

**Node e Next non sovrascrivono una variabile che esiste già nell'ambiente.**
Se nella tua shell c'è un `export AIRTABLE_API_KEY` di un altro progetto, in
locale quella vince su `.env.local` e Airtable risponde 401 senza spiegazioni.
Per questo lo script `dev` in package.json parte con `env -u AIRTABLE_API_KEY`.
Stessa cosa per qualsiasi script lanciato a mano:

    env -u AIRTABLE_API_KEY node --env-file=.env.local script.mjs

Online il problema non esiste: su Vercel non c'è nessuna shell che esporta niente.
