import React, { useState, useEffect, useCallback, useRef } from "react";
import { collection, deleteDoc, doc, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import CrearProducto from "./CrearProducto";
import EditProducto from "./EditProducto";
import Categorias from "./Parametros/Categorias";
import { Dropdown } from "react-bootstrap";
import "../../style/Main.css"
import Swal from "sweetalert2";
import CryptoJS from 'crypto-js';

function Productos(props) {
  const [rol, setRol] = useState("");
  const [productos, setProductos] = useState([]);
  const [search, setSearch] = useState("");
  const [modalShowProducto, setModalShowProducto] = useState(false);
  const [modalShowEditProducto, setModalShowEditProducto] = useState(false);
  const [producto, setProducto] = useState([]);
  const [idParam, setIdParam] = useState("");
  const [order, setOrder] = useState("ASC");
  const [categorias, setCategorias] = useState([]);
  const [categoriasOptions, setCategoriasOptions] = useState([]);
  const [modalShowCategorias, setModalShowCategorias] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mostrarAjustes, setMostrarAjustes] = useState(false);

  const productosCollectiona = collection(db, "productos");
  const productosCollection = useRef(query(productosCollectiona, orderBy("fecha", "desc")));

  const categoriasCollectiona = collection(db, "categorias");
  const categoriasCollection = useRef(query(categoriasCollectiona, orderBy("nombre")));

  const getProductos = useCallback((snapshot) => {
    const productosArray = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    setProductos(productosArray);
    setIsLoading(false);
  }, []);

  const getCategorias = useCallback((snapshot) => {
    const categoriasArray = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const opciones = categoriasArray.map((categoria) => (
      <option key={categoria.id} value={categoria.nombre}>{categoria.nombre}</option>
    ));

    setCategorias(categoriasArray);
    setCategoriasOptions(opciones);
  }, []);


  useEffect(() => {
    const fetchData = async () => {
      try {
        const gastosSnapshot = await getDocs(productosCollection.current);
        await getProductos(gastosSnapshot);

        const categoriasSnapshot = await getDocs(categoriasCollection.current);
        await getCategorias(categoriasSnapshot);

      } catch (error) {
        console.error('Error fetching data Productos:', error);
      }
    };

    fetchData();

  }, [getProductos, getCategorias]);

  useEffect(() => {
    const rolEncriptado = localStorage.getItem("rol");
    let bytesDesencriptado = CryptoJS.AES.decrypt(rolEncriptado, process.env.REACT_APP_cryptoKey);
    let rolDesencriptado = bytesDesencriptado.toString(CryptoJS.enc.Utf8);
    setRol(rolDesencriptado);

  }, [getProductos]);


  //Agrega y Edita en BD y Local
  const agregarProducto = (nuevoProducto) => {
    const nuevosProductos = [...productos, nuevoProducto];

    nuevosProductos.sort((a, b) => {
      if (a.fecha === b.fecha) {
        return a.horaInicio.localeCompare(b.horaInicio);
      } else {
        return b.fecha.localeCompare(a.fecha);
      }
    });
    setProductos(nuevosProductos);
  };

  const editarProducto = (nuevoProductoActualizado) => {
    const productosActualizados = productos.map((producto) =>
      producto.id === nuevoProductoActualizado.id ? { ...producto, ...nuevoProductoActualizado } : producto
    );

    productosActualizados.sort((a, b) => {
      if (a.fecha === b.fecha) {
        return a.horaInicio.localeCompare(b.horaInicio);
      } else {
        return b.fecha.localeCompare(a.fecha);
      }
    });

    setProductos(productosActualizados);
  };


  function funcMostrarAjustes() {
    if (mostrarAjustes) {
      setMostrarAjustes(false);
    } else {
      setMostrarAjustes(true);
    }
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
        deleteProducto(id)
        Swal.fire({
          title: '¡Borrado!',
          text: 'Producto eliminada.',
          icon: 'success',
          confirmButtonColor: '#00C5C1'
        });
      }
    })
  }

  const deleteProducto = async (id) => {
    const productoDoc = doc(db, "productos", id);
    await deleteDoc(productoDoc);
    setProductos((prevProductos) => prevProductos.filter((producto) => producto.id !== id));
  };


  //A partir de acá Filtros y Busquedas
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
  };

  let results = []

  function quitarAcentos(texto) {
    return texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  results = !search
    ? results
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
      const sorted = [...productos].sort((a, b) => {
        const valueA =
          typeof a[col] === "string" ? a[col].toLowerCase() : a[col];
        const valueB =
          typeof b[col] === "string" ? b[col].toLowerCase() : b[col];
        return valueA > valueB ? 1 : -1;
      });
      setProductos(sorted);
      setOrder("DSC");
    }
    if (order === "DSC") {
      const sorted = [...productos].sort((a, b) => {
        const valueA =
          typeof a[col] === "string" ? a[col].toLowerCase() : a[col];
        const valueB =
          typeof b[col] === "string" ? b[col].toLowerCase() : b[col];
        return valueA < valueB ? 1 : -1;
      });
      setProductos(sorted);
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
                <div className="d-flex justify-content-between mt-3">
                  <div
                    className="d-flex justify-content-start align-items-center"
                    style={{ maxHeight: "40px", marginLeft: "10px" }}
                  >
                    <h1>Productos</h1>
                    {rol === process.env.REACT_APP_admin ? (
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
                        onClick={() => setModalShowProducto(true)}
                      >
                        Agregar Producto
                      </button>
                    ) : null}
                    {mostrarAjustes && (
                      <div>
                        <button
                          variant="tertiary"
                          className="btn-blue m-1"
                          onClick={() => setModalShowCategorias(true)}
                        >
                          Categorias
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="table__container">
                  <table className="table__body">
                    <thead>
                      <tr>
                        <th onClick={() => sorting("categoria")}>Categoria</th>
                        <th onClick={() => sorting("descripcion")} style={{ textAlign: "left" }}>
                          Descripción
                        </th>
                        <th onClick={() => sorting("precio")}>Precio</th>
                        <th>Imagen</th>
                        <th id="columnaAccion"></th>
                      </tr>
                    </thead>

                    <tbody>
                      {resultsPaginados.map((producto, index) => (
                        <tr key={producto.id}>
                          <td> {producto.categoria} </td>
                          <td style={{ textAlign: "left" }}> {producto.descripcion} </td>
                          <td> {producto.precio} </td>
                          <td>
                            <a
                              href={producto.imagen}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary text-decoration-underline"
                            >
                              Ver Imagen
                            </a>
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
                                  <div>
                                    <Dropdown.Item
                                      onClick={() => {
                                        setModalShowEditProducto(true);
                                        setProducto(producto);
                                        setIdParam(producto.id);
                                      }}
                                    >
                                      <i className="fa-regular fa-pen-to-square"></i>
                                      Editar
                                    </Dropdown.Item>
                                    <Dropdown.Item
                                      onClick={() =>
                                        confirmeDelete(producto.id)
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
              </div>
            </div>
          </div >
        </div >
      )
      }

      <CrearProducto
        show={modalShowProducto}
        categorias_options={categoriasOptions}
        agregar_producto={agregarProducto}
        onHide={() => setModalShowProducto(false)} />
      {/*<EditProducto
        id={idParam}
        producto={producto}
        categorias={categorias}
        editarproducto={editarProducto}
        show={modalShowEditProducto}
        onHide={() => setModalShowEditProducto(false)}
      />*/}
      <Categorias
        categoriasParam={categorias}
        show={modalShowCategorias}
        onHide={() => setModalShowCategorias(false)}
      />
    </>
  );
}


export default Productos;