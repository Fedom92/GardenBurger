import React, { useState, useEffect } from "react";
import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import { Modal } from "react-bootstrap";
import moment from "moment";
import 'moment/locale/es';
import Swal from "sweetalert2";

const CrearSolicitud = () => {
    const [cliente, setCliente] = useState("");
    const [fecha, setFecha] = useState("");
    const [motivo, setMotivo] = useState("");
    const [direccion, setDireccion] = useState("");
    const [telefono, setTelefono] = useState("");
    const [telefono2, setTelefono2] = useState("");
    const [piso, setPiso] = useState("");

    const [error, setError] = useState("");
    const [personaQueRecibe, setPersonaQueRecibe] = useState("");
    const [delegacion, setDelegacion] = useState("");

    const [horaInicio, setHoraInicio] = useState("");
    const [horaFin, setHoraFin] = useState("");
    const [nroPersonas, setNroPersonas] = useState("");
    const [formaAnticipo, setFormaAnticipo] = useState("");
    const [anticipo, setAnticipo] = useState("");
    const [formaLiquidacion, setFormaLiquidacion] = useState("");
    const [total, setTotal] = useState("");

    const [correo, setCorreo] = useState("");
    const [observaciones, setObservaciones] = useState("");
    const [fechaMontaje, setFechaMontaje] = useState("");
    const [horaInicioMontaje, setHoraInicioMontaje] = useState("");
    const [horaFinMontaje, setHoraFinMontaje] = useState("");
    const [fechaDesmontaje, setFechaDesmontaje] = useState("");
    const [horaInicioDesmontaje, setHoraInicioDesmontaje] = useState("");
    const [horaFinDesmontaje, setHoraFinDesmontaje] = useState("");

    const solicitudesCollection = collection(db, "solicitudes");

    const [serviciosOptions, setServiciosOptions] = useState([]);
    const [pisosOptions, setPisosOptions] = useState([]);
    const [delegacionesOptions, setDelegacionesOptions] = useState([]);

    const [servicios, setServicios] = useState([]);
    const [cantServicio, setCantServicio] = useState("");
    const [descripServicio, setDescripServicio] = useState("");
    const [precioUniServicio, setPrecioUniServicio] = useState("");
    const [cuotaMontajeServicio, setCuotaMontajeServicio] = useState("");
    const [cuotaDesmontajeServicio, setCuotaDesmontajeServicio] = useState("");
    const [cuotaEjecutorServicio, setCuotaEjecutorServicio] = useState("");

    const [botonHabilitado, setBotonHabilitado] = useState(true);

    function createServiciosOptions(querySnapshot) {
        return querySnapshot.docs
            .filter((doc) => doc.data().tipo === "1")
            .map((doc, index) => (
                <option key={`servicios-${index}`} value={doc.data().nombre}
                    precio={doc.data().precio}
                    cuotamontaje={doc.data().cuotaMontaje}
                    cuotadesmontaje={doc.data().cuotaDesmontaje}
                    cuotaejecutor={doc.data().cuotaEjecutor}
                >
                    {doc.data().nombre}
                </option>
            ));
    }

    function createDatalistOptions(querySnapshot, tipo) {
        return querySnapshot.docs
            .filter((doc) => doc.data().tipo === tipo)
            .map((doc, index) => (
                <option key={`opcion-${index}`} value={doc.data().nombre}>
                    {doc.data().nombre}
                </option>
            ));
    }

    useEffect(() => {
        const fetchData = async () => {
            try {
                const querySnapshot2 = await getDocs(query(collection(db, "servicios"), orderBy("nombre")));
                let serviciosOpciones = createServiciosOptions(querySnapshot2);

                setServiciosOptions(serviciosOpciones);
                setPisosOptions(createDatalistOptions(querySnapshot2, "2"));
                setDelegacionesOptions(createDatalistOptions(querySnapshot2, "3"));
            } catch (error) {
                console.error("Error al obtener datos fetchData ItinerariosOptions", error);
            }
        };

        fetchData();
    }, []);

    const horas = [
        "00:00", "00:30", "01:00", "01:30", "02:00", "02:30", "03:00", "03:30",
        "04:00", "04:30", "05:00", "05:30", "06:00", "06:30", "07:00", "07:30",
        "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
        "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
        "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30",
        "20:00", "20:30", "21:00", "21:30", "22:00", "22:30", "23:00", "23:30"
    ];


    const store = async (e) => {
        e.preventDefault();
        var mesVariable = moment(fecha).format("MMMM");

        try {

            await addDoc(solicitudesCollection, {
                estadoSolicitud: "P",
                cliente: cliente,
                fecha: fecha,
                motivo: motivo,
                direccion: direccion,
                telefono: telefono,
                telefono2: telefono2,
                piso: piso,
                personaQueRecibe: personaQueRecibe,
                delegacion: delegacion,
                horaInicio: horaInicio,
                horaFin: horaFin,
                nroPersonas: nroPersonas,
                formaAnticipo: formaAnticipo,
                anticipo: anticipo,
                formaLiquidacion: formaLiquidacion,
                total: total,

                correo: correo,
                observaciones: observaciones,
                fechaMontaje: fechaMontaje,
                horaInicioMontaje: horaInicioMontaje,
                horaFinMontaje: horaFinMontaje,
                fechaDesmontaje: fechaDesmontaje,
                horaInicioDesmontaje: horaInicioDesmontaje,
                horaFinDesmontaje: horaFinDesmontaje,

                mes: mesVariable,

                servicios: servicios,
            });
            clearFields();
            Swal.fire('Exito!', 'Gracias, nos pondremos en contacto contigo.', 'success');
        } catch (error) {
            console.error("Error al agregar la solicitud: ", error);
            Swal.fire({
                title: '¡Error!',
                text: 'Hubo un problema inesperado. Vuelva a intentar o avisa si persiste.',
                icon: 'error',
                confirmButtonColor: '#d33',
            });
        };
    }

    const clearFields = () => {
        setCliente("");
        setFecha("");
        setMotivo("");
        setDireccion("");
        setTelefono("");
        setTelefono2("");
        setPiso("");
        setPersonaQueRecibe("");
        setDelegacion("");
        setHoraInicio("");
        setHoraFin("");
        setNroPersonas("");
        setFormaAnticipo("");
        setAnticipo("");
        setFormaLiquidacion("");
        setTotal("");

        setCorreo("");
        setObservaciones("");
        setFechaMontaje("");
        setHoraInicioMontaje("");
        setHoraFinMontaje("");
        setFechaDesmontaje("");
        setHoraInicioDesmontaje("");
        setHoraFinDesmontaje("");

        setError("");

        setServicios([]);
        setCantServicio("");
        setDescripServicio("");
        setPrecioUniServicio("");
        setCuotaMontajeServicio("");
        setCuotaDesmontajeServicio("");
        setCuotaEjecutorServicio("");
        setBotonHabilitado(true)
    };

    const validateFields = async (e) => {
        e.preventDefault();

        const camposFaltantes = [];
        if (cliente.trim() === "") camposFaltantes.push("Cliente");
        if (motivo.trim() === "") camposFaltantes.push("Motivo");
        if (correo.trim() === "") camposFaltantes.push("Correo");
        if (telefono.trim() === "") camposFaltantes.push("Teléfono");
        if (fecha.trim() === "") camposFaltantes.push("Fecha");
        if (direccion.trim() === "") camposFaltantes.push("Dirección");

        if (camposFaltantes.length > 0) {
            setError(`Faltan los siguientes campos obligatorios: ${camposFaltantes.join(", ")}`);
            setTimeout(clearError, 2000);
            setBotonHabilitado(true);
            return false;
        }

        const totalServicios = servicios.reduce((sum, servicio) => sum + servicio.subTotalServicio, 0);
        const minTotalPermitido = totalServicios * 0.7; // Calcula el 70%

        if (Number(total) < minTotalPermitido) {
            setError(`El TOTAL ingresado no puede ser menor a la suma de los servicios`);
            setTimeout(clearError, 2000);
            setBotonHabilitado(true);
            return false;
        }

        setError("");
        setBotonHabilitado(false);
        await store(e);
        return true;
    };

    const clearError = () => {
        setError("");
    };

    const agregarProducto = () => {
        if (
            cantServicio.trim() === "" ||
            descripServicio.trim() === ""
        ) {
            setError("Cant y Descrip no puede estar vacío*");
            setTimeout(clearError, 2000);
            return false;
        }
        const nuevoProducto = {
            cantServicio: cantServicio,
            descripServicio: descripServicio,
            precioUniServicio: precioUniServicio,
            subTotalServicio: cantServicio * precioUniServicio,
            cuotaMontajeServicio: cuotaMontajeServicio,
            cuotaDesmontajeServicio: cuotaDesmontajeServicio,
            cuotaEjecutorServicio: cuotaEjecutorServicio,
        };
        setServicios([...servicios, nuevoProducto]);
        setCantServicio("");
        setDescripServicio("");
        setPrecioUniServicio("");
        setCuotaMontajeServicio("");
        setCuotaDesmontajeServicio("");
        setCuotaEjecutorServicio("");
    };

    const eliminarServicio = (index) => {
        const serviciosFiltrados = servicios.filter((_, i) => i !== index);
        setServicios(serviciosFiltrados);
    };

    return (
        <Modal show={true} size="lg" aria-labelledby="contained-modal-title-vcenter" centered>
            <Modal.Header>
                <Modal.Title id="contained-modal-title-vcenter">
                    <div className="d-flex">
                        <h1 className="me-1">Crear Solicitud Evento</h1>
                    </div>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <form style={{ transform: "scale(0.98)" }}>
                    <div className="row">
                        <div className="col-xl-3 col-lg-3 col-md-12 col-sm-11 col-11 mb-2">
                            <label className="form-label small-font">Fecha de tu Evento*</label>
                            <input
                                value={fecha}
                                onChange={(e) => setFecha(e.target.value)}
                                type="date"
                                className="form-control small-input"
                                required
                            />
                        </div>

                        <div className="col-xl-5 col-lg-5 col-md-12 col-sm-11 col-11 mb-2">
                            <label className="form-label small-font">Nombre Completo del Responsable*</label>
                            <input
                                placeholder="Completar con Responsable del servicio"
                                value={cliente}
                                onChange={(e) => setCliente(e.target.value)}
                                type="text"
                                className="form-control small-input"
                                required
                            />
                        </div>

                        <div className="col-xl-4 col-lg-4 col-md-12 col-sm-11 col-11 mb-2">
                            <label className="form-label small-font">Correo Electrónico*</label>
                            <input
                                placeholder="Ingresa tu email"
                                value={correo}
                                onChange={(e) => setCorreo(e.target.value)}
                                type="text"
                                className="form-control small-input"
                                required
                            />
                        </div>
                    </div>

                    <div className="row">
                        <div className="col-xl-6 col-lg-6 col-md-12 col-sm-11 col-11 mb-2">
                            <label className="form-label small-font">Dirección Completa*</label>
                            <input
                                value={direccion}
                                onChange={(e) => setDireccion(e.target.value)}
                                type="text"
                                className="form-control small-input"
                                required
                            />
                        </div>

                        <div className="col-xl-6 col-lg-6 col-md-12 col-sm-12 col-11 mb-2">
                            <label className="form-label small-font">Delegación o Municipio</label>
                            <input
                                value={delegacion}
                                onChange={(e) => setDelegacion(e.target.value)}
                                className="form-control"
                                list="delegacion-list"
                                multiple={false}
                            />
                            <datalist id="delegacion-list">
                                {delegacionesOptions}
                            </datalist>
                        </div>
                    </div>

                    <div className="row">
                        <div className="col-xl-4 col-lg-4 col-md-12 col-sm-12 col-11 mb-2">
                            <label className="form-label small-font">¿Cuántos Pisos hay que subir?</label>
                            <input
                                value={piso}
                                onChange={(e) => setPiso(e.target.value)}
                                className="form-control"
                                list="pisos-list"
                                multiple={false}
                            />
                            <datalist id="pisos-list">
                                {pisosOptions}
                            </datalist>
                        </div>

                        <div className="col-xl-8 col-lg-8 col-md-12 col-sm-11 col-11 mb-2">
                            <label className="form-label small-font">Nombre de la Persona que recibirá</label>
                            <input
                                value={personaQueRecibe}
                                onChange={(e) => setPersonaQueRecibe(e.target.value)}
                                type="text"
                                className="form-control small-input"
                                required
                            />
                        </div>
                    </div>

                    <div className="row">
                        <div className="col-xl-4 col-lg-4 col-md-12 col-sm-11 col-11 mb-2">
                            <label className="form-label small-font">Teléfono Principal*</label>
                            <input
                                value={telefono}
                                onChange={(e) => setTelefono(e.target.value)}
                                type="number"
                                className="form-control small-input"
                                required
                            />
                        </div>

                        <div className="col-xl-4 col-lg-4 col-md-12 col-sm-11 col-11 mb-2">
                            <label className="form-label small-font">Teléfono Secundario</label>
                            <input
                                value={telefono2}
                                onChange={(e) => setTelefono2(e.target.value)}
                                type="number"
                                className="form-control small-input"
                            />
                        </div>

                        <div className="col-xl-2 col-lg-2 col-md-6 col-sm-5 col-11 mb-2">
                            <label className="form-label small-font">Hora Inicio</label>
                            <select
                                value={horaInicio}
                                onChange={(e) => setHoraInicio(e.target.value)}
                                className="form-control small-input"
                                multiple={false}
                            >
                                <option value="">--:--</option>
                                {horas.map((hora, index) => (
                                    <option key={index} value={hora.replace(":", "")}>{hora} {parseInt(hora.slice(0, 2)) < 12 ? "AM" : "PM"}</option>
                                ))}
                            </select>
                        </div>

                        <div className="col-xl-2 col-lg-2 col-md-6 col-sm-5 col-11 mb-2">
                            <label className="form-label small-font">Hora Fin</label>
                            <select
                                value={horaFin}
                                onChange={(e) => setHoraFin(e.target.value)}
                                className="form-control small-input"
                                multiple={false}
                            >
                                <option value="">--:--</option>
                                {horas.map((hora, index) => (
                                    <option key={index} value={hora.replace(":", "")}>{hora} {parseInt(hora.slice(0, 2)) < 12 ? "AM" : "PM"}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="row">
                        <div className="col-xl-6 col-lg-6 col-md-12 col-sm-11 col-11 mb-2">
                            <label className="form-label small-font">Motivo de la Celebración*</label>
                            <input
                                value={motivo}
                                onChange={(e) => setMotivo(e.target.value)}
                                type="text"
                                className="form-control small-input"
                                required
                            />
                        </div>


                        <div className="col-xl-6 col-lg-6 col-md-12 col-sm-11 col-11 mb-2">
                            <label className="form-label small-font">Número de Asistentes</label>
                            <input
                                value={nroPersonas}
                                onChange={(e) => setNroPersonas(e.target.value)}
                                type="number"
                                className="form-control small-input"
                            />
                        </div>
                    </div>

                    <div className="row">
                        <div className="col-xl-3 col-lg-3 col-md-12 col-sm-11 col-11 mb-2">
                            <label className="form-label small-font">Forma Anticipo</label>
                            <select
                                value={formaAnticipo}
                                onChange={(e) => setFormaAnticipo(e.target.value)}
                                className="form-control small-input"
                                multiple={false}
                            >
                                <option value="" style={{ fontStyle: "italic" }}>Seleccione una...</option>
                                <option value="Transferencia">Transferencia</option>
                                <option value="Efectivo">Efectivo</option>
                                <option value="Tarjeta de Credito">Tarjeta de Credito</option>
                            </select>
                        </div>

                        <div className="col-xl-3 col-lg-3 col-md-12 col-sm-11 col-11 mb-2">
                            <label className="form-label small-font">Anticipo</label>
                            <input
                                value={anticipo}
                                onChange={(e) => setAnticipo(Number(e.target.value))}
                                type="number"
                                className="form-control small-input"
                                required
                            />
                        </div>

                        <div className="col-xl-3 col-lg-3 col-md-12 col-sm-11 col-11 mb-2">
                            <label className="form-label small-font">Forma Liquidacion</label>
                            <select
                                value={formaLiquidacion}
                                onChange={(e) => setFormaLiquidacion(e.target.value)}
                                className="form-control small-input"
                                multiple={false}
                            >
                                <option value="" style={{ fontStyle: "italic" }}>Seleccione una...</option>
                                <option value="Transferencia">Transferencia</option>
                                <option value="Efectivo">Efectivo</option>
                                <option value="Tarjeta de Credito">Tarjeta de Credito</option>
                            </select>
                        </div>

                        <div className="col-xl-3 col-lg-3 col-md-12 col-sm-11 col-11 mb-2">
                            <label className="form-label small-font">Total</label>
                            <input
                                value={total}
                                onChange={(e) => setTotal(Number(e.target.value))}
                                type="number"
                                className="form-control small-input"
                                min="0"
                                required
                            />
                        </div>
                    </div>

                    <hr className="mt-4 mb-4"></hr>

                    <div className="row mb-1">
                        <h4>Datos para Montaje</h4>
                        <p className="fst-italic text-center justify-content-center">
                            Recuerda elegir horarios amplios para asegurar una mejor experiencia. Si tu evento puede ser montado un día antes,
                            no olvides solicitar "Montaje un día antes" para mayor comodidad y planificación.</p>
                    </div>

                    <div className="row">
                        <div className="col-xl-6 col-lg-6 col-md-12 col-sm-11 col-11">
                            <label className="form-label small-font">Fecha Montaje</label>
                            <input
                                value={fechaMontaje}
                                onChange={(e) => setFechaMontaje(e.target.value)}
                                type="date"
                                className="form-control small-input"
                                required
                            />
                        </div>

                        <div className="col-xl-3 col-lg-3 col-md-6 col-sm-6 col-6">
                            <label className="form-label small-font text-center">Hora Inicio Montaje</label>
                            <select
                                value={horaInicioMontaje}
                                onChange={(e) => setHoraInicioMontaje(e.target.value)}
                                className="form-control small-input"
                                multiple={false}
                            >
                                <option value="">--:--</option>
                                {horas.map((hora, index) => (
                                    <option key={index} value={hora.replace(":", "")}>{hora} {parseInt(hora.slice(0, 2)) < 12 ? "AM" : "PM"}</option>
                                ))}
                            </select>
                        </div>

                        <div className="col-xl-3 col-lg-3 col-md-6 col-sm-5 col-5">
                            <label className="form-label small-font text-center">Hora Fin Montaje</label>
                            <select
                                value={horaFinMontaje}
                                onChange={(e) => setHoraFinMontaje(e.target.value)}
                                className="form-control small-input"
                                multiple={false}
                            >
                                <option value="">--:--</option>
                                {horas.map((hora, index) => (
                                    <option key={index} value={hora.replace(":", "")}>{hora} {parseInt(hora.slice(0, 2)) < 12 ? "AM" : "PM"}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <hr className="mt-4 mb-4"></hr>

                    <div className="row">
                        <h4>Datos para Desmontaje</h4>
                    </div>
                    <div className="row">
                        <div className="col-xl-6 col-lg-6 col-md-12 col-sm-11 col-11">
                            <label className="form-label small-font">Fecha Desmontaje</label>
                            <input
                                value={fechaDesmontaje}
                                onChange={(e) => setFechaDesmontaje(e.target.value)}
                                type="date"
                                className="form-control small-input"
                                required
                            />
                        </div>

                        <div className="col-xl-3 col-lg-3 col-md-6 col-sm-6 col-6">
                            <label className="form-label small-font text-center">Hora Inicio Desmontaje</label>
                            <select
                                value={horaInicioDesmontaje}
                                onChange={(e) => setHoraInicioDesmontaje(e.target.value)}
                                className="form-control small-input"
                                multiple={false}
                            >
                                <option value="">--:--</option>
                                {horas.map((hora, index) => (
                                    <option key={index} value={hora.replace(":", "")}>{hora} {parseInt(hora.slice(0, 2)) < 12 ? "AM" : "PM"}</option>
                                ))}
                            </select>
                        </div>

                        <div className="col-xl-3 col-lg-3 col-md-6 col-sm-5 col-5">
                            <label className="form-label small-font text-center">Hora Fin Desmontaje</label>
                            <select
                                value={horaFinDesmontaje}
                                onChange={(e) => setHoraFinDesmontaje(e.target.value)}
                                className="form-control small-input"
                                multiple={false}
                            >
                                <option value="">--:--</option>
                                {horas.map((hora, index) => (
                                    <option key={index} value={hora.replace(":", "")}>{hora} {parseInt(hora.slice(0, 2)) < 12 ? "AM" : "PM"}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="row">
                        <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12 col-12">
                            <label className="form-label small-font">Observaciones</label>
                            <input
                                value={observaciones}
                                onChange={(e) => setObservaciones(e.target.value)}
                                type="textarea"
                                className="form-control"
                                required
                            />
                        </div>
                    </div>

                    <hr className="mt-4 mb-4"></hr>

                    <div className="row align-items-lg-end">
                        <h5 style={{ fontWeight: "bold" }}>Elegir sus Servicios deseados:</h5>
                        <div className="row">
                            <div className="col-xl-8 col-lg-8 col-md-12 col-sm-12 col-12">
                                <label className="form-label small-font">Descripción</label>
                                <div className="d-flex">
                                    <select
                                        value={descripServicio}
                                        onChange={(e) => {
                                            setDescripServicio(e.target.value);

                                            const selectedOption = serviciosOptions.find((option) => option.props.value === e.target.value);

                                            if (selectedOption) {
                                                const { precio, cuotamontaje, cuotadesmontaje, cuotaejecutor } = selectedOption.props;
                                                setPrecioUniServicio(Number(precio))
                                                setCuotaMontajeServicio(cuotamontaje);
                                                setCuotaDesmontajeServicio(cuotadesmontaje);
                                                setCuotaEjecutorServicio(cuotaejecutor);
                                            }
                                        }}
                                        className="form-control small-input"
                                        required
                                    >
                                        <option value="" disabled>
                                            Seleccione un servicio...
                                        </option>
                                        {serviciosOptions}
                                    </select>
                                </div>
                            </div>

                            <div className="col-0 sm-2 d-none">
                                <label className="form-label small-font">Precio Unitario</label>
                                <input
                                    value={precioUniServicio}
                                    onChange={(e) => setPrecioUniServicio(e.target.value)}
                                    type="number"
                                    className="form-control small-input"
                                    disabled
                                />
                            </div>
                            <div className="col-xl-2 col-lg-2 col-md-6 col-sm-6 col-6">
                                <label className="form-label small-font">Cantidad</label>
                                <input
                                    value={cantServicio}
                                    onChange={(e) => {
                                        setCantServicio(e.target.value);
                                    }}
                                    type="number"
                                    className="form-control small-input"
                                />
                            </div>
                            <div className="col-0 sm-2 d-none">
                                <label className="form-label small-font">SubTotal</label>
                                <input
                                    value={cantServicio * precioUniServicio}
                                    type="number"
                                    className="form-control small-input"
                                    disabled
                                />
                            </div>
                            <div className="col-xl-2 col-lg-2 col-md-2 col-sm-2 col-2 d-flex align-items-xl-end align-items-md-end align-items-sm-center align-items-center">
                                <button
                                    type="button"
                                    onClick={agregarProducto}
                                    className="btn btn-success"
                                    style={{
                                        marginBottom: "-2.1em",
                                        height: "40px"
                                    }}
                                >
                                    Agregar +
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="row mt-4">
                        <div className="col">
                            <h6 style={{ fontWeight: "bold" }}>Servicios Agregados</h6>
                            {servicios.length > 0 ? (
                                <div className="table__container">
                                    <table className="table__body w-auto">
                                        <thead>
                                            <tr>
                                                <th scope="col">Cant</th>
                                                <th className="text-start" scope="col">Descrip</th>
                                                <th scope="col"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {servicios.map((producto, index) => (
                                                <tr key={index}>
                                                    <td>{producto.cantServicio}</td>
                                                    <td className="text-start">{producto.descripServicio}</td>
                                                    <td
                                                        className="btn btn-danger btn-sm mt-2"
                                                        onClick={() => {
                                                            eliminarServicio(index);
                                                        }}
                                                    >
                                                        <i className="fa-solid fa-trash-can"></i>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p style={{ fontStyle: "italic" }}>No se han agregado servicios aún.</p>
                            )}
                        </div>
                    </div>

                    <hr className="mt-4 mb-4"></hr>

                    <div style={{ display: "flex", justifyContent: "end" }}>
                        {error && (
                            <div
                                className="alert alert-danger"
                                role="alert"
                            >
                                {error}
                            </div>
                        )}
                        {botonHabilitado ? (<button
                            type="submit"
                            disabled={!botonHabilitado}
                            onClick={(e) => {
                                setBotonHabilitado(false);
                                validateFields(e);
                            }}
                            className="btn btn-success"
                            style={{ marginTop: "10px" }}
                        >
                            Agregar
                        </button>) : (
                            <button
                                disabled
                                className="btn btn-success"
                                style={{ marginTop: "10px", backgroundColor: "lightblue" }}
                            >
                                Cargando...
                            </button>
                        )}
                    </div>
                </form>
            </Modal.Body >
        </Modal >
    );
}

export default CrearSolicitud;
