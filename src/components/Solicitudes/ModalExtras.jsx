import React, { useContext } from 'react';
import { CartContext } from '../../context/CartContext';

export const ModalExtras = () => {
  const {
    showModalExtras,
    varianteElegida,
    extrasSeleccionados,
    extrasHamburguesas,
    toggleExtra,
    volverAVariante,
    finalizarHamburguesa,
    cancelar
  } = useContext(CartContext);

  if (!showModalExtras || !varianteElegida) return null;

  return (
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
          <div className="modal-content bg-dark text-white" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <h5 className="modal-title">
                {varianteElegida.descripcion} - Agregar extras (opcional)
              </h5>
              <button 
                type="button" 
                className="btn-close btn-close-white" 
                onClick={cancelar}
                aria-label="Close"
              ></button>
            </div>
            
            {/* Área SCROLLEABLE */}
            <div className="modal-body" style={{ 
              overflowY: 'auto',
              flex: '1 1 auto',
              maxHeight: 'calc(90vh - 180px)' // Ajustado para este modal
            }}>
              <div className="text-center mb-3">
                {/* <img 
                  src={varianteElegida.imagen} 
                  alt={varianteElegida.descripcion}
                  style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px' }}
                /> */}
                <h6 className="mt-2">{varianteElegida.descripcion}</h6>
                <p className="text-white">${varianteElegida.precio}</p>
              </div>
              
              {extrasHamburguesas.length > 0 ? (
                <>                  
                  <div className="row">
                    {extrasHamburguesas.map((extra) => {
                      const estaSeleccionado = extrasSeleccionados.find(e => e.id === extra.id);
                      
                      return (
                        <div key={extra.id} className="col-12 col-md-6 mb-3">
                          <div 
                            className={`bg-dark p-3 border rounded ${estaSeleccionado ? 'border-success' : ''}`}
                            style={{ 
                              backgroundColor: estaSeleccionado ? '#f8fff9' : 'white',
                              transition: 'all 0.2s',
                              height: '100%'
                            }}
                          >
                            <div className="d-flex align-items-center">
                              <div className="flex-shrink-0 me-3">
                                <input 
                                  type="checkbox" 
                                  id={`extra-${extra.id}`}
                                  checked={!!estaSeleccionado}
                                  onChange={() => toggleExtra(extra)}
                                  style={{ 
                                    cursor: 'pointer',
                                    width: '18px',
                                    height: '18px'
                                  }}
                                />
                              </div>
                              <div className="flex-grow-1">
                                <label 
                                  htmlFor={`extra-${extra.id}`}
                                  style={{ cursor: 'pointer', margin: 0, width: '100%' }}
                                >
                                  <div className="d-flex justify-content-between align-items-center bg-dark text-white">
                                    <div>
                                      <strong>{extra.descripcion}</strong>
                                      {extra.ingredientes && (
                                        <div className="text-muted small mt-1">
                                          {extra.ingredientes}
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-white fw-bold">
                                      ${extra.precio}
                                    </div>
                                  </div>
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center p-4">
                  <p className="text-muted">No hay extras disponibles en este momento</p>
                </div>
              )}
            </div>

            {/* Área FIJA - Resumen y botones */}
            <div className="modal-footer d-block border-top-0 bg-secondary" style={{
              borderTop: '1px solid #dee2e6',
              backgroundColor: 'white',
              padding: '1rem',
              flexShrink: 0
            }}>
              {/* Resumen del pedido */}
              <div className="p-3 bg-secondary rounded mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2 bg-secondary text-white">
                  <div>
                    <strong>{varianteElegida.descripcion}</strong>
                    <div className="text-white small">Precio base</div>
                  </div>
                  <div className="text-white fw-bold">
                    ${varianteElegida.precio}
                  </div>
                </div>
                
                {extrasSeleccionados.length > 0 && (
                  <>
                    <hr className="my-2"/>
                    {extrasSeleccionados.map((extra) => (
                      <div key={extra.id} className="d-flex justify-content-between align-items-center small">
                        <span>+ {extra.descripcion}</span>
                        <span className="text-white">+${extra.precio}</span>
                      </div>
                    ))}
                  </>
                )}
                
                <hr className="my-2" />
                <div className="d-flex justify-content-between align-items-center bg-secondary text-dark">
                  <strong>Total:</strong>
                  <strong className="text-dark fs-5">
                    ${(varianteElegida.precio + extrasSeleccionados.reduce((sum, extra) => sum + extra.precio, 0))}
                  </strong>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="d-flex justify-content-between gap-2">
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={volverAVariante}
                >
                  Volver
                </button>
                <button 
                  type="button" 
                  className="btn btn-success" 
                  onClick={finalizarHamburguesa}
                >
                  Agregar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};