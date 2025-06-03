

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

    const [categorias, setCategorias] = useState([]);
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");

    const [modalShowProducto, setModalShowProducto] = useState(false);
    const [mostrarAjustes, setMostrarAjustes] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const productosCollectiona = collection(db, "productos");
    const productosCollection = useRef(query(productosCollectiona, orderBy("descripcion", "asc")));

    const categoriasCollectiona = collection(db, "categorias");
    const categoriasCollection = useRef(query(categoriasCollectiona, orderBy("nroOrden", "asc")));

    const getProductos = useCallback((snapshot) => {
        const productosArray = snapshot.docs
            .map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
        setProductos(productosArray);

        setIsLoading(false);
    }, []);

    const getCategorias = useCallback((snapshot) => {
        const categoriasArray = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        categoriasArray.unshift({ id: "todas", nombre: "" });
        setCategorias(categoriasArray);

    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const gastosSnapshot = await getDocs(productosCollection.current);
                await getProductos(gastosSnapshot);

                const categoriasSnapshot = await getDocs(categoriasCollection.current);
                await getCategorias(categoriasSnapshot);

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

    const handleAgregarAlCarrito = async (producto) => {
        console.log(producto)
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
                            placeholder="Buscar Producto..."
                        />
                        <i className="fa-solid fa-magnifying-glass"></i>
                    </div>

                    <div className="container mw-100">
                        <br></br>
                        <div
                            className="d-flex justify-content-start align-items-center">
                            <h3>Sistema Caja</h3>
                            {rol === process.env.REACT_APP_admin ? (
                                <button
                                    className="btn mx-2 btn-md"
                                    onClick={() => {
                                        funcMostrarAjustes(true);
                                    }}
                                >
                                    <i className="fa-solid fa-gear"></i>
                                </button>
                            ) : null}
                        </div>

                        <section className="section-content padding-y-sm bg-default">
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

                                    <div className="col-md-8 card padding-y-sm card">
                                        <ul className="nav nav-pills nav-fill gap-1 p-0 d-flex overflow-auto" role="tablist" style={{ whiteSpace: "nowrap" }}>
                                            {categorias.map((categoria) => (
                                                <li className="nav-item" key={categoria.id}>
                                                    <button
                                                        className={`d-flex align-items-center nav-link text-black lex-shrink-0 p-2 ${categoriaSeleccionada === categoria.nombre ? "active" : ""}`}
                                                        onClick={() => setCategoriaSeleccionada(categoria.nombre)}
                                                    >
                                                        <i className="fa fa-tags"></i> {categoria.nombre}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>

                                        <div className="row">
                                            {productos
                                                .filter((p) =>
                                                    search
                                                        ? p.descripcion?.toLowerCase().includes(search.toLowerCase())
                                                        : true
                                                )
                                                .filter(
                                                    (p) => categoriaSeleccionada === "" || p.categoria === categoriaSeleccionada
                                                )
                                                .map((producto) => (
                                                    <div className="col-2 p-0" key={producto.id}>
                                                        <button
                                                            onClick={() => handleAgregarAlCarrito(producto)}
                                                            className="card card-product h-100 d-flex flex-column justify-content-between"
                                                        >
                                                            <div className="img-wrap flex-grow-1 d-flex align-items-center justify-content-center">
                                                                <img
                                                                    src={producto.imagen}
                                                                    alt={producto.descripcion}
                                                                    className="img-fluid w-75"
                                                                />
                                                            </div>
                                                            <figcaption className="info-wrap">
                                                                <p className="d-flex justify-content-center title lh-1 m-auto" style={{ fontSize: "0.8rem", minHeight: "1.5rem" }}>
                                                                    {producto.descripcion}
                                                                </p>
                                                                <div className="action-wrap">
                                                                    <div className="price-wrap h6 p-1 m-0">
                                                                        <span className="price-new">${producto.precio}</span>
                                                                    </div>
                                                                </div>
                                                            </figcaption>
                                                        </button>
                                                    </div>
                                                ))}
                                        </div>

                                    </div>
                                </div>
                            </div>
                        </section >
                    </div >
                </div >
            )
            }
        </>
    );
}
export default Caja;