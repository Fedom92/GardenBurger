import React, { useContext } from 'react';
import { CartContext } from '../../context/CartContext';

export const ModalExtrasGenericos = () => {
  const {
    showModalExtrasGenericos,
    productoEnProceso,
    extrasGenericosSeleccionados,
    extrasGenericos,
    toggleExtraGenerico,
    finalizarProductoConExtras,
    cancelar
  } = useContext(CartContext);

  if (!showModalExtrasGenericos || !productoEnProceso) return null;

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
          <div className="modal-content" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <h5 className="modal-title">
                {productoEnProceso.descripcion} - Agregar extras
              </h5>
              <button 
                type="button" 
                className="btn-close" 
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
                  src={productoEnProceso.imagen} 
                  alt={productoEnProceso.descripcion}
                  style={{ width: '200px', height: '200px', objectFit: 'cover', borderRadius: '8px' }}
                /> */}
                <h6 className="mt-2">{productoEnProceso.descripcion}</h6>
                <p className="text-muted">${productoEnProceso.precio.toFixed(2)}</p>
              </div>
              
              {extrasGenericos.length > 0 ? (
                <>
                  <h6 className="mb-3">Selecciona extras (opcional):</h6>
                  
                  <div className="row">
                    {extrasGenericos.map((extra) => {
                      const estaSeleccionado = extrasGenericosSeleccionados.find(e => e.id === extra.id);
                      
                      return (
                        <div 
                          key={extra.id} 
                          className="col-12 col-md-6 mb-3"
                          onClick={() => toggleExtraGenerico(extra)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div 
                            className={`p-3 border rounded ${estaSeleccionado ? 'border-success' : ''}`}
                            style={{ 
                              backgroundColor: estaSeleccionado ? '#f8fff9' : 'white',
                              transition: 'all 0.2s',
                              height: '100%'
                            }}
                          >
                            <div className="d-flex align-items-center">
                              <div className="flex-shrink-0 me-3">
                                <div 
                                  className="d-flex align-items-center justify-content-center"
                                  style={{
                                    width: '20px',
                                    height: '20px',
                                    border: '2px solid #dee2e6',
                                    borderRadius: '4px',
                                    backgroundColor: estaSeleccionado ? '#198754' : 'white',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  {estaSeleccionado && (
                                    <span style={{ color: 'white', fontSize: '12px' }}>✓</span>
                                  )}
                                </div>
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
                </>
              ) : (
                <div className="text-center p-4">
                  <p className="text-muted">No hay extras disponibles en este momento</p>
                </div>
              )}
            </div>

            {/* Área FIJA - Resumen y botones */}
            <div className="modal-footer d-block border-top-0" style={{
              borderTop: '1px solid #dee2e6',
              backgroundColor: 'white',
              padding: '1rem',
              flexShrink: 0
            }}>
              {/* Resumen del pedido */}
              <div className="p-3 bg-light rounded mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div>
                    <strong>{productoEnProceso.descripcion}</strong>
                    <div className="text-muted small">Precio base</div>
                  </div>
                  <div className="text-primary fw-bold">
                    ${productoEnProceso.precio.toFixed(2)}
                  </div>
                </div>
                
                {extrasGenericosSeleccionados.length > 0 && (
                  <>
                    <hr className="my-2" />
                    {extrasGenericosSeleccionados.map((extra) => (
                      <div key={extra.id} className="d-flex justify-content-between align-items-center small">
                        <span>+ {extra.descripcion}</span>
                        <span className="text-success">+${extra.precio.toFixed(2)}</span>
                      </div>
                    ))}
                  </>
                )}
                
                <hr className="my-2" />
                <div className="d-flex justify-content-between align-items-center">
                  <strong>Total:</strong>
                  <strong className="text-success fs-5">
                    ${(productoEnProceso.precio + extrasGenericosSeleccionados.reduce((sum, extra) => sum + extra.precio, 0)).toFixed(2)}
                  </strong>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="d-flex justify-content-end gap-2">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={cancelar}
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={finalizarProductoConExtras}
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};