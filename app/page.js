"use client";

import { useState } from "react";
import BarraSuperiore from "@/components/BarraSuperiore";
import BarraCattura from "@/components/BarraCattura";
import Cicli from "@/components/schermate/Cicli";
import Config from "@/components/schermate/Config";
import Home from "@/components/schermate/Home";
import Quadranti from "@/components/schermate/Quadranti";
import SchermataAllenamento from "@/components/schermate/Allenamento";
import Crm from "@/components/schermate/Crm";
import Review from "@/components/schermate/Review";
import { useDashboard } from "@/lib/useDati";

export default function Pagina() {
  const [schermata, setSchermata] = useState("home");
  const [taskAperto, setTaskAperto] = useState(null);
  const { dati, errore, ricarica, modifica } = useDashboard();

  // Cliccando un task da Home o dai Blocchi si apre il CRM con il pannello
  // di quell'elemento già aperto.
  const apriTask = (id) => {
    setTaskAperto(id);
    setSchermata("crm");
  };

  return (
    <>
      <BarraSuperiore schermata={schermata} onSchermata={setSchermata} errore={errore} />
      <Home
        attiva={schermata === "home"}
        dati={dati}
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
      <Review attiva={schermata === "review"} />
      <Config attiva={schermata === "config"} dati={dati} ricarica={ricarica} />
      <BarraCattura onCatturato={ricarica} />
    </>
  );
}
