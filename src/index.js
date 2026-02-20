import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthContextProvider } from "./context/AuthContext";
import { GoogleMapsProvider } from "./context/GoogleMapsContext";
import moment from 'moment';
import 'moment/locale/es';

moment.locale('es');

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <AuthContextProvider>
    <GoogleMapsProvider>
      <App />
    </GoogleMapsProvider>
  </AuthContextProvider>
);

