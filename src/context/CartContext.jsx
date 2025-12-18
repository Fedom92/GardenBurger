import { createContext, useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const CartContext = createContext();

// Inicializar carrito fuera del componente para evitar re-inicializaciones
const getCarritoInicial = () => {
  try {
    return JSON.parse(localStorage.getItem("carrito")) || [];
  } catch {
    return [];
  }
};

export const CartProvider = ({ children }) => {

  const [carrito, setCarrito] = useState(getCarritoInicial);


  const agregarAlCarrito = useCallback((producto) => {
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
        <div onClick={() => { toast.dismiss() }}>
          Producto agregado!
        </div>, {
        position: "top-right",
        autoClose: 3000,
        className: 'compact-toast',
      })
    }

    setCarrito(prevCarrito => {
      const productoExistente = prevCarrito.findIndex((prod) => prod.id === producto.id);

      if (productoExistente > -1) {
        const nuevoCarrito = [...prevCarrito];
        nuevoCarrito[productoExistente] = {
          ...nuevoCarrito[productoExistente],
          amountInCart: nuevoCarrito[productoExistente].amountInCart + 1,
          subtotal: (nuevoCarrito[productoExistente].amountInCart + 1) * nuevoCarrito[productoExistente].precio
        };
        return nuevoCarrito;
      } else {
        return [...prevCarrito, {
          ...producto,
          amountInCart: 1,
          subtotal: producto.precio
        }];
      }
    });
  }, []);

  const totalCarrito = useCallback(() => {
    return parseFloat(carrito.reduce((total, prod) => total + (prod.amountInCart * prod.precio), 0).toFixed(2));
  }, [carrito]);

  const vaciarCarrito = useCallback(() => {
    setCarrito([]);
  }, []);

  const cantidadCarrito = useCallback(() => {
    return carrito.reduce((acumulador, prod) => acumulador + prod.amountInCart, 0);
  }, [carrito]);

  const cantidadHambPapas = useCallback(() => {
    const categoriasHambPapas = ['SIMPLE', 'DOBLE', 'TRIPLE', 'CAJA PAPAS', 'POLLO CRISPY'];
    return carrito
      .filter(prod => categoriasHambPapas.includes(prod.categoria))
      .reduce((acumulador, prod) => acumulador + prod.amountInCart, 0);
  }, [carrito]);

  const cantidadBebidas = useCallback(() => {
    return carrito
      .filter(prod => prod.categoria === 'BEBIDAS')
      .reduce((acumulador, prod) => acumulador + prod.amountInCart, 0);
  }, [carrito]);

  const aumentar = useCallback((producto) => {
    setCarrito(prevCarrito =>
      prevCarrito.map((prod) =>
        prod.id === producto.id
          ? { ...prod, amountInCart: prod.amountInCart + 1 }
          : prod
      )
    );
  }, []);

  const disminuir = useCallback((producto) => {
    setCarrito(prevCarrito =>
      prevCarrito.map((prod) =>
        prod.id === producto.id && prod.amountInCart > 1
          ? { ...prod, amountInCart: prod.amountInCart - 1 }
          : prod
      )
    );
  }, []);

  const eliminar = useCallback((producto) => {
    setCarrito(prevCarrito => prevCarrito.filter((prod) => prod.id !== producto.id));
  }, []);

  useEffect(() => {
    localStorage.setItem("carrito", JSON.stringify(carrito));
  }, [carrito]);

  // Memoizar el valor del contexto para evitar re-renderizados innecesarios
  const contextValue = useMemo(() => ({
    carrito,
    setCarrito,
    agregarAlCarrito,
    vaciarCarrito,
    cantidadCarrito,
    disminuir,
    aumentar,
    eliminar,
    totalCarrito,
    cantidadHambPapas,
    cantidadBebidas
  }), [carrito, agregarAlCarrito, vaciarCarrito, cantidadCarrito, disminuir, aumentar, eliminar, totalCarrito, cantidadHambPapas, cantidadBebidas]);

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  )
}
