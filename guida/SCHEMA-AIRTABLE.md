# Lo schema Airtable, tabella per tabella

Le undici tabelle che la dashboard si aspetta. Normalmente NON serve crearle
a mano: le crea la rotta `/api/admin/tabelle` (tappa 5 del percorso) o lo
script `strumenti/crea-tabelle.mjs`, che leggono queste stesse definizioni
da `lib/tabelle.mjs`. Questo file serve da riferimento, e da rete di
sicurezza se un giorno servisse ricostruire qualcosa a mano.

Le scelte dei campi a elenco devono combaciare con il codice: se se ne
aggiunge una nel codice va aggiunta anche sulla base, e viceversa.

## Profilo

Una riga sola: chi sei e le tue preferenze.

| Campo | Tipo | Note |
|---|---|---|
| Nome | testo | |
| Cognome | testo | |
| NomeSistema | testo | il nome della dashboard scelto da Config; vuoto = quello di partenza |
| Ruolo | testo | |
| Citta | testo | |
| FocusDelGiorno | testo lungo | |
| Abitudini | testo lungo | JSON: `[{id, nome, tipo: 'spunta'\|'contatore', obiettivo}]` |
| ObiettivoCalorico | numero intero | |
| MinutiFormazione | numero intero | vuoto vale 150 |
| PesoObiettivo | numero, 1 decimale | vuoto = nessun traguardo sulla curva |
| Settori | testo lungo | JSON: le colonne dei Cicli Aperti, in ordine; vuoto = le quattro predefinite |
| PasswordHash | testo | la password scelta da Config, come hash; vuoto = vale quella d'ambiente |

## Persone

| Campo | Tipo | Scelte |
|---|---|---|
| Nome | testo | |
| Organizzazione | testo | |
| Tipo | scelta singola | lavoro, cliente, fornitore, personale, altro |
| Note | testo lungo | |
| UltimoContatto | data | |
| CreatoIl | data e ora | |

## Task

| Campo | Tipo | Scelte |
|---|---|---|
| Titolo | testo | |
| Nota | testo lungo | |
| Fascia | scelta singola | ritardo, oggi, settimana, avanti |
| Temperatura | scelta singola | hot, warm, cold |
| Persona | collegamento a Persone | più persone ammesse |
| Tag | scelte multiple | finanze, lavoro, personale (se ne aggiungono scrivendole) |
| Posizione | numero intero | |
| Quadrante | scelta singola | Q1, Q2, Q3, Q4 |
| Scadenza | data | facoltativa |
| Priorita | numero intero | da 1 a 5 |
| Allegati | allegati | |
| CreatoIl | data e ora | |
| CompletatoIl | data e ora | vuoto = aperto |

## CicliAperti

I pensieri parcheggiati per settore, prima che diventino impegni.

| Campo | Tipo | Scelte |
|---|---|---|
| Titolo | testo | |
| Nota | testo lungo | |
| Settore | scelta singola | Amministrazione, Personale, IT, Vendite (se ne aggiungono scrivendole) |
| Posizione | numero intero | |
| CreatoIl | data e ora | |
| PromossoIl | data e ora | vuoto = ancora aperto |
| TaskId | testo | la riga Task nata dalla promozione |

## Catture

| Campo | Tipo | Scelte |
|---|---|---|
| Titolo | testo | la riformulazione dello smistatore |
| Testo | testo lungo | il testo grezzo |
| Provenienza | scelta singola | dashboard, telegram, telegram-voce, script |
| Destinazione | scelta singola | task, persone, finanze, obiettivi, memoria |
| Urgenza | scelta singola | oggi, settimana, avanti |
| ViaClassificazione | scelta singola | modello, regole |
| CreatoIl | data e ora | |

## LogGiornalieri

Una riga per giorno. La Data è testo `YYYY-MM-DD` calcolato nel fuso
dell'utente, non dal server.

| Campo | Tipo | Note |
|---|---|---|
| Data | testo | `YYYY-MM-DD`, chiave della riga |
| Abitudini | testo lungo | JSON: `{idAbitudine: true \| numero}` |
| Pasti | testo lungo | JSON, per usi futuri |
| Finanze | testo lungo | JSON, per usi futuri |
| Salute | testo lungo | JSON: peso e misure dell'orologio |

## Obiettivi

| Campo | Tipo | Scelte |
|---|---|---|
| Nome | testo | |
| Periodo | scelta singola | settimana, mese, anno, annoProssimo, 5anni |
| Fatto | casella | |
| Progresso | testo | facoltativo, es. 3/5 |
| Valore | numero intero | a che punto sei |
| Target | numero intero | vuoto = non si misura, si spunta |
| Posizione | numero intero | |
| CreatoIl | data e ora | |

## Memoria

| Campo | Tipo | Scelte |
|---|---|---|
| Testo | testo lungo | |
| Provenienza | scelta singola | cattura, task-chiuso, diario, sistema |
| Origine | testo | riferimento alla riga da cui arriva |
| CreatoIl | data e ora | |
| Embedding | testo lungo | vuoto, per il futuro |

## Registro

| Campo | Tipo | Note |
|---|---|---|
| Evento | testo | es. task-completato, briefing-inviato, domanda |
| Dettaglio | testo lungo | |
| Chiave | testo | unicità, es. briefing-2026-01-15 |
| QuandoIl | data e ora | |

## Allenamenti

Una riga per giorno di programma.

| Campo | Tipo | Scelte |
|---|---|---|
| Titolo | testo | |
| Data | testo | `YYYY-MM-DD` |
| Programma | testo | il nome del programma |
| Giorno | numero intero | da 1 |
| Settimana | numero intero | da 1 |
| Fase | testo | |
| Tipo | scelta singola | tapis, camminata, intervalli, circuito, piscina, riposo |
| Conversione | scelta singola | camminata, circuito, intervalli, piscina, riposo |
| Dettaglio | testo lungo | |
| Target | testo | |
| Pesata | casella | |
| FattoIl | testo | momento ISO della spunta, vuoto = non fatto |
| Peso | numero, 1 decimale | |
| Modalita | scelta singola | standard, cliente, emergenza |

## Formazione

| Campo | Tipo | Scelte |
|---|---|---|
| Titolo | testo | |
| Tipo | scelta singola | corso, libro, podcast, video, articolo, evento, pratica |
| Minuti | numero intero | |
| Data | data | |
| Fonte | testo | |
| Note | testo lungo | |
| CreatoIl | data e ora | |
