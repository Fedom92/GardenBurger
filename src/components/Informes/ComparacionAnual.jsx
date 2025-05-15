import React, { useState, useEffect } from "react";
import "../../style/Main.css";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import moment from "moment";
import { Bar } from 'react-chartjs-2';
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const ComparacionAnual = (props) => {
  const [tablaDatos, setTablaDatos] = useState([]);
  const [tablaDatos2, setTablaDatos2] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showChart, setShowChart] = useState(false);
  const [buttonText, setButtonText] = useState("Visual");
  const [año1, setAño1] = useState("");
  const [año2, setAño2] = useState("");

  const toggleView = () => {
    setShowChart(!showChart);
    setButtonText(showChart ? "Visual" : "Textual");
  };
  //TABLA LOGIC
  const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  useEffect(() => {

    const obtenerDatos = async () => {
      const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
      const agruparPorAñoYMonto = (gastos, año) => {
        return gastos.reduce((result, gasto) => {
          const fechaGastos = gasto.fechaGasto;
          const fecha = moment(fechaGastos, 'YYYY-MM-DD');
          const mesGasto = fecha.month();
          const añoGasto = fecha.year();
          const subTotalArticulo = Number(gasto.subTotalArticulo);

          if (añoGasto === año) {
            const index = result.findIndex((data) => data.año === año);
            if (index === -1) {
              result.push({ año, [meses[mesGasto]]: subTotalArticulo });
            } else {
              result[index][meses[mesGasto]] = (result[index][meses[mesGasto]] || 0) + subTotalArticulo;
            }
          }

          return result;
        }, []);
      };

      const datosTrabajados = agruparPorAñoYMonto(props.gastos, año1);
      const datosTrabajados2 = agruparPorAñoYMonto(props.gastos, año2);

      setTablaDatos(datosTrabajados);
      setTablaDatos2(datosTrabajados2);
      setIsLoading(false);
    };
    if (Array.isArray(props.gastos) && props.gastos.length !== 0) {
      obtenerDatos();
    }
  }, [props.gastos, año1, año2]);

  const totalPorAnio = tablaDatos.map((data) => {
    const subtotal = meses.reduce((acumulador, mes) => {
      const subTotalArticulo = (data && data[mes]) || 0;
      return acumulador + subTotalArticulo;
    }, 0);
    return año1 ? subtotal : "-";
  });

  const totalPorAnio2 = tablaDatos2.map((data) => {
    const subtotal2 = meses.reduce((acumulador, mes) => {
      const subTotalArticulo2 = (data && data[mes]) || 0;
      return acumulador + subTotalArticulo2;
    }, 0);
    return año2 ? subtotal2 : "-";
  });


  //GRAFICO LOGIC
  const maxValues = [...tablaDatos, ...tablaDatos2].map(data => {
    const subtotal = meses.reduce((acumulador, mes) => {
      const subTotalArticulo = (data && data[mes]) || 0;
      return acumulador + subTotalArticulo;
    }, 0);
    return subtotal;
  });

  const maxValue = Math.max(...maxValues);
  const steps = parseFloat((maxValue / 10).toFixed(0))

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

  const data = {
    labels: meses,
    datasets: [
      {
        label: año1.toString(),
        data: meses.map((mes) => {
          const data = tablaDatos.find((d) => d.año === año1);
          return data ? data[mes] || 0 : 0;
        }),
        backgroundColor: colores[0 % colores.length],
      },
      {
        label: año2.toString(),
        data: meses.map((mes) => {
          const data = tablaDatos2.find((d) => d.año === año2);
          return data ? data[mes] || 0 : 0;
        }),
        backgroundColor: colores[1 % colores.length],
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
        text: 'Gastos por mes',
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
      duration: 200,
    },
    scales: {
      y: {
        min: 0,
        max: maxValue,
        ticks: {
          stepSize: steps,
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
        <>
          <div className="container mw-100" style={{ marginTop: "40px" }}>
            <div className="col">
              <div className="d-flex justify-content-between">
                <div
                  style={{ maxHeight: "40px", marginLeft: "10px" }}
                >
                  <h1>Comparaciones de Compras Realizadas</h1>
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
                <>
                  <div className="d-flex mt-3 justify-content-evenly">
                    <div className="table__container m-2 mt-0 w-25">
                      <table className="table__body rounded">
                        <thead>
                          <tr>
                            <th className="text-start">Mes</th>
                            <th>
                              <select
                                className="form-control-doctor"
                                multiple={false}
                                onChange={(e) => setAño1(Number(e.target.value))}
                                value={año1}
                              >
                                <option value=""></option>
                                {props.optionsAño}
                              </select>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {meses.map((mes, index) => (
                            <tr key={index}>
                              <td className="text-start p-2" id="colIzquierda">
                                {mes}
                              </td>
                              {tablaDatos.map((data, colIndex) => {
                                const gastos = data[mes] || "-";
                                return (
                                  <td
                                    className={`${colIndex === tablaDatos.length - 1 ? 'colDerecha' : ''} p-0`}
                                    key={colIndex}
                                  >
                                    {gastos?.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                          <tr>
                            <td className="text-start fw-bold" id="colIzquierda">
                              Total
                            </td>
                            {totalPorAnio.map((subtotal, index) => (
                              <td
                                key={index}
                                className={index === totalPorAnio.length - 1 ? "colDerecha fw-bold" : "fw-bold"}>
                                {subtotal?.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            ))}
                          </tr>
                          <tr style={{ height: "8px", backgroundColor: "transparent" }}></tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="table__container m-2 mt-0 w-25">
                      <table className="table__body rounded">
                        <thead>
                          <tr>
                            <th className="text-start">Mes</th>
                            <th>
                              <select
                                className="form-control-doctor"
                                multiple={false}
                                onChange={(e) => setAño2(Number(e.target.value))}
                                value={año2}
                              >
                                <option value=""></option>
                                {props.optionsAño}
                              </select>
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {meses.map((mes, index) => (
                            <tr key={index}>
                              <td className="text-start p-2" id="colIzquierda">
                                {mes}
                              </td>
                              {tablaDatos2.map((data, colIndex) => {
                                const gastos = data[mes] || "-";
                                return (
                                  <td
                                    key={colIndex}
                                    className={`${colIndex === tablaDatos.length - 1 ? 'colDerecha' : ''} p-0`}
                                  >
                                    {gastos?.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                          <tr>
                            <td className="text-start fw-bold" id="colIzquierda">
                              Total
                            </td>
                            {totalPorAnio2.map((subtotal, index) => (
                              <td
                                key={index}
                                className={index === totalPorAnio2.length - 1 ? "colDerecha fw-bold" : "fw-bold"}>
                                {subtotal?.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            ))}
                            <tr style={{ height: "8px", backgroundColor: "transparent" }}></tr>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

        </>
      )}
    </>
  );
}

export default ComparacionAnual;
