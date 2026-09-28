import React, { useState, useEffect, useRef, useCallback } from "react";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import { fetchMenuPublico } from "../../Utils/menuPublico";
import { fmtPesos } from "../../Utils/formato";
import { CATEGORIAS_HAMBURGUESA, CATEGORIAS_SOLO_CAJA } from "../../Utils/Constantes";
import 'moment/locale/es';
import './menu.css';


const Menu = () => {
  // html2pdf (y jspdf debajo) solo sirven para este botón y arrastran un advisory
  // crítico: se cargan recién al tocarlo, no con la página pública.
  const exportarPDF = async () => {
    try {
      const { default: html2pdf } = await import('html2pdf.js');
      const elemento = document.getElementById('menu');
      await html2pdf().from(elemento).set({
        margin: 10,
        filename: 'menu_garden_burger.pdf',
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait' }
      }).save();
    } catch (error) {
      console.error("Error exportando el menú a PDF:", error);
      alert("No se pudo generar el PDF. Revisá la conexión e intentá de nuevo.");
    }
  };

  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  // Vienen dentro de menu.json, así que el pie muestra las direcciones sin pagar
  // una lectura de Firestore por visita.
  const [sucursales, setSucursales] = useState([]);
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
        // JSON estático publicado desde Productos: cero lecturas de Firestore
        const menu = await fetchMenuPublico();
        setProductos(menu.productos);
        setCategorias(menu.categorias);
        // `sucursales` recién se agregó al JSON: un menu.json publicado antes no
        // la trae, y el pie simplemente no las muestra hasta que se republique.
        setSucursales(menu.sucursales || []);
      } catch (errorMenu) {
        console.warn("menu.json no disponible, fallback a Firestore:", errorMenu);
        try {
          // Mismo filtro que al publicar menu.json: lo de empleados no es para la web.
          await getData(productosCollection.current, (lista) => setProductos(lista.filter((p) => !CATEGORIAS_SOLO_CAJA.includes(p.categoria))));
          await getData(categoriasCollection.current, (lista) => setCategorias(lista.filter((c) => !CATEGORIAS_SOLO_CAJA.includes(c.nombre))));
        } catch (error) {
          alert("Error al cargar los datos.");
          console.error("Error fetching data Menu:", error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [getData]);

  if (loading) {
    return <p>Cargando...</p>;
  }

  // Las variantes salen de la constante compartida: acá estaban duplicadas y una
  // categoría nueva habría que agregarla en dos lugares.
  const categoriasEspeciales = CATEGORIAS_HAMBURGUESA;
  const regexVariante = new RegExp(` (${CATEGORIAS_HAMBURGUESA.join("|")})$`);

  const hamburguesasObj = productos
    .filter(p => categoriasEspeciales.includes(p.categoria))
    .reduce((acum, product) => {
      const descripcionSimple = product.descripcion.replace(regexVariante, "").trim();
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
                            {cat}: {fmtPesos(data.carnes_precios[cat])}
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
                          <p>{prod.descripcion} {fmtPesos(prod.precio)}</p>
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
        TODOS LOS COMBOS INCLUYEN PAPAS
        {sucursales.map(s => (
          <span key={s.id}>
            <br />📍 {s.nombre}{s.direccion ? ` — ${s.direccion}` : ""}
          </span>
        ))}
      </div>

      <button className="pdf-button" onClick={exportarPDF}>Exportar a PDF</button>
    </div>
  );
}
export default Menu;