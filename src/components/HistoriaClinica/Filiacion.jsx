import React, { useState, useEffect } from "react";
import { collection, doc, query, getDocs, where, getDoc, updateDoc, addDoc, limit } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import moment from "moment";
import Swal from "sweetalert2";
import peruFlag from "../../img/peru.png";
import "../../style/Main.css";

function Filiacion(props) {
  const hoy = moment(new Date()).format("YYYY-MM-DD");
  const [apellidoConNombre, setApellidoConNombre] = useState("");
  const [tipoIdc, setTipoIdc] = useState("dni");
  const [idc, setIdc] = useState("");
  const [selectedCode, setSelectedCode] = useState("+51");
  const [numero, setNumero] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [sexo, setSexo] = useState("");
  const [edad, setEdad] = useState("");
  const [lugarNacimiento, setLugarNacimiento] = useState("");
  const [procedencia, setProcedencia] = useState("");
  const [direccion, setDireccion] = useState("");
  const [ocupacion, setOcupacion] = useState("");
  const [correo, setCorreo] = useState("");
  const [responsable, setResponsable] = useState("");
  const [nombreResponsable, setNombreResponsable] = useState("");
  const [telefonoResponsable, setTelefonoResponsable] = useState("");
  const [, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const clientsCollection = collection(db, "clients");

  const confirm = () => {
    Swal.fire({
      title: "¡Paciente agregado!",
      icon: "success",
      confirmButtonColor: "#00C5C1",
    });
  };
  const confirmActualizado = () => {
    Swal.fire({
      title: "¡Paciente actualizado!",
      icon: "success",
      confirmButtonColor: "#00C5C1",
    });
  };

  const validateFields = async (e) => {
    e.preventDefault();
    if (
      apellidoConNombre.trim() === "" ||
      idc.trim() === "" ||
      fechaNacimiento.trim() === "" ||
      numero.trim() === ""
    ) {
      setError("Todos los campos son obligatorios");
      setTimeout(clearError, 2000);
      return false;
    } else {
      const querySnapshot = await getDocs(
        query(clientsCollection, where("idc", "==", idc), limit(1)));
      if (!querySnapshot.empty) {
        setError("El IDC ya existe en la Base de Datos");
        setTimeout(clearError, 2000);
        return false;
      } else {
        setError("");
        await handleCrearClick();
        confirm();
      }
    }
    return true;
  };

  const clearError = () => {
    setError("");
  };

  const handleActualizarClick = async (e) => {
    e.preventDefault();
    const clientRef = doc(db, "clients", props.id);
    const clientDoc = await getDoc(clientRef);
    const clientData = clientDoc.data();

    const newData = {
      apellidoConNombre: apellidoConNombre || clientData.apellidoConNombre,
      tipoIdc: tipoIdc || clientData.tipoIdc,
      idc: idc || clientData.idc,
      fechaNacimiento: fechaNacimiento || clientData.fechaNacimiento,
      numero: numero || clientData.numero,
      selectedCode: selectedCode || clientData.selectedCode,
      edad: edad || clientData.edad,
      sexo: sexo || clientData.sexo,
      lugarNacimiento: lugarNacimiento || clientData.lugarNacimiento,
      procedencia: procedencia || clientData.procedencia,
      direccion: direccion || clientData.direccion,
      ocupacion: ocupacion || clientData.ocupacion,
      correo: correo || clientData.correo,
      responsable: responsable || clientData.responsable,
      telefonoResponsable: telefonoResponsable || clientData.telefonoResponsable,
      nombreResponsable: nombreResponsable || clientData.nombreResponsable,
    };
    await updateDoc(clientRef, newData);
    confirmActualizado();
  };

  const handleCrearClick = async () => {
    await addDoc(clientsCollection, {
      apellidoConNombre: apellidoConNombre,
      tipoIdc: tipoIdc,
      idc: idc,
      fechaAlta: hoy,
      fechaNacimiento: fechaNacimiento,
      selectedCode: selectedCode,
      numero: numero,
      valorBusqueda: apellidoConNombre + " " + idc,
      edad: edad,
      sexo: sexo,
      lugarNacimiento: lugarNacimiento,
      procedencia: procedencia,
      direccion: direccion,
      ocupacion: ocupacion,
      correo: correo,
      responsable: responsable,
      nombreResponsable: nombreResponsable,
      telefonoResponsable: telefonoResponsable,
      pregunta1: ["", false],
      pregunta2: ["", false],
      pregunta3: ["", false],
      pregunta4: ["", false],
      pregunta5: ["", false],
      pregunta6: ["", false],
      pregunta7: ["", false],
      pregunta8: ["", false],
      pregunta9: ["", false],
      pregunta10: ["", false],
      pregunta11: ["", false],
      pregunta12: ["", false],
      pregunta13: ["", false],
      pregunta14: ["", false],
      pregunta15: ["", false],
      pregunta16: ["", false],
      pregunta17: ["", false],
      pregunta18: ["", false],
    });
  };

  const getClientById = async (id) => {
    if (id) {
      const clientF = await getDoc(doc(db, "clients", id));
      if (clientF.exists()) {
        setApellidoConNombre(clientF.data().apellidoConNombre);
        setTipoIdc(clientF.data().tipoIdc);
        setIdc(clientF.data().idc);
        setSelectedCode(clientF.data().selectedCode);
        setNumero(clientF.data().numero);
        setFechaNacimiento(clientF.data().fechaNacimiento);
        setSexo(clientF.data().sexo);
        setEdad(clientF.data().edad);
        setLugarNacimiento(clientF.data().lugarNacimiento);
        setProcedencia(clientF.data().procedencia);
        setDireccion(clientF.data().direccion);
        setOcupacion(clientF.data().ocupacion);
        setCorreo(clientF.data().correo);
        setResponsable(clientF.data().responsable);
        setNombreResponsable(clientF.data().nombreResponsable);
        setTelefonoResponsable(clientF.data().telefonoResponsable);
        setIsLoading(false);
      }
    } else {
      setApellidoConNombre("");
      setTipoIdc("dni");
      setIdc("");
      setSelectedCode("");
      setNumero("");
      setFechaNacimiento("");
      setSexo("");
      setEdad("");
      setLugarNacimiento("");
      setProcedencia("");
      setDireccion("");
      setOcupacion("");
      setCorreo("");
      setResponsable("");
      setNombreResponsable("");
      setTelefonoResponsable("");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getClientById(props.id);
  }, [props.id]);

  const handleFechaNac = (event) => {
    const { value } = event.target;
    const edad = moment().diff(moment(value), "years");
    setFechaNacimiento(value);
    setEdad(edad);
  };

  return (
    <>
      <div className="mainpage">
        {isLoading ? (
          <span className="loader position-absolute start-50 top-50 mt-3"></span>
        ) : (
          <div className="w-100">
            <div className="container mw-100 mt-2" id="contenedorFiliacion">
              <div className="col">

                <div className="row">
                  <div className="col-4 mb-2">
                    <label className="form-label">Apellido y Nombres:</label>
                    <input
                      value={apellidoConNombre || ""}
                      onChange={(e) => {
                        setApellidoConNombre(e.target.value);
                      }}
                      type="text"
                      className="form-control m-1"
                      required
                    />
                  </div>

                  <div className="col-4 mb-2">
                    <label className="form-label">IDC:</label>
                    <div style={{ display: "flex" }}>
                      <select
                        value={tipoIdc}
                        onChange={(e) => {
                          setTipoIdc(e.target.value);
                          setIdc("");
                        }}
                        className="form-control-tipoIDC m-1"
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
                        onChange={(e) => {
                          setIdc(e.target.value);
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
                        className="form-control m-1"
                        required
                      />
                    </div>
                  </div>

                  <div className="col-2 mb-2">
                    <label className="form-label">Edad*</label>
                    <input
                      value={edad || ""}
                      type="number"
                      className="form-control m-1"
                      readOnly
                    />
                  </div>

                  <div className="col-2 mb-2">
                    <label className="form-label">Sexo:</label>
                    <select
                      value={sexo}
                      onChange={(e) => setSexo(e.target.value)}
                      multiple={false}
                      className="form-control m-1"
                      required
                    >
                      <option value="" disabled>
                        Selecciona genero:
                      </option>
                      <option value="M">Masculino</option>
                      <option value="F">Femenino</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-4 mb-2">
                  <label className="form-label">Fecha de Nacimiento:</label>
                  <input
                    value={fechaNacimiento || ""}
                    onChange={handleFechaNac}
                    type="date"
                    className="form-control m-1"
                    required
                  />
                </div>

                <div className="col-4 mb-2">
                  <label className="form-label">Lugar Nacimiento:</label>
                  <input
                    value={lugarNacimiento || ""}
                    onChange={(e) => setLugarNacimiento(e.target.value)}
                    type="text"
                    className="form-control m-1"
                    required
                  />
                </div>

                <div className="col-4 mb-2">
                  <label className="form-label">Correo:</label>
                  <input
                    value={correo || ""}
                    onChange={(e) => setCorreo(e.target.value)}
                    type="email"
                    className="form-control m-1"
                    required
                  />
                </div>
              </div>

              <div className="row">
                <div className="col-4 mb-2">
                  <label className="form-label">Direccion:</label>
                  <input
                    value={direccion || ""}
                    onChange={(e) => setDireccion(e.target.value)}
                    type="text"
                    className="form-control m-1"
                    required
                  />
                </div>

                <div className="col-4 mb-2">
                  <label className="form-label">Ocupacion:</label>
                  <input
                    value={ocupacion || ""}
                    onChange={(e) => setOcupacion(e.target.value)}
                    type="text"
                    className="form-control m-1"
                  />
                </div>

                <div className="col-4 mb-2">
                  <label className="form-label">Teléfono*</label>
                  <div style={{ display: "flex" }}>
                    {selectedCode === "+51" && (
                      <img
                        src={peruFlag}
                        alt="Bandera de Perú"
                        style={{ width: "45px", marginRight: "4px" }}
                      />
                    )}
                    <input
                      value={selectedCode || ""}
                      onChange={(e) => {
                        setSelectedCode(e.target.value);
                      }}
                      className="form-control-tipoIDC me-1 w-40"
                      type="text"
                      style={{ width: "40%" }}
                      placeholder="Cod. Area"
                      required
                    />
                    <>
                      <input
                        value={numero || ""}
                        onChange={(e) => setNumero(e.target.value)}
                        type="number"
                        className="form-control"
                        required
                      />
                    </>
                  </div>
                </div>

              </div>
              <div className="row">
              </div>
              <br></br>
              <hr />
              <br></br>

              <h4 style={{ textAlign: "left" }}> En caso de emergencia comunicarse con:</h4>

              <div className="row">
                <div className="col-4 mb-2 mt-2">
                  <label className="form-label">Parentesco:</label>
                  <input
                    value={responsable || ""}
                    onChange={(e) => setResponsable(e.target.value)}
                    type="text"
                    className="form-control m-1"
                  />
                </div>

                <div className="col-4 mb-2">
                  <label className="form-label">Nombre:</label>
                  <input
                    value={nombreResponsable || ""}
                    onChange={(e) => setNombreResponsable(e.target.value)}
                    type="text"
                    className="form-control m-1"
                  />
                </div>

                <div className="col-4 mb-2">
                  <label className="form-label">Telefono:</label>
                  <input
                    value={telefonoResponsable || ""}
                    onChange={(e) => setTelefonoResponsable(e.target.value)}
                    type="number"
                    className="form-control m-1"
                  />
                </div>
              </div>
              {props.rol !== process.env.REACT_APP_rolDoctor ? (
                <div>
                  {!props.id ? (
                    <div id="botones">
                      <button
                        type="submit"
                        className="btn"
                        id="boton-main"
                        style={{ margin: "3px" }}
                        onClick={validateFields}
                      >
                        Crear
                      </button>
                    </div>
                  ) : (
                    <div id="botones">
                      <button
                        type="submit"
                        className="btn"
                        id="boton-main"
                        style={{ margin: "3px" }}
                        onClick={handleActualizarClick}
                      >
                        Actualizar
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
export default Filiacion;
