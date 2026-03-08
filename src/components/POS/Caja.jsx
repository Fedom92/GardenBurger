import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { collection, addDoc, query, orderBy, getDocs, where, limit, serverTimestamp, onSnapshot } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import { useAuth } from "../../context/AuthContext";
import { useForm } from "react-hook-form";
import { Modal } from "react-bootstrap";
import Swal from "sweetalert2";
import moment from 'moment';
import '../../style/Main.css';
import PendientesMP from './Entrantes/PendientesMP';
import PendientesSolicitudes from './Entrantes/PendientesSolicitudes';
import EliminarTickets from './EliminarTickets';
import BuscarSolicitud from './BuscarSolicitud';
import AutocompleteGoogle from '../../Utils/AutocompleteGoogle';
import logoMP from '../../img/mercado-pago.webp';
import { CATEGORIAS_HAMBURGUESA } from "../../Utils/Constantes";

const Caja = () => {
    const { register, handleSubmit, reset, watch, setValue, resetField } = useForm({
        defaultValues: { direccion: "", latitud: "", longitud: "" }
    });
    const envioRaw = watch("envio");
    const envioSeleccionado = useMemo(() => envioRaw ? JSON.parse(envioRaw) : {}, [envioRaw]);
    const metodoPago = watch("metodoPago");
    const telefono = watch("telefono");
    console.log(telefono)
    const { userData } = useAuth();
    const [search, setSearch] = useState("");
    const [productos, setProductos] = useState([]);
    const [carrito, setCarrito] = useState([]);
    const [envios, setEnvios] = useState([]);

    const [categorias, setCategorias] = useState([]);
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");

    const [recargo] = useState(Number(process.env.REACT_APP_recargoMP) || "");
    const [isLoading, setIsLoading] = useState(true);
    const [procesando, setProcesando] = useState(false);
    const [montoEfectivo, setMontoEfectivo] = useState(0);

    const [showPendientesMP, setShowPendientesMP] = useState(false);
    const [showPendientesSolicitudes, setShowPendientesSolicitudes] = useState(false);
    const [showModalDividido, setShowModalDividido] = useState(false);
    const [showEliminarTickets, setShowEliminarTickets] = useState(false);
    const [showBuscarSolicitud, setShowBuscarSolicitud] = useState(false);
    const [showHorarioEspecial, setShowHorarioEspecial] = useState(false);
    const horarioEspecial = watch("horarioEspecial");

    const [tieneSolicitudesPendientes, setTieneSolicitudesPendientes] = useState(false);
    const [tienePendientesMP, setTienePendientesMP] = useState(false);

    const ahora = moment();
    const fecha = ahora.format("DD/MM/YYYY");
    const hora = ahora.format("HH:mm");

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

    useEffect(() => {
        let isMounted = true;

        const parseDocs = (snapshot) =>
            snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        const fetchData = async () => {
            try {
                const [prodSnap, catSnap, envSnap] = await Promise.all([
                    getDocs(productosCollection.current),
                    getDocs(categoriasCollection.current),
                    getDocs(enviosCollection.current)
                ]);

                if (!isMounted) return;

                // Productos
                const productos = parseDocs(prodSnap).sort((a, b) =>
                    a.descripcion.localeCompare(b.descripcion)
                );
                setProductos(productos);

                // Categorías
                const categorias = [...parseDocs(catSnap), { id: "todas", nombre: "" }];
                setCategorias(categorias);

                // Envíos
                const envios = parseDocs(envSnap);
                setEnvios(envios);

                setIsLoading(false);

            } catch (error) {
                console.error("Error fetching data Caja:", error);
                if (isMounted) setIsLoading(false);
            }
        };

        fetchData();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        const unsubSolicitudes = onSnapshot(
            query(collection(db, "solicitudes"), where("estado", "==", "PENDIENTE"), limit(1)),
            (snap) => setTieneSolicitudesPendientes(!snap.empty),
            (err) => console.error("Error solicitudes:", err)
        );

        const unsubPedidos = onSnapshot(
            query(collection(db, "pedidos"), where("estado", "==", "PENDIENTEMP"), limit(1)),
            (snap) => setTienePendientesMP(!snap.empty),
            (err) => console.error("Error Pendientes MP:", err)
        );

        return () => {
            unsubSolicitudes();
            unsubPedidos();
        };
    }, []);

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
                setValue("latitud", cliente.latitud || "");
                setValue("longitud", cliente.longitud || "");
                setValue("entreCalles", cliente.entreCalles || "");
            } else {
                // Limpiar campos si no se encuentra el cliente
                setValue("nombre", "");
                setValue("direccion", "");
                setValue("latitud", "");
                setValue("longitud", "");
                setValue("entreCalles", "");
            }
        };

        autocompletarCliente();
    }, [telefonoIngresado, buscarClientePorTelefono, setValue]);

    const handleAgregarAlCarrito = (producto) => {
        // Validación para extras de tipo HAMBURGUESA
        if (producto.categoria === "EXTRA" && producto.tipoExtra === "HAMBURGUESA") {
            const ultimoProducto = carrito[carrito.length - 1];

            const esValido = ultimoProducto && (
                CATEGORIAS_HAMBURGUESA.includes(ultimoProducto.categoria) ||
                (ultimoProducto.categoria === "EXTRA" && ultimoProducto.tipoExtra === "HAMBURGUESA")
            );

            if (!esValido) {
                Swal.fire({
                    title: 'Advertencia',
                    text: 'Solo puedes agregar un extra de Hamburguesa después de una Hamburguesa',
                    icon: 'warning',
                    confirmButtonColor: '#ffc107',
                });
                return;
            }
        }

        setCarrito((prevCarrito) => {
            // Obtener último elemento del carrito
            const ultimoProducto = prevCarrito.length > 0 ? prevCarrito[prevCarrito.length - 1] : null;

            if (ultimoProducto && ultimoProducto.id === producto.id) {
                // Si tiene el mismo ID, suma la cantidad 
                return prevCarrito.map((item, index) =>
                    index === prevCarrito.length - 1 && item.id === producto.id
                        ? {
                            ...item,
                            cantidad: item.cantidad + 1,
                            subtotal: (item.cantidad + 1) * item.precio
                        }
                        : item
                );
            } else {
                // Si no es último o no existe, agrega como nuevo
                return [...prevCarrito, {
                    ...producto,
                    cantidad: 1,
                    subtotal: producto.precio
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
        // Validar datos usando la función modularizada
        if (!validarDatos(data)) {
            return;
        }

        setProcesando(true);

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
                codigo: `${nuevoCodigo}-${userData.iniciales}`,
                cajeroID: userData.id,
                cajero: userData.nombreCompleto,
                nombre: data.nombre,
                direccion: data.direccion,
                latitud: data.latitud || "",
                longitud: data.longitud || "",
                entreCalles: data.entreCalles || "",
                telefono: data.telefono,
                observaciones: data.observaciones || "",
                envio: envioSeleccionado,
                metodoPago: data.metodoPago,
                pagaCon: Number(data.pagaCon) || 0,
                montoEfectivo: data.metodoPago === "%" ? Number(montoEfectivo) : 0,
                total: Number(totalFinal),
                carrito: carrito,
                estado: data.metodoPago === "MP" || data.metodoPago === "%" ? "PENDIENTEMP" : "APROBADO",
                fecha: fecha,
                hora: data.horarioEspecial || hora,
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
                    latitud: data.latitud || "",
                    longitud: data.longitud || "",
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
        } finally {
            setProcesando(false);
        }
    };

    const limpiarCamposMetodoPago = useCallback(() => {
        resetField("pagaCon");
        setMontoEfectivo(0);
    }, [resetField, setMontoEfectivo]);

    // Extraer hora y minutos del horario especial del formulario
    const horaEspecial = horarioEspecial ? horarioEspecial.split(':')[0] : "20";
    const minutosEspecial = horarioEspecial ? horarioEspecial.split(':')[1] : "00";

    const toggleHorarioEspecial = useCallback(() => {
        setShowHorarioEspecial((prev) => {
            const next = !prev;
            if (!next) {
                setValue("horarioEspecial", "");
            } else {
                setValue("horarioEspecial", "20:00");
            }
            return next;
        });
    }, [setValue]);

    const handleHoraEspecialChange = (e) => {
        const nuevaHora = e.target.value;
        const horarioCompleto = `${nuevaHora}:${minutosEspecial}`;
        setValue("horarioEspecial", horarioCompleto);
    };

    const handleMinutosEspecialChange = (e) => {
        const nuevosMinutos = e.target.value;
        const horarioCompleto = `${horaEspecial}:${nuevosMinutos}`;
        setValue("horarioEspecial", horarioCompleto);
    };

    const handleMetodoPagoChange = (e) => {
        const nuevoMetodo = e.target.value;
        limpiarCamposMetodoPago();
        setValue("metodoPago", nuevoMetodo);
        setShowModalDividido(nuevoMetodo === "%");
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
        // Validar dirección (debe seleccionarse del listado de Google Maps)
        if (!data.direccion || data.direccion.trim() === '') {
            Swal.fire({
                title: 'Advertencia',
                text: 'Selecciona una dirección del listado desplegable',
                icon: 'warning',
                confirmButtonColor: '#ffc107',
            });
            return false;
        }

        if (!data.latitud || !data.longitud) {
            Swal.fire({
                title: 'Advertencia',
                text: 'Debes seleccionar la dirección del listado (no escribir a mano)',
                icon: 'warning',
                confirmButtonColor: '#ffc107',
            });
            return false;
        }

        // Validar teléfono
        if (!data.telefono.startsWith('11') && !data.telefono.startsWith('23')) {
            Swal.fire({
                title: 'Advertencia',
                text: 'El teléfono debe comenzar con 11 o 23',
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
                    text: `El monto "Paga Con" debe ser igual o mayor al total ($${totalFinal})`,
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
        setShowHorarioEspecial(false);
    };

    const handleAprobarSolicitud = (solicitud) => {
        try {
            // Llenar los campos del formulario con los datos de la solicitud
            setValue("nombre", solicitud.cliente?.nombre || "");
            setValue("telefono", solicitud.cliente?.telefono || "");
            setValue("direccion", solicitud.cliente?.direccion || "");
            setValue("entreCalles", solicitud.cliente?.entreCalles || "");
            setValue("metodoPago", solicitud.cliente?.metodoPago || "");

            // Juntar observaciones de cada producto del carrito
            const obsProductos = (solicitud.productos || [])
                .filter(p => p.observaciones)
                .map(p => `${p.descripcion}: ${p.observaciones}`)
                .join("\n");
            setValue("observaciones", obsProductos);

            // Mapear opcion a zona_envio
            if (solicitud.cliente?.opcion === "Retira") {
                const envioRetira = envios.find(e =>
                    e.zona_envio.toLowerCase().includes("retira")
                );
                if (envioRetira) {
                    setValue("envio", JSON.stringify({
                        zona_envio: envioRetira.zona_envio,
                        costo_envio: envioRetira.costo_envio
                    }));
                }
            }

            // Agregar productos al carrito
            if (solicitud.productos && solicitud.productos.length > 0) {
                setCarrito(solicitud.productos.map(producto => ({
                    ...producto,
                    cantidad: producto.cantidad || 1,
                    subtotal: (producto.cantidad || 1) * producto.precio
                })));
            }

            // Cerrar el modal
            setShowPendientesSolicitudes(false);

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
                    <div className="search-bar">
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            type="text"
                            placeholder="Buscar Producto..."
                        />
                        <i className="fa-solid fa-magnifying-glass"></i>
                    </div>

                    <div className="container mw-100 p-1">
                        <div
                            className="d-flex justify-content-start align-items-center">
                            <h3>Sistema Caja</h3>
                            <button
                                className={`btn mx-2 fw-bold mb-1 ${tieneSolicitudesPendientes && !showPendientesSolicitudes ? 'btn-warning text-white btn-blink' : 'btn-outline-secondary'}`}
                                disabled={!tieneSolicitudesPendientes}
                                onClick={() => setShowPendientesSolicitudes(true)}
                            >
                                <i className="fa fa-list-check"></i> Ver Solicitudes
                            </button>
                            <button
                                className={`btn mx-2 btn-sm fw-bold mb-1 ${tienePendientesMP && !showPendientesMP ? 'btn-info text-white btn-blink' : 'btn-outline-secondary'}`}
                                disabled={!tienePendientesMP}
                                onClick={() => setShowPendientesMP(true)}
                            >
                                <img src={logoMP} alt="MP" className="img-fluid" style={{ height: "3vh" }}></img> Pendientes MP
                            </button>
                            <div className="ms-auto d-flex">
                                <button
                                    className="btn btn-primary mx-2 fw-bold mb-1"
                                    onClick={() => setShowBuscarSolicitud(true)}
                                >
                                    <i className="fa fa-search"></i> Buscar Solicitud
                                </button>
                                <button
                                    className="btn btn-danger mx-2 fw-bold mb-1"
                                    onClick={() => setShowEliminarTickets(true)}
                                >
                                    <i className="fa fa-trash"></i> Eliminar Ticket
                                </button>
                            </div>
                        </div>

                        <main className="container-fluid">
                            <div className="row">
                                <section className="col-4 p-0" id="ticket">
                                    <div className="card mb-1" id="datos_clientes">
                                        <input type="text" maxLength={10} className="form-control fs-6 p-1 mb-1" placeholder="Teléfono (sin 0 y sin 15)..." autoComplete="off" required {...register("telefono")}
                                            onInput={(e) => {
                                                e.target.value = e.target.value.replace(/\D/g, '');
                                            }}
                                        />
                                        <input type="text" className="form-control fs-6 p-1 mb-1 none" placeholder="Nombre..." autoComplete="off" required {...register("nombre")} />
                                        <AutocompleteGoogle
                                            value={watch("direccion")}
                                            onChange={({ direccion, latitud, longitud }) => {
                                                setValue("direccion", direccion || "");
                                                setValue("latitud", latitud ?? "");
                                                setValue("longitud", longitud ?? "");
                                            }}
                                            placeholder="Dirección (selecciona del listado)..."
                                            required
                                        />
                                        <input type="hidden" {...register("latitud")} />
                                        <input type="hidden" {...register("longitud")} />
                                        <input type="text" className="form-control fs-6 p-1 mb-1" placeholder="Entre Calles..." autoComplete="off" required {...register("entreCalles")} />
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
                                                        <td colSpan="4" className="text-center text-body-secondary">
                                                            No hay productos
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    carrito.map((producto, index) => (
                                                        <tr key={producto.id}>
                                                            <td className="text-center">{producto.cantidad}</td>
                                                            <td className="text-start">
                                                                <p
                                                                    className={`title text-truncate mb-0 ${producto.categoria === "EXTRA" ? "fst-italic ps-2" : ""}`}>
                                                                    {producto.categoria === "EXTRA" && "-"}{producto.descripcion}
                                                                </p>
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
                                                    {envios.map(env => (
                                                        <option key={env.id} value={JSON.stringify({ zona_envio: env.zona_envio, costo_envio: env.costo_envio })}>
                                                            {env.zona_envio}
                                                        </option>
                                                    ))}
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
                                                        value={montoEfectivo}
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
                                                        value={montoMPConRecargo}
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
                                                <input type="number" className="form-control border-0 bg-transparent" autoComplete="off" min={0} disabled value={totalFinal || 0} />
                                            </div>
                                        </div>

                                        <div className="row" id="acciones">
                                            <div className="d-flex justify-content-center align-items-center gap-2 flex-wrap mb-1">
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
                                                    disabled={procesando}
                                                    onClick={() => handleSubmit(guardarBD)()}>
                                                    {procesando ? "Cargando..." : "Crear Pedido"} <i className="fas fa-burger"></i>
                                                </button>
                                            </div>

                                            <div className="row">
                                                <div className="d-flex justify-content-center align-items-center gap-2 mt-2">
                                                    <button
                                                        className={'btn btn-secondary'}
                                                        type="button"
                                                        onClick={toggleHorarioEspecial}
                                                    >
                                                        Horario Especial <i className="fa fa-clock"></i>
                                                    </button>
                                                    {showHorarioEspecial && (
                                                        <>
                                                            <select
                                                                className="form-control text-center"
                                                                style={{ width: "80px" }}
                                                                value={horaEspecial}
                                                                onChange={handleHoraEspecialChange}
                                                            >
                                                                <option value="20">20</option>
                                                                <option value="21">21</option>
                                                                <option value="22">22</option>
                                                                <option value="23">23</option>
                                                            </select>
                                                            <span className="fw-bold">:</span>
                                                            <select
                                                                className="form-control text-center"
                                                                style={{ width: "80px" }}
                                                                value={minutosEspecial}
                                                                onChange={handleMinutosEspecialChange}
                                                            >
                                                                <option value="00">00</option>
                                                                <option value="15">15</option>
                                                                <option value="30">30</option>
                                                                <option value="45">45</option>
                                                            </select>
                                                        </>
                                                    )}
                                                    <input
                                                        type="hidden"
                                                        {...register("horarioEspecial")}
                                                    />
                                                </div>
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
            <Modal
                show={showModalDividido}
                onHide={() => {
                    setShowModalDividido(false);
                    setValue("metodoPago", "");
                    setMontoEfectivo(0);
                }}
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title>Pago Dividido</Modal.Title>
                </Modal.Header>
                <Modal.Body>
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
                </Modal.Body>
                <Modal.Footer>
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
                </Modal.Footer>
            </Modal>

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

            {/* Modal de Eliminar Tickets */}
            <EliminarTickets
                isOpen={showEliminarTickets}
                onClose={() => setShowEliminarTickets(false)}
            />

            {/* Modal de Buscar Solicitudes */}
            <BuscarSolicitud
                isOpen={showBuscarSolicitud}
                onClose={() => setShowBuscarSolicitud(false)}
            />
        </>
    );
}
export default Caja;