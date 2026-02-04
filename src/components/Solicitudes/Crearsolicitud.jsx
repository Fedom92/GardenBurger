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

const CrearSolicitud = () => {
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [extrasHamburguesas, setExtrasHamburguesas] = useState([]);
  const [bebidasDisponibles, setBebidasDisponibles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para los modales
  const [showModalVariante, setShowModalVariante] = useState(false);
  const [showModalExtras, setShowModalExtras] = useState(false);
  const [showModalBebidas, setShowModalBebidas] = useState(false);
  const [hamburguesaSeleccionada, setHamburguesaSeleccionada] = useState(null);
  const [variantesHamburguesa, setVariantesHamburguesa] = useState([]);
  const [varianteElegida, setVarianteElegida] = useState(null);
  const [extrasSeleccionados, setExtrasSeleccionados] = useState([]);
  const [bebidaElegida, setBebidaElegida] = useState(null);
  
  // Usar agregarAlCarrito en lugar de aumentar
  const { carrito, cantidadHambPapas, disminuir, aumentar, eliminar, totalCarrito, cantidadBebidas, vaciarCarrito, agregarAlCarrito } = useContext(CartContext);

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

        window.open(`https://wa.me/${process.env.REACT_APP_celular}?text=${mensajeCodificado}`, "_blank");
        setDocId(doc.id)
        vaciarCarrito();

        navigate(`/ver-pedido/${doc.id}`);
      })
  }

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
        
        // Obtener extras para hamburguesas
        const extrasQuery = query(
          productosRef, 
          where("categoria", "==", "EXTRA"),
          where("tipoExtra", "==", "HAMBURGUESA"),
          where("visible", "==", true)
        );
        const extrasSnapshot = await getDocs(extrasQuery);
        const extrasData = extrasSnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        }));
        
        setExtrasHamburguesas(extrasData);
        
        // Obtener bebidas
        const bebidasQuery = query(
          productosRef, 
          where("categoria", "==", "BEBIDAS"),
          where("visible", "==", true)
        );
        const bebidasSnapshot = await getDocs(bebidasQuery);
        const bebidasData = bebidasSnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        }));
        
        setBebidasDisponibles(bebidasData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Efecto para manejar el scroll del body cuando hay modales abiertos
  useEffect(() => {
    if (showModalVariante || showModalExtras || showModalBebidas) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showModalVariante, showModalExtras, showModalBebidas]);

  if (loading) {
    return <p>Cargando...</p>;
  }

  // Función para limpiar el nombre de la hamburguesa (solo para mostrar en card)
  const limpiarNombreHamburguesa = (nombre) => {
    return nombre
      .replace(/\s+SIMPLE$/i, '')
      .replace(/\s+DOBLE$/i, '')
      .replace(/\s+TRIPLE$/i, '')
      .trim();
  };

  // Definir categorías de hamburguesas
  const categoriasHamburguesas = ["SIMPLE", "DOBLE", "TRIPLE"];

  // Función para obtener hamburguesas únicas con sus variantes
  const obtenerHamburguesasConVariantes = () => {
    const hamburguesas = productos.filter(producto => 
      categoriasHamburguesas.includes(producto.categoria)
    );
    
    // Agrupar por nombre base
    const hamburguesasMap = new Map();
    
    hamburguesas.forEach(producto => {
      const nombreBase = limpiarNombreHamburguesa(producto.descripcion);
      
      if (!hamburguesasMap.has(nombreBase)) {
        hamburguesasMap.set(nombreBase, {
          variantes: []
        });
      }
      
      hamburguesasMap.get(nombreBase).variantes.push(producto);
    });
    
    // Crear array de hamburguesas únicas (usando la versión SIMPLE para mostrar)
    const hamburguesasUnicas = [];
    
    hamburguesasMap.forEach((grupo, nombreBase) => {
      // Ordenar variantes: SIMPLE, DOBLE, TRIPLE
      const variantesOrdenadas = grupo.variantes.sort((a, b) => {
        const orden = { "SIMPLE": 1, "DOBLE": 2, "TRIPLE": 3 };
        const tipoA = a.descripcion.toUpperCase().includes("DOBLE") ? "DOBLE" : 
                     a.descripcion.toUpperCase().includes("TRIPLE") ? "TRIPLE" : "SIMPLE";
        const tipoB = b.descripcion.toUpperCase().includes("DOBLE") ? "DOBLE" : 
                     b.descripcion.toUpperCase().includes("TRIPLE") ? "TRIPLE" : "SIMPLE";
        return orden[tipoA] - orden[tipoB];
      });
      
      // Tomar la versión SIMPLE para mostrar en la card, si existe
      const productoParaMostrar = variantesOrdenadas.find(v => 
        v.descripcion.toUpperCase().includes("SIMPLE")
      ) || variantesOrdenadas[0];
      
      hamburguesasUnicas.push({
        ...productoParaMostrar,
        // En la card se muestra el nombre base (limpio)
        descripcion: nombreBase,
        nombreBase: nombreBase,
        variantes: variantesOrdenadas,
        // Mantener la descripción original para referencia
        descripcionOriginal: productoParaMostrar.descripcion
      });
    });
    
    return hamburguesasUnicas;
  };

  // Función para manejar el clic en una hamburguesa
  const handleMostrarModalHamburguesa = (hamburguesa) => {
    if (hamburguesa.variantes && hamburguesa.variantes.length > 0) {
      setHamburguesaSeleccionada(hamburguesa);
      setVariantesHamburguesa(hamburguesa.variantes);
      setVarianteElegida(hamburguesa.variantes[0]);
      setShowModalVariante(true);
    }
  };

  // Función para manejar la selección de una variante
  const handleSeleccionarVariante = (variante) => {
    setVarianteElegida(variante);
    // Mostrar modal de extras
    setShowModalVariante(false);
    setShowModalExtras(true);
    setExtrasSeleccionados([]); // Resetear extras seleccionados
  };

  // Función para manejar selección/deselección de extras
  const handleToggleExtra = (extra) => {
    setExtrasSeleccionados(prev => {
      const existe = prev.find(e => e.id === extra.id);
      if (existe) {
        // Si ya está seleccionado, quitarlo
        return prev.filter(e => e.id !== extra.id);
      } else {
        // Si no está, agregarlo
        return [...prev, extra];
      }
    });
  };

  // Función para seleccionar bebida
  const handleSeleccionarBebida = (bebida) => {
    setBebidaElegida(bebida);
  };

  // Función para volver al modal de variante
  const handleVolverAVariante = () => {
    setShowModalExtras(false);
    setShowModalVariante(true);
    // Mantener los extras seleccionados
  };

  // Función para volver al modal de extras
  const handleVolverAExtras = () => {
    setShowModalBebidas(false);
    setShowModalExtras(true);
  };

  // Función para finalizar y agregar al carrito - USAR agregarAlCarrito
  const handleFinalizarHamburguesa = () => {
    if (varianteElegida) {
      console.log("DEBUG: Agregando hamburguesa:", varianteElegida);
      
      // AGREGAR LA HAMBURGUESA - Usar agregarAlCarrito
      agregarAlCarrito(varianteElegida);
      
      // Luego agregar todos los extras seleccionados
      extrasSeleccionados.forEach(extra => {
        console.log("DEBUG: Agregando extra:", extra);
        agregarAlCarrito(extra);
      });
      
      // Mostrar modal de bebidas (opcional)
      if (bebidasDisponibles.length > 0 && cantidadBebidas() === 0) {
        setShowModalExtras(false);
        setShowModalBebidas(true);
      } else {
        handleCerrarModales();
      }
    }
  };

  // Función para agregar bebida y finalizar
  const handleAgregarBebida = () => {
    if (bebidaElegida) {
      console.log("DEBUG: Agregando bebida:", bebidaElegida);
      agregarAlCarrito(bebidaElegida);
    }
    handleCerrarModales();
  };

  // Función para saltar la selección de bebida
  const handleSaltarBebida = () => {
    handleCerrarModales();
  };

  // Función para cerrar todos los modales
  const handleCerrarModales = () => {
    setShowModalVariante(false);
    setShowModalExtras(false);
    setShowModalBebidas(false);
    setHamburguesaSeleccionada(null);
    setVarianteElegida(null);
    setExtrasSeleccionados([]);
    setBebidaElegida(null);
  };

  // Función para manejar agregar producto normal (no hamburguesa)
  const handleAgregarProductoNormal = (producto) => {
    console.log("DEBUG: Agregando producto normal:", producto);
    agregarAlCarrito(producto);
    
    // Si es un producto que requiere bebida y no hay bebidas en el carrito
    const categoriasQueRequierenBebida = ['SIMPLE', 'DOBLE', 'TRIPLE', 'CAJA PAPAS', 'POLLO CRISPY', 'NUGGETS'];
    if (categoriasQueRequierenBebida.includes(producto.categoria) && cantidadBebidas() === 0) {
      // Mostrar modal de bebidas
      setShowModalBebidas(true);
    }
  };

  // Modificar el renderizado de las cards para pasar la función correcta
  // ... (el resto del código JSX se mantiene igual hasta los modales)

  return (
    <div>
      <header>
        <img className='desktop-img logoCS' src={logo} alt="logoGarden" />
        <img className='mobile-img logoCS' src={logoMobile} alt="logoGardenMobile" />
      </header>
      <main>

        {/* ... (todo el contenido principal se mantiene igual) ... */}

        <div className='mainpageCS itemListConteiner'>
          {categorias.length > 0 && productos.length > 0 ? (
            <>
              {/* SECCIÓN DE HAMBURGUESAS (con variantes) */}
              {obtenerHamburguesasConVariantes().length > 0 && (
                <div className="w-100 d-flex flex-column align-items-center">
                  <h2 id="HAMBURGUESAS" className="w-75 tituloCategoria">HAMBURGUESAS</h2>
                  <div>
                    {obtenerHamburguesasConVariantes().map(producto => (
                      <Card 
                        key={producto.id} 
                        producto={producto}
                        onMostrarModalHamburguesa={handleMostrarModalHamburguesa}
                        onSeleccionarVariante={handleSeleccionarVariante}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* OTRAS CATEGORÍAS (excepto las de hamburguesas) */}
              {categorias.map(categoria => {
                // Saltar las categorías que ya mostramos en la sección de hamburguesas
                if (categoriasHamburguesas.includes(categoria.nombre)) {
                  return null;
                }

                const productosEnCategoria = productos.filter(
                  producto => producto.categoria === categoria.nombre
                );

                return (
                  <div className="w-100 d-flex flex-column align-items-center" key={categoria.id}>
                    {(categoria.nombre != 'EXTRA' && categoria.nombre != 'BEBIDAS') ? (
                      <>
                        <h2 id={categoria.nombre} className="w-75 tituloCategoria">{categoria.nombre}</h2>
                        <div>
                          {productosEnCategoria.length > 0 ? (
  productosEnCategoria.map(producto => (
    <Card 
      key={producto.id} 
      producto={producto}
      onMostrarModalHamburguesa={handleMostrarModalHamburguesa}
      onSeleccionarVariante={handleSeleccionarVariante}
      onAgregarProductoNormal={handleAgregarProductoNormal}
    />
  ))
) : (
  <p>No hay productos en esta categoría</p>
)}
                        </div>
                      </>
                    ) : null}
                  </div>
                );
              })}
            </>
          ) : (
            <p>No hay categorías o productos disponibles</p>
          )}
          
          <h2 id='finalizarCompra' className="w-75 tituloCategoria">Finalizar Compra</h2>
          <div className='itemsConteiner position-relative z-3'>
            {carrito.map((producto) => {
              return (
                <div className='itemCarrito' key={producto.id}>
                  <div className="imagen">
                    <img src={producto.imagen} alt="imagen" />
                  </div>
                  <div className='tituloVP'>{producto.descripcion}</div>
                  <div className='cantidad'>
                    <button className='disminuir' onClick={() => disminuir(producto)}>-</button>
                    <h4 className='numeroCantidad'>{producto.amountInCart}</h4>
                    <button className='aumentar' onClick={() => aumentar(producto)}>+</button>
                  </div>
                  <div className="precioVP">${(producto.precio * producto.amountInCart).toFixed(2)}</div>
                  <button className='eliminar' onClick={() => eliminar(producto)}>❌</button>
                </div>
              )
            })}
            
            {carrito.length > 0 ?
              <div className="d-flex flex-column align-items-center">
                <div className="m-2 fw-bold">Total: ${pagoSeleccionado === "MP" ? totalCarrito() + parseFloat(process.env.REACT_APP_recargoMP) : totalCarrito()}</div>


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
              : <><p className='error'>Sin productos seleccionados</p><a href='/crear-solicitud#HAMBURGUESAS'><p className='fw-bold'>Ir a inicio</p></a></>}
          </div>
        </div>
      </main>

      {/* Modal 1: Selección de variante (SIMPLE/DOBLE/TRIPLE) */}
      {showModalVariante && hamburguesaSeleccionada && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
          <div 
            className="modal fade show d-block" 
            style={{ zIndex: 1050 }} 
            tabIndex="-1"
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{hamburguesaSeleccionada.nombreBase}</h5>
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={handleCerrarModales}
                    aria-label="Close"
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="text-center mb-3">
                    <img 
                      src={varianteElegida?.imagen || hamburguesaSeleccionada.imagen} 
                      alt={hamburguesaSeleccionada.nombreBase}
                      style={{ width: '200px', height: '200px', objectFit: 'cover', borderRadius: '8px' }}
                    />
                  </div>
                  
                  <h6 className="text-center mb-3">Selecciona una opción:</h6>
                  
                  <div className="d-flex flex-column gap-2">
                    {variantesHamburguesa.map((variante) => {
                      // Determinar el tipo de variante
                      let tipo = "SIMPLE";
                      if (variante.descripcion.toUpperCase().includes("DOBLE")) tipo = "DOBLE";
                      if (variante.descripcion.toUpperCase().includes("TRIPLE")) tipo = "TRIPLE";
                      
                      return (
                        <div 
                          key={variante.id}
                          className={`p-3 border rounded ${varianteElegida?.id === variante.id ? 'border-primary' : ''}`}
                          style={{ 
                            cursor: 'pointer', 
                            backgroundColor: varianteElegida?.id === variante.id ? '#f8f9fa' : 'white',
                            transition: 'all 0.2s'
                          }}
                          onClick={() => setVarianteElegida(variante)}
                        >
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <strong>{tipo}</strong>
                              <div className="text-muted small">
                                {variante.descripcion}
                              </div>
                            </div>
                            <div className="text-primary fw-bold">
                              ${variante.precio.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={handleCerrarModales}>
                    Cancelar
                  </button>
                  <button type="button" className="btn btn-primary" onClick={() => handleSeleccionarVariante(varianteElegida)}>
                    Continuar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal 2: Selección de extras */}
      {showModalExtras && varianteElegida && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
          <div 
            className="modal fade show d-block" 
            style={{ zIndex: 1050 }} 
            tabIndex="-1"
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    {varianteElegida.descripcion} - Agregar extras
                  </h5>
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={handleCerrarModales}
                    aria-label="Close"
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="text-center mb-3">
                    <img 
                      src={varianteElegida.imagen} 
                      alt={varianteElegida.descripcion}
                      style={{ width: '200px', height: '200px', objectFit: 'cover', borderRadius: '8px' }}
                    />
                    <h6 className="mt-2">{varianteElegida.descripcion}</h6>
                    <p className="text-muted">${varianteElegida.precio.toFixed(2)}</p>
                  </div>
                  
                  {extrasHamburguesas.length > 0 ? (
                    <>
                      <h6 className="mb-3">Selecciona extras (opcional):</h6>
                      
                      <div className="row">
                        {extrasHamburguesas.map((extra) => {
                          const estaSeleccionado = extrasSeleccionados.find(e => e.id === extra.id);
                          
                          return (
                            <div key={extra.id} className="col-12 col-md-6 mb-3">
                              <div 
                                className={`p-3 border rounded ${estaSeleccionado ? 'border-success' : ''}`}
                                style={{ 
                                  cursor: 'pointer', 
                                  backgroundColor: estaSeleccionado ? '#f8fff9' : 'white',
                                  transition: 'all 0.2s',
                                  height: '100%'
                                }}
                                onClick={() => handleToggleExtra(extra)}
                              >
                                <div className="d-flex align-items-center">
                                  <div className="flex-shrink-0 me-3">
                                    <input 
                                      type="checkbox" 
                                      checked={estaSeleccionado}
                                      onChange={() => handleToggleExtra(extra)}
                                      style={{ cursor: 'pointer' }}
                                    />
                                  </div>
                                  <div className="flex-grow-1">
                                    <div className="d-flex justify-content-between align-items-center">
                                      <div>
                                        <strong>{extra.descripcion}</strong>
                                        {extra.ingredientes && (
                                          <div className="text-muted small mt-1">
                                            {extra.ingredientes}
                                          </div>
                                        )}
                                      </div>
                                      <div className="text-success fw-bold">
                                        ${extra.precio.toFixed(2)}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="mt-4 p-3 bg-light rounded">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <strong>Total seleccionado:</strong>
                            <div className="text-muted small">
                              {varianteElegida.descripcion}
                              {extrasSeleccionados.length > 0 && (
                                <>
                                  <br />
                                  Extras: {extrasSeleccionados.map(e => e.descripcion).join(', ')}
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-success fw-bold fs-5">
                            ${(varianteElegida.precio + extrasSeleccionados.reduce((sum, extra) => sum + extra.precio, 0)).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-4">
                      <p className="text-muted">No hay extras disponibles en este momento</p>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  {/* <button type="button" className="btn btn-secondary" onClick={handleVolverAVariante}>
                    Volver
                  </button> */}
                  <button type="button" className="btn btn-primary" onClick={handleFinalizarHamburguesa}>
                    Continuar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal 3: Selección de bebidas */}
      {showModalBebidas && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
          <div 
            className="modal fade show d-block" 
            style={{ zIndex: 1050 }} 
            tabIndex="-1"
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    Selecciona una bebida (opcional)
                  </h5>
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={handleCerrarModales}
                    aria-label="Close"
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="text-center mb-4">
                    <h6>¿Te gustaría agregar una bebida a tu pedido?</h6>
                    <p className="text-muted">Puedes seleccionar una bebida o saltar este paso</p>
                  </div>
                  
                  {bebidasDisponibles.length > 0 ? (
                    <>
                      <div className="row">
                        {bebidasDisponibles.map((bebida) => (
                          <div key={bebida.id} className="col-12 col-md-6 mb-3">
                            <div 
                              className={`p-3 border rounded ${bebidaElegida?.id === bebida.id ? 'border-primary' : ''}`}
                              style={{ 
                                cursor: 'pointer', 
                                backgroundColor: bebidaElegida?.id === bebida.id ? '#f8f9fa' : 'white',
                                transition: 'all 0.2s',
                                height: '100%'
                              }}
                              onClick={() => handleSeleccionarBebida(bebida)}
                            >
                              <div className="d-flex align-items-center">
                                <div className="flex-shrink-0 me-3">
                                  <div 
                                    className="rounded-circle"
                                    style={{
                                      width: '50px',
                                      height: '50px',
                                      backgroundImage: `url(${bebida.imagen})`,
                                      backgroundSize: 'cover',
                                      backgroundPosition: 'center'
                                    }}
                                  ></div>
                                </div>
                                <div className="flex-grow-1">
                                  <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                      <strong>{bebida.descripcion}</strong>
                                      {bebida.ingredientes && (
                                        <div className="text-muted small mt-1">
                                          {bebida.ingredientes}
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-primary fw-bold">
                                      ${bebida.precio.toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-4 p-3 bg-light rounded">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <strong>Bebida seleccionada:</strong>
                            <div className="text-muted small">
                              {bebidaElegida ? bebidaElegida.descripcion : "Ninguna"}
                            </div>
                          </div>
                          <div className="text-primary fw-bold fs-5">
                            ${bebidaElegida ? bebidaElegida.precio.toFixed(2) : "0.00"}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-4">
                      <p className="text-muted">No hay bebidas disponibles en este momento</p>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary" 
                    onClick={handleSaltarBebida}
                  >
                    Saltar
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    onClick={handleAgregarBebida}
                    disabled={!bebidaElegida}
                  >
                    {bebidaElegida ? `Agregar ${bebidaElegida.descripcion}` : 'Selecciona una bebida'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CrearSolicitud;