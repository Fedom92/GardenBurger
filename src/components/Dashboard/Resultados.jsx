import React, { useEffect, useState } from "react";

function Resultados(props) {
    const [ingresosTotales, setIngresosTotales] = useState(0);
    const [gastosTotales, setGastosTotales] = useState(0);

    useEffect(() => {
        if (!Array.isArray(props.gastos) || props.gastos.length === 0) {
            setGastosTotales(0);
        } else {
            const gastosFiltrados = props.gastos.filter((gasto) => {
                return gasto.fechaGasto >= props.fechaInicio && gasto.fechaGasto <= props.fechaFin;
            });
            const totalGastos = gastosFiltrados.reduce((total, gasto) => Number(total) + (Number(gasto.subTotalArticulo) || 0), 0);
            setGastosTotales(totalGastos);
        }

        if (!Array.isArray(props.tratamientos) || props.tratamientos.length === 0) {
            setIngresosTotales(0);
        } else {
            const totalIngresos = props.tratamientos.reduce((total, tratamiento) => {
                const cobrosManuales = tratamiento.cobrosManuales;
                if (cobrosManuales && cobrosManuales.fechaCobro) {
                    cobrosManuales.fechaCobro.forEach((fecha, index) => {
                        if (fecha >= props.fechaInicio && fecha <= props.fechaFin) {
                            const importeAbonado = cobrosManuales.importeAbonado?.[index] || "";
                            const importe = Number(importeAbonado) || 0;
                            total += importe;
                        }
                    });
                }
                return total;
            }, 0);
            setIngresosTotales(totalIngresos);
        }

    }, [props.gastos, props.tratamientos, props.fechaInicio, props.fechaFin]);


    return (
        <div>
            <span>
                {ingresosTotales !== null && gastosTotales !== null ? (
                    ((ingresosTotales - gastosTotales >= 0 ? "+" : "") + (ingresosTotales - gastosTotales)?.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
                ) : (
                    "0"
                )}
            </span>
        </div>
    );
}

export default Resultados;