import React, { useState, useContext } from 'react';
import { CartContext } from '../../context/CartContext';
import { set } from 'react-hook-form';

export const ModalHamburguesa = () => {
  const {
    showModalVariante,
    hamburguesaSeleccionada,
    variantesHamburguesa,
    seleccionarVariante,
    cancelar
  } = useContext(CartContext);
  const [observacionesLocales, setObservacionesLocales] = useState("");

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
          <div className="modal-content bg-dark text-white" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} data-bs-theme="dark">
            <div className="modal-header">
              <h5 className="modal-title">{hamburguesaSeleccionada.nombreBase} - Elige tu opción:</h5>
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
              maxHeight: 'calc(90vh - 130px)'
            }}>
              <div className="text-center mb-3">
                <img 
                  src={hamburguesaSeleccionada.imagen} 
                  alt={hamburguesaSeleccionada.nombreBase}
                  style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px' }}
                />
              </div>

              <div className="mb-4">
                <label className="form-label text-white-50">Observaciones (opcional)</label>
                <input
                  type="text"
                  className="form-control bg-dark text-white border-secondary"
                  placeholder="Ej: sin cebolla, bien cocida..."
                  value={observacionesLocales}
                  onChange={(e) => setObservacionesLocales(e.target.value)}
                />
              </div>
              
              <div className="d-flex flex-column gap-3">
                {variantesHamburguesa.map((variante) => {
                  let tipo = "SIMPLE";
                  if (variante.descripcion.toUpperCase().includes("DOBLE")) tipo = "DOBLE";
                  if (variante.descripcion.toUpperCase().includes("TRIPLE")) tipo = "TRIPLE";
                  
                  return (
                    <button 
                      key={variante.id}
                      type="button" 
                      className="btn btn-secondary btn-lg w-100"
                      onClick={() => {seleccionarVariante(variante, observacionesLocales);setObservacionesLocales('')}}
                      style={{ padding: '1rem' }}
                    >
                      <div className="d-flex justify-content-between align-items-center w-100">
                        <span className="fw-bold fs-5">{tipo}</span>
                        <span className="fw-bold fs-5">${variante.precio}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Área FIJA - Solo botón cancelar */}
            <div className="modal-footer d-block border-top-0" style={{
              borderTop: '1px solid #dee2e6',
              padding: '1rem',
              flexShrink: 0
            }}>
              <div className="d-grid d-flex justify-content-between gap-2">
                <button 
                  type="button" 
                  className="btn btn-danger btn-lg" 
                  onClick={cancelar}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};