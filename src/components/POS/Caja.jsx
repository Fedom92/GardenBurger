import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { collection, addDoc, query, orderBy, getDocs, where, limit, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import { useAuth } from "../../context/AuthContext";
import { useForm } from "react-hook-form";
import Swal from "sweetalert2";
import moment from 'moment';
import 'moment/locale/es';
import '../../style/Main.css';
import PendientesMP from './PendientesMP';
import PendientesSolicitudes from './PendientesSolicitudes';
import logoMP from '../../img/mercado-pago.webp';


const Caja = () => {
    const { register, handleSubmit, reset, watch, setValue } = useForm();
    const envioRaw = watch("envio");
    const envioSeleccionado = useMemo(() => envioRaw ? JSON.parse(envioRaw) : {}, [envioRaw]);
    const metodoPago = watch("metodoPago");
    const { inicialesUsuario } = useAuth();
    const [search, setSearch] = useState("");
    const [productos, setProductos] = useState([]);
    const [carrito, setCarrito] = useState([]);
    const [envio_options, setEnvio_options] = useState([]);

    const [categorias, setCategorias] = useState([]);
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");

    const [recargo] = useState(Number(process.env.REACT_APP_recargoMP) || "");
    const [isLoading, setIsLoading] = useState(true);
    const [showModalDividido, setShowModalDividido] = useState(false);
    const [montoEfectivo, setMontoEfectivo] = useState(0);
    const [showPendientesMP, setShowPendientesMP] = useState(false);
    const [showPendientesSolicitudes, setShowPendientesSolicitudes] = useState(false);

    const getResumen = useMemo(() => {
        const subtotal = carrito.reduce((acum, producto) => acum + producto.subtotal, 0);
        const costoEnvio = envioSeleccionado?.costo_envio || 0;
        const base = subtotal + costoEnvio;

        // Recargo segun metodo de pago
        const recargoCalculado = (() => {
            if (metodoPago === "MP") return base * (recargo / 100);
            if (metodoPago === "%") return (base - montoEfectivo) * (recargo / 100);
            return 0;
          })();

        // Total final
        const total = base + recargoCalculado;
        const restoMP = base - montoEfectivo;
        const montoMPConRecargo = restoMP + recargoCalculado;

        return {
            subtotal,
            costoEnvio,
            totalBase: base,
            recargo: recargoCalculado,
            total,
            restoMP,
            montoMPConRecargo
          };
    }, [carrito, envioSeleccionado, metodoPago, recargo, montoEfectivo]);

    const { totalBase, total: totalFinal, montoMPConRecargo } = getResumen;

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
        const enviosObj = snapshot.docs.map((doc) => ({id: doc.id, ...doc.data() }));

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

    // Función para buscar cliente por teléfono
    const buscarClientePorTelefono = useCallback(async (telefono) => {
        if (!telefono || telefono.length < 10) return null;
        
        try {
            const clientesCollection = collection(db, "clientes");
            const q = query(clientesCollection, where("telefono", "==", telefono), limit(1));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const clienteDoc = querySnapshot.docs[0];
                return { id: clienteDoc.id, ...clienteDoc.data() };
            }
            return null;
        } catch (error) {
            console.error('Error buscando cliente:', error);
            return null;
        }
    }, []);

    // Autocompletar datos del cliente al escribir teléfono
    const telefonoIngresado = watch("telefono");
    useEffect(() => {
        const autocompletarCliente = async () => {
            if (!telefonoIngresado || telefonoIngresado.length < 10) return;
            
            const cliente = await buscarClientePorTelefono(telefonoIngresado);
            
            if (cliente) {
                setValue("nombre", cliente.nombre || "");
                setValue("direccion", cliente.direccion || "");
                setValue("entreCalles", cliente.entreCalles || "");
            } else {
                // Limpiar campos si no se encuentra el cliente
                setValue("nombre", "");
                setValue("direccion", "");
                setValue("entreCalles", "");
            }
        };

        autocompletarCliente();
    }, [telefonoIngresado, buscarClientePorTelefono, setValue]);

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

    const guardarBD = async (data) => {
        moment.locale('es')
        
        // Validar datos usando la función modularizada
        if (!validarDatos(data)) {
            return;
        }

        // Crear timestamp en GMT-3 (Argentina)
        const ahora = moment();
        const fecha = ahora.format("DD/MM/YYYY");
        const hora = ahora.format("HH:mm");

        try {
            const q = query(pedidosCollection, orderBy("codigo", "desc"), limit(1));
            const querySnapshot = await getDocs(q);

            let nuevoCodigo = 1;
            if (!querySnapshot.empty) {
                const codigoExistente = querySnapshot.docs[0].data().codigo;

                // Extraer solo la parte numérica del código existente
                const match = codigoExistente.match(/^(\d+)/);
                if (match) {
                    const numeroAnterior = parseInt(match[1], 10);
                    if (!isNaN(numeroAnterior)) {
                        nuevoCodigo = numeroAnterior + 1;
                    }
                }
            }

            const nuevoPedido = {
                codigo: `${nuevoCodigo} - ${inicialesUsuario}`,
                nombre: data.nombre,
                direccion: data.direccion,
                entreCalles: data.entreCalles || "",
                telefono: data.telefono,
                observaciones: data.observaciones || "",
                envio: envioSeleccionado,
                metodoPago: data.metodoPago,
                pagaCon: data.pagaCon || 0,
                montoEfectivo: data.metodoPago === "%" ? Number(montoEfectivo.toFixed(2)) : 0,
                total: Number(totalFinal.toFixed(2)),
                carrito: carrito,
                estado: data.metodoPago === "MP" || data.metodoPago === "%" ? "PENDIENTEMP" : "PENDIENTE",
                fecha: fecha,
                hora: hora,
                timestamp: serverTimestamp()
            };

            await addDoc(pedidosCollection, nuevoPedido);

            // Verificar si el cliente existe antes de guardarlo
            const clienteExistente = await buscarClientePorTelefono(data.telefono);
            if (!clienteExistente) {
                const clientesCollection = collection(db, "clientes");
                await addDoc(clientesCollection, {
                    nombre: data.nombre || "",
                    direccion: data.direccion || "",
                    entreCalles: data.entreCalles || "",
                    telefono: data.telefono,
                    latitud: "",
                    longitud: "",
                });
            }
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

    const handleMetodoPagoChange = (e) => {
        const nuevoMetodo = e.target.value;
        setValue("metodoPago", nuevoMetodo);
        
        if (nuevoMetodo === "%") {
            setShowModalDividido(true);
        } else {
            setMontoEfectivo(0);
        }
    };

    const handleConfirmarDividido = () => {
        if (montoEfectivo <= 0) {
            Swal.fire({
                title: 'Advertencia',
                text: 'El monto en efectivo debe ser mayor a 0',
                icon: 'warning',
                confirmButtonColor: '#ffc107',
            });
            return;
        }

        if (montoEfectivo >= totalBase) {
            Swal.fire({
                title: 'Advertencia',
                text: 'El monto en efectivo no puede ser mayor o igual al total base',
                icon: 'warning',
                confirmButtonColor: '#ffc107',
            });
            return;
        }

        setShowModalDividido(false);
    };

    // Función para validar los datos antes de guardar
    const validarDatos = (data) => {
        // Validar dirección
        if (!data.direccion || data.direccion.trim() === '') {
            Swal.fire({
                title: 'Advertencia',
                text: 'No está la dirección del cliente',
                icon: 'warning',
                confirmButtonColor: '#ffc107',
            });
            return false;
        }

        // Validar teléfono
        if (!data.telefono.startsWith('11')) {
            Swal.fire({
                title: 'Advertencia',
                text: 'El teléfono debe comenzar con 11',
                icon: 'warning',
                confirmButtonColor: '#ffc107',
            });
            return false;
        }

        // Validar carrito
        if (carrito.length === 0) {
            Swal.fire({
                title: 'Advertencia',
                text: 'No hay productos en el carrito',
                icon: 'warning',
                confirmButtonColor: '#ffc107',
            });
            return false;
        }

        // Validar envío
        if (!data.envio) {
            Swal.fire({
                title: 'Advertencia',
                text: 'No hay envío seleccionado',
                icon: 'warning',
                confirmButtonColor: '#ffc107',
            });
            return false;
        }

        // Validar método de pago
        if (!data.metodoPago) {
            Swal.fire({
                title: 'Advertencia',
                text: 'No hay método de pago seleccionado',
                icon: 'warning',
                confirmButtonColor: '#ffc107',
            });
            return false;
        }

        // Validar "Paga Con" para método efectivo
        if (data.metodoPago === "EFECTIVO") {
            if (!data.pagaCon || data.pagaCon < totalFinal) {
                Swal.fire({
                    title: 'Advertencia',
                    text: `El monto "Paga Con" debe ser igual o mayor al total ($${totalFinal.toFixed(2)})`,
                    icon: 'warning',
                    confirmButtonColor: '#ffc107',
                });
                return false;
            }
        }

        return true;
    };

    const limpiar = () => {
        reset();
        setCarrito([]);
        setMontoEfectivo(0);
    };

    // Función para manejar la aprobación de solicitudes
    const handleAprobarSolicitud = (solicitud) => {
        try {
            // Llenar los campos del formulario con los datos de la solicitud
            setValue("nombre", solicitud.cliente?.nombre || "");
            setValue("telefono", solicitud.cliente?.telefono || "");
            setValue("direccion", solicitud.cliente?.direccion || "");
            setValue("metodoPago", solicitud.cliente?.metodoPago || "");
            setValue("observaciones", `Solicitud ${solicitud.cliente?.opcion || " "}`);

            // Agregar productos al carrito
            if (solicitud.productos && solicitud.productos.length > 0) {
                setCarrito(solicitud.productos.map(producto => ({
                    ...producto,
                    subtotal: producto.amountInCart * producto.precio
                })));
            }

            // Cerrar el modal
            setShowPendientesSolicitudes(false);

            Swal.fire({
                title: '¡Datos cargados!',
                text: 'Los datos de la solicitud han sido cargados en el formulario',
                icon: 'success',
                confirmButtonColor: '#198754',
            });
        } catch (error) {
            console.error('Error cargando datos de solicitud:', error);
            Swal.fire({
                title: 'Error',
                text: 'Error al cargar los datos de la solicitud',
                icon: 'error',
                confirmButtonColor: '#dc3545',
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
                            <button
                                className="btn btn-info mx-2 btn-sm text-white fw-bold mb-1"
                                onClick={() => setShowPendientesMP(true)}
                            >
                                <img src={logoMP} alt="MP" className="img-fluid" style={{height:"3vh"}}></img> Pendientes MP
                            </button>
                            <button
                                className="btn btn-warning mx-2 text-white fw-bold mb-1"
                                onClick={() => setShowPendientesSolicitudes(true)}
                            >
                                <i className="fa fa-list-check"></i> Ver Solicitudes
                            </button>
                        </div>

                        <main className="container-fluid">
                            <div className="row">
                                <section className="col-4 p-0" id="ticket">
                                    <div className="card mb-1" id="datos_clientes">
                                        <input type="text" className="form-control fs-6 p-1 mb-1 none" placeholder="Nombre..." autoComplete="off" required {...register("nombre")} />
                                        <input type="text" className="form-control fw-bold fs-6 p-1 mb-1" placeholder="Dirección..." autoComplete="off" required {...register("direccion")} />
                                        <input type="text" className="form-control fs-6 p-1 mb-1" placeholder="Entre Calles..." autoComplete="off" required {...register("entreCalles")} />
                                        <input type="text" maxLength={10} onInput={(e) => {
                                            e.target.value = e.target.value.replace(/\D/g, '');
                                        }} className="form-control fs-6 p-1 mb-1" placeholder="Teléfono (sin 0 y sin 15)..." autoComplete="off" required {...register("telefono")} />
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
                                                <select className="form-control border-0 p-0 px-1 m-0" multiple={false} required {...register("metodoPago")} onChange={handleMetodoPagoChange}>
                                                    <option value="">....</option>
                                                    <option value="EFECTIVO">Efectivo</option>
                                                    <option value="MP">MP</option>
                                                    <option value="%">Dividido</option>
                                                </select>
                                            </div>
                                            <div className="col-2"></div>
                                        </div>

                                        {metodoPago === "EFECTIVO" && (
                                            <div className="row p-0 m-auto">
                                                <div className="col-3"></div>
                                                <div className="col-4 d-flex align-items-center justify-content-end text-end">
                                                    <label className="form-label mb-0">Paga Con:</label>
                                                </div>
                                                <div className="col-5 d-flex align-items-center">
                                                    <span className="p-0">$</span>
                                                    <input
                                                        type="number"
                                                        className="form-control border-0 bg-transparent"
                                                        autoComplete="off"
                                                        min={0}
                                                        placeholder="0"
                                                        {...register("pagaCon", { valueAsNumber: true })}
                                                    />
                                                </div>
                                                <div className="col-2"></div>
                                            </div>
                                        )}

                                        {metodoPago === "%" && (
                                            <div className="row p-0 m-auto">
                                                <div className="col-3"></div>
                                                <div className="col-4 d-flex align-items-center justify-content-end text-end">
                                                    <label className="form-label mb-0">Efectivo:</label>
                                                </div>
                                                <div className="col-5 d-flex align-items-center">
                                                    <span className="p-0">$</span>
                                                    <input
                                                        type="number"
                                                        className="form-control border-0 bg-transparent"
                                                        autoComplete="off"
                                                        min={0}
                                                        disabled
                                                        value={montoEfectivo.toFixed(2)}
                                                    />
                                                </div>
                                                <div className="col-2"></div>
                                            </div>
                                        )}

                                        {metodoPago === "%" && (
                                            <div className="row p-0 m-auto">
                                                <div className="col-3"></div>
                                                <div className="col-4 d-flex align-items-center justify-content-end text-end">
                                                    <label className="form-label mb-0">MP:</label>
                                                </div>
                                                <div className="col-5 d-flex align-items-center">
                                                    <span className="p-0">$</span>
                                                    <input
                                                        type="number"
                                                        className="form-control border-0 bg-transparent"
                                                        autoComplete="off"
                                                        step={1000}
                                                        min={0}
                                                        disabled
                                                        value={montoMPConRecargo.toFixed(2)}
                                                    />
                                                </div>
                                                <div className="col-2"></div>
                                            </div>
                                        )}

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

            {/* Modal para método de pago dividido */}
            {showModalDividido && (
                <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Pago Dividido</h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => {
                                        setShowModalDividido(false);
                                        setValue("metodoPago", "");
                                        setMontoEfectivo(0);
                                    }}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <div className="mb-3">
                                    <label className="form-label">Monto en efectivo:</label>
                                    <div className="input-group">
                                        <span className="input-group-text">$</span>
                                        <input
                                            type="number"
                                            className="form-control"
                                            value={montoEfectivo}
                                            onChange={(e) => setMontoEfectivo(Number(e.target.value))}
                                            min="0"
                                            step="1000"
                                            placeholder="Ingrese el monto en efectivo"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setShowModalDividido(false);
                                        setValue("metodoPago", "");
                                        setMontoEfectivo(0);
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleConfirmarDividido}
                                >
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Pendientes MP */}
            <PendientesMP 
                isOpen={showPendientesMP} 
                onClose={() => setShowPendientesMP(false)} 
            />

            {/* Modal de Pendientes Solicitudes */}
            <PendientesSolicitudes 
                isOpen={showPendientesSolicitudes} 
                onClose={() => setShowPendientesSolicitudes(false)}
                onAprobarSolicitud={handleAprobarSolicitud}
            />
        </>
    );
}
export default Caja;