import React, { useState, useEffect, useCallback } from "react";
import { Modal } from "react-bootstrap";
import { collection, doc, setDoc, getDocs } from "firebase/firestore";
import { db } from "../../../firebaseConfig/firebase.js";
import { invalidarSucursales } from "../../../Utils/sucursales";
import { useForm } from "react-hook-form";

// ABM de sucursales (colección global "sucursales"). El id es un slug que forma
// las URLs públicas (/crear-solicitud/{id}) y los paths sucursales/{id}/...
// No hay borrado: se desactiva con "activa" para no dejar huérfanas las subcolecciones.

// Deriva el identificador URL-safe desde el nombre: minúsculas, sin tildes/ñ,
// espacios → guion. Ej: "Sucursal Güemes Nº2" → "sucursal-guemes-n2"
const slugify = (texto = "") =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const Sucursales = ({ show, onHide }) => {
  const { register, handleSubmit, setValue, reset } = useForm();

  const [idAEditar, setIdAEditar] = useState(null);
  const [sucursales, setSucursales] = useState([]);
  const [error, setError] = useState("");

  const sucursalesCollection = collection(db, "sucursales");

  const getSucursales = useCallback(async () => {
    try {
      const snapshot = await getDocs(sucursalesCollection);
      const sucursalesArray = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSucursales(sucursalesArray);
    } catch (error) {
      console.error("Error fetching data Sucursales:", error);
      setError("No se pudieron cargar las sucursales. Revisá la conexión.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (show) {
      getSucursales();
    }
  }, [show, getSucursales]);

  const guardar = async (data) => {
    const id = idAEditar !== null ? idAEditar : slugify(data.nombre);

    if (!id || !/^[a-z0-9-]+$/.test(id)) {
      setError("El nombre debe contener al menos una letra o número para generar el identificador");
      return;
    }
    if (idAEditar === null && sucursales.some((s) => s.id === id)) {
      setError("Ya existe una sucursal con ese identificador");
      return;
    }

    // WhatsApp necesita el número sin 0 ni 15: característica más número, 10
    // dígitos. La web le antepone el 549.
    const telefono = String(data.telefono || "").replace(/\D/g, "");
    if (telefono.length !== 10) {
      setError("El teléfono tiene que tener 10 dígitos, sin 0 ni 15. Ej: 1134567890");
      return;
    }

    // setDoc sin merge reemplaza el documento entero: todo campo de la sucursal
    // tiene que viajar acá, o editarla lo borra.
    const newState = {
      nombre: data.nombre,
      direccion: data.direccion || "",
      telefono,
      activa: idAEditar !== null
        ? sucursales.find((s) => s.id === id)?.activa ?? true
        : true,
    };

    try {
      await setDoc(doc(sucursalesCollection, id), newState);
      invalidarSucursales();

      setSucursales((prev) =>
        idAEditar !== null
          ? prev.map((s) => (s.id === id ? { ...s, ...newState } : s))
          : [...prev, { id, ...newState }]
      );
      setIdAEditar(null);
      reset();
      setError("");
    } catch (error) {
      console.error("Error al guardar la Sucursal: ", error);
      setError("No se pudo guardar la sucursal. Revisá la conexión e intentá de nuevo.");
    }
  };

  const handleEdit = (item) => {
    setIdAEditar(item.id);
    setValue("nombre", item.nombre);
    setValue("direccion", item.direccion || "");
    setValue("telefono", item.telefono || "");
    setError("");
  };

  const toggleActiva = async (item) => {
    try {
      await setDoc(doc(sucursalesCollection, item.id), { activa: !item.activa }, { merge: true });
      invalidarSucursales();
      setSucursales((prev) =>
        prev.map((s) => (s.id === item.id ? { ...s, activa: !item.activa } : s))
      );
    } catch (error) {
      console.error("Error al actualizar la Sucursal: ", error);
      setError("No se pudo actualizar la sucursal. Revisá la conexión e intentá de nuevo.");
    }
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      aria-labelledby="contained-modal-title-vcenter"
      centered
    >
      <Modal.Header closeButton onClick={() => {
        setIdAEditar(null);
        reset();
        setError("");
      }}>
        <Modal.Title>Crear/Editar Sucursales</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form name="sucursales" onSubmit={handleSubmit(guardar)}>
          <div className="mb-3">
            <label className="form-label">Nombre*</label>
            <input type="text" className="form-control" required placeholder="..." {...register("nombre")} />

            {/* El identificador del link se genera solo desde el nombre: al admin no le
                sirve verlo. */}
            <label className="form-label">Dirección*</label>
            <input type="text" className="form-control" required placeholder="..." {...register("direccion")} />

            {/* El de atención al público: la web manda ahí el WhatsApp de cada pedido. */}
            <label className="form-label">Teléfono de atención*</label>
            <input type="tel" className="form-control" required placeholder="10 dígitos, sin 0 ni 15. Ej: 1134567890" {...register("telefono")} />
            {error && <small className="text-danger">{error}</small>}
          </div>

          <button type="submit" className="btn btn-success">
            {idAEditar !== null ? "Actualizar" : "Crear"}
          </button>

          {idAEditar !== null && (
            <button
              className="btn btn-secondary mx-2"
              onClick={() => { setIdAEditar(null); reset(); setError(""); }}
            >
              Cancelar
            </button>
          )}
        </form>

        <div className="mt-3">
          {sucursales.map((sucursal) => (
            <div
              key={sucursal.id}
              className="d-flex align-items-center justify-content-between border p-2"
            >
              <div className="col-6 text-center fw-bold">{sucursal.nombre}</div>
              <div className="col-4 text-end">
                <button
                  type="button"
                  className="btn btn-success mx-1 btn-sm"
                  onClick={() => handleEdit(sucursal)}
                >
                  <i className="fa-solid fa-edit"></i>
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${sucursal.activa ? "btn-outline-success" : "btn-outline-danger"}`}
                  onClick={() => toggleActiva(sucursal)}
                >
                  {sucursal.activa ? "Activa" : "Inactiva"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default Sucursales;
