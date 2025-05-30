

import React, { useState, useEffect, useCallback, useRef } from "react";
import { collection, updateDoc, doc, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import CryptoJS from 'crypto-js';
import '../../style/Main.css';


const Caja = () => {
    const [rol, setRol] = useState("");
    const [search, setSearch] = useState("");
    const [producto, setProducto] = useState([]);
    const [productos, setProductos] = useState([]);
    const [modalShowProducto, setModalShowProducto] = useState(false);
    const [mostrarAjustes, setMostrarAjustes] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const productosCollectiona = collection(db, "productos");
    const productosCollection = useRef(query(productosCollectiona, orderBy("descripcion", "desc")));

    const getProductos = useCallback((snapshot) => {
        const productosArray = snapshot.docs
            .map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
        setProductos(productosArray);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const gastosSnapshot = await getDocs(productosCollection.current);
                await getProductos(gastosSnapshot);

            } catch (error) {
                console.error('Error fetching data Caja:', error);
            }
        };

        fetchData();

    }, [getProductos]);

    useEffect(() => {
        const rolEncriptado = localStorage.getItem("rol");
        let bytesDesencriptado = CryptoJS.AES.decrypt(rolEncriptado, process.env.REACT_APP_cryptoKey);
        let rolDesencriptado = bytesDesencriptado.toString(CryptoJS.enc.Utf8);
        setRol(rolDesencriptado);

    }, [getProductos]);


    function funcMostrarAjustes() {
        if (mostrarAjustes) {
            setMostrarAjustes(false);
        } else {
            setMostrarAjustes(true);
        }
    }


    return (
        <>
            {isLoading ? (
                <div className="w-100">
                    <span className="loader position-absolute start-50 top-50 mt-3"></span>
                </div>
            ) : (
                <div className="w-100">
                    <div className="search-bar d-flex col-3 m-2">
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            type="text"
                            placeholder="Buscar..."
                        />
                        <i className="fa-solid fa-magnifying-glass"></i>
                    </div>

                    <div className="container mw-100">
                        <br></br>
                        <div
                            className="d-flex justify-content-start align-items-center mt-1">
                            <h1>Sistema Caja</h1>
                            {rol === process.env.REACT_APP_admin ? (
                                <button
                                    className="btn mx-2 btn-sm"
                                    style={{ borderRadius: "5px" }}
                                    onClick={() => {
                                        funcMostrarAjustes(true);
                                    }}
                                >
                                    <i className="fa-solid fa-gear"></i>
                                </button>
                            ) : null}
                        </div>

                        <section className="section-content padding-y-sm bg-default mt-1">
                            <div className="container-fluid">
                                <div className="row">
                                    <div className="col-md-4">
                                        <div className="card">
                                            <span id="cart">
                                                <table className="table table-hover shopping-cart-wrap">
                                                    <thead className="text-muted">
                                                        <tr>
                                                            <th scope="col" width="120">Qty</th>
                                                            <th scope="col">Item</th>
                                                            <th scope="col" width="120">Price</th>
                                                            <th scope="col" className="text-right" width="200">Delete</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        <tr>
                                                            <td className="text-center">
                                                                <div className="m-btn-group m-btn-group--pill btn-group mr-2" role="group" aria-label="...">
                                                                    <button type="button" className="m-btn btn btn-default" disabled>3</button>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <figure className="media">
                                                                    <div className="img-wrap"><img alt="" src="assets/images/items/1.jpg" className="img-thumbnail img-xs" /></div>
                                                                    <figcaption className="media-body">
                                                                        <h6 className="title text-truncate">Product name </h6>
                                                                    </figcaption>
                                                                </figure>
                                                            </td>
                                                            <td>
                                                                <div className="price-wrap">
                                                                    <var className="price">$145</var>
                                                                </div>
                                                            </td>
                                                            <td className="text-right">
                                                                <a href=" " className="btn btn-outline-danger"> <i className="fa fa-trash"></i></a>
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </span>
                                        </div>
                                        <div className="box">
                                            <dl className="dlist-align">
                                                <dt>Tax: </dt>
                                                <dd className="text-right">12%</dd>
                                            </dl>
                                            <dl className="dlist-align">
                                                <dt>Discount:</dt>
                                                <dd className="text-right"><a href=" ">0%</a></dd>
                                            </dl>
                                            <dl className="dlist-align">
                                                <dt>Sub Total:</dt>
                                                <dd className="text-right">$215</dd>
                                            </dl>
                                            <dl className="dlist-align">
                                                <dt>Total: </dt>
                                                <dd className="text-right h4 b"> $215 </dd>
                                            </dl>
                                            <div className="row">
                                                <div className="col-md-6">
                                                    <a href=" " className="btn  btn-default btn-error btn-lg btn-block"><i className="fa fa-times-circle "></i> Cancel </a>
                                                </div>
                                                <div className="col-md-6">
                                                    <a href=" " className="btn  btn-primary btn-lg btn-block"><i className="fa fa-shopping-bag"></i> Charge </a>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-md-8 card padding-y-sm card ">
                                        <ul className="nav bg radius nav-pills nav-fill mb-3 bg" role="tablist">
                                            <li className="nav-item">
                                                <a className="nav-link active show" data-toggle="pill" href="#nav-tab-card">
                                                    <i className="fa fa-tags"></i> All</a></li>
                                            <li className="nav-item">
                                                <a className="nav-link" data-toggle="pill" href="#nav-tab-paypal">
                                                    <i className="fa fa-tags "></i>  Category 1</a></li>
                                            <li className="nav-item">
                                                <a className="nav-link" data-toggle="pill" href="#nav-tab-bank">
                                                    <i className="fa fa-tags "></i>  Category 2</a></li>
                                            <li className="nav-item">
                                                <a className="nav-link" data-toggle="pill" href="#nav-tab-bank">
                                                    <i className="fa fa-tags "></i>  Category 3</a></li>
                                            <li className="nav-item">
                                                <a className="nav-link" data-toggle="pill" href="#nav-tab-bank">
                                                    <i className="fa fa-tags "></i>  Category 4</a></li>
                                            <li className="nav-item">
                                                <a className="nav-link" data-toggle="pill" href="#nav-tab-bank">
                                                    <i className="fa fa-tags "></i>  Category 5</a></li>
                                        </ul>

                                        <div className="row">
                                            <div className="col-md-3">
                                                <figure className="card card-product">
                                                    <span className="badge-new"> NEW </span>
                                                    <div className="img-wrap">
                                                        <img alt="" src="assets/images/items/3.jpg" />
                                                        <a className="btn-overlay" href=" "><i className="fa fa-search-plus"></i> Quick view</a>
                                                    </div>
                                                    <figcaption className="info-wrap">
                                                        <a href=" " className="title">Good item name</a>
                                                        <div className="action-wrap">
                                                            <a href=" " className="btn btn-primary btn-sm float-right"> <i className="fa fa-cart-plus"></i> Add </a>
                                                            <div className="price-wrap h5">
                                                                <span className="price-new">$1280</span>
                                                            </div>
                                                        </div>
                                                    </figcaption>
                                                </figure>
                                            </div>
                                            <div className="col-md-3">
                                                <figure className="card card-product">
                                                    <span className="badge-new"> NEW </span>
                                                    <div className="img-wrap"> <img alt="" src="assets/images/items/4.jpg" />
                                                        <a className="btn-overlay" href=" "><i className="fa fa-search-plus"></i> Quick view</a>
                                                    </div>
                                                    <figcaption className="info-wrap">
                                                        <a href=" " className="title">The name of product</a>
                                                        <div className="action-wrap">
                                                            <a href=" " className="btn btn-primary btn-sm float-right"> <i className="fa fa-cart-plus"></i> Add </a>
                                                            <div className="price-wrap h5">
                                                                <span className="price-new">$280</span>
                                                            </div>
                                                        </div>
                                                    </figcaption>
                                                </figure>
                                            </div>
                                            <div className="col-md-3">
                                                <figure className="card card-product">
                                                    <span className="badge-new"> NEW </span>
                                                    <div className="img-wrap"> <img alt="" src="assets/images/items/5.jpg" />
                                                        <a className="btn-overlay" href=" "><i className="fa fa-search-plus"></i> Quick view</a>
                                                    </div>
                                                    <figcaption className="info-wrap">
                                                        <a href=" " className="title">Name of product</a>
                                                        <div className="action-wrap">
                                                            <a href=" " className="btn btn-primary btn-sm float-right"> <i className="fa fa-cart-plus"></i> Add </a>
                                                            <div className="price-wrap h5">
                                                                <span className="price-new">$280</span>
                                                            </div>
                                                        </div>
                                                    </figcaption>
                                                </figure>
                                            </div>
                                            <div className="col-md-3">
                                                <figure className="card card-product">
                                                    <span className="badge-new"> NEW </span>
                                                    <div className="img-wrap"> <img alt="" src="assets/images/items/6.jpg" />
                                                        <a className="btn-overlay" href=" "><i className="fa fa-search-plus"></i> Quick view</a>
                                                    </div>
                                                    <figcaption className="info-wrap">
                                                        <a href=" " className="title">The name of product</a>
                                                        <div className="action-wrap">
                                                            <a href=" " className="btn btn-primary btn-sm float-right"> <i className="fa fa-cart-plus"></i> Add </a>
                                                            <div className="price-wrap h5">
                                                                <span className="price-new">$280</span>
                                                            </div>
                                                        </div>
                                                    </figcaption>
                                                </figure>
                                            </div>
                                        </div>
                                        <div className="row">
                                            <div className="col-md-3">
                                                <figure className="card card-product">
                                                    <span className="badge-new"> NEW </span>
                                                    <div className="img-wrap">
                                                        <img alt="" src="assets/images/items/1.jpg" />
                                                        <a className="btn-overlay" href=" "><i className="fa fa-search-plus"></i> Quick view</a>
                                                    </div>
                                                    <figcaption className="info-wrap">
                                                        <a href=" " className="title">Good item name</a>
                                                        <div className="action-wrap">
                                                            <a href=" " className="btn btn-primary btn-sm float-right"> <i className="fa fa-cart-plus"></i> Add </a>
                                                            <div className="price-wrap h5">
                                                                <span className="price-new">$1280</span>
                                                            </div>
                                                        </div>
                                                    </figcaption>
                                                </figure>
                                            </div>
                                            <div className="col-md-3">
                                                <figure className="card card-product">
                                                    <span className="badge-new"> NEW </span>
                                                    <div className="img-wrap"> <img alt="" src="assets/images/items/2.jpg" />
                                                        <a className="btn-overlay" href=" "><i className="fa fa-search-plus"></i> Quick view</a>
                                                    </div>
                                                    <figcaption className="info-wrap">
                                                        <a href=" " className="title">The name of product</a>
                                                        <div className="action-wrap">
                                                            <a href=" " className="btn btn-primary btn-sm float-right"> <i className="fa fa-cart-plus"></i> Add </a>
                                                            <div className="price-wrap h5">
                                                                <span className="price-new">$280</span>
                                                            </div>
                                                        </div>
                                                    </figcaption>
                                                </figure>
                                            </div>
                                            <div className="col-md-3">
                                                <figure className="card card-product">
                                                    <span className="badge-new"> NEW </span>
                                                    <div className="img-wrap"> <img alt="" src="assets/images/items/7.jpg" />
                                                        <a className="btn-overlay" href=" "><i className="fa fa-search-plus"></i> Quick view</a>
                                                    </div>
                                                    <figcaption className="info-wrap">
                                                        <a href=" " className="title">Name of product</a>
                                                        <div className="action-wrap">
                                                            <a href=" " className="btn btn-primary btn-sm float-right"> <i className="fa fa-cart-plus"></i> Add </a>
                                                            <div className="price-wrap h5">
                                                                <span className="price-new">$280</span>
                                                            </div>
                                                        </div>
                                                    </figcaption>
                                                </figure>
                                            </div>
                                            <div className="col-md-3">
                                                <figure className="card card-product">
                                                    <span className="badge-new"> NEW </span>
                                                    <div className="img-wrap"> <img alt="" src="assets/images/items/comp.png" />
                                                        <a className="btn-overlay" href=" "><i className="fa fa-search-plus"></i> Quick view</a>
                                                    </div>
                                                    <figcaption className="info-wrap">
                                                        <a href=" " className="title">The name of product</a>
                                                        <div className="action-wrap">
                                                            <a href=" " className="btn btn-primary btn-sm float-right"> <i className="fa fa-cart-plus"></i> Add </a>
                                                            <div className="price-wrap h5">
                                                                <span className="price-new">$280</span>
                                                            </div>
                                                        </div>
                                                    </figcaption>
                                                </figure>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </section>
                    </div>
                </div >
            )
            }
        </>
    );
}
export default Caja;