import React, { useState, useEffect, useContext } from "react";
import { CartContext } from '../../context/CartContext.jsx'
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import { useNavigate } from 'react-router-dom';
import 'moment/locale/es';
import { Card } from "./Card.jsx"
import { CardCarousel } from "./CardCarrousel.jsx"
import logo from '../../img/logo_negro4.png';
import logoMobile from '../../img/logo_negro.webp';
import { useForm } from 'react-hook-form';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';


const CrearSolicitud = () => {
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const { carrito, cantidadHambPapas, disminuir, aumentar, eliminar, totalCarrito, cantidadBebidas, vaciarCarrito } = useContext(CartContext);

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
      total: pagoSeleccionado === "MP" ? totalCarrito() + parseFloat(process.env.REACT_APP_recargoMP) : totalCarrito(),
      estado: "PENDIENTE",
      fecha: new Date()
    }

    const solicitudesRef = collection(db, "solicitudes")

    addDoc(solicitudesRef, solicitud)
      .then((doc) => {
        const mensaje = `¡Hola! Quiero hacer una compra:
    - Nombre: ${data.nombre}
    - Teléfono: ${data.telefono}
    - Opción: ${data.opcion === "delivery" ? "Delivery" : "Retiro en local"}
    ${data.opcion === "delivery" ? `- Dirección: ${data.direccion}` : ""}
    - Metodo de pago: ${data.metodoPago}
    - Detalle: http://192.168.0.11:3000/crear-solicitud/${doc.id}`;

        const mensajeCodificado = encodeURIComponent(mensaje);

        window.open(`https://wa.me/${process.env.REACT_APP_celular}?text=${mensajeCodificado}`, "_blank"); //celEjemplo:911xxxxxxxx
        setDocId(doc.id)
        vaciarCarrito();

        navigate(`/ver-pedido/${doc.id}`);
      })



  }
  //fin registro

   

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

 


  return (
    <div>
      <header>
        <img className='desktop-img logoCS' src={logo} alt="logoGarden" />
        <img className='mobile-img logoCS' src={logoMobile} alt="logoGardenMobile" />
      </header>
      <main>

<section className="m-1">
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
</section>

        {carrito.length > 0 &&
          <div className="position-fixed bottom-0 end-0 z-2 m-3">
            <a href='/crear-solicitud#finalizarCompra' className="btnVerde p-3">Ver pedido
              <i className="fa fa-arrow-down ms-2 animated-arrow" aria-hidden="true"></i>
            </a>
          </div>}

        {/* {productos.some(prod => prod.oferta === true) && (
          <div id="carouselExampleAutoplaying" className="carousel slide" data-bs-ride="carousel">
            <div className="carousel-inner">

              {productos.map((producto, index) => (
                producto.oferta === true &&
                <>
                  <div
                    key={producto.id}
                    className={`carousel-item ${index === 0 ? 'active' : ''}`}
                  >
                    <CardCarousel producto={producto} />
                  </div>
                </>
              ))}
            </div>
            <button className="carousel-control-prev" type="button" data-bs-target="#carouselExampleAutoplaying" data-bs-slide="prev">
              <span className="carousel-control-prev-icon" aria-hidden="true"></span>
              <span className="visually-hidden">Previous</span>
            </button>
            <button className="carousel-control-next" type="button" data-bs-target="#carouselExampleAutoplaying" data-bs-slide="next">
              <span className="carousel-control-next-icon" aria-hidden="true"></span>
              <span className="visually-hidden">Next</span>
            </button>
          </div>
        )} */}
      {productos.some(prod => prod.oferta === true) && (
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
      )}




        <div className="iconosCS d-flex justify-content-center">
          <div className="row ">
            <div className="col-6 col-md-3 imagenCS">
              <div className="p-3">
                <div className="position-relative">
                  <a href="#SIMPLE">
                    <img src='https://drive.google.com/thumbnail?id=1PVIyV2BUkqTbF54RnWGfIS4zB0-VrNGt' alt="imagen" />
                    <div className="position-absolute bottom-0 start-50 translate-middle-x w-100 text-center p-2 text-white"
                      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
                      <div className="mb-0">Hamburguesas</div>
                    </div>
                  </a>
                </div>
              </div>
            </div>


            <div className="col-6 col-md-3 imagenCS">
              <div className="p-3">
                <div className="position-relative">
                  <a href="#CAJA PAPAS">
                    <img src='https://http2.mlstatic.com/D_694997-MLA73778019288_012024-C.jpg' alt="imagen" />
                    <div className="position-absolute bottom-0 start-50 translate-middle-x w-100 text-center p-2 text-white"
                      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
                      <div className="mb-0">Papas</div>
                    </div>
                  </a>
                </div>
              </div>
            </div>

            <div className="col-6 col-md-3 imagenCS">
              <div className="p-3">
                <div className="position-relative">
                  <a href="#NUGGETS">
                    <img src='https://imag.bonviveur.com/los-nuggets-de-pollo.jpg' alt="imagen" />
                    <div className="position-absolute bottom-0 start-50 translate-middle-x w-100 text-center p-2 text-white"
                      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
                      <div className="mb-0">Nuggets</div>
                    </div>
                  </a>
                </div>
              </div>
            </div>

            <div className="col-6 col-md-3 imagenCS">
              <div className="p-3">
                <div className="position-relative">
                  <a href="#BEBIDAS">
                    <img src='https://ceprosg.com.ar/wp-content/uploads/2020/07/41100-1.jpg' alt="imagen" />
                    <div className="position-absolute bottom-0 start-50 translate-middle-x w-100 text-center p-2 text-white"
                      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
                      <div className="mb-0">Bebidas</div>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>



        <div className='mainpageCS itemListConteiner'>
          {categorias.length > 0 && productos.length > 0 ? (
            categorias.map(categoria => {
              const productosEnCategoria = productos.filter(
                producto => producto.categoria === categoria.nombre //categoria
              );

              return (
                <div className="w-100 d-flex flex-column align-items-center" key={categoria.id}>
                  {categoria.nombre !== 'EXTRA' ? (
                    <>
                      <h2 id={categoria.nombre} className="w-75 tituloCategoria">{categoria.nombre}</h2>
                      <div>
                        {productosEnCategoria.length > 0 ? (
                          productosEnCategoria.map(producto => (
                            <Card key={producto.id} producto={producto} />
                          ))
                        ) : (
                          <p>No hay productos en esta categoría</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="w-100 d-flex flex-column align-items-center" style={{ display: cantidadHambPapas() > 0 ? 'block' : 'none' }}>
                      <h2 id={categoria.nombre} className="w-75 tituloCategoria">{categoria.nombre}</h2>
                      <div>
                        {productosEnCategoria.length > 0 ? (
                          productosEnCategoria.map(producto => (
                            <Card key={producto.id} producto={producto} />
                          ))
                        ) : (
                          <p>No hay productos en esta categoría</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p>No hay categorías o productos disponibles</p>
          )}
          <h2 id='finalizarCompra' className="w-75 tituloCategoria">Finalizar Compra</h2>
          <div className='itemsConteiner position-relative z-3'>

            {carrito.map((producto) => {
              return (

                <div className='itemCarrito'>
                  <div className="imagen">
                    <img src={producto.imagen} alt="imagen" />
                  </div>
                  <div className='tituloVP'>{producto.descripcion}</div>
                  <div className='cantidad'>
                    <button className='disminuir' onClick={() => disminuir(producto)}>-</button>
                    <h4 className='numeroCantidad'>{producto.amountInCart}</h4>
                    <button className='aumentar' onClick={() => aumentar(producto)}>+</button>
                  </div>
                  {/* <p className="precio">${(producto.price.finalPrice*producto.amountInCart).toFixed(2)}</p> */}
                  <div className="precioVP">${(producto.precio * producto.amountInCart).toFixed(2)}</div>
                  <button className='eliminar' onClick={() => eliminar(producto)}>❌</button>
                </div>

              )
            })}
            {carrito.length > 0 ?
              <div className="d-flex flex-column align-items-center">
                <div className="m-2 fw-bold">Total: ${pagoSeleccionado === "MP" ? totalCarrito() + parseFloat(process.env.REACT_APP_recargoMP) : totalCarrito()}</div>
                {cantidadBebidas() === 0 &&
                  <a className="m-2" href="#BEBIDAS">No te olvides de agregar tu bebida! Hacé click aquí</a>}

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
                  {errors.metodoPago && <p style={{ color: 'red' }}>{errors.metodoPago.message}</p>}
                  {pagoSeleccionado === "MP" && (
                    <>
                      <p style={{ color: 'red' }}>{'La transferencia tiene un recargo de $'}{process.env.REACT_APP_recargoMP}</p>
                      <p style={{ color: 'red' }}>{'Advertencia: HASTA QUE NO INGRESE LA TRANSFERENCIA NO SE TOMARÁ SU PEDIDO'}</p>
                    </>
                  )}
                  <button className='btnVerde' type="submit">Comprar</button>
                </form>

              </div>
              : <><p className='error'>Sin productos seleccionados</p><a href='/crear-solicitud#SIMPLE'><p className='fw-bold'>Ir a inicio</p></a></>}


          </div>
        </div>


      </main>
    </div>
  );
};

export default CrearSolicitud;