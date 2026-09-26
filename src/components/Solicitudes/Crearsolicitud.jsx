import React, { useState, useEffect, useContext } from "react";
import { CartContext } from '../../context/CartContext.jsx'
import { collection, doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from "./Card.jsx";
import { ModalHamburguesa } from "./ModalHamburguesa.jsx";
import { ModalExtras } from "./ModalExtras.jsx";
import { ModalExtrasGenericos } from "./ModalExtrasGenericos.jsx";
import logo from '../../img/logo_negro4.png';
import logoMobile from '../../img/logo_negro.webp';
import { useForm } from 'react-hook-form';
import '../../style/Main.css';
import { CATEGORIAS_HAMBURGUESA, ENVIOS_LOCALES, ESTADOS, METODOS_PAGO } from "../../Utils/Constantes";
import Footer from "./Footer";
import { fmtPesos } from "../../Utils/formato";
import { useAccionUnica } from "../../Utils/useAccionUnica";
import { webRecibePedidos, textoHorarioWeb } from "../../Utils/fechaComercial";
import WebCerrada from "./WebCerrada";
import { fetchMenuPublico } from "../../Utils/menuPublico";


const CrearSolicitud = () => {
  // Sucursal elegida por el cliente (viene en la URL, ej: /crear-solicitud/luro)
  const { sucursal } = useParams();

  const [loading, setLoading] = useState(true);
  const [errorEnvio, setErrorEnvio] = useState("");
  const [errorCarga, setErrorCarga] = useState(false);
  // Dirección y teléfono de la sucursal, para el pie.
  const [sucursalInfo, setSucursalInfo] = useState(null);
  // Se decide al entrar, y se vuelve a mirar al comprar: la página pudo quedar
  // abierta mientras pasaba la hora de cierre.
  const [abierta] = useState(webRecibePedidos);
  // Un useState no alcanza: entre dos toques rapidos el boton todavia figura
  // habilitado y salian DOS solicitudes con ids distintos, que el cajero ve
  // duplicadas en F1. useAccionUnica corta en el mismo tick.
  const { procesando, ejecutar } = useAccionUnica();

  const {
    carrito,
    disminuir,
    aumentar,
    eliminar,
    totalCarrito,
    vaciarCarrito,
    obtenerHamburguesasConVariantes,
    obtenerCategorias,
    obtenerProductos,
    productos,
    setProductos,
    categorias,
    setCategorias,
  } = useContext(CartContext);

  const total = totalCarrito();
  const recargo = 1 + Number(process.env.REACT_APP_recargoMP) / 100;
  const totalConRecargo = Math.round(total * recargo);

  //registro
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const opcionSeleccionada = watch("opcion");
  const pagoSeleccionado = watch("metodoPago");

  const navigate = useNavigate();

  const comprar = (data) => ejecutar(async () => {
    setErrorEnvio("");
    if (!webRecibePedidos()) {
      setErrorEnvio(`Ya no estamos tomando pedidos. Tomamos pedidos ${textoHorarioWeb()}.`);
      return;
    }

    const solicitudesRef = collection(db, "sucursales", sucursal, "pedidos");
    const newDocRef = doc(solicitudesRef);

    const mensaje = `
    🍔 *NUEVO PEDIDO WEB*

    👤 Nombre: ${data.nombre}
    📞 Teléfono: ${data.telefono}
    💳 Método de pago: ${data.metodoPago}
    ${data.opcion === "delivery" ? ` 🛵 Delivery
    📍 Dirección: ${data.direccion}`
        : `🏪 Retiro en local`}

    🔎 *Ver detalle pedido*
    ${window.location.origin}/ver-pedido/${sucursal}/${newDocRef.id}
    `;

    const mensajeCodificado = encodeURIComponent(mensaje.trim());



    const solicitud = {
      cliente: data,
      carrito: carrito,
      total: pagoSeleccionado === METODOS_PAGO.MP.key ? totalConRecargo : total,
      estado: ESTADOS.WEB_PENDIENTE,
      origen: "WEB",
      clienteTimestamp: serverTimestamp(),
      mensajeWsp: mensajeCodificado
    }

    try {
      // La sucursal viene de la URL sin validar: /crear-solicitud/loquesea creaba
      // una subcolección huérfana bajo un documento que no existe, y ese pedido no
      // lo veía nadie. Una lectura de un solo documento, solo al confirmar.
      const sucursalDoc = await getDoc(doc(db, "sucursales", sucursal));
      if (!sucursalDoc.exists()) {
        setErrorEnvio("La sucursal de este link no existe. Volvé a elegirla y armá el pedido de nuevo.");
        return;
      }

      // El teléfono de ESTA sucursal sale del documento que se acaba de leer, sin
      // lecturas extra. Queda en la solicitud para que /ver-pedido arme su botón de
      // WhatsApp sin leer la sucursal.
      const telefonoSucursal = sucursalDoc.data().telefono || "";
      await setDoc(newDocRef, { ...solicitud, telefonoSucursal });

      vaciarCarrito();
      // Si el bloqueador de pop-ups lo corta, el pedido igual quedó guardado y la
      // pantalla de detalle tiene su propio botón de WhatsApp como respaldo.
      // Sin teléfono cargado en la sucursal no hay a dónde mandarlo: el pedido quedó
      // registrado igual y el cajero lo ve en F1.
      if (telefonoSucursal) {
        window.open(`https://api.whatsapp.com/send?phone=549${telefonoSucursal}&text=${mensajeCodificado}`, "_blank");
      }
      navigate(`/ver-pedido/${sucursal}/${newDocRef.id}`);
    } catch (error) {
      // Antes acá solo había un console.error: el cliente se quedaba mirando el
      // formulario creyendo que había comprado, y el pedido no existía.
      console.error("Error al crear solicitud:", error);
      setErrorEnvio("No pudimos registrar tu pedido. Revisá tu conexión e intentá de nuevo.");
    }
  });

  useEffect(() => {
    // Cerrada no carga el menú: fuera de horario la visita no cuesta nada.
    if (!abierta) return;
    const fetchData = async () => {
      try {
        // Obtener categorías
        const categoriasDataOrdenada = await obtenerCategorias();

        // Obtener productos
        const productosData = await obtenerProductos();

        setCategorias(categoriasDataOrdenada);
        setProductos(productosData);

        // Los datos de la sucursal para el pie salen de menu.json, que ya se
        // descargó para el menú: no cuesta lecturas. Si falla, el pie va sin ellos.
        fetchMenuPublico()
          .then((menu) => setSucursalInfo(menu?.sucursales?.find((s) => s.id === sucursal) || null))
          .catch(() => {});

      } catch (error) {
        console.error("Error fetching data:", error);
        setErrorCarga(true);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [abierta, sucursal]);

  if (!abierta) return <WebCerrada />;

  if (loading) {
    return <p>Cargando...</p>;
  }

  if (errorCarga) {
    return <p className="text-center fw-bold py-5">No pudimos cargar el menú. Probá recargar la página.</p>;
  }

  const hamburguesas = obtenerHamburguesasConVariantes(productos);

  const obtenerHamburguesasDePollo = () => {
    // Buscar la categoría 'POLLO CRISPY'
    const categoriaPollo = categorias.find(cat => cat.nombre === 'POLLO CRISPY');

    if (!categoriaPollo) return [];

    // Filtrar productos que pertenecen a la categoría POLLO CRISPY
    return productos.filter(p => p.categoria === categoriaPollo.nombre);
  };

  const hamburguesasPollo = obtenerHamburguesasDePollo();

  const productosOferta = productos.filter(p => p.oferta);

  return (
    <div>
      <header>
        <img className='desktop-img logoCS' src={logo} alt="logoGarden" />
        <img className='mobile-img logoCS' src={logoMobile} alt="logoGardenMobile" />
      </header>
      <main>

        {carrito.length > 0 &&
          <div className="position-fixed bottom-0 end-0 z-2 m-3">
            <a href={`/crear-solicitud/${sucursal}#finalizarCompra`} className="text-white p-3">Ver pedido
              <i className="fa fa-arrow-down ms-2 animated-arrow" aria-hidden="true"></i>
            </a>
          </div>}

        {/* Sección de categorías con accordions */}
        <div className='mainpageCS itemListConteiner'>
          {categorias.length === 0 || productos.length === 0 ? (
            <div className="text-white fw-bold text-center py-5">
              No hay categorías o productos disponibles
            </div>
          ) : (
            <div className="accordion accordionCS mt-3" id="accordionCategorias">

              {/* OFERTAS */}
              {productosOferta.length > 0 && (
                <div className="accordion-item">
                  <h2 className="accordion-header" id="headingOFERTAS">
                    <button
                      className="accordion-button accordionButtonCS collapsed"
                      type="button"
                      data-bs-toggle="collapse"
                      data-bs-target="#collapseOFERTAS"
                      aria-expanded="false"
                      aria-controls="collapseOFERTAS"
                    >
                      🏷️ OFERTAS
                    </button>
                  </h2>
                  <div
                    id="collapseOFERTAS"
                    className="accordion-collapse collapse"
                    data-bs-parent="#accordionCategorias"
                  >
                    <div className="accordion-body text-center">
                      {productosOferta.map(p => (
                        <Card key={p.id} producto={p} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* HAMBURGUESAS */}
              {hamburguesas.length > 0 && (
                <div className="accordion-item">
                  <h2 className="accordion-header" id="headingHAMBURGUESAS">
                    <button
                      className="accordion-button accordionButtonCS collapsed"
                      type="button"
                      data-bs-toggle="collapse"
                      data-bs-target="#collapseHAMBURGUESAS"
                      aria-expanded="false"
                      aria-controls="collapseHAMBURGUESAS"
                    >
                      HAMBURGUESAS
                    </button>
                  </h2>

                  <div
                    id="collapseHAMBURGUESAS"
                    className="accordion-collapse collapse"
                    data-bs-parent="#accordionCategorias"
                  >
                    <div className="accordion-body text-center">
                      {hamburguesas.map(p => (
                        <Card key={p.id} producto={p} />
                      ))
                      }
                      {hamburguesasPollo.map(p => (
                        <Card key={p.id} producto={p} />
                      ))
                      }
                    </div>
                  </div>
                </div>
              )}



              {/* RESTO CATEGORÍAS */}
              {categorias
                .filter(cat => !CATEGORIAS_HAMBURGUESA.includes(cat.nombre) && cat.nombre !== "EXTRA" && cat.nombre !== 'POLLO CRISPY')
                .map((categoria, index) => {
                  const productosCat = productos.filter(p => p.categoria === categoria.nombre);
                  if (!productosCat.length) return null;

                  const safeName = categoria.nombre.replace(/\s+/g, "");

                  return (
                    <div key={categoria.id} className="accordion-item">
                      <h2 className="accordion-header" id={`heading${safeName}`}>
                        <button
                          className="accordion-button accordionButtonCS collapsed"
                          type="button"
                          data-bs-toggle="collapse"
                          data-bs-target={`#collapse${safeName}`}
                          aria-expanded="false"
                          aria-controls={`collapse${safeName}`}
                        >
                          {categoria.nombre}
                        </button>
                      </h2>

                      <div
                        id={`collapse${safeName}`}
                        className="accordion-collapse collapse"
                        data-bs-parent="#accordionCategorias"
                      >
                        <div className="accordion-body text-center">
                          {productosCat.map(p => (
                            <Card key={p.id} producto={p} />
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}

            </div>
          )}

          <h2 id='finalizarCompra' className="w-75 tituloCategoria">Finalizar Compra</h2>
          <div className='itemsConteiner position-relative z-3'>
            {carrito.map((producto) => {
              const key = `${producto.id}-${producto.combo}`;
              return (
                <div className='itemCarrito' key={key}>
                  <div className="imagen">
                    <img src={producto.imagen} alt="imagen" />
                  </div>
                  <div className='tituloVP'>
                    {producto.descripcion}
                    {producto.observaciones && (
                      <small className="d-block text-body-secondary" style={{ fontSize: '0.8rem' }}>{producto.observaciones}</small>
                    )}
                  </div>
                  <div className='cantidad'>
                    {producto.categoria === 'BEBIDAS' && (
                      <>
                        <button type="button" className="disminuir text-danger" onClick={() => disminuir(producto)}>-</button>
                        <span className="numeroCantidad mx-2 fw-bold">{producto.cantidad}</span>
                        <button type="button" className="aumentar text-success" onClick={() => aumentar(producto)}>+</button>
                      </>
                    )}
                  </div>
                  <div className="precioVP">{fmtPesos(producto.precio * producto.cantidad)}</div>
                  <button type="button" className="btn btn-danger" onClick={() => eliminar(producto)}>❌</button>
                </div>
              )
            })}

            {carrito.length > 0 ?
              <div className="d-flex flex-column align-items-center">
                <button type="button" className="btn btn-danger" onClick={() => vaciarCarrito()}>Vaciar carrito</button>
                <div className="m-2 fw-bold">Total: {fmtPesos(pagoSeleccionado === METODOS_PAGO.MP.key ? totalConRecargo : total)}</div>

                <form className='formulario w-75' onSubmit={handleSubmit(comprar)}>
                  <input type="text" placeholder='Ingrese su nombre' {...register("nombre", { required: true })} required />
                  <input type="text" id="telefono" maxLength={10} placeholder='Teléfono (sin 0 y sin 15)...' {...register("telefono", { minLength: 10 })} required
                    onInput={(e) => {
                      e.target.value = e.target.value.replace(/\D/g, '');
                    }}
                  />

                  <div className="d-flex justify-content-around mt-2">
                    <div style={{ minWidth: "110px" }}>
                      <label>
                        <input
                          style={{ margin: "0px" }}
                          type="radio"
                          value={ENVIOS_LOCALES[0]}
                          {...register("opcion", { required: "Debes seleccionar una opción" })}
                        />
                        Lo retiro
                      </label>
                    </div>
                    <div style={{ minWidth: "110px" }}>
                      <label>
                        <input
                          style={{ margin: "0px" }}
                          type="radio"
                          value="delivery"
                          {...register("opcion", { required: "Debes seleccionar una opción" })}
                        />
                        Delivery
                      </label>
                    </div>
                  </div>
                  {errors.opcion && <p style={{ color: 'red' }}>{errors.opcion.message}</p>}
                  {opcionSeleccionada === "delivery" && (
                    <>
                      <input
                        type="text"
                        placeholder="Dirección de envío"
                        {...register("direccion", {
                          required: opcionSeleccionada === "delivery" ? "La dirección es obligatoria" : false,
                        })}
                      />
                      {errors.direccion && <p style={{ color: 'red' }}>{errors.direccion.message}</p>}
                      <input
                        type="text"
                        placeholder="Entre calles"
                        {...register("entreCalles", {
                          required: opcionSeleccionada === "delivery" ? "Las calles son obligatorias" : false,
                        })}
                      />
                      {errors.entreCalles && <p style={{ color: 'red' }}>{errors.entreCalles.message}</p>}
                    </>
                  )}
                  <div className="d-flex justify-content-around">
                    <div style={{ minWidth: "110px" }}>
                      <label>
                        <input
                          style={{ margin: "0px" }}
                          type="radio"
                          value={METODOS_PAGO.EFECTIVO.key}
                          {...register("metodoPago", { required: "Debes seleccionar una opción" })}
                        />
                        Efectivo
                      </label>
                    </div>
                    <div style={{ minWidth: "110px" }}>
                      <label>
                        <input
                          style={{ margin: "0px" }}
                          type="radio"
                          value={METODOS_PAGO.MP.key}
                          {...register("metodoPago", { required: "Debes seleccionar una opción" })}
                        />
                        MercadoPago
                      </label>
                    </div>
                  </div>
                  {errors.metodoPago && <p className="text-danger">{errors.metodoPago.message}</p>}
                  {pagoSeleccionado === METODOS_PAGO.MP.key && (
                    <>
                      <p className="text-danger">{'La transferencia tiene un recargo de '}{process.env.REACT_APP_recargoMP}%</p>
                      <p className="text-danger fw-bold">{'Advertencia: HASTA QUE NO INGRESE LA TRANSFERENCIA NO SE TOMARÁ SU PEDIDO'}</p>
                    </>
                  )}
                  <button className="btn btn-success" type="submit" disabled={procesando}>{procesando ? "Cargando..." : "Comprar"}</button>
                  {errorEnvio && (
                    <div className="alert alert-danger mt-3 mb-0" role="alert">
                      <strong>Tu pedido no se registró.</strong> {errorEnvio}
                    </div>
                  )}
                </form>
              </div>
              : <><p className='error'>Sin productos seleccionados.</p><a href={`/crear-solicitud/${sucursal}#HAMBURGUESAS`}><p className='fw-bold'>Ir a inicio ↑↑↑</p></a></>}
          </div>
        </div>
      </main>

      {/* Importar todos los modales */}
      <ModalHamburguesa />
      <ModalExtras />
      <ModalExtrasGenericos />

      <Footer sucursal={sucursalInfo} />
    </div>
  );
};

export default CrearSolicitud;