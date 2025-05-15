import { useState } from "react";
import logo from "../img/logo-odentid.png";
import background from "../img/login-background.png"
import { signInWithEmailAndPassword, sendPasswordResetEmail, signOut } from "firebase/auth";
import { auth } from "../firebaseConfig/firebase";
import { useNavigate } from "react-router-dom";
import { db } from "../firebaseConfig/firebase";
import { query, collection, where, getDocs, limit } from "firebase/firestore";
import { Modal } from "react-bootstrap";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import ReCAPTCHA from "react-google-recaptcha";
import "../style/Main.css";
import Swal from "sweetalert2";
import CryptoJS from 'crypto-js';

const Login = () => {
  const [email, setEmail] = useState("");
  const [emailReseteo, setEmailReseteo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [error2, setError2] = useState(false);
  const navigate = useNavigate();
  const [mostrarModal, setMostrarModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [captchaResolved, setCaptchaResolved] = useState(false);
  const [showItem, setShowItem] = useState(false);

  const togglePasswordVisibility = (e) => {
    e.preventDefault();
    setShowPassword(!showPassword);
  };

  const handleCaptchaResolved = () => {
    setCaptchaResolved(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (captchaResolved) {
      try {
        await signInWithEmailAndPassword(auth, email, password);

        const q = query(collection(db, 'user'), where('correo', '==', email), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          const userRole = doc.data().rol;
          const valorEncriptado = CryptoJS.AES.encrypt(userRole, process.env.REACT_APP_cryptoKey).toString();
          localStorage.setItem('rol', valorEncriptado);

          if (doc.data().rol === process.env.REACT_APP_rolBloq) {
            await signOut(auth);
            localStorage.setItem("rol", JSON.stringify(null));
          } else if (doc.data().rol === process.env.REACT_APP_rolAd) {
            navigate("/agenda");
          } else {
            navigate("/pacientes");
          }
        } else {
          console.error("No documents");
          window.alert("Error al Logearse, Verifique su conexión!")
        }
      } catch (error) {
        console.error("Submit Login.jsx " + error)
        setError(true);
        setTimeout(clearError, 3000);
      }
    } else {
      setError2(true)
      setTimeout(clearError, 2000);
    }
  };


  const pedirReseteoClave = (e) => {
    e.preventDefault();
    setMostrarModal(false);
    sendPasswordResetEmail(auth, emailReseteo)
      .then(() => {
        setEmailReseteo("");
        Swal.fire({
          title: '¡Éxito!',
          text: 'Mail con instrucciones para reestablecer clave ENVIADO!',
          icon: 'success',
          confirmButtonColor: '#00C5C1',
        })
      })
      .catch(() => {
        Swal.fire({
          title: '¡Error!',
          text: 'Hubo un error al enviar el correo. Intente de nuevo más tarde.',
          icon: 'error',
          confirmButtonColor: '#d33',
        })
      });
  };

  const handleModal = (e) => {
    e.preventDefault();
    setMostrarModal(true);
  };

  const clearError = () => {
    setError("");
    setError2("");
  };

  return (
    <>
      <div className="login" style={{ overflow: "hidden" }}>
        <div className="background-container">
          <img className="background-image" alt="Background" src={background} />
          <div className="text-overlay">
            <h1 className="welcome-text">
              <span>Bienvenido a</span>
              <span>la plataforma Odentid</span>
            </h1>
          </div>
        </div>
        <div className="login-page" style={{ transform: "scale(0.9)" }}>
          <img className="logo" src={logo} alt="Odentid" />
          <form className="p-4" onSubmit={submit}>
            <h3 style={{ textAlign: "left" }}>Iniciar Sesión</h3>
            <div className="email">
              <input
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                id="email"
                autoComplete="current-email"
              />
              <label htmlFor="email">Email</label>
            </div>
            <div className="password" style={{ display: "flex" }}>
              <input
                onChange={(e) => {
                  setPassword(e.target.value);
                  setShowItem(true)
                }}
                type={showPassword ? "text" : "password"}
                id="password"
                autoComplete="current-password"
              />
              <label htmlFor="password">Contraseña</label>
              <button
                style={{ border: "none", background: "transparent", cursor: "pointer", color: "#000", borderRadius: "0px" }} // Agrega un margen de valor cero al botón
                onClick={togglePasswordVisibility}
                tabIndex="-1"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {error && (
              <span className="error">Informacion de Sesion Incorrecta.</span>
            )}
            {showItem &&
              <div className="captcha" style={{ display: "flex", justifyContent: "center", alignItems: "center", transform: "scale(0.9)" }}>
                <ReCAPTCHA
                  sitekey={process.env.REACT_APP_captcha}
                  onChange={handleCaptchaResolved}
                />
              </div>
            }
            {error2 && (
              <span className="error">Captcha Invalido.</span>
            )}

            <button className="button-login" type="submit">
              Iniciar Sesión
            </button>

            <button
              type="button"
              onClick={handleModal}
              style={{
                display: "inline-block",
                width: "150px",
                background: "white",
                color: "black",
                alignSelf: "center"
              }}
            >
              <span style={{ cursor: "pointer" }}>
                Olvidé mi Clave
              </span>
            </button>
          </form>
        </div>
      </div>

      {mostrarModal && (
        <Modal
          show={mostrarModal}
          size="lg"
          aria-labelledby="contained-modal-title-vcenter"
          centered
        >
          <Modal.Header closeButton onClick={() => { setMostrarModal(false) }}>
            <Modal.Title>Reestablecer Clave</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="container">
              <div className="col">
                <form>
                  <div className="row">
                    <div className="col mb-6">
                      <label className="form-label">Ingrese su correo</label>
                      <input
                        onChange={(e) => setEmailReseteo(e.target.value)}
                        type="email"
                        className="form-control"
                        autoComplete="off"
                        required
                      />
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <div style={{ display: "flex" }}>
              <button
                type="submit"
                onClick={(e) => {
                  pedirReseteoClave(e);
                  setMostrarModal(false);
                }}
                className="btn button-main"
              >
                Enviar Correo
              </button>
            </div>
          </Modal.Footer>
        </Modal>
      )}
    </>
  );
};

export default Login;
