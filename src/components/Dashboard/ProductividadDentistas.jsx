import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import profile from "../../img/profile.png";

const ProductividadDentistas = (props) => {
  const [datos, setDatos] = useState([]);

  useEffect(() => {
    const fetchControlEvoluciones = async () => {
      if (!Array.isArray(props.controlEvoluciones) || props.controlEvoluciones.length === 0) {
        setDatos([]);
        return;
      }
  
      const controlesFiltrados = props.controlEvoluciones.filter((item) => {
        return item.fechaControlRealizado >= props.fechaInicio && item.fechaControlRealizado <= props.fechaFin;
      });
      const doctores = {};

  
      controlesFiltrados.forEach((doc) => {
        const doctor = doc.doctor;
        doctores[doctor] = (doctores[doctor] || 0) + 1;
      });
  
      const datosDoctores = await Promise.all(
        Object.entries(doctores).map(async ([doctor, pacientes]) => {
          const busqueda = query(collection(db, "user"), where("nombreCompleto", "==", doctor), limit(1));
          const querySnapshot = await getDocs(busqueda);
          let foto = profile;
  
          if (!querySnapshot.empty) {
            const doctorSnapshot = querySnapshot.docs[0];
            foto = doctorSnapshot.data()?.foto || profile;
          }
  
          return { doctor, pacientes, foto };
        })
      );
  
      setDatos(datosDoctores);
    };
  
    fetchControlEvoluciones();
  }, [props.controlEvoluciones, props.fechaInicio, props.fechaFin]);
  

  return (
    <table className="table__body-dash">
      <thead>
        <tr></tr>
      </thead>
      <tbody>
        {datos.map((dato, index) => (
          <tr key={index}>
            <td className="fila-dash text-start">
              <img
                className="iconosDash rounded-circle"
                src={dato.foto}
                alt="fotoDoctor"
                loading="lazy"
              />
            </td>
            <td className="fila-dash text-start">{dato.doctor}</td>
            <td className="fila-dash text-end">{dato.pacientes}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default ProductividadDentistas;