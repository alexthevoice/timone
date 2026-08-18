// Icone SVG scritte nel file, come nel mockup: nessuna libreria, nessuna richiesta di rete.

function Svg({ children, size = 15, ...rest }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      style={{ width: size, height: size }}
      {...rest}
    >
      {children}
    </svg>
  );
}

export const Spunta = (p) => (
  <Svg size={11} {...p}>
    <polyline points="20 6 9 17 4 12" />
  </Svg>
);

export const Calendario = (p) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M8 3v4M16 3v4M3 10h18" />
  </Svg>
);

export const Avviso = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v4M12 16h.01" />
  </Svg>
);

export const Andamento = (p) => (
  <Svg {...p}>
    <path d="M3 17l6-6 4 4 7-7" />
    <path d="M14 8h6v6" />
  </Svg>
);

export const Aggiorna = (p) => (
  <Svg {...p}>
    <path d="M21 12a9 9 0 1 1-3-6.7" />
    <path d="M21 4v5h-5" />
  </Svg>
);

export const Pasto = (p) => (
  <Svg {...p}>
    <path d="M6 3v7a3 3 0 0 0 6 0V3M9 10v11" />
    <path d="M17 3c-1.5 2-2 4-2 6s.5 3 2 3 2-1 2-3-.5-4-2-6zM17 12v9" />
  </Svg>
);

export const Battito = (p) => (
  <Svg {...p}>
    <path d="M3 12h4l2-6 4 12 2-6h6" />
  </Svg>
);

export const Lente = (p) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </Svg>
);

export const Microfono = (p) => (
  <Svg size={18} {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </Svg>
);

export const Invia = (p) => (
  <Svg size={17} {...p}>
    <path d="M4 12h15M13 6l6 6-6 6" />
  </Svg>
);

export const Mirino = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
  </Svg>
);

export const Croce = (p) => (
  <Svg {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M12 3v18M3 12h18" />
  </Svg>
);

export const Goccia = (p) => (
  <Svg size={15} {...p}>
    <path d="M12 3.5c3.4 4 5.5 6.6 5.5 9.3a5.5 5.5 0 0 1-11 0c0-2.7 2.1-5.3 5.5-9.3z" />
  </Svg>
);

export const Passo = (p) => (
  <Svg {...p}>
    <path d="M7 20c-1.5 0-2.2-1-2-2.4.3-1.7 1-2.3 1-4.1 0-2.6-1-3.4-1-5.6C5 5.6 6.3 4 8.3 4c1.9 0 2.8 1.5 2.8 3.6 0 2.4-.6 3.4-.6 5.3 0 1.6.5 2.4.3 4.3-.2 1.8-1 2.8-2.4 2.8z" />
    <path d="M17 20.5c-1.2 0-1.8-.8-1.7-2 .2-1.4.8-1.9.8-3.4 0-2.1-.8-2.8-.8-4.6 0-1.9 1-3.2 2.7-3.2 1.5 0 2.3 1.2 2.3 3 0 2-.5 2.8-.5 4.4 0 1.3.4 2 .2 3.5-.1 1.5-.8 2.3-2 2.3z" />
  </Svg>
);

export const Graffetta = (p) => (
  <Svg size={13} {...p}>
    <path d="M20 11.5l-8 8a5 5 0 0 1-7-7l8.5-8.5a3.4 3.4 0 0 1 4.8 4.8L9.7 17.4a1.8 1.8 0 0 1-2.5-2.5l7.8-7.8" />
  </Svg>
);

export const Sinistra = (p) => (
  <Svg size={14} {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Svg>
);

export const Destra = (p) => (
  <Svg size={14} {...p}>
    <path d="M9 5l7 7-7 7" />
  </Svg>
);
