import React, { useState, useContext, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CartContext } from '../../context/CartContext'

export const Card = ({ producto, onMostrarModalHamburguesa, onSeleccionarVariante, onAgregarProductoNormal }) => {
  const { agregarAlCarrito } = useContext(CartContext);
  const [showModalLocal, setShowModalLocal] = useState(false);
  const [variantesLocal, setVariantesLocal] = useState([]);
  const [varianteElegidaLocal, setVarianteElegidaLocal] = useState(null);

  // Función para limpiar el nombre de la hamburguesa
  const limpiarNombreHamburguesa = (nombre) => {
    return nombre
      .replace(/\s+SIMPLE$/i, '')
      .replace(/\s+DOBLE$/i, '')
      .replace(/\s+TRIPLE$/i, '')
      .trim();
  };

  // Determinar si es una hamburguesa (SIMPLE, DOBLE, TRIPLE)
  const categoriasHamburguesas = ["SIMPLE", "DOBLE", "TRIPLE"];
  const esHamburguesa = categoriasHamburguesas.includes(producto.categoria);
  
  // Obtener nombre para mostrar en la card
  const nombreMostrar = esHamburguesa ? 
    limpiarNombreHamburguesa(producto.descripcion) : 
    producto.descripcion;

  const handleAgregar = () => {
    if (esHamburguesa && producto.variantes) {
      // Si tiene variantes, mostrar modal local o llamar al callback
      if (producto.variantes.length > 0) {
        setVariantesLocal(producto.variantes);
        setVarianteElegidaLocal(producto.variantes[0]);
        setShowModalLocal(true);
        // Prevenir scroll del body
        document.body.style.overflow = 'hidden';
      } else if (onMostrarModalHamburguesa) {
        onMostrarModalHamburguesa(producto);
      }
    } else if (esHamburguesa && onMostrarModalHamburguesa) {
      // Si es hamburguesa pero no tenemos las variantes aquí, llamar al callback
      onMostrarModalHamburguesa(producto);
    } else {
      // Producto normal, usar la función específica si está disponible
      if (onAgregarProductoNormal) {
        onAgregarProductoNormal(producto);
      } else {
        agregarAlCarrito(producto);
      }
    }
  };

  const handleAgregarVariante = () => {
    if (varianteElegidaLocal) {
      // Llamar al callback para mostrar modal de extras
      if (onSeleccionarVariante) {
        onSeleccionarVariante(varianteElegidaLocal);
      }
      // Cerrar modal local
      handleCerrarModal();
    }
  };

  const handleCerrarModal = () => {
    setShowModalLocal(false);
    // Restaurar scroll del body
    document.body.style.overflow = 'auto';
  };

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Asegurarse de restaurar el scroll si el componente se desmonta
      document.body.style.overflow = 'auto';
    };
  }, []);

  return (
    <>
      <div className='cardCS'>
        <div className="cardColumnCS m-3">
          <Link to={`/item/${producto.id}`} className='text-decoration-none'>
            <p className='titulo'>{nombreMostrar}</p>
          </Link>
          <p className="ingredientes">{producto.ingredientes}</p>
          <div className="cardRowCS">
            <div className="imagenCS">
              <img src={producto.imagen} alt={nombreMostrar} loading="lazy" />
            </div>
            <div className="cardColumnCS m-3">
              <p className="precio">${(producto.precio).toFixed(2)}</p>
              <button className='btnVerde' onClick={handleAgregar}>
                Agregar al pedido
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal local para hamburguesas (variante SIMPLE/DOBLE/TRIPLE) */}
      {showModalLocal && variantesLocal.length > 0 && (
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
                  <h5 className="modal-title">{nombreMostrar}</h5>
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={handleCerrarModal}
                    aria-label="Close"
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="text-center mb-3">
                    <img 
                      src={varianteElegidaLocal?.imagen || producto.imagen} 
                      alt={nombreMostrar}
                      style={{ width: '200px', height: '200px', objectFit: 'cover', borderRadius: '8px' }}
                    />
                  </div>
                  
                  <h6 className="text-center mb-3">Selecciona una opción:</h6>
                  
                  <div className="d-flex flex-column gap-2">
                    {variantesLocal.map((variante) => {
                      // Determinar el tipo de variante
                      let tipo = "SIMPLE";
                      if (variante.descripcion.toUpperCase().includes("DOBLE")) tipo = "DOBLE";
                      if (variante.descripcion.toUpperCase().includes("TRIPLE")) tipo = "TRIPLE";
                      
                      return (
                        <div 
                          key={variante.id}
                          className={`p-3 border rounded ${varianteElegidaLocal?.id === variante.id ? 'border-primary' : ''}`}
                          style={{ 
                            cursor: 'pointer', 
                            backgroundColor: varianteElegidaLocal?.id === variante.id ? '#f8f9fa' : 'white',
                            transition: 'all 0.2s'
                          }}
                          onClick={() => setVarianteElegidaLocal(variante)}
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
                  <button type="button" className="btn btn-secondary" onClick={handleCerrarModal}>
                    Cancelar
                  </button>
                  <button type="button" className="btn btn-primary" onClick={handleAgregarVariante}>
                    Continuar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}