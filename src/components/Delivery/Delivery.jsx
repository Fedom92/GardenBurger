

import React, { useState, useEffect, useCallback, useRef } from "react";
import { collection, updateDoc, doc, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import CryptoJS from 'crypto-js';
import { useForm } from "react-hook-form";
import '../../style/Main.css';

/*
EFECTIVO MONTO TOTAL + ENVIO
EN MP NO IMPORTA PORQUE HACEN TRANSFERENCIA

AGREGAR UN MODULO PARA AGREGAR DELIVERYS - TENER LOS DATOS OCULTOS PERO PEDIRLOS DNI, TELEFONO, DIRECCION, MARCA MODELO MOTO, COLOR, PATENTE

NRO TICKET, DIRECCION, HORARIO, TOTAL Y ENVIO (SOLO LA PARTE EN EFECTIVO), PAGA CON, DESPLEGABLE SELECCIONADOR DE DELIVERY

FILTRO POR DELIVERY

COLOR NARANJA CUANDO SALE
COLOR VERDE CUANDO VUELVE

DE CADA DELIVERY CUANTO DINERO DEL TOTAL DE LAS BOLETAS EN EFECTIVO (EL MP NO IMPORTA), DEL TOTAL EN ENVIOS Y LA CANTIDAD DE PEDIDOS
(100% DEL ENVIO LE CORRESPONDE AL DELIVERY)

PROPINAS - VUELTOS
UN CAMPO EN CADA FILA QUE ANOTA EL NUMERO




*/

const Delivery = () => {
    const [isLoading, setIsLoading] = useState(true);

    return (
        <>
            {isLoading ? (
                <div className="w-100">
                    <span className="loader position-absolute start-50 top-50 mt-3"></span>
                </div>
            ) : (
                <div></div>
            )}
        </>
    );
}
export default Delivery;