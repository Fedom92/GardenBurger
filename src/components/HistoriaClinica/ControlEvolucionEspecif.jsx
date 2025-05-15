import React, { useState, useEffect, useRef, useCallback } from "react";
import { collection, deleteDoc, doc, getDocs, query, orderBy, } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import EditControlEvolucion from "../ControlEvolucion/EditControlEvolucion";
import moment from "moment";
import CrearControlEvolucion from "../ControlEvolucion/CrearControlEvolucion";
import "../../style/Main.css";
import Swal from "sweetalert2";

function ControlEvolucionEspecif(props) {
  const { opcionesdepacientes, ...propsModal } = props;
  const [controles, setControles] = useState("");
  const [apellidoPaciente, setApellidoPaciente] = useState("");
  const [idcPaciente, setIdcPaciente] = useState("");
  const [tratamientoPaciente, setTratamientoPaciente] = useState("");
  const [piezaPaciente, setPiezaPaciente] = useState("");
  const [modalShowEditar, setModalShowEditar] = useState(false);
  const [control, setControl] = useState([]);
  const [idParam, setIdParam] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [modalShowCrearControl, setModalShowCrearControl] = useState(false);
  const [noHayControles, setnoHayControles] = useState(false);
  const [mostrarBuscadores, setMostrarBuscadores] = useState(true);
  const [optionsTarifasTratamientos, setOptionsTarifasTratamientos] = useState([]);
  const [optionsPiezasTratamientos, setOptionsPiezasTratamientos] = useState([]);


  const controlesCollectiona = collection(db, "controlEvoluciones");
  const controlesCollection = useRef(query(controlesCollectiona, orderBy("fechaControlRealizado", "desc")));
  const tratamientosCollectiona = collection(db, "tratamientos");
  const tratamientosCollection = useRef(tratamientosCollectiona);

  const getControles = useCallback((snapshot) => {
    const controlesArray = snapshot.docs.filter((doc) => {
      if (props.tratamiento) {
        setMostrarBuscadores(false);
        return doc.data().tratamientoId === props.tratamiento.id;
      } else {
        return doc.data().idPaciente === props.id;
      }
    })
      .map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
    if (controlesArray.length === 0) {
      setnoHayControles(true);
    }
    else {
      setControles(controlesArray);
      setApellidoPaciente(controlesArray[0].apellidoConNombre);
      setIdcPaciente(controlesArray[0].idc)
      setnoHayControles(false);
    }
    setIsLoading(false);
  }, [props]);

  const updateOptionsTarifasTratamientos = useCallback((snapshot) => {
    const filteredDocs = snapshot.docs.filter((doc) => doc.data().idPaciente === props.id);
    const uniqueTarifasTratamientos = [...new Set(filteredDocs.map(doc => doc.data().tarifasTratamientos))];
    const options2 = uniqueTarifasTratamientos.map(tarifa => (
      <option key={`tarifasTratamientos-${tarifa}`} value={tarifa}>{tarifa}</option>
    ));
    const uniquePiezas = [...new Set(filteredDocs.filter(doc => doc.data().pieza !== "").map(doc => doc.data().pieza))];
    const options3 = uniquePiezas.map(pieza => (
      <option key={`pieza-${pieza}`} value={pieza}>
        {pieza}
      </option>
    ));
    options2.sort((a, b) => {
      const trataA = a.props.value;
      const trataB = b.props.value;
      return trataB - trataA;
    });
    options3.sort((a, b) => {
      const piezaA = a.props.value;
      const piezaB = b.props.value;
      return piezaB - piezaA;
    });
    setOptionsTarifasTratamientos(options2);
    setOptionsPiezasTratamientos(options3);

  }, [props.id]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const controlesSnapshot = await getDocs(controlesCollection.current);
        await getControles(controlesSnapshot);

        const tratamientosSnapshot = await getDocs(tratamientosCollection.current);
        await updateOptionsTarifasTratamientos(tratamientosSnapshot);

      } catch (error) {
        console.error('Error fetching data ControlEvolucion Especif:', error);
      }
    };

    fetchData();

  }, [getControles, updateOptionsTarifasTratamientos]);

  const deleteControl = async (id) => {
    const clientDoc = doc(db, "controlEvoluciones", id);
    await deleteDoc(clientDoc);
    setControles((prevControl) =>
      prevControl.filter((control) => control.id !== id)
    );
  };

  const confirmeDelete = (id) => {
    Swal.fire({
      title: '¿Esta seguro?',
      text: "No podra revertir la accion",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Si',
      cancelButtonText: 'No'
    }).then((result) => {
      if (result.isConfirmed) {
        deleteControl(id)
        Swal.fire({
          title: '¡Borrado!',
          text: 'Control y evolucion borrada.',
          icon: 'success',
          confirmButtonColor: '#00C5C1'
        });
      }
    })
  }

  var results = controles;
  if (mostrarBuscadores) {

    if ((tratamientoPaciente === "") || (tratamientoPaciente !== "" && piezaPaciente === "")) {
      results = [];
    } else if (tratamientoPaciente !== "" && (piezaPaciente !== "Exento" && piezaPaciente !== "")) {
      results = controles.filter((doc) => doc.pieza === piezaPaciente && doc.tratamientoControl === tratamientoPaciente);
    } else if (tratamientoPaciente !== "" && piezaPaciente === "Exento") {
      results = controles.filter((doc) => doc.pieza === "" && doc.tratamientoControl === tratamientoPaciente);
    }
  }

  const editarControl = (nuevaControlActualizado) => {
    const controlActualizados = controles.map((control) =>
      control.id === nuevaControlActualizado.id ? { ...control, ...nuevaControlActualizado } : control
    );

    controlActualizados.sort((a, b) => b.fechaControlRealizado.localeCompare(a.fechaControlRealizado));

    setControles(controlActualizados);
  };

  const agregarControl = (nuevoControl) => {
    const nuevosControles = [...controles, nuevoControl];

    nuevosControles.sort((a, b) => b.fechaControlRealizado.localeCompare(a.fechaControlRealizado));

    setControles(nuevosControles);
  };

  return (
    <>
      <div className="mainpage">
        {isLoading ? (
          <span className="loader position-absolute start-50 top-50 mt-3"></span>
        ) : (
          <>
            {noHayControles ? (
              !propsModal.id ? (
                <div className="container mt-2 mw-100" >
                  <div className="row">
                    <h1>No se ha seleccionado un Paciente.</h1>
                  </div>
                </div>
              ) : (
                <div className="container mt-2 mw-100" >
                  <div className="row">
                    <h1>A este paciente no se le han registrado Controles y Evoluciones aún.</h1>
                  </div>
                </div>
              )
            ) : (
              <div className="w-100">
                <div className="container mw-100">
                  <div className="row">
                    <div className="col">
                      <br></br>
                      <div className="d-flex justify-content-between">
                        <h3>Datos del Paciente</h3>

                      </div>

                      <div className="form-control_history">
                        <div className="row mb-3">
                          <div className="col-2 sm-2">
                            <label id="textoIntroHistory">IDC:</label>
                          </div>
                          <div className="col-2 sm-2">
                            {idcPaciente}
                          </div>
                        </div>
                        <div className="row mb-3">
                          <div className="col-2 sm-2">
                            <label id="textoIntroHistory">Nombre:</label>
                          </div>
                          <div className="col-2 sm-4">
                            {apellidoPaciente}
                          </div>
                        </div>
                        {mostrarBuscadores && (<div className="row mb-3">
                          <div className="col-2 sm-2">
                            <label id="textoIntroHistory">Tratamientos:</label>
                          </div>
                          <div className="col-2 sm-4">
                            <select value={tratamientoPaciente}
                              multiple={false}
                              onChange={(e) => {
                                setTratamientoPaciente(e.target.value)
                              }}
                              required
                              style={{ textAlign: "center" }}
                            >
                              <option value="">...</option>
                              {optionsTarifasTratamientos}
                            </select>
                          </div>
                        </div>)}
                        {
                          (tratamientoPaciente !== "" && mostrarBuscadores) && (
                            <div className="row mb-3">
                              <div className="col-2 sm-2">
                                <label id="textoIntroHistory">Pieza:</label>
                              </div>
                              <div className="col-2 sm-4">
                                <select value={piezaPaciente}
                                  onChange={(e) => {
                                    setPiezaPaciente(e.target.value)
                                  }}
                                  multiple={false} required
                                  style={{ width: "130px", textAlign: "center" }}>
                                  <option value="">...</option>
                                  <option value="Exento">Exento</option>
                                  {optionsPiezasTratamientos}
                                </select>
                              </div>
                            </div>
                          )}

                        {!mostrarBuscadores && (
                          <div>
                            <div className="row mb-3">
                              <div className="col-2 sm-2">
                                <label id="textoIntroHistory">Tratamientos:</label>
                              </div>
                              <div className="col-2 sm-4">
                                <input value={results[0].tratamientoControl} disabled
                                  style={{ border: "none", background: "none" }}></input>
                              </div>
                            </div>
                            <div className="row mb-3">
                              <div className="col-2 sm-2">
                                <label id="textoIntroHistory">Pieza:</label>
                              </div>
                              <div className="col-2 sm-4">
                                <input value={results[0].pieza} disabled
                                  style={{ border: "none", background: "none" }}></input>
                              </div>
                            </div>

                            <div className="col d-flex align-items-center justify-content-start">
                              <br></br>
                              <h4 style={{ marginBottom: '0' }}>Control y Evolucion</h4>
                              <div>
                                <button
                                  variant="primary"
                                  className="btn-blue m-2"
                                  onClick={() => setModalShowCrearControl(true)}
                                >
                                  Nuevo
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <hr></hr>

                      <div className="form-control_history align-content-center">
                        <div className="container">
                          {results.map((control,) => (
                            <div className="row w-75 border mt-2 rounded justify-content-center" key={control.id}>
                              <div className="col-3 col-sm-3 border-end p-3 bg-body-secondary">
                                <input
                                  type="text"
                                  value={moment(control.fechaControlRealizado).format("DD/MM/YY")}
                                  style={{ border: "0", fontWeight: "bold" }}
                                  className="bg-body-secondary"
                                  disabled
                                />
                                <input type="text" value={control.doctor}
                                  disabled
                                  className="bg-body-secondary"
                                  style={{ border: "0", fontWeight: "bold" }} />
                                <div className="d-flex justify-content-start mt-2">
                                  <span
                                    style={{
                                      textDecoration: "none",
                                      color: "blue",
                                      cursor: "pointer",
                                      marginRight: "4px",
                                    }}
                                    onClick={() => {
                                      setModalShowEditar(true);
                                      setControl(control);
                                      setIdParam(control.id);
                                    }}
                                  >
                                    Editar
                                  </span>
                                  <span
                                    style={{
                                      textDecoration: "none",
                                      color: "red",
                                      cursor: "pointer",
                                      marginLeft: "4px",
                                    }}
                                    onClick={() => {
                                      confirmeDelete(control.id);
                                    }}
                                  >
                                    Eliminar
                                  </span>
                                </div>
                              </div>


                              <div className="col-9 p-3 bg-body-tertiary">

                                {mostrarBuscadores ? (<div>
                                  <input
                                    type="text"
                                    value={control.tratamientoControl}
                                    disabled
                                    className="bg-body-tertiary p-0"
                                    style={{ border: "0", fontWeight: "bold", width: `calc(${control.tratamientoControl.length || 0}ch - 1%)` }}
                                  />
                                  <span className="mx-2">|</span>
                                  <input
                                    type="text"
                                    value={control.pieza}
                                    disabled
                                    className="bg-body-tertiary"
                                    style={{ backgroundColor: "white", border: "0", fontWeight: "bold", width: "5%" }} />
                                </div>
                                ) : (
                                  <br></br>
                                )}
                                <textarea
                                  value={control.detalleTratamiento}
                                  disabled
                                  className="mt-1 bg-body-tertiary textarea-no-resize p-0"
                                  style={{ height: '5em', overflowY: control.detalleTratamiento && control.detalleTratamiento.split('\n').length > 4 ? 'scroll' : 'auto'}}
                                />
                              </div>

                              <br></br>
                              <br></br>

                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )
        }
      </div >
      <CrearControlEvolucion
        id={props.id}
        tratamiento={props.tratamiento}
        agregarcontrol={agregarControl}
        opcionesdepacientes={opcionesdepacientes}
        optionstarifastratamientos={optionsTarifasTratamientos}
        show={modalShowCrearControl}
        current_user={props.current_user}
        onHide={() => setModalShowCrearControl(false)} />
      <EditControlEvolucion
        id={idParam}
        control={control}
        editarcontrol={editarControl}
        show={modalShowEditar}
        current_user={props.current_user}
        onHide={() => setModalShowEditar(false)}
      />
    </>
  );
};

export default ControlEvolucionEspecif;