import React, { useState, useEffect } from "react";
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
          <Link to={`/ver-pedido`}>Ver pedido</Link>
          <div className="d-flex justify-content-center">
            <i className="fa fa-motorcycle m-1" aria-hidden="true"></i>
            <h5>Envios a domicilio</h5>
          </div>
        </section>

        <div className='mainpageCS itemListConteiner'>
          {categorias.length > 0 && productos.length > 0 ? (
            categorias.map(categoria => {
              const productosEnCategoria = productos.filter(
                producto => producto.categoria === categoria.nombre //categoria
              );

              return (
                <div className="w-100 d-flex flex-column align-items-center" key={categoria.id}>
                  <h2 className="w-75 tituloCategoria">{categoria.nombre}</h2>
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
              );
            })
          ) : (
            <p>No hay categorías o productos disponibles</p>
          )}
        </div>
      </main>
    </div>
  );
};

export default CrearSolicitud;