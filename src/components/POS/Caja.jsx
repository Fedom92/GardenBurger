import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { collection, addDoc, updateDoc, doc, query, orderBy, getDocs, where, limit } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import CryptoJS from 'crypto-js';
import { useForm } from "react-hook-form";
import Swal from "sweetalert2";
import moment from 'moment';
import '../../style/Main.css';

/* 
PEDIDOS CON MP NO PASAN A COCINA HASTA QUE APRUEBA/CANCELA CAJERO
AGREGAR POSIBILIDAD PARA MODIFICARLO

AGREGAR CAMPO GERMAN "PAGA CON" QUE SEA NUMERICO

*/

const Caja = () => {
    const { register, handleSubmit, reset, watch } = useForm();
    const envioRaw = watch("envio");
    const envioSeleccionado = useMemo(() => envioRaw ? JSON.parse(envioRaw) : {}, [envioRaw]);
    const metodoPago = watch("metodoPago");

    const [rol, setRol] = useState("");
    const [search, setSearch] = useState("");
    const [productos, setProductos] = useState([]);
    const [carrito, setCarrito] = useState([]);
    const [envio_options, setEnvio_options] = useState([]);

    const [categorias, setCategorias] = useState([]);
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");

    const [mostrarAjustes, setMostrarAjustes] = useState(false);
    const [recargo] = useState(Number(process.env.REACT_APP_recargoMP) || "");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const totalFinal = useMemo(() => {
        const subtotalCarrito = carrito.reduce((sum, producto) => sum + (producto.precio * producto.cantidad), 0);

        const costoEnvio = envioSeleccionado?.costo_envio || 0;
        const totalBase = subtotalCarrito + costoEnvio;

        const recargoMP = metodoPago === "MP" ? totalBase * (recargo / 100) : 0;

        return totalBase + recargoMP;
    }, [carrito, envioSeleccionado, metodoPago, recargo]);

    const productosCollectiona = collection(db, "productos");
    const productosCollection = useRef(query(productosCollectiona, where("visible", "==", true)));

    const categoriasCollectiona = collection(db, "categorias");
    const categoriasCollection = useRef(query(categoriasCollectiona, orderBy("nroOrden", "asc")));

    const enviosCollectiona = collection(db, "envios");
    const enviosCollection = useRef(query(enviosCollectiona, orderBy("zona_envio", "asc")));

    const pedidosCollection = collection(db, "pedidos");

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
        categoriasArray.push({ id: "todas", nombre: "" });
        setCategorias(categoriasArray);

    }, []);

    const getEnvios = useCallback((snapshot) => {
        const enviosObj = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        const opciones = enviosObj.map((envio) => (
            <option key={envio.id}
                value={JSON.stringify({ zona_envio: envio.zona_envio, costo_envio: envio.costo_envio })}>
                {envio.zona_envio}
            </option>
        ));

        setEnvio_options(opciones);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const productosSnapshot = await getDocs(productosCollection.current);
                await getProductos(productosSnapshot);

                const categoriasSnapshot = await getDocs(categoriasCollection.current);
                await getCategorias(categoriasSnapshot);

                const enviosSnapshot = await getDocs(enviosCollection.current);
                await getEnvios(enviosSnapshot);
            } catch (error) {
                console.error('Error fetching data Caja:', error);
            }
        };

        fetchData();

    }, [getProductos, getCategorias, getEnvios]);

    useEffect(() => {
        const rolEncriptado = localStorage.getItem("rol");
        let bytesDesencriptado = CryptoJS.AES.decrypt(rolEncriptado, process.env.REACT_APP_cryptoKey);
        let rolDesencriptado = bytesDesencriptado.toString(CryptoJS.enc.Utf8);
        setRol(rolDesencriptado);

    }, []);

    const handleAgregarAlCarrito = (producto) => {
        setCarrito((prevCarrito) => {
            const productoExistente = prevCarrito.find((item) => item.id === producto.id);

            if (productoExistente) {
                // Si ya existe, aumenta la cantidad y actualiza el subtotal
                return prevCarrito.map((item) =>
                    item.id === producto.id
                        ? {
                            ...item,
                            cantidad: item.cantidad + 1,
                            subtotal: (item.cantidad + 1) * item.precio
                        }
                        : item
                );
            } else {
                // Si no existe, lo agrega con cantidad 1 y subtotal inicial
                return [...prevCarrito, {
                    ...producto,
                    cantidad: 1,
                    subtotal: producto.precio // 1 * precio
                }];
            }
        });
    };

    const handleEliminarDelCarrito = (id) => {
        setCarrito((prev) => {
            return prev
                .map((item) =>
                    item.id === id
                        ? {
                            ...item,
                            cantidad: item.cantidad - 1,
                            subtotal: (item.cantidad - 1) * item.precio
                        }
                        : item
                )
                .filter((item) => item.cantidad > 0);
        });
    };

    //TODO FALTAN VALIDACIONES SI NO HAY PRODUCTOS
    //SI NO HAY ENVIO, SI NO HAY METODO DE PAGO
    //SI NO HAY DATOS CLIENTES
    const guardarBD = async (data) => {
        const ahora = moment();
        const fecha = ahora.format("DD/MM/YYYY");
        const hora = ahora.format("HH:mm");

        console.log(data.observaciones)

        try {
            const q = query(pedidosCollection, orderBy("codigo", "desc"), limit(1));
            const querySnapshot = await getDocs(q);

            let nuevoCodigo = 1;
            if (!querySnapshot.empty) {
                const maxCodigo = querySnapshot.docs[0].data().codigo.split(" ")[0];
                nuevoCodigo = Number(maxCodigo) + 1;
            }

            const nuevoPedido = {
                codigo: nuevoCodigo + "TODO - INICIALEs",
                nombre: data.nombre,
                direccion: data.direccion,
                entreCalles: data.entrecalles || "",
                telefono: data.telefono,
                observaciones: data.observaciones || "",
                envio: envioSeleccionado,
                metodoPago: data.metodoPago,
                montoDividido: "TODO",
                total: Number(totalFinal.toFixed(2)),
                carrito: carrito,
                estado: "PENDIENTE",
                fecha: fecha,
                hora: hora,
                timestamp: ahora.toISOString()
            };

            await addDoc(pedidosCollection, nuevoPedido);
            Swal.fire({
                title: '¡Éxito!',
                text: 'Pedido agregado!.',
                icon: 'success',
                confirmButtonColor: '#198754',
            }).then(() => {
                limpiar();
            });
        } catch (error) {
            console.error("Error al agregar pedido: ", error);
            Swal.fire({
                title: '¡Error!',
                text: 'Error al Agregar Pedido. Verifica internet, recarga e intente de nuevo.',
                icon: 'error',
                confirmButtonColor: '#dc3545',
            });
        }
    };

    const limpiar = () => {
        reset();
        setCarrito([])
        setError("");
    };

    return (
        <>
            {isLoading ? (
                <div className="w-100">
                    <span className="loader position-absolute start-50 top-50 mt-3"></span>
                </div>
            ) : (
                <div className="w-100" id="caja">
                    <div className="search-bar d-flex col-3 m-2">
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            type="text"
                            placeholder="Buscar Producto..."
                        />
                        <i className="fa-solid fa-magnifying-glass"></i>
                    </div>

                    <div className="container mw-100 p-1 mt-4">
                        <br></br>
                        <div
                            className="d-flex justify-content-start align-items-center">
                            <h3>Sistema Caja</h3>
                            {rol === process.env.REACT_APP_admin ? (
                                <button
                                    className="btn mx-2 btn-md"
                                    onClick={() => setMostrarAjustes(prev => !prev)}
                                >
                                    <i className="fa-solid fa-gear"></i>
                                </button>
                            ) : null}
                        </div>

                        <main className="container-fluid">
                            <div className="row">
                                <section className="col-4 p-0" id="ticket">
                                    <div className="card mb-1" id="datos_clientes">
                                        <input type="text" className="form-control fs-6 p-1 mb-1 none" placeholder="Nombre..." autoComplete="off" required {...register("nombre")} />
                                        <input type="text" className="form-control fw-bold fs-6 p-1 mb-1" placeholder="Dirección..." autoComplete="off" required {...register("direccion")} />
                                        <input type="text" className="form-control fs-6 p-1 mb-1" placeholder="Entre Calles..." autoComplete="off" required {...register("entrecalles")} />
                                        <input type="text" className="form-control fs-6 p-1 mb-1" placeholder="Teléfono..." autoComplete="off" required {...register("telefono")} />
                                        <textarea className="form-control" rows="2" placeholder="Observaciones..." autoComplete="off" {...register("observaciones")}></textarea>
                                    </div>

                                    <hr style={{ margin: "0.5rem 0" }}></hr>

                                    <div className="card mt-2 mb-2" id="tabla_productos">
                                        <table className="table-hover shopping-cart-wrap">
                                            <thead>
                                                <tr>
                                                    <th className="col">N°</th>
                                                    <th className="col text-start">Item</th>
                                                    <th className="col">Subtotal</th>
                                                    <th className="col"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {carrito.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="4" className="text-center text-muted">
                                                            No hay productos
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    carrito.map((producto, index) => (
                                                        <tr key={producto.id}>
                                                            <td className="text-center">{producto.cantidad}</td>
                                                            <td className="text-start">
                                                                <p className="title text-truncate mb-0">{producto.descripcion}</p>
                                                            </td>
                                                            <td className="text-center">
                                                                <div className="price-wrap">
                                                                    <var className="price">${producto.subtotal}</var>
                                                                </div>
                                                            </td>
                                                            <td className="text-center">
                                                                <button
                                                                    className="btn text-danger p-0"
                                                                    onClick={() => handleEliminarDelCarrito(producto.id)}
                                                                >
                                                                    <i className="fa fa-circle-xmark fs-4"></i>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    <hr style={{ margin: "0.5rem 0" }}></hr>

                                    <div id="datos_pago">
                                        <div className="row p-0 m-auto">
                                            <div className="col-3"></div>
                                            <div className="col-4 d-flex align-items-center text-end">
                                                <label className="form-label mb-0">Envío</label>

                                                <select className="form-control border-0 text-center" multiple={false} required {...register("envio")}>
                                                    <option value="">....</option>
                                                    {envio_options}
                                                </select>
                                                :
                                            </div>
                                            <div className="col-3 d-flex align-items-center">
                                                <span className="p-0">$</span>
                                                <input type="number" className="form-control border-0 bg-transparent" autoComplete="off" disabled value={envioSeleccionado?.costo_envio || 0}
                                                />
                                            </div>
                                            <div className="col-1"></div>
                                        </div>

                                        <div className="row p-0 m-auto">
                                            <div className="col-3 p-0">
                                                {metodoPago === "MP" && (<span className="p-0 m-0">Recargo {recargo}%</span>)}
                                            </div>
                                            <div className="col-4 text-end">
                                                <label className="form-label mb-0">Metodo Pago:</label>
                                            </div>
                                            <div className="col-3">
                                                <select className="form-control border-0 p-0 px-1 m-0" multiple={false} required {...register("metodoPago")}>
                                                    <option value="">....</option>
                                                    <option value="EFECTIVO">Efectivo</option>
                                                    <option value="MP">MP</option>
                                                    <option value="%">Dividido</option>
                                                </select>
                                            </div>
                                            <div className="col-2"></div>
                                        </div>

                                        <div className="row p-0 m-auto d-flex align-items-center">
                                            <div className="col-2"></div>
                                            <div className="col-5 text-end">
                                                <label className="form-label fw-bold mb-0">Total:</label>
                                            </div>
                                            <div className="col-5 d-flex align-items-center">
                                                <span className="p-0">$</span>
                                                <input type="number" className="form-control border-0 bg-transparent" autoComplete="off" min={0} disabled value={totalFinal.toFixed(2) || 0} />
                                            </div>
                                        </div>

                                        <div className="row" id="acciones">
                                            <div className="d-flex justify-content-center align-items-center gap-2">
                                                <button
                                                    className="btn btn-danger"
                                                    type="reset"
                                                    onClick={() => { limpiar() }}
                                                >
                                                    Limpiar <i className="fas fa-trash-alt"></i>
                                                </button>
                                                <button
                                                    className="btn btn-success"
                                                    type="submit"
                                                    onClick={() => handleSubmit(guardarBD)()}>
                                                    Crear Pedido <i className="fas fa-burger"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <section className="col-8 card" id="productos">
                                    <ul className="nav nav-pills nav-fill p-0 d-flex overflow-auto" role="tablist" style={{ whiteSpace: "nowrap", gap: "2px" }}>
                                        {categorias.map((categoria) => (
                                            <li className="nav-item" key={categoria.id}>
                                                <button
                                                    className={`d-flex justify-content-center align-items-center nav-link text-black lex-shrink-0 gap-1 p-1 ${categoriaSeleccionada === categoria.nombre ? "active" : ""}`}
                                                    onClick={() => setCategoriaSeleccionada(categoria.nombre)}
                                                >
                                                    <i className="fa fa-tags" ></i> {categoria.nombre}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>

                                    <div className="row">
                                        {productos
                                            .filter((p) =>
                                                search
                                                    ? p.descripcion?.toLowerCase().includes(search.toLowerCase())
                                                    : true
                                            )
                                            .filter(
                                                (p) => categoriaSeleccionada === "" || p.categoria === categoriaSeleccionada
                                            )
                                            .map((producto) => (
                                                <div className="col-2 p-0" key={producto.id}>
                                                    <button
                                                        onClick={() => handleAgregarAlCarrito(producto)}
                                                        className="card card-product h-100 d-flex flex-column justify-content-between"
                                                    >
                                                        <div className="img-wrap flex-grow-1 d-flex align-items-center justify-content-center">
                                                            <img
                                                                src={producto.imagen}
                                                                alt={producto.descripcion}
                                                                className="img-fluid w-75"
                                                            />
                                                        </div>
                                                        <figcaption className="info-wrap">
                                                            <p className="d-flex justify-content-center title lh-1 m-auto" style={{ fontSize: "0.8rem", minHeight: "1.5rem" }}>
                                                                {producto.descripcion}
                                                            </p>
                                                            <div className="action-wrap">
                                                                <div className="price-wrap h6 p-1 m-0">
                                                                    <span className="price-new">${producto.precio}</span>
                                                                </div>
                                                            </div>
                                                        </figcaption>
                                                    </button>
                                                </div>
                                            ))}
                                    </div>
                                </section>
                            </div >
                        </main >
                    </div >
                </div >
            )}
        </>
    );
}
export default Caja;