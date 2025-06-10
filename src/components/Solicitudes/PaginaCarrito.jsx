import React, { useContext } from 'react'
import { CartContext } from '../../context/CartContext.jsx'
import { Link } from 'react-router-dom';
import logo from '../../img/logo_negro3.png';




export const PaginaCarrito = () => {

    const { carrito, disminuir, aumentar, eliminar } = useContext(CartContext);
    console.log(carrito);


    return (
        <div className='mainpageVP' >
            <header>
                <img className='logoCS' src={logo} alt="logoGarden" />
            </header>
            <main>
                <section className="m-1">
                    <div className="d-flex justify-content-center">
                        <i className="fa fa-map-marker m-1" aria-hidden="true"></i>
                        <h5>Leonardo Da Vinci 4225 - Gregorio de Laferrere</h5>
                    </div>
                    <h6>La Matanza, La Matanza (Buenos Aires)</h6>
                    <div className="d-flex justify-content-center">
                        <i className="fa fa-motorcycle m-1" aria-hidden="true"></i>
                        <h5>Envios a domicilio</h5>
                    </div>
                </section>
                <div className='itemsConteiner'>
                    {carrito.map((producto) => {
                        return (
                            
                                <div className='itemCarrito'>
                                    <div className="imagen">
                                        <img src={producto.imagen} alt="imagen" />
                                    </div>
                                    <div className='tituloVP'>{producto.descripcion}</div>
                                    <div className='cantidad'>
                                        <button className='disminuir' onClick={() => disminuir(producto)}>-</button>
                                        <h4 className='numeroCantidad'>{producto.amountInCart}</h4>
                                        <button className='aumentar' onClick={() => aumentar(producto)}>+</button>
                                    </div>
                                    {/* <p className="precio">${(producto.price.finalPrice*producto.amountInCart).toFixed(2)}</p> */}
                                    <div className="precioVP">${(producto.precio * producto.amountInCart).toFixed(2)}</div>
                                    <button className='eliminar' onClick={() => eliminar(producto)}>❌</button>
                                </div>
                            
                        )
                    })}
                    {carrito.length > 0 ?
                        <div className="d-flex justify-content-center">
                        <Link to={`/finalizar-compra`}><p className='btnVerde'>Finalizar Compra</p></Link></div>
                        : <><p className='error'>Sin productos seleccionados</p><Link to='/crear-solicitud'><p className='titulo'>Ir a inicio</p></Link></>}


                </div>
            </main>
        </div>

    )
}
