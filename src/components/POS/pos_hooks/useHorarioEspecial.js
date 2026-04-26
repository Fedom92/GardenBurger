import { useState, useCallback } from "react";

const useHorarioEspecial = ({ setValue }) => {
    const [showHorarioEspecial, setShowHorarioEspecial] = useState(false);

    const toggleHorarioEspecial = useCallback(() => {
        setShowHorarioEspecial((prev) => {
            const next = !prev;
            setValue("horarioEspecial", next ? "20:00" : "");
            return next;
        });
    }, [setValue]);

    const handleHoraEspecialChange = useCallback((e, minutosActuales) => {
        setValue("horarioEspecial", `${e.target.value}:${minutosActuales}`);
    }, [setValue]);

    const handleMinutosEspecialChange = useCallback((e, horaActual) => {
        setValue("horarioEspecial", `${horaActual}:${e.target.value}`);
    }, [setValue]);

    const resetHorario = useCallback(() => {
        setShowHorarioEspecial(false);
        setValue("horarioEspecial", "");
    }, [setValue]);

    return {
        showHorarioEspecial,
        toggleHorarioEspecial,
        handleHoraEspecialChange,
        handleMinutosEspecialChange,
        resetHorario,
    };
};

export default useHorarioEspecial;