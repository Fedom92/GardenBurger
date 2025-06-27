import React, { useState, useEffect, useContext } from "react";
import { CartContext } from '../../context/CartContext.jsx'
import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import { Link } from 'react-router-dom';
import { Modal } from "react-bootstrap";
import moment from "moment";
import 'moment/locale/es';
import Swal from "sweetalert2";
import { Card } from "./Card.jsx"
import logo from '../../img/logo_negro3.png';
import logoMobile from '../../img/logo_negro.webp';
import { useForm } from 'react-hook-form'

// const CrearSolicitud = () => {

//   let [categorias, setCategorias] = useState([]);
//   let [productos, setProductos] = useState([]);

//    useEffect(() => {

//   const categoriasRef = collection(db, "categorias");

//       getDocs(categoriasRef)
//       .then((res)=>{
//         setCategorias(res.docs.map((doc)=>{
//           console.log({...doc.data(),id:doc.id})
//           return {...doc.data(), id:doc.id}
//         }))
//       })

//     }, []);

//   useEffect(() => {


//     const productosRef = collection(db, "productos");
//     const q = productosRef;
//     // const q = categoryId?query(productosRef, where("category", "==" , categoryId.toUpperCase())):productosRef;


//     getDocs(q)
//       .then((res)=>{
//         setProductos(res.docs.map((doc)=>{
//           console.log({...doc.data(),id:doc.id})
//           return {...doc.data(), id:doc.id}
//         }))
//       })

//     }, []);




//   return (
//   <div>
//     <header>
//       <img className='logoCS' src={logo} alt="logoGarden" />
//     </header>
//     <main>
//       <section>
//         <h3>Leonardo Da Vinci 4225 - Gregorio de Laferrere</h3>
//         <h6>La Matanza, La Matanza (Buenos Aires)</h6>

//       </section>
//     <div className='mainpageCS itemListConteiner'>
//       {
//         categorias.length >0? 
//         categorias.map(categoria=>{
//           productos.length > 0? 
//           productos.map(producto=>{
//             console.log(producto.categoria)
//             console.log(categoria.nombre)
//             if(producto.categoria === categoria.nombre){


//               console.log("match")
//             return <Card key={producto.id} producto={producto} />
//             }
//           })
//           : <p>Cargando...</p>

//         }

//         )

//         : <p>Cargando...</p>

//       }   
//     </div>
//     </main>
//   </div>
//   )

// }

// export default CrearSolicitud;


const CrearSolicitud = () => {
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const { carrito, cantidadHambPapas, disminuir, aumentar, eliminar, totalCarrito, cantidadBebidas, vaciarCarrito } = useContext(CartContext);

  //registro
  const { register, handleSubmit } = useForm();

  let [docId, setDocId] = useState("");

  const comprar = (data) => {
    const pedido = {
      cliente: data,
      productos: carrito,
      total: totalCarrito(),
      estado: "generada"
    }

    const pedidosRef = collection(db, "pedidos")

    addDoc(pedidosRef, pedido)
      .then((doc) => {
        setDocId(doc.id)
        vaciarCarrito();
      })

  }
  //fin registro

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Obtener categorías
        const categoriasRef = collection(db, "categorias");
        const categoriasSnapshot = await getDocs(categoriasRef);
        const categoriasData = categoriasSnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        }));

        // Obtener productos
        const productosRef = collection(db, "productos");
        const productosSnapshot = await getDocs(productosRef);
        const productosData = productosSnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        }));

        //     const categoriasData = [
        //   ...new Set(productosData.map((producto) => producto.categoria)),
        // ];

        const categoriasDataOrdenada = categoriasSnapshot.docs
          .map(doc => ({
            ...doc.data(),
            id: doc.id
          }))
          .sort((a, b) => a.nroOrden - b.nroOrden);


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
          <div className="d-flex justify-content-center">
            <i className="fa fa-map-marker m-1" aria-hidden="true"></i>
            <h5>Leonardo Da Vinci 4225 - Gregorio de Laferrere</h5>
          </div>
          <h6>La Matanza, La Matanza (Buenos Aires)</h6>
          {carrito.length > 0 &&
            <div className="position-fixed bottom-0 end-0 z-2 m-3">
              <a href='/crear-solicitud#finalizarCompra' className="btnVerde p-3">Ver pedido
                <i className="fa fa-arrow-down ms-2 animated-arrow" aria-hidden="true"></i>
              </a>
            </div>}
          <div className="d-flex justify-content-center">
            <i className="fa fa-motorcycle m-1" aria-hidden="true"></i>
            <h5>Envios a domicilio</h5>
          </div>
        </section>


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
                  {categoria.nombre != 'EXTRA' ? (
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
                <div className="m-2 fw-bold">Total: ${totalCarrito()}</div>
                {cantidadBebidas() === 0 &&
                  <a className="m-2" href="#BEBIDAS">No te olvides de agregar tu bebida! Hacé click aquí</a>}

                <form className='formulario w-75' onSubmit={handleSubmit(comprar)}>
                  <input type="text" placeholder='Ingrese su nombre' {...register("nombre", { required: true })} required/>
                  <input type="email" placeholder='Ingrese su e-mail' {...register("email", { required: true })} required />
                  <input type="tel" id="telefono" placeholder='Ingrese su número de teléfono' {...register("telefono", { required: true })} required />
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