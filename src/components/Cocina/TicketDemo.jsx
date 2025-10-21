import React, { useState } from 'react';
import TicketImpresion from './TicketImpresion';

const TicketDemo = () => {
    const [mostrarTicket, setMostrarTicket] = useState(false);

    // Datos de ejemplo basados en la estructura de pedidos
    const pedidoEjemplo = {
        codigo: "20365 - FM",
        nombre: "Lucas",
        direccion: "Acassuso 3417",
        entrecalles: "garcia merou y santa catalina",
        telefono: "15123123",
        observaciones: "Esto es una observacion",
        envio: {
            zona_envio: "7-8",
            costo_envio: 5500
        },
        metodoPago: "EFECTIVO",
        total: 27300,
        fecha: "10/10/25",
        hora: "02:17",
        carrito: [
            {
                cantidad: 1,
                descripcion: "ALIOLI SIMPLE",
                subtotal: 10900
            },
            {
                cantidad: 1,
                descripcion: "BLT SIMPLE", 
                subtotal: 10900
            }
        ]
    };

    return (
        <div style={{ padding: '20px' }}>
            <h2>Demo del Ticket de Impresión</h2>
            <p>Este es un ejemplo de cómo se verá el ticket con los datos del pedido.</p>
            
            <button 
                className="btn btn-primary"
                onClick={() => setMostrarTicket(true)}
            >
                Ver Ticket de Ejemplo
            </button>

            {mostrarTicket && (
                <TicketImpresion 
                    pedido={pedidoEjemplo} 
                    onClose={() => setMostrarTicket(false)} 
                />
            )}
        </div>
    );
};

export default TicketDemo;

