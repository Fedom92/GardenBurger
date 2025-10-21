import React, { } from "react";
import '../../style/Main.css';


const PedidosEspera = ({ pedidos, search, selectedPedidos, setSelectedPedidos, onMandarACocinar }) => {

    const togglePedidoSelection = (pedidoId) => {
        setSelectedPedidos(prev =>
            prev.includes(pedidoId)
                ? prev.filter(id => id !== pedidoId)
                : [...prev, pedidoId]
        );
    };

    // Filtrar pedidos según búsqueda
    const filteredPedidos = pedidos.filter(pedido =>
        pedido.codigo.toLowerCase().includes(search.toLowerCase()) ||
        pedido.nombre.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <section className="card p-3" id="pedidos">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h4>Pedidos en Espera</h4>
                <button
                    className="btn btn-success"
                    onClick={onMandarACocinar}
                    disabled={selectedPedidos.length === 0}
                >
                    Mandar a Cocinar ({selectedPedidos.length})
                </button>
            </div>

            <div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-5 g-2">
                {filteredPedidos.map(pedido => (
                    <div className="col" key={pedido.id}>
                        <div
                            className={`card border ${selectedPedidos.includes(pedido.id)
                                ? 'border-danger bg-danger bg-opacity-10'
                                : 'border-secondary'}`}
                            onClick={() => togglePedidoSelection(pedido.id)}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="card-body p-2 d-flex flex-column">
                                <div className="d-flex justify-content-between align-items-start mb-1">
                                    <span className="badge bg-dark">N° {pedido.codigo}</span>
                                    <small className="text-muted">{pedido.hora}</small>
                                </div>
                                <h6 className="mb-2 text-truncate">{pedido.nombre}</h6>
                                <div className="m-auto">
                                    {pedido.carrito.slice(0, 3).map((item, i) => (
                                        <div key={i} className="d-flex justify-content-between small">
                                        <span>{item.cantidad}x {item.descripcion}</span>
                                        <span className="text-muted">{item.categoria}</span>
                                    </div>
                                    ))}
                                    {pedido.carrito.length > 3 && (
                                        <small className="text-muted">+{pedido.carrito.length - 3} más...</small>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filteredPedidos.length === 0 && (
                <div className="text-center mt-5">
                    <div className="alert alert-info">No hay pedidos en espera</div>
                </div>
            )}
        </section>
    );
};
export default PedidosEspera;