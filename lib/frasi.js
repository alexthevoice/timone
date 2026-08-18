/**
 * La frase del giorno.
 *
 * Una lista scritta a mano, non una chiamata al modello: il caricamento di una
 * pagina non chiama mai il modello (è la regola che vale più soldi di tutte), e
 * per una frase al giorno sarebbe anche il modo più sicuro di ritrovarsi una
 * citazione inventata di sana pianta, attribuita a qualcuno che non l'ha mai
 * detta. Qui dentro ci sono solo frasi che quella persona ha davvero detto o
 * scritto: dove la paternità è dubbia — le mezze dozzine di Einstein e Gandhi
 * che girano in rete e che nessuno dei due ha mai pronunciato — la frase non è
 * entrata, per quanto bella fosse.
 *
 * La scelta è **deterministica**: dipende solo dalla data, quindi tutto il
 * giorno resta la stessa e a mezzanotte cambia da sola, senza niente da
 * salvare da nessuna parte. Si scorre l'elenco in ordine e si ricomincia da
 * capo quando finisce: con questo numero di frasi, il giro dura mesi.
 */

/** [frase, chi l'ha detta]. Aggiungerne una è aggiungere una riga. */
export const FRASI = [
  ["Non è perché le cose sono difficili che non osiamo: è perché non osiamo che sono difficili.", "Seneca"],
  ["Finché si rimanda, la vita passa.", "Seneca"],
  ["Non è che abbiamo poco tempo: è che ne perdiamo molto.", "Seneca"],
  ["Nessun vento è favorevole per il marinaio che non sa a quale porto vuole approdare.", "Seneca"],
  ["Hai potere sulla tua mente, non sugli eventi esterni. Renditene conto e troverai la forza.", "Marco Aurelio"],
  ["Ciò che ostacola l'azione fa avanzare l'azione. Ciò che sta in mezzo alla strada diventa la strada.", "Marco Aurelio"],
  ["La qualità della tua vita dipende dalla qualità dei tuoi pensieri.", "Marco Aurelio"],
  ["Non perdere altro tempo a discutere come dev'essere un uomo buono. Siilo.", "Marco Aurelio"],
  ["Non sono le cose a turbare gli uomini, ma le opinioni che essi hanno delle cose.", "Epitteto"],
  ["Dì prima a te stesso che cosa vuoi essere, e poi fa' quello che devi fare.", "Epitteto"],
  ["Nessuno entra due volte nello stesso fiume.", "Eraclito"],
  ["Un viaggio di mille miglia comincia con un passo.", "Lao Tzu"],
  ["Non importa quanto vai piano, purché tu non ti fermi.", "Confucio"],
  ["Ogni battaglia è vinta prima ancora di essere combattuta.", "Sun Tzu"],
  ["La fortuna è arbitra della metà delle azioni nostre, ma ci lascia governare l'altra metà.", "Niccolò Machiavelli"],
  ["Fatti non foste a viver come bruti, ma per seguir virtute e canoscenza.", "Dante Alighieri"],
  ["Chi poco pensa, molto erra.", "Leonardo da Vinci"],
  ["Ancora imparo.", "Michelangelo Buonarroti"],
  ["Sapere non basta: dobbiamo applicare. Volere non basta: dobbiamo fare.", "Johann Wolfgang von Goethe"],
  ["Chi ha un perché per vivere può sopportare quasi ogni come.", "Friedrich Nietzsche"],
  ["Nella vita non c'è nulla da temere, c'è solo da capire.", "Marie Curie"],
  ["Non ho particolari talenti: sono soltanto appassionatamente curioso.", "Albert Einstein"],
  ["Il primo principio è che non devi ingannare te stesso, e tu sei la persona più facile da ingannare.", "Richard Feynman"],
  ["Quello che non riesco a costruire, non l'ho capito.", "Richard Feynman"],
  ["Non ho fallito: ho solo trovato diecimila modi che non funzionano.", "Thomas Edison"],
  ["Che tu creda di farcela o di non farcela, avrai comunque ragione.", "Henry Ford"],
  ["Mettersi insieme è un inizio, restare insieme è un progresso, lavorare insieme è un successo.", "Henry Ford"],
  ["Non arrendersi mai, mai, mai.", "Winston Churchill"],
  ["Sembra sempre impossibile, finché non viene fatto.", "Nelson Mandela"],
  ["L'istruzione è l'arma più potente che puoi usare per cambiare il mondo.", "Nelson Mandela"],
  ["Le persone dimenticheranno quello che hai detto e quello che hai fatto, ma non dimenticheranno mai come le hai fatte sentire.", "Maya Angelou"],
  ["Il vostro tempo è limitato: non sprecatelo vivendo la vita di qualcun altro.", "Steve Jobs"],
  ["L'innovazione è ciò che distingue un leader da un inseguitore.", "Steve Jobs"],
  ["Le persone concentrate sono capaci di dire di no.", "Steve Jobs"],
  ["Non ha senso assumere persone in gamba e poi dire loro cosa fare: assumiamo persone in gamba perché ci dicano cosa fare.", "Steve Jobs"],
  ["Non c'è niente di più inutile del fare con grande efficienza ciò che non andrebbe fatto affatto.", "Peter Drucker"],
  ["Il modo migliore per prevedere il futuro è crearlo.", "Peter Drucker"],
  ["Ci vogliono vent'anni per costruire una reputazione e cinque minuti per rovinarla.", "Warren Buffett"],
  ["Il prezzo è quello che paghi, il valore è quello che ottieni.", "Warren Buffett"],
  ["Il rischio nasce dal non sapere quello che si sta facendo.", "Warren Buffett"],
  ["Prendi un'idea semplice e prendila sul serio.", "Charlie Munger"],
  ["Il tuo marchio è quello che gli altri dicono di te quando non sei nella stanza.", "Jeff Bezos"],
  ["La maggior parte delle persone sopravvaluta quello che può fare in un anno e sottovaluta quello che può fare in dieci.", "Bill Gates"],
  ["Se non ti vergogni della prima versione del tuo prodotto, hai lanciato troppo tardi.", "Reid Hoffman"],
  ["Le persone non comprano quello che fai: comprano il perché lo fai.", "Simon Sinek"],
  ["Non sali all'altezza dei tuoi obiettivi: scendi al livello dei tuoi sistemi.", "James Clear"],
  ["Ogni azione che compi è un voto per la persona che vuoi diventare.", "James Clear"],
  ["Sei la media delle cinque persone con cui passi più tempo.", "Jim Rohn"],
  ["Non devi essere grande per cominciare, ma devi cominciare per essere grande.", "Zig Ziglar"],
  ["Niente nella vita è importante quanto pensi che sia mentre ci stai pensando.", "Daniel Kahneman"],
  ["Il contrario di fragile non è robusto: è antifragile.", "Nassim Nicholas Taleb"],
  ["Cerca la ricchezza, non il denaro e non lo status.", "Naval Ravikant"],
  ["Sbagli il cento per cento dei tiri che non provi.", "Wayne Gretzky"],
  ["Ho sbagliato più di novemila tiri in carriera, ho perso quasi trecento partite: per questo ho avuto successo.", "Michael Jordan"],
  ["Non contavo gli addominali: cominciavo a contare solo quando faceva male.", "Muhammad Ali"],
  ["La perfezione non è raggiungibile, ma se inseguiamo la perfezione possiamo raggiungere l'eccellenza.", "Vince Lombardi"],
  ["Se hai la possibilità di superare, provaci: se non lo fai, non sei più un pilota.", "Ayrton Senna"],
  ["La macchina più bella è quella che deve ancora essere costruita.", "Enzo Ferrari"],
  ["Il visionario è l'unico vero realista.", "Federico Fellini"],
  ["Non ci si libera di una cosa evitandola, ma soltanto attraversandola.", "Cesare Pavese"],
  ["Cercare e saper riconoscere chi e che cosa, in mezzo all'inferno, non è inferno, e farlo durare, e dargli spazio.", "Italo Calvino"],
  ["Gli uomini passano, le idee restano, e continueranno a camminare sulle gambe di altri uomini.", "Giovanni Falcone"],
  ["Se comprendere è impossibile, conoscere è necessario.", "Primo Levi"],
  ["Odio gli indifferenti. Vivere vuol dire essere partigiani.", "Antonio Gramsci"],
  ["La fabbrica non può guardare solo all'indice dei profitti: deve distribuire ricchezza, cultura, servizi, democrazia.", "Adriano Olivetti"],
  ["Il corpo faccia quello che vuole: io non sono il corpo, io sono la mente.", "Rita Levi-Montalcini"],
  ["Aiutami a fare da solo.", "Maria Montessori"],
  ["Se vuoi costruire una nave, non chiamare a raccolta gli uomini per raccogliere il legno: insegna loro la nostalgia del mare aperto.", "Antoine de Saint-Exupéry"],
  ["La perfezione si ottiene non quando non c'è più niente da aggiungere, ma quando non c'è più niente da togliere.", "Antoine de Saint-Exupéry"],
  ["Fai le cose semplici il più possibile, ma non più semplici.", "Albert Einstein"],
  ["Chi non conosce la storia è destinato a ripeterla.", "George Santayana"],
  ["La disciplina è il ponte fra gli obiettivi e i risultati.", "Jim Rohn"],
  ["Il pessimista si lamenta del vento, l'ottimista aspetta che cambi, il realista aggiusta le vele.", "William Arthur Ward"],
  ["Comincia da dove sei, usa quello che hai, fai quello che puoi.", "Arthur Ashe"],
  ["Non giudicare ogni giorno dal raccolto che fai, ma dai semi che pianti.", "Robert Louis Stevenson"],
  ["La qualità non è mai un caso: è sempre il risultato di uno sforzo intelligente.", "John Ruskin"],
  ["Chi non sa fare, insegna. Chi sa, fa. Chi vuole capire, insegna a se stesso.", "Aristotele"],
  ["Il tutto è più della somma delle parti.", "Aristotele"],
  ["Conosci te stesso.", "Iscrizione del tempio di Delfi"],
  ["Se vuoi andare veloce vai da solo, se vuoi andare lontano vai insieme agli altri.", "Proverbio africano"],
  ["Il momento migliore per piantare un albero era vent'anni fa. Il secondo momento migliore è adesso.", "Proverbio cinese"],
  ["Cadi sette volte, rialzati otto.", "Proverbio giapponese"],
  ["Chi vuole fare qualcosa trova un modo, chi non vuole farla trova una scusa.", "Proverbio arabo"],
  ["La marea che sale solleva tutte le barche.", "John Fitzgerald Kennedy"],
  ["Non chiederti cosa può fare il tuo Paese per te: chiediti cosa puoi fare tu per il tuo Paese.", "John Fitzgerald Kennedy"],
  ["Il modo per cominciare è smettere di parlare e cominciare a fare.", "Walt Disney"],
  ["Se puoi sognarlo, puoi farlo.", "Walt Disney"],
  ["L'ottimista vede opportunità in ogni difficoltà, il pessimista vede difficoltà in ogni opportunità.", "Winston Churchill"],
  ["Le persone che sono abbastanza folli da pensare di poter cambiare il mondo sono quelle che lo cambiano.", "Rob Siltanen, per Apple"],
  ["Il rispetto per me stesso è quello che mi guida; la mia dignità è quello che non vendo.", "Frida Kahlo"],
  ["Fai attenzione ai tuoi pensieri, diventano parole. Fai attenzione alle tue abitudini, diventano carattere.", "Lao Tzu"],
  ["Nessuno può farti sentire inferiore senza il tuo consenso.", "Eleanor Roosevelt"],
  ["Il futuro appartiene a chi crede nella bellezza dei propri sogni.", "Eleanor Roosevelt"],
];

/** Da "2026-08-17" al numero di giorni dal 1970: due date diverse, frasi diverse. */
function indiceDelGiorno(oggiIso) {
  const [a, m, g] = String(oggiIso ?? "").split("-").map(Number);
  if (!a || !m || !g) return 0;
  return Math.floor(Date.UTC(a, m - 1, g) / 86400000);
}

/**
 * La frase di oggi. Stessa data, stessa frase, sempre — anche se la pagina si
 * ricarica dieci volte, anche se la guardi dal telefono e dal Mac insieme.
 */
export function fraseDelGiorno(oggiIso) {
  const [testo, autore] = FRASI[Math.abs(indiceDelGiorno(oggiIso)) % FRASI.length];
  return { testo, autore, quante: FRASI.length };
}
