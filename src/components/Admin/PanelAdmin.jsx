import React, { useCallback, useEffect, useRef, useState } from "react";
import { collection, orderBy, query, getDocs, updateDoc, doc } from "firebase/firestore";
import { db, auth } from "../../firebaseConfig/firebase";
import CrearUsuario from "./CrearUsuario";
import Envios from "./Parametros/Envios";
import { Modal } from "react-bootstrap";
import Swal from "sweetalert2";
import "../../style/Main.css";

const PanelAdmin = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [search, setSearch] = useState("");
  const [order, setOrder] = useState("ASC");
  const [modalShow, setModalShow] = useState(false);
  const [mostrarAjustes, setMostrarAjustes] = useState(false);
  const [modalShowEnvios, setModalShowEnvios] = useState(false);

  const [modalShowEditRol, setModalShowEditRol] = useState([false, ""]);
  const [rol, setRol] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  const userCollection = useRef(query(collection(db, "usuarios"), orderBy("rol")));

  const getUsuarios = useCallback((snapshot) => {
    const currentUserEmail = auth.currentUser?.email;

    let usuariosArray = snapshot.docs;
    if (currentUserEmail !== "test@hotmail.com") {
      usuariosArray = usuariosArray.filter((doc) => {
        return doc.data().rol !== process.env.REACT_APP_rolBloq;
      });
    }

    const usuariosMapped = usuariosArray.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    }));
    setUsuarios(usuariosMapped);
    setIsLoading(false);
  }, []);


  useEffect(() => {
    const fetchData = async () => {
      try {
        const usersSnapshot = await getDocs(userCollection.current);
        await getUsuarios(usersSnapshot);

      } catch (error) {
        console.error('Error fetching data Panel Admin:', error);
      }
    };

    fetchData();

  }, [getUsuarios]);

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
    filteredResults = usuarios;
  } else {
    filteredResults = usuarios.filter((dato) => {
      const nombreCompletoSinAcentos = quitarAcentos(dato.nombreCompleto);
      const searchSinAcentos = quitarAcentos(search);
      return (
        nombreCompletoSinAcentos.includes(searchSinAcentos) ||
        dato.telefono.toString().includes(searchSinAcentos)
      );
    });
  }

  const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentResults = filteredResults.slice(startIndex, endIndex);

  const sorting = (col) => {
    if (order === "ASC") {
      const sorted = [...usuarios].sort((a, b) =>
        a[col].toString() > b[col].toString() ? 1 : -1
      );
      setUsuarios(sorted);
      setOrder("DSC");
    }
    if (order === "DSC") {
      const sorted = [...usuarios].sort((a, b) =>
        a[col].toString() < b[col].toString() ? 1 : -1
      );
      setUsuarios(sorted);
      setOrder("ASC");
    }
  };

  const handleEditUsuario = async (id) => {
    const userDoc = doc(db, "usuarios", id);
    await updateDoc(userDoc, { rol: rol });
    setUsuarios((prevUsuarios) =>
      prevUsuarios.map((usuario) =>
        usuario.id === id ? { ...usuario, rol: rol } : usuario
      )
    );
    handleCloseModal();
  };

  const handleCloseModal = () => {
    setModalShowEditRol([false, ""]);
    setRol("")
  };

  const agregarUsuario = (nuevaUsuario) => {
    const nuevosUsuarios = [...usuarios, nuevaUsuario];

    nuevosUsuarios.sort((a, b) => a.rol - b.rol);

    setUsuarios(nuevosUsuarios);
  };

  const confirmeDelete = (e, id) => {
    Swal.fire({
      title: '¿Esta seguro de Eliminar al usuario?',
      text: "No podrá revertir la accion",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#198754',
      confirmButtonText: 'Si',
      cancelButtonText: 'No'
    }).then((result) => {
      if (result.isConfirmed) {
        disableUsuario(e, id)
        Swal.fire({
          title: '¡Eliminado!',
          text: 'El Usuario ha sido borrado.',
          icon: 'success',
          confirmButtonColor: '#198754'
        });
      }
    })
  }

  const disableUsuario = async (e, id) => {
    e.preventDefault();
    const userDoc = doc(db, "usuarios", id);
    await updateDoc(userDoc, { rol: process.env.REACT_APP_rolBloq });
    setUsuarios((prevUsuarios) => prevUsuarios.filter((item) => item.id !== id));
  };

  function funcMostrarAjustes() {
    if (mostrarAjustes) {
      setMostrarAjustes(false);
    } else {
      setMostrarAjustes(true);
    }
  }

  return (
    <>
      {isLoading ? (
        <div className="w-100">
          <span className="loader position-absolute start-50 top-50 mt-3"></span>
        </div>
      ) : (
        <div className="w-100">
          <div className="search-bar">
            <input
              value={search}
              onChange={searcher}
              type="text"
              placeholder="Buscar..."
            />
            <i className="fa-solid fa-magnifying-glass"></i>
          </div>

          <div className="container mw-100">
            <div className="row">
              <div className="col mt-2">
                <br></br>
                <div className="d-grid gap-2">
                  <div className="d-flex justify-content-between">
                    <div
                      className="d-flex justify-content-start align-items-center"
                      style={{ maxHeight: "40px", marginLeft: "10px" }}
                    >
                      <h1>Panel Administrador</h1>
                      <button
                        className="btn mx-2 btn-sm"
                        style={{ borderRadius: "5px" }}
                        onClick={() => {
                          funcMostrarAjustes(true);
                        }}
                      >
                        <i className="fa-solid fa-gear"></i>
                      </button>


                      {mostrarAjustes && (
                        <div>
                          <button
                            variant="tertiary"
                            className="btn-contorno m-1"
                            onClick={() => setModalShowEnvios(true)}
                          >
                            Envios
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="d-flex justify-content-end">
                      <button
                        variant="primary"
                        className="btn btn-contorno m-2"
                        onClick={() => {
                          setModalShow(true);
                        }}
                      >
                        Agregar Usuario
                      </button>
                    </div>
                  </div>
                </div>
                <div className="table__container">
                  <table className="table__body">
                    <thead>
                      <tr>
                        <th onClick={() => sorting("nombreCompleto")}>Nombre Completo</th>
                        <th onClick={() => sorting("correo")}>Email</th>
                        <th onClick={() => sorting("telefono")}>Telefono</th>
                        <th onClick={() => sorting("rol")}>Rol</th>
                        <th>Accion</th>
                      </tr>
                    </thead>

                    <tbody>
                      {currentResults.map((usuario) => (
                        <tr key={usuario.id}
                          className={usuario.rol === process.env.REACT_APP_rolBloq ? "deleted-row" : usuario.rol === process.env.REACT_APP_admin ? "admin-row" : ""}
                        >
                          <td> {usuario.nombreCompleto}</td>
                          <td> {usuario.correo} </td>
                          <td> {usuario.telefono} </td>
                          <td>{usuario.rol === process.env.REACT_APP_admin ?
                            'Admin' : usuario.rol === process.env.REACT_APP_encargado ?
                              'Encargado' : usuario.rol === process.env.REACT_APP_cajero ?
                                'Cajero' : usuario.rol === process.env.REACT_APP_cocina ?
                                  'Cocina' : usuario.rol === process.env.REACT_APP_delivery ?
                                    'Delivery' : usuario.rol === process.env.REACT_APP_contador ?
                                      'Contador' : 'Bloqueado'}</td>
                          <td>
                            {usuario.rol !== process.env.REACT_APP_admin && (
                              <>
                                <button
                                  className="btn btn-success mx-1"
                                  onClick={() => setModalShowEditRol([true, usuario])}
                                >
                                  <i className="fa-solid fa-edit"></i>
                                </button>

                                <button
                                  onClick={(e) => {
                                    confirmeDelete(e, usuario.id);
                                  }}
                                  className="btn btn-danger"
                                >
                                  <i className="fa-solid fa-trash"></i>
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="table__footer">
                  <div className="table__footer-left">
                    Mostrando {startIndex + 1} - {Math.min(endIndex, usuarios.length)} de {usuarios.length}
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
        </div >
      )
      }
      <CrearUsuario
        show={modalShow}
        agregarusuario={agregarUsuario}
        onHide={() => setModalShow(false)} />

      <Envios
        show={modalShowEnvios}
        onHide={() => setModalShowEnvios(false)} />
      {
        modalShowEditRol[0] && (
          <Modal
            show={modalShowEditRol[0]}
            aria-labelledby="contained-modal-title-vcenter"
            centered
          >
            <Modal.Header closeButton onClick={handleCloseModal}>
              <Modal.Title>Editar Rol</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <form name="editarRol">
                <div className="mb-2">
                  <label className="form-label">Rol*</label>
                  <select
                    defaultValue={modalShowEditRol[1].rol}
                    onChange={(e) => setRol(e.target.value)}
                    className="form-control"
                    multiple={false}
                  >
                    <option value={process.env.REACT_APP_encargado}>Encargado</option>
                    <option value={process.env.REACT_APP_cajero}>Cajero</option>
                    <option value={process.env.REACT_APP_cocina}>Cocina</option>
                    <option value={process.env.REACT_APP_delivery}>Delivery</option>
                    <option value={process.env.REACT_APP_contador}>Contador</option>
                  </select>
                </div>
                <button
                  className="btn btn-success"
                  type="submit"
                  onClick={(e) => {
                    e.preventDefault();
                    handleEditUsuario(modalShowEditRol[1].id)
                  }}
                >
                  Actualizar
                </button>
              </form>
            </Modal.Body>
          </Modal>
        )
      }
    </>
  );
}

export default PanelAdmin;
