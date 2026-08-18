# I prompt pronti

La dashboard non ti chiede di scrivere blocchi di configurazione a mano:
te li fai scrivere dalla TUA intelligenza artificiale, quella che usi già.
Claude, ChatGPT, Gemini o un'altra: non importa, il risultato è un blocco
di testo da copiare e incollare.

Il giro è sempre lo stesso:

1. Copia il prompt qui sotto e incollalo alla tua AI.
2. Rispondi alle sue domande.
3. Copia il blocco che ti restituisce.
4. Incollalo nella dashboard, nel punto indicato.

Se la dashboard dice che il blocco non va bene, copia il messaggio di
errore e rincollalo alla tua AI: lo corregge lei.

---

## Il programma di allenamento

Si incolla nella schermata **Allenamento**, nella casella che compare
quando non c'è ancora nessun programma.

```
Preparami un programma di allenamento personalizzato. Prima fammi le
domande che ti servono (il mio livello, quanti giorni a settimana, quanto
tempo per seduta, che attrezzatura ho, un eventuale obiettivo), poi
generami SOLO un blocco JSON in questo formato esatto, senza testo prima
o dopo:

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
- "giorno" parte da 1 e cresce di 1 per OGNI giorno del programma, compresi
  i giorni di riposo (che hanno "tipo": "riposo").
- "settimana" è il numero della settimana, da 1.
- "tipo" è uno solo fra: camminata, tapis, circuito, intervalli, piscina,
  riposo.
- "pesata": true va messa su un giorno fisso a settimana (per esempio il
  primo), sugli altri si omette.
- "titolo" con la durata in minuti tra apici (es. 40'), perché la
  dashboard la legge da lì.
- Ogni seduta deve avere senso anche in versione accorciata: la dashboard
  gestisce tre modalità (piena, 40 minuti, 20 minuti) in automatico.
```

---

## Le abitudini da tracciare

Si incolla in **Config**, nella sezione Abitudini.

```
Aiutami a scegliere le abitudini quotidiane da tracciare: fammi qualche
domanda su cosa voglio migliorare, proponimene poche (da 2 a 5: quelle
che si tengono davvero), poi generami SOLO un blocco JSON in questo
formato esatto, senza testo prima o dopo:

[
  { "id": "acqua", "nome": "Acqua", "tipo": "contatore", "obiettivo": 8 },
  { "id": "lettura", "nome": "Lettura", "tipo": "spunta" }
]

Regole del formato:
- "id" è una parola sola, minuscola, senza spazi né accenti.
- "tipo" è "spunta" (fatto o non fatto) oppure "contatore" (si conta
  quante volte al giorno, e allora serve "obiettivo" maggiore di zero).
```

---

## Gli obiettivi, sui cinque orizzonti

Questi NON si incollano: si scrivono direttamente nella scheda Obiettivi
della Home, colonna per colonna. Il prompt serve a formularli bene.

```
Aiutami a mettere per iscritto i miei obiettivi su cinque orizzonti:
questa settimana, questo mese, quest'anno, l'anno prossimo, e a cinque
anni. Fammi le domande che servono, spingimi a essere concreto, e alla
fine dammi l'elenco pulito: per ogni orizzonte da uno a tre obiettivi,
una riga ciascuno, scritti come promesse verificabili. Se un obiettivo è
misurabile con un numero, dimmi anche il numero di partenza e quello da
raggiungere.
```

---

## I settori dei Cicli Aperti

Anche questi si scrivono direttamente: le colonne del Kanban si creano
dalla schermata Cicli Aperti, con la casella "nuovo settore". Il prompt
serve a scegliere i nomi giusti.

```
I "cicli aperti" sono i pensieri e le cose da fare che mi girano in testa,
parcheggiati su una parete divisa per settori (come i reparti di
un'azienda: Amministrazione, Vendite, IT...). In base a come è fatta la
mia vita e il mio lavoro (fammi le domande che servono), proponimi da 4 a
6 nomi di settore, corti e chiari, che coprano tutto quello che mi passa
per la testa senza sovrapporsi.
```
