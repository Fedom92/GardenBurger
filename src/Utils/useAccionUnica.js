import { useState, useRef, useCallback } from "react";

// Guard contra doble ejecución para las acciones que escriben plata: aprobar o
// rechazar un MP, eliminar un pedido, cerrar una entrega, guardar una jornada.
// Estaba copiado tal cual en cuatro archivos.
//
// Son DOS mecanismos y hacen falta los dos:
// - `enCurso` (ref) corta en el mismo tick. Entre dos clicks rápidos el estado
//   todavía no se aplicó y el botón sigue habilitado.
// - `procesando` (estado) es para el `disabled` y el texto del botón, que
//   necesitan un repintado.
//
// Con dos acciones que comparten una misma instancia del hook —aprobar y
// rechazar, por ejemplo— el guard las cubre a las dos: mientras una corre, la
// otra no arranca.
export const useAccionUnica = () => {
    const [procesando, setProcesando] = useState(false);
    const enCurso = useRef(false);

    const ejecutar = useCallback(async (accion) => {
        if (enCurso.current) return;
        enCurso.current = true;
        setProcesando(true);
        try {
            return await accion();
        } finally {
            enCurso.current = false;
            setProcesando(false);
        }
    }, []);

    return { procesando, ejecutar };
};

export default useAccionUnica;
