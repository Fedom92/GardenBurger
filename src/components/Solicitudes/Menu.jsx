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

  return (
    <div>
      <div className="menu bebas-neue-regular" id="menu">
        <h1>GARDEN BURGER</h1>
        <h2>MENÚ</h2>

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
                                    <p>{producto.descripcion} ${producto.precio}</p>
                                  ))
                                ) : (
                                  <p>No hay productos en esta categoría</p>
                                )}
                              </div>
                            </>
                          ) : (
                            <div className="w-100 d-flex flex-column align-items-center" >
                              <h2 id={categoria.nombre} className="w-75 tituloCategoria">{categoria.nombre}</h2>
                              <div>
                                {productosEnCategoria.length > 0 ? (
                                  productosEnCategoria.map(producto => (
                                    <p>{producto.descripcion} ${producto.precio}</p>
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

        {/** FRIED ONION */}
        <div className="item">
          <h3>FRIED ONION</h3>
          <p className="desc">Pan de papa, medallón de carne 110g smasheado con cebolla, cheddar, bacon.</p>
          <div className="precios">
            <span>SIMPLE: $9.900</span>
            <span>DOBLE: $10.900</span>
            <span>TRIPLE: $11.900</span>
          </div>
        </div>

        {/** ALIOLI */}
        <div className="item">
          <h3>ALIOLI</h3>
          <p className="desc">Pan de papa, medallón de carne 110g, cheddar, bacon, salsa alioli (Mayonesa con ajo).</p>
          <div className="precios">
            <span>SIMPLE: $9.900</span>
            <span>DOBLE: $10.900</span>
            <span>TRIPLE: $11.900</span>
          </div>
        </div>

        {/** POLLO CRISPY */}
        <div className="item">
          <h3>POLLO CRISPY</h3>
          <p className="desc">Pan de papa, medallón de pollo frito, cheddar, bacon. Opcional: lechuga, tomate o salsa 1/4.</p>
          <div className="precios">
            <span>SIMPLE: $9.900</span>
            <span>DOBLE: $10.900</span>
            <span>TRIPLE: $11.900</span>
          </div>
        </div>

        {/** TASTY */}
        <div className="item">
          <h3>TASTY</h3>
          <p className="desc">Pan de papa, medallón de carne 110g, cheddar, bacon, salsa TASTY, lechuga y tomate. Opcional sin vegetales.</p>
          <div className="precios">
            <span>SIMPLE: $10.400</span>
            <span>DOBLE: $11.400</span>
            <span>TRIPLE: $12.400</span>
          </div>
        </div>

        {/** EXTRAS */}
        <div className="extras">
          <h3>EXTRAS</h3>
          <ul>
            <li>Cheddar y bacon en papas $2.000</li>
            <li>Cheddar en papas $1.500</li>
            <li>Fileta de Cheddar $1.500</li>
            <li>Fileta de alioli $1.500</li>
            <li>Feta de Cheddar $300</li>
            <li>Salsa alioli $400</li>
            <li>Carne extra $1.600</li>
            <li>Huevo $400</li>
          </ul>
        </div>

        <div className="footer">
          TODOS LOS COMBOS INCLUYEN PAPAS<br />
          📍 Leonardo Da Vinci 4225
        </div>
      </div>

      <button className="pdf-button" onClick={exportarPDF}>Exportar a PDF</button>
    </div>
  );
};

export default Menu;