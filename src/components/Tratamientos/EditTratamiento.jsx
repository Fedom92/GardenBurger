import React, { useState } from "react";
import { getDoc, updateDoc, doc, query, collection, where, getDocs, limit } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import { Modal } from "react-bootstrap";
import moment from "moment";

const EditTratamiento = (props) => {
  const { editartratamiento, ...propsModal } = props;
  const [codigo, setCodigo] = useState(props.tratamiento.codigo);
  const [apellidoConNombre, setApellidoConNombre] = useState(props.tratamiento.apellidoConNombre || "");
  const [idPaciente, setIdPaciente] = useState(props.tratamiento.idPaciente || "");
  const [tipoIdc, setTipoIdc] = useState(props.tratamiento.tipoIdc || "");
  const [idc, setIdc] = useState(props.tratamiento.idc || "");
  const [tarifasTratamientos, setTarifasTratamientos] = useState(props.tratamiento.tarifasTratamientos || "");
  const [cta, setCta] = useState(props.tratamiento.cta || "");
  const [precio, setPrecio] = useState(props.tratamiento.precio || "");
  const [pieza, setPieza] = useState(props.tratamiento.pieza || "");
  const [formaPago, setFormaPago] = useState(props.tratamiento.formaPago || "");
  const [estadosTratamientos, setEstadosTratamientos] = useState(props.tratamiento.estadosTratamientos || "");
  const [fecha, setFecha] = useState(props.tratamiento.fecha || "");
  const [fechaVencimiento, setFechaVencimiento] = useState(props.tratamiento.fechaVencimiento || "");
  const [notas, setNotas] = useState(props.tratamiento.notas || "");

  async function buscarTratamiento(tratamiento) {
    if (!tratamiento) {
      setCta("");
      setPrecio("");
      return;
    }

    const q = query(collection(db, "tarifas"), where("tratamiento", "==", tratamiento), limit(1));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const data = querySnapshot.docs[0].data();
      if (data.eliminado) {
        const confirmMessage = "El tratamiento seleccionado está marcado como eliminado. ¿Deseas continuar?";
        const shouldContinue = window.confirm(confirmMessage);
        if (!shouldContinue) {
          props.onHide()
          return;
        }
      }
      setCta(data.codigo);
      setPrecio(data.tarifa);
    } else {
      setCta("");
      setPrecio("");
    }
  }

  const update = async (e) => {
    e.preventDefault();
    const tratamientoRef = doc(db, "tratamientos", props.id);
    const tratamientoDoc = await getDoc(tratamientoRef);
    const tratamientoData = tratamientoDoc.data();
    moment.locale('es')
    var mesVariable = moment(fecha || tratamientoData.fecha).format("MMMM");

    const newData = {
      codigo: codigo || tratamientoData.codigo,
      apellidoConNombre: apellidoConNombre || tratamientoData.apellidoConNombre,
      idPaciente: idPaciente || tratamientoData.idPaciente,
      tipoIdc: tipoIdc || tratamientoData.tipoIdc,
      idc: idc || tratamientoData.idc,
      tarifasTratamientos: tarifasTratamientos || tratamientoData.tarifasTratamientos,
      cta: cta || tratamientoData.cta,
      precio: precio || tratamientoData.precio,
      restoCobro: precio || tratamientoData.precio,
      pieza: pieza || tratamientoData.pieza,
      formaPago: formaPago || tratamientoData.formaPago,
      estadosTratamientos: estadosTratamientos || tratamientoData.estadosTratamientos,
      fecha: fecha || tratamientoData.fecha,
      mes: mesVariable,
      fechaVencimiento: fechaVencimiento || tratamientoData.fechaVencimiento,
      notas: notas || tratamientoData.notas,
    };
    await updateDoc(tratamientoRef, newData);
    props.editartratamiento({ id: props.id, ...newData });
    clearFields();
  };

  const clearFields = () => {
    setCodigo("");
    setApellidoConNombre("");
    setIdPaciente("");
    setTipoIdc("");
    setIdc("");
    setTarifasTratamientos("");
    setCta("");
    setPrecio("");
    setPieza("");
    setFormaPago("");
    setEstadosTratamientos("");
    setFecha("");
    setFechaVencimiento("");
    setNotas("");
  };

  return (
    <Modal
      {...propsModal}
      size="lg"
      aria-labelledby="contained-modal-title-vcenter"
      centered
    >
      <Modal.Header closeButton onClick={() => {
        clearFields();
        props.onHide();
      }}>
        <Modal.Title id="contained-modal-title-vcenter">
          <h1>Editar Tratamiento</h1>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="container">
          <div className="col">
            <form onSubmit={update} style={{ transform: "scale(0.98)" }}>

              <div className="row">
                <div className="col-6 mb-2">
                  <label className="form-label">IDC*</label>
                  <div style={{ display: "flex" }}>
                    <select
                      defaultValue={props.tratamiento.tipoIdc}
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
                      defaultValue={props.tratamiento.idc}
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
                    />
                  </div>
                </div>
                <div className="col-6 mb-2">
                  <label className="form-label">Apellido y Nombres</label>
                  <input
                    defaultValue={props.tratamiento.apellidoConNombre}
                    onChange={(e) => setApellidoConNombre(e.target.value)}
                    type="text"
                    className="form-control"
                  />
                </div>
              </div>

              <div className="row">
                <div className="col-6 mb-2">
                  <label className="form-label">Tratamiento</label>
                  <input
                    value={tarifasTratamientos}
                    onChange={(e) => {
                      setTarifasTratamientos(e.target.value)
                      buscarTratamiento(e.target.value)
                    }}
                    type="text"
                    placeholder="Selecciona un Tratamiento..."
                    className="form-control"
                    list="tratamientos-list"
                  />
                  <datalist id="tratamientos-list">
                    {props.tratamientosoptions}
                  </datalist>
                </div>
                <div className="col-6 mb-2">
                  <label className="form-label">Estado del Tratamiento</label>
                  <select
                    defaultValue={props.tratamiento.estadosTratamientos}
                    onChange={(e) => setEstadosTratamientos(e.target.value)}
                    className="form-control"
                    multiple={false}
                  >
                    <option value="">Selecciona un estado</option>
                    {props.estadostratamientosoptions}
                  </select>
                </div>
              </div>

              <div className="row">
                <div className="col-4 mb-2">
                  <label className="form-label">Forma de Pago</label>
                  <select
                    defaultValue={props.tratamiento.formaPago}
                    onChange={(e) => setFormaPago(e.target.value)}
                    className="form-control"
                    multiple={false}
                    required
                  >
                    <option value="Contado">Contado</option>
                    <option value="Cuotas">Cuotas</option>
                  </select>
                </div>

                <div className="col-4 mb-2">
                  <label className="form-label">Precio</label>
                  <input
                    defaultValue={props.tratamiento.precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    type="number"
                    className="form-control"
                  />
                </div>
                <div className="col-4 mb-2">
                  <label className="form-label">Pieza</label>
                  <input
                    defaultValue={props.tratamiento.pieza}
                    onChange={(e) => setPieza(e.target.value)}
                    type="number"
                    className="form-control"
                  />
                </div>
              </div>

              <div className="row">
                <div className="col mb-2">
                  <label className="form-label">Fecha</label>
                  <input
                    defaultValue={props.tratamiento.fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    type="date"
                    className="form-control"
                  />
                </div>

                {((formaPago === "Cuotas") || (props.tratamiento.formaPago === "Cuotas")) && (
                  <div className="col-6 mb-2">
                    <label className="form-label">Fecha Vencimiento</label>
                    <input
                      defaultValue={props.tratamiento.fechaVencimiento}
                      onChange={(e) => setFechaVencimiento(e.target.value)}
                      type="date"
                      className="form-control"
                    />
                  </div>)}
              </div>

              <div className="row">
                <div className="col-12 mb-2">
                  <label className="form-label">Notas</label>
                  <input
                    defaultValue={props.tratamiento.notas}
                    onChange={(e) => setNotas(e.target.value)}
                    type="text"
                    className="form-control"
                  />
                </div>
              </div>

              <button
                type="submit"
                onClick={() => {
                  props.onHide();
                }}
                className="btn button-main"
              >
                Editar
              </button>
            </form>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default EditTratamiento;
