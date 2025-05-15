import React, { useState } from "react";
import { getDoc, updateDoc, doc, query, collection, where, getDocs } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import { Modal } from "react-bootstrap";

const Edit = (props) => {
  const { editarcontrol, ...propsModal } = props;
  const [apellidoConNombre, setApellidoConNombre] = useState(props.control.apellidoConNombre || '');
  const [tipoIdc, setTipoIdc] = useState(props.control.tipoIdc || "dni");
  const [idc, setIdc] = useState(props.control.idc || '');
  const [tratamientoControl, setTratamientoControl] = useState(props.control.tratamientoControl || '');
  const [pieza, setPieza] = useState(props.control.pieza || '');
  const [fechaControlRealizado, setFechaControlRealizado] = useState(props.control.fechaControlRealizado || '');
  const [detalleTratamiento, setDetalleTratamiento] = useState(props.control.detalleTratamiento || '');


  const update = async (e) => {
    e.preventDefault();
    const controlRef = doc(db, "controlEvoluciones", props.id);
    const controlDoc = await getDoc(controlRef);
    const controlData = controlDoc.data();

    const busqueda = query(collection(db, "user"), where("uidParaComparar", "==", props.current_user.uid));
    const querySnapshot = await getDocs(busqueda);

    const newData = {
      apellidoConNombre: apellidoConNombre || controlData.apellidoConNombre,
      tipoIdc: tipoIdc || controlData.tipoIdc,
      idc: idc || controlData.idc,
      tratamientoControl: tratamientoControl || controlData.tratamientoControl,
      pieza: pieza || controlData.pieza,
      doctor: props.current_user.displayName,
      doctorId: querySnapshot.docs[0].data()?.idUnica || "",
      fechaControlRealizado: fechaControlRealizado || controlData.fechaControlRealizado,
      detalleTratamiento: detalleTratamiento || controlData.detalleTratamiento,
    };
    await updateDoc(controlRef, newData);
    props.editarcontrol({ id: props.id, ...newData });

  };

  return (
    <Modal
      {...propsModal}
      size="lg"
      aria-labelledby="contained-modal-title-vcenter"
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title id="contained-modal-title-vcenter">
          <h1>Editar Control</h1>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="container">
          <div className="row" style={{ marginTop: "-40px" }}>
            <div className="col">
              <form onSubmit={update} style={{ transform: "scale(0.96)" }}>
                <br></br>
                <div className="row">
                  <div className="col-6 mb-2">
                    <label className="form-label">IDC*</label>
                    <div style={{ display: "flex" }}>
                      <select
                        defaultValue={props.control.tipoIdc}
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
                        defaultValue={props.control.idc}
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
                        disabled
                      />
                    </div>
                  </div>
                  <div className="col-6 mb-2">
                    <label className="form-label">Apellido y Nombres:</label>
                    <input
                      defaultValue={props.control.apellidoConNombre}
                      onChange={(e) => setApellidoConNombre(e.target.value)}
                      type="text"
                      className="form-control"
                      disabled
                    />
                  </div>
                </div>
                <div className="row">
                  <div className="col-6 mb-2">
                    <label className="form-label">Tratamiento:</label>
                    <input
                      defaultValue={props.control.tratamientoControl}
                      onChange={(e) => {
                        setTratamientoControl(e.target.value)
                      }}
                      className="form-control"
                      disabled
                    >
                    </input>
                  </div>
                  <div className="col-6 mb-2">
                    <label className="form-label">Pieza:</label>
                    <input
                      defaultValue={props.control.pieza}
                      onChange={(e) => setPieza(e.target.value)}
                      type="number"
                      className="form-control"
                      disabled
                    />
                  </div>
                </div>

                <hr />

                <div className="row">
                  <div className="d-flex col-md-9">
                    <label className="col-form-label me-5 w-25">Doctor:</label>
                    <input
                      value={props.current_user.displayName}
                      type="text"
                      className="form-control m-1 w-100"
                      disabled
                    />
                  </div>
                  <div className="d-flex col-md-9">
                    <label className="col-form-label me-5 w-25">Fecha:</label>
                    <input
                      defaultValue={props.control.fechaControlRealizado}
                      onChange={(e) => setFechaControlRealizado(e.target.value)}
                      type="date"
                      className="form-control m-1 w-100"
                    />
                  </div>
                  <div className="d-flex col-md-9">
                    <label className="col-form-label me-5 w-25">Detalle:</label>
                    <textarea
                      defaultValue={props.control.detalleTratamiento}
                      onChange={(e) => setDetalleTratamiento(e.target.value)}
                      type="text"
                      className="form-control m-1"
                      style={{ height: '150px' }}
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
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default Edit;