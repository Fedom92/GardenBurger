import React from 'react';
import './TicketImpresion.css';
import icono from "../../img/logo_blanco_corto.webp";

const TicketImpresion = ({ pedido, onClose }) => {
    if (!pedido) return null;

    const formatPrice = (price) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 2
        }).format(price);
    };

    const formatMetodoPago = (metodo) => {
        switch (metodo) {
            case 'EFECTIVO':
                return 'Efectivo';
            case 'MP':
                return 'Mercado Pago';
            case '%':
                return 'Dividido';
            default:
                return metodo;
        }
    };

    const handleImprimir = () => {
        // Crear una nueva ventana para imprimir solo el ticket
        const ventanaImpresion = window.open('', '_blank', 'width=400,height=600');

        // Obtener el contenido del ticket
        const contenidoTicket = document.getElementById('ticket-content');

        // Crear el HTML completo para la ventana de impresión
        const htmlCompleto = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Ticket - ${pedido.codigo}</title>
            </head>
            <body>
                ${contenidoTicket.innerHTML}
            </body>
            </html>
        `;

        // Escribir el contenido en la nueva ventana
        ventanaImpresion.document.write(htmlCompleto);
        ventanaImpresion.document.close();

        // Esperar a que se cargue el contenido y luego imprimir
        ventanaImpresion.onload = () => {
            ventanaImpresion.print();
            ventanaImpresion.close();
        };
    };

    return (
        <div className="ticket-overlay">
            <div className="ticket-container">
                <div className="ticket-header">
                    <h4 className='me-5'>Vista Previa</h4>
                    <div className="ticket-actions">
                        <button className="btn btn-primary" onClick={handleImprimir}>
                            <i className="fas fa-print"></i> Imprimir
                        </button>
                        <button className="btn btn-secondary" onClick={onClose}>
                            <i className="fas fa-times"></i> Cerrar
                        </button>
                    </div>
                </div>

                <div className="ticket-paper" id="ticket-content">
                    {/* Header del Ticket */}
                    <div className="ticket-header-section">
                        <div className="ticket-number">
                            Ticket# {pedido.codigo} - {pedido.fecha} {pedido.hora}
                        </div>
                        <div className="customer-name">{pedido.nombre}</div>
                        <div className="delivery-address-bold">{pedido.direccion}</div>
                        <div className="delivery-address-detail">{pedido.entrecalles}</div>
                        <div className="phone-number">{pedido.telefono}</div>
                    </div>

                    {/* Línea separadora */}
                    <div className="ticket-separator"></div>

                    {/* Encabezados de la tabla */}
                    <div className="ticket-table-header">
                        <div className="ticket-col-cant">Cant</div>
                        <div className="ticket-col-desc">Descripcion</div>
                        <div className="ticket-col-subtotal">Subtotal</div>
                    </div>

                    {/* Línea separadora */}
                    <div className="ticket-separator"></div>

                    {/* Items del pedido */}
                    <div className="ticket-items">
                        {pedido.carrito.map((item, index) => (
                            <div key={index} className="ticket-item">
                                <div className="ticket-col-cant">{item.cantidad}</div>
                                <div className="ticket-col-desc">{item.descripcion}</div>
                                <div className="ticket-col-subtotal">{formatPrice(item.subtotal)}</div>
                            </div>
                        ))}
                    </div>

                    {/* Observaciones */}
                    {pedido.observaciones && (
                        <div className="ticket-observations mt-3">
                            {pedido.observaciones}
                        </div>
                    )}

                    {/* Línea separadora */}
                    <div className="ticket-separator"></div>

                    {/* Resumen y pago */}
                    <div className="ticket-summary">
                        <div className="delivery-info">
                            Envio {pedido.envio?.zona_envio} : {formatPrice(pedido.envio?.costo_envio || 0)}
                        </div>
                        <div className="total-amount">
                            Total: {formatPrice(pedido.total)}
                        </div>
                        <div className="payment-method">
                            Metodo Pago: {formatMetodoPago(pedido.metodoPago)}
                        </div>
                    </div>

                    {/* Línea separadora */}
                    <div className="ticket-separator"></div>

                    {/* Footer del ticket */}
                    <div className="ticket-footer">
                        <div className="logo-section">
                            <div className="logo-circle">
                                <img src={icono} alt="logo" className="logo-burger" />
                            </div>
                            <div className="business-name">
                                <div className="business-name-main">GARDEN BURGER</div>
                                <div className="business-name-sub">HAMBURGUESERIA</div>
                            </div>
                        </div>
                        <div className="thank-you">
                            Gracias por su compra!
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TicketImpresion;
