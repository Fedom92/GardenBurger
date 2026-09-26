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

                        {/* Las dos solapas quedan MONTADAS y la inactiva se oculta con
                            CSS. Con el montaje condicional se desmontaba el listener de
                            la otra: el contador "En Espera (N)" quedaba congelado y el
                            cocinero no veía entrar pedidos nuevos mientras estaba en
                            Cocinando. No cuesta lecturas de más — los dos listeners
                            hacen falta igual para los contadores. */}
                        <div className="tab-content">
                            <div className={`tab-pane fade show active ${activeTab === 'espera' ? '' : 'd-none'}`} role="tabpanel">
                                <PedidosEspera
                                    onCountChange={setPedidosEsperaCount}
                                    onMandarACocinar={() => { setActiveTab('cocinando') }}
                                />
                            </div>

                            <div className={`tab-pane fade show active ${activeTab === 'cocinando' ? '' : 'd-none'}`} role="tabpanel">
                                <PedidosCocinando
                                    onCountChange={setPedidosCocinandoCount}
                                    onVolverAEspera={() => setActiveTab('espera')}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
export default Cocina;