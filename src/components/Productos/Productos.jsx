import React, { useState, useEffect, useCallback, useRef } from "react";
import { collection, deleteDoc, doc, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import CrearProducto from "./CrearProducto";
import EditProducto from "./EditProducto";
import Categorias from "./Parametros/Categorias";
import "../../style/Main.css"
import Swal from "sweetalert2";
import CryptoJS from 'crypto-js';
import TablaGenerica from "../../Utils/TablasGenericas";

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
  const productosCollection = useRef(query(productosCollectiona, orderBy("descripcion", "desc")));

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
    {
      accessorKey: "descripcion",
      header: "Descripción",
    },
    {
      accessorKey: "categoria",
      header: "Categoría",
    },
    {
      accessorKey: "precio",
      header: "Precio",
    },
    {
      accessorKey: "imagen",
      header: "Imagen",
      cell: ({ getValue }) =>
        getValue() ? (
          <a
            href={getValue()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary text-decoration-underline"
          >
            Ver Imagen
          </a>
        ) : null,
    },
    {
      id: "acciones",
      header: "Acciones",
      cell: ({ row }) => {
        const producto = row.original;
        return (
          <>
            <button
              className="btn btn-success mx-1"
              onClick={() => {
                setModalShowEditProducto(true);
                setProducto(producto);
                setIdParam(producto.id);
              }}
            >
              <i className="fa-solid fa-edit"></i>
            </button>
            <button
              onClick={() => confirmeDelete(producto.id)}
              className="btn btn-danger"
            >
              <i className="fa-solid fa-trash"></i>
            </button>
          </>
        );
      },
    },
  ];

  //TODO Faltaría un filtro seleccionador por categoria

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

                <TablaGenerica
                  data={productos}
                  columnas={columnasProductos}
                  camposBusqueda={["descripcion", "categoria"]}
                />;

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
      <EditProducto
        id={idParam}
        producto={producto}
        categorias_options={categoriasOptions}
        editar_producto={editarProducto}
        show={modalShowEditProducto}
        onHide={() => setModalShowEditProducto(false)}
      />
      <Categorias
        show={modalShowCategorias}
        onHide={() => setModalShowCategorias(false)}
      />
    </>
  );
}


export default Productos;