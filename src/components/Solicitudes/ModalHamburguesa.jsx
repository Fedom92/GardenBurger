import React, { useContext } from 'react';
import { CartContext } from '../../context/CartContext';

export const ModalHamburguesa = () => {
  const {
    showModalVariante,
    hamburguesaSeleccionada,
    variantesHamburguesa,
    varianteElegida,
    setVarianteElegida,
    seleccionarVariante,
    cancelar
  } = useContext(CartContext);

  if (!showModalVariante || !hamburguesaSeleccionada) return null;

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
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <h5 className="modal-title">{hamburguesaSeleccionada.nombreBase}</h5>
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
              maxHeight: 'calc(90vh - 130px)' // Ajustado para este modal
            }}>
              <div className="text-center mb-3">
                <img 
                  src={varianteElegida?.imagen || hamburguesaSeleccionada.imagen} 
                  alt={hamburguesaSeleccionada.nombreBase}
                  style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px' }}
                />
              </div>
              
              <h6 className="text-center mb-3">Selecciona una opción:</h6>
              
              <div className="d-flex flex-column gap-2">
                {variantesHamburguesa.map((variante) => {
                  let tipo = "SIMPLE";
                  if (variante.descripcion.toUpperCase().includes("DOBLE")) tipo = "DOBLE";
                  if (variante.descripcion.toUpperCase().includes("TRIPLE")) tipo = "TRIPLE";
                  
                  return (
                    <div 
                      key={variante.id}
                      className={`p-3 border rounded ${varianteElegida?.id === variante.id ? 'border-primary' : ''}`}
                      style={{ 
                        cursor: 'pointer', 
                        backgroundColor: varianteElegida?.id === variante.id ? '#f8f9fa' : 'white',
                        transition: 'all 0.2s'
                      }}
                      onClick={() => setVarianteElegida(variante)}
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

            {/* Área FIJA - Resumen y botones */}
            <div className="modal-footer d-block border-top-0" style={{
              borderTop: '1px solid #dee2e6',
              backgroundColor: 'white',
              padding: '1rem',
              flexShrink: 0
            }}>
              {/* Resumen de selección */}
              {varianteElegida && (
                <div className="p-2 bg-light rounded mb-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <strong>Seleccionado:</strong>
                      <div className="text-muted small">
                        {varianteElegida.descripcion}
                      </div>
                    </div>
                    <div className="text-primary fw-bold">
                      ${varianteElegida.precio.toFixed(2)}
                    </div>
                  </div>
                </div>
              )}

              {/* Botones de acción */}
              <div className="d-flex justify-content-between gap-2">
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
                  onClick={() => seleccionarVariante(varianteElegida)}
                  disabled={!varianteElegida}
                >
                  Continuar {varianteElegida ? `($${varianteElegida.precio.toFixed(2)})` : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};