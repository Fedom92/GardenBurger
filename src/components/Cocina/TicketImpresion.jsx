import React from 'react';
import './TicketImpresion.css';

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
                <style>
                    body {
                        margin: 0;
                        padding: 20px;
                        font-family: 'Courier New', monospace;
                        font-size: 12px;
                        line-height: 1.2;
                        color: black;
                        background: white;
                    }
                    
                    .ticket-header-section {
                        text-align: left;
                        margin-bottom: 10px;
                    }
                    
                    .ticket-number {
                        font-size: 12px;
                        margin-bottom: 5px;
                    }
                    
                    .customer-name {
                        font-size: 14px;
                        margin-bottom: 5px;
                    }
                    
                    .delivery-address-bold {
                        font-weight: bold;
                        font-size: 16px;
                        margin-bottom: 3px;
                    }
                    
                    .delivery-address-detail {
                        font-size: 12px;
                        margin-bottom: 3px;
                    }
                    
                    .phone-number {
                        font-size: 12px;
                        margin-bottom: 10px;
                    }
                    
                    .ticket-separator {
                        border-top: 1px dotted #000;
                        margin: 8px 0;
                    }
                    
                    .ticket-table-header {
                        display: flex;
                        font-weight: bold;
                        margin-bottom: 5px;
                    }
                    
                    .ticket-col-cant {
                        width: 40px;
                        text-align: left;
                    }
                    
                    .ticket-col-desc {
                        flex: 1;
                        text-align: left;
                        margin-left: 10px;
                    }
                    
                    .ticket-col-subtotal {
                        width: 80px;
                        text-align: right;
                    }
                    
                    .ticket-items {
                        margin-bottom: 10px;
                    }
                    
                    .ticket-item {
                        display: flex;
                        margin-bottom: 3px;
                    }
                    
                    .ticket-observations {
                        text-align: left;
                        font-size: 12px;
                        margin-bottom: 10px;
                    }
                    
                    .ticket-summary {
                        text-align: right;
                        margin-bottom: 10px;
                    }
                    
                    .delivery-info {
                        font-size: 12px;
                        margin-bottom: 5px;
                    }
                    
                    .total-amount {
                        font-weight: bold;
                        font-size: 16px;
                        margin-bottom: 5px;
                    }
                    
                    .payment-method {
                        font-size: 12px;
                    }
                    
                    .ticket-footer {
                        text-align: center;
                    }
                    
                    .logo-section {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin-bottom: 10px;
                    }
                    
                    .logo-circle {
                        width: 40px;
                        height: 40px;
                        border: 2px solid #000;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin-right: 10px;
                        background: #000;
                    }
                    
                    .logo-burger {
                        font-size: 20px;
                        color: white;
                    }
                    
                    .business-name {
                        text-align: left;
                    }
                    
                    .business-name-main {
                        font-weight: bold;
                        font-size: 14px;
                        line-height: 1;
                    }
                    
                    .business-name-sub {
                        font-size: 10px;
                        font-weight: normal;
                        line-height: 1;
                    }
                    
                    .thank-you {
                        font-size: 12px;
                        margin-top: 10px;
                    }
                    
                    @page {
                        margin: 0;
                        size: 80mm auto;
                    }
                </style>
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
                    <h4>Vista Previa del Ticket</h4>
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
                            Ticket# {pedido.codigo} FM- {pedido.fecha} {pedido.hora}
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
                        <div className="ticket-observations">
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
                                <div className="logo-burger">🍔</div>
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
