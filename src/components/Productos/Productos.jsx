import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { collection, updateDoc, deleteDoc, doc, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import CrearProducto from "./CrearProducto";
import EditProducto from "./EditProducto";
import Categorias from "./Parametros/Categorias";
import "../../style/Main.css"
import Swal from "sweetalert2";
import TablaGenerica from "../../Utils/TablaGenerica";
import { publicarMenu, marcarMenuPendiente, limpiarMenuPendiente, hayMenuPendiente } from "../../Utils/menuPublico";
import { avisarSinConexion } from "../../Utils/avisos";
import { CATEGORIAS_HAMBURGUESA } from "../../Utils/Constantes";

const Productos = () => {
  const [productos, setProductos] = useState([]);
  const [modalShowProducto, setModalShowProducto] = useState(false);
  const [modalShowEditProducto, setModalShowEditProducto] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState([]);
  // Las categorias crudas viven aca y el modal Categorias las recibe por props:
  // antes el modal las releia entero al montar (dos lecturas de la coleccion por
  // visita).
  const [categorias, setCategorias] = useState([]);
  const [modalShowCategorias, setModalShowCategorias] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [publicando, setPublicando] = useState(false);
  // "Hay cambios sin publicar": la bandera persiste en localStorage, asi que
  // sobrevive a salir de la pantalla. Ver marcarPendiente.
  const [menuPendiente, setMenuPendiente] = useState(hayMenuPendiente);

  // Todos los productos, ocultos incluidos (la Caja escucha solo los visibles). Sin
  // orderBy: la lista se ordena abajo con localeCompare, que respeta los acentos.
  const productosCollection = useRef(collection(db, "productos"));
  // La MISMA consulta que useTraerDatos: en una PC que abre Caja y Productos, las
  // dos pantallas comparten la caché de categorías.
  const categoriasCollection = useRef(query(collection(db, "categorias"), orderBy("nroOrden", "asc")));

  const categoriasOptions = useMemo(() => categorias.map((categoria) => (
    <option key={categoria.id} value={categoria.nombre}>{categoria.nombre}</option>
  )), [categorias]);

  // Cualquier edicion del catalogo —producto o categoria— deja el menu publico
  // desactualizado hasta que se vuelva a publicar. El boton parpadea mientras tanto.
  const marcarPendiente = useCallback(() => {
    marcarMenuPendiente();
    setMenuPendiente(true);
  }, []);


  // Productos y categorías por listener, igual que el catálogo de la Caja: con
  // getDocs cada visita releía las dos colecciones enteras. Con la caché persistente,
  // al volver a entrar Firestore manda solo lo que cambió (si no pasaron más de 30
  // minutos). Y la tabla no se toca a mano: cada alta, edición o borrado aparece al
  // instante por el listener, y si la escritura falla, el listener la vuelve atrás.
  useEffect(() => {
    const parseDocs = (snapshot) => snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    // El loader se apaga cuando llegaron las dos. Un error también cuenta como
    // listo: si no, la pantalla queda girando para siempre sin explicación.
    const listos = { productos: false, categorias: false };
    const marcarListo = (clave) => {
      listos[clave] = true;
      if (listos.productos && listos.categorias) setIsLoading(false);
    };

    const alFallar = (clave) => (error) => {
      console.error(`Error escuchando ${clave} en Productos:`, error);
      avisarSinConexion(`el catálogo (${clave})`);
      marcarListo(clave);
    };

    const unsubProductos = onSnapshot(productosCollection.current, (snap) => {
      setProductos(parseDocs(snap).sort((a, b) => a.descripcion.localeCompare(b.descripcion)));
      marcarListo("productos");
    }, alFallar("productos"));

    const unsubCategorias = onSnapshot(categoriasCollection.current, (snap) => {
      setCategorias(parseDocs(snap));
      marcarListo("categorias");
    }, alFallar("categorias"));

    return () => {
      unsubProductos();
      unsubCategorias();
    };
  }, []);



  const toggleVisibilidad = (id, visible) => {
    Swal.fire({
      title: visible ? '¿Quiere desactivar el producto?' : '¿Quiere activar el producto?',
      text: visible ? '(Esto ocultará el producto)' : '(Esto volverá a mostrar el producto en el menú)',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#198754',
      confirmButtonText: 'Si',
      cancelButtonText: 'No'
    }).then(async (result) => {
      if (!result.isConfirmed) return;
      // El éxito salía sin esperar la escritura: decía "Producto Desactivado"
      // aunque Firestore hubiera fallado, y la tarjeta cambiaba igual.
      try {
        await actualizarVisibilidad(id, !visible);
        Swal.fire({
          title: 'Éxito!',
          text: visible ? 'Producto Desactivado.' : 'Producto Activado.',
          icon: 'success',
          confirmButtonColor: '#198754'
        });
      } catch (error) {
        console.error('Error cambiando la visibilidad:', error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudo cambiar la visibilidad del producto.',
          icon: 'error',
          confirmButtonColor: '#dc3545'
        });
      }
    })
  }

  const actualizarVisibilidad = async (id, nuevoEstado) => {
    const productoDoc = doc(db, 'productos', id);
    await updateDoc(productoDoc, { visible: nuevoEstado });
    marcarPendiente();
  };

  const confirmeDelete = async (id) => {
    const result = await Swal.fire({
      title: '¿Esta seguro?',
      text: "No podra revertir la accion",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#198754',
      confirmButtonText: 'Si',
      cancelButtonText: 'No'
    });

    if (!result.isConfirmed) return;

    // El Swal de éxito salía sin esperar el borrado y sin catch: decía "¡Borrado!"
    // aunque hubiera fallado.
    try {
      await deleteDoc(doc(db, "productos", id));
      marcarPendiente();
      Swal.fire({
        title: '¡Borrado!',
        text: 'Producto eliminado.',
        icon: 'success',
        confirmButtonColor: '#198754'
      });
    } catch (error) {
      console.error('Error eliminando producto:', error);
      Swal.fire({
        title: 'Error',
        text: 'No se pudo eliminar el producto.',
        icon: 'error',
        confirmButtonColor: '#dc3545'
      });
    }
  }

  const handlePublicarMenu = async () => {
    setPublicando(true);
    try {
      await publicarMenu();
      limpiarMenuPendiente();
      setMenuPendiente(false);
      Swal.fire({
        title: '¡Éxito!',
        text: 'Menú publicado. Los clientes ya ven la última versión.',
        icon: 'success',
        confirmButtonColor: '#198754'
      });
    } catch (error) {
      console.error('Error publicando menú:', error);
      Swal.fire({
        title: 'Error',
        text: 'No se pudo publicar el menú. Intente de nuevo.',
        icon: 'error',
        confirmButtonColor: '#dc3545'
      });
    } finally {
      setPublicando(false);
    }
  };

  // Para el filtro de la tabla, SIMPLE, DOBLE y TRIPLE son una sola familia. Va en
  // un campo aparte (`filtro.categoria`) para no pisar la categoría real, que la
  // columna sigue mostrando y la edición usa. La fila no se guarda en Firestore:
  // editar arma su propio objeto.
  const filasProductos = useMemo(() => productos.map((p) => ({
    ...p,
    filtro: { categoria: CATEGORIAS_HAMBURGUESA.includes(p.categoria) ? "HAMBURGUESAS" : p.categoria },
  })), [productos]);

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
          <span className="text-body-secondary">No Img</span>
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
                <div className="d-flex justify-content-between">
                  <div
                    className="d-flex justify-content-start align-items-center">
                    <h1>Productos</h1>
                    <button
                      variant="primary"
                      className="btn-contorno m-1"
                      onClick={() => setModalShowProducto(true)}
                    >
                      + Agregar Producto
                    </button>

                    <button
                      className="btn-contorno m-1"
                      onClick={() => setModalShowCategorias(true)}
                    >
                      Categorías
                    </button>

                    <button
                      variant="secondary"
                      className={`btn-contorno m-1 ${menuPendiente ? "btn-blink" : ""}`}
                      onClick={handlePublicarMenu}
                      disabled={publicando}
                      title={menuPendiente
                        ? "Hay cambios sin publicar: los clientes todavía ven el menú anterior"
                        : "Genera el menú que ven los clientes en la web"}
                    >
                      {publicando ? "Publicando..." : "Publicar Menú"}
                    </button>
                  </div>
                </div>

                <TablaGenerica
                  data={filasProductos}
                  columnas={columnasProductos}
                  sortBy="descripcion"
                  ordenDescendente={false}
                  camposBusqueda={["descripcion", "categoria", "filtro.categoria"]}
                  camposFiltros={["filtro.categoria", "tipoExtra", "oferta", "visible"]}
                  // Rojo claro: pausado (visible false), no se vende ni en la Caja ni en la web.
                  rowClassName={(p) => (p.visible === false ? "bg-danger-subtle" : "")}
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
        onGuardado={marcarPendiente}
        onHide={() => setModalShowProducto(false)}
      />
      {productoSeleccionado && (<EditProducto
        producto={productoSeleccionado}
        categorias_options={categoriasOptions}
        onGuardado={marcarPendiente}
        show={modalShowEditProducto}
        onHide={() => setModalShowEditProducto(false)}
      />)}
      <Categorias
        show={modalShowCategorias}
        onHide={() => setModalShowCategorias(false)}
        categorias={categorias}
        onCambio={marcarPendiente}
      />
    </>
  );
}


export default Productos;