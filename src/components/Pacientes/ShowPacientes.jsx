import React, { useState, useEffect, useRef, useCallback } from "react";
import { collection, deleteDoc, doc, getDocs, query } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import CrearPaciente from "./CrearPaciente";
import EditPaciente from "./EditPaciente";
import CreateCita from "../Agenda/CreateCita";
import moment from "moment";
import { Link } from "react-router-dom";
import { Dropdown } from "react-bootstrap";
import "../../style/Main.css";
import Swal from "sweetalert2";
import CryptoJS from 'crypto-js';

const ShowPacientes = (props) => {
  const [pacientes, setPacientes] = useState([]);
  const [search, setSearch] = useState("");
  const [modalShow, setModalShow] = useState(false);
  const [modalShowEdit, setModalShowEdit] = useState(false);
  const [order, setOrder] = useState("ASC");
  const [paciente, setPaciente] = useState([]);
  const [idParam, setIdParam] = useState("");
  const [modalShowCita, setModalShowCita] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [rol, setRol] = useState("");

  const pacientesCollectiona = collection(db, "clients");
  const pacientesCollection = useRef(query(pacientesCollectiona));

  const getPacientes = useCallback((snapshot) => {
    const pacientesArray = snapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    }));
    pacientesArray.sort((a, b) => a.apellidoConNombre.localeCompare(b.apellidoConNombre));
    setPacientes(pacientesArray);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const pacientesSnapshot = await getDocs(pacientesCollection.current);
        await getPacientes(pacientesSnapshot);
      } catch (error) {
        console.error('Error fetching data Pacientes:', error);
      }
    };
    fetchData();
  }, [getPacientes]);

  useEffect(() => {
    const rolEncriptado = localStorage.getItem("rol");
    let bytesDesencriptado = CryptoJS.AES.decrypt(rolEncriptado, process.env.REACT_APP_cryptoKey);
    let rolDesencriptado = bytesDesencriptado.toString(CryptoJS.enc.Utf8);
    setRol(rolDesencriptado);
  }, []);

  const deletePaciente = async (id) => {
    const pacienteDoc = doc(db, "clients", id);
    await deleteDoc(pacienteDoc);
    setPacientes((prevPacientes) =>
      prevPacientes.filter((paciente) => paciente.id !== id)
    );
  };

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
        deletePaciente(id)
        Swal.fire({
          title: '¡Eliminado!',
          text: 'El paciente ha sido borrado.',
          icon: 'success',
          confirmButtonColor: '#00C5C1'
        });
      }
    })
  }

  const searcher = (e) => {
    setSearch(e.target.value);
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  function quitarAcentos(texto) {
    return texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  let filteredResults = [];

  if (!search) {
    filteredResults = pacientes;
  } else {
    filteredResults = pacientes.filter((dato) => {
      const apellidoConNombreSinAcentos = quitarAcentos(dato.apellidoConNombre);
      const searchSinAcentos = quitarAcentos(search);
      return (
        apellidoConNombreSinAcentos.includes(searchSinAcentos) ||
        dato.idc.toString().includes(searchSinAcentos)
      );
    });
  }

  const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentResults = filteredResults.slice(startIndex, endIndex);

  const sorting = (col) => {
    if (order === "ASC") {
      const sorted = [...pacientes].sort((a, b) => {
        const valueA =
          typeof a[col] === "string" ? a[col].toLowerCase() : a[col];
        const valueB =
          typeof b[col] === "string" ? b[col].toLowerCase() : b[col];
        return valueA > valueB ? 1 : -1;
      });
      setPacientes(sorted);
      setOrder("DSC");
    }
    if (order === "DSC") {
      const sorted = [...pacientes].sort((a, b) => {
        const valueA =
          typeof a[col] === "string" ? a[col].toLowerCase() : a[col];
        const valueB =
          typeof b[col] === "string" ? b[col].toLowerCase() : b[col];
        return valueA < valueB ? 1 : -1;
      });
      setPacientes(sorted);
      setOrder("ASC");
    }
  };

  const agregarPaciente = (nuevoPaciente) => {
    const nuevosPacientes = [...pacientes, nuevoPaciente];
    nuevosPacientes.sort((a, b) => a.apellidoConNombre.localeCompare(b.apellidoConNombre));
    setPacientes(nuevosPacientes);
  };

  const editarPaciente = (nuevoPacienteActualizado) => {
    const pacientesActualizados = pacientes.map((item) =>
      item.id === nuevoPacienteActualizado.id ? { ...item, ...nuevoPacienteActualizado } : item);
    pacientesActualizados.sort((a, b) => a.apellidoConNombre.localeCompare(b.apellidoConNombre));
    setPacientes(pacientesActualizados);
  };

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
          </div>

          <div className="container mw-100">
            <div className="row">
              <div className="col">
                <br></br>
                <div className="d-flex justify-content-start">
                  <h1 className="me-2">Pacientes</h1>
                  {rol !== process.env.REACT_APP_rolDoctor ? (
                    <button
                      variant="primary"
                      className="btn button-main m-2"
                      onClick={() => setModalShow(true)}
                    >
                      Nuevo
                    </button>
                  ) : null}
                </div>

                <div className="table__container">
                  <table className="table__body">
                    <thead>
                      <tr>
                        <th onClick={() => sorting("apellidoConNombre")} style={{ textAlign: "left" }}>
                          Apellido Y Nombres
                        </th>
                        <th onClick={() => sorting("tipoIdc")}>Tipo Doc</th>
                        <th onClick={() => sorting("idc")}>IDC</th>
                        <th onClick={() => sorting("fechaNacimiento")}>
                          Fecha Nacimiento
                        </th>
                        <th onClick={() => sorting("numero")}>Telefono</th>
                        <th id="columnaAccion"></th>
                      </tr>
                    </thead>

                    <tbody>
                      {currentResults.map((paciente) => (
                        <tr key={paciente.id}>
                          <td style={{ textAlign: "left" }} id="colIzquierda">
                            <Link to={`/historias/${paciente.id}`} id="tdConColor">
                              {paciente.apellidoConNombre}
                            </Link>

                          </td>
                          <td>{paciente.tipoIdc.toUpperCase()}</td>
                          <td> {paciente.idc} </td>
                          <td>
                            {moment(paciente.fechaNacimiento).format(
                              "DD/MM/YY"
                            )}
                          </td>
                          <td> {paciente.selectedCode}{paciente.numero}</td>

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
                                  <div className="dropdown-item">
                                    <Link to={`/historias/${paciente.id}`} style={{ textDecoration: "none", color: "#212529" }}>
                                      <i className="fa-solid fa-file-medical"></i>
                                      Historia
                                    </Link>
                                  </div>


                                  {rol !== process.env.REACT_APP_rolDoctor ? (
                                    <div>
                                      <Dropdown.Item
                                        onClick={() => {
                                          setModalShowCita(true);
                                          setPaciente(paciente);
                                        }}
                                      >
                                        <i className="fa-solid fa-plus"></i>
                                        Crear Cita
                                      </Dropdown.Item>

                                      <Dropdown.Item
                                        onClick={() => {
                                          setModalShowEdit(true);
                                          setPaciente(paciente);
                                          setIdParam(paciente.id);
                                        }}
                                      >
                                        <i className="fa-regular fa-pen-to-square"></i>
                                        Editar
                                      </Dropdown.Item>


                                      <Dropdown.Item
                                        onClick={() => {
                                          confirmeDelete(paciente.id);
                                        }}
                                      >
                                        <i className="fa-solid fa-trash-can"></i>
                                        Eliminar
                                      </Dropdown.Item>
                                    </div>
                                  ) : null}
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
                    Mostrando {startIndex + 1} - {Math.min(endIndex, pacientes.length)} de {pacientes.length}
                  </div>

                  <div className="table__footer-right">
                    <span>
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        style={{ border: "0", background: "none" }}
                      >
                        &lt; Previo
                      </button>
                    </span>

                    {[...Array(totalPages)].map((_, index) => {
                      const page = index + 1;
                      return (
                        <span key={page}>
                          <span
                            onClick={() => handlePageChange(page)}
                            className={page === currentPage ? "active" : ""}
                            style={{
                              margin: "2px",
                              backgroundColor: page === currentPage ? "#003057" : "transparent",
                              color: page === currentPage ? "#FFFFFF" : "#000000",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              cursor: "pointer"
                            }}
                          >
                            {page}
                          </span>
                        </span>
                      );
                    })}

                    <span>
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
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
        </div>
      )}

      {modalShowCita && <CreateCita
        show={modalShowCita}
        paciente={paciente}
        onHide={() => setModalShowCita(false)}
      />}
      <CrearPaciente
        show={modalShow}
        agregarpaciente={agregarPaciente}
        onHide={() => setModalShow(false)} />
      <EditPaciente
        id={idParam}
        paciente={paciente}
        editarpaciente={editarPaciente}
        show={modalShowEdit}
        onHide={() => setModalShowEdit(false)}
      />
    </>
  );
};

export default ShowPacientes;