"use client";

import { useEffect, useState } from "react";
import BarraSuperiore from "@/components/BarraSuperiore";
import Wizard from "@/components/Wizard";
import BarraCattura from "@/components/BarraCattura";
import Cicli from "@/components/schermate/Cicli";
import Config from "@/components/schermate/Config";
import Home from "@/components/schermate/Home";
import Quadranti from "@/components/schermate/Quadranti";
import SchermataAllenamento from "@/components/schermate/Allenamento";
import Crm from "@/components/schermate/Crm";
import Rubrica from "@/components/schermate/Rubrica";
import Review from "@/components/schermate/Review";
import { MODULI, normalizzaInterfaccia } from "@/lib/moduli";
import { NOME } from "@/lib/app";
import { useDashboard } from "@/lib/useDati";

export default function Pagina() {
  const [schermata, setSchermata] = useState("home");
  const [taskAperto, setTaskAperto] = useState(null);
  const { dati, errore, ricarica, modifica } = useDashboard();
  const interfaccia = normalizzaInterfaccia(dati?.profilo?.interfaccia);

  // Lo schema colore è un dato: si applica quando arriva, e si specchia nel
  // localStorage così l'anti-lampo lo conosce già al prossimo caricamento.
  useEffect(() => {
    const s = interfaccia.tema.schema;
    if (s === "navy") {
      delete document.documentElement.dataset.schema;
      localStorage.removeItem("schema");
    } else {
      document.documentElement.dataset.schema = s;
      localStorage.setItem("schema", s);
    }
  }, [interfaccia.tema.schema]);

  // Se la schermata dove sei appartiene a un modulo spento, si torna a casa.
  useEffect(() => {
    const m = MODULI.find((x) => x.id === schermata);
    if (m && interfaccia.moduli[m.id] === false) setSchermata("home");
  }, [schermata, interfaccia]);

  // Il primo accesso: finché il wizard non è stato completato, c'è solo lui.
  if (dati?.profilo && !dati.profilo.configurato) {
    return <Wizard profilo={dati.profilo} ricarica={ricarica} />;
  }

  // Cliccando un task da Home o dai Blocchi si apre il CRM con il pannello
  // di quell'elemento già aperto.
  const apriTask = (id) => {
    setTaskAperto(id);
    setSchermata("crm");
  };

  return (
    <>
      <BarraSuperiore
        schermata={schermata}
        onSchermata={setSchermata}
        errore={errore}
        interfaccia={interfaccia}
        nome={dati?.profilo?.nomeSistema || NOME}
      />
      <Home
        attiva={schermata === "home"}
        dati={dati}
        interfaccia={interfaccia}
        modifica={modifica}
        ricarica={ricarica}
        onApriTask={apriTask}
        onApriProgramma={() => setSchermata("allenamento")}
      />
      <Cicli
        attiva={schermata === "cicli"}
        dati={dati}
        modifica={modifica}
        ricarica={ricarica}
      />
      <SchermataAllenamento
        attiva={schermata === "allenamento"}
        dati={dati}
        modifica={modifica}
        ricarica={ricarica}
      />
      <Quadranti
        attiva={schermata === "quadranti"}
        dati={dati}
        modifica={modifica}
        ricarica={ricarica}
        aperto={taskAperto}
        onAperto={setTaskAperto}
      />
      <Crm
        attiva={schermata === "crm"}
        dati={dati}
        modifica={modifica}
        ricarica={ricarica}
        aperto={taskAperto}
        onAperto={setTaskAperto}
      />
      <Rubrica
        attiva={schermata === "rubrica"}
        dati={dati}
        ricarica={ricarica}
        onApriTask={apriTask}
      />
      <Review attiva={schermata === "review"} />
      <Config attiva={schermata === "config"} dati={dati} interfaccia={interfaccia} ricarica={ricarica} />
      <BarraCattura onCatturato={ricarica} />
    </>
  );
}
