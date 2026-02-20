import React, { useState, useEffect, useContext } from "react";
import { CartContext } from '../../context/CartContext.jsx'
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import { useNavigate } from 'react-router-dom';
import 'moment/locale/es';
import { Card } from "./Card.jsx";
import { CardCarousel } from "./CardCarrousel.jsx";
import { ModalHamburguesa } from "./ModalHamburguesa.jsx";
import { ModalExtras } from "./ModalExtras.jsx";
import { ModalExtrasGenericos } from "./ModalExtrasGenericos.jsx";
import logo from '../../img/logo_negro4.png';
import logoMobile from '../../img/logo_negro.webp';
import { useForm } from 'react-hook-form';
import '../../style/Main.css';

const CrearSolicitud = () => {
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);

  const {
    carrito,
    disminuir,
    aumentar,
    eliminar,
    totalCarrito,
    vaciarCarrito,
    obtenerHamburguesasConVariantes,
    categoriasHamburguesas,
    actualizarMensajeWSP
  } = useContext(CartContext);

  //registro
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const opcionSeleccionada = watch("opcion");
  const pagoSeleccionado = watch("metodoPago");

  let [docId, setDocId] = useState("");
  const navigate = useNavigate();

  const comprar = (data) => {
    const solicitud = {
      cliente: data,
      productos: carrito,
      total: pagoSeleccionado === "MP" ? totalCarrito() + totalCarrito() * parseFloat(process.env.REACT_APP_recargoMP)/100 : totalCarrito(),
      estado: "PENDIENTE",
      fecha: new Date()
    }

    const solicitudesRef = collection(db, "solicitudes")

    addDoc(solicitudesRef, solicitud)
    .then((doc) => {
  
    const mensaje = `
      🍔 *NUEVO PEDIDO WEB*
      
      👤 Nombre: ${data.nombre}
      📞 Teléfono: ${data.telefono}
      💳 Método de pago: ${data.metodoPago}
      ${data.opcion === "delivery"? ` 🛵 Delivery
      📍 Dirección: ${data.direccion}`
        : `🏪 Retiro en local`}
      
      🔎 *Ver detalle pedido*
      https://gardenburger.com.ar/ver-pedido/${doc.id}
      `;
      
      const mensajeCodificado = encodeURIComponent(mensaje.trim());

      actualizarMensajeWSP(mensajeCodificado);

      setDocId(doc.id)
      vaciarCarrito();

      navigate(`/ver-pedido/${doc.id}`);
      })
  }

  useEffect(() => {
    const bootstrap = require('bootstrap');

    // Espera al próximo ciclo del render para asegurarte de que el carrusel exista en el DOM
    const timeout = setTimeout(() => {
      const myCarousel = document.getElementById('carouselExampleAutoplaying');
      if (myCarousel) {
        const carousel = bootstrap.Carousel.getOrCreateInstance(myCarousel, {
          interval: 3000, // 3 segundos
          ride: 'carousel', // arranca automáticamente
          pause: false // sigue aunque el mouse esté encima
        });
        carousel.cycle(); // Fuerza el autoplay
      }
    }, 100); // 100ms es suficiente para esperar el render

    return () => clearTimeout(timeout); // limpia el timeout si el componente se desmonta
  }, [productos]);

  useEffect(() => {
    const bootstrap = require('bootstrap');

    const timeout = setTimeout(() => {
      const myCarousel = document.getElementById('carouselExampleAutoplaying');
      if (myCarousel) {
        const carousel = bootstrap.Carousel.getOrCreateInstance(myCarousel, {
          interval: 3000,
          ride: 'carousel',
          pause: false
        });
        carousel.cycle();
      }
    }, 100);

    return () => clearTimeout(timeout);
  }, [productos]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Obtener categorías
        const categoriasRef = collection(db, "categorias");
        const categoriasSnapshot = await getDocs(categoriasRef);
        const categoriasDataOrdenada = categoriasSnapshot.docs
          .map(doc => ({
            ...doc.data(),
            id: doc.id
          }))
          .sort((a, b) => a.nroOrden - b.nroOrden);

        // Obtener productos
        const productosRef = collection(db, "productos");
        const q = query(productosRef, where("visible", "==", true));
        const productosSnapshot = await getDocs(q);
        const productosData = productosSnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        }));

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
  return (
    <div>
      <header>
        <img className='desktop-img logoCS' src={logo} alt="logoGarden" />
        <img className='mobile-img logoCS' src={logoMobile} alt="logoGardenMobile" />
      </header>
      <main>
        {/* <section className="m-1">
          <div className="d-flex flex-wrap justify-content-center align-items-center">

            <div className="d-flex align-items-center ms-2 me-2">
              <i className="fa fa-map-marker m-1" aria-hidden="true"></i>
              <h5 className="mb-0">Leonardo Da Vinci 4225 - Gregorio de Laferrere, La Matanza (Buenos Aires)</h5>
            </div>

            <div className="d-flex align-items-center ms-2 me-2">
              <i className="fa fa-motorcycle m-1" aria-hidden="true"></i>
              <h5 className="mb-0">Envíos a domicilio</h5>
            </div>

          </div>
        </section> */}
        {carrito.length > 0 &&
          <div className="position-fixed bottom-0 end-0 z-2 m-3">
            <a href='/crear-solicitud#finalizarCompra' className="btnVerde p-3">Ver pedido
              <i className="fa fa-arrow-down ms-2 animated-arrow" aria-hidden="true"></i>
            </a>
          </div>}
        {/* inicio carrousel */}
        {/* {productos.some(prod => prod.oferta === true) && (
          <div
            id="carouselExampleAutoplaying"
            className="carousel slide"
            data-bs-ride="carousel"
            data-bs-interval="3000"
          >
            <div className="carousel-inner">
              {productos
                .filter(prod => prod.oferta === true)
                .map((producto, index) => (
                  <div
                    key={producto.id}
                    className={`carousel-item ${index === 0 ? 'active' : ''}`}
                  >
                    <CardCarousel producto={producto} />
                  </div>
                ))}
            </div>

            <button
              className="carousel-control-prev"
              type="button"
              data-bs-target="#carouselExampleAutoplaying"
              data-bs-slide="prev"
            >
              <span className="carousel-control-prev-icon" aria-hidden="true"></span>
              <span className="visually-hidden">Previous</span>
            </button>
            <button
              className="carousel-control-next"
              type="button"
              data-bs-target="#carouselExampleAutoplaying"
              data-bs-slide="next"
            >
              <span className="carousel-control-next-icon" aria-hidden="true"></span>
              <span className="visually-hidden">Next</span>
            </button>
          </div>
        )} */}

        {/* fin carrousel */}

        {/* Sección de categorías con accordions */}
        <div className='mainpageCS itemListConteiner accordionSectionCS'>
           {categorias.length === 0 || productos.length === 0 ? (
             <div className="text-white fw-bold text-center py-5">
               No hay categorías o productos disponibles
             </div>
           ) : (
             <div className="accordion accordionCS mt-3" id="accordionCategorias">
       
               {/* HAMBURGUESAS */}
               {hamburguesas.length > 0 && (
                 <div className="accordion-item accordionItemCS">
                   <h2 className="accordion-header" id="headingHAMBURGUESAS">
                     <button
                       className="accordion-button accordionButtonCS"
                       type="button"
                       data-bs-toggle="collapse"
                       data-bs-target="#collapseHAMBURGUESAS"
                       aria-expanded="true"
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
                 .filter(cat => !categoriasHamburguesas.includes(cat.nombre) && cat.nombre !== "EXTRA" && cat.nombre !== 'POLLO CRISPY')
                 .map((categoria, index) => {
                   const productosCat = productos.filter(p => p.categoria === categoria.nombre);
                   if (!productosCat.length) return null;
       
                   const safeName = categoria.nombre.replace(/\s+/g, "");
                   const isFirst = index === 0 && hamburguesas.length === 0;
       
                   return (
                     <div key={categoria.id} className="accordion-item accordionItemCS">
                       <h2 className="accordion-header" id={`heading${safeName}`}>
                         <button
                           className={"accordion-button accordionButtonCS"}
                           type="button"
                           data-bs-toggle="collapse"
                           data-bs-target={`#collapse${safeName}`}
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
                  <div className='tituloVP'>{producto.descripcion}</div>
                  <div className='cantidad'>
                    {/* <button className='disminuir' onClick={() => disminuir(producto)}>-</button>
                    <h4 className='numeroCantidad'>x{producto.amountInCart}</h4>
                    <button className='aumentar' onClick={() => aumentar(producto)}>+</button> */}
                  </div>
                  <div className="precioVP">${(producto.precio * producto.amountInCart).toFixed(2)}</div>
                  {<button type="button" className="btn btn-danger" onClick={() => eliminar(producto)}>❌</button>}
                </div>
              )
            })}

            {carrito.length > 0 ?
              <div className="d-flex flex-column align-items-center">
                <button type="button" className="btn btn-danger" onClick={() => vaciarCarrito()}>Vaciar carrito</button>
                <div className="m-2 fw-bold">Total: ${ pagoSeleccionado === "MP" ? totalCarrito() + totalCarrito() * parseFloat(process.env.REACT_APP_recargoMP)/100 : totalCarrito()}</div>

                <form className='formulario w-75' onSubmit={handleSubmit(comprar)}>
                  <input type="text" placeholder='Ingrese su nombre' {...register("nombre", { required: true })} required />
                  <input type="tel" id="telefono" placeholder='Ingrese su número de teléfono' {...register("telefono", { required: true })} required />
                  <div className="d-flex justify-content-around">
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
                  <button className="btn btn-success" type="submit">Comprar</button>
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

      <footer className="bg-dark text-white py-4  position-relative z-3 ">
        <div className="container ">
          <div className="row">
            {/* Columna 1 - Información del local */}
            <div className="col-12 col-md-4 mb-4 mb-md-0 text-center text-md-start  ">
              <h5 className="mb-3">GARDEN BURGER</h5>
              <p className="small text-white-50">
                <span className="">📍</span>
                Leonardo Da Vinci 425<br />
                Gregorio de Laferrere, La Matanza<br />
                Buenos Aires
              </p>
              <p className="small text-white-50">
                <span className="me-2">📞</span>
                {process.env.REACT_APP_celular || "11-1234-5678"}
              </p>
              <p className="small text-white-50 mb-0">
                <span className="me-2">🕒</span>
                Horario: 19:00 a 00:00 hrs
              </p>
            </div>

            {/* Columna 2 - Enlaces rápidos */}
            <div className="col-12 col-md-4 mb-4 mb-md-0 text-center">
              <h5 className="mb-3">Enlaces rápidos</h5>
              <ul className="list-unstyled">
                <li className="mb-2">
                  <a href="#HAMBURGUESAS" className="text-white-50 text-decoration-none">
                    Hamburguesas
                  </a>
                </li>
                <li className="mb-2">
                  <a href="#CAJA PAPAS" className="text-white-50 text-decoration-none">
                    Caja Papas
                  </a>
                </li>
                <li className="mb-2">
                  <a href="#POLLO CRISPY" className="text-white-50 text-decoration-none">
                    Pollo Crispy
                  </a>
                </li>
                <li className="mb-2">
                  <a href="#NUGGETS" className="text-white-50 text-decoration-none">
                    Nuggets
                  </a>
                </li>
              </ul>
            </div>

            {/* Columna 3 - Redes sociales y copyright */}
            <div className="col-12 col-md-4 text-center text-md-end">
              <h5 className="mb-3">Seguinos</h5>
              <div className="d-flex justify-content-center justify-content-md-end gap-3">
                <a href="#" className="text-white text-decoration-none" target="_blank" rel="noopener noreferrer">
                  <span className="fs-4">📷</span>
                </a>
                <a href="#" className="text-white text-decoration-none" target="_blank" rel="noopener noreferrer">
                  <span className="fs-4">👤</span>
                </a>
                <a href="#" className="text-white text-decoration-none" target="_blank" rel="noopener noreferrer">
                  <span className="fs-4">💬</span>
                </a>
              </div>
              <p className="small mt-3 text-white-50 mb-0">
                © {new Date().getFullYear()} Garden Burger.
              </p>
              <p className="small text-white-50">
                Todos los derechos reservados.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CrearSolicitud;