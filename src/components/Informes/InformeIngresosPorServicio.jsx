import React, { useState, useEffect } from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import moment from "moment";
import "../../style/Main.css";
import iconoDinero from "../../img/icono-dinero.png";
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const InformeIngresosPorServicio = (props) => {
  const añoActual = moment().year();
  const [tablaDatos, setTablaDatos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showChart, setShowChart] = useState(false);
  const [buttonText, setButtonText] = useState("Visual");
  const [añoSeleccionado, setAñoSeleccionado] = useState(añoActual);
  const [totalGeneral, setTotalGeneral] = useState(0);
  const [totalesPorMes, setTotalesPorMes] = useState({});
  const [order, setOrder] = useState("ASC");

  const toggleView = () => {
    setShowChart(!showChart);
    setButtonText(showChart ? "Visual" : "Textual");
  };

  //TABLA LOGIC
  useEffect(() => {
    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    const obtenerDatos = async () => {
      const datosAcumulados = props.tratamientos.reduce((result, tratamiento) => {
        const { cta: codigo, tarifasTratamientos: servicio, cobrosManuales } = tratamiento;

        if (cobrosManuales && cobrosManuales.fechaCobro) {
          cobrosManuales.fechaCobro.forEach((fechaCobro, index) => {
            const fecha = moment(fechaCobro, 'YYYY-MM-DD');
            const año = fecha.year();
            const mes = fecha.month();
            const importeAbonado = cobrosManuales.importeAbonado?.[index] || "";
            const importe = Number(importeAbonado) || 0;

            if (año === añoSeleccionado) {
              result[servicio] ??= {
                codigo,
                servicio,
                total: 0,
                ...Object.fromEntries(meses.map((mes) => [mes, 0])),
              };
              result[servicio][meses[mes]] += importe;
              result[servicio].total += importe;
            }
          });
        }

        return result;
      }, {});

      const datosFinales = Object.values(datosAcumulados);
      datosFinales.sort((a, b) => a.codigo - b.codigo);

      const totalesPorMesCalculados = meses.reduce((totales, mes) => {
        totales[mes] = datosFinales.reduce((suma, data) => suma + data[mes], 0);
        return totales;
      }, {});

      setTotalesPorMes(totalesPorMesCalculados);

      setTablaDatos(datosFinales);
      setIsLoading(false);
    };
    if (Array.isArray(props.tratamientos) && props.tratamientos.length !== 0) {
      obtenerDatos();
    }
  }, [props.tratamientos, añoSeleccionado]);



  //GRAFICO LOCIG
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  const colores = [
    'rgba(0, 197, 193, 0.5)',
    'rgba(255, 99, 132, 0.5)',
    'rgba(54, 162, 235, 0.5)',
    'rgba(255, 206, 86, 0.5)',
    'rgba(75, 192, 192, 0.5)',
    'rgba(145, 61, 136, 0.5)',
    'rgba(255, 153, 51, 0.5)',
    'rgba(231, 76, 60, 0.5)',
    'rgba(46, 204, 113, 0.5)',
    'rgba(51, 110, 123, 0.5)'
  ];

  const datosGrafico = tablaDatos.reduce((data, item) => {
    const servicio = item.servicio;
    if (!data[servicio]) {
      data[servicio] = Array(meses.length).fill(0);
    }
    meses.forEach((mes, index) => {
      data[servicio][index] += item[mes];
    });
    return data;
  }, {});
  const datasets = Object.keys(datosGrafico).map((servicio, index) => ({
    label: servicio,
    data: datosGrafico[servicio],
    backgroundColor: colores[0 % colores.length],
    barThickness: 3,
  }));

  const maxValuesPorMes = meses.map((_, mesIndex) => {
    const maxPorMes = Math.max(...tablaDatos.map(data => data[mesIndex] || 0));
    return maxPorMes;
  });


  const data = {
    labels: meses,
    datasets,
  }
  const options = {
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Ingresos por servicio por mes',
        padding: {
          top: 10,
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
        min: 0,
        max: maxValuesPorMes,
        ticks: {
          stepSize: maxValuesPorMes / 10,
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

  useEffect(() => {
    let total = 0;

    tablaDatos.forEach((dato) => {
      total += Number(dato.total);
    });

    setTotalGeneral(total);
  }, [tablaDatos]);

  const sorting = (col) => {
    if (order === "ASC") {
      const sorted = [...tablaDatos].sort((a, b) => {
        const valueA =
          typeof a[col] === "string" ? a[col].toLowerCase() : a[col];
        const valueB =
          typeof b[col] === "string" ? b[col].toLowerCase() : b[col];
        return valueA > valueB ? 1 : -1;
      });
      setTablaDatos(sorted);
      setOrder("DSC");
    }
    if (order === "DSC") {
      const sorted = [...tablaDatos].sort((a, b) => {
        const valueA =
          typeof a[col] === "string" ? a[col].toLowerCase() : a[col];
        const valueB =
          typeof b[col] === "string" ? b[col].toLowerCase() : b[col];
        return valueA < valueB ? 1 : -1;
      });
      setTablaDatos(sorted);
      setOrder("ASC");
    }
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
                  className="d-flex justify-content-start align-items-center"
                  style={{ maxHeight: "40px", marginLeft: "10px" }}
                >
                  <h1>Informe Ingresos Por Servicio</h1>
                </div>
                <div className="col d-flex justify-content-end">
                  <div className="d-flex form-control-informeVentas">
                    <img src={iconoDinero} className="profile-dinero" alt="iconoDinero"></img>
                    <h5 id="tituloVentas">Total Ventas: <span style={{ fontWeight: 'bold' }}>{totalGeneral?.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></h5>
                  </div>
                  <select
                    className="form-control-2023"
                    multiple={false}
                    onChange={(e) => setAñoSeleccionado(Number(e.target.value))}
                    defaultValue={añoActual}
                  >
                    <option value=""></option>
                    {props.optionsAño2}
                  </select>
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
                  <Bar data={data} options={options} />
                </div>
              ) : (

                <div className="table__container ">
                  <table className="table__body">
                    <thead>
                      <tr className="cursor-none">
                        <th>Codigo</th>
                        <th className="text-start" onClick={() => sorting("total")}>Servicio</th>
                        {meses.map((mes, index) => (
                          <th className="cursor-none" key={index}>{mes}</th>
                        ))}
                        <th>Total</th>
                      </tr>
                    </thead>

                    <tbody>
                      <tr className="cursor-none">
                        <td>0</td>
                        <th>Totales</th>
                        {meses.map((mes) => (
                          <td key={mes}>
                            {totalesPorMes[mes]?.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "-"}
                          </td>
                        ))}
                        <td className={Object.values(totalesPorMes).some(total => total < 0) ? 'danger fw-bold colDerecha' : 'colDerecha fw-bold'}>
                          {Object.values(totalesPorMes).reduce((suma, total) => suma + total, 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>

                      {tablaDatos.map((data, index) => (
                        <tr key={index}>
                          <td id="colIzquierda">{data.codigo}</td>
                          <td className="text-start">{data.servicio}</td>
                          {meses.map((mes) => (
                            <td key={mes}>
                              {data[mes] !== 0 ? data[mes]?.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}
                            </td>
                          ))}
                          <td className={data.total < 0 ? 'danger fw-bold colDerecha' : 'colDerecha fw-bold'}>{data.total?.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                      <tr style={{ height: "10px", backgroundColor: "transparent" }}></tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default InformeIngresosPorServicio;