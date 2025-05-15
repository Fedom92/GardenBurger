import React, { useState, useEffect } from "react";
import moment from "moment";
import "../../style/Main.css";


const ComparacionMensual = (props) => {
  const [tablaDatos, setTablaDatos] = useState([]);
  const [tablaDatos2, setTablaDatos2] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [año1, setAño1] = useState("");
  const [año2, setAño2] = useState("");
  const [mesElegido1, setMesElegido1] = useState("");
  const [mesElegido2, setMesElegido2] = useState("");
  const [acumuladoImporte, setAcumuladoImporte] = useState(0);
  const [acumuladoImporte2, setAcumuladoImporte2] = useState(0);

  //TABLAS LOGIC
  const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  useEffect(() => {
    const obtenerDatos = () => {
      const agruparDatos = (gastos, añoElegido, mesElegido) => {
        return gastos.reduce((result, gasto) => {
          const fechaGastos = gasto.fechaGasto;
          const fecha = moment(fechaGastos, 'YYYY-MM-DD');
          const mes = fecha.month();
          const año = fecha.year();
          const subTotalArticulo = gasto.subTotalArticulo;

          if (año === añoElegido && mes === mesElegido) {
            const key = año === año1 ? gasto.cuentaArticulo : gasto.descripArticulo;
            if (!result[key]) {
              result[key] = {
                cuenta: gasto.cuentaArticulo,
                descripcion: gasto.descripArticulo,
                cant: Number(gasto.cantArticulo),
                um: gasto.umArticulo,
                importe: Number(subTotalArticulo),
              };
            } else {
              result[key].importe += Number(subTotalArticulo);
              result[key].cant += Number(gasto.cantArticulo);
            }
          }

          return result;
        }, {});
      };

      const datosTrabajados = Object.values(agruparDatos(props.gastos, año1, mesElegido1)).sort((a, b) => b.importe - a.importe);
      const datosTrabajados2 = Object.values(agruparDatos(props.gastos, año2, mesElegido2)).sort((a, b) => b.importe - a.importe);

      setTablaDatos(datosTrabajados);
      setTablaDatos2(datosTrabajados2);
      setIsLoading(false);
    };
    if (Array.isArray(props.gastos) && props.gastos.length !== 0) {
      obtenerDatos();
    }
  }, [props.gastos, año1, mesElegido1, año2, mesElegido2]);

  useEffect(() => {
    // Calcular el acumulado del "importe"
    const totalImporte = tablaDatos.reduce((acumulado, data) => {
      return acumulado + (data.importe || 0);
    }, 0);

    // Actualizar el estado
    setAcumuladoImporte(totalImporte);
  }, [tablaDatos]);

  useEffect(() => {
    // Calcular el acumulado del "importe"
    const totalImporte2 = tablaDatos2.reduce((acumulado, data) => {
      return acumulado + (data.importe || 0);
    }, 0);

    // Actualizar el estado
    setAcumuladoImporte2(totalImporte2);
  }, [tablaDatos2]);

  return (
    <>
      {isLoading ? (
        <div className="w-100">
          <span className="loader position-absolute start-50 top-50 mt-3"></span>
        </div>
      ) : (
        <>
          <div className="container mw-100">
            <div className="col">
              <div className="d-flex justify-content-between">
                <div
                  style={{ maxHeight: "40px", marginLeft: "10px" }}
                >
                  <h1>Reporte Comparación Compras Mensual</h1>
                </div>
              </div>
              <div className="d-flex mt-3 justify-content-evenly">
                <div className="table__container m-2 w-50">
                  <div className="d-flex mb-1">
                    <select
                      className="form-control-doctor2"
                      multiple={false}
                      onChange={(e) => setMesElegido1(Number(e.target.value))}
                      value={mesElegido1}
                    >
                      <option value=""></option>
                      {meses.map((mes, index) => (
                        <option key={index} value={index}>{mes}</option>
                      ))}
                    </select>
                    <select
                      className="form-control-doctor3"
                      multiple={false}
                      onChange={(e) => setAño1(Number(e.target.value))}
                      value={año1}
                    >
                      <option value=""></option>
                      {props.optionsAño}
                    </select>
                    <input
                      value={"Total: " + acumuladoImporte.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      className="text-center form-control-doctor2 fw-bold"
                      style={{ width: "30%" }}
                      readOnly
                    ></input>
                  </div>
                  <table className="table__body rounded">
                    <thead>
                      <tr className="cursor-none">
                        <th>Cuenta</th>
                        <th className="text-start">Descripcion</th>
                        <th>Cant</th>
                        <th>U.M.</th>
                        <th>Importe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tablaDatos.map((data, index) => (
                        <tr key={index}>
                          <td>{data.cuenta}</td>
                          <td>{data.descripcion}</td>
                          <td>{data.cant}</td>
                          <td>{data.um}</td>
                          <td>{data.importe?.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                      <tr style={{ height: "10px", backgroundColor: "transparent" }}></tr>
                    </tbody>
                  </table>
                </div>

                <div className="table__container m-2 w-50">
                  <div className="d-flex mb-1">
                    <select
                      className="form-control-doctor2"
                      multiple={false}
                      onChange={(e) => setMesElegido2(Number(e.target.value))}
                      value={mesElegido2}
                    >
                      <option value=""></option>
                      {meses.map((mes, index) => (
                        <option key={index} value={index}>{mes}</option>
                      ))}
                    </select>
                    <select
                      className="form-control-doctor3"
                      multiple={false}
                      onChange={(e) => setAño2(Number(e.target.value))}
                      value={año2}
                    >
                      <option value=""></option>
                      {props.optionsAño}
                    </select>
                    <input
                      value={"Total: " + acumuladoImporte2.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      className="text-center form-control-doctor2 fw-bold"
                      style={{ width: "30%" }}
                      readOnly
                    ></input>
                  </div>

                  <table className="table__body rounded">
                    <thead>
                      <tr className="cursor-none">
                        <th>Cuenta</th>
                        <th className="text-start">Descripcion</th>
                        <th>Cant</th>
                        <th>U.M.</th>
                        <th>Importe</th>
                      </tr>
                    </thead>

                    <tbody>
                      {tablaDatos2.map((data, index) => (
                        <tr key={index}>
                          <td>{data.cuenta}</td>
                          <td>{data.descripcion}</td>
                          <td>{data.cant}</td>
                          <td>{data.um}</td>
                          <td>{data.importe?.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                      <tr style={{ height: "10px", backgroundColor: "transparent" }}></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default ComparacionMensual;
