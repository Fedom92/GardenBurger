import React from 'react';
import './TicketImpresion.css';
import icono from "../../img/logo_blanco_corto.webp";
import moment from "moment";

const TicketImpresion = ({ pedido, pedidos, onClose }) => {
    const isMultiple = Array.isArray(pedidos);
    const list = isMultiple ? pedidos : (pedido ? [pedido] : []);

    if (list.length === 0) return null;

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

        // Obtener los estilos del documento actual
        const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
            .map(el => el.outerHTML)
            .join('\n');

        // Crear el HTML completo para la ventana de impresión
        const htmlCompleto = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${isMultiple ? 'Todos los Pedidos' : `Ticket - ${pedido?.codigo || 'Multi'}`}</title>
                ${styles}
                <style>
                    body { margin: 0; padding: 10px; }
                    @media print {
                        .ticket-single-print { page-break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                ${contenidoTicket.outerHTML}
            </body>
            </html>
        `;

        // Escribir el contenido en la nueva ventana
        ventanaImpresion.document.write(htmlCompleto);
        ventanaImpresion.document.close();

        // Esperar un breve momento para asegurar renderizado correcto antes de imprimir
        setTimeout(() => {
            ventanaImpresion.print();
            ventanaImpresion.close();
        }, 300);
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
                    {list.map((p, idx) => (
                        <div key={p.id || idx} className="ticket-single-print" style={idx > 0 ? { marginTop: '40px', borderTop: '2px dashed #000', paddingTop: '40px', pageBreakBefore: 'always' } : {}}>
                            {/* Header del Ticket */}
                            <div className="ticket-header-section">
                                <div className="ticket-number">
                                    Ticket# {p.codigo} - {moment(p.timestamp?.toDate()).format("DD/MM/YYYY HH:mm")}
                                </div>
                                <div className="customer-name">{p.nombre}</div>
                                <div className="delivery-address-bold">{p.direccion}</div>
                                <div className="delivery-address-detail">{p.entrecalles}</div>
                                <div className="phone-number">{p.telefono}</div>
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
                                {p.carrito.map((item, index) => (
                                    <div key={index} className="ticket-item">
                                        <div className="ticket-col-cant">{item.cantidad}</div>
                                        <div className="ticket-col-desc">{item.descripcion}</div>
                                        <div className="ticket-col-subtotal">{formatPrice(item.subtotal)}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Observaciones */}
                            {p.observaciones && (
                                <div className="ticket-observations mt-3">
                                    {p.observaciones}
                                </div>
                            )}

                            {/* Línea separadora */}
                            <div className="ticket-separator"></div>

                            {/* Resumen y pago */}
                            <div className="ticket-summary">
                                <div className="delivery-info">
                                    Envio {p.envio?.zona_envio} : {formatPrice(p.envio?.costo_envio || 0)}
                                </div>
                                <div className="total-amount">
                                    Total: {formatPrice(p.total)}
                                </div>
                                <div className="payment-method">
                                    Metodo Pago: {formatMetodoPago(p.metodoPago)}
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
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TicketImpresion;
