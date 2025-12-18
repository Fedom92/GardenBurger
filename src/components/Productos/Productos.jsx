import React, { useState, useEffect, useCallback, useRef } from "react";
import { collection, updateDoc, deleteDoc, doc, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import CrearProducto from "./CrearProducto";
import EditProducto from "./EditProducto";
import Categorias from "./Parametros/Categorias";
import "../../style/Main.css"
import Swal from "sweetalert2";
import CryptoJS from 'crypto-js';
import TablaGenerica from "../../Utils/TablaGenerica";

const Productos = () => {
  const [rol, setRol] = useState("");
  const [productos, setProductos] = useState([]);
  const [modalShowProducto, setModalShowProducto] = useState(false);
  const [modalShowEditProducto, setModalShowEditProducto] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState([]);
  const [categoriasOptions, setCategoriasOptions] = useState([]);
  const [modalShowCategorias, setModalShowCategorias] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mostrarAjustes, setMostrarAjustes] = useState(false);

  const productosCollectiona = collection(db, "productos");
  const productosCollection = useRef(query(productosCollectiona, orderBy("descripcion", "desc")));

  const categoriasCollectiona = collection(db, "categorias");
  const categoriasCollection = useRef(query(categoriasCollectiona, orderBy("nroOrden", "asc")));

  const getProductos = useCallback((snapshot) => {
    const productosArray = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .sort((a, b) => a.descripcion.localeCompare(b.descripcion));
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

  }, []);


  //Agrega y Edita en vista Local
  const agregarProducto = (nuevoProducto) => {
    const nuevosProductos = [...productos, nuevoProducto];
    nuevosProductos.sort((a, b) =>
      a.descripcion.localeCompare(b.descripcion)
    );
    setProductos(nuevosProductos);
  };

  const editarProducto = (nuevoProductoActualizado) => {
    const productosActualizados = productos.map((producto) =>
      producto.id === nuevoProductoActualizado.id ? { ...producto, ...nuevoProductoActualizado } : producto);
    productosActualizados.sort((a, b) =>
      a.descripcion.localeCompare(b.descripcion)
    );
    setProductos(productosActualizados);
  };


  function funcMostrarAjustes() {
    if (mostrarAjustes) {
      setMostrarAjustes(false);
    } else {
      setMostrarAjustes(true);
    }
  }

  const toggleVisibilidad = (id, visible) => {
    Swal.fire({
      title: visible ? '¿Quiere desactivar el producto?' : '¿Quiere activar el producto?',
      text: visible ? '(Esto solo ocultará el producto del menú)' : '(Esto volverá a mostrar el producto en el menú)',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#198754',
      confirmButtonText: 'Si',
      cancelButtonText: 'No'
    }).then((result) => {
      if (result.isConfirmed) {
        actualizarVisibilidad(id, !visible);
        Swal.fire({
          title: 'Éxito!',
          text: visible ? 'Producto Desactivado.' : 'Producto Activado.',
          icon: 'success',
          confirmButtonColor: '#198754'
        });
      }
    })
  }

  const actualizarVisibilidad = async (id, nuevoEstado) => {
    const productoDoc = doc(db, 'productos', id);
    await updateDoc(productoDoc, { visible: nuevoEstado });
    setProductos((prevProductos) =>
      prevProductos.map((producto) =>
        producto.id === id ? { ...producto, visible: nuevoEstado } : producto
      )
    );
  };

  const confirmeDelete = (id) => {
    Swal.fire({
      title: '¿Esta seguro?',
      text: "No podra revertir la accion",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#198754',
      confirmButtonText: 'Si',
      cancelButtonText: 'No'
    }).then((result) => {
      if (result.isConfirmed) {
        deleteProducto(id)
        Swal.fire({
          title: '¡Borrado!',
          text: 'Producto eliminado.',
          icon: 'success',
          confirmButtonColor: '#198754'
        });
      }
    })
  }

  const deleteProducto = async (id) => {
    const productoDoc = doc(db, "productos", id);
    await deleteDoc(productoDoc);
    setProductos((prevProductos) => prevProductos.filter((producto) => producto.id !== id));
  };

  const columnasProductos = [
    { columnasBasicas: ["descripcion", "categoria", "precio"] },
    {
      accessorKey: "imagen",
      header: "Imagen",
      cell: ({ getValue, row }) => {
        const url = getValue();
        return url ? (
          <div style={{ position: "relative", display: "inline-block" }}>
            {row.original.oferta && (
              <span className="etiqueta-oferta">
                OFERTA
              </span>
            )}

            <a title="VER IMG" href={url} target="_blank" rel="noopener noreferrer">
              <img
                src={url}
                alt={`${row.original.descripcion ?? "producto"}`}
                height={60}
                loading="lazy"
                className="text-primary text-decoration-underline"
                style={{ cursor: "pointer", objectFit: "cover", borderRadius: 4 }}
              />
            </a>
          </div>
        ) : (
          <span className="text-muted">No Img</span>
        );
      },
    },
    {
      id: "acciones",
      header: "Acciones",
      cell: ({ row }) => {
        const producto = row.original;
        return (
          <>
            <button
              className={`btn mx-1 ${producto.visible ? 'btn-dark' : 'btn-light'}`}
              title={producto.visible ? 'DESACTIVAR' : 'ACTIVAR'}
              onClick={() => toggleVisibilidad(producto.id, producto.visible)}
            >
              <i className="fa-solid fa-power-off"></i>
            </button>
            <button
              className="btn btn-success mx-1"
              title="EDITAR"
              onClick={() => {
                setModalShowEditProducto(true);
                setProductoSeleccionado(producto);
              }}
            >
              <i className="fa-solid fa-edit"></i>
            </button>
            <button
              onClick={() => confirmeDelete(producto.id)}
              className="btn btn-danger"
              title="ELIMINAR"
            >
              <i className="fa-solid fa-trash"></i>
            </button>
          </>
        );
      },
    },
  ];

  return (
    <>
      {isLoading ? (
        <div className="w-100">
          <span className="loader position-absolute start-50 top-50 mt-3"></span>
        </div>
      ) : (
        <div className="w-100">
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
                        className="btn mx-2 btn-sm"
                        style={{ borderRadius: "5px" }}
                        onClick={() => {
                          funcMostrarAjustes(true);
                        }}
                      >
                        <i className="fa-solid fa-gear"></i>
                      </button>
                    ) : null}

                    <button
                      variant="primary"
                      className="btn-contorno m-1"
                      onClick={() => setModalShowProducto(true)}
                    >
                      Agregar Producto
                    </button>

                    {mostrarAjustes && (
                      <div>
                        <button
                          variant="tertiary"
                          className="btn-contorno m-1"
                          onClick={() => setModalShowCategorias(true)}
                        >
                          Categorias
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <TablaGenerica
                  data={productos}
                  columnas={columnasProductos}
                  sortBy="descripcion"
                  ordenDescendente={false}
                  camposBusqueda={["descripcion", "categoria"]}
                  campoSelector="categoria"
                />
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
        onHide={() => setModalShowProducto(false)}
      />
      {productoSeleccionado && (<EditProducto
        producto={productoSeleccionado}
        categorias_options={categoriasOptions}
        editar_producto={editarProducto}
        show={modalShowEditProducto}
        onHide={() => setModalShowEditProducto(false)}
      />)}
      {mostrarAjustes && (<Categorias
        show={modalShowCategorias}
        onHide={() => setModalShowCategorias(false)}
      />)}
    </>
  );
}


export default Productos;