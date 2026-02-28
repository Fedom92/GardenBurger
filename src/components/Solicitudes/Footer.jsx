import React from "react";

const Footer = () => {
    return (
        <footer className="m-auto bg-dark text-white py-4 position-relative z-3 w-100">
            <div className="container m-auto p-2">
                <div className="row">
                    {/* Columna 1 - Información del local */}
                    <div className="col-12 col-md-4 mb-4 mb-md-0 text-center text-md-start">
                        <h5 className="mb-3">GARDEN BURGER</h5>
                        <p className="small text-white-50">
                            <span>📍</span>
                            Leonardo Da Vinci 425<br />
                            Gregorio de Laferrere, La Matanza<br />
                            Buenos Aires
                        </p>
                        <p className="small text-white-50">
                            <span className="me-2">📞</span>
                            {process.env.REACT_APP_celular || "11-1234-5678"}
                        </p>
                        <p className="small text-white-50 mb-0">
                            <span className="me-2">🕒</span>
                            Horario: 19:00 a 00:00 hrs
                        </p>
                    </div>

                    {/* Columna 2 - Enlaces rápidos */}
                    <div className="col-12 col-md-4 mb-4 mb-md-0 text-center">
                        <h5 className="mb-3">Enlaces rápidos</h5>
                        <ul className="list-unstyled">
                            <li className="mb-2">
                                <a href="#HAMBURGUESAS" className="text-white-50 text-decoration-none">
                                    Hamburguesas
                                </a>
                            </li>
                            <li className="mb-2">
                                <a href="#CAJA PAPAS" className="text-white-50 text-decoration-none">
                                    Caja Papas
                                </a>
                            </li>
                            <li className="mb-2">
                                <a href="#POLLO CRISPY" className="text-white-50 text-decoration-none">
                                    Pollo Crispy
                                </a>
                            </li>
                            <li className="mb-2">
                                <a href="#NUGGETS" className="text-white-50 text-decoration-none">
                                    Nuggets
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Columna 3 - Redes sociales y copyright */}
                    <div className="col-12 col-md-4 text-center text-md-end">
                        <h5 className="mb-3">Seguinos</h5>
                        <div className="d-flex justify-content-center justify-content-md-end gap-3">
                            <a href="#" className="text-white text-decoration-none" target="_blank" rel="noopener noreferrer">
                                <span className="fs-4">📷</span>
                            </a>
                            <a href="#" className="text-white text-decoration-none" target="_blank" rel="noopener noreferrer">
                                <span className="fs-4">👤</span>
                            </a>
                            <a href="#" className="text-white text-decoration-none" target="_blank" rel="noopener noreferrer">
                                <span className="fs-4">💬</span>
                            </a>
                        </div>
                        <p className="small mt-3 text-white-50 mb-0">
                            © {new Date().getFullYear()} Garden Burger.
                        </p>
                        <p className="small text-white-50">
                            Todos los derechos reservados.
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
