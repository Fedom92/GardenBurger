import { useState } from "react";
import logo from "../img/logo_blanco.webp";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebaseConfig/firebase";
import { useNavigate, useLocation } from "react-router-dom";
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
  const location = useLocation();
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
        const from = location.state?.from?.pathname || '/productos';
        navigate(from, { replace: true });
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
      <div className="container-fluid p-0">
        <div className="row g-0 min-vh-100">

          {/* Panel izquierdo: formulario */}
          <div className="login-panel col-12 col-md-6 d-flex flex-column align-items-center justify-content-center px-3 px-md-5">
            <img
              src={logo}
              alt="GardenBurger Logo"
              className="login-logo mb-4"
            />

            <form name="login" onSubmit={submit} className="w-100" style={{ maxWidth: 300 }}>
              <h3 className="text-center mb-4">Iniciar Sesión</h3>

              {/* Email */}
              <div className="login-field mb-3">
                <input
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  id="email"
                  autoComplete="current-email"
                  required
                />
                <label htmlFor="email">Email</label>
              </div>

              {/* Contraseña */}
              <div className="login-field d-flex mb-3">
                <input
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  id="password"
                  autoComplete="current-password"
                  required
                />
                <label htmlFor="password">Contraseña</label>
                <button
                  type="button"
                  style={{ border: "none", background: "transparent", cursor: "pointer", color: "#000", borderRadius: "0px" }}
                  onClick={togglePasswordVisibility}
                  tabIndex="-1"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              {error && (
                <span className="d-block text-danger text-center mb-2" style={{ fontSize: 12 }}>
                  Información de Sesión Incorrecta.
                </span>
              )}

              <button className="btn btn-dark w-100 rounded-pill py-2 mb-3" type="submit">
                Iniciar Sesión
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleModal}
                  className="btn btn-link text-dark p-0"
                >
                  Olvidé mi Clave
                </button>
              </div>
            </form>
          </div>

          {/* Panel derecho: fondo negro — oculto en móvil */}
          <div
            className="col-md-6 d-none d-md-flex flex-column align-items-center justify-content-center"
            style={{ backgroundColor: "#000", animation: "EntradaDerechaAIzquierda 1.8s ease forwards" }}
          >
            <h1 className="welcome-text">
              <span>Bienvenido a la</span>
              <span>Plataforma</span>
            </h1>
          </div>

        </div>
      </div>

      {/* Modal recuperar clave */}
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