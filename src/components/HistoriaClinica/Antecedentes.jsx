import React, { useState, useEffect } from "react";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig/firebase";
import Swal from "sweetalert2";
import "../../style/Main.css";

function Antecedentes(props) {
    const [isLoading, setIsLoading] = useState(true);

    const [pregunta1, setPregunta1] = useState(["", false]);
    const [pregunta2, setPregunta2] = useState(["", false]);
    const [pregunta3, setPregunta3] = useState(["", false]);
    const [pregunta4, setPregunta4] = useState(["", false]);
    const [pregunta5, setPregunta5] = useState(["", false]);
    const [pregunta6, setPregunta6] = useState(["", false]);
    const [pregunta7, setPregunta7] = useState(["", false]);
    const [pregunta8, setPregunta8] = useState(["", false]);
    const [pregunta9, setPregunta9] = useState(["", false]);
    const [pregunta10, setPregunta10] = useState(["", false]);
    const [pregunta11, setPregunta11] = useState(["", false]);
    const [pregunta12, setPregunta12] = useState(["", false]);
    const [pregunta13, setPregunta13] = useState(["", false]);
    const [pregunta14, setPregunta14] = useState(["", false]);
    const [pregunta15, setPregunta15] = useState(["", false]);
    const [pregunta16, setPregunta16] = useState(["", false]);
    const [pregunta17, setPregunta17] = useState(["", false]);
    const [pregunta18, setPregunta18] = useState(["", false]);

    const confirm = () => {
        Swal.fire({
            title: 'Registro actualizado!',
            icon: 'success',
            confirmButtonColor: '#00C5C1'
        })
    }

    const handleActualizarClick = async (e) => {
        e.preventDefault();
        const clientRef = doc(db, "clients", props.id);
        const clientDoc = await getDoc(clientRef);
        const clientData = clientDoc.data();

        const newData = {
            pregunta1: pregunta1 || clientData.pregunta1,
            pregunta2: pregunta2 || clientData.pregunta2,
            pregunta3: pregunta3 || clientData.pregunta3,
            pregunta4: pregunta4 || clientData.pregunta4,
            pregunta5: pregunta5 || clientData.pregunta5,
            pregunta6: pregunta6 || clientData.pregunta6,
            pregunta7: pregunta7 || clientData.pregunta7,
            pregunta8: pregunta8 || clientData.pregunta8,
            pregunta9: pregunta9 || clientData.pregunta9,
            pregunta10: pregunta10 || clientData.pregunta10,
            pregunta11: pregunta11 || clientData.pregunta11,
            pregunta12: pregunta12 || clientData.pregunta12,
            pregunta13: pregunta13 || clientData.pregunta13,
            pregunta14: pregunta14 || clientData.pregunta14,
            pregunta15: pregunta15 || clientData.pregunta15,
            pregunta16: pregunta16 || clientData.pregunta16,
            pregunta17: pregunta17 || clientData.pregunta17,
            pregunta18: pregunta18 || clientData.pregunta18,

        };
        await updateDoc(clientRef, newData);
        confirm();
    };

    const getClientById = async (id) => {
        if (id) {
            const clientF = await getDoc(doc(db, "clients", id));
            if (clientF.exists()) {
                setPregunta1(clientF.data().pregunta1 || ["", false]);
                setPregunta2(clientF.data().pregunta2 || ["", false]);
                setPregunta3(clientF.data().pregunta3 || ["", false]);
                setPregunta4(clientF.data().pregunta4 || ["", false]);
                setPregunta5(clientF.data().pregunta5 || ["", false]);
                setPregunta6(clientF.data().pregunta6 || ["", false]);
                setPregunta7(clientF.data().pregunta7 || ["", false]);
                setPregunta8(clientF.data().pregunta8 || ["", false]);
                setPregunta9(clientF.data().pregunta9 || ["", false]);
                setPregunta10(clientF.data().pregunta10 || ["", false]);
                setPregunta11(clientF.data().pregunta11 || ["", false]);
                setPregunta12(clientF.data().pregunta12 || ["", false]);
                setPregunta13(clientF.data().pregunta13 || ["", false]);
                setPregunta14(clientF.data().pregunta14 || ["", false]);
                setPregunta15(clientF.data().pregunta15 || ["", false]);
                setPregunta16(clientF.data().pregunta16 || ["", false]);
                setPregunta17(clientF.data().pregunta17 || ["", false]);
                setPregunta18(clientF.data().pregunta18 || ["", false]);
                setIsLoading(false);
            }
        } else {
            setPregunta1(["", false]);
            setPregunta2(["", false]);
            setPregunta3(["", false]);
            setPregunta4(["", false]);
            setPregunta5(["", false]);
            setPregunta6(["", false]);
            setPregunta7(["", false]);
            setPregunta8(["", false]);
            setPregunta9(["", false]);
            setPregunta10(["", false]);
            setPregunta11(["", false]);
            setPregunta12(["", false]);
            setPregunta13(["", false]);
            setPregunta14(["", false]);
            setPregunta15(["", false]);
            setPregunta16(["", false]);
            setPregunta17(["", false]);
            setPregunta18(["", false]);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        getClientById(props.id);
    }, [props.id]);


    return (
        <>
            <div className="mainpage">
                {isLoading ? (
                    <span className="loader position-absolute start-50 top-50 mt-3"></span>
                ) : (
                    <>
                        {!props.id ? (
                            <div className="container mt-2 mw-100" >
                                <div className="row">
                                    <h1>No se ha seleccionado un Paciente.</h1>
                                </div>
                            </div>
                        ) : (
                            <div className="w-100">
                                <div className="container mw-100 mt-2">
                                    <div className="col">
                                        <div className="d-flex m-2">
                                            <div className="col-mb-3">
                                                <label className="form-label d-flex">
                                                    <div className="me-auto">
                                                        1. ¿Está siendo atendido por un médico?
                                                    </div>
                                                    <label className="m-1">
                                                        <input
                                                            type="radio"
                                                            className="m-1"
                                                            checked={pregunta1[1]}
                                                            onChange={() => setPregunta1((prevState) => [prevState[0], true])}
                                                        />
                                                        Sí
                                                    </label>
                                                    <label className="m-1">
                                                        <input
                                                            type="radio"
                                                            className="m-1"
                                                            checked={!pregunta1[1]}
                                                            onChange={() => setPregunta1((prevState) => [prevState[0], false])}
                                                        />
                                                        No
                                                    </label>
                                                </label>
                                                <textarea
                                                    value={pregunta1[0]}
                                                    onChange={(e) => setPregunta1((prevState) => [e.target.value, prevState[1]])}
                                                    type="text"
                                                    className="form-control-check w-50 m-1 pt-2 textarea-no-resize"
                                                    placeholder={pregunta1[1] ? "¿Qué especialidad?" : ""}
                                                    disabled={!pregunta1[1]}
                                                    style={{
                                                        verticalAlign: 'top',
                                                        height: 'calc(1.3em * ' + Math.ceil(pregunta1[0].length / 60) + ')',
                                                    }}
                                                />

                                                <label className="form-label d-flex">
                                                    <div className="me-auto">
                                                        2. ¿Esta siendo atendido por un médico psiquiatra o psicologo?
                                                    </div>
                                                    <label className="m-1">
                                                        <input
                                                            type="radio"
                                                            className="m-1"
                                                            checked={pregunta2[1]}
                                                            onChange={() => setPregunta2((prevState) => [prevState[0], true])}
                                                        />
                                                        Sí
                                                    </label>
                                                    <label className="m-1">
                                                        <input
                                                            type="radio"
                                                            className="m-1"
                                                            checked={!pregunta2[1]}
                                                            onChange={() => setPregunta2((prevState) => [prevState[0], false])}
                                                        />
                                                        No
                                                    </label>
                                                </label>
                                                <textarea
                                                    value={pregunta2[0]}
                                                    onChange={(e) => setPregunta2((prevState) => [e.target.value, prevState[1]])}
                                                    className="form-control-check m-1 w-50 pt-2 textarea-no-resize"
                                                    placeholder={pregunta2[1] ? "¿Psiquiatra o Psicologo?" : ""}
                                                    disabled={!pregunta2[1]}
                                                    style={{
                                                        verticalAlign: 'top',
                                                        height: 'calc(1.3em * ' + Math.ceil(pregunta2[0].length / 60) + ')',
                                                    }}
                                                />

                                                <label className="form-label d-flex">
                                                    <div className="me-auto">
                                                        3. ¿Está tomando algún medicamento?{" "}
                                                    </div>
                                                    <label className="m-1">
                                                        <input
                                                            type="radio"
                                                            className="m-1"
                                                            checked={pregunta3[1]}
                                                            onChange={() => setPregunta3((prevState) => [prevState[0], true])}
                                                        />
                                                        Sí
                                                    </label>
                                                    <label className="m-1">
                                                        <input
                                                            type="radio"
                                                            className="m-1"
                                                            checked={!pregunta3[1]}
                                                            onChange={() => setPregunta3((prevState) => [prevState[0], false])}
                                                        />
                                                        No
                                                    </label>
                                                </label>
                                                <textarea
                                                    value={pregunta3[0]}
                                                    onChange={(e) => setPregunta3((prevState) => [e.target.value, prevState[1]])}
                                                    type="text"
                                                    className="form-control-check m-1 w-50 pt-2 textarea-no-resize"
                                                    placeholder={pregunta3[1] ? "¿Qué medicamento?" : ""}
                                                    disabled={!pregunta3[1]}
                                                    style={{
                                                        verticalAlign: 'top',
                                                        height: 'calc(1.3em * ' + Math.ceil(pregunta3[0].length / 60) + ')',
                                                    }}
                                                />



                                                <label className="form-label d-flex">
                                                    <div className="me-auto">
                                                        4. ¿Es alérgico a algún medicamento?
                                                    </div>
                                                    <label className="m-1">
                                                        <input
                                                            type="radio"
                                                            className="m-1"
                                                            checked={pregunta4[1]}
                                                            onChange={() => setPregunta4((prevState) => [prevState[0], true])}
                                                        />
                                                        Sí
                                                    </label>
                                                    <label className="m-1">
                                                        <input
                                                            type="radio"
                                                            className="m-1"
                                                            checked={!pregunta4[1]}
                                                            onChange={() => setPregunta4((prevState) => [prevState[0], false])}
                                                        />
                                                        No
                                                    </label>
                                                </label>
                                                <textarea
                                                    value={pregunta4[0]}
                                                    onChange={(e) => setPregunta4((prevState) => [e.target.value, prevState[1]])}
                                                    type="text"
                                                    className="form-control-check m-1 w-50 pt-2 textarea-no-resize"
                                                    placeholder={pregunta4[1] ? "¿A cuál medicamento?" : ""}
                                                    disabled={!pregunta4[1]}
                                                    style={{
                                                        verticalAlign: 'top',
                                                        height: 'calc(1.3em * ' + Math.ceil(pregunta4[0].length / 60) + ')',
                                                    }}
                                                />

                                                <label className="form-label d-flex">
                                                    <div className="me-auto">
                                                        5. ¿Ha tenido alguna reacción a la anestesia local?
                                                    </div>
                                                    <label className="m-1">
                                                        <input
                                                            type="radio"
                                                            className="m-1"
                                                            checked={pregunta5[1]}
                                                            onChange={() => setPregunta5((prevState) => [prevState[0], true])}
                                                        />
                                                        Sí
                                                    </label>
                                                    <label className="m-1">
                                                        <input
                                                            type="radio"
                                                            className="m-1"
                                                            checked={!pregunta5[1]}
                                                            onChange={() => setPregunta5((prevState) => [prevState[0], false])}
                                                        />
                                                        No
                                                    </label>
                                                </label>

                                                <label className="form-label d-flex">
                                                    <div className="me-auto">
                                                        6. ¿Está embarazada?
                                                    </div>
                                                    <label className="m-1">
                                                        <input
                                                            type="radio"
                                                            className="m-1"
                                                            checked={pregunta6[1]}
                                                            onChange={() => setPregunta6((prevState) => [prevState[0], true])}
                                                        />
                                                        Sí
                                                    </label>
                                                    <label className="m-1">
                                                        <input
                                                            type="radio"
                                                            className="m-1"
                                                            checked={!pregunta6[1]}
                                                            onChange={() => setPregunta6((prevState) => [prevState[0], false])}
                                                        />
                                                        No
                                                    </label>
                                                </label>

                                                <label className="form-label d-flex">
                                                    <div className="me-auto">
                                                        7. ¿Padece o padeció hepatitis?
                                                    </div>
                                                    <label className="m-1">
                                                        <input
                                                            type="radio"
                                                            className="m-1"
                                                            checked={pregunta7[1]}
                                                            onChange={() => setPregunta7((prevState) => [prevState[0], true])}
                                                        />
                                                        Sí
                                                    </label>
                                                    <label className="m-1">
                                                        <input
                                                            type="radio"
                                                            className="m-1"
                                                            checked={!pregunta7[1]}
                                                            onChange={() => setPregunta7((prevState) => [prevState[0], false])}
                                                        />
                                                        No
                                                    </label>
                                                </label>

                                                <label className="form-label d-flex">
                                                    <div className="me-auto">
                                                        8. ¿Padece o padeció enfermedades renales?
                                                    </div>
                                                    <label className="m-1">
                                                        <input
                                                            type="radio"
                                                            className="m-1"
                                                            checked={pregunta8[1]}
                                                            onChange={() => setPregunta8((prevState) => [prevState[0], true])}
                                                        />
                                                        Sí
                                                    </label>
                                                    <label className="m-1">
                                                        <input
                                                            type="radio"
                                                            className="m-1"
                                                            checked={!pregunta8[1]}
                                                            onChange={() => setPregunta8((prevState) => [prevState[0], false])}
                                                        />
                                                        No
                                                    </label>
                                                </label>

                                                <label className="form-label d-flex">
                                                    <div className="me-auto">
                                                        9. ¿Tiene problemas del corazón?
                                                    </div>
                                                    <label className="m-1">
                                                        <input
                                                            type="radio"
                                                            className="m-1"
                                                            checked={pregunta9[1]}
                                                            onChange={() => setPregunta9((prevState) => [prevState[0], true])}
                                                        />
                                                        Sí
                                                    </label>
                                                    <label className="m-1">
                                                        <input
                                                            type="radio"
                                                            className="m-1"
                                                            checked={!pregunta9[1]}
                                                            onChange={() => setPregunta9((prevState) => [prevState[0], false])}
                                                        />
                                                        No
                                                    </label>
                                                </label>

                                                <label className="form-label d-flex">
                                                    <div className="me-auto">
                                                        10. ¿Padece o ha padecido cáncer?
                                                    </div>
                                                    <label className="m-1">
                                                        <input
                                                            type="radio"
                                                            className="m-1"
                                                            checked={pregunta10[1]}
                                                            onChange={() => setPregunta10((prevState) => [prevState[0], true])}
                                                        />
                                                        Sí
                                                    </label>
                                                    <label className="m-1">
                                                        <input
                                                            type="radio"
                                                            className="m-1"
                                                            checked={!pregunta10[1]}
                                                            onChange={() => setPregunta10((prevState) => [prevState[0], false])}
                                                        />
                                                        No
                                                    </label>
                                                </label>

                                                <label className="form-label d-flex">
                                                    <div className="me-auto">
                                                        11. ¿Ha tenido alguna cirugía?
                                                    </div>
                                                    <label className="m-1">
                                                        <input
                                                            type="radio"
                                                            className="m-1"
                                                            checked={pregunta11[1]}
                                                            onChange={() => setPregunta11((prevState) => [prevState[0], true])}
                                                        />
                                                        Sí
                                                    </label>
                                                    <label className="m-1">
                                                        <input
                                                            type="radio"
                                                            className="m-1"
                                                            checked={!pregunta11[1]}
                                                            onChange={() => setPregunta11((prevState) => [prevState[0], false])}
                                                        />
                                                        No
                                                    </label>
                                                </label>

                                                <label className="form-label d-flex">
                                                    <div className="me-auto">
                                                        12. ¿Es diabético?
                                                    </div>
                                                    <label className="m-1">
                                                        <input
                                                            type="radio"
                                                            className="m-1"
                                                            checked={pregunta12[1]}
                                                            onChange={() => setPregunta12((prevState) => [prevState[0], true])}
                                                        />
                                                        Sí
                                                    </label>
                                                    <label className="m-1">
                                                        <input
                                                            type="radio"
                                                            className="m-1"
                                                            checked={!pregunta12[1]}
                                                            onChange={() => setPregunta12((prevState) => [prevState[0], false])}
                                                        />
                                                        No
                                                    </label>
                                                </label>

                                                <label className="form-label d-flex">
                                                    <div className="me-auto">
                                                        13. ¿Tiene trastornos de tipo convulsivo?
                                                    </div>
                                                    <label className="m-1">
                                                        <input
                                                            type="radio"
                                                            className="m-1"
                                                            checked={pregunta13[1]}
                                                            onChange={() => setPregunta13((prevState) => [prevState[0], true])}
                                                        />
                                                        Sí
                                                    </label>
                                                    <label className="m-1">
                                                        <input
                                                            type="radio"
                                                            className="m-1"
                                                            checked={!pregunta13[1]}
                                                            onChange={() => setPregunta13((prevState) => [prevState[0], false])}
                                                        />
                                                        No
                                                    </label>
                                                </label>

                                                <label className="form-label d-flex">
                                                    <div className="me-auto">
                                                        14. ¿Lo han hospitalizado?
                                                    </div>
                                                    <label className="m-1">
                                                        <input
                                                            type="radio"
                                                            className="m-1"
                                                            checked={pregunta14[1]}
                                                            onChange={() => setPregunta14((prevState) => [prevState[0], true])}
                                                        />
                                                        Sí
                                                    </label>
                                                    <label className="m-1">
                                                        <input
                                                            type="radio"
                                                            className="m-1"
                                                            checked={!pregunta14[1]}
                                                            onChange={() => setPregunta14((prevState) => [prevState[0], false])}
                                                        />
                                                        No
                                                    </label>
                                                </label>

                                                <label className="form-label d-flex">
                                                    <div className="me-auto">
                                                        15. ¿Ha tenido algun sangrado excesivo?
                                                    </div>
                                                    <label className="m-1">
                                                        <input
                                                            type="radio"
                                                            className="m-1"
                                                            checked={pregunta15[1]}
                                                            onChange={() => setPregunta15((prevState) => [prevState[0], true])}
                                                        />
                                                        Sí
                                                    </label>
                                                    <label className="m-1">
                                                        <input
                                                            type="radio"
                                                            className="m-1"
                                                            checked={!pregunta15[1]}
                                                            onChange={() => setPregunta15((prevState) => [prevState[0], false])}
                                                        />
                                                        No
                                                    </label>
                                                </label>

                                                <label className="form-label d-flex">
                                                    <div className="me-auto">
                                                        16. ¿Tiene algun problema digestivo (úlceras o gastritis)?
                                                    </div>
                                                    <label className="m-1">
                                                        <input
                                                            type="radio"
                                                            className="m-1"
                                                            checked={pregunta16[1]}
                                                            onChange={() => setPregunta16((prevState) => [prevState[0], true])}
                                                        />
                                                        Sí
                                                    </label>
                                                    <label className="m-1">
                                                        <input
                                                            type="radio"
                                                            className="m-1"
                                                            checked={!pregunta16[1]}
                                                            onChange={() => setPregunta16((prevState) => [prevState[0], false])}
                                                        />
                                                        No
                                                    </label>
                                                </label>

                                                <label className="form-label d-flex">
                                                    <div className="me-auto">
                                                        17. ¿Toma anticonceptivos orales?
                                                    </div>
                                                    <label className="m-1">
                                                        <input
                                                            type="radio"
                                                            className="m-1"
                                                            checked={pregunta17[1]}
                                                            onChange={() => setPregunta17((prevState) => [prevState[0], true])}
                                                        />
                                                        Sí
                                                    </label>
                                                    <label className="m-1">
                                                        <input
                                                            type="radio"
                                                            className="m-1"
                                                            checked={!pregunta17[1]}
                                                            onChange={() => setPregunta17((prevState) => [prevState[0], false])}
                                                        />
                                                        No
                                                    </label>
                                                </label>

                                                <label className="form-label d-flex">
                                                    <div className="me-auto">
                                                        18. ¿Padece alguna otra enfermedad o transtorno que no se
                                                        mencione en esta lista y que debamos saber?
                                                    </div>
                                                    <label className="m-1">
                                                        <input
                                                            type="radio"
                                                            className="m-1"
                                                            checked={pregunta18[1]}
                                                            onChange={() => setPregunta18((prevState) => [prevState[0], true])}
                                                        />
                                                        Sí
                                                    </label>
                                                    <label className="m-1">
                                                        <input
                                                            type="radio"
                                                            className="m-1"
                                                            checked={!pregunta18[1]}
                                                            onChange={() => setPregunta18((prevState) => [prevState[0], false])}
                                                        />
                                                        No
                                                    </label>
                                                </label>
                                                <textarea
                                                    value={pregunta18[0]}
                                                    onChange={(e) => setPregunta18((prevState) => [e.target.value, prevState[1]])}
                                                    type="text"
                                                    className="form-control-check w-50 m-1 pt-2 textarea-no-resize"
                                                    placeholder={pregunta18[1] ? "¿Qué enfermedad?" : ""}
                                                    disabled={!pregunta18[1]}
                                                    style={{
                                                        verticalAlign: 'top',
                                                        height: 'calc(1.3em * ' + Math.ceil(pregunta18[0].length / 60) + ')',
                                                    }}
                                                />


                                                {props.rol !== process.env.REACT_APP_rolDoctor ? (
                                                    <div>
                                                        <button
                                                            type="submit"
                                                            className="btn button-main mt-4"
                                                            id="boton-main"
                                                            style={{ margin: "3px" }}
                                                            onClick={handleActualizarClick}
                                                        >
                                                            Actualizar
                                                        </button>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
}
export default Antecedentes;