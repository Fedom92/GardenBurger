import React, { useState, useEffect, useRef, useCallback } from "react";
import { collection, deleteDoc, doc, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import EditGasto from "./EditGasto";
import CrearGasto from "./CrearGasto";
import TipoGasto from "./Parametros/TipoGasto";
import UnidadesMedidas from "./Parametros/UnidadesMedidas";
import moment from "moment";
import { Dropdown, Modal, Button } from "react-bootstrap";
import Calendar from "react-calendar";
import "../../style/Main.css";
import CryptoJS from 'crypto-js';

const Gastos = (props) => {
    const [rol, setRol] = useState("");
    const [gastos, setGastos] = useState([]);
    const [search, setSearch] = useState("");
    const [modalShow, setModalShow] = useState(false);
    const [modalShowEdit, setModalShowEdit] = useState(false);
    const [order, setOrder] = useState("ASC");
    const [gasto, setGasto] = useState([]);
    const [idParam, setIdParam] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    const gastosCollectiona = collection(db, "gastos");
    const gastosCollection = useRef(query(gastosCollectiona, orderBy("fechaGasto", "desc")));

    const [mostrarAjustes, setMostrarAjustes] = useState(false);
    const [modalShowTipoGasto, setModalShowTipoGasto] = useState(false);
    const [modalShowUnidadesMedidas, setModalShowUnidadesMedidas] = useState(false);

    const [ocultrarFiltrosGenerales, setOcultrarFiltrosGenerales] = useState(false);
    const [taparFiltro, setTaparFiltro] = useState(false);
    const [modalShowFiltros2, setModalShowFiltros2] = useState(false);
    const [selectedCheckbox2, setSelectedCheckbox2] = useState("");
    const [modalSeleccionFechaShow, setModalSeleccionFechaShow] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [tituloParametroModal, setTituloParametroModal] = useState("");
    const [parametroModal, setParametroModal] = useState("");
    const [filtroBusqueda, setFiltroBusqueda] = useState("");

    const tipoGastosCollectiona = collection(db, "tipoGasto");
    const tipoGastosCollection = useRef(query(tipoGastosCollectiona, orderBy("name")));
    const proveedoresCollectiona = collection(db, "proveedores");
    const proveedoresCollection = useRef(query(proveedoresCollectiona, orderBy("name")));
    const materialesCollectiona = collection(db, "materiales");
    const materialesCollection = useRef(query(materialesCollectiona, orderBy("name")));
    const unidadesMedidasCollectiona = collection(db, "unidadesMedidas");
    const unidadesMedidasCollection = useRef(query(unidadesMedidasCollectiona, orderBy("name")));

    const [tipoGastoOptions, setTipoGastoOptions] = useState([]);
    const [unidadMedidaOptions, setUnidadMedidaOptions] = useState([]);
    const [proveedoresOptions, setProveedoresOptions] = useState([]);
    const [materialesOptions, setMaterialesOptions] = useState([]);

    const createOptions = (snapshot, keyPrefix, customValueKey) =>
        snapshot.docs.map((doc, index) => (
            <option key={`${keyPrefix}-${index}`} value={doc.data()[customValueKey]}>
                {doc.data()[customValueKey]}
            </option>
        ));

    const fetchDataAndSetOptions = useCallback(async (collection, setOptions, customValueKey) => {
        try {
            const snapshot = await getDocs(collection.current);
            const options = createOptions(snapshot, collection.current.name, customValueKey);
            setOptions(options);
        } catch (error) {
            console.error(`Error fetching data options ${collection.current.name}:`, error);
        }
    }, []);

    useEffect(() => {
        fetchDataAndSetOptions(tipoGastosCollection, setTipoGastoOptions, 'name');
        fetchDataAndSetOptions(unidadesMedidasCollection, setUnidadMedidaOptions, 'name');
        fetchDataAndSetOptions(proveedoresCollection, setProveedoresOptions, 'valorBusquedaProveedor');
        fetchDataAndSetOptions(materialesCollection, setMaterialesOptions, 'name');
    }, [fetchDataAndSetOptions]);

    const getGastos = useCallback((snapshot) => {
        const gastosArray = snapshot.docs.map((doc) => ({
            ...doc.data(),
            id: doc.id,
        }));
        setGastos(gastosArray);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const gastosSnapshot = await getDocs(gastosCollection.current);
                await getGastos(gastosSnapshot);

            } catch (error) {
                console.error('Error fetching data Gastos:', error);
            }
        };
        fetchData();
    }, [getGastos]);

    useEffect(() => {
        const rolEncriptado = localStorage.getItem("rol");
        let bytesDesencriptado = CryptoJS.AES.decrypt(rolEncriptado, process.env.REACT_APP_cryptoKey);
        let rolDesencriptado = bytesDesencriptado.toString(CryptoJS.enc.Utf8);
        setRol(rolDesencriptado);
    }, []);

    const deleteGasto = async (id) => {
        const gastoDoc = doc(db, "gastos", id);
        await deleteDoc(gastoDoc);
        setGastos((prevGastos) => prevGastos.filter((gasto) => gasto.id !== id));
    };

    const searcher = (e) => {
        if (typeof e === "string") {
            setSearch(e);
        } else {
            setSearch(e.target.value);
        }
    };

    const handleCheckboxChange2 = (event) => {
        setSelectedCheckbox2(event.target.name);
    };

    function handleTituloModal(parametroModal) {
        setFiltroBusqueda(parametroModal);
        switch (parametroModal) {
            case "mes":
                setTituloParametroModal("Por Mes");
                break;
            default:
                setTituloParametroModal("");
        }
        return;
    }

    const filtroFecha = (param) => {
        if (param === "Hoy") {
            setSearch(moment().format("YYYY-MM-DD"));
        }
        if (param === "Esta Semana") {
            const fechaInicio = moment().startOf('isoWeek').format("YYYY-MM-DD");
            const fechaFin = moment().endOf('isoWeek').format("YYYY-MM-DD");
            setSearch({ fechaInicio, fechaFin });
        }
        if (param === "Este Mes") {
            const fechaInicio = moment().startOf('month').format("YYYY-MM-DD");
            const fechaFin = moment().endOf('month').format("YYYY-MM-DD");
            setSearch({ fechaInicio, fechaFin });
        }
    };

    const [paginaActual, setPaginaActual] = useState(1);
    const filasPorPagina = 50;

    const handleCambioPagina = (pagina) => {
        setPaginaActual(pagina);
        if (pagina > 1) {
            setOcultrarFiltrosGenerales(true);
        } else {
            setOcultrarFiltrosGenerales(false);
        }
    };

    function quitarAcentos(texto) {
        return texto
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }

    let results = gastos;

    results = !search
        ? results
        : typeof search === "object"
            ? results.filter((dato) => {
                const fecha = moment(dato.fechaGasto).format("YYYY-MM-DD");
                return fecha >= search.fechaInicio && fecha <= search.fechaFin;
            })
            : search.toString().length === 10 &&
                search.charAt(4) === "-" &&
                search.charAt(7) === "-"
                ? results.filter((dato) => dato.fechaGasto === search.toString())
                : filtroBusqueda &&
                    results.some(
                        (gasto) =>
                            gasto[filtroBusqueda]?.includes(search) &&
                            gasto[filtroBusqueda] !== "" &&
                            gasto[filtroBusqueda] !== undefined &&
                            gasto[filtroBusqueda] !== null
                    ) ?
                    (results = results.filter(
                        (dato) =>
                            dato[filtroBusqueda]?.includes(search) &&
                            dato[filtroBusqueda] !== "" &&
                            dato[filtroBusqueda] !== undefined &&
                            dato[filtroBusqueda] !== null
                    ))
                    : results.filter((dato) => {
                        const proveedorSinAcentos = quitarAcentos(dato.proveedor);
                        const descripArticuloSinAcentos = quitarAcentos(dato.descripArticulo);
                        const searchSinAcentos = quitarAcentos(search);
                        return (
                            proveedorSinAcentos.includes(searchSinAcentos) ||
                            dato.ruc.toString().includes(searchSinAcentos) ||
                            descripArticuloSinAcentos.includes(searchSinAcentos)
                        );
                    });


    var paginasTotales = Math.ceil(results.length / filasPorPagina);
    var startIndex = (paginaActual - 1) * filasPorPagina;
    var endIndex = startIndex + filasPorPagina;
    var resultsPaginados = results.slice(startIndex, endIndex);

    const sorting = (col) => {
        if (order === "ASC") {
            const sorted = [...gastos].sort((a, b) => {
                const valueA = typeof a[col] === "string" ? a[col].toLowerCase() : a[col];
                const valueB = typeof b[col] === "string" ? b[col].toLowerCase() : b[col];
                return valueA > valueB ? 1 : -1;
            });
            setGastos(sorted);
            setOrder("DSC");
        }
        if (order === "DSC") {
            const sorted = [...gastos].sort((a, b) => {
                const valueA = typeof a[col] === "string" ? a[col].toLowerCase() : a[col];
                const valueB = typeof b[col] === "string" ? b[col].toLowerCase() : b[col];
                return valueA < valueB ? 1 : -1;
            });
            setGastos(sorted);
            setOrder("ASC");
        }
    };

    function funcMostrarAjustes() {
        if (mostrarAjustes) {
            setMostrarAjustes(false);
        } else {
            setMostrarAjustes(true);
        }
    }

    const agregarGasto = (nuevoGasto) => {
        const nuevosGastos = [...gastos, nuevoGasto];

        nuevosGastos.sort((a, b) => b.fechaGasto.localeCompare(a.fechaGasto));

        setGastos(nuevosGastos);
    };

    const editarGasto = (nuevoGastoActualizado) => {
        const gastosActualizados = gastos.map((gasto) =>
            gasto.id === nuevoGastoActualizado.id ? { ...gasto, ...nuevoGastoActualizado } : gasto
        );

        gastosActualizados.sort((a, b) => b.fechaGasto.localeCompare(a.fechaGasto));

        setGastos(gastosActualizados);
    };

    return (
        <>
            {isLoading ? (
                <div className="w-100">
                    <span className="loader position-absolute start-50 top-50 mt-3"></span>
                </div>
            ) : (
                <div className="w-100">
                    <div className="search-bar d-flex col-2 m-2 ms-3 w-50">
                        <input
                            value={search}
                            onChange={searcher}
                            type="text"
                            placeholder="Buscar..."
                            className="form-control-upNav  m-2"
                        />
                        <i className="fa-solid fa-magnifying-glass"></i>
                        {taparFiltro && (
                            <input
                                className="form-control m-2 w-90"
                                value="<-FILTRO ENTRE FECHAS APLICADO->"
                                style={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    zIndex: 1,
                                    textAlign: "center",
                                }}
                                disabled
                            ></input>
                        )}
                    </div>

                    <div className="container mw-100">
                        <div className="row">
                            <div className="col">
                                <br></br>
                                <div className="d-flex justify-content-between">
                                    <div
                                        className="d-flex justify-content-start align-items-center"
                                        style={{ maxHeight: "40px", marginLeft: "10px" }}
                                    >
                                        <h1>Compras</h1>
                                        {rol === process.env.REACT_APP_rolAd ? (
                                            <button
                                                className="btn grey mx-2 btn-sm"
                                                style={{ borderRadius: "5px" }}
                                                onClick={() => {
                                                    funcMostrarAjustes(true);
                                                }}
                                            >
                                                <i className="fa-solid fa-gear"></i>
                                            </button>
                                        ) : null}

                                        <button
                                            variant="primary"
                                            className="btn button-main m-2"
                                            onClick={() => setModalShow(true)}
                                        >
                                            Nuevo
                                        </button>
                                        {mostrarAjustes && (
                                            <div className="d-flex">
                                                <button
                                                    variant="secondary"
                                                    className="btn button-main m-2"
                                                    onClick={() => setModalShowTipoGasto(true)}
                                                >
                                                    Tipo Compras
                                                </button>
                                                <button
                                                    variant="secondary"
                                                    className="btn button-main m-2"
                                                    onClick={() => setModalShowUnidadesMedidas(true)}
                                                >
                                                    Unidades Medidas
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {!ocultrarFiltrosGenerales && (<div className="col d-flex justify-content-end align-items-center">
                                        <div className="mb-3 m-1">
                                            <select
                                                className="form-control-doctor"
                                                multiple={false}
                                                onChange={(e) => {
                                                    const selectedOption = e.target.value;
                                                    if (selectedOption === "") {
                                                        setSearch("")
                                                        setTaparFiltro(false);
                                                    } else if (selectedOption === "Hoy") {
                                                        filtroFecha("Hoy");
                                                        setTaparFiltro(false);
                                                    } else if (selectedOption === "Esta Semana") {
                                                        filtroFecha("Esta Semana");
                                                        setTaparFiltro(true);
                                                    } else if (selectedOption === "Este Mes") {
                                                        filtroFecha("Este Mes");
                                                        setTaparFiltro(true);
                                                    } else if (selectedOption === "Seleccionar") {
                                                        setModalSeleccionFechaShow(true);
                                                    }
                                                    else if (selectedOption === "Meses") {
                                                        handleTituloModal("mes");
                                                        setParametroModal("mes");
                                                        setModalShowFiltros2(true);
                                                    }
                                                }}
                                            >
                                                <option value="">Todas las Fechas</option>
                                                <option value="Hoy">Hoy</option>
                                                <option value="Esta Semana">Esta Semana</option>
                                                <option value="Este Mes">Este Mes</option>
                                                <option value="Seleccionar">Seleccionar Fecha</option>
                                                <option value="Meses">Agrupar por Mes</option>
                                            </select>
                                        </div>

                                    </div>)}
                                </div>

                                <Modal show={modalSeleccionFechaShow} onHide={() => { setModalSeleccionFechaShow(false); setSelectedDate(""); setTaparFiltro(false); setSearch(""); }}>
                                    <Modal.Header closeButton onClick={() => {
                                        setModalSeleccionFechaShow(false);
                                        setSelectedDate("");
                                        setTaparFiltro(false);
                                        setSearch("");
                                    }}>
                                        <Modal.Title>Seleccione una fecha para filtrar:</Modal.Title>
                                    </Modal.Header>
                                    <Modal.Body
                                        style={{
                                            display: "flex",
                                            justifyContent: "center",
                                            alignItems: "center",
                                        }}
                                    >
                                        <Calendar
                                            defaultValue={moment().format("YYYY-MM-DD")}
                                            onChange={(date) => {
                                                const formattedDate =
                                                    moment(date).format("YYYY-MM-DD");
                                                setSelectedDate(formattedDate);
                                            }}
                                            value={selectedDate}
                                        />
                                    </Modal.Body>
                                    <Modal.Footer>
                                        <Button variant="primary" onClick={() => { setSearch(selectedDate); setTaparFiltro(false); setModalSeleccionFechaShow(false); }}>
                                            Buscar Fecha
                                        </Button>
                                    </Modal.Footer>
                                </Modal>

                                <Modal
                                    show={modalShowFiltros2}
                                    onHide={() => {
                                        setModalShowFiltros2(false);
                                        setSelectedCheckbox2("");
                                    }}
                                >
                                    <Modal.Header
                                        closeButton
                                        onClick={() => {
                                            setModalShowFiltros2(false);
                                            setParametroModal("");
                                            setSelectedCheckbox2("");
                                        }}
                                    >
                                        <Modal.Title>
                                            <h3 style={{ fontWeight: "bold" }}>
                                                Filtro Seleccionado :{" "}
                                            </h3>
                                            <h6>{tituloParametroModal}</h6>
                                        </Modal.Title>
                                    </Modal.Header>
                                    <Modal.Body
                                        style={{
                                            display: "flex",
                                            justifyContent: "center",
                                            alignItems: "center",
                                        }}
                                    >
                                        <div>
                                            {gastos
                                                .map((gasto) => gasto[parametroModal])
                                                .filter(
                                                    (valor, index, self) =>
                                                        self.indexOf(valor) === index &&
                                                        valor !== "" &&
                                                        valor !== undefined &&
                                                        valor !== null
                                                )
                                                .map((parametroModal, index) => (
                                                    <label className="checkbox-label" key={index}>
                                                        <input
                                                            type="checkbox"
                                                            name={parametroModal}
                                                            checked={
                                                                selectedCheckbox2 === parametroModal
                                                            }
                                                            onChange={handleCheckboxChange2}
                                                        />
                                                        {parametroModal}
                                                    </label>
                                                ))}
                                        </div>
                                    </Modal.Body>
                                    <Modal.Footer>
                                        <Button
                                            variant="primary"
                                            onClick={() => {
                                                handleTituloModal("");
                                                searcher("");
                                                setModalShowFiltros2(false);
                                                setSelectedCheckbox2("");
                                                setParametroModal("");
                                            }}
                                        >
                                            Salir
                                        </Button>
                                        <Button
                                            variant="primary"
                                            onClick={() => {
                                                searcher(selectedCheckbox2);
                                                setModalShowFiltros2(false);
                                                setParametroModal("");
                                                setTituloParametroModal("");
                                                setSelectedCheckbox2("");
                                            }}
                                        >
                                            Aplicar Filtro
                                        </Button>
                                    </Modal.Footer>
                                </Modal>

                                <div className="table__container">
                                    <table className="table__body">
                                        <thead>
                                            <tr>
                                                <th onClick={() => sorting("fechaGasto")}>Fecha</th>
                                                <th onClick={() => sorting("ruc")}>RUC</th>
                                                <th onClick={() => sorting("proveedor")}>Proveedor</th>
                                                <th onClick={() => sorting("tipoGasto")}>Tipo</th>
                                                <th onClick={() => sorting("comprobanteGasto")}>Comprobante</th>
                                                <th onClick={() => sorting("cantArticulo")}>Cantidad</th>
                                                <th onClick={() => sorting("umArticulo")}>U.M.</th>
                                                <th onClick={() => sorting("cuentaArticulo")}>Cuenta</th>
                                                <th onClick={() => sorting("descripArticulo")}>Descripcion</th>
                                                <th onClick={() => sorting("precioUniArticulo")}>Precio Uni</th>
                                                <th onClick={() => sorting("subTotalArticulo")}>SubTotal</th>
                                                <th id="columnaAccion"></th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {resultsPaginados.map((gasto) => (
                                                <tr key={gasto.id}>
                                                    <td id="colIzquierda" style={{ padding: '6px' }}>{moment(gasto.fechaGasto).format("DD-MM-YY")}</td>
                                                    <td> {gasto.ruc} </td>
                                                    <td className="text-wrap" style={{ maxWidth: '18vh' }}> {gasto.proveedor} </td>
                                                    <td> {gasto.tipoGasto} </td>
                                                    <td> {gasto.comprobanteGasto} </td>
                                                    <td> {gasto.cantArticulo} </td>
                                                    <td> {gasto.umArticulo} </td>
                                                    <td> {gasto.cuentaArticulo} </td>
                                                    <td className="text-wrap" style={{ maxWidth: '20vh' }}> {gasto.descripArticulo} </td>
                                                    <td> {gasto.precioUniArticulo.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} </td>
                                                    <td> {gasto.subTotalArticulo.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} </td>
                                                    <td id="columnaAccion" className="colDerecha">
                                                        <Dropdown>
                                                            <Dropdown.Toggle
                                                                variant="primary"
                                                                className="btn btn-secondary mx-1 btn-md"
                                                                id="dropdown-actions"
                                                                style={{ background: "none", border: "none" }}
                                                            >
                                                                <i className="fa-solid fa-ellipsis-vertical" id="tdConColor"></i>
                                                            </Dropdown.Toggle>

                                                            <div className="dropdown__container">
                                                                <Dropdown.Menu>
                                                                    <Dropdown.Item
                                                                        onClick={() => {

                                                                            setModalShowEdit(true);
                                                                            setGasto(gasto);
                                                                            setIdParam(gasto.id);
                                                                        }}
                                                                    >
                                                                        <i className="fa-regular fa-pen-to-square"></i>
                                                                        Editar
                                                                    </Dropdown.Item>

                                                                    <Dropdown.Item
                                                                        onClick={() => {
                                                                            deleteGasto(gasto.id);
                                                                        }}
                                                                    >
                                                                        <i className="fa-solid fa-trash-can"></i>
                                                                        Eliminar
                                                                    </Dropdown.Item>
                                                                </Dropdown.Menu>
                                                            </div>
                                                        </Dropdown>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="table__footer">
                                    <div className="table__footer-left">
                                        Mostrando {startIndex + 1} - {endIndex} de {results.length}
                                    </div>

                                    <div className="table__footer-right">
                                        <span>
                                            <button
                                                onClick={() => handleCambioPagina(paginaActual - 1)}
                                                disabled={paginaActual === 1}
                                                style={{ border: "0", background: "none" }}
                                            >
                                                &lt; Previo
                                            </button>
                                        </span>

                                        {[...Array(paginasTotales)].map((_, index) => {
                                            const pagina = index + 1;
                                            return (
                                                <span key={pagina}>
                                                    <span
                                                        onClick={() => handleCambioPagina(pagina)}
                                                        className={pagina === paginaActual ? "active" : ""}
                                                        style={{
                                                            margin: "2px",
                                                            backgroundColor: pagina === paginaActual ? "#003057" : "transparent",
                                                            color: pagina === paginaActual ? "#FFFFFF" : "#000000",
                                                            padding: "4px 8px",
                                                            borderRadius: "4px",
                                                            cursor: "pointer"
                                                        }}
                                                    >
                                                        {pagina}
                                                    </span>
                                                </span>
                                            );
                                        })}

                                        <span>
                                            <button
                                                onClick={() => handleCambioPagina(paginaActual + 1)}
                                                disabled={paginaActual === paginasTotales}
                                                style={{ border: "0", background: "none" }}
                                            >
                                                Siguiente &gt;
                                            </button>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <CrearGasto
                tipogastooptions={tipoGastoOptions}
                unidadmedidaoptions={unidadMedidaOptions}
                proveedoresoptions={proveedoresOptions}
                materialesoptions={materialesOptions}
                agregargasto={agregarGasto}
                show={modalShow}
                onHide={() => setModalShow(false)} />
            <EditGasto
                id={idParam}
                tipogastooptions={tipoGastoOptions}
                proveedoresoptions={proveedoresOptions}
                materialesoptions={materialesOptions}
                editargasto={editarGasto}
                gasto={gasto}
                show={modalShowEdit}
                onHide={() => setModalShowEdit(false)}
            />
            <TipoGasto
                show={modalShowTipoGasto}
                onHide={() => setModalShowTipoGasto(false)}
            />
            <UnidadesMedidas
                show={modalShowUnidadesMedidas}
                onHide={() => setModalShowUnidadesMedidas(false)}
            />
        </>
    );
};

export default Gastos;