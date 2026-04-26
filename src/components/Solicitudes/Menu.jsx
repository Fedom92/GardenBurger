import React, { useState, useEffect, useRef, useCallback } from "react";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
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

  const productosCollection = useRef(query(collection(db, "productos"), where("visible", "==", true)));
  const categoriasCollection = useRef(query(collection(db, "categorias"), orderBy("nroOrden", "asc")));

  const getData = useCallback(async (queryRef, setter) => {
    const snapshot = await getDocs(queryRef);
    const dataArray = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    setter(dataArray);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        await getData(productosCollection.current, setProductos);
        await getData(categoriasCollection.current, setCategorias);
        
      } catch (error) {
        alert("Error al cargar los datos.");
        console.error("Error fetching data Menu:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [getData]);

  if (loading) {
    return <p>Cargando...</p>;
  }

  const categoriasEspeciales = ["SIMPLE", "DOBLE", "TRIPLE"];

  const hamburguesasObj = productos
    .filter(p => categoriasEspeciales.includes(p.categoria))
    .reduce((acum, product) => {
      const descripcionSimple = product.descripcion.replace(/ (SIMPLE|DOBLE|TRIPLE)$/, "").trim();
      if (!acum[descripcionSimple]) {
        acum[descripcionSimple] = { descripcion: descripcionSimple, ingredientes: product.ingredientes, carnes_precios: {} };
      }
      acum[descripcionSimple].carnes_precios[product.categoria] = product.precio;
      return acum;
    }, {});

  const hamburguesas = Object.values(hamburguesasObj);

  return (
    <div className="menu_publico">
      <div className="menu_carta bebas-neue-regular" id="menu">
        <h1 className="titulo_menu">GARDEN BURGER</h1>
        <h2 className="subtitulo_menu">MENÚ</h2>

        {productos.length === 0 || categorias.length === 0 ? (
          <p>No hay categorías o productos disponibles</p>
        ) : (
          <>
            {/* Hamburguesas */}
            <div className="w-100 d-flex flex-column align-items-center">
              <h2 id="hamburguesas" className="w-75 tituloCategoria_menu">HAMBURGUESAS</h2>
              <div className="items_menu">
                {hamburguesas.map((data, index) => (
                  <div className="item_menu" key={index}>
                    <h3>{data.descripcion}</h3>
                    {data.ingredientes && <p className="desc_menu">{data.ingredientes}</p>}
                    <div className="precios">
                      {categoriasEspeciales.map(cat =>
                        data.carnes_precios[cat] ? (
                          <span key={cat}>
                            {cat}: ${data.carnes_precios[cat].toLocaleString("es-AR")}
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
                  <h2 id={categoria.nombre} className="w-75 tituloCategoria_menu">{categoria.nombre}</h2>
                  <div>
                    {productosEnCategoria.length > 0 ? (
                      productosEnCategoria.map(prod => (
                        <div key={prod.id}>
                          {prod.ingredientes && <p className="desc_menu">{prod.ingredientes}</p>}
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