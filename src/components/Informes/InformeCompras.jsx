import React, { useState, useEffect } from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import moment from "moment";
import "../../style/Main.css";
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);


const InformeCompras = (props) => {
  const [tablaDatos, setTablaDatos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showChart, setShowChart] = useState(false);
  const [buttonText, setButtonText] = useState("Visual");
  const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const toggleView = () => {
    setShowChart(!showChart);
    setButtonText(showChart ? "Visual" : "Textual");
  };

  useEffect(() => {
    const obtenerDatos = async () => {
      const datos = props.gastos.reduce((result, { fechaGasto, subTotalArticulo }) => {
        const fecha = moment(fechaGasto, 'YYYY-MM-DD');
        const año = fecha.year();
        const mes = fecha.month();
        const gastoMonto = Number(subTotalArticulo) || 0;

        const index = result.findIndex((data) => data.año === año);

        if (index === -1) {
          result.push({ año, [mes]: gastoMonto });
        } else {
          result[index][mes] = (result[index][mes] || 0) + gastoMonto;
        }

        return result;
      }, []);

      setTablaDatos(datos);
      setIsLoading(false);
    };

    if (Array.isArray(props.gastos) && props.gastos.length !== 0) {
      obtenerDatos();
    }
  }, [props.gastos]);

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

  const añosInvertidos = [...Array.from(new Set(tablaDatos.map((data) => data.año)))];
  const datasets = añosInvertidos.map((año, index) => ({
    label: año.toString(),
    data: meses.map((_, mesIndex) => tablaDatos.find(data => data.año === año)?.[mesIndex] || 0),
    backgroundColor: colores[index % colores.length],
  }));

  const totalPorAnio = añosInvertidos.map((año) => {
    return meses.reduce((acumulador, mes, index) => {
      const data = tablaDatos.find((d) => d.año === año);
      const gastos = data ? data[index] || 0 : 0;
      return acumulador + gastos;
    }, 0);
  });

  const maxValuesPorMes = meses.map((_, mesIndex) => {
    const maxPorMes = Math.max(...tablaDatos.map(data => data[mesIndex] || 0));
    return maxPorMes;
  });

  const data = {
    labels: meses,
    datasets,
  };
  const options = {
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Compras por mes',
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
    animation: {
      duration: 100,
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

  return (
    <>
      {isLoading ? (
        <div className="w-100">
          <span className="loader position-absolute start-50 top-50 mt-3"></span>
        </div>
      ) : (
        <div className="container mw-100" style={{ marginTop: "40px" }}>
          <div className="row">
            <div className="col">
              <div className="d-flex justify-content-between">
                <div
                  className="d-flex justify-content-center align-items-center"
                  style={{ maxHeight: "40px", marginLeft: "10px" }}
                >
                  <h1>Informe Compras</h1>
                </div>
                <div>
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

                <div className="table__container w-50">
                  <table className="table__body w-50">
                    <thead>
                      <tr className="cursor-none">
                        <th className="text-start fs-5">Meses</th>
                        {añosInvertidos.map((año) => (
                          <th className="fs-5" key={año}>{año}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="w-50">
                      {meses.map((mes, index) => (
                        <tr key={index}>
                          <td className="text-start p-2" id="colIzquierda">{mes}</td>
                          {añosInvertidos.map((año, colIndex) => {
                            const data = tablaDatos.find((d) => d.año === año);
                            const tratamientos = data?.[index] || "-";
                            return (
                              <td className={`${colIndex === añosInvertidos.length - 1 ? 'colDerecha' : ''} p-0`} key={año}>
                                {tratamientos?.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      <tr>
                        <td className="text-start fw-bold" id="colIzquierda">Total</td>
                        {añosInvertidos.map((año, index) => (
                          <td key={index} className={index === añosInvertidos.length - 1 ? 'colDerecha fw-bold' : 'fw-bold'}>
                            {totalPorAnio[index]?.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        ))}
                      </tr>
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

export default InformeCompras;
