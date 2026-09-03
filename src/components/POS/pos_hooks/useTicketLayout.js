import { useState, useRef, useCallback, useEffect } from "react";

// Posicion y ancho del panel del ticket dentro de la Caja.
//
// El cajero puede mandar el ticket al otro lado arrastrandolo de la manija, y
// repartir el ancho arrastrando el divisor. Doble clic en el divisor vuelve al
// minimo. Valores tomados del diseno 2a.
const MIN_W = 408;
const MAX_W = 720;
// Ancho que se le reserva siempre al panel de productos: por debajo de esto la
// grilla queda en una sola columna y deja de servir.
const RESERVA_PRODUCTOS = 420;

const useTicketLayout = () => {
    const [side, setSide] = useState("left");
    const [width, setWidth] = useState(MIN_W);
    const [grabbing, setGrabbing] = useState(false);
    const [dragging, setDragging] = useState(false);

    const rowRef = useRef(null);
    // Desengancha los listeners del arrastre en curso. Se guarda en una ref
    // porque hay que poder llamarlo tambien al desmontar: si el cajero suelta el
    // mouse fuera de la ventana, el "up" nunca llega y quedarian vivos.
    const soltarListeners = useRef(null);

    useEffect(() => () => soltarListeners.current?.(), []);

    const onResizeStart = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();

        const fila = rowRef.current;
        if (!fila) return;

        const r = fila.getBoundingClientRect();
        const max = Math.min(MAX_W, r.width - RESERVA_PRODUCTOS);

        const mover = (ev) => {
            const x = ev.touches && ev.touches[0] ? ev.touches[0].clientX : ev.clientX;
            if (x == null) return;
            if (ev.cancelable) ev.preventDefault();
            // Con el ticket a la izquierda el ancho se mide desde el borde
            // izquierdo de la fila; a la derecha, desde el derecho.
            const crudo = side === "left" ? x - r.left : r.right - x;
            setWidth(Math.max(MIN_W, Math.min(max, Math.round(crudo))));
        };

        const soltar = () => {
            setGrabbing(false);
            window.removeEventListener("mousemove", mover, true);
            window.removeEventListener("touchmove", mover, true);
            window.removeEventListener("pointermove", mover, true);
            window.removeEventListener("mouseup", soltar, true);
            window.removeEventListener("touchend", soltar, true);
            window.removeEventListener("pointerup", soltar, true);
            soltarListeners.current = null;
        };

        setGrabbing(true);
        soltarListeners.current = soltar;

        window.addEventListener("mousemove", mover, true);
        window.addEventListener("touchmove", mover, { capture: true, passive: false });
        window.addEventListener("pointermove", mover, true);
        window.addEventListener("mouseup", soltar, true);
        window.addEventListener("touchend", soltar, true);
        window.addEventListener("pointerup", soltar, true);
    }, [side]);

    const onResetWidth = useCallback((e) => {
        e.stopPropagation();
        setWidth(MIN_W);
    }, []);

    const onDragStart = useCallback((e) => {
        e.dataTransfer.effectAllowed = "move";
        // Firefox no dispara dragstart sin datos seteados.
        e.dataTransfer.setData("text/plain", "ticket");
        setDragging(true);
    }, []);

    const onDragEnd = useCallback(() => setDragging(false), []);

    const onDragOver = useCallback((e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    }, []);

    const onDrop = useCallback((e) => {
        e.preventDefault();
        setDragging(false);
        setSide((prev) => (prev === "right" ? "left" : "right"));
    }, []);

    return {
        side,
        width,
        grabbing,
        dragging,
        rowRef,
        onResizeStart,
        onResetWidth,
        onDragStart,
        onDragEnd,
        onDragOver,
        onDrop,
    };
};

export default useTicketLayout;
