import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// El build recortado: solo las reglas horarias de los últimos y próximos 5 años
// (44 KB). La entrada por defecto trae todas las zonas del mundo desde 1800 —703 KB,
// el 38 % del bundle— para una app que usa una sola zona fija en -03 desde 2009.
import moment from 'moment-timezone/builds/moment-timezone-with-data-10-year-range';
import 'moment/locale/es';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

moment.locale('es');
// Toda la app trabaja en hora argentina, sin importar la timezone configurada en
// cada PC. Complementa a ahoraServidor(): ese corrige el reloj (minutos de
// desfase), esto corrige la zona (una PC en UTC mandaría el pedido a otra jornada).
moment.tz.setDefault('America/Argentina/Buenos_Aires');

const root = ReactDOM.createRoot(document.getElementById('root'));

// AuthContext ya no envuelve todo: vive dentro de App, solo sobre las rutas de staff.
root.render(
  <App />
);

