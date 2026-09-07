import {setGlobalOptions} from "firebase-functions";
import {onCall, HttpsError} from "firebase-functions/https";
import * as admin from "firebase-admin";

admin.initializeApp();

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance.
setGlobalOptions({maxInstances: 10});

// Hora oficial del sistema: el cliente calcula su offset contra esta
// respuesta para que getFechaComercial() no dependa del reloj de cada PC.
// invoker public: las callable se invocan sin IAM; la auth va por token de Firebase.
export const horaServidor = onCall({invoker: "public"}, () => {
  return {ahora: Date.now()};
});

// ── Quién es admin ────────────────────────────────────────────────────────
// Ser admin se resuelve con un custom claim en el token: no cuesta lecturas y
// es lo que miran las reglas de Firestore.
//
// El respaldo contra Firestore se queda PARA SIEMPRE, y es a propósito: los
// admins se dan de alta a mano desde la Consola, así que un admin nuevo tiene
// el rol en `usuarios` pero todavía no tiene claim. Sin este respaldo no podría
// ni invocar sincronizarClaims para otorgárselo, y quedaría trabado. El `||`
// cortocircuita, así que en operación normal la lectura no se ejecuta.
//
// En las REGLAS no hay respaldo: ahí es claim y punto.
// Devuelve el uid del que llama: TypeScript no puede deducir que el throw de
// acá adentro ya descartó el caso `auth: undefined` en el que llama.
const exigirAdmin = async (
  request: {auth?: {uid: string, token?: Record<string, unknown>}}
): Promise<string> => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debés iniciar sesión.");
  }
  const uid = request.auth.uid;
  if (request.auth.token?.admin === true) return uid;

  const callerSnap = await admin.firestore().doc(`usuarios/${uid}`).get();
  if (callerSnap.data()?.rol !== process.env.ADMIN_ROL) {
    throw new HttpsError("permission-denied", "Solo un administrador puede hacer esto.");
  }
  return uid;
};

// Reparte el custom claim `admin` según el rol guardado en `usuarios`.
//
// Sin `uid` sincroniza a todos: es el backfill que se corre una vez, y el que
// usa un admin recién creado en la Consola para otorgarse el claim a sí mismo.
// No la llama nada automáticamente — la interfaz no puede cambiar roles de
// admin, así que no hay nada que mantener sincronizado solo.
export const sincronizarClaims = onCall({invoker: "public"}, async (request) => {
  await exigirAdmin(request);

  const db = admin.firestore();
  const {uid} = request.data ?? {};

  const docs = uid ?
    [await db.doc(`usuarios/${uid}`).get()] :
    (await db.collection("usuarios").get()).docs;

  let sincronizados = 0;
  let admins = 0;

  for (const doc of docs) {
    const data = doc.data();
    // Los empleados sin acceso (repartidores) no tienen cuenta de Auth:
    // setCustomUserClaims fallaría con un uid que no existe.
    if (!data || data.sinAcceso === true) continue;

    const esAdmin = data.rol === process.env.ADMIN_ROL;
    try {
      await admin.auth().setCustomUserClaims(doc.id, esAdmin ? {admin: true} : {});
      sincronizados++;
      if (esAdmin) admins++;
    } catch (error) {
      // Un doc sin cuenta de Auth (dado de baja, o creado a mano sin usuario)
      // no debe cortar el backfill del resto.
      if ((error as {code?: string}).code !== "auth/user-not-found") throw error;
    }
  }

  return {sincronizados, admins};
});

// Crea empleados CON acceso al sistema (cuenta de Auth + doc en "usuarios").
// Los empleados sin acceso (repartidores) no pasan por acá: son solo un
// documento y los crea el cliente.
//
// El perfil llega en `datos` como un objeto genérico y se escribe tal cual. Es
// deliberado: agregar un campo al alta no obliga a tocar ni redeployar esta
// Function. Solo se fuerzan server-side los campos que no puede decidir el
// cliente (correo, activo, sinAcceso, timestamp).
//
// No hay transacción posible entre Auth y Firestore: son servicios distintos.
// Lo que sí se puede es compensar — si el documento falla, se borra la cuenta
// recién creada, así no queda un usuario de Auth huérfano con el correo tomado.
//
// El rol admin se valida contra process.env.ADMIN_ROL (functions/.env), que
// debe mantenerse igual a REACT_APP_admin del cliente.
export const crearUsuario = onCall({invoker: "public"}, async (request) => {
  await exigirAdmin(request);

  const db = admin.firestore();
  const {correo, password, datos} = request.data ?? {};
  if (!correo || !password || !datos || typeof datos !== "object") {
    throw new HttpsError("invalid-argument", "Faltan campos obligatorios.");
  }
  if (!datos.nombreCompleto || !datos.rol) {
    throw new HttpsError("invalid-argument", "El empleado necesita nombre y rol.");
  }
  // Los admins se dan de alta a mano desde la Consola de Firebase. Sacar la
  // opción del <select> no alcanza: se repone con las devtools en diez segundos,
  // así que la barrera real va acá.
  if (datos.rol === process.env.ADMIN_ROL) {
    throw new HttpsError("permission-denied", "El rol admin no se asigna desde la aplicación.");
  }
  if (password.length < 6) {
    throw new HttpsError("invalid-argument", "El password debe tener al menos 6 caracteres.");
  }

  let uid: string;
  try {
    const userRecord = await admin.auth().createUser({
      email: correo,
      password,
      displayName: datos.nombreCompleto,
    });
    uid = userRecord.uid;
  } catch (error) {
    if ((error as {code?: string}).code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "El correo ya está registrado.");
    }
    throw new HttpsError("internal", "No se pudo crear el usuario en Auth.");
  }

  // Nunca confiar en el cliente para estos cuatro: la contraseña no se guarda,
  // el correo es el mismo con el que se creó la cuenta, y un alta siempre nace
  // activa y con acceso.
  const {password: _p, confirmPassword: _c, ...perfil} = datos;
  const empleado = {
    ...perfil,
    correo,
    activo: true,
    sinAcceso: false,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  };

  try {
    await db.doc(`usuarios/${uid}`).set(empleado);
  } catch (error) {
    // Compensación: sin esto quedaría una cuenta de Auth sin perfil, con el
    // correo tomado y el alta fallando para siempre al reintentar.
    await admin.auth().deleteUser(uid).catch(() => undefined);
    throw new HttpsError("internal", "No se pudo guardar el empleado. No se creó ninguna cuenta.");
  }

  // JSON plano: FieldValue.serverTimestamp() es un sentinel de escritura,
  // no serializa en la respuesta de una callable.
  return {id: uid, ...perfil, correo, activo: true, sinAcceso: false};
});

// Da de baja a un usuario: borra su cuenta de Auth (bloqueo real, no
// client-side) y deja el doc de "usuarios" como registro histórico con
// activo:false. No se reactiva: si la persona vuelve se crea de cero.
export const darDeBajaUsuario = onCall({invoker: "public"}, async (request) => {
  const uidQuienLlama = await exigirAdmin(request);

  const db = admin.firestore();
  const {uid} = request.data ?? {};
  if (!uid) {
    throw new HttpsError("invalid-argument", "Falta el identificador del usuario.");
  }
  if (uid === uidQuienLlama) {
    throw new HttpsError("failed-precondition", "No podés darte de baja a vos mismo.");
  }

  const destinoRef = db.doc(`usuarios/${uid}`);
  const destinoSnap = await destinoRef.get();
  if (!destinoSnap.exists) {
    throw new HttpsError("not-found", "El usuario no existe.");
  }
  if (destinoSnap.data()?.rol === process.env.ADMIN_ROL) {
    throw new HttpsError("permission-denied", "No se puede dar de baja a un administrador.");
  }

  try {
    await admin.auth().deleteUser(uid);
  } catch (error) {
    // Si la cuenta ya no estaba, igual marcamos el doc como inactivo.
    if ((error as {code?: string}).code !== "auth/user-not-found") {
      throw new HttpsError("internal", "No se pudo eliminar la cuenta de acceso.");
    }
  }

  await destinoRef.update({
    activo: false,
    bajaTimestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {id: uid};
});
