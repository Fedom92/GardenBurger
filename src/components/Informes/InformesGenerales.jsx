import { useState, useEffect } from "react";
import ComparacionAnual from "./ComparacionAnual";
import ComparacionMensual from "./ComparacionMensual";
import InformeCompras from "./InformeCompras";
import InformeTratamientos from "./InformeTratamientos";
import InformeIngresos from "./InformeIngresos";
import InformeIngresosPorServicio from "./InformeIngresosPorServicio";
import Resultados from "./Resultados";
import "../../style/Main.css";
import moment from "moment";

export default function InformesGenerales({ tratamientos, gastos }) {
  const [value, setValue] = useState("1");
  const [isLoading,] = useState(false);
  const [optionsAñoTratamientos, setOptionsAñoTratamientos] = useState([]);
  const [optionsAñoGastos, setOptionsAñoGastos] = useState([]);

  const getOptionsAño = (coleccion, campo) => {
    const valoresUnicos = new Set();

    coleccion.forEach((item) => {
      const fecha = moment(item[campo], "YYYY-MM-DD");
      const año = fecha.year();
      valoresUnicos.add(año);
    });

    const options = Array.from(valoresUnicos)
      .sort((a, b) => b - a)
      .map((año) => (
        <option key={`año-${año}`} value={año}>
          {año}
        </option>
      ));

    return options;
  };

  useEffect(() => {
    const tratamientosOptions = getOptionsAño(tratamientos, 'fecha');
    setOptionsAñoTratamientos(tratamientosOptions);

    const gastosOptions = getOptionsAño(gastos, 'fechaGasto');
    setOptionsAñoGastos(gastosOptions);

  }, [tratamientos, gastos]);

  return (
    <>
      {isLoading ? (
        <div className="w-100">
          <span className="loader position-absolute start-50 top-50 mt-3"></span>
        </div>
      ) : (
        <div className="w-100">
          <div className="search-bar mt-2" style={{marginLeft:"210px"}}>
            <div>
              <select
                value={value}
                className="form-control-doctor"
                multiple={false}
                onChange={(e) => setValue(e.target.value)}
              >
                <option value="1">Informe Ingresos</option>
                <option value="2">Informe Compras</option>
                <option value="7">Informe Tratamientos</option>
                <option value="3">Ingresos por Servicio</option>
                <option value="4">Comparacion Mensual</option>
                <option value="5">Comparacion Anual</option>
                <option value="6">Resultados</option>
              </select>
            </div>
          </div>
          <br></br>
          {value === "1" && <InformeIngresos tratamientos={tratamientos} />}
          {value === "2" && <InformeCompras gastos={gastos} />}
          {value === "3" && <InformeIngresosPorServicio tratamientos={tratamientos} optionsAño2={optionsAñoTratamientos} />}
          {value === "4" && <ComparacionMensual gastos={gastos} optionsAño={optionsAñoGastos} />}
          {value === "5" && <ComparacionAnual gastos={gastos} optionsAño={optionsAñoGastos} />}
          {value === "6" && <Resultados gastos={gastos} tratamientos={tratamientos} optionsAño={optionsAñoGastos} />}
          {value === "7" && <InformeTratamientos tratamientos={tratamientos} />}
        </div>
      )}
    </>
  );
}
