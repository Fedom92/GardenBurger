import React, { useState, useEffect } from "react";
import { collection, addDoc, query, where, doc, getDoc, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import { Modal } from "react-bootstrap";
import moment from "moment";

const CrearControlEvolucion = (props) => {
    const hoy = moment(new Date()).format("YYYY-MM-DD");
    const { agregarcontrol, opcionesdepacientes, optionstarifastratamientos, ...propsModal } = props;
    const [apellidoConNombre, setApellidoConNombre] = useState('');
    const [tipoIdc, setTipoIdc] = useState("dni");
    const [idc, setIdc] = useState('');
    const [tratamientoControl, setTratamientoControl] = useState('');
    const [pieza, setPieza] = useState('');
    const [fechaControlRealizado, setFechaControlRealizado] = useState('');
    const [detalleTratamiento, setDetalleTratamiento] = useState('');
    const [idPaciente, setIdPaciente] = useState('');
    const [tratamientoId, setTratamientoId] = useState(0);
    const [editable, setEditable] = useState(true);
    const [editable2, setEditable2] = useState(true);
    const [showBuscador, setShowBuscador] = useState(true);
    const [ocultar, setOcultar] = useState(false);

    const [error, setError] = useState("");
    const controlesCollection = collection(db, "controlEvoluciones");

    const validateFields = async (e) => {
        e.preventDefault();
        if (
            apellidoConNombre.trim() === "" ||
            idc.trim() === "" ||
            fechaControlRealizado.trim() === "" ||
            tratamientoControl.trim() === ""
        ) {
            setError("Todos los campos son obligatorios");
            setTimeout(clearError, 2000)
            return false;
        } else {
            setError("");
            await store(e);
            clearFields();
            props.onHide();
        }
        return true;
    };

    const clearError = () => {
        setError("");
    };

    const clearFields = () => {
        setDetalleTratamiento("");
        setError("");
    };

    const manejarValorSeleccionado = async (suggestion) => {
        const querySnapshot = await getDocs(
            query(collection(db, "clients"), where("valorBusqueda", "==", suggestion))
        );
        const doc = querySnapshot.docs[0];

        if (doc) {
            const data = doc.data();
            setApellidoConNombre(data.apellidoConNombre);
            setTipoIdc(data.tipoIdc);
            setIdc(data.idc);
            setIdPaciente(doc.id)
        }
    };


    const store = async (e) => {
        e.preventDefault();
        const busqueda = query(collection(db, "user"), where("uidParaComparar", "==", props.current_user.uid));
        const querySnapshot = await getDocs(busqueda);
        const doc = querySnapshot.docs[0].data()

        const nuevoControl = {
            timestamp: serverTimestamp(),
            apellidoConNombre: apellidoConNombre,
            tipoIdc: tipoIdc,
            idc: idc,
            idPaciente: idPaciente,
            tratamientoId: tratamientoId,
            fechaControlRealizado: fechaControlRealizado,
            tratamientoControl: tratamientoControl,
            pieza: pieza,
            doctor: props.current_user.displayName,
            doctorId: doc?.idUnica || "",
            detalleTratamiento: detalleTratamiento,
        };

        try {
            const docRef = await addDoc(controlesCollection, nuevoControl);
            props.agregarcontrol({ id: docRef.id, ...nuevoControl });
        } catch (error) {
            console.error("Error al agregar control: ", error);
        }
    };

    useEffect(() => {
        const fetchClient = async () => {
            if (props.id && !props.tratamiento) {
                setShowBuscador(false);
                const docRef = doc(db, 'clients', props.id);
                const docSnapshot = await getDoc(docRef);

                if (docSnapshot.exists()) {
                    const data = docSnapshot.data();
                    setApellidoConNombre(data.apellidoConNombre);
                    setTipoIdc(data.tipoIdc);
                    setIdc(data.idc);
                    setIdPaciente(props.id);
                    setEditable(false);
                }
            }
            if (props.tratamiento) {
                setShowBuscador(false);
                setApellidoConNombre(props.tratamiento.apellidoConNombre);
                setTipoIdc(props.tratamiento.tipoIdc);
                setIdc(props.tratamiento.idc);
                setIdPaciente(props.tratamiento.idPaciente);
                setTratamientoControl(props.tratamiento.tarifasTratamientos);
                setPieza(props.tratamiento.pieza)
                setTratamientoId(props.tratamiento.id)
                setEditable(false);
                setEditable2(false);
                setOcultar(true);
            }
        };

        fetchClient();
    }, [props.id, props.tratamiento]);

    useEffect(() => {
        if (fechaControlRealizado === "") {
            setFechaControlRealizado(hoy);
        }
    }, [fechaControlRealizado, hoy]);

    return (
        <Modal
            {...propsModal}
            size="md"
            aria-labelledby="contained-modal-title-vcenter"
            centered
        >
            <Modal.Header closeButton onClick={() => { clearFields(); propsModal.onHide(); }}>
                <Modal.Title id="contained-modal-title-vcenter">
                    <h1>Crear Control Y Evolucion</h1>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="container">
                    {showBuscador && (<div className="col sm-6 " style={{ background: "#23C9FF", padding: "6px", borderRadius: "20px", width: "60%" }}>
                        <label className="form-label" style={{ marginLeft: "15px", fontWeight: "bold", fontSize: "14px" }}>Buscador por Apellido, Nombre o IDC:</label>
                        <input
                            style={{ borderRadius: "150px" }}
                            type="text"
                            className="form-control"
                            onChangeCapture={(e) => manejarValorSeleccionado(e.target.value)}
                            list="pacientes-list"
                            multiple={false}
                        />
                        <datalist id="pacientes-list">
                            {opcionesdepacientes}
                        </datalist>
                    </div>)}

                    <form onSubmit={validateFields} style={{ transform: "scale(0.96)" }}>
                        {error && (
                            <div className="alert alert-danger" role="alert">
                                {error}
                            </div>
                        )}
                        <br></br>
                        {!ocultar && (
                            <div className="row">
                                <div className="col mb-6">
                                    <label className="form-label">IDC*</label>
                                    <div style={{ display: "flex" }}>
                                        <select
                                            value={tipoIdc}
                                            onChange={(e) => { setTipoIdc(e.target.value); setIdc("") }}
                                            className="form-control-tipoIDC"
                                            multiple={false}
                                            style={{ width: "fit-content" }}
                                            required
                                        >
                                            <option value="dni">DNI</option>
                                            <option value="ce">CE</option>
                                            <option value="ruc">RUC</option>
                                            <option value="pas">PAS</option>

                                        </select>
                                        <input
                                            value={idc ?? ''}
                                            onChange={(e) => setIdc(e.target.value)}
                                            type={tipoIdc === "dni" || tipoIdc === "ruc" ? "number" : "text"}
                                            minLength={tipoIdc === "dni" ? 8 : undefined}
                                            maxLength={tipoIdc === "dni" ? 8 : tipoIdc === "ruc" ? 11 : tipoIdc === "ce" || tipoIdc === "pas" ? 12 : undefined}
                                            onKeyDown={(e) => {
                                                const maxLength = e.target.maxLength;
                                                const currentValue = e.target.value;
                                                const isTabKey = e.key === "Tab";
                                                const isDeleteKey = e.key === "Delete" || e.key === "Supr" || e.key === "Backspace";
                                                if (maxLength && currentValue.length >= maxLength && !isTabKey && !isDeleteKey) {
                                                    e.preventDefault();
                                                }
                                            }}
                                            className="form-control"
                                            disabled={!editable}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="col mb-6">
                                    <label className="form-label">Apellido y Nombres:</label>
                                    <input
                                        value={apellidoConNombre ?? ''}
                                        onChange={(e) => setApellidoConNombre(e.target.value)}
                                        type="text"
                                        className="form-control"
                                        disabled={!editable}
                                        required
                                    />
                                </div>
                            </div>)}
                        {!ocultar && (<div className="row">
                            <div className="col mb-6">
                                <label className="form-label">Tratamiento:</label>
                                <select
                                    value={tratamientoControl ?? ''}
                                    onChange={(e) => {
                                        setTratamientoControl(e.target.value)
                                    }}
                                    className="form-control"
                                    multiple={false}
                                    disabled={!editable2}

                                    required
                                >
                                    <option value="">Selecciona un Tratamiento</option>
                                    {optionstarifastratamientos}
                                </select>
                            </div>
                            <div className="col mb-6">
                                <label className="form-label">Pieza:</label>
                                <input
                                    value={pieza ?? ''}
                                    onChange={(e) => setPieza(e.target.value)}
                                    disabled={!editable2}
                                    type="number"
                                    className="form-control m-1 w-100"
                                />
                            </div>
                        </div>)}

                        {!ocultar && (<hr />)}

                        <div className="row" style={{ marginTop: "-30px", justifyContent: 'center' }}>
                            <div className="d-flex col-md-12">
                                <label className="col-form-label me-6 w-25">Doctor:</label>
                                <input
                                    value={props.current_user.displayName ?? ""}
                                    disabled
                                    type="text"
                                    className="form-control m-1 w-100"
                                />
                            </div>
                            <div className="d-flex col-md-12">
                                <label className="col-form-label me-6 w-25">Fecha:</label>
                                <input
                                    value={fechaControlRealizado ?? ''}
                                    onChange={(e) => setFechaControlRealizado(e.target.value)}
                                    type="date"
                                    className="form-control m-1 w-100"
                                    max={hoy}
                                />
                            </div>
                            <div className="d-flex col-md-12">
                                <label className="col-form-label me-6 w-25">Detalle:</label>
                                <textarea
                                    value={detalleTratamiento}
                                    onChange={(e) => setDetalleTratamiento(e.target.value)}
                                    type="text"
                                    className="form-control m-1"
                                    style={{ height: '150px' }}
                                />
                            </div>
                        </div>

                        <br></br>
                        <button
                            type="submit"
                            onClick={validateFields}
                            className="btn button-main"
                        >
                            Agregar
                        </button>

                    </form>
                </div>
            </Modal.Body>
        </Modal>
    );
};

export default CrearControlEvolucion;
