/**
 * La griglia contenitore: dodici colonne, una schermata alla volta.
 * Le schede sono sezioni dentro la schermata a cui appartengono.
 */
export default function Griglia({ id, attiva, children }) {
  return (
    <div className="screen" id={`screen-${id}`} data-active={attiva}>
      <div className="grid">{children}</div>
    </div>
  );
}
