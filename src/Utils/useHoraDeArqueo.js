import { useState, useEffect } from "react";
import { esHoraDeArqueo } from "./fechaComercial";

// Si ya es hora de mirar el arqueo: de HORA_HABILITA_STATS a horaCierre. Lo usa el
// F4 de la Caja, que cuesta un barrido de la jornada.
//
// Este valor es SOLO para el `disabled` de un boton. La funcion que lee tiene que
// volver a preguntar esHoraDeArqueo() en el momento: un atajo de teclado no pasa
// por el boton.
//
// Por que un intervalo de 60 s y no un timeout al instante exacto:
// - La pantalla queda abierta desde las 19 y el turno cruza la medianoche, asi que
//   el valor tiene que cambiar solo, en los dos sentidos (HORA_HABILITA_STATS y
//   horaCierre).
// - ahoraServidor() puede no estar sincronizado cuando la pantalla monta: el offset
//   lo trae LayoutStaff y los efectos de los hijos corren primero. Un timeout
//   calculado con el reloj torcido dispara a destiempo; releyendo se corrige solo.
// - Un timeout que dispare justo en el borde puede leer el valor viejo: React
//   descarta el setState, el efecto no se repite y el boton queda trabado.
//
// El tick no cuesta nada: esHoraDeArqueo() es Date.now() + offset, sin red y sin
// invocar la Cloud Function. Con el mismo booleano React no repinta: sobre un
// turno de 20 h son 1200 ticks y 2 repintados.
//
// `activo` apaga el intervalo para quien no puede ver el arqueo.
export const useHoraDeArqueo = (activo = true) => {
    const [horaDeArqueo, setHoraDeArqueo] = useState(esHoraDeArqueo);

    useEffect(() => {
        if (!activo) return;
        const id = setInterval(() => setHoraDeArqueo(esHoraDeArqueo()), 60000);
        return () => clearInterval(id);
    }, [activo]);

    return horaDeArqueo;
};

export default useHoraDeArqueo;
