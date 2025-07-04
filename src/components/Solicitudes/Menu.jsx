import React, { useState, useEffect } from "react";
import { collection, getDocs, } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import 'moment/locale/es';
import { Card } from "./Card.jsx"
import logo from '../../img/logo_negro3.png';
import logoMobile from '../../img/logo_negro.webp';
import './menu.css';
import html2pdf from 'html2pdf.js';


const Menu = () => {
  const exportarPDF = () => {
    const elemento = document.getElementById('menu');
    html2pdf().from(elemento).set({
      margin: 10,
      filename: 'menu_garden_burger.pdf',
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'portrait' }
    }).save();
  };

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

  const categoriasEspeciales = ["SIMPLE", "DOBLE", "TRIPLE"];

  const hamburguesas = productos
    .filter(p => categoriasEspeciales.includes(p.categoria))
    .reduce((acum, product) => {
      const descripcionSimple = product.descripcion.replace(/ (SIMPLE|DOBLE|TRIPLE)$/, "").trim();
      if (!acum[descripcionSimple]) {
        acum[descripcionSimple] = { descripcion: descripcionSimple, ingredientes: product.ingredientes, variantes: {} };
      }
      acum[descripcionSimple].variantes[product.categoria] = product.precio;
      return acum;
    }, {});

  return (
    <div>
      <div className="menu bebas-neue-regular" id="menu">
        <h1>GARDEN BURGER</h1>
        <h2>MENÚ</h2>

        {productos.length === 0 || categorias.length === 0 ? (
          <p>No hay categorías o productos disponibles</p>
        ) : (
          <>
            {/* Hamburguesas */}
            <div className="w-100 d-flex flex-column align-items-center">
              <h2 id="hamburguesas" className="w-75 tituloCategoria">HAMBURGUESAS</h2>
              <div className="items">
                {Object.entries(hamburguesas).map(([key, data]) => (
                  <div className="item" key={key}>
                    <h3>{data.descripcion}</h3>
                    {data.ingredientes && <p className="desc">{data.ingredientes}</p>}
                    <div className="precios">
                      {categoriasEspeciales.map(cat =>
                        data.variantes[cat] ? (
                          <span key={cat}>
                            {cat}: ${data.variantes[cat].toLocaleString("es-AR")}
                          </span>
                        ) : null
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resto de categorías */}
            {categorias.map(categoria => {
              if (categoriasEspeciales.includes(categoria.nombre)) return null;

              const productosEnCategoria = productos.filter(p => p.categoria === categoria.nombre);

              return (
                <div className="w-100 d-flex flex-column align-items-center" key={categoria.id}>
                  <h2 id={categoria.nombre} className="w-75 tituloCategoria">{categoria.nombre}</h2>
                  <div>
                    {productosEnCategoria.length > 0 ? (
                      productosEnCategoria.map(prod => (
                        <div key={prod.id}>
                          {prod.ingredientes && <p className="desc">{prod.ingredientes}</p>}
                          <p>{prod.descripcion} ${prod.precio.toLocaleString("es-AR")}</p>
                        </div>
                      ))
                    ) : (
                      <p>No hay productos en esta categoría</p>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      <div className="footer">
        TODOS LOS COMBOS INCLUYEN PAPAS<br />
        📍 Leonardo Da Vinci 4225
      </div>

      <button className="pdf-button" onClick={exportarPDF}>Exportar a PDF</button>
    </div>
  );
}
export default Menu;