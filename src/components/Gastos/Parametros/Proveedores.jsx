import React, { useState, useEffect, useRef, useCallback } from "react";
import { Modal } from "react-bootstrap";
import { addDoc, collection, doc, setDoc, deleteDoc, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "../../../firebaseConfig/firebase.js";

const Proveedores = () => {
  const [ruc, setRuc] = useState("");
  const [valorBusquedaProveedor, setValorBusquedaProveedor] = useState("");
  const [idAEditar, setIdAEditar] = useState(null);
  const [proveedor, setProveedor] = useState("");
  const [proveedores, setProveedores] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [modalShowGestionProveedores, setModalShowGestionProveedores] = useState(false);
  const [search, setSearch] = useState("");

  const proveedoresCollection = collection(db, "proveedores");
  const proveedoresCollectionOrdenados = useRef(query(proveedoresCollection, orderBy("name")));


  const getProveedores = useCallback((snapshot) => {
    const proveedoresArray = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setProveedores(proveedoresArray);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const proveedoresSnapshot = await getDocs(proveedoresCollectionOrdenados.current);
        await getProveedores(proveedoresSnapshot);

      } catch (error) {
        console.error('Error fetching data Proveedores:', error);
      }
    };

    fetchData();

  }, [getProveedores]);

  const inputRef = useRef(null);

  const rucExiste = (ruc) => {
    return proveedores.some(
      (proveedor) => proveedor.ruc.toString() === ruc.toString()
    );
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (proveedor.trim() === "" || ruc.trim() === "") {
      setError("Denominacion/RUC no pueden estar vacíos");
      return;
    }
    if (rucExiste(ruc)) {
      setError("El RUC ya existe");
      return;
    }
    const newState = { ruc: ruc, name: proveedor, valorBusquedaProveedor: valorBusquedaProveedor };

    try {
      const docRef = await addDoc(proveedoresCollection, newState)
      const newId = docRef.id;

      handleCloseModal();
      setError("");
      setProveedores([...proveedores, { id: newId, ...newState }]);

    } catch (error) {
      console.error("Error al agregar el Proveedor: ", error);
    }
  };

  const handleEdit = (proveedor) => {
    setIdAEditar(proveedor.id);
    setProveedor(proveedor.name);
    setRuc(proveedor.ruc);
    setValorBusquedaProveedor(proveedor.valorBusquedaProveedor);
    setError("");
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    if (proveedor.trim() === "" || ruc.trim() === "") {
      setError("Denominacion/RUC no pueden estar vacíos");
      return;
    }
    const proveedorToUpdate = proveedores.filter((item) => item.id === idAEditar);
    const newState = { ruc: ruc, name: proveedor, valorBusquedaProveedor: valorBusquedaProveedor };

    const proveedoresActualizados = proveedores.map((item) =>
      item.id === idAEditar ? { ...item, ...newState } : item
    );
    setProveedores(proveedoresActualizados);

    setDoc(doc(proveedoresCollection, proveedorToUpdate[0].id), newState).then(() => {
        setError("");
        handleCloseModal();
      });
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(proveedoresCollection, id));
    const newStates = proveedores.filter((item) => item.id !== id);
    setProveedores(newStates);
    setProveedor("");
    setError("");
  };

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
    filteredResults = proveedores;
  } else {
    filteredResults = proveedores.filter((dato) => {
      const apellidoConNombreSinAcentos = quitarAcentos(dato.name);
      const searchSinAcentos = quitarAcentos(search);
      return (
        apellidoConNombreSinAcentos.includes(searchSinAcentos) ||
        dato.ruc.toString().includes(searchSinAcentos)
      );
    });
  }

  const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentResults = filteredResults.slice(startIndex, endIndex);

  const handleCloseModal = () => {
    setIdAEditar(null);
    setProveedor("");
    setRuc("");
    setValorBusquedaProveedor("");
    setModalShowGestionProveedores(false);
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
              className="form-control-upNav  m-2"
            />
            <i className="fa-solid fa-magnifying-glass"></i>
          </div>

          <div className="container mw-100">
            <div className="row">
              <div className="col">
                <br></br>
                <div className="d-grid gap-2">
                  <div className="d-flex justify-content-between">
                    <div
                      className="d-flex justify-content-center align-items-center"
                      style={{ maxHeight: "40px", marginLeft: "10px" }}
                    >
                      <h1 className="me-2">Proveedores</h1>
                    </div>
                    <div className="col d-flex justify-content-star">
                      <button
                        variant="primary"
                        className="btn-blue m-2"
                        onClick={() => {
                          setIdAEditar(null);
                          setModalShowGestionProveedores(true);
                        }}
                      >
                        Nuevo
                      </button>
                    </div>
                  </div>
                </div>

                <div className="table__container">
                  <table className="table__body">
                    <thead>
                      <tr>
                        <th>RUC</th>
                        <th style={{ textAlign: "left" }}>Denominacion o Nombre Proveedor</th>
                        <th>Accion</th>
                      </tr>
                    </thead>

                    <tbody>
                      {currentResults.map((proveedor) => (
                        <tr key={proveedor.id}>
                          <td id="colIzquierda">{proveedor.ruc}</td>
                          <td style={{ textAlign: "left" }}>{proveedor.name}</td>
                          <td className="colDerecha">
                            <button
                              className="btn btn-success mx-1 btn-sm"
                              onClick={() => {
                                setModalShowGestionProveedores(true);
                                handleEdit(proveedor);
                              }}
                            >
                              <i className="fa-solid fa-edit"></i>
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => {
                                handleDelete(proveedor.id);
                              }}
                            >
                              <i className="fa-solid fa-trash-can"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="table__footer">
                  <div className="table__footer-left">
                    Mostrando {startIndex + 1} - {Math.min(endIndex, proveedores.length)} de {proveedores.length}
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

      {modalShowGestionProveedores && (
        <Modal
          show={modalShowGestionProveedores}
          aria-labelledby="contained-modal-title-vcenter"
          centered
        >
          <Modal.Header closeButton onClick={handleCloseModal}>
            <Modal.Title>Crear/Editar Proveedores</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <form onSubmit={idAEditar !== null ? handleUpdate : handleCreate}>
              <div className="mb-3">
                <label className="form-label">RUC*</label>
                <input
                  type="number"
                  className="form-control"
                  value={ruc}
                  onChange={(e) => {
                    setRuc(e.target.value);
                    setValorBusquedaProveedor(e.target.value + " " + proveedor);
                  }}
                  ref={inputRef}
                />
                {error && <small className="text-danger">{error}</small>}
              </div>
              <div className="mb-3">
                <label className="form-label">
                  Denominacion o Nombre Proveedor*
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={proveedor}
                  onChange={(e) => {
                    setProveedor(e.target.value);
                    setValorBusquedaProveedor(ruc + " " + e.target.value);
                  }}
                  ref={inputRef}
                />
                {error && <small className="text-danger">{error}</small>}
              </div>
              <button className="btn button-main" type="submit">
                {idAEditar !== null ? "Actualizar" : "Crear"}
              </button>

              {idAEditar !== null && (
                <button
                  className="btn btn-secondary mx-2"
                  onClick={handleCloseModal}
                >
                  Cancelar
                </button>
              )}
            </form>
          </Modal.Body>
        </Modal>
      )}
    </>
  );
};
export default Proveedores;
