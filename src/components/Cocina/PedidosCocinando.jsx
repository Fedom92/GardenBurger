import React, { useState, useEffect } from "react";
import '../../style/Main.css';

const PedidosCocinando = ({ selectedPedidos, pedidos, onVolver }) => {
    const [pedidosCocinando, setPedidosCocinando] = useState([]);

    useEffect(() => {
        // Filtrar pedidos seleccionados
        const pedidosSeleccionados = pedidos.filter(pedido => 
            selectedPedidos.includes(pedido.id)
        );
        setPedidosCocinando(pedidosSeleccionados);
    }, [selectedPedidos, pedidos]);

    const imprimirPedido = (pedido) => {
        // Lógica de impresión
        console.log("Imprimir:", pedido);
    };

    const imprimirTodos = () => {
        // Lógica para imprimir todos los pedidos
        pedidosCocinando.forEach(pedido => {
            console.log("Imprimir:", pedido);
        });
    };

    const marcarTodosComoCocinado = async () => {
        try {
            // Lógica para actualizar estado a "COCINADO" de todos los pedidos
            console.log("Marcar TODOS como cocinado:", pedidosCocinando.map(p => p.id));
            
            // Ejemplo de cómo sería con Firebase:
            // const batch = writeBatch(db);
            // pedidosCocinando.forEach(pedido => {
            //     const pedidoRef = doc(db, "pedidos", pedido.id);
            //     batch.update(pedidoRef, { estado: "COCINADO" });
            // });
            // await batch.commit();
            
            // Aquí podrías también limpiar los selectedPedidos o redirigir
            alert(`${pedidosCocinando.length} pedidos marcados como COCINADO`);
            
        } catch (error) {
            console.error("Error al marcar como cocinado:", error);
        }
    };

    return (
        <section className="card p-3" id="cocinando">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h4>Pedidos en Cocina ({pedidosCocinando.length})</h4>
                
                <div className="d-flex gap-2">
                    {/*<button 
                        className="btn btn-outline-primary"
                        onClick={imprimirTodos}
                        disabled={pedidosCocinando.length === 0}
                    >
                        Imprimir Todos
                    </button>*/}
                    
                    <button 
                        className="btn btn-success"
                        onClick={marcarTodosComoCocinado}
                        disabled={pedidosCocinando.length === 0}
                    >
                        Marcar Todos como COCINADO
                    </button>
                    
                    <button className="btn btn-secondary" onClick={onVolver}>
                        Volver a Espera
                    </button>
                </div>
            </div>

            <div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-5 g-2">
                {pedidosCocinando.map(pedido => (
                    <div className="col" key={pedido.id}>
                        <div className="card border border-warning">
                            <div className="card-header bg-warning bg-opacity-25">
                                <div className="d-flex justify-content-between align-items-center">
                                    <strong>N° {pedido.codigo} - {pedido.hora}</strong>
                                    <span className="badge bg-warning">EN COCINA</span>
                                </div>
                                <h6 className="mb-0">{pedido.nombre}</h6>
                            </div>
                            
                            <div className="card-body d-flex flex-column">
                                <div className="m-auto">
                                {pedido.carrito.map((item, i) => (
                                    <div key={i} className="d-flex justify-content-between small mt-2">
                                        <span>{item.cantidad}x {item.descripcion}</span>
                                        <span className="text-muted">{item.categoria}</span>
                                    </div>
                                ))}
                                </div>
                            </div>
                            
                            <div className="card-footer">
                                <button 
                                    className="btn btn-outline-primary btn-sm w-100"
                                    onClick={() => imprimirPedido(pedido)}
                                >
                                    Imprimir Individual
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {pedidosCocinando.length === 0 && (
                <div className="text-center mt-5">
                    <div className="alert alert-warning">No hay pedidos en cocina</div>
                </div>
            )}
        </section>
    );
};

export default PedidosCocinando;