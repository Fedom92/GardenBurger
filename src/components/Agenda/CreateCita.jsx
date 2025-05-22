import React, { useState, useEffect, useCallback, useRef } from "react";
import { collection, addDoc, query, orderBy, getDocs, where, doc, getDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import { Modal } from "react-bootstrap";
import 'moment/locale/es';
import moment from "moment";

function CreateCita(props) {
  const hoy = moment(new Date()).format("YYYY-MM-DD");
  const { agregarcita, marcarleidanotificacion, ...propsModal } = props;
  const [apellidoConNombre, setApellidoConNombre] = useState("");
  const [idPacienteCita, setIdPacienteCita] = useState("");
  const [idc, setIdc] = useState("");
  const [tipoIdc, setTipoIdc] = useState("dni");
  const [estado, setEstado] = useState("Agendada");
  const [numero, setNumero] = useState("");
  const [fecha, setFecha] = useState("");
  const [horaInicio, setHoraInicio] = useState("08:00");
  const [horaFin, setHoraFin] = useState("08:30");
  const [comentario, setComentario] = useState("");
  const [error, setError] = useState("");
  const [editable, setEditable] = useState(true);
  const [optionsHoraInicio, setOptionsHoraInicio] = useState([]);
  const [optionsHoraFin, setOptionsHoraFin] = useState([]);
  const [valorBusquedaOptions, setValorBusquedaOptions] = useState([]);
  const [, setHorariosAtencion] = useState([]);
  const [showBuscador, setShowBuscador] = useState(true);
  const [estadoOptions, setEstadoOptions] = useState([]);

  const citasCollection = collection(db, "citas");

  const pacientesCollectiona = collection(db, "clients");
  const pacientesCollection = useRef(query(pacientesCollectiona), orderBy("valorBusqueda"));

  const horariosCollectiona = collection(db, "horariosAtencion");
  const horariosCollection = useRef(query(horariosCollectiona, orderBy("name")));

  const estadosCollectiona = collection(db, "estados");
  const estadosCollection = useRef(query(estadosCollectiona));

  const updateOptionsPacientes = useCallback((snapshot) => {
    const options = snapshot.docs.map((doc) => doc.data().valorBusqueda);
    setValorBusquedaOptions(options);
  }, []);

  //Render:
  const valorBusquedaOptionsJSX = valorBusquedaOptions.map((option, index) => (
    <option key={`valorBusqueda-${index}`} value={option}>
      {option}
    </option>
  ));

  const updateOptionsHorarios = useCallback((horarios) => {
    setHorariosAtencion(horarios);

    const optionsHoraInicio = horarios.map((horario, index) => (
      <option key={`horarioInicio-${index}`} value={horario.name}>
        {horario.name}
      </option>
    ));
    optionsHoraInicio.pop();
    setOptionsHoraInicio(optionsHoraInicio);

    if (horaInicio) {
      const optionsHoraFin = horarios
        .filter((horario) => horario.name > horaInicio)
        .map((horario, index) => (
          <option key={`horarioFin-${index}`} value={horario.name}>
            {horario.name}
          </option>
        ));
      setHoraFin(optionsHoraFin[0]?.props.children);
      setOptionsHoraFin(optionsHoraFin);
    }
  },
    [horaInicio]
  );

  useEffect(() => {
    if (props.horarios) {
      updateOptionsHorarios(props.horarios);
    } else {
      const fetchDataAndSetHorarios = async () => {
        try {
          const horariosSnapshot = await getDocs(horariosCollection.current);
          const horariosArray = horariosSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          updateOptionsHorarios(horariosArray);
        } catch (error) {
          console.error('Error fetching data CreateCita Horarios:', error);
        }
      };

      fetchDataAndSetHorarios();
    }

    const fetchData = async () => {
      try {
        const pacientesSnapshot = await getDocs(pacientesCollection.current);
        await updateOptionsPacientes(pacientesSnapshot);

      } catch (error) {
        console.error('Error fetching data Pacientes CreateCita:', error);
      }

    };

    fetchData();

  }, [updateOptionsPacientes, updateOptionsHorarios, props.horarios]);

  useEffect(() => {
    if (props.paciente) {
      setNumero(props.paciente.numero);
      setApellidoConNombre(props.paciente.apellidoConNombre);
      setTipoIdc(props.paciente.tipoIdc);
      setIdc(props.paciente.idc);
      setIdPacienteCita(props.paciente.id);
      setShowBuscador(false);
      setEditable(false);
    } else {
      setApellidoConNombre("");
      setTipoIdc("dni")
      setIdc("");
      setIdPacienteCita("");
      setNumero("");
    }
  }, [props.paciente]);

  useEffect(() => {
    const fetchPaciente = async () => {
      if (props.id) {
        setShowBuscador(false);
        const docRef = doc(db, "clients", props.id);
        const docSnapshot = await getDoc(docRef);

        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          setApellidoConNombre(data.apellidoConNombre);
          setTipoIdc(data.tipoIdc);
          setIdc(data.idc);
          setNumero(data.numero);
          setIdPacienteCita(props.id);
          setEditable(false);
        }
      }
    };

    fetchPaciente();
  }, [props.id, apellidoConNombre]);

  const getOptionsEstado = useCallback((snapshot) => {
    const options = snapshot.docs.map((doc, index) => (
      <option key={`estado-${index}`} value={doc.data().name}>{doc.data().name}</option>
    ));
    setEstadoOptions(options);
  }, []);

  useEffect(() => {
    const fetchData = async () => {

      if (!props.estadooptions) {
        const optionsEstadosSnapshot = await getDocs(estadosCollection.current);
        await getOptionsEstado(optionsEstadosSnapshot);
      };
    }

    fetchData();
  }, [props.estadooptions, getOptionsEstado]);



  const store = async (e) => {
    e.preventDefault();
    moment.locale('es')
    var mesVariable = moment(fecha).format("MMMM");

    const nuevaCita = {
      apellidoConNombre: apellidoConNombre,
      tipoIdc: tipoIdc,
      idc: idc,
      idPacienteCita: idPacienteCita,
      estado: estado,
      numero: numero,
      fecha: fecha,
      mes: mesVariable,
      comentario: comentario,
      horaInicio: horaInicio,
      horaFin: horaFin,
    };

    try {
      const docRef = await addDoc(citasCollection, nuevaCita);
      if (props.agregarcita) {
        props.agregarcita({ id: docRef.id, ...nuevaCita });
      }
      if (props.notificacion_id) {
        await props.marcarleidanotificacion(props.notificacion_id);
      }
    } catch (error) {
      console.error("Error al agregar cita: ", error);
    }

    clearFields();
    props.onHide();
  };

  const manejarValorSeleccionado = async (suggestion) => {
    if (suggestion === "") {
      setApellidoConNombre("");
      setIdPacienteCita("")
      setTipoIdc("dni")
      setIdc("");
      setNumero("");
      setEditable(true);
      return;
    }

    const querySnapshot = await getDocs(
      query(collection(db, "clients"), where("valorBusqueda", "==", suggestion))
    );

    const doc = querySnapshot.docs[0];

    if (doc) {
      const data = doc.data();
      setApellidoConNombre(data.apellidoConNombre);
      setIdPacienteCita(doc.id)
      setTipoIdc(data.tipoIdc);
      setIdc(data.idc);
      setNumero(data.numero);
      setEditable(false);
    }
  };

  const clearFields = () => {
    setApellidoConNombre("");
    setTipoIdc("dni")
    setIdc("");
    setNumero("");
    setEstado("Agendada");
    setFecha("");
    setHoraInicio("08:00");
    setHoraFin("08:30");
    setComentario("");
  };

  const validateFields = (e) => {
    e.preventDefault();
    if (
      apellidoConNombre.trim() === "" ||
      idc.trim() === "" ||
      numero.trim() === "" ||
      fecha.trim() === "" ||
      horaInicio.trim() === "" ||
      horaFin.trim() === "") {
      setError("Respeta los campos obligatorios *");
      setTimeout(clearError, 2000);
      return false;
    } else {
      setError("");
      store(e);
    }
    return true;
  };

  const clearError = () => {
    setError("");
  };

  return (
    <Modal {...propsModal} size="lg" aria-labelledby="contained-modal-title-vcenter" centered>
      <Modal.Header closeButton onClick={() => {
        setEditable(true);
        clearFields();
      }}>
        <Modal.Title id="contained-modal-title-vcenter">
          <h1>Crear Cita</h1>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="container">
          <div className="col">
            <div className="row">
              {showBuscador && (<div className="col-12 mb-2" style={{ display: "flex" }}>
                <input
                  placeholder="Buscador por Apellido, Nombre o DNI"
                  type="text"
                  className="form-control"
                  onChangeCapture={(e) =>
                    manejarValorSeleccionado(e.target.value)
                  }
                  list="pacientes-list"
                  multiple={false}
                  style={{ height: "43px" }}
                />

                <datalist id="pacientes-list">
                  {valorBusquedaOptionsJSX}
                </datalist>
                <i className="fa-solid fa-magnifying-glass" style={{ display: "flex", alignItems: "center", marginLeft: "-26px" }}></i>
              </div>)}
            </div>

            <form style={{ transform: "scale(0.98)" }}>
              <div className="row">
                <div className="col-6 mb-2">
                  <label className="form-label">IDC*</label>
                  <div style={{ display: "flex" }}>
                    <select
                      value={tipoIdc}
                      onChange={(e) => { setTipoIdc(e.target.value); setIdc("") }}
                      className={!editable ? "form-control-selectedCode me-1" : "form-control-tipoIDC me-1"}
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
                      value={idc || ""}
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

                <div className="col-6 mb-2">
                  <label className="form-label">Apellido y Nombres*</label>
                  <input
                    value={apellidoConNombre || ""}
                    onChange={(e) => setApellidoConNombre(e.target.value)}
                    type="text"
                    className="form-control"
                    disabled={!editable}
                    required
                  />
                </div>

              </div>

              <div className="row">
                <div className="col-8 mb-2">
                  <label className="form-label">Teléfono*</label>
                    <input
                      value={numero || ""}
                      onChange={(e) => setNumero(e.target.value)}
                      type="number"
                      className="form-control"
                      disabled={!editable}
                      required
                    />
                </div>
                <div className="col-4 mb-2">
                  <label className="form-label">Estado*</label>
                  <select
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    className="form-control"
                    multiple={false}
                    required
                  >
                    {props.estadooptions || estadoOptions}
                  </select>
                </div>
              </div>

              <div className="row">
                <div className="col-4 mb-2">
                  <label className="form-label">Fecha*</label>
                  <input
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    type="date"
                    className="form-control"
                    min={hoy}
                    required
                  />
                </div>

                <div className="col-4 mb-2">
                  <label className="form-label">Hora Inicio*</label>
                  <select
                    value={horaInicio}
                    onChange={(e) => setHoraInicio(e.target.value)}
                    className="form-control"
                    multiple={false}
                    required
                  >
                    {optionsHoraInicio}
                  </select>
                </div>
                <div className="col-4 mb-2">
                  <label className="form-label">Hora Fin*</label>
                  <select
                    value={horaFin}
                    onChange={(e) => setHoraFin(e.target.value)}
                    className="form-control"
                    multiple={false}
                    required
                  >
                    {optionsHoraFin}
                  </select>
                </div>
              </div>

              <div className="row">
                <div className="col-6 mb-2">
                  <label className="form-label">Comentarios</label>
                  <input
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    type="text"
                    className="form-control"
                  />
                </div>
              </div>
              <div style={{ display: "flex" }}>
                <button
                  type="submit"
                  onClick={validateFields}
                  className="btn button-main"
                  style={{ margin: "1px" }}
                >
                  Agregar
                </button>
                {error && (
                  <div
                    className="alert alert-danger"
                    role="alert"
                    style={{ margin: "10px" }}
                  >
                    {error}
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
}

export default CreateCita;
