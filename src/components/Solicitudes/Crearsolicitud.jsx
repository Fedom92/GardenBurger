import React, { useState, useEffect, useContext } from "react";
import { CartContext } from '../../context/CartContext.jsx'
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import { useNavigate } from 'react-router-dom';
import { Card } from "./Card.jsx";
import { ModalHamburguesa } from "./ModalHamburguesa.jsx";
import { ModalExtras } from "./ModalExtras.jsx";
import { ModalExtrasGenericos } from "./ModalExtrasGenericos.jsx";
import logo from '../../img/logo_negro4.png';
import logoMobile from '../../img/logo_negro.webp';
import { useForm } from 'react-hook-form';
import '../../style/Main.css';
import { CATEGORIAS_HAMBURGUESA, ESTADOS } from "../../Utils/Constantes";
import Footer from "./Footer";


const CrearSolicitud = () => {
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);

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

  const comprar = (data) => {
    setProcesando(true);

    const solicitudesRef = collection(db, "pedidos");
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
    https://gardenburger.com.ar/ver-pedido/${newDocRef.id}
    `;

    const mensajeCodificado = encodeURIComponent(mensaje.trim());



    const solicitud = {
      cliente: data,
      carrito: carrito,
      total: pagoSeleccionado === "MP" ? totalConRecargo : total,
      estado: ESTADOS.WEB_PENDIENTE,
      origen: "WEB",
      clienteTimestamp: serverTimestamp(),
      mensajeWsp: mensajeCodificado
    }

    setDoc(newDocRef, solicitud)
      .then(() => {
        vaciarCarrito();
        window.open(`https://api.whatsapp.com/send?phone=549${process.env.REACT_APP_celular}&text=${mensajeCodificado}`, "_blank");
        navigate(`/ver-pedido/${newDocRef.id}`);
      })
      .catch((error) => {
        console.error("Error al crear solicitud:", error);
      })
      .finally(() => {
        setProcesando(false);
      })
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Obtener categorías
        const categoriasDataOrdenada = await obtenerCategorias();

        // Obtener productos
        const productosData = await obtenerProductos();

        setCategorias(categoriasDataOrdenada);
        setProductos(productosData);

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <p>Cargando...</p>;
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
            <a href='/crear-solicitud#finalizarCompra' className="text-white p-3">Ver pedido
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
            <div className="accordion accordionCS mt-3" id="accordionCategorias" key={`accordion-${carrito.reduce((sum, p) => sum + (p.cantidad || 1), 0)}`}>

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
                  <div className="precioVP">${(producto.precio * producto.cantidad)}</div>
                  <button type="button" className="btn btn-danger" onClick={() => eliminar(producto)}>❌</button>
                </div>
              )
            })}

            {carrito.length > 0 ?
              <div className="d-flex flex-column align-items-center">
                <button type="button" className="btn btn-danger" onClick={() => vaciarCarrito()}>Vaciar carrito</button>
                <div className="m-2 fw-bold">Total: ${pagoSeleccionado === "MP" ? totalConRecargo : total}</div>

                <form className='formulario w-75' onSubmit={handleSubmit(comprar)}>
                  <input type="text" placeholder='Ingrese su nombre' {...register("nombre", { required: true })} required />
                  <input type="text" id="telefono" maxLength={10} placeholder='Teléfono (sin 0 y sin 15)...' {...register("telefono", {
                    required: "El teléfono es obligatorio",
                    validate: value => value.startsWith('11') || value.startsWith('23') || "El teléfono debe comenzar con 11 o 23"
                  })} required
                    onInput={(e) => {
                      e.target.value = e.target.value.replace(/\D/g, '');
                    }}
                  />
                  {errors.telefono && <p style={{ color: 'red', margin: '0', textAlign: 'center' }}>{errors.telefono.message}</p>}

                  <div className="d-flex justify-content-around mt-2">
                    <div style={{ minWidth: "110px" }}>
                      <label>
                        <input
                          style={{ margin: "0px" }}
                          type="radio"
                          value="Retira"
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
                          value="EFECTIVO"
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
                          value="MP"
                          {...register("metodoPago", { required: "Debes seleccionar una opción" })}
                        />
                        MercadoPago
                      </label>
                    </div>
                  </div>
                  {errors.metodoPago && <p className="text-danger">{errors.metodoPago.message}</p>}
                  {pagoSeleccionado === "MP" && (
                    <>
                      <p className="text-danger">{'La transferencia tiene un recargo de '}{process.env.REACT_APP_recargoMP}%</p>
                      <p className="text-danger fw-bold">{'Advertencia: HASTA QUE NO INGRESE LA TRANSFERENCIA NO SE TOMARÁ SU PEDIDO'}</p>
                    </>
                  )}
                  <button className="btn btn-success" type="submit" disabled={procesando}>{procesando ? "Cargando..." : "Comprar"}</button>
                </form>
              </div>
              : <><p className='error'>Sin productos seleccionados.</p><a href='/crear-solicitud#HAMBURGUESAS'><p className='fw-bold'>Ir a inicio ↑↑↑</p></a></>}
          </div>
        </div>
      </main>

      {/* Importar todos los modales */}
      <ModalHamburguesa />
      <ModalExtras />
      <ModalExtrasGenericos />

      <Footer />
    </div>
  );
};

export default CrearSolicitud;