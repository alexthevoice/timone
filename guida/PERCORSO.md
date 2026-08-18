# Il percorso, a tappe

Ogni tappa finisce con una verifica. Se la verifica non passa, non si va
avanti: si sistema lì. Le tappe 0-6 sono il cuore; dalle 7 in poi sono
pezzi facoltativi, ognuno indipendente dagli altri.

---

## Tappa 0: gli account

Servono quattro account gratuiti. Per ognuno: crearlo se manca, e riuscire
a entrare.

1. **GitHub** (github.com): qui vivrà la tua copia del codice.
2. **Vercel** (vercel.com): qui il codice va online. Registrati scegliendo
   "Continue with GitHub": i due account si collegano da soli.
3. **Airtable** (airtable.com): qui vivranno i tuoi dati.
4. **Anthropic** (console.anthropic.com): il cervello. Serve una carta:
   vai su Billing, carica un minimo (5 dollari bastano per mesi) e imposta
   un limite di spesa mensile.

**Verifica:** riesci a entrare in tutti e quattro.

---

## Tappa 1: la tua copia del codice

1. Vai su `github.com/alexthevoice/timone`.
2. Bottone verde **Use this template** → **Create a new repository**.
3. Nome a piacere (per esempio `timone`), visibilità **Private**, poi
   **Create repository**.

**Verifica:** sei su una pagina `github.com/TUONOME/timone` con dentro le
cartelle `app`, `components`, `lib`, `guida`.

---

## Tappa 2: la base dati e il suo token

