import { useState } from "react";
import logo from "../img/logo_blanco.webp";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebaseConfig/firebase";
import { useNavigate } from "react-router-dom";
import { Modal } from "react-bootstrap";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import Swal from "sweetalert2";
import "../style/Main.css";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const [email, setEmail] = useState("");
  const [emailReseteo, setEmailReseteo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const togglePasswordVisibility = (e) => {
    e.preventDefault();
    setShowPassword(!showPassword);
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      const data = await login(email, password);
      if (data) {
        navigate('/productos');
      }
    } catch (error) {
      console.error("Submit Login.jsx " + error);
      setError(true);
      setTimeout(clearError, 3000);
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
          confirmButtonColor: '#198754',
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
  };

  return (
    <>
      <div className="login">

        <div className="background-container">
          <div className="background-image" />
          <div className="text-overlay">
            <h1 className="welcome-text">
              <span>Bienvenido a la</span>
              <span>Plataforma</span>
            </h1>
          </div>
        </div>

        <div className="login-page">
          <img className="logo" src={logo} alt="GardenBurger Logo" />
          <form name="login" onSubmit={submit}>
            <h3>Iniciar Sesión</h3>
            <div className="email">
              <input
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                id="email"
                autoComplete="current-email"
              />
              <label htmlFor="email">Email</label>
            </div>
            <div className="password d-flex">
              <input
                onChange={(e) => {
                  setPassword(e.target.value);
                }}
                type={showPassword ? "text" : "password"}
                id="password"
                autoComplete="current-password"
              />
              <label htmlFor="password">Contraseña</label>
              <button
                style={{ border: "none", background: "transparent", cursor: "pointer", color: "#000", borderRadius: "0px" }}
                onClick={togglePasswordVisibility}
                tabIndex="-1"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {error && (
              <span className="error-login text-danger">Informacion de Sesion Incorrecta.</span>
            )}


            <button className="button-login" type="submit">
              Iniciar Sesión
            </button>

            <button
              type="button"
              onClick={handleModal}
              style={{
                display: "inline-block",
                background: "white",
                color: "black",
                alignSelf: "center"
              }}
            >
              <span className="pointer-event">
                Olvidé mi Clave
              </span>
            </button>
          </form>
        </div>
      </div>


      {mostrarModal && (
        <Modal
          show={mostrarModal}
          size="md"
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
                    <div className="col">
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
                className="btn btn-success"
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