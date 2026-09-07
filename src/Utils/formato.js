// Formateo de montos, en un solo lugar. Estaba repetido en ocho archivos.
//
// Los montos se leen de un vistazo y a las apuradas: van siempre con separador de
// miles, que $77.000 no se confunda con $7.700.

export const fmtPesos = (n) => `$${Number(n || 0).toLocaleString("es-AR")}`;

// Para lo que sale de una multiplicación y puede traer decimales, como
// `horas × valorHora` en la liquidación. Los pesos no se muestran partidos.
export const fmtPesosRedondeado = (n) => `$${Math.round(Number(n) || 0).toLocaleString("es-AR")}`;
