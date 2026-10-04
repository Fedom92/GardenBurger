import React, { useContext } from 'react'
import { CartContext } from '../../context/CartContext'
import { CATEGORIAS_HAMBURGUESA } from '../../Utils/Constantes'
import { fmtPesos } from "../../Utils/formato";

export const Card = ({ producto }) => {
  const { 
    agregarProductoNormal,
    iniciarSeleccionHamburguesa,
    limpiarNombreHamburguesa,
    aumentarGrupo,
    agregarAlCarrito,
  } = useContext(CartContext);

  // Determinar si es una hamburguesa
  const esHamburguesa = CATEGORIAS_HAMBURGUESA.includes(producto.categoria);
  
  // Obtener nombre para mostrar en la card
  const nombreMostrar = esHamburguesa ? 
    limpiarNombreHamburguesa(producto.descripcion) : 
    producto.descripcion;

  const handleAgregar = () => {
    if (esHamburguesa && producto.variantes) {
      aumentarGrupo();
      iniciarSeleccionHamburguesa(producto);
    } else if (producto.categoria === 'BEBIDAS') {
      // Las bebidas se agregan directamente (se consolidan si ya están en carrito)
      agregarAlCarrito(producto);
    } else {
      aumentarGrupo();
      agregarProductoNormal(producto);
    }
  };

  return (
    <div className='cardCS'>
      <div className="cardColumnCS m-3">
        <p className='titulo'>{nombreMostrar}</p>
        <p className="ingredientes">{producto.ingredientes}</p>
        <div className="cardRowCS">
          <div className="imagenCS btn">
            <img src={producto.imagen} alt={nombreMostrar} loading="lazy" onClick={handleAgregar}/>
          </div>
          <div className="cardColumnCS m-3">
            <p className="precio">{fmtPesos(producto.precio)}</p>
            <button type='button' className='btn btn-success' onClick={handleAgregar}>
              Agregar al pedido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};