import React, { useState } from "react";
import { getDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import { Modal } from "react-bootstrap";
import Swal from "sweetalert2";
import moment from "moment";

const EditPaciente = (props) => {
  const { editarpaciente, ...propsModal } = props;
  const [apellidoConNombre, setApellidoConNombre] = useState(props.paciente.apellidoConNombre || "");
  const [tipoIdc, setTipoIdc] = useState(props.paciente.tipoIdc || "");
  const [idc, setIdc] = useState(props.paciente.idc || "");
  const [edad, setEdad] = useState(props.paciente.edad || "");
  const [mesDiaFechaNacimiento, setMesDiaFechaNacimiento] = useState(props.paciente.mesDiaFechaNacimiento || "");
  const [fechaNacimiento, setFechaNacimiento] = useState(props.paciente.fechaNacimiento || "");
  const [numero, setNumero] = useState(props.paciente.numero || "");
  const [valorBusqueda, setValorBusqueda] = useState("");
  const [selectedCode, setSelectedCode] = useState(props.paciente.selectedCode || "");

  const handleFechaNac = (event) => {
    const { value } = event.target;
    const fecha = moment(value);
    const edad = moment().diff(fecha, "years");
    const mesDiaFechaNacimiento = fecha.format("MM-DD");
    setFechaNacimiento(value);
    setEdad(edad);
    setMesDiaFechaNacimiento(mesDiaFechaNacimiento);
  };

  const update = async (e) => {
    e.preventDefault();

    Swal.fire({
      title: "¿Desea guardar los cambios?",
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: "Guardar",
      confirmButtonColor: "#00C5C1",
      denyButtonText: `No guardar`,
      cancelButtonText: "Cancelar",
    }).then(async (result) => {
      if (result.isConfirmed) {
        const pacienteRef = doc(db, "clients", props.id);
        const pacienteDoc = await getDoc(pacienteRef);
        const pacienteData = pacienteDoc.data();

        const newData = {
          apellidoConNombre: apellidoConNombre || pacienteData.apellidoConNombre,
          tipoIdc: tipoIdc || pacienteData.tipoIdc,
          idc: idc || pacienteData.idc,
          fechaNacimiento: fechaNacimiento || pacienteData.fechaNacimiento,
          edad: edad || pacienteData.edad,
          mesDiaFechaNacimiento: mesDiaFechaNacimiento || pacienteData.mesDiaFechaNacimiento,
          selectedCode: selectedCode || pacienteData.selectedCode,
          numero: numero || pacienteData.numero,
          valorBusqueda: valorBusqueda || pacienteData.valorBusqueda,
        };

        Swal.fire("¡Guardado!", "", "success");

        await updateDoc(pacienteRef, newData);

        props.editarpaciente({ id: props.id, ...newData });

        clearFields();
      } else if (result.isDenied) {
        Swal.fire("Cambios no guardados.", "", "info");
      }
    });
  };

  const clearFields = () => {
    setApellidoConNombre("");
    setTipoIdc("");
    setIdc("");
    setFechaNacimiento("");
    setEdad("");
    setMesDiaFechaNacimiento("");
    setSelectedCode("");
    setNumero("");
    setValorBusqueda("");
    setSelectedCode("");
  };

  return (
    <Modal
      {...propsModal}
      size="md"
      aria-labelledby="contained-modal-title-vcenter"
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title id="contained-modal-title-vcenter">
          <h1>Editar Cliente</h1>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="container">
          <div className="row">
            <div className="col">
              <form onSubmit={update} style={{ transform: "scale(0.98)" }}>
                <div className="mb-2">
                  <label className="form-label">IDC*</label>
                  <div style={{ display: "flex" }}>
                    <select
                      defaultValue={props.paciente.tipoIdc}
                      onChange={(e) => {
                        setTipoIdc(e.target.value);
                        setIdc("");
                      }}
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
                      defaultValue={props.paciente.idc}
                      onChange={(e) => {
                        setIdc(e.target.value);
                        setValorBusqueda(
                          (apellidoConNombre ||
                            props.paciente.apellidoConNombre) +
                          " " +
                          e.target.value
                        );
                      }}
                      type={
                        tipoIdc === "dni" || tipoIdc === "ruc"
                          ? "number"
                          : "text"
                      }
                      minLength={tipoIdc === "dni" ? 8 : undefined}
                      maxLength={
                        tipoIdc === "dni"
                          ? 8
                          : tipoIdc === "ruc"
                            ? 11
                            : tipoIdc === "ce" || tipoIdc === "pas"
                              ? 12
                              : undefined
                      }
                      onKeyDown={(e) => {
                        const maxLength = e.target.maxLength;
                        const currentValue = e.target.value;
                        const isTabKey = e.key === "Tab";
                        const isDeleteKey =
                          e.key === "Delete" ||
                          e.key === "Supr" ||
                          e.key === "Backspace";
                        if (
                          maxLength &&
                          currentValue.length >= maxLength &&
                          !isTabKey &&
                          !isDeleteKey
                        ) {
                          e.preventDefault();
                        }
                      }}
                      className="form-control"
                    />
                  </div>
                </div>
                <div className="mb-2">
                  <label className="form-label">Apellido y Nombres</label>
                  <input
                    defaultValue={props.paciente.apellidoConNombre}
                    onChange={(e) => {
                      setApellidoConNombre(e.target.value);
                      setValorBusqueda(
                        e.target.value + " " + (idc || props.paciente.idc)
                      );
                    }}
                    type="text"
                    className="form-control"
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label">Fecha Nacimiento</label>
                  <input
                    defaultValue={props.paciente.fechaNacimiento}
                    onChange={handleFechaNac}
                    type="date"
                    className="form-control"
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label">Teléfono*</label>
                  <div style={{ display: "flex" }}>
                    <select
                      defaultValue={props.paciente.selectedCode}
                      onChange={(e) => {
                        const codArea = e.target.value;
                        setSelectedCode(codArea);
                        if (codArea !== "+51") {
                          setNumero("");
                        }
                      }}
                      className="form-control-tipoIDC me-1"
                      multiple={false}
                      style={{ width: "fit-content" }}
                    >
                      <option value="">Otro Pais</option>
                      <option value="+51">Perú (+51)</option>
                    </select>
                    {selectedCode !== "+51" && (
                      <input
                        defaultValue={props.paciente.selectedCode}
                        onChange={(e) => {
                          setSelectedCode(e.target.value);
                        }}
                        className="form-control-tipoIDC me-1"
                        type="text"
                        style={{ width: "fit-content" }}
                        placeholder="Cod. area"
                      />
                    )}
                    <input
                      defaultValue={props.paciente.numero}
                      onChange={(e) => setNumero(e.target.value)}
                      type="number"
                      className="form-control"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  onClick={() => {
                    props.onHide();
                  }}
                  className="btn button-main"
                  style={{ marginTop: "8px" }}
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

export default EditPaciente;
