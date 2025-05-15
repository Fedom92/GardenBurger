import React, { useState, useEffect } from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import moment from "moment";
import "../../style/Main.css";
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const Resultados = (props) => {
  const añoActual = moment().year();
  const [tablaDatos, setTablaDatos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showChart, setShowChart] = useState(false);
  const [buttonText, setButtonText] = useState("Visual");
  const [añoSeleccionado, setAñoSeleccionado] = useState(añoActual);

  const toggleView = () => {
    setShowChart(!showChart);
    setButtonText(showChart ? "Visual" : "Textual");
  };

  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  //TABLA LOGIC
  useEffect(() => {
    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    const obtenerDatos = async () => {
      const datos = {
        descripcion: "Ingresos",
        total: 0,
      };
      const datos2 = {
        descripcion: "Gastos",
        total: 0,
      };
      const datos3 = {
        descripcion: "Resultados",
        total: 0,
      };

      const tratamientosFiltrados = props.tratamientos.filter((tratamiento) => {
        const fechaGasto = tratamiento.cobrosManuales?.fechaCobro?.[0];
        if (fechaGasto) {
          const fecha = moment(fechaGasto, 'YYYY-MM-DD');
          const año = fecha.year();
          return año === añoSeleccionado;
        }
        return false;
      });

      const gastosFiltrados = props.gastos.filter((gasto) => {
        const fechaGasto = gasto.fechaGasto;
        const fecha = moment(fechaGasto, 'YYYY-MM-DD');
        return fecha.year() === añoSeleccionado;
      });

      const datosCalculados = tratamientosFiltrados.reduce((result, tratamiento) => {
        const cobrosManuales = tratamiento.cobrosManuales;

        cobrosManuales.fechaCobro.forEach((fechaCobro, index) => {
          const fecha = moment(fechaCobro, 'YYYY-MM-DD');
          const mes = fecha.month();
          const importeAbonado = cobrosManuales.importeAbonado?.[index] || "";
          const importe = Number(importeAbonado) || 0;

          result[meses[mes]] = (result[meses[mes]] || 0) + importe;
          result.total += importe;
        });

        return result;
      }, datos);

      const datos2Calculados = gastosFiltrados.reduce((result, gasto) => {
        const fechaGasto = gasto.fechaGasto;
        const fecha = moment(fechaGasto, 'YYYY-MM-DD');
        const mes = fecha.month();
        const importe = Number(gasto.subTotalArticulo) || 0;

        result[meses[mes]] = (result[meses[mes]] || 0) + importe;
        result.total += importe;

        return result;
      }, datos2);

      for (const mes of meses) {
        const ingresoMes = datosCalculados[mes] || 0;
        const gastoMes = datos2Calculados[mes] || 0;
        datos3[mes] = ingresoMes - gastoMes;
        datos3.total += datos3[mes];
      }

      setTablaDatos([datosCalculados, datos2Calculados, datos3]);
      setIsLoading(false);
    };

    if ((Array.isArray(props.tratamientos) && props.tratamientos.length !== 0) && (Array.isArray(props.gastos) && props.gastos.length !== 0)) {
      obtenerDatos();
    }
  }, [props.tratamientos, props.gastos, añoSeleccionado]);


  //GRAFICO LOGIC
  const ingresosData = tablaDatos.length > 0 ? Object.values(tablaDatos[0]).slice(2) : [];
  const gastosData = tablaDatos.length > 0 ? Object.values(tablaDatos[1]).slice(2) : [];

  const maxValue = Math.max(...ingresosData, ...gastosData);
  const datosOrdenados = tablaDatos.map((data) => {
    const orderedData = {};
    meses.forEach((mes) => {
      orderedData[mes] = data[mes] || 0;
    });
    return orderedData;
  });
 

  const data = {
    labels: meses,
    datasets: [
      {
        label: `Ingresos ${añoSeleccionado}`,
        data: datosOrdenados[0],
        borderColor: '#00c5c1',
        fill: false,
      },
      {
        label: `Gastos ${añoSeleccionado}`,
        data: datosOrdenados[1],
        borderColor: '#ff6c75',
        fill: false,
      },
    ],
  };
  const options = {
    plugins: {
      legend: {
        display: true,
        labels: {
          color: '#FFF',
        },
      },
      title: {
        display: true,
        text: 'Resultados por mes',
        padding: {
          top: 0,
          bottom: 30,
        },
        font: {
          weight: 'bold',
          size: 24,
          family: 'Goldplay'
        },
        color: '#FFF',
      }
    },
    scales: {
      y: {
        
        max: maxValue >= 0 ? maxValue + 1000 : 0,
        ticks: {
          stepSize: maxValue / 10,
          color: '#FFF',
        },
        grid: {
          borderDash: [8],
          color: '#2e3e62',
        }
      },
      x: {
        ticks: {
          color: '#FFF',
        },
        grid: {
          color: 'transparent',
        },
      },
    },
  };

  return (
    <>
      {isLoading ? (
        <div className="w-100">
          <span className="loader position-absolute start-50 top-50 mt-3"></span>
        </div>
      ) : (
        <div className="container mw-100">
          <div className="row">
            <div className="col">
              <div className="d-flex justify-content-between">
                <div
                  className="d-flex justify-content-center align-items-center"
                  style={{ maxHeight: "40px", marginLeft: "10px" }}
                >
                  <h1>Reporte de Resultados</h1>
                </div>
                <div className="d-flex justify-content-end">
                  <button
                    variant="primary"
                    className="btn-blue m-1"
                    onClick={toggleView}
                  >
                    {buttonText}
                  </button>
                </div>
              </div>
              {showChart ? (
                <div className="pt-3 rounded-4 shadow fondo-color-primario w-75 container">
                  <Line data={data} options={options} />
                </div>
              ) : (
                <>
                  <br></br>
                  <div className="table__container ">
                    <div className="d-flex justify-content-between">
                      <h1 className="fs-4 mx-2" style={{ textAlign: "left" }}>Estado de resultados {añoSeleccionado}</h1>
                      <div className=" justify-content-end m-1">
                        <select
                          className="form-control-doctor"
                          multiple={false}
                          onChange={(e) => setAñoSeleccionado(Number(e.target.value))}
                          defaultValue={añoActual}
                        >
                          <option>{añoActual}</option>
                          {props.optionsAño}
                        </select>
                      </div>
                    </div>

                    <table className="table__body">
                      <thead>
                        <tr className="cursor-none">
                          <th>Descripcion</th>
                          {meses.map((mes, index) => (
                            <th className="cursor-none" key={index}>{mes}</th>
                          ))}
                          <th>Total</th>
                        </tr>
                      </thead>

                      <tbody>
                        {tablaDatos.map((data, index) => (
                          <tr key={index} id={index === 2 ? 'backgroundGray' : ''}>
                            <td id="colIzquierda">{data.descripcion}</td>
                            {meses.map((mes, mesIndex) => (
                              <td key={mesIndex} className={data[mes] < 0 ? 'danger fw-bold' : ''}>
                                {data[mes] !== 0 ? data[mes]?.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "-" : "-"}
                              </td>
                            ))}
                            <td className={data.total < 0 ? 'danger fw-bold colDerecha' : 'colDerecha fw-bold'}>{data.total?.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                        <tr style={{ height: "10px", backgroundColor: "transparent" }}></tr>
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Resultados;