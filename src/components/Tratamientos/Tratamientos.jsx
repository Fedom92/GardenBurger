import React, { useCallback, useRef } from "react";
import { collection, query, orderBy, deleteDoc, doc, getDoc, updateDoc, getDocs } from "firebase/firestore";
import { useState, useEffect } from "react";
import { db } from "../../firebaseConfig/firebase";
import CreateTratamiento from "./CreateTratamiento";
import EditTratamiento from "./EditTratamiento";
import EstadosTratamientos from "./EstadosTratamientos";
import EstadoPago from "./EstadoPago";
import ListaSeleccionEstadoTratamiento from "./ListaSeleccionEstadoTratamiento";
import moment from "moment";
import Calendar from "react-calendar";
import { Dropdown, Modal, Button } from "react-bootstrap";
import "../../style/Main.css";
import Swal from "sweetalert2";
import CryptoJS from 'crypto-js';

function Tratamientos(props) {
  const [rol, setRol] = useState("");
  const hoy = moment(new Date()).format("YYYY-MM-DD");
  const [tratamientos, setTratamientos] = useState([]);
  const [search, setSearch] = useState("");
  const [modalShowCrearTratamiento, setModalShowCrearTratamiento] = useState(false);
  const [modalShowEditTratamiento, setModalShowEditTratamiento] = useState(false);
  const [modalShowVerNotas, setModalShowVerNotas] = useState(false);
  const [order, setOrder] = useState("ASC");
  const [tratamiento, setTratamiento] = useState([]);
  const [idParam, setIdParam] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [modalShowEstadosTratamientos, setModalShowEstadosTratamientos] = useState(false);
  const [modalShowEditPago, setModalShowEditPago] = useState(false);
  const [estadosTratamientos, setEstadosTratamientos] = useState([]);
  const [estadosPagos, setEstadosPagos] = useState([]);

  const tratamientosCollectiona = collection(db, "tratamientos");
  const tratamientosCollection = useRef(query(tratamientosCollectiona, orderBy("codigo", "desc")));

  const [mostrarTabla, setMostrarTabla] = useState(false);
  const [mostrarVer, setMostrarVer] = useState(true);
  const [mostrarAjustes, setMostrarAjustes] = useState(false);

  const [ocultrarFiltrosGenerales, setOcultrarFiltrosGenerales] = useState(false);
  const [estadoTratamientoFiltro, setEstadoTratamientoFiltro] = useState("");
  const [estadosTratamientosOptions, setEstadosTratamientosOptions] = useState([]);
  const [estadoPagoFiltro, setEstadoPagoFiltro] = useState("");
  const [estadoPagoOptions, setEstadoPagoOptions] = useState([]);
  const [tratamientosFiltro, setTratamientosFiltro] = useState("");
  const [tratamientosOptions, setTratamientosOptions] = useState([]);

  const [modalShowFiltros2, setModalShowFiltros2] = useState(false);
  const [selectedCheckbox2, setSelectedCheckbox2] = useState("");
  const [parametroModal, setParametroModal] = useState("");
  const [tituloParametroModal, setTituloParametroModal] = useState("");
  const [filtroBusqueda, setFiltroBusqueda] = useState("");

  const [modalSeleccionFechaShow, setModalSeleccionFechaShow] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [taparFiltro, setTaparFiltro] = useState(false);

  const [mostrarModalEditarCobro, setMostrarModalEditarCobro] = useState(false);
  const [indexParaEditcobro, setIndexParaEditcobro] = useState("");
  const [fechaEditCobro, setFechaEditCobro] = useState("");
  const [nroComprobanteEditCobro, setNroComprobanteEditCobro] = useState("");
  const [importeEditCobro, setImporteEditCobro] = useState("");
  const [idParaEditcobro, setIdParaEditcobro] = useState("");

  const [codigoCobro, setCodigoCobro] = useState("");
  const [trataCobro, setTrataCobro] = useState("");
  const [pacienteCobro, setPacienteCobro] = useState("");
  const [fechaCobro, setFechaCobro] = useState("");
  const [nroComprobanteCobro, setNroComprobanteCobro] = useState("");
  const [importeCobro, setImporteCobro] = useState("");
  const [idParaCobro, setIdParaCobro] = useState("");
  const [restoCobro, setRestoCobro] = useState("");
  const [mostrarModalAgregarCobro, setMostrarModalAgregarCobro] = useState(false);

  const [valorBusquedaOptions, setValorBusquedaOptions] = useState([]);
  const pacientesCollectiona = collection(db, "clients");
  const pacientesCollection = useRef(query(pacientesCollectiona));

  const estadosTratamientoCollectiona = collection(db, "estadosTratamientos");
  const estadosTratamientoCollection = useRef(query(estadosTratamientoCollectiona));

  const estadosPagoCollectiona = collection(db, "estadoPago");
  const estadosPagoCollection = useRef(query(estadosPagoCollectiona));

  const tarifarioCollectiona = collection(db, "tarifas");
  const tarifarioCollection = useRef(query(tarifarioCollectiona));

  const ocultarTabla = (codigo) => {
    if (mostrarTabla) {
      setMostrarTabla(false);
      setSearch("");
      setMostrarVer(true);
      setOcultrarFiltrosGenerales(false)
      setTaparFiltro(false);
    } else {
      setSearch(codigo);
      setMostrarTabla(true);
      setMostrarVer(false);
      setOcultrarFiltrosGenerales(true)
    }
  };

  useEffect(() => {
    const rolEncriptado = localStorage.getItem("rol");
    let bytesDesencriptado = CryptoJS.AES.decrypt(rolEncriptado, process.env.REACT_APP_cryptoKey);
    let rolDesencriptado = bytesDesencriptado.toString(CryptoJS.enc.Utf8);
    setRol(rolDesencriptado);
  }, []);

  const buscarEstilos = (estadoParam) => {
    const colorEncontrado = estadosTratamientos.find((e) => e.name === estadoParam);
    if (colorEncontrado && colorEncontrado.color !== "") {
      return { backgroundColor: colorEncontrado.color, marginBottom: "0" };
    };
  }

  const buscarEstilosPago = (estadoParam) => {
    const colorEncontrado = estadosPagos.find((e) => e.name === estadoParam);
    if (colorEncontrado && colorEncontrado.color !== "") {
      return { backgroundColor: colorEncontrado.color, marginBottom: "0" };
    };
  }

  const createOptions = (snapshot, keyPrefix, customValueKey) => {
    const uniqueValues = [...new Set(snapshot.docs.map(doc => doc.data()[customValueKey]))];

    const options = uniqueValues.map((value, index) => (
      <option key={`${keyPrefix}-${index}`} value={value}>
        {value}
      </option>
    ));

    return options;
  };

  const fetchDataAndSetOptions = useCallback(async (collection, setOptions, customValueKey, orderParam) => {
    let q;
    try {
      if (orderParam) {
        q = query(collection.current, orderBy(orderParam));
      } else {
        q = query(collection.current);
      }

      const snapshot = await getDocs(q);
      const options = createOptions(snapshot, collection.current.name, customValueKey);
      setOptions(options);
    } catch (error) {
      console.error(`Error fetching data options ${collection.current.name}:`, error);
    }
  }, []);

  const fetchDataGral = useCallback(async (collection, setDataFunction) => {
    try {
      const snapshot = await getDocs(collection.current);
      const dataArray = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
      setDataFunction(dataArray);
    } catch (error) {
      console.error(`Error fetching data ${collection.current.name}:`, error);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const tratamientosSnapshot = await getDocs(tratamientosCollection.current);

        const tratamientosDataArray = tratamientosSnapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));

        setTratamientos(tratamientosDataArray);

        fetchDataAndSetOptions(tarifarioCollection, setTratamientosOptions, 'tratamiento', 'codigo');
        fetchDataAndSetOptions(estadosTratamientoCollection, setEstadosTratamientosOptions, 'name', 'name');
        fetchDataAndSetOptions(estadosPagoCollection, setEstadoPagoOptions, 'name', 'name');

        fetchDataGral(estadosTratamientoCollection, setEstadosTratamientos);
        fetchDataGral(estadosPagoCollection, setEstadosPagos);

        fetchDataAndSetOptions(pacientesCollection, setValorBusquedaOptions, 'valorBusqueda');

        setIsLoading(false);

      } catch (error) {
        console.error('Error fetching data Tratamientos:', error);
      }
    };

    fetchData();

  }, [fetchDataGral, fetchDataAndSetOptions]);

  useEffect(() => {
    const hoy = new Date();
    const actualizarEstadoPago = async (tratamiento) => {
      const fechaVencimientoBase = tratamiento.fechaVencimiento;
      const tratamientoRef = doc(tratamientosCollectiona, tratamiento.id);

      if (tratamiento.restoCobro > 0 && tratamiento.estadoPago !== "Cancelado") {
        if (fechaVencimientoBase) {
          const fechaVencimiento = new Date(fechaVencimientoBase);
          if (fechaVencimiento > hoy && tratamiento.estadoPago !== "Programado") {
            await updateDoc(tratamientoRef, {
              estadoPago: "Programado",
            });
            actualizarTratamientoLocal(tratamiento.id, { estadoPago: "Programado" });

          } else if (fechaVencimiento <= hoy && tratamiento.estadoPago !== "Vencido") {
            await updateDoc(tratamientoRef, {
              estadoPago: "Vencido",
            });
            actualizarTratamientoLocal(tratamiento.id, { estadoPago: "Vencido" });
          }

        } else if (tratamiento.estadoPago !== "Pendiente") {
          await updateDoc(tratamientoRef, {
            estadoPago: "Pendiente",
          });
          actualizarTratamientoLocal(tratamiento.id, { estadoPago: "Pendiente" });
        }
      } 
    };

    tratamientos.forEach((tratamiento) => {
      actualizarEstadoPago(tratamiento);
    });
  }, [tratamientos, tratamientosCollectiona]);


  const deletetratamiento = async (id) => {
    const tratamientoDoc = doc(db, "tratamientos", id);
    await deleteDoc(tratamientoDoc);
    setTratamientos((prevTratamientos) =>
      prevTratamientos.filter((tratamiento) => tratamiento.id !== id)
    );
  };

  const confirmeDelete = (id) => {
    Swal.fire({
      title: '¿Esta seguro?',
      text: "No podra revertir la accion",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#00C5C1',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Si',
      cancelButtonText: 'No'
    }).then((result) => {
      if (result.isConfirmed) {
        deletetratamiento(id)
        Swal.fire({
          title: '¡Borrado!',
          text: 'El tratamiento ha sido borrado.',
          icon: 'success',
          confirmButtonColor: '#00C5C1'
        });
      }
    })
  }

  const searcher = (e) => {
    if (typeof e === "string") {
      setSearch(e);
    } else {
      setSearch(e.target.value);
    }
  };

  const sorting = (col) => {
    if (order === "ASC") {
      const sorted = [...tratamientos].sort((a, b) => {
        const valueA =
          typeof a[col] === "string" ? a[col].toLowerCase() : a[col];
        const valueB =
          typeof b[col] === "string" ? b[col].toLowerCase() : b[col];
        return valueA > valueB ? 1 : -1;
      });
      setTratamientos(sorted);
      setOrder("DSC");
    }
    if (order === "DSC") {
      const sorted = [...tratamientos].sort((a, b) => {
        const valueA =
          typeof a[col] === "string" ? a[col].toLowerCase() : a[col];
        const valueB =
          typeof b[col] === "string" ? b[col].toLowerCase() : b[col];
        return valueA < valueB ? 1 : -1;
      });
      setTratamientos(sorted);
      setOrder("ASC");
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

  var results = tratamientos.filter((dato) => {
    if (estadoTratamientoFiltro && dato.estadosTratamientos !== estadoTratamientoFiltro) {
      return false;
    }

    if (estadoPagoFiltro && dato.estadoPago !== estadoPagoFiltro) {
      return false;
    }

    if (tratamientosFiltro && dato.tarifasTratamientos !== tratamientosFiltro) {
      return false;
    }

    if (!search) {
      return true;
    }

    if (typeof search === "object") {
      const fecha = moment(dato.fecha).format("YYYY-MM-DD");
      return fecha >= search.fechaInicio && fecha <= search.fechaFin;
    }

    if (search.toString().length === 10 && search.charAt(4) === "-" && search.charAt(7) === "-") {
      return dato.fecha === search.toString();
    }

    if (!isNaN(search)) {
      return dato.codigo === Number(search);
    }

    if (filtroBusqueda && dato[filtroBusqueda]?.includes(search)) {
      return dato[filtroBusqueda] !== "" && dato[filtroBusqueda] !== undefined && dato[filtroBusqueda] !== null;
    }

    return quitarAcentos(dato.apellidoConNombre).includes(quitarAcentos(search));
  });

  var paginasTotales = Math.ceil(results.length / filasPorPagina);
  var startIndex = (paginaActual - 1) * filasPorPagina;
  var endIndex = startIndex + filasPorPagina;
  var resultsPaginados = !mostrarTabla ? results.slice(startIndex, endIndex) : results;

  function funcMostrarAjustes() {
    if (mostrarAjustes) {
      setMostrarAjustes(false);
    } else {
      setMostrarAjustes(true);
    }
  }

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

  const clearFieldsEditarCobro = () => {
    setMostrarModalEditarCobro([false, "", "", ""]);
    setIndexParaEditcobro("");
    setIdParaCobro("");
    setFechaEditCobro("");
    setNroComprobanteEditCobro("");
    setImporteEditCobro("");
  };

  const clearFieldsCobro = () => {
    setFechaCobro("");
    setNroComprobanteCobro("");
    setImporteCobro("");
  };

  const guardarCobro = async (e, id) => {
    e.preventDefault();
    try {
      const tratamientoRef = doc(db, "tratamientos", id || idParaEditcobro);
      const tratamientoDoc = await getDoc(tratamientoRef);
      const tratamientoData = tratamientoDoc.data();

      const fechaCobroArray = tratamientoData.cobrosManuales.fechaCobro || [];
      const nroComprobanteCobroArray = tratamientoData.cobrosManuales.nroComprobanteCobro || [];
      const codigoTratamientoArray = tratamientoData.cobrosManuales.codigoTratamiento || [];
      const importeAbonadoArray = tratamientoData.cobrosManuales.importeAbonado || [];
      const tratamientoCobroArray = tratamientoData.cobrosManuales.tratamientoCobro || [];
      const pacienteCobroArray = tratamientoData.cobrosManuales.pacienteCobro || [];
      const timestampArray = tratamientoData.cobrosManuales.timestampCobro || [];

      fechaCobroArray.push(fechaCobro);
      nroComprobanteCobroArray.push(nroComprobanteCobro);
      importeAbonadoArray.push(importeCobro);
      tratamientoCobroArray.push(trataCobro);
      codigoTratamientoArray.push(codigoCobro);
      pacienteCobroArray.push(pacienteCobro);
      timestampArray.push(Date.now());

      if (tratamientoDoc.exists()) {
        const newAgregarCobros = {
          cobrosManuales: {
            fechaCobro: fechaCobroArray,
            nroComprobanteCobro: nroComprobanteCobroArray,
            importeAbonado: importeAbonadoArray,
            tratamientoCobro: tratamientoCobroArray,
            codigoTratamiento: codigoTratamientoArray,
            pacienteCobro: pacienteCobroArray,
            timestampCobro: timestampArray,
          },
        };

        await updateDoc(tratamientoRef, newAgregarCobros);
        actualizarTratamientoLocal(tratamientoRef.id, newAgregarCobros);
      }
      let resto = (restoCobro - importeCobro);
      setRestoCobro(resto);
      actualizarDatosConRestoCobro(tratamientoRef.id, resto)
      setMostrarModalAgregarCobro([false, ""]);
    } catch (e) {
      console.error(e)
      Swal.fire({
        title: '¡Error!',
        text: 'Hubo inconvenientes al tratar de Agregar su cobro. Recargue la página y vuelva a intentar!.',
        icon: 'error',
        confirmButtonColor: '#d33',
      })
    }
  };

  const editarCobro = async (e) => {
    e.preventDefault();
    try {
      const tratamientoRef = doc(db, "tratamientos", idParaEditcobro);
      const tratamientoDoc = await getDoc(tratamientoRef)
      const tratamientoData = tratamientoDoc.data();

      const fechaCobroArray = tratamientoData.cobrosManuales.fechaCobro;
      const nroComprobanteCobroArray = tratamientoData.cobrosManuales.nroComprobanteCobro;
      const importeCobroArray = tratamientoData.cobrosManuales.importeAbonado;
      const tratamientoCobroArray = tratamientoData.cobrosManuales.tratamientoCobro;
      const codigoTratamientoArray = tratamientoData.cobrosManuales.codigoTratamiento;
      const pacienteCobroArray = tratamientoData.cobrosManuales.pacienteCobro;
      const timestampCobroArray = tratamientoData.cobrosManuales.timestampCobro;

      fechaCobroArray[indexParaEditcobro] = fechaEditCobro || fechaCobroArray[indexParaEditcobro];
      nroComprobanteCobroArray[indexParaEditcobro] = nroComprobanteEditCobro || nroComprobanteCobroArray[indexParaEditcobro];
      importeCobroArray[indexParaEditcobro] = importeEditCobro || importeCobroArray[indexParaEditcobro];
      codigoTratamientoArray[indexParaEditcobro] = codigoCobro;
      tratamientoCobroArray[indexParaEditcobro] = trataCobro;
      pacienteCobroArray[indexParaEditcobro] = pacienteCobro;

      if (tratamientoDoc.exists()) {
        const newEditCobros = {
          cobrosManuales: {
            fechaCobro: fechaCobroArray,
            nroComprobanteCobro: nroComprobanteCobroArray,
            importeAbonado: importeCobroArray,
            tratamientoCobro: tratamientoCobroArray,
            codigoTratamiento: codigoTratamientoArray,
            pacienteCobro: pacienteCobroArray,
            timestampCobro: timestampCobroArray,
          },
        };
        await updateDoc(tratamientoRef, newEditCobros);
        actualizarTratamientoLocal(idParaEditcobro, newEditCobros);
      }
      let resto = (tratamientoData.precio - importeCobroArray.reduce((total, importe) => total + Number(importe), 0));
      setRestoCobro(resto);
      if (resto > 0) {
        if (tratamientoData.fechaVencimiento) {
          if (tratamientoData.fechaVencimiento > hoy && tratamientoData.estadoPago !== "Programado") {
            await updateDoc(tratamientoRef, {
              estadoPago: "Programado",
            });
            actualizarTratamientoLocal(idParaEditcobro, { estadoPago: "Programado" });

          } else if (tratamientoData.fechaVencimiento <= hoy && tratamientoData.estadoPago !== "Vencido") {
            await updateDoc(tratamientoRef, {
              estadoPago: "Vencido",
            });
            actualizarTratamientoLocal(idParaEditcobro, { estadoPago: "Vencido" });
          }
        } else if (tratamientoData.estadoPago !== "Pendiente") {
          await updateDoc(tratamientoRef, {
            estadoPago: "Pendiente",
          });
          actualizarTratamientoLocal(idParaEditcobro, { estadoPago: "Pendiente" });
        }
      }
      actualizarDatosConRestoCobro(idParaEditcobro, resto);
      clearFieldsEditarCobro();
    } catch (e) {
      console.error(e)
      Swal.fire({
        title: '¡Error!',
        text: 'Hubo inconvenientes al tratar de Editar su cobro. Recargue la página y vuelva a intentar!.',
        icon: 'error',
        confirmButtonColor: '#d33',
      })
    }
  };

  const eliminarCobro = async (e, id, index) => {
    e.preventDefault();
    try {
      const tratamientoRef = doc(db, "tratamientos", id || idParaEditcobro);
      const tratamientoDoc = await getDoc(tratamientoRef);
      const tratamientoData = tratamientoDoc.data();

      const fechaCobroArray = tratamientoData.cobrosManuales.fechaCobro;
      const nroComprobanteCobroArray = tratamientoData.cobrosManuales.nroComprobanteCobro;
      const codigoTratamientoArray =
        tratamientoData.cobrosManuales.codigoTratamiento;
      const importeAbonadoArray = tratamientoData.cobrosManuales.importeAbonado;
      const tratamientoCobroArray =
        tratamientoData.cobrosManuales.tratamientoCobro;
      const pacienteCobroArray = tratamientoData.cobrosManuales.pacienteCobro;
      const timestampArray = tratamientoData.cobrosManuales.timestampCobro;

      const nuevaFechaCobroArray = eliminarPosicionArray(
        fechaCobroArray,
        index
      );
      const nuevaNroComprobanteCobroArray = eliminarPosicionArray(
        nroComprobanteCobroArray,
        index
      );
      const nuevoImporteAbonadoArray = eliminarPosicionArray(
        importeAbonadoArray,
        index
      );
      const nuevoTratamientoCobroArray = eliminarPosicionArray(
        tratamientoCobroArray,
        index
      );
      const nuevoCodigoTratamientoArray = eliminarPosicionArray(
        codigoTratamientoArray,
        index
      );
      const nuevoPacienteCobroArray = eliminarPosicionArray(
        pacienteCobroArray,
        index
      );
      const nuevoTimestampArray = eliminarPosicionArray(
        timestampArray,
        index
      );

      if (tratamientoDoc.exists()) {
        const deleteCobros = {
          cobrosManuales: {
            fechaCobro: nuevaFechaCobroArray,
            nroComprobanteCobro: nuevaNroComprobanteCobroArray,
            importeAbonado: nuevoImporteAbonadoArray,
            tratamientoCobro: nuevoTratamientoCobroArray,
            codigoTratamiento: nuevoCodigoTratamientoArray,
            pacienteCobro: nuevoPacienteCobroArray,
            timestampCobro: nuevoTimestampArray,
          },
        };
        await updateDoc(tratamientoRef, deleteCobros);
        actualizarTratamientoLocal(tratamientoRef.id, deleteCobros);
      }
      let resto = (tratamientoData.precio - nuevoImporteAbonadoArray.reduce((total, importe) => total + Number(importe), 0))
      setRestoCobro(resto);
      if (resto > 0) {
        if (tratamientoData.fechaVencimiento) {
          if (tratamientoData.fechaVencimiento > hoy && tratamientoData.estadoPago !== "Programado") {
            await updateDoc(tratamientoRef, {
              estadoPago: "Programado",
            });
            actualizarTratamientoLocal(tratamientoRef.id, { estadoPago: "Programado" });

          } else if (tratamientoData.fechaVencimiento <= hoy && tratamientoData.estadoPago !== "Vencido") {
            await updateDoc(tratamientoRef, {
              estadoPago: "Vencido",
            });
            actualizarTratamientoLocal(tratamientoRef.id, { estadoPago: "Vencido" });
          }

        } else if (tratamientoData.estadoPago !== "Pendiente") {
          await updateDoc(tratamientoRef, {
            estadoPago: "Pendiente",
          });
          actualizarTratamientoLocal(tratamientoRef.id, { estadoPago: "Pendiente" });
        }
      }
      actualizarDatosConRestoCobro(tratamientoRef.id, resto)
    } catch (e) {
      console.error(e)
      Swal.fire({
        title: '¡Error!',
        text: 'Hubo inconvenientes al tratar de Eliminar su cobro. Recargue la página y vuelva a intentar!.',
        icon: 'error',
        confirmButtonColor: '#d33',
      })
    }
  };


  const eliminarPosicionArray = (array, index) => {
    if (index < 0 || index >= array.length) {
      return array;
    }
    return array.filter((_, i) => i !== index);
  };


  const actualizarDatosConRestoCobro = async (tratamientoID, resto) => {
    const tratamientoRef = doc(db, "tratamientos", tratamientoID);
    await updateDoc(tratamientoRef, { restoCobro: resto });
    actualizarTratamientoLocal(tratamientoID, { restoCobro: resto });

    if (resto === 0 || resto < 0) {
      await updateDoc(tratamientoRef, {
        estadoPago: "Cancelado",
        fechaVencimiento: "",
      });
      actualizarTratamientoLocal(tratamientoID, {
        estadoPago: "Cancelado",
        fechaVencimiento: "",
      });
    }
  }

  useEffect(() => {
    if (fechaCobro === "") {
      setFechaCobro(hoy);
    }
  }, [fechaCobro, hoy]);

  const agregarTratamiento = (nuevoTratamiento) => {
    const nuevosTratamientos = [...tratamientos, nuevoTratamiento];
    nuevosTratamientos.sort((a, b) => b.codigo - a.codigo);
    setTratamientos(nuevosTratamientos);
  };

  const editarTratamiento = (nuevoTratamientoActualizado) => {
    const tratamientosActualizados = tratamientos.map((item) =>
      item.id === nuevoTratamientoActualizado.id ? { ...item, ...nuevoTratamientoActualizado } : item);
    tratamientosActualizados.sort((a, b) => b.codigo - a.codigo);
    setTratamientos(tratamientosActualizados);
  };

  const editarEstadoTratamiento = async (itemId, nuevosDatos) => {
    const tratamientosActualizados = tratamientos.map((item) =>
      item.id === itemId ? { ...item, ...nuevosDatos } : item);

    tratamientosActualizados.sort((a, b) => b.codigo - a.codigo);

    setTratamientos(tratamientosActualizados);
  };

  const actualizarTratamientoLocal = (itemId, nuevosDatos) => {
    setTratamientos(tratamientos => {
      const tratamientosActualizados = tratamientos.map(item =>
        item.id === itemId ? { ...item, ...nuevosDatos } : item
      );

      return tratamientosActualizados;
    });
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
                className="form-control m-2 w-45"
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
                    className="d-flex justify-content-center align-items-center"
                    style={{ maxHeight: "34px" }}
                  >
                    <h1>Tratamientos</h1>
                    {rol === process.env.REACT_APP_rolAd ? (
                      <button
                        className="btn grey mx-2 btn-sm"
                        onClick={() => {
                          funcMostrarAjustes(true);
                        }}
                      >
                        <i className="fa-solid fa-gear"></i>
                      </button>
                    ) : null}
                    <button
                      variant="primary"
                      className="btn-blue m-2"
                      onClick={() => setModalShowCrearTratamiento(true)}
                    >
                      Agregar Tratamiento
                    </button>
                    {mostrarAjustes && (
                      <div className="d-flex">
                        <button
                          variant="secondary"
                          className="btn-blue m-2"
                          onClick={() =>
                            setModalShowEstadosTratamientos(true)
                          }
                        >
                          Estados Tratamientos
                        </button>
                        <button
                          variant="secondary"
                          className="btn-blue m-2"
                          onClick={() => setModalShowEditPago(true)}
                        >
                          Estado Pago
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {!ocultrarFiltrosGenerales && (<div className="row" style={{ marginTop: "20px" }}>
                  <div className="col d-flex justify-content-start align-items-center">
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

                    <div className="mb-3 m-1">
                      <select
                        value={tratamientosFiltro}
                        onChange={(e) => setTratamientosFiltro(e.target.value)}
                        className="form-control-doctor"
                        multiple={false}
                      >
                        <option value="">Todos los Tratamientos</option>
                        {tratamientosOptions}
                      </select>
                    </div>

                    <div className="mb-3 m-1">
                      <select
                        value={estadoPagoFiltro}
                        onChange={(e) => setEstadoPagoFiltro(e.target.value)}
                        className="form-control-doctor"
                        multiple={false}
                      >
                        <option value="">Todos los Estados Pago</option>
                        {estadoPagoOptions}
                      </select>
                    </div>

                    <div className="mb-3 m-1">
                      <select
                        value={estadoTratamientoFiltro}
                        onChange={(e) => setEstadoTratamientoFiltro(e.target.value)}
                        className="form-control-doctor"
                        multiple={false}
                      >
                        <option value="">Todos los Estados Tratamientos</option>
                        {estadosTratamientosOptions}
                      </select>
                    </div>
                  </div>
                </div>)}

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
                      {tratamientos
                        .map((tratamiento) => tratamiento[parametroModal])
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
                        <th>N°</th>
                        <th>Paciente</th>
                        <th onClick={() => sorting("tarifasTratamientos")}>
                          Tratamiento
                        </th>
                        <th onClick={() => sorting("pieza")}>Pieza</th>
                        <th onClick={() => sorting("precio")}>Precio</th>
                        <th onClick={() => sorting("formaPago")}>Forma Pago</th>
                        <th onClick={() => sorting("fecha")}>Fecha</th>
                        <th>Ultimo Pago</th>
                        <th onClick={() => sorting("fechaVencimiento")}>Fecha Vto</th>
                        <th onClick={() => sorting("estadoPago")}>Estado Pago</th>
                        <th onClick={() => sorting("estadosTratamientos")}>
                          Estado Tratamiento
                        </th>
                        <th id="columnaAccion"></th>
                      </tr>
                    </thead>

                    <tbody>
                      {resultsPaginados.map((tratamiento, index) => (
                        <tr key={tratamiento.id}>
                          <td id="colIzquierda">{resultsPaginados.length - index}</td>
                          <td> {tratamiento.apellidoConNombre} </td>
                          <td> {tratamiento.tarifasTratamientos} </td>
                          <td> {tratamiento.pieza} </td>
                          <td> {tratamiento.precio} </td>
                          <td> {tratamiento.formaPago} </td>
                          <td>{moment(tratamiento.fecha).format("DD/MM/YY")}</td>
                          <td>
                            {tratamiento.cobrosManuales.fechaCobro.length > 0 &&
                              tratamiento.cobrosManuales.fechaCobro[tratamiento.cobrosManuales.fechaCobro.length - 1] !== '' && (
                                moment(tratamiento.cobrosManuales.fechaCobro[tratamiento.cobrosManuales.fechaCobro.length - 1]).format("DD/MM/YY")
                              )}
                          </td>
                          <td>{tratamiento.fechaVencimiento !== '' && (
                            moment(tratamiento.fechaVencimiento).format("DD/MM/YY")
                          )}
                          </td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {tratamiento.estadoPago || ""}
                              {tratamiento.estadoPago && (
                                <p
                                  style={buscarEstilosPago(tratamiento.estadoPago)}
                                  className="color-preview justify-content-center align-items-center"
                                ></p>

                              )}
                            </div>
                          </td>

                          <td>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {tratamiento.estadosTratamientos || ""}
                              {tratamiento.estadosTratamientos && (
                                <p
                                  style={buscarEstilos(tratamiento.estadosTratamientos)}
                                  className="color-preview justify-content-center align-items-center"
                                ></p>

                              )}
                              <ListaSeleccionEstadoTratamiento
                                tratamientoId={tratamiento.id}
                                editarestadotratamiento={editarEstadoTratamiento}
                                estadosTratamientosParam={estadosTratamientos}
                              />
                            </div>
                          </td>

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
                                  {mostrarVer && (
                                    <Dropdown.Item
                                      onClick={() => {
                                        ocultarTabla(tratamiento.codigo);
                                        setIdParaCobro(tratamiento.id);
                                        setCodigoCobro(tratamiento.cta);
                                        setTrataCobro(tratamiento.tarifasTratamientos);
                                        setPacienteCobro(tratamiento.apellidoConNombre);
                                        let resto = (
                                          tratamiento.precio -
                                          tratamiento.cobrosManuales.importeAbonado.reduce(
                                            (total, importe) =>
                                              total + Number(importe),
                                            0
                                          )
                                        );
                                        setRestoCobro(resto);
                                        actualizarDatosConRestoCobro(tratamiento.id, resto)
                                      }}
                                    >
                                      <i className="fa-regular fa-eye"></i> Ver
                                    </Dropdown.Item>
                                  )}
                                  {!mostrarVer && (
                                    <Dropdown.Item
                                      onClick={() => {
                                        ocultarTabla("");
                                        clearFieldsCobro("");
                                      }}
                                    >
                                      <i className="fa-regular fa-eye-slash"></i>{" "}
                                      Ocultar
                                    </Dropdown.Item>
                                  )}
                                  <Dropdown.Item
                                    onClick={() => {
                                      setModalShowEditTratamiento(true);
                                      setTratamiento(tratamiento);
                                      setIdParam(tratamiento.id);
                                    }}
                                  >
                                    <i className="fa-regular fa-pen-to-square"></i>{" "}
                                    Editar
                                  </Dropdown.Item>
                                  <Dropdown.Item
                                    onClick={() => {
                                      setModalShowVerNotas([
                                        true,
                                        tratamiento.notas,
                                      ]);
                                    }}
                                  >
                                    <i className="fa-regular fa-comment"></i> Ver
                                    Notas
                                  </Dropdown.Item>
                                  <Dropdown.Item
                                    onClick={() =>
                                      confirmeDelete(tratamiento.id)
                                    }
                                  >
                                    <i className="fa-solid fa-trash-can"></i>{" "}
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

                {modalShowVerNotas[0] && (
                  <Modal
                    show={modalShowVerNotas[0]}
                    size="lg"
                    aria-labelledby="contained-modal-title-vcenter"
                    centered
                    onHide={() => setModalShowVerNotas([false, ""])}
                  >
                    <Modal.Header
                      closeButton
                      onClick={() => setModalShowVerNotas([false, ""])}
                    >
                      <Modal.Title>Comentarios</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                      <form>
                        <div className="row">
                          <p>{modalShowVerNotas[1]}</p>
                        </div>
                      </form>
                    </Modal.Body>
                  </Modal>
                )}
                <br></br>
                {mostrarTabla && (
                  <div style={{ marginTop: "30px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <h4 style={{ textAlign: "left", marginRight: "10px" }}>
                        Pagos
                      </h4>
                      <h4>Saldo Restante: {restoCobro < 0 ? 0 : restoCobro}</h4>
                    </div>

                    <div className="table__container">
                      <table className="table__body">
                        <thead>
                          <tr>
                            <th>N°</th>
                            <th>Fecha Cobro</th>
                            <th>Nro Comprobante</th>
                            <th>Importe abonado</th>
                            <th>Accion</th>
                            <th>
                              <button
                                className="btn btn-secondary mx-1 btn-md"
                                onClick={() => {
                                  setMostrarModalAgregarCobro([
                                    true,
                                    idParaCobro,
                                  ]);
                                }}
                              >
                                <i className="fa-solid fa-circle-plus"></i>
                              </button>
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {resultsPaginados.map((tratamiento) => (
                            tratamiento.cobrosManuales.fechaCobro.map((_, index) => {
                              const fecha = tratamiento.cobrosManuales.fechaCobro[index] || "";
                              const importe = tratamiento.cobrosManuales.importeAbonado[index] || "";
                              const nroComprobante = tratamiento.cobrosManuales.nroComprobanteCobro[index] || "";

                              return (
                                <tr key={index}>
                                  <td>{index + 1}</td>
                                  <td>{moment(fecha.toString()).format("DD/MM/YY")}</td>
                                  <td>{nroComprobante.toString()}</td>
                                  <td>{importe.toString()}</td>
                                  <td>
                                    {tratamiento.cobrosManuales.fechaCobro[0] !== "" && (
                                      <>
                                        <button
                                          variant="primary"
                                          className="btn btn-secondary sm-1"
                                          onClick={(e) => {
                                            setIndexParaEditcobro(index)
                                            setIdParaEditcobro(idParaCobro)
                                            setMostrarModalEditarCobro([true, fecha, importe, nroComprobante]);
                                          }}
                                          style={{ margin: "1px" }}
                                        >
                                          <i className="fa-regular fa-pen-to-square"></i>
                                        </button>
                                        <button
                                          variant="primary"
                                          className="btn btn-danger sm-1"
                                          onClick={(e) => {
                                            eliminarCobro(e, idParaCobro, index);
                                          }}
                                          style={{ margin: "1px" }}
                                        >
                                          <i className="fa-solid fa-trash-can"></i>
                                        </button>
                                      </>
                                    )}
                                  </td>
                                  <td>
                                    <i className="fa-solid fa-download"></i>
                                  </td>
                                </tr>
                              );
                            })
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <EstadosTratamientos
        show={modalShowEstadosTratamientos}
        estadotratamientoparam={estadosTratamientos}
        onHide={() => setModalShowEstadosTratamientos(false)}
      />
      <CreateTratamiento
        show={modalShowCrearTratamiento}
        valorbusquedaoptions={valorBusquedaOptions}
        estadostratamientosoptions={estadosTratamientosOptions}
        tratamientosoptions={tratamientosOptions}
        agregartratamiento={agregarTratamiento}
        current_user={props.current_user}
        onHide={() => setModalShowCrearTratamiento(false)}
      />
      <EditTratamiento
        id={idParam}
        tratamiento={tratamiento}
        estadostratamientosoptions={estadosTratamientosOptions}
        tratamientosoptions={tratamientosOptions}
        show={modalShowEditTratamiento}
        editartratamiento={editarTratamiento}
        onHide={() => setModalShowEditTratamiento(false)}
      />
      <EstadoPago
        show={modalShowEditPago}
        estadopagoparam={estadosPagos}
        onHide={() => setModalShowEditPago(false)}
      />
      {mostrarModalAgregarCobro[0] && (
        <Modal
          show={mostrarModalAgregarCobro[0]}
          size="lg"
          aria-labelledby="contained-modal-title-vcenter"
          centered
        >
          <Modal.Header
            closeButton
            onClick={() => {
              setMostrarModalAgregarCobro([false, ""]);
              clearFieldsCobro();
            }}
          >
            <Modal.Title>Agregar Cobro</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="container">
              <div className="col">
                <form>
                  <div className="row">
                    <div className="col mb-6">
                      <label className="form-label">Fecha Cobro</label>
                      <input
                        value={fechaCobro}
                        onChange={(e) => setFechaCobro(e.target.value)}
                        type="date"
                        className="form-control"
                        autoComplete="off"
                        max={hoy}
                      />
                    </div>
                  </div>
                  <div className="row">
                    <div className="col mb-6">
                      <label className="form-label">Nro Comprobante</label>
                      <input
                        onChange={(e) => setNroComprobanteCobro(e.target.value)}
                        type="text"
                        className="form-control"
                        autoComplete="off"
                        required
                      />
                    </div>
                  </div>
                  <div className="row">
                    <div className="col mb-6">
                      <label className="form-label">Importe Cobro</label>
                      <input
                        onChange={(e) => setImporteCobro(e.target.value)}
                        type="number"
                        className="form-control"
                        autoComplete="off"
                        required
                      />
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <div style={{ display: "flex" }}>
              <button
                type="submit"
                onClick={(e) => {
                  guardarCobro(e, mostrarModalAgregarCobro[1]);
                }}
                className="btn button-main"
              >
                Guardar Cobro
              </button>
            </div>
          </Modal.Footer>
        </Modal>)
      }

      {
        mostrarModalEditarCobro[0] && (
          <Modal show={mostrarModalEditarCobro[0]} size="lg" aria-labelledby="contained-modal-title-vcenter" centered >
            <Modal.Header closeButton onClick={() => { clearFieldsEditarCobro() }}>
              <Modal.Title>Editar Cobro</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <div className="container">
                <div className="col">
                  <form>
                    <div className="row">
                      <div className="col mb-6">
                        <label className="form-label">Fecha Cobro</label>
                        <input
                          defaultValue={mostrarModalEditarCobro[1]}
                          onChange={(e) => setFechaEditCobro(e.target.value)}
                          type="date"
                          className="form-control"
                          autoComplete="off"
                          required
                        />
                      </div>
                    </div>
                    <div className="row">
                      <div className="col mb-6">
                        <label className="form-label">Nro Comprobante</label>
                        <input
                          defaultValue={mostrarModalEditarCobro[3]}
                          onChange={(e) => setNroComprobanteEditCobro(e.target.value)}
                          type="text"
                          className="form-control"
                          autoComplete="off"
                          required
                        />
                      </div>
                    </div>
                    <div className="row">
                      <div className="col mb-6">
                        <label className="form-label">Importe Cobro</label>
                        <input
                          defaultValue={mostrarModalEditarCobro[2]}
                          onChange={(e) => setImporteEditCobro(e.target.value)}
                          type="number"
                          className="form-control"
                          autoComplete="off"
                          required
                        />
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <div style={{ display: "flex" }}>
                <button
                  type="submit"
                  onClick={(e) => { editarCobro(e) }}
                  className="btn button-main"
                >
                  Editar Cobro
                </button>
              </div>
            </Modal.Footer>
          </Modal>)
      }
    </>
  );
}

export default Tratamientos;


