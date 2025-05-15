import React, { useEffect, useState } from "react";

function Gastos(props) {
    const [gastosTotales, setGastosTotales] = useState(0);

    useEffect(() => {
        if (!Array.isArray(props.gastos) || props.gastos.length === 0) {
            setGastosTotales(0);
            return;
        }

        const gastosFiltrados = props.gastos.filter((item) => {
            return item.fechaGasto >= props.fechaInicio && item.fechaGasto <= props.fechaFin;
        });

        let total1 = 0;
        gastosFiltrados.forEach((gasto) => {
            const subTotal = Number(gasto.subTotalArticulo) || 0;
            total1 += subTotal;
        });

        setGastosTotales(total1);
    }, [props.gastos, props.fechaInicio, props.fechaFin]);


    return (
        <div>
            <span>
                {(gastosTotales >= 0 ? "-" : "+") + gastosTotales?.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
        </div>
    );
}

export default Gastos;