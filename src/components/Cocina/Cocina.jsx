import React, { useState } from "react";
import PedidosEspera from "./PedidosEspera";
import PedidosCocinando from "./PedidosCocinando";
import '../../style/Main.css';


const Cocina = () => {
    const [activeTab, setActiveTab] = useState('espera');
    const [pedidosEsperaCount, setPedidosEsperaCount] = useState(0);
    const [pedidosCocinandoCount, setPedidosCocinandoCount] = useState(0);

    return (
        <div className="w-100">
            <div className="container mw-100 p-1 mt-4">
                <div className="row">
                    <div className="col">
                        <br></br>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <ul className="nav nav-tabs mb-0" role="tablist">
                                <li className="nav-item" role="presentation">
                                    <button
                                        className={`nav-link fw-bold ${activeTab === 'espera' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('espera')}
                                        type="button"
                                        role="tab"
                                    >
                                        En Espera ({pedidosEsperaCount})
                                    </button>
                                </li>
                                <li className="nav-item" role="presentation">
                                    <button
                                        className={`nav-link fw-bold ${activeTab === 'cocinando' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('cocinando')}
                                        type="button"
                                        role="tab"
                                    >
                                        Cocinando ({pedidosCocinandoCount})
                                    </button>
                                </li>
                            </ul>
                        </div>

                        <div className="tab-content">
                            {activeTab === 'espera' && (
                                <div className="tab-pane fade show active" role="tabpanel">
                                    <PedidosEspera
                                        onCountChange={setPedidosEsperaCount}
                                        onMandarACocinar={() => { setActiveTab('cocinando') }}
                                    />
                                </div>
                            )}

                            {activeTab === 'cocinando' && (
                                <div className="tab-pane fade show active" role="tabpanel">
                                    <PedidosCocinando
                                        onCountChange={setPedidosCocinandoCount}
                                        onVolverAEspera={() => setActiveTab('espera')}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
export default Cocina;