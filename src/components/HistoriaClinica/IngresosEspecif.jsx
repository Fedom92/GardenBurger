import React, { useState, useEffect, useRef, useCallback } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import moment from "moment";
import Calendar from "react-calendar";
import { Modal, Button } from "react-bootstrap";
import "../../style/Main.css";
import iconoDinero from "../../img/icono-dinero.png";

function IngresosEspecif({ id }) {
  const [cobros, setCobros] = useState([]);
  const [search, setSearch] = useState("");
  const [order, setOrder] = useState("ASC");
  const [isLoading, setIsLoading] = useState(true);
  const [totalIngresos, setTotalIngresos] = useState(0);
  const [noHayIngresos, setNoHayIngresos] = useState(false);

  const [modalSeleccionFechaShow, setModalSeleccionFechaShow] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [mostrarBotonesFechas, setMostrarBotonesFechas] = useState(false);
  const [ocultarCalendario, setOcultarCalendario] = useState(false);

  const tratamientosCollectionRef = collection(db, "tratamientos");
  const tratamientosCollection = useRef(query(tratamientosCollectionRef));


  const getCobros = useCallback((snapshot) => {
    const cobrosArray = snapshot.docs
      .filter((doc) => doc.data().idPaciente === id)
      .map((doc) => {
        const tratamiento = doc.data();
        const cobrosManuales = tratamiento.cobrosManuales;

        const resultadosCobros = cobrosManuales.fechaCobro.map((_, index) => {
          const fechaCobro = cobrosManuales.fechaCobro[index] || "";
          const codigoTratamiento = cobrosManuales.codigoTratamiento[index] || "";
          const nroComprobanteCobro = cobrosManuales.nroComprobanteCobro[index] || "";
          const importeAbonado = cobrosManuales.importeAbonado[index] || "";
          const pacienteCobro = cobrosManuales.pacienteCobro[index] || "";
          const timestampCobro = cobrosManuales.timestampCobro[index] || "";
          const tratamientoCobro = cobrosManuales.tratamientoCobro[index] || "";

          return {
            fechaCobro,
            nroComprobanteCobro,
            importeAbonado,
            codigoTratamiento,
            pacienteCobro,
            timestampCobro,
            tratamientoCobro,
          };
        });

        return resultadosCobros;
      });
    const sortedCobrosArray = cobrosArray.flat().sort((a, b) => a.timestampCobro - b.timestampCobro);
    setCobros(sortedCobrosArray);
    if (cobrosArray.length === 0) {
      setNoHayIngresos(true)
    } else {
      setNoHayIngresos(false)
    }
    setIsLoading(false);
  }, [id]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const gastosSnapshot = await getDocs(tratamientosCollection.current, where("idPaciente", "==", id));
        await getCobros(gastosSnapshot);
      } catch (error) {
        console.error('Error fetching data IngresosEspecif:', error);
      }
    };
    fetchData();
  }, [getCobros, id]);

  const searcher = (e) => {
    if (typeof e === "string") {
      setSearch(e);
    } else {
      setSearch(e.target.value);
    }
  };

  const [paginaActual, setPaginaActual] = useState(1);
  const filasPorPagina = 50;

  const handleCambioPagina = (pagina) => {
    setPaginaActual(pagina);
    if (pagina > 1) {
      setOcultarCalendario(true);
    } else {
      setOcultarCalendario(false);
    }
  };

  function quitarAcentos(texto) {
    return texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  var results;
  if (!search || search === "") {
    results = cobros;
  } else {
    if (typeof search === "object") {
      results = cobros.filter((dato) => {
        const fecha = moment(dato.fechaCobro).format("YYYY-MM-DD");
        return fecha >= search.fechaInicio && fecha <= search.fechaFin;
      });
    } else {
      if (
        search.toString().length === 10 &&
        search.charAt(4) === "-" &&
        search.charAt(7) === "-"
      ) {
        results = cobros.filter(
          (dato) => dato.fechaCobro === search.toString()
        );
      } else {
        results = cobros.filter((dato) => {
          const pacienteCobroSinAcentos = quitarAcentos(dato.pacienteCobro);
          const tratamientoCobroSinAcentos = quitarAcentos(dato.tratamientoCobro);
          const searchSinAcentos = quitarAcentos(search);
          return (
            pacienteCobroSinAcentos.includes(searchSinAcentos) ||
            tratamientoCobroSinAcentos.includes(searchSinAcentos)
          );
        });
      }
    }
  }

  var paginasTotales = Math.ceil(results.length / filasPorPagina);
  var startIndex = (paginaActual - 1) * filasPorPagina;
  var endIndex = startIndex + filasPorPagina;
  var resultsPaginados = results.slice(startIndex, endIndex);

  useEffect(() => {
    let total = 0;

    resultsPaginados.forEach((cobro) => {
      total += Number(cobro.importeAbonado);
    });

    setTotalIngresos(total);
  }, [resultsPaginados]);

  const sorting = (col) => {
    if (order === "ASC") {
      const sorted = [...cobros].sort((a, b) => {
        const valueA =
          typeof a[col] === "string" ? a[col].toLowerCase() : a[col];
        const valueB =
          typeof b[col] === "string" ? b[col].toLowerCase() : b[col];
        return valueA > valueB ? 1 : -1;
      });
      setCobros(sorted);
      setOrder("DSC");
    }
    if (order === "DSC") {
      const sorted = [...cobros].sort((a, b) => {
        const valueA =
          typeof a[col] === "string" ? a[col].toLowerCase() : a[col];
        const valueB =
          typeof b[col] === "string" ? b[col].toLowerCase() : b[col];
        return valueA < valueB ? 1 : -1;
      });
      setCobros(sorted);
      setOrder("ASC");
    }
  };

  const filtroFecha = (param) => {
    if (param === "Dia") {
      setSearch(moment().format("YYYY-MM-DD"));
    }
    if (param === "Ultimos 7") {
      const fechaInicio = moment().subtract(7, "days").format("YYYY-MM-DD");
      const fechaFin = moment().format("YYYY-MM-DD");
      setSearch({ fechaInicio, fechaFin });
    }
    if (param === "Mes") {
      const fechaInicio = moment().startOf('month').format("YYYY-MM-DD");
      const fechaFin = moment().endOf('month').format("YYYY-MM-DD");
      setSearch({ fechaInicio, fechaFin });
    }
  };

  return (
    <>
      <div className="mainpage">
        {isLoading ? (
          <span className="loader position-absolute start-50 top-50 mt-3"></span>
        ) : (
          <>
            {noHayIngresos ? (
              !id ? (
                <div className="container mt-2 mw-100" >
                  <div className="row">
                    <h1>No se ha seleccionado un Paciente.</h1>
                  </div>
                </div>
              ) : (
                <div className="container mt-2 mw-100" >
                  <div className="row">
                    <h1>A Este paciente no se le han registrado Ventas aún</h1>
                    <h3 id="tituloVentas">Para registrar Ventas diríjase a Tratamientos</h3>
                  </div>
                </div>
              )
            ) : (
              <div className="w-100">
                <div className="container mt-2 mw-100">
                  <div className="col">
                    <div className="row">
                      <div className="d-grid gap-2">
                        <div className="d-flex justify-content-between align-items-center">
                          <div className="col d-flex justify-content-start align-items-center">
                            <h3 id="tituloVentas">Ventas cobradas al Paciente</h3>
                            {!ocultarCalendario && (<button
                              variant="primary"
                              className="btn greenWater without mx-1 btn-md ms-3 me-3"
                              style={{
                                borderRadius: "12px",
                                justifyContent: "center",
                                verticalAlign: "center",
                                alignSelf: "center",
                                height: "45px",
                              }}
                              onClick={() => {
                                setMostrarBotonesFechas(!mostrarBotonesFechas);
                                setSearch("");
                              }}
                            >
                              <i
                                className="fa-regular fa-calendar-check"
                                style={{ transform: "scale(1.4)" }}
                              ></i>
                            </button>)}
                            {mostrarBotonesFechas && (
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "center",
                                  verticalAlign: "center",
                                  alignItems: "center",
                                }}
                              >
                                <button
                                  style={{
                                    borderRadius: "7px",
                                    margin: "1px",
                                    height: "38px",
                                  }}
                                  className="btn btn-outline-dark"
                                  onClick={() => {
                                    filtroFecha("Dia");
                                  }}
                                >
                                  Dia
                                </button>
                                <button
                                  style={{
                                    borderRadius: "7px",
                                    margin: "1px",
                                    height: "38px",
                                  }}
                                  className="btn btn-outline-dark"
                                  onClick={() => {
                                    filtroFecha("Ultimos 7");
                                  }}
                                >
                                  Ultimos 7
                                </button>
                                <button
                                  style={{
                                    borderRadius: "7px",
                                    margin: "1px",
                                    height: "38px",
                                  }}
                                  className="btn btn-outline-dark"
                                  onClick={() => {
                                    filtroFecha("Mes");
                                  }}
                                >
                                  Mes
                                </button>
                                <button
                                  style={{
                                    borderRadius: "7px",
                                    margin: "1px",
                                    height: "38px",
                                  }}
                                  className="btn btn-outline-dark"
                                  onClick={() => {
                                    setModalSeleccionFechaShow(true);
                                  }}
                                >
                                  Seleccionar
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="col d-flex justify-content-end align-items-center">
                            <input
                              value={search}
                              onChange={searcher}
                              type="text"
                              className="form-control m-2 w-25"
                              style={{ display: "none" }}
                            />
                            <div className="d-flex form-control-dash">
                              <img src={iconoDinero} className="profile-dinero" alt="iconoDinero"></img>
                              <h5 id="tituloVentas">Total Ventas: <span style={{ fontWeight: 'bold' }}>{totalIngresos}</span></h5>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Modal
                      show={modalSeleccionFechaShow}
                      onHide={() => {
                        setModalSeleccionFechaShow(false);
                        setSelectedDate("");
                        setSearch("");
                        setMostrarBotonesFechas(false);
                      }}
                    >
                      <Modal.Header
                        closeButton
                        onClick={() => {
                          setModalSeleccionFechaShow(false);
                          setSelectedDate("");
                          setSearch("");
                          setMostrarBotonesFechas(false);
                        }}
                      >
                        <Modal.Title>
                          Seleccione una fecha para filtrar:
                        </Modal.Title>
                      </Modal.Header>
                      <Modal.Body
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Calendar
                          defaultValue={moment().format("YYYY-MM-DD")}
                          onChange={(date) => {
                            const formattedDate =
                              moment(date).format("YYYY-MM-DD");
                            setSelectedDate(formattedDate);
                          }}
                          value={selectedDate}
                        />
                      </Modal.Body>
                      <Modal.Footer>
                        <Button
                          variant="primary"
                          onClick={() => {
                            setSearch(selectedDate);
                            setModalSeleccionFechaShow(false);
                            setMostrarBotonesFechas(false);
                          }}
                        >
                          Buscar Fecha
                        </Button>
                      </Modal.Footer>
                    </Modal>


                    <div className="table__container">
                      <table className="table__body">
                        <thead>
                          <tr>
                            <th onClick={() => sorting("timestampCobro")}>Fecha</th>
                            <th style={{ textAlign: "left" }}>
                              Paciente
                            </th>
                            <th style={{ textAlign: "left" }}>
                              Tratamiento
                            </th>
                            <th>
                              Nro Comprobante
                            </th>
                            <th>
                              Importe
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {resultsPaginados.map((cobro, index) => (
                            <tr key={cobro + index}>
                              <td id="colIzquierda">
                                {moment(cobro.fechaCobro).format("DD/MM/YY")}
                              </td>
                              <td style={{ textAlign: "left" }}> {cobro.pacienteCobro} </td>
                              <td style={{ textAlign: "left" }}> {cobro.tratamientoCobro} </td>
                              <td> {cobro.nroComprobanteCobro} </td>
                              <td className="colDerecha"> {cobro.importeAbonado} </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="table__footer">
                      <div className="table__footer-left">
                        Mostrando {startIndex + 1} - {endIndex} de {results.length}
                      </div>

                      <div className="table__footer-right">
                        <span>
                          <button
                            onClick={() => handleCambioPagina(paginaActual - 1)}
                            disabled={paginaActual === 1}
                            style={{ border: "0", background: "none" }}
                          >
                            &lt; Previo
                          </button>
                        </span>

                        {[...Array(paginasTotales)].map((_, index) => {
                          const pagina = index + 1;
                          return (
                            <span key={pagina}>
                              <span
                                onClick={() => handleCambioPagina(pagina)}
                                className={pagina === paginaActual ? "active" : ""}
                                style={{
                                  margin: "2px",
                                  backgroundColor: pagina === paginaActual ? "#003057" : "transparent",
                                  color: pagina === paginaActual ? "#FFFFFF" : "#000000",
                                  padding: "4px 8px",
                                  borderRadius: "4px",
                                  cursor: "pointer"
                                }}
                              >
                                {pagina}
                              </span>
                            </span>
                          );
                        })}

                        <span>
                          <button
                            onClick={() => handleCambioPagina(paginaActual + 1)}
                            disabled={paginaActual === paginasTotales}
                            style={{ border: "0", background: "none" }}
                          >
                            Siguiente &gt;
                          </button>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default IngresosEspecif;
