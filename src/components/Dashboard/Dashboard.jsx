import React, { useState, useEffect, useRef } from 'react'
import "../../style/Main.css";
import { collection, getDocs, getDoc, doc, query, where } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase"
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import PacientesNuevos from './PacientesNuevos';
import Ausencia from './Ausencia';
import PacientesAtendidos from './PacientesAtendidos';
import CasosOrtodoncia from './CasosOrtodoncia';
import Ingresos from './Ingresos';
//import GoogleReviews from './GoogleReviews';
import Resultados from './Resultados';
import Gastos from './Gastos';
import moment from "moment";
import ProductividadDentistas from './ProductividadDentistas';
import Top3Tratamientos from './Top3Tratamientos';
import CitasPorConfirmar from './CitasPorConfirmar';
import Rating from 'react-rating-stars-component';
import InformesGenerales from '../Informes/InformesGenerales';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function Dashboard() {
  const [opcion, setOpcion] = useState("");
  //valores-fechas-Predeterminados
  const fechaInicio = moment().subtract(7, 'days').startOf('day').format("YYYY-MM-DD");
  const fechaFin = moment().endOf('day').format("YYYY-MM-DD");
  const haceNoventaDias = moment().subtract(90, 'days').startOf('day').toDate();
  const [citas, setCitas] = useState([]);
  const [tratamientos, setTratamientos] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [clients, setClients] = useState([]);
  const [controlEvoluciones, setControlEvoluciones] = useState([]);

  const fechaInicioBalance = moment(fechaInicio).subtract(7, 'days').startOf('day').format("YYYY-MM-DD");
  const fechaFinBalance = moment(fechaFin).subtract(7, 'days').endOf('day').format("YYYY-MM-DD");
  const [periodoFechasElegido, setPeriodoFechasElegido] = useState({ fechaInicio, fechaFin, fechaInicioBalance, fechaFinBalance });
  const [tablaDatos, setTablaDatos] = useState([]);

  const citasCollection = collection(db, "citas");
  const citasCollectionFiltrados = useRef(query(citasCollection,
    where('fecha', '>=', haceNoventaDias),
  ));
  const tratamientosCollectiona = collection(db, "tratamientos");
  const tratamientosCollection = useRef(query(tratamientosCollectiona));
  const gastosCollectiona = collection(db, "gastos");
  const gastosCollection = useRef(query(gastosCollectiona));

  const clientsCollection = collection(db, "clients");
  const clientsCollectionFiltrados = useRef(query(clientsCollection,
    where('fechaAlta', '>=', haceNoventaDias),
  ));
  const controlEvolucionesCollection = collection(db, "controlEvoluciones");
  const controlEvolucionesCollectionFiltrados = useRef(query(controlEvolucionesCollection,
    where('fechaControlRealizado', '>=', haceNoventaDias),
  ));
  const [rating, setRating] = useState("");
  const [cantResenas, setCantResenas] = useState("");
  const [dataReady, setDataReady] = useState(false);

  const getDataDeColeccion = async (collectionRef) => {
    const querySnapshot = await getDocs(collectionRef);
    return querySnapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    }));
  };

  useEffect(() => {
    Promise.all([
      getDataDeColeccion(citasCollectionFiltrados.current),
      getDataDeColeccion(tratamientosCollection.current),
      getDataDeColeccion(gastosCollection.current),
      getDataDeColeccion(clientsCollectionFiltrados.current),
      getDataDeColeccion(controlEvolucionesCollectionFiltrados.current),
    ]).then(([citasArray, tratamientosArray, gastosArray, clientsArray, controlEvolucionesArray]) => {
      setCitas(citasArray);
      setTratamientos(tratamientosArray);
      setGastos(gastosArray);
      setClients(clientsArray);
      setControlEvoluciones(controlEvolucionesArray);
    });
  }, []);

  useEffect(() => {
    const getCodigo = async () => {
      const antiguaRef = doc(db, "googleReviews", 'DuE7UxZH3LuwqFOnbYK8');
      const documento = await getDoc(antiguaRef);

      if (documento) {
        setRating(documento.data().rating)
        setCantResenas(documento.data().cantResenas)
        setDataReady(true)
      }
    };
    getCodigo();
  }, []);

  useEffect(() => {
    if (tratamientos.length !== 0) {
      const obtenerDatos = async () => {
        let datos = [];

        tratamientos.forEach((tratamiento) => {
          const cobrosManuales = tratamiento.cobrosManuales;

          if (cobrosManuales && cobrosManuales.fechaCobro) {
            cobrosManuales.fechaCobro.forEach((fechaCobro, index) => {
              const fecha = moment(fechaCobro, 'YYYY-MM-DD');
              const año = fecha.year();
              const mes = fecha.month();
              const importeAbonado = cobrosManuales.importeAbonado[index] || "";
              const importe = Number(importeAbonado) || 0;

              const existeData = datos.findIndex((data) => data.año === año);
              if (existeData === -1) {
                datos.push({ año, [mes]: importe });
              } else {
                datos[existeData][mes] = (datos[existeData][mes] || 0) + importe;
              }
            });
          }
        });
        setTablaDatos(datos);
      };

      obtenerDatos();
    }
  }, [tratamientos]);

  const colores = [
    'rgba(0, 197, 193, 0.5)',
    'rgba(255, 99, 132, 0.5)',
    'rgba(54, 162, 235, 0.5)',
    'rgba(255, 206, 86, 0.5)',
    'rgba(75, 192, 192, 0.5)',
    'rgba(145, 61, 136, 0.5)',
    'rgba(255, 153, 51, 0.5)',
    'rgba(231, 76, 60, 0.5)',
    'rgba(46, 204, 113, 0.5)',
    'rgba(51, 110, 123, 0.5)'
  ];

  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  const añosInvertidos = [...Array.from(new Set(tablaDatos.map((data) => data.año)))].reverse();
  
  const datasets = añosInvertidos.map((año, index) => ({
    label: año.toString(),
    data: meses.map((_, mesIndex) => tablaDatos.find(data => data.año === año)?.[mesIndex] || 0),
    backgroundColor: colores[index % colores.length],
  }));

  const maxValuesPorMes = meses.map((_, mesIndex) => {
    const maxPorMes = Math.max(...tablaDatos.map(data => data[mesIndex] || 0));
    return maxPorMes;
  });

  const stepSize = 1500;

  const data = {
    labels: meses,
    datasets,
  };
  const options = {
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Ingresos por mes',
        padding: {
          top: 10,
          bottom: 30,
        },
        font: {
          weight: 'bold',
          size: 24,
          family: 'Goldplay'
        },
        color: '#FFF',
      }
    },
    animation: {
      duration: 200,
    },
    scales: {
      y: {
        min: 0,
        max: maxValuesPorMes,
        ticks: {
          stepSize: Math.ceil(stepSize),
          color: '#FFF',
        },
        grid: {
          borderDash: [8],
          color: '#2e3e62',
        }
      },
      x: {
        ticks: {
          color: '#FFF',
        },
        grid: {
          color: 'transparent',
        },
      },
    },
  };

  const filtrosFechas = (param) => {
    let fechaInicio, fechaFin, fechaInicioBalance, fechaFinBalance;

    switch (param) {
      case "hoy":
        fechaInicio = moment().startOf('day').format("YYYY-MM-DD");
        fechaFin = moment().endOf('day').format("YYYY-MM-DD");
        fechaInicioBalance = moment(fechaInicio).subtract(1, 'days').startOf('day').format("YYYY-MM-DD");
        fechaFinBalance = moment(fechaFin).subtract(1, 'days').endOf('day').format("YYYY-MM-DD");
        break;
      case "ayer":
        fechaInicio = moment().subtract(1, 'day').startOf('day').format("YYYY-MM-DD");
        fechaFin = moment().subtract(1, 'day').endOf('day').format("YYYY-MM-DD");
        fechaInicioBalance = moment(fechaInicio).subtract(1, 'days').startOf('day').format("YYYY-MM-DD");
        fechaFinBalance = moment(fechaFin).subtract(1, 'days').endOf('day').format("YYYY-MM-DD");
        break;
      case "ultimos7":
        fechaInicio = moment().subtract(7, 'days').startOf('day').format("YYYY-MM-DD");
        fechaFin = moment().endOf('day').format("YYYY-MM-DD");
        fechaInicioBalance = moment(fechaInicio).subtract(7, 'days').startOf('day').format("YYYY-MM-DD");
        fechaFinBalance = moment(fechaFin).subtract(7, 'days').endOf('day').format("YYYY-MM-DD");
        break;
      case "ultimos28":
        fechaInicio = moment().subtract(28, 'days').startOf('day').format("YYYY-MM-DD");
        fechaFin = moment().endOf('day').format("YYYY-MM-DD");
        fechaInicioBalance = moment(fechaInicio).subtract(28, 'days').startOf('day').format("YYYY-MM-DD");
        fechaFinBalance = moment(fechaFin).subtract(28, 'days').endOf('day').format("YYYY-MM-DD");
        break;
      case "ultimos90":
        fechaInicio = moment().subtract(90, 'days').startOf('day').format("YYYY-MM-DD");
        fechaFin = moment().endOf('day').format("YYYY-MM-DD");
        fechaInicioBalance = moment(fechaInicio).subtract(90, 'days').startOf('day').format("YYYY-MM-DD");
        fechaFinBalance = moment(fechaFin).subtract(90, 'days').endOf('day').format("YYYY-MM-DD");
        break;
      default:
        fechaInicio = "";
        fechaFin = "";
        break;
    }

    setPeriodoFechasElegido({ fechaInicio, fechaFin, fechaInicioBalance, fechaFinBalance });
  };

  return (
    <div className="w-100">
      <div className="search-bar d-flex col-5 m-2 ms-3">
        <div>
          <select
            className="form-control-doctor"
            multiple={false}
            onChange={(e) => setOpcion(e.target.value)}
            defaultValue=""
          >
            <option value="">Seleccione una Vista</option>
            <option value="3">Dashboard</option>
            <option value="2">Infomes Generales</option>
          </select>
        </div>
        {opcion !== "2" && opcion !== "" && <div>
          <select
            className="form-control-doctor mx-1"
            multiple={false}
            onChange={(e) => filtrosFechas(e.target.value)}
            defaultValue="ultimos7"
          >
            <option value="hoy">Hoy</option>
            <option value="ayer">Ayer</option>
            <option value="ultimos7">Ultimos 7 días</option>
            <option value="ultimos28">Ultimos 28 días</option>
            <option value="ultimos90">Ultimos 90 días</option>
          </select>
        </div>}
      </div>

      {opcion === "2" &&
        <>
          <InformesGenerales
            gastos={gastos}
            tratamientos={tratamientos}
          />
        </>}

      {opcion === "3" &&
        <div className="container mw-100 ms-4">
          <div className="row flex-nowrap dashboard-sup">
            <div className="col-6 pt-4 me-2 rounded-4 shadow fondo-color-primario">
              <Bar data={data} options={options}></Bar>
            </div>
            <div className="col-3 ms-2 rounded-4 d-flex flex-column align-items-start justify-content-center shadow border-hover fuente-color-primario dashContenedor">
              <div className='d-flex align-items-center'>
                <i className="fa-solid fa-users iconosDash"></i>
                <div>
                  <h2 className="fw-bold fs-6 mt-1 ms-2">Pacientes atendidos</h2>
                  <h3 className="fs-2 ms-4 text-start">
                    <PacientesAtendidos
                      fechaInicio={periodoFechasElegido.fechaInicio} fechaFin={periodoFechasElegido.fechaFin}
                      fechaInicioBalance={periodoFechasElegido.fechaInicioBalance} fechaFinBalance={periodoFechasElegido.fechaFinBalance}
                      citas={citas}
                    />
                  </h3>
                </div>
              </div>


              <div className='d-flex align-items-center'>
                <i className="fa-solid fa-user-plus iconosDash"></i>
                <div>
                  <h2 className="fw-bold fs-6 mt-2 ms-2">Pacientes nuevos</h2>
                  <h3 className="fs-2 ms-4 text-start">
                    <PacientesNuevos fechaInicio={periodoFechasElegido.fechaInicio} fechaFin={periodoFechasElegido.fechaFin}
                      fechaInicioBalance={periodoFechasElegido.fechaInicioBalance} fechaFinBalance={periodoFechasElegido.fechaFinBalance}
                      clients={clients}
                    />
                  </h3>
                </div>
              </div>

              <div className='d-flex align-items-center'>
                <i className="fa-solid fa-hospital-user iconosDash"></i>
                <div>
                  <h2 className="fw-bold fs-6 mt-2 ms-2">Casos Ortodoncia</h2>
                  <h3 className="fs-2 ms-4 text-start">
                    <CasosOrtodoncia fechaInicio={periodoFechasElegido.fechaInicio} fechaFin={periodoFechasElegido.fechaFin}
                      fechaInicioBalance={periodoFechasElegido.fechaInicioBalance} fechaFinBalance={periodoFechasElegido.fechaFinBalance}
                      tratamientos={tratamientos}
                    />
                  </h3>
                </div>
              </div>
            </div>

            <div className="col-3 mx-1 rounded-4 d-flex flex-column shadow border-hover dashContenedor">
              <div className='d-flex align-items-center justify-content-between mt-3'>
                <h2 className="fw-bold fs-6">Ingresos</h2>
                <i className="fa-solid fa-chart-line mx-2 fs-4"></i>
              </div>
              <h3 className="fs-2 text-start  mx-3">
                <Ingresos fechaInicio={periodoFechasElegido.fechaInicio} fechaFin={periodoFechasElegido.fechaFin}
                  tratamientos={tratamientos}
                />
              </h3>

              <div className='d-flex align-items-center justify-content-between mt-4  mx-2'>
                <h2 className="fw-bold fs-6 mt-2">Gastos</h2>
                <i className="fa-solid fa-file-invoice-dollar mx-2 fs-4"></i>
              </div>
              <h3 className="fs-2 text-start  mx-2">
                <Gastos fechaInicio={periodoFechasElegido.fechaInicio} fechaFin={periodoFechasElegido.fechaFin}
                  gastos={gastos}
                />
              </h3>

              <div className='d-flex align-items-center justify-content-between mt-4  mx-2'>
                <h2 className="fw-bold fs-6">Resultados</h2>
                <i className="fa-solid fa-hand-holding-dollar mb-1 mx-2 fs-4"></i>
              </div>
              <h3 className="fs-2 text-start  mx-2">
                <Resultados fechaInicio={periodoFechasElegido.fechaInicio} fechaFin={periodoFechasElegido.fechaFin}
                  tratamientos={tratamientos} gastos={gastos}
                />
              </h3>
            </div>


          </div>
          {/*<div className="row mt-4 flex-nowrap dashboard-inf fuente-color-primario">
          <GoogleReviews>
            {({ cantOpinionesTotal, porcenOpinionesTotal, dataReady }) => (
              <div className="col-3 rounded-4 mx-1 d-flex align-items-center justify-content-center flex-column shadow border-hover dashContenedor">
                <h1 className="fw-bold" style={{ fontSize: "8vh" }}>{porcenOpinionesTotal.toFixed(1)}</h1>
                <div className="d-flex align-items-center justify-content-center">
                  <img
                    className='iconosDashGoogle m-1'
                    src='https://cdn-icons-png.flaticon.com/512/300/300221.png'
                    alt="googleImg">
                  </img>
                  {dataReady ? (
                    <Rating
                      count={5}
                      size={20}
                      value={Math.floor(porcenOpinionesTotal * 2) / 2}
                      edit={false}
                      isHalf={true}
                      emptyIcon={<i className="far fa-star"></i>}
                      halfIcon={<i className="fas fa-star-half-alt"></i>}
                      filledIcon={<i className="fas fa-star"></i>}
                    />
                  ) : null}
                </div>
                <p className="fs-5 fw-bold">{cantOpinionesTotal} reseñas</p>

              </div>
            )}
          </GoogleReviews>*/}
          <div className="row mt-4 flex-nowrap dashboard-inf fuente-color-primario">
            <div className="col-3 rounded-4 mx-1 d-flex align-items-center justify-content-center flex-column shadow border-hover dashContenedor">
              <h1 className="fw-bold" style={{ fontSize: "8vh" }}>{Number(rating).toFixed(1)}</h1>
              <div className="d-flex align-items-center justify-content-center">
                <img
                  className='iconosDashGoogle m-1'
                  src='https://cdn-icons-png.flaticon.com/512/300/300221.png'
                  alt="googleImg">
                </img>
                {dataReady ? (
                  <Rating
                    count={5}
                    size={20}
                    value={Math.floor(Number(cantResenas) * 2) / 2}
                    edit={false}
                    isHalf={true}
                    emptyIcon={<i className="far fa-star"></i>}
                    halfIcon={<i className="fas fa-star-half-alt"></i>}
                    filledIcon={<i className="fas fa-star"></i>}
                  />
                ) : null}

              </div>
              <p className="fs-5 fw-bold">{cantResenas} reseñas</p>
            </div>

            <div className="col-3 mx-1 rounded-4 d-flex flex-column shadow border-hover dashContenedor">
              <div className='d-flex mt-3 align-items-center justify-content-between'>
                <h2 className="fw-bold fs-5">Productividad</h2>
              </div>
              <ProductividadDentistas fechaInicio={periodoFechasElegido.fechaInicio} fechaFin={periodoFechasElegido.fechaFin}
                controlEvoluciones={controlEvoluciones}
              />
            </div>

            <div className="col-3 mx-1 rounded-4 d-flex flex-column shadow border-hover dashContenedor">
              <div className='d-flex mt-3 align-items-center justify-content-between'>
                <h2 className="fw-bold fs-5">Top Tratamientos</h2>
                <i className="fa-solid fa-tooth mx-2 fs-4"></i>
              </div>
              <div className="numbers align-items-center m-3 mt-2" style={{ fontSize: "1.1rem" }}>
                <Top3Tratamientos fechaInicio={periodoFechasElegido.fechaInicio} fechaFin={periodoFechasElegido.fechaFin}
                  tratamientos={tratamientos}
                />
              </div>
            </div>

            <div className="col-3 mx-1 rounded-4 d-flex flex-column shadow border-hover dashContenedor">
              <div className='d-flex align-items-center justify-content-between mt-3'>
                <h2 className="fw-bold fs-6">Citas Por Confirmar</h2>
                <i className="fa-solid fa-calendar-days mx-2 fs-4"></i>
              </div>
              <h3 className="fs-2 text-start">
                <CitasPorConfirmar fechaInicio={periodoFechasElegido.fechaInicio} fechaFin={periodoFechasElegido.fechaFin}
                  citas={citas}
                />
              </h3>

              <div className='d-flex align-items-center justify-content-between mt-4'>
                <h2 className="fw-bold fs-6 mt-2">Cancelación/Ausencias</h2>
                <i className="fa-solid fa-calendar-xmark mx-2 fs-4"></i>
              </div>
              <h3 className="fs-2 text-start">
                <Ausencia fechaInicio={periodoFechasElegido.fechaInicio} fechaFin={periodoFechasElegido.fechaFin}
                  citas={citas}
                />
              </h3>
            </div>
          </div>
        </div>}
    </div>

  );
};

export default Dashboard