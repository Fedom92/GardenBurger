import React, { useContext } from 'react';
import { CartContext } from '../../context/CartContext';

export const ModalBebidas = () => {
  const {
    hamburguesaSeleccionada,
    showModalBebidas,
    bebidaElegida,
    bebidasDisponibles,
    seleccionarBebida,
    agregarBebidaYFinalizar,
    agregarBebidaYFinalizarConExtrasGenericos,
    saltarBebida,
    volverAExtras,
    volverAExtrasGenerico,
    cerrarModales
  } = useContext(CartContext);

  if (!showModalBebidas) return null;

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
                Selecciona una bebida (opcional)
              </h5>
              <button 
                type="button" 
                className="btn-close" 
                onClick={cerrarModales}
                aria-label="Close"
              ></button>
            </div>
            
            {/* Área SCROLLEABLE */}
            <div className="modal-body" style={{ 
              overflowY: 'auto',
              flex: '1 1 auto',
              paddingBottom: '0.5rem'
            }}>
              <div className="text-center mb-4">
                <h6>¿Te gustaría agregar una bebida a tu pedido?</h6>
                <p className="text-muted">Puedes seleccionar una bebida o saltar este paso</p>
              </div>
              
              {bebidasDisponibles.length > 0 ? (
                <div className="row mb-3">
                  {bebidasDisponibles.map((bebida) => (
                    <div key={bebida.id} className="col-12 col-md-6 mb-3">
                      <div 
                        className={`p-3 border rounded ${bebidaElegida?.id === bebida.id ? 'border-primary' : ''}`}
                        style={{ 
                          cursor: 'pointer', 
                          backgroundColor: bebidaElegida?.id === bebida.id ? '#f8f9fa' : 'white',
                          transition: 'all 0.2s',
                          height: '100%'
                        }}
                        onClick={() => seleccionarBebida(bebida)}
                      >
                        <div className="d-flex align-items-center">
                          <div className="flex-shrink-0 me-3">
                            <div 
                              className="rounded-circle"
                              style={{
                                width: '50px',
                                height: '50px',
                                backgroundImage: `url(${bebida.imagen})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center'
                              }}
                            ></div>
                          </div>
                          <div className="flex-grow-1">
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <strong>{bebida.descripcion}</strong>
                                {bebida.ingredientes && (
                                  <div className="text-muted small mt-1">
                                    {bebida.ingredientes}
                                  </div>
                                )}
                              </div>
                              <div className="text-primary fw-bold">
                                ${bebida.precio.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-4">
                  <p className="text-muted">No hay bebidas disponibles en este momento</p>
                </div>
              )}
            </div>

            {/* Área FIJA de botones */}
            <div className="p-3 border-top" style={{
              backgroundColor: 'white',
              flexShrink: 0
            }}>
              {/* Detalle rápido (opcional) */}
              {bebidaElegida && (
                <div className="small text-muted mb-2">
                  Seleccionado: <strong>{bebidaElegida.descripcion}</strong> - ${bebidaElegida.precio.toFixed(2)}
                </div>
              )}
              
              <div className="d-flex justify-content-between gap-2">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={hamburguesaSeleccionada ? volverAExtras : volverAExtrasGenerico}
                >
                  Volver
                </button>
                <div className="d-flex gap-2">
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary" 
                    onClick={saltarBebida}
                  >
                    Saltar
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    disabled={!bebidaElegida}
                    onClick={hamburguesaSeleccionada ? agregarBebidaYFinalizar : agregarBebidaYFinalizarConExtrasGenericos}
                  >
                    {bebidaElegida ? `Agregar ($${bebidaElegida.precio.toFixed(2)})` : 'Agregar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};