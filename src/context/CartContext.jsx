import { createContext, useEffect, useState } from 'react'
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const CartContext = createContext();

let carritoInicial = JSON.parse(localStorage.getItem("carrito")) || [];
let touquenInicial = JSON.parse(localStorage.getItem("touquen")) || "";


export const CartProvider = ({ children }) => {

  const [carrito, setCarrito] = useState(carritoInicial);

  const [llaveUser, setLlaveUser] = useState(touquenInicial);

  const [claseListaCategoria, SetClaseListaCategoria] = useState("listaCategorias show")

  const llaveAdmin = async () => {
    const formdata = new FormData();
    formdata.append("user", "gruponetworld@gmail.com");
    formdata.append("password", "Networld2020");
    formdata.append("mode", "api");

    const requestOptions = {
      method: "POST",
      body: formdata,
      redirect: "follow"
    };

    try {
      const response = await fetch("https://api.nb.com.ar/v1/auth/login", requestOptions);
      const result = await response.json(); // Usa .json() si el servidor responde con JSON.
      return result.token; // Retorna el token desde el JSON.
    } catch (error) {
      console.error(error);
      throw error; // Lanza el error para que el llamador de la función pueda manejarlo.
    }
  }

  const llaveUsuario = async (user, pass) => {
    let key = await llaveAdmin();
    const myHeaders = new Headers();
    myHeaders.append("Authorization", `Bearer ${key}`);
    const formdata = new FormData();
    formdata.append("user", user);
    formdata.append("password", pass);
    formdata.append("mode", "api");

    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: formdata,
      redirect: "follow"
    };

    try {
      const response = await fetch("https://api.nb.com.ar/v1/auth/login", requestOptions);
      const result = await response.json(); // Usa .json() si el servidor responde con JSON.
      return setLlaveUser(result.token); // Retorna el token desde el JSON.
    } catch (error) {
      console.error(error);
      throw error; // Lanza el error para que el llamador de la función pueda manejarlo.
    }

  }

  useEffect(() => {
    localStorage.setItem("touquen", JSON.stringify(llaveUser))
  }, [llaveUser])

  const chequearUser = async (user) => {
    let key = await llaveAdmin();
    const myHeaders = new Headers();
    myHeaders.append("Authorization", `Bearer ${key}`);

    const formdata = new FormData();
    formdata.append("username", `${user}`);

    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: formdata,
      redirect: "follow"
    };

    try {
      const response = await fetch("https://api.nb.com.ar/v1/miCuenta/usuario/checkIfUsernameExist", requestOptions)
      const result = await response.json(); // Usa .json() si el servidor responde con JSON.
      return result;
    } catch (error) {
      console.error(error);
      throw error; // Lanza el error para que el llamador de la función pueda manejarlo.
    }
  }

  const chequearEmail = async (email) => {
    let key = await llaveAdmin();
    const myHeaders = new Headers();
    myHeaders.append("Authorization", `Bearer ${key}`);

    const formdata = new FormData();
    formdata.append("email", `${email}`);

    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: formdata,
      redirect: "follow"
    };

    try {
      const response = await fetch("https://api.nb.com.ar/v1/miCuenta/usuario/checkIfEmailExist", requestOptions)
      const result = await response.json(); // Usa .json() si el servidor responde con JSON.
      return result;
    } catch (error) {
      console.error(error);
      throw error; // Lanza el error para que el llamador de la función pueda manejarlo.
    }
  }

  const registrarUsuario = async (data) => {
    let resultadoUser = await chequearUser(data.user);
    let resultadoEmail = await chequearEmail(data.email);
    if (resultadoUser.availability) {
      if (resultadoEmail.availability) {
        let key = await llaveAdmin();
        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");
        myHeaders.append("Authorization", `Bearer ${key}`);



        const raw = JSON.stringify({
          "password": `${data.clave}`,
          "username": `${data.user}`,
          "email": `${data.email}`,
          "showName": `${data.name}`,
          "roleId": 3,
          "adminCurrentPass": "Networld2020"
        });

        const requestOptions = {
          method: "POST",
          headers: myHeaders,
          body: raw,
          redirect: "follow"
        };

        try {
          const response = await fetch("https://api.nb.com.ar/v1/miCuenta/usuario/52548", requestOptions);
          const result = await response.json(); // Usa .json() si el servidor responde con JSON.
          return result.msg;
        } catch (error) {
          console.error(error);
          throw error; // Lanza el error para que el llamador de la función pueda manejarlo.
        }
      } else {
        return resultadoEmail.msg
      }

    } else {
      return resultadoUser.msg
    }

  }






  const agregarAlCarrito = (producto) => {

            toast.success('Producto agregado', {
        position: "top-right",
        autoClose: 3000,
        className: 'compact-toast'
      })


    let productoExistente = carrito.findIndex((prod) => {
      return prod.id === producto.id
    }
    )


    if (productoExistente > -1) {

      carrito[productoExistente].amountInCart++;


      setCarrito([...carrito]);

    } else {

      producto.amountInCart = 1;
      setCarrito([...carrito, producto]);
    }

  }

  const totalCarrito = () => {
    let total = 0;
    carrito.map((prod) => {
      total = total + prod.amountInCart * prod.price.finalPrice;
    })
    return total.toFixed(2);
  }

  const vaciarCarrito = () => {
    setCarrito([]);
  }

  const cantidadCarrito = () => {
    let acumulador = 0;
    console.log(carrito);
    carrito.map((prod) => {
      acumulador = acumulador + prod.amountInCart;
    })
    return acumulador;
  }

  const aumentar = (producto) => {

    let carritoNuevo = carrito.map((prod) => {
      if (prod.id === producto.id) {
        prod.amountInCart++;
      }
      return (prod)
    })
    setCarrito(carritoNuevo);

  }

  const disminuir = (producto) => {

    let carritoNuevo = carrito.map((prod) => {
      if (prod.id === producto.id) {
        prod.amountInCart > 1 && prod.amountInCart--;
      }
      return (prod)
    })


    setCarrito(carritoNuevo);

  }

  const eliminar = (producto) => {

    let carritoNuevo = [...carrito]

    let index = carritoNuevo.findIndex((prod) => {
      return prod.id === producto.id
    })

    carritoNuevo.splice(index, 1)
    setCarrito(carritoNuevo);
  }

  useEffect(() => {
    localStorage.setItem("carrito", JSON.stringify(carrito))
  }, [carrito])


  const mostrar = () => {
    SetClaseListaCategoria("listaCategorias");
  }

  const noMostrar = () => {
    SetClaseListaCategoria("listaCategorias show");
  }








  return (
    <CartContext.Provider value={{ carrito, setCarrito, agregarAlCarrito, vaciarCarrito, cantidadCarrito, disminuir, aumentar, eliminar, totalCarrito, mostrar, noMostrar, llaveAdmin, llaveUsuario, llaveUser, setLlaveUser, registrarUsuario, claseListaCategoria }}>
      {children}
    </CartContext.Provider>
  )
}
