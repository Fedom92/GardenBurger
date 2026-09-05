import React, { useCallback, useEffect, useRef, useState } from "react";
import { collection, orderBy, query, getDocs, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db, app } from "../../firebaseConfig/firebase";
import { ROLES_CON_MOTO, NOMBRES_ROL } from "../../Utils/Constantes";
import CrearEmpleado from "./CrearEmpleado";
import Envios from "./Parametros/Envios";
import Sucursales from "./Parametros/Sucursales";
import { fetchSucursales } from "../../Utils/sucursales";
import { Modal } from "react-bootstrap";
import Swal from "sweetalert2";
import "../../style/Main.css";

const EDICION_VACIA = {
  rol: "", sucursal: "", dni: "", domicilio: "", telefono: "", valorHora: 0,
  marcaMoto: "", modeloMoto: "", colorMoto: "", patente: "",
};

const PanelAdmin = () => {
  const [empleados, setEmpleados] = useState([]);
  const [search, setSearch] = useState("");
  const [order, setOrder] = useState("ASC");
  const [modalShow, setModalShow] = useState(false);
  const [modalShowEnvios, setModalShowEnvios] = useState(false);
  const [modalShowSucursales, setModalShowSucursales] = useState(false);
  const [sucursales, setSucursales] = useState([]);

  const [modalShowEditRol, setModalShowEditRol] = useState([false, ""]);
  const [edicion, setEdicion] = useState(EDICION_VACIA);

  const [isLoading, setIsLoading] = useState(true);

  const empleadosCollection = useRef(query(collection(db, "usuarios"), orderBy("rol")));

  const getEmpleados = useCallback((snapshot) => {
    // Los dados de baja quedan como registro histórico (activo: false).
    // Los docs viejos sin el campo se consideran activos.
    const empleadosMapped = snapshot.docs
      .filter((doc) => doc.data().activo !== false)
      .map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
    setEmpleados(empleadosMapped);
    setIsLoading(false);
  }, []);


  useEffect(() => {
    const fetchData = async () => {
      try {
        const empleadosSnapshot = await getDocs(empleadosCollection.current);
        await getEmpleados(empleadosSnapshot);

      } catch (error) {
        console.error('Error fetching data Panel Admin:', error);
      }
    };

    fetchData();

  }, [getEmpleados]);

  useEffect(() => {
    fetchSucursales().then(setSucursales).catch(console.error);
  }, []);

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
    filteredResults = empleados;
  } else {
    filteredResults = empleados.filter((dato) => {
      // Con los repartidores adentro la colección es más heterogénea: cualquiera
      // de estos campos puede faltar y `.toString()` sobre undefined revienta.
      const searchSinAcentos = quitarAcentos(search);
      return ["nombreCompleto", "telefono", "dni"].some((campo) =>
        quitarAcentos(String(dato[campo] ?? "")).includes(searchSinAcentos)
      );
    });
  }

  const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentResults = filteredResults.slice(startIndex, endIndex);

  const sorting = (col) => {
    // `?? ""` porque no todos los empleados tienen todos los campos: un cajero no
    // tiene patente y un repartidor viejo puede no tener valorHora.
    const valor = (fila) => String(fila[col] ?? "");
    const signo = order === "ASC" ? 1 : -1;
    setEmpleados([...empleados].sort((a, b) =>
      valor(a).localeCompare(valor(b), "es", { numeric: true }) * signo
    ));
    setOrder(order === "ASC" ? "DSC" : "ASC");
  };

  const handleEditEmpleado = async (id) => {
    if (!edicion.sucursal) {
      Swal.fire({ title: "Falta la sucursal", text: "Selecciona una sucursal para el empleado.", icon: "warning", confirmButtonColor: "#198754" });
      return;
    }

    // Los datos de la moto solo se guardan si el rol los usa: si alguien deja de
    // ser repartidor, no tiene sentido que arrastre la patente.
    const cambios = {
      rol: edicion.rol,
      sucursal: edicion.sucursal,
      dni: edicion.dni,
      domicilio: edicion.domicilio,
      telefono: edicion.telefono,
      valorHora: Number(edicion.valorHora) || 0,
      ...(ROLES_CON_MOTO.includes(edicion.rol) ? {
        marcaMoto: edicion.marcaMoto,
        modeloMoto: edicion.modeloMoto,
        colorMoto: edicion.colorMoto,
        patente: edicion.patente,
      } : {}),
    };

    await updateDoc(doc(db, "usuarios", id), cambios);
    setEmpleados((prevEmpleados) =>
      prevEmpleados.map((empleado) =>
        empleado.id === id ? { ...empleado, ...cambios } : empleado
      )
    );
    handleCloseModal();
  };

  const handleOpenEditModal = (empleado) => {
    setModalShowEditRol([true, empleado]);
    setEdicion({
      rol: empleado.rol || "",
      sucursal: empleado.sucursal || "",
      dni: empleado.dni || "",
      domicilio: empleado.domicilio || "",
      telefono: empleado.telefono || "",
      valorHora: empleado.valorHora ?? 0,
      marcaMoto: empleado.marcaMoto || "",
      modeloMoto: empleado.modeloMoto || "",
      colorMoto: empleado.colorMoto || "",
      patente: empleado.patente || "",
    });
  };

  const handleCloseModal = () => {
    setModalShowEditRol([false, ""]);
    setEdicion(EDICION_VACIA);
  };

  const setCampo = (campo) => (e) =>
    setEdicion((prev) => ({ ...prev, [campo]: e.target.value }));

  const agregarEmpleado = (nuevoEmpleado) => {
    const nuevosEmpleados = [...empleados, nuevoEmpleado];

    nuevosEmpleados.sort((a, b) => a.rol - b.rol);

    setEmpleados(nuevosEmpleados);
  };

  const confirmeDelete = (e, empleado) => {
    e.preventDefault();
    Swal.fire({
      title: '¿Está seguro de eliminar?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#198754',
      confirmButtonText: 'Aceptar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        darDeBajaEmpleado(empleado);
      }
    })
  }

  const darDeBajaEmpleado = async (empleado) => {
    try {
      if (empleado.sinAcceso) {
        // No tiene cuenta de Auth: llamar a la Function fallaría con un uid que
        // no existe. Alcanza con marcar el documento.
        await updateDoc(doc(db, "usuarios", empleado.id), {
          activo: false,
          bajaTimestamp: serverTimestamp(),
        });
      } else {
        // Server-side: borra la cuenta de Auth y marca el doc como inactivo
        const darDeBajaFn = httpsCallable(getFunctions(app), "darDeBajaUsuario");
        await darDeBajaFn({ uid: empleado.id });
      }

      setEmpleados((prevEmpleados) => prevEmpleados.filter((item) => item.id !== empleado.id));
      Swal.fire({
        title: '¡Listo!',
        text: 'El empleado fue dado de baja.',
        icon: 'success',
        confirmButtonColor: '#198754'
      });
    } catch (error) {
      console.error("Error al dar de baja al empleado: ", error);
      Swal.fire({
        title: '¡Error!',
        text: error.message || 'No se pudo dar de baja al empleado.',
        icon: 'error',
        confirmButtonColor: '#d33',
      });
    }
  };

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
                      <div>
                        <button
                          variant="tertiary"
                          className="btn-contorno m-1 mx-2"
                          onClick={() => setModalShowEnvios(true)}
                        >
                          Envios
                        </button>
                        <button
                          variant="tertiary"
                          className="btn-contorno m-1"
                          onClick={() => setModalShowSucursales(true)}
                        >
                          Sucursales
                        </button>
                      </div>
                    </div>

                    <div className="d-flex justify-content-end">
                      <button
                        variant="primary"
                        className="btn-contorno m-2"
                        onClick={() => {
                          setModalShow(true);
                        }}
                      >
                        Agregar Empleado
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
                        <th onClick={() => sorting("sucursal")}>Sucursal</th>
                        <th onClick={() => sorting("valorHora")}>Valor Hora</th>
                        <th>Accion</th>
                      </tr>
                    </thead>

                    <tbody>
                      {currentResults.map((empleado) => (
                        <tr key={empleado.id}
                          className={empleado.rol === process.env.REACT_APP_admin ? "admin-row" : ""}
                        >
                          <td> {empleado.nombreCompleto}</td>
                          <td>
                            {empleado.sinAcceso
                              ? <span className="badge bg-secondary">Sin acceso</span>
                              : (empleado.correo || "—")}
                          </td>
                          <td> {empleado.telefono} </td>
                          <td>{NOMBRES_ROL[empleado.rol] || '—'}</td>
                          <td>{sucursales.find((s) => s.id === empleado.sucursal)?.nombre || empleado.sucursal || "—"}</td>
                          <td>{empleado.valorHora ? `$${Number(empleado.valorHora).toLocaleString("es-AR")}` : "—"}</td>
                          <td>
                            {empleado.rol !== process.env.REACT_APP_admin && (
                              <>
                                <button
                                  className="btn btn-success mx-1"
                                  onClick={() => handleOpenEditModal(empleado)}
                                >
                                  <i className="fa-solid fa-edit"></i>
                                </button>

                                <button
                                  onClick={(e) => {
                                    confirmeDelete(e, empleado);
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
                    Mostrando {startIndex + 1} - {Math.min(endIndex, empleados.length)} de {empleados.length}
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
      <CrearEmpleado
        show={modalShow}
        agregarempleado={agregarEmpleado}
        onHide={() => setModalShow(false)} />

      <Envios
        show={modalShowEnvios}
        onHide={() => setModalShowEnvios(false)} />

      <Sucursales
        show={modalShowSucursales}
        onHide={() => {
          setModalShowSucursales(false);
          fetchSucursales().then(setSucursales).catch(console.error);
        }} />
      {
        modalShowEditRol[0] && (
          <Modal
            show={modalShowEditRol[0]}
            size="lg"
            aria-labelledby="contained-modal-title-vcenter"
            centered
          >
            <Modal.Header closeButton onClick={handleCloseModal}>
              <Modal.Title>Editar Empleado — {modalShowEditRol[1].nombreCompleto}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <form name="editarEmpleado">
                <div className="row">
                  <div className="col-md-6 mb-2">
                    <label className="form-label">Rol*</label>
                    <select
                      value={edicion.rol}
                      onChange={setCampo("rol")}
                      className="form-control"
                      multiple={false}
                    >
                      <option value={process.env.REACT_APP_encargado}>Encargado</option>
                      <option value={process.env.REACT_APP_cajero}>Cajero</option>
                      <option value={process.env.REACT_APP_cocina}>Cocina</option>
                      <option value={process.env.REACT_APP_delivery}>Delivery</option>
                      <option value={process.env.REACT_APP_contador}>Contador</option>
                      <option value={process.env.REACT_APP_atp}>ATP</option>
                    </select>
                  </div>
                  <div className="col-md-6 mb-2">
                    <label className="form-label">Sucursal*</label>
                    <select
                      value={edicion.sucursal}
                      onChange={setCampo("sucursal")}
                      className="form-control"
                      multiple={false}
                    >
                      <option value="">Selecciona una sucursal ....</option>
                      {sucursales.map((s) => (
                        <option key={s.id} value={s.id}>{s.nombre || s.id}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-4 mb-2">
                    <label className="form-label">DNI</label>
                    <input type="text" className="form-control" value={edicion.dni} onChange={setCampo("dni")} />
                  </div>
                  <div className="col-md-4 mb-2">
                    <label className="form-label">Telefono</label>
                    <input type="text" className="form-control" value={edicion.telefono} onChange={setCampo("telefono")} />
                  </div>
                  <div className="col-md-4 mb-2">
                    <label className="form-label">Valor por hora ($)</label>
                    <input type="number" min={0} className="form-control" value={edicion.valorHora} onChange={setCampo("valorHora")} />
                  </div>
                </div>

                <div className="mb-2">
                  <label className="form-label">Domicilio</label>
                  <input type="text" className="form-control" value={edicion.domicilio} onChange={setCampo("domicilio")} />
                </div>

                {ROLES_CON_MOTO.includes(edicion.rol) && (
                  <div className="row border-top pt-2 mt-1">
                    <div className="col-12 mb-1">
                      <span className="text-body-secondary small fw-bold text-uppercase">Datos de la moto</span>
                    </div>
                    <div className="col-md-3 mb-2">
                      <label className="form-label">Patente</label>
                      <input type="text" className="form-control" value={edicion.patente} onChange={setCampo("patente")} />
                    </div>
                    <div className="col-md-3 mb-2">
                      <label className="form-label">Marca</label>
                      <input type="text" className="form-control" value={edicion.marcaMoto} onChange={setCampo("marcaMoto")} />
                    </div>
                    <div className="col-md-3 mb-2">
                      <label className="form-label">Modelo</label>
                      <input type="text" className="form-control" value={edicion.modeloMoto} onChange={setCampo("modeloMoto")} />
                    </div>
                    <div className="col-md-3 mb-2">
                      <label className="form-label">Color</label>
                      <input type="text" className="form-control" value={edicion.colorMoto} onChange={setCampo("colorMoto")} />
                    </div>
                  </div>
                )}

                <button
                  className="btn btn-success mt-2"
                  type="submit"
                  onClick={(e) => {
                    e.preventDefault();
                    handleEditEmpleado(modalShowEditRol[1].id)
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