1. Su airtable.com: **Create a base**, partendo da zero ("Start from
   scratch"). Nome a piacere. Si apre con una tabellina vuota: lasciala
   com'è, spariranno i dubbi alla tappa 5.
2. Guarda l'indirizzo nella barra del browser: contiene un codice che
   inizia per `app`, tipo `appXXXXXXXXXXXXXX`. Quello è l'**ID della
   base**: copialo da parte.
3. Vai su `airtable.com/create/tokens` → **Create token**:
   - nome a piacere;
   - Scopes: aggiungi `data.records:read`, `data.records:write`,
     `schema.bases:read`, `schema.bases:write`;
   - Access: solo la base appena creata.
   Crea, e copia il token (inizia per `pat`): te lo mostra una volta sola.

**Verifica:** hai due codici copiati da parte, uno che inizia per `app` e
uno che inizia per `pat`.

---

## Tappa 3: la chiave del cervello

1. Su console.anthropic.com → **API Keys** → **Create Key**. Copiala
   (inizia per `sk-ant-`): anche questa si vede una volta sola.
2. Controlla di avere il limite di spesa mensile impostato (tappa 0).

**Verifica:** hai la chiave `sk-ant-...` copiata da parte.

---

## Tappa 4: online

1. Su vercel.com: **Add New...** → **Project** → importa il repository
   `timone` creato alla tappa 1.
2. PRIMA di premere Deploy, apri **Environment Variables** e inserisci
   queste (i dettagli di ognuna sono in VARIABILI.md):
   - `AIRTABLE_API_KEY`: il token `pat...` della tappa 2
   - `AIRTABLE_BASE_ID`: il codice `app...` della tappa 2
   - `ANTHROPIC_API_KEY`: la chiave `sk-ant-...` della tappa 3
   - `ANTHROPIC_MODEL_SMISTAMENTO`: `claude-haiku-4-5`
   - `AUTH_SECRET`: una stringa casuale lunga almeno 40 caratteri
     (fattela generare da Claude o da un generatore di password)
   - `API_SECRET`: un'altra stringa casuale, diversa
   - `CRON_SECRET`: un'altra ancora
   - `DASHBOARD_PASSWORD`: la password con cui entrerai TU. Una frase
     lunga, non una parola.
   - `USER_TIMEZONE`: il tuo fuso, per l'Italia `Europe/Rome`
   - `NEXT_PUBLIC_APP_NAME`: come vuoi chiamare la tua dashboard
     (facoltativa: senza, si chiama Timone)
3. **Deploy**, e aspetta che finisca. Ti dà un indirizzo tipo
   `tuonome-timone.vercel.app`: è il tuo. Aggiungi anche
   `NEXT_PUBLIC_APP_URL` con quell'indirizzo completo di `https://`
   (Settings → Environment Variables) e rifai il deploy
   (Deployments → i tre puntini sull'ultimo → Redeploy).

**Verifica:** aprendo il tuo indirizzo vedi la schermata di accesso col
nome che hai scelto, e con la tua password entri. La dashboard mostrerà
errori sulle schede: è giusto così, le tabelle non esistono ancora.

---

## Tappa 5: le tabelle

1. Nel browser, già entrato nella dashboard, visita
   `https://IL-TUO-INDIRIZZO/api/admin/tabelle`.
2. Aspetta qualche secondo: risponde una pagina di testo con l'elenco
   `create: [...]` con undici nomi.
3. Torna alla dashboard e ricarica.

**Verifica:** le schede non mostrano più errori ma stati vuoti sensati
("Niente, per ora", "Nessun programma caricato"). Su Airtable la tua base
ha undici tabelle nuove. La tabellina vuota di partenza puoi cancellarla
quando vuoi (tasto destro sul suo nome → Delete table).

---

## Tappa 6: la prima cattura

1. Nella barra in fondo alla dashboard scrivi: `chiamare Giulia domani
   per il preventivo` e premi Invio.
2. Guarda la scheda "Ultime cose buttate dentro" e le cose da fare.

**Verifica:** la frase è comparsa fra le catture con una destinazione, e
fra le cose da fare c'è "Giulia" collegata. La tua dashboard funziona:
da qui in poi sono rifiniture.

---

## Tappa 7 (facoltativa): Telegram, per parlarle dal telefono

1. Su Telegram cerca **@BotFather** → `/newbot` → dagli un nome e uno
   username: ti risponde con un token. Copialo.
2. Cerca **@userinfobot** e scrivigli qualsiasi cosa: ti dice il tuo id
   numerico. Copialo.
3. Su Vercel aggiungi le variabili `TELEGRAM_BOT_TOKEN` (il token),
   `TELEGRAM_USER_ID` (il tuo id), `TELEGRAM_WEBHOOK_SECRET` (una stringa
   casuale nuova), e rifai il deploy.
4. Registra il collegamento visitando nel browser questo indirizzo,
   sostituendo le tre parti in maiuscolo:
   `https://api.telegram.org/botIL-TOKEN/setWebhook?url=https://IL-TUO-INDIRIZZO/api/telegram/webhook&secret_token=IL-WEBHOOK-SECRET`

**Verifica:** la pagina risponde `"ok":true`. Scrivi al tuo bot "peso 80":
risponde che l'ha segnato, e il numero compare nella scheda Salute.
Scrivigli una nota qualsiasi: te la smista come la barra.

---

## Tappa 8 (facoltativa): i dati dell'orologio, da iPhone

Le istruzioni complete, passo per passo, stanno nel README del tuo
repository, sezione "I dati dell'orologio, da iPhone". In sintesi: un
comando di Comandi Rapidi legge Salute una volta al giorno e la spedisce a
`https://IL-TUO-INDIRIZZO/api/salute` con l'intestazione `x-api-secret`
uguale al tuo `API_SECRET`.

**Verifica:** esegui il comando a mano una volta: la scheda Salute mostra
i numeri di oggi.

---

## Tappa 9 (facoltativa): il calendario

1. Su Google Calendar: impostazioni del calendario che vuoi vedere →
   "Indirizzo segreto in formato iCal" → copia.
2. Su Vercel aggiungi `GOOGLE_CALENDAR_ICAL_URLS` con quell'indirizzo
   (più agende si separano con punto e virgola, col nome davanti:
   `Lavoro = https://...; Famiglia = https://...`), e rifai il deploy.

Quell'indirizzo è segreto davvero: chiunque lo abbia legge il calendario.

**Verifica:** la scheda Calendario mostra le tue settimane.

---

## Tappa 10 (facoltativa): il briefing del mattino

Non c'è niente da fare: se Telegram (tappa 7) è attivo e `CRON_SECRET`
esiste, ogni mattina il bot ti manda il riassunto della giornata. L'orario
del cron è in `vercel.json` ed è in UTC: le 5 UTC sono le 7 italiane
d'estate, le 6 d'inverno.

**Verifica:** domattina hai un messaggio dal tuo bot.

---

## Tappa 11: falla tua

Da qui in poi lavori direttamente col tuo Claude, senza percorso:

- Il **Profilo**: apri la tabella Profilo su Airtable e crea la prima
  riga: nome, città, le abitudini che vuoi tracciare (il formato è
  spiegato nella descrizione del campo), il peso obiettivo se ne hai uno.
- Gli **obiettivi**: si scrivono direttamente in dashboard, colonna per
  colonna.
- Un **programma di allenamento**: chiedi al tuo Claude di prepararne uno
  nel formato di `/api/allenamento/importa` (il formato è documentato nel
  file di quella rotta) e di caricartelo.
- Tutto il resto: il codice è tuo. Il tuo Claude lo può modificare, e
  REGOLE-DI-CASA.md gli spiega come farlo senza rompere le promesse su
  cui la dashboard si regge.
