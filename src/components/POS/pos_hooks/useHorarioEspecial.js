import { useState, useCallback } from "react";

// El horario especial del ticket. Las opciones las calcula la Caja con
// opcionesHorarioEspecial() (Utils/fechaComercial.js): solo las que todavía no
// pasaron esta noche. Al activarlo arranca en la primera disponible.
const useHorarioEspecial = ({ setValue }) => {
    const [showHorarioEspecial, setShowHorarioEspecial] = useState(false);

    const toggleHorarioEspecial = useCallback((opciones = []) => {
        setShowHorarioEspecial((prev) => {
            const next = !prev;
            setValue("horarioEspecial", next ? (opciones[0] || "") : "");
            return next;
        });
    }, [setValue]);

    const elegirHorarioEspecial = useCallback((hora) => {
        setValue("horarioEspecial", hora);
    }, [setValue]);

    const resetHorario = useCallback(() => {
        setShowHorarioEspecial(false);
        setValue("horarioEspecial", "");
    }, [setValue]);

    return {
        showHorarioEspecial,
        toggleHorarioEspecial,
        elegirHorarioEspecial,
        resetHorario,
    };
};

export default useHorarioEspecial;
