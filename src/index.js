import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthContextProvider } from "./context/AuthContext";
import moment from 'moment-timezone';
import 'moment/locale/es';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

moment.locale('es');
// Toda la app trabaja en hora argentina, sin importar la timezone configurada en cada PC
moment.tz.setDefault('America/Argentina/Buenos_Aires');

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <AuthContextProvider>
      <App />
  </AuthContextProvider>
);

