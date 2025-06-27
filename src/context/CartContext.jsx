import { createContext, useEffect, useState } from 'react'
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const CartContext = createContext();

let carritoInicial = JSON.parse(localStorage.getItem("carrito")) || [];


export const CartProvider = ({ children }) => {

  const [carrito, setCarrito] = useState(carritoInicial);


  const agregarAlCarrito = (producto) => {
    if (producto.categoria === 'SIMPLE' || producto.categoria === 'DOBLE' || producto.categoria === 'TRIPLE' || producto.categoria === 'CAJA PAPAS' || producto.categoria === 'POLLO CRISPY') {
      toast.success(
        <div onClick={() => { window.location.href = "#EXTRA"; toast.dismiss() }}>
          Producto agregado! Hacé click para agregarle algún extra!
        </div>,
        {
          position: "top-right",
          autoClose: 5000,
          className: 'compact-toast clickable-toast'
        }
      )
    } else {
            toast.success(        
        <div onClick={() => {toast.dismiss()}}>
          Producto agregado!
        </div>, {
        position: "top-right",
        autoClose: 3000,
        className: 'compact-toast',
      })
      
    }

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
      total = total + prod.amountInCart * prod.precio;
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

  const cantidadHambPapas = () => {
    let acumulador = 0;
    carrito.map((prod) => {
      if (prod.categoria === 'SIMPLE' || prod.categoria === 'DOBLE' || prod.categoria === 'TRIPLE' || prod.categoria === 'CAJA PAPAS' || prod.categoria === 'POLLO CRISPY')
        acumulador = acumulador + prod.amountInCart;
    })
    return acumulador;
  }

    const cantidadBebidas = () => {
    let acumulador = 0;
    carrito.map((prod) => {
      if (prod.categoria === 'BEBIDAS')
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



  return (
    <CartContext.Provider value={{ carrito, setCarrito, agregarAlCarrito, vaciarCarrito, cantidadCarrito, disminuir, aumentar, eliminar, totalCarrito, cantidadHambPapas,cantidadBebidas }}>
      {children}
    </CartContext.Provider>
  )
}
