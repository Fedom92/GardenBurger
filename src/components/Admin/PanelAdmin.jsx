import React, { useEffect, useState } from "react";
import { Tabs, Tab } from "react-bootstrap";
import { useSearchParams } from "react-router-dom";
import Personal from "./Personal";
import Sucursales from "./Parametros/Sucursales";
import Envios from "./Parametros/Envios";
import { fetchSucursales } from "../../Utils/sucursales";
import { avisarErrorDeCarga } from "../../Utils/avisos";
import "../../style/Main.css";

const PESTANAS = ["personal", "sucursales", "envios"];

// El Panel Admin, en pestañas: Personal, Sucursales y Envíos. Antes Sucursales y
// Envíos eran modales colgados de la pantalla de empleados.
//
// - `mountOnEnter`: cada pestaña se monta —y lee lo suyo— recién la primera vez
//   que se abre, y después queda montada. Entrar a cerrar la web de una sucursal
//   no paga la lectura de todos los empleados, y volver a Personal no la repite.
// - La pestaña va en la URL (/admin?tab=sucursales): se puede guardar el link y
//   un F5 no la pierde.
// - Las sucursales se leen acá y se comparten: Personal las usa en los selects,
//   y un alta en Sucursales aparece allá sin volver a leer.
const PanelAdmin = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const pestana = PESTANAS.includes(searchParams.get("tab")) ? searchParams.get("tab") : "personal";

  const [sucursales, setSucursales] = useState([]);

  useEffect(() => {
    fetchSucursales().then(setSucursales).catch((error) => {
      console.error(error);
      avisarErrorDeCarga("las sucursales");
    });
  }, []);

  return (
    <div className="w-100">
      <div className="container mw-100 mt-3">
        {/* replace: cambiar de pestaña no apila historial, el "atrás" sale del panel.
            `tabs-admin` (Main.css) marca bien cuál está activa. */}
        <Tabs
          activeKey={pestana}
          onSelect={(tab) => setSearchParams({ tab }, { replace: true })}
          mountOnEnter
          className="tabs-admin"
        >
          <Tab eventKey="personal" title="Gestión Personal">
            <Personal sucursales={sucursales} />
          </Tab>
          <Tab eventKey="sucursales" title="Sucursales">
            <Sucursales sucursales={sucursales} setSucursales={setSucursales} />
          </Tab>
          <Tab eventKey="envios" title="Envíos">
            <Envios />
          </Tab>
        </Tabs>
      </div>
    </div>
  );
};

export default PanelAdmin;
