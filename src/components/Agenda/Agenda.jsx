import React, { useState, useEffect, useCallback, useRef } from "react";
import { collection, deleteDoc, doc, query, orderBy, updateDoc, getDocs } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import CreateCita from "./CreateCita";
import EditCita from "./EditCita";
import Estados from "./Estados";
import HorariosAtencionCitas from "./HorariosAtencionCitas";
import ListaSeleccionEstadoCita from "./ListaSeleccionEstadoCita";
import moment from "moment";
import Calendar from "react-calendar";
import { Dropdown, Modal, Button } from "react-bootstrap";
import "../../style/Main.css"
import Swal from "sweetalert2";
import CryptoJS from 'crypto-js';

function Citas(props) {
  const [rol, setRol] = useState("");
  const hoy = moment(new Date()).format("YYYY-MM-DD");
  const mañana = moment().add(1, 'days').startOf('day');
  const [citas, setCitas] = useState([]);
  const [search, setSearch] = useState("");
  const [modalShowCita, setModalShowCita] = useState(false);
  const [modalShowEditCita, setModalShowEditCita] = useState(false);
  const [cita, setCita] = useState([]);
  const [idParam, setIdParam] = useState("");
  const [order, setOrder] = useState("ASC");
  const [modalShowEstados, setModalShowEstados] = useState(false);
  const [modalShowHorarios, setModalShowHorarios] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [estados, setEstados] = useState([]);
  const [mostrarAjustes, setMostrarAjustes] = useState(false);
  const [modalSeleccionFechaShow, setModalSeleccionFechaShow] = useState(false);
  const [opcionFecha, setOpcionFecha] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [taparFiltro, setTaparFiltro] = useState(false);
  const [modalShowVerNotas, setModalShowVerNotas] = useState(false);
  const [ocultrarFiltrosGenerales, setOcultrarFiltrosGenerales] = useState(false);

  const [estadoOptions, setEstadoOptions] = useState([]);
  const [estadoFiltro, setEstadoFiltro] = useState("");

  const [modalShowFiltros2, setModalShowFiltros2] = useState(false);
  const [selectedCheckbox2, setSelectedCheckbox2] = useState("");
  const [tituloParametroModal, setTituloParametroModal] = useState("");
  const [parametroModal, setParametroModal] = useState("");
  const [filtroBusqueda, setFiltroBusqueda] = useState("");

  const citasCollectiona = collection(db, "citas");
  const citasCollection = useRef(query(citasCollectiona, orderBy("fecha", "desc")));

  const estadosCollectiona = collection(db, "estados");
  const estadosCollection = useRef(query(estadosCollectiona));

  const horariosCollectiona = collection(db, "horariosAtencion");
  const horariosCollection = useRef(query(horariosCollectiona, orderBy("name")));

  const [horarios, setHorarios] = useState([]);

  const getCitas = useCallback((snapshot) => {
    const citasArray = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

    citasArray.sort((a, b) => {
      if (a.fecha === b.fecha) {
        return a.horaInicio.localeCompare(b.horaInicio);
      } else {
        return b.fecha.localeCompare(a.fecha);
      }
    });
    setCitas(citasArray);
    setIsLoading(false);
  }, []);

  const getEstados = useCallback((snapshot) => {
    const estadosArray = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setEstados(estadosArray);
  }, []);

  const getHorarios = useCallback((snapshot) => {
    const horariosArray = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setHorarios(horariosArray);
  }, []);

  const getOptionsEstado = useCallback((snapshot) => {
    const options = snapshot.docs.map((doc, index) => (
      <option key={`estado-${index}`} value={doc.data().name}>{doc.data().name}</option>
    ));
    setEstadoOptions(options);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const gastosSnapshot = await getDocs(citasCollection.current);
        await getCitas(gastosSnapshot);

        const estadosSnapshot = await getDocs(estadosCollection.current);
        await getEstados(estadosSnapshot);

        const optionsEstadosSnapshot = await getDocs(estadosCollection.current);
        await getOptionsEstado(optionsEstadosSnapshot);

        const horariosSnapshot = await getDocs(horariosCollection.current);
        await getHorarios(horariosSnapshot);

      } catch (error) {
        console.error('Error fetching data Agenda:', error);
      }
    };

    fetchData();

  }, [getCitas, getEstados, getOptionsEstado, getHorarios]);

  useEffect(() => {
    const rolEncriptado = localStorage.getItem("rol");
    let bytesDesencriptado = CryptoJS.AES.decrypt(rolEncriptado, process.env.REACT_APP_cryptoKey);
    let rolDesencriptado = bytesDesencriptado.toString(CryptoJS.enc.Utf8);
    setRol(rolDesencriptado);

  }, [getCitas]);


  //Agrega y Edita en BD y Local
  const agregarCita = (nuevaCita) => {
    const nuevasCitas = [...citas, nuevaCita];

    nuevasCitas.sort((a, b) => {
      if (a.fecha === b.fecha) {
        return a.horaInicio.localeCompare(b.horaInicio);
      } else {
        return b.fecha.localeCompare(a.fecha);
      }
    });

    setCitas(nuevasCitas);
  };

  const editarCita = (nuevaCitaActualizada) => {
    const citasActualizadas = citas.map((cita) =>
      cita.id === nuevaCitaActualizada.id ? { ...cita, ...nuevaCitaActualizada } : cita
    );

    citasActualizadas.sort((a, b) => {
      if (a.fecha === b.fecha) {
        return a.horaInicio.localeCompare(b.horaInicio);
      } else {
        return b.fecha.localeCompare(a.fecha);
      }
    });

    setCitas(citasActualizadas);
  };

  const editarCitaEstado = async (citaId, nuevosDatos) => {
    const citasActualizadas = citas.map((cita) =>
      cita.id === citaId ? { ...cita, ...nuevosDatos } : cita
    );

    citasActualizadas.sort((a, b) => {
      if (a.fecha === b.fecha) {
        return a.horaInicio.localeCompare(b.horaInicio);
      } else {
        return b.fecha.localeCompare(a.fecha);
      }
    });

    setCitas(citasActualizadas);
  };


  //Cambia Automaticamente los estados de las Citas a "Por Confirmar" si la fecha de la cita es hoy o mañana
  useEffect(() => {
    citas.forEach((cita) => {
      const citaDate = moment(cita.fecha, 'YYYY-MM-DD').startOf('day');
      if ((citaDate.isSame(mañana) || citaDate.isSame(hoy)) && cita.estado !== "Finalizada" && cita.estado !== "Confirmada" && cita.estado !== "Cancelada" && cita.estado !== "Por Confirmar") {
        const citaRef = doc(db, "citas", cita.id);
        updateDoc(citaRef, { estado: "Por Confirmar" })
        setCitas(citas => {
          const citasActualizadas = citas.map(item =>
            item.id === cita.id ? { ...item, estado: "Por Confirmar" } : item
          );

          return citasActualizadas;
        });
      } else {
      }
    });
  }, [citas, mañana, hoy]);

  function funcMostrarAjustes() {
    if (mostrarAjustes) {
      setMostrarAjustes(false);
    } else {
      setMostrarAjustes(true);
    }
  }

  const buscarEstilos = (estadoParam) => {
    const colorEncontrado = estados.find((e) => e.name === estadoParam);
    if (colorEncontrado && colorEncontrado.color !== "") {
      return { backgroundColor: colorEncontrado.color, marginBottom: "0" };
    };
  }

  const confirmeDelete = (id) => {
    Swal.fire({
      title: '¿Esta seguro?',
      text: "No podra revertir la accion",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#00C5C1',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Si',
      cancelButtonText: 'No'
    }).then((result) => {
      if (result.isConfirmed) {
        deleteCita(id)
        Swal.fire({
          title: '¡Borrado!',
          text: 'Cita eliminada.',
          icon: 'success',
          confirmButtonColor: '#00C5C1'
        });
      }
    })
  }

  const deleteCita = async (id) => {
    const citaDoc = doc(db, "citas", id);
    await deleteDoc(citaDoc);
    setCitas((prevCitas) => prevCitas.filter((cita) => cita.id !== id));
  };


  //A partir de acá Filtros y Busquedas
  const searcher = (e) => {
    if (typeof e === "string") {
      setSearch(e);
    } else {
      setSearch(e.target.value);
    }
  };

  const handleCheckboxChange2 = (event) => {
    setSelectedCheckbox2(event.target.name);
  };

  function handleTituloModal(parametroModal) {
    setFiltroBusqueda(parametroModal);
    switch (parametroModal) {
      case "mes":
        setTituloParametroModal("Por Mes");
        break;
      default:
        setTituloParametroModal("");
    }
    return;
  }

  const filtroFecha = (param) => {
    if (param === "Hoy") {
      setSearch(moment().format("YYYY-MM-DD"));
    }
    if (param === "Esta Semana") {
      const fechaInicio = moment().startOf('isoWeek').format("YYYY-MM-DD");
      const fechaFin = moment().endOf('isoWeek').format("YYYY-MM-DD");
      setSearch({ fechaInicio, fechaFin });
    }
    if (param === "Este Mes") {
      const fechaInicio = moment().startOf('month').format("YYYY-MM-DD");
      const fechaFin = moment().endOf('month').format("YYYY-MM-DD");
      setSearch({ fechaInicio, fechaFin });
    }
  };

  const [paginaActual, setPaginaActual] = useState(1);
  const filasPorPagina = 50;

  const handleCambioPagina = (pagina) => {
    setPaginaActual(pagina);
    if (pagina > 1) {
      setOcultrarFiltrosGenerales(true);
    } else {
      setOcultrarFiltrosGenerales(false);
    }
  };

  let results = []

  if (estadoFiltro) {
    results = citas.filter((dato) => dato.estado.toLowerCase() === estadoFiltro.toLowerCase());
  } else {
    results = citas;
  }

  function quitarAcentos(texto) {
    return texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  results = !search
    ? results
    : typeof search === "object"
      ? results.filter((dato) => {
        const fecha = moment(dato.fecha).format("YYYY-MM-DD");
        return fecha >= search.fechaInicio && fecha <= search.fechaFin;
      })
      : search.toString().length === 10 &&
        search.charAt(4) === "-" &&
        search.charAt(7) === "-"
        ? results.filter((dato) => dato.fecha === search.toString())
        : filtroBusqueda &&
          results.some(
            (cita) =>
              cita[filtroBusqueda]?.includes(search) &&
              cita[filtroBusqueda] !== "" &&
              cita[filtroBusqueda] !== undefined &&
              cita[filtroBusqueda] !== null
          ) ?
          (results = results.filter(
            (dato) =>
              dato[filtroBusqueda]?.includes(search) &&
              dato[filtroBusqueda] !== "" &&
              dato[filtroBusqueda] !== undefined &&
              dato[filtroBusqueda] !== null
          ))
          : results.filter((dato) => {
            const apellidoConNombreSinAcentos = quitarAcentos(dato.apellidoConNombre);
            const searchSinAcentos = quitarAcentos(search);

            return (
              apellidoConNombreSinAcentos.includes(searchSinAcentos) ||
              dato.idc.toString().includes(searchSinAcentos)
            );
          });

  var paginasTotales = Math.ceil(results.length / filasPorPagina);
  var startIndex = (paginaActual - 1) * filasPorPagina;
  var endIndex = startIndex + filasPorPagina;
  var resultsPaginados = results.slice(startIndex, endIndex);

  const sorting = (col) => {
    if (order === "ASC") {
      const sorted = [...citas].sort((a, b) => {
        const valueA =
          typeof a[col] === "string" ? a[col].toLowerCase() : a[col];
        const valueB =
          typeof b[col] === "string" ? b[col].toLowerCase() : b[col];
        return valueA > valueB ? 1 : -1;
      });
      setCitas(sorted);
      setOrder("DSC");
    }
    if (order === "DSC") {
      const sorted = [...citas].sort((a, b) => {
        const valueA =
          typeof a[col] === "string" ? a[col].toLowerCase() : a[col];
        const valueB =
          typeof b[col] === "string" ? b[col].toLowerCase() : b[col];
        return valueA < valueB ? 1 : -1;
      });
      setCitas(sorted);
      setOrder("ASC");
    }
  };

  /*const CustomLink = ({ to, children, ...props }) => (
    <a href={to} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  );*/

  return (
    <>
      {isLoading ? (
        <div className="w-100">
          <span className="loader position-absolute start-50 top-50 mt-3"></span>
        </div>
      ) : (
        <div className="w-100">
          <div className="search-bar d-flex col-2 m-2 ms-3 w-50">
            <input
              value={search}
              onChange={searcher}
              type="text"
              placeholder="Buscar..."
              className="form-control-upNav m-2"
            />
            <i className="fa-solid fa-magnifying-glass"></i>
            {taparFiltro && (
              <input
                className="form-control m-2 w-90"
                value="<-FILTRO ENTRE FECHAS APLICADO->"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  zIndex: 1,
                  textAlign: "center",
                }}
                disabled
              ></input>
            )}
          </div>

          <div className="container mw-100">
            <div className="row">
              <div className="col">
                <br></br>
                <div className="d-flex justify-content-between mt-3">
                  <div
                    className="d-flex justify-content-start align-items-center"
                    style={{ maxHeight: "40px", marginLeft: "10px" }}
                  >
                    <h1>Agenda</h1>
                    {rol === process.env.REACT_APP_rolSupAdmin ? (
                      <button
                        className="btn grey mx-2 btn-sm"
                        style={{ borderRadius: "5px" }}
                        onClick={() => {
                          funcMostrarAjustes(true);
                        }}
                      >
                        <i className="fa-solid fa-gear"></i>
                      </button>
                    ) : null}
                    {rol !== process.env.REACT_APP_rolDoctor ? (
                      <button
                        variant="primary"
                        className="btn-blue m-1"
                        onClick={() => setModalShowCita(true)}
                      >
                        Agregar Cita
                      </button>
                    ) : null}
                    {mostrarAjustes && (
                      <div>
                        <button
                          variant="secondary"
                          className="btn-blue m-1"
                          onClick={() => setModalShowEstados(true)}
                        >
                          Estados
                        </button>
                        <button
                          variant="tertiary"
                          className="btn-blue m-1"
                          onClick={() => setModalShowHorarios(true)}
                        >
                          Horarios
                        </button>
                      </div>
                    )}
                  </div>

                  {!ocultrarFiltrosGenerales && (<div className="col d-flex justify-content-end align-items-center">
                    <div className="mb-3 m-1">
                      <select
                        value={opcionFecha}
                        className="form-control-doctor"
                        multiple={false}
                        onChange={(e) => {
                          const selectedOption = e.target.value;
                          if (selectedOption === "") {
                            setOpcionFecha("")
                            setSearch("")
                            setTaparFiltro(false);
                          } else if (selectedOption === "Hoy") {
                            setOpcionFecha("Hoy")
                            filtroFecha("Hoy");
                            setTaparFiltro(false);
                          } else if (selectedOption === "Esta Semana") {
                            setOpcionFecha("Esta Semana")
                            filtroFecha("Esta Semana");
                            setTaparFiltro(true);
                          } else if (selectedOption === "Este Mes") {
                            setOpcionFecha("Este Mes")
                            filtroFecha("Este Mes");
                            setTaparFiltro(true);
                          } else if (selectedOption === "Seleccionar") {
                            setOpcionFecha("Seleccionar")
                            setModalSeleccionFechaShow(true);
                          }
                          else if (selectedOption === "Meses") {
                            setOpcionFecha("Meses")
                            handleTituloModal("mes");
                            setParametroModal("mes");
                            setModalShowFiltros2(true);
                          }
                        }}
                      >
                        <option value="">Todas las Fechas</option>
                        <option value="Hoy">Hoy</option>
                        <option value="Esta Semana">Esta Semana</option>
                        <option value="Este Mes">Este Mes</option>
                        <option value="Seleccionar">Seleccionar Fecha</option>
                        <option value="Meses">Agrupar por Mes</option>
                      </select>
                    </div>

                    {opcionFecha !== "" && <button
                      className="btn btn-danger btn-sm mb-2"
                      onClick={() => { setOpcionFecha(""); setSearch("") }}
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>}

                    <div className="mb-3 m-1">
                      <select
                        value={estadoFiltro}
                        onChange={(e) => setEstadoFiltro(e.target.value)}
                        className="form-control-doctor"
                        multiple={false}
                      >
                        <option value="">Todos los Estados</option>
                        {estadoOptions}
                      </select>
                    </div>
                  </div>)}
                </div>

                <Modal show={modalSeleccionFechaShow} onHide={() => { setModalSeleccionFechaShow(false); setSelectedDate(""); setTaparFiltro(false); setSearch(""); }}>
                  <Modal.Header closeButton onClick={() => {
                    setModalSeleccionFechaShow(false);
                    setSelectedDate("");
                    setTaparFiltro(false);
                    setSearch("");
                  }}>
                    <Modal.Title>Seleccione una fecha para filtrar:</Modal.Title>
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
                    <Button variant="primary" onClick={() => { setSearch(selectedDate); setTaparFiltro(false); setModalSeleccionFechaShow(false); }}>
                      Buscar Fecha
                    </Button>
                  </Modal.Footer>
                </Modal>

                <Modal
                  show={modalShowFiltros2}
                  onHide={() => {
                    setModalShowFiltros2(false);
                    setSelectedCheckbox2("");
                  }}
                >
                  <Modal.Header
                    closeButton
                    onClick={() => {
                      setModalShowFiltros2(false);
                      setParametroModal("");
                      setSelectedCheckbox2("");
                    }}
                  >
                    <Modal.Title>
                      <h3 style={{ fontWeight: "bold" }}>
                        Filtro Seleccionado :{" "}
                      </h3>
                      <h6>{tituloParametroModal}</h6>
                    </Modal.Title>
                  </Modal.Header>
                  <Modal.Body
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      {citas
                        .map((cita) => cita[parametroModal])
                        .filter(
                          (valor, index, self) =>
                            self.indexOf(valor) === index &&
                            valor !== "" &&
                            valor !== undefined &&
                            valor !== null
                        )
                        .map((parametroModal, index) => (
                          <label className="checkbox-label" key={index}>
                            <input
                              type="checkbox"
                              name={parametroModal}
                              checked={
                                selectedCheckbox2 === parametroModal
                              }
                              onChange={handleCheckboxChange2}
                            />
                            {parametroModal}
                          </label>
                        ))}
                    </div>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button
                      variant="primary"
                      onClick={() => {
                        handleTituloModal("");
                        searcher("");
                        setModalShowFiltros2(false);
                        setSelectedCheckbox2("");
                        setParametroModal("");
                      }}
                    >
                      Salir
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => {
                        searcher(selectedCheckbox2);
                        setModalShowFiltros2(false);
                        setParametroModal("");
                        setTituloParametroModal("");
                        setSelectedCheckbox2("");
                      }}
                    >
                      Aplicar Filtro
                    </Button>
                  </Modal.Footer>
                </Modal>

                <div className="table__container">
                  <table className="table__body">
                    <thead>
                      <tr>
                        <th onClick={() => sorting("fecha")}>Fecha</th>
                        <th>Hora Inicio</th>
                        <th>Hora Fin</th>
                        <th style={{ textAlign: "left" }}>
                          Apellido y Nombres
                        </th>
                        <th>IDC</th>
                        <th>Telefono</th>
                        <th onClick={() => sorting("estado")}>Estado</th>
                        <th id="columnaAccion"></th>
                      </tr>
                    </thead>

                    <tbody>
                      {resultsPaginados.map((cita, index) => (
                        <tr key={cita.id}>
                          <td id="colIzquierda">{moment(cita.fecha).format("DD/MM/YY")}</td>
                          <td> {cita.horaInicio} </td>
                          <td> {cita.horaFin} </td>
                          <td style={{ textAlign: "left" }}> {cita.apellidoConNombre} </td>
                          <td> {cita.idc} </td>
                          <td> {cita.numero} </td>
                          <td style={{ paddingBottom: "0", display: "flex" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {cita.estado || ""}
                              {cita.estado && (
                                <p
                                  style={buscarEstilos(cita.estado)}
                                  className="color-preview justify-content-center align-items-center"
                                ></p>

                              )}
                              <ListaSeleccionEstadoCita
                                editarcita={editarCitaEstado}
                                estadosParam={estados}
                                citaId={cita.id}
                              />
                            </div>
                          </td>
                          <td id="columnaAccion" className="colDerecha">
                            <Dropdown>
                              <Dropdown.Toggle
                                variant="primary"
                                className="btn btn-secondary mx-1 btn-md"
                                id="dropdown-actions"
                                style={{ background: "none", border: "none" }}
                              >
                                <i className="fa-solid fa-ellipsis-vertical" id="tdConColor"></i>
                              </Dropdown.Toggle>

                              <div className="dropdown__container">
                                <Dropdown.Menu>
                                  <Dropdown.Item
                                    onClick={() => {
                                      setModalShowVerNotas([
                                        true,
                                        cita.comentario
                                      ]);
                                    }}
                                  >
                                    <i className="fa-regular fa-comment"></i>
                                    Ver Notas
                                  </Dropdown.Item>

                                  {/*Item con Link a Historia con Parametro de ID de Paciente
                                  <div className="dropdown-item">
                                    <CustomLink to={`/historias/${cita.idPacienteCita}`} style={{ textDecoration: "none", color: "#212529" }}>
                                      <i className="fa-solid fa-file-medical"></i>
                                      Historia
                                    </CustomLink>
                                   </div>*/}

                                  <div>
                                    <Dropdown.Item
                                      onClick={() => {
                                        setModalShowEditCita(true);
                                        setCita(cita);
                                        setIdParam(cita.id);
                                      }}
                                    >
                                      <i className="fa-regular fa-pen-to-square"></i>
                                      Editar
                                    </Dropdown.Item>
                                    <Dropdown.Item
                                      onClick={() =>
                                        confirmeDelete(cita.id)
                                      }
                                    >
                                      <i className="fa-solid fa-trash-can"></i>
                                      Eliminar
                                    </Dropdown.Item>
                                  </div>

                                </Dropdown.Menu>
                              </div>
                            </Dropdown>
                          </td>
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

                {modalShowVerNotas[0] && (
                  <Modal
                    show={modalShowVerNotas[0]}
                    size="md"
                    aria-labelledby="contained-modal-title-vcenter"
                    centered
                    onHide={() => setModalShowVerNotas([false, ""])}
                  >
                    <Modal.Header
                      closeButton
                      onClick={() => setModalShowVerNotas([false, ""])}
                    >
                      <Modal.Title>Comentarios</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                      <form>
                        <div className="row">
                          <p>{modalShowVerNotas[1]}</p>
                        </div>
                      </form>
                    </Modal.Body>
                  </Modal>
                )}
              </div>
            </div>
          </div >
        </div >
      )
      }
      <CreateCita
        show={modalShowCita}
        estadooptions={estadoOptions}
        horarios={horarios}
        agregarcita={agregarCita}
        onHide={() => setModalShowCita(false)} />
      <EditCita
        id={idParam}
        cita={cita}
        estadooptions={estadoOptions}
        horarios={horarios}
        editarcita={editarCita}
        show={modalShowEditCita}
        onHide={() => setModalShowEditCita(false)}
      />
      <Estados
        estadosParam={estados}
        show={modalShowEstados}
        onHide={() => setModalShowEstados(false)}
      />
      <HorariosAtencionCitas
        horariosParam={horarios}
        show={modalShowHorarios}
        onHide={() => setModalShowHorarios(false)}
      />
    </>
  );
}


export default Citas;