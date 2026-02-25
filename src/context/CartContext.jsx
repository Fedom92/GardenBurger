import { createContext, useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebaseConfig/firebase";
import { CATEGORIAS_HAMBURGUESA } from "../Utils/Constantes";

export const CartContext = createContext();

// Inicializar carrito fuera del componente para evitar re-inicializaciones
const getCarritoInicial = () => {
  try {
    return JSON.parse(localStorage.getItem("carrito")) || [];
  } catch {
    return [];
  }
};

const getComboInicial = () => {
  try {
    return JSON.parse(localStorage.getItem("combo")) || 0;
  } catch {
    return 0;
  }
};

// Helper para limpiar nombre de hamburguesa
const limpiarNombreHamburguesa = (nombre) => {
  const regex = new RegExp(
    `\\s+(${CATEGORIAS_HAMBURGUESA.join("|")})$`,
    "i"
  );

  return nombre.replace(regex, "").trim();
};

export const CartProvider = ({ children }) => {
  const [carrito, setCarrito] = useState(getCarritoInicial);
  const [combo, setCombo] = useState(getComboInicial);
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);

  const [mensajeWSP, setMensajeWSP] = useState('');
  // Estados para modales y selecciones
  const [showModalVariante, setShowModalVariante] = useState(false);
  const [showModalExtras, setShowModalExtras] = useState(false);
  const [showModalExtrasGenericos, setShowModalExtrasGenericos] = useState(false);

  const [hamburguesaSeleccionada, setHamburguesaSeleccionada] = useState(null);
  const [variantesHamburguesa, setVariantesHamburguesa] = useState([]);
  const [varianteElegida, setVarianteElegida] = useState(null);
  const [extrasSeleccionados, setExtrasSeleccionados] = useState([]);
  const [extrasGenericosSeleccionados, setExtrasGenericosSeleccionados] = useState([]);
  const [hamburguesaEnProceso, setHamburguesaEnProceso] = useState(null);
  const [productoEnProceso, setProductoEnProceso] = useState(null);

  // Estados para datos del menú
  const [extrasHamburguesas, setExtrasHamburguesas] = useState([]);
  const [extrasGenericos, setExtrasGenericos] = useState([]);
  const [bebidasDisponibles, setBebidasDisponibles] = useState([]);

  const obtenerCategorias = useCallback(async () => {
    const categoriasRef = collection(db, "categorias");
    const categoriasSnapshot = await getDocs(categoriasRef);
    const categoriasDataOrdenada = categoriasSnapshot.docs
      .map(doc => ({
        ...doc.data(),
        id: doc.id
      }))
      .sort((a, b) => a.nroOrden - b.nroOrden);
    setCategorias(categoriasDataOrdenada);
    return categoriasDataOrdenada;
  })

  const obtenerProductos = useCallback(async () => {
    const productosRef = collection(db, "productos");
    const q = query(productosRef, where("visible", "==", true));
    const productosSnapshot = await getDocs(q);
    const productosData = productosSnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    }));
    setProductos(productosData);
    return productosData;
  })

  // ========== FUNCIONES BÁSICAS DEL CARRITO (DEFINIR PRIMERO) ==========
  const agregarAlCarrito = useCallback((producto) => {
    toast.success(
      <div onClick={() => { toast.dismiss() }}>
        Producto agregado!
      </div>, {
      position: "top-right",
      autoClose: 3000,
      className: 'compact-toast',
    });

    setCarrito(prevCarrito => {
      // Bebidas: suma cantidad
      if (producto.categoria === 'BEBIDAS') {
        const idxBebida = prevCarrito.findIndex(p => p.id === producto.id && p.categoria === 'BEBIDAS');
        if (idxBebida > -1) {
          const nuevoCarrito = [...prevCarrito];
          nuevoCarrito[idxBebida] = {
            ...nuevoCarrito[idxBebida],
            amountInCart: nuevoCarrito[idxBebida].amountInCart + 1
          };
          return nuevoCarrito;
        }
      }

      return [...prevCarrito, {
        ...producto,
        combo: combo,
        amountInCart: 1,
        subtotal: producto.precio
      }];
    });

  }, [combo]);


  const actualizarMensajeWSP = useCallback((nuevoMensaje) => {
    setMensajeWSP(nuevoMensaje);
  }, []);

  const aumentarCombo = useCallback(() => setCombo(prev => prev + 1), []);

  const disminuirCombo = useCallback(() => setCombo(prev => prev - 1), []);

  const esMismoProducto = (prod, producto) => {
    return prod.id === producto.id && prod.combo === producto.combo;
  };

  const aumentar = useCallback((productoParam) => {
    setCarrito(prevCarrito =>
      prevCarrito.map((prod) =>
        esMismoProducto(prod, productoParam)
          ? { ...prod, amountInCart: prod.amountInCart + 1 }
          : prod
      )
    );
  }, []);

  const disminuir = useCallback((productoParam) => {
    setCarrito(prevCarrito =>
      prevCarrito.map((prod) =>
        esMismoProducto(prod, productoParam) && prod.amountInCart > 1
          ? { ...prod, amountInCart: prod.amountInCart - 1 }
          : prod
      )
    );
  }, []);

  const eliminar = useCallback((productoParam) => {
    setCarrito(prevCarrito =>
      prevCarrito.filter(prod => !esMismoProducto(prod, productoParam))
    );
  }, []);

  const totalCarrito = useCallback(() => {
    return parseFloat(carrito.reduce((total, prod) => total + (prod.amountInCart * prod.precio), 0));
  }, [carrito]);

  const vaciarCarrito = useCallback(() => {
    setCarrito([]);
    setCombo(0);
  }, []);

  // ========== FUNCIONES AUXILIARES ==========

  // Función para obtener hamburguesas con variantes
  const obtenerHamburguesasConVariantes = useCallback((productos) => {
    const obtenerOrden = (desc) => {
      const index = CATEGORIAS_HAMBURGUESA.findIndex(tipo => desc.includes(tipo));

      return index === -1 ? 0 : index;
    };

    // Filtrar hamburguesas
    const hamburguesas = productos.filter(producto =>
      CATEGORIAS_HAMBURGUESA.includes(producto.categoria)
    );

    // Agrupar por nombre base
    const agrupadas = hamburguesas.reduce((acc, producto) => {
      const nombreBase = limpiarNombreHamburguesa(producto.descripcion);

      if (!acc[nombreBase]) {
        acc[nombreBase] = [];
      }

      acc[nombreBase].push(producto);

      return acc;
    }, {});

    // Transformar en array final
    return Object.entries(agrupadas).map(([nombreBase, variantes]) => {

      const variantesOrdenadas = variantes.sort(
        (a, b) =>
          obtenerOrden(a.descripcion) -
          obtenerOrden(b.descripcion)
      );

      const productoBase =
        variantesOrdenadas.find(
          v => obtenerOrden(v.descripcion) === 0) || variantesOrdenadas[0];

      return {
        ...productoBase,
        descripcion: nombreBase,
        nombreBase,
        variantes: variantesOrdenadas,
        descripcionOriginal: productoBase.descripcion
      };
    });
  }, []);

  // Función para verificar si una hamburguesa ya está en el carrito
  const hamburguesaYaEnCarrito = useCallback((hamburguesaId) => {
    return carrito.some(item => item.id === hamburguesaId);
  }, [carrito]);

  // Función para eliminar extras anteriores de hamburguesas
  const eliminarExtrasAnteriores = useCallback(() => {
    if (hamburguesaEnProceso) {
      const extrasAEliminar = carrito.filter(item =>
        item.categoria === "EXTRA" && item.tipoExtra === "HAMBURGUESA"
      );

      extrasAEliminar.forEach(extra => {
        eliminar(extra);
      });
    }
  }, [carrito, hamburguesaEnProceso, eliminar]);

  // Función para eliminar extras genéricos anteriores de un producto
  const eliminarExtrasGenericosAnteriores = useCallback(() => {
    if (productoEnProceso) {
      const extrasAEliminar = carrito.filter(item =>
        item.categoria === "EXTRA" &&
        item.tipoExtra === "GENERAL" &&
        item.productoAsociado === productoEnProceso.id
      );

      extrasAEliminar.forEach(extra => {
        eliminar(extra);
      });
    }
  }, [carrito, productoEnProceso, eliminar]);

  // ========== FUNCIONES DE SELECCIÓN ==========

  // Función para iniciar selección de hamburguesa
  const iniciarSeleccionHamburguesa = useCallback((hamburguesa) => {
    if (hamburguesa.variantes && hamburguesa.variantes.length > 0) {
      setHamburguesaSeleccionada(hamburguesa);
      setVariantesHamburguesa(hamburguesa.variantes);
      setVarianteElegida(hamburguesa.variantes[0]);
      setExtrasSeleccionados([]);
      setHamburguesaEnProceso(null);
      setProductoEnProceso(null);
      setShowModalVariante(true);
      document.body.style.overflow = 'hidden';
      return true;
    }
    return false;
  }, []);

  // Función para Pollo Crispy
  const iniciarSeleccionPolloExtrasHamburguesa = useCallback((producto) => {
    setVarianteElegida({ ...producto, observaciones: '' });
    setExtrasSeleccionados([]);
    setHamburguesaSeleccionada(null);
    setVariantesHamburguesa([]);
    setShowModalVariante(false);
    setShowModalExtras(true);
    document.body.style.overflow = 'hidden';
  }, []);

  // Función para iniciar selección de extras genéricos
  const iniciarSeleccionExtrasGenericos = useCallback((producto) => {
    setProductoEnProceso(producto);
    setExtrasGenericosSeleccionados([]);
    setShowModalExtrasGenericos(true);
    document.body.style.overflow = 'hidden';
  }, []);

  // Función para seleccionar variante
  const seleccionarVariante = useCallback((variante, observaciones) => {
    setVarianteElegida({ ...variante, observaciones });
    setShowModalVariante(false);
    setShowModalExtras(true);
    setExtrasSeleccionados([]);
  }, []);

  // Función para toggle de extra de hamburguesa
  const toggleExtra = useCallback((extra) => {
    setExtrasSeleccionados(prev => {
      const existe = prev.find(e => e.id === extra.id);
      if (existe) {
        return prev.filter(e => e.id !== extra.id);
      } else {
        return [...prev, extra];
      }
    });
  }, []);

  // Función para toggle de extra genérico
  const toggleExtraGenerico = useCallback((extra) => {
    setExtrasGenericosSeleccionados(prev => {
      const existe = prev.find(e => e.id === extra.id);
      if (existe) {
        return prev.filter(e => e.id !== extra.id);
      } else {
        // Asociar el extra al producto
        const extraConAsociacion = {
          ...extra,
          productoAsociado: productoEnProceso?.id
        };
        return [...prev, extraConAsociacion];
      }
    });
  }, [productoEnProceso]);

  // Función para volver al modal de variante
  const volverAVariante = useCallback(() => {
    setShowModalExtras(false);
    setShowModalVariante(true);
    setExtrasSeleccionados([]);
  }, []);

  // Función para finalizar hamburguesa
  const finalizarHamburguesa = useCallback(() => {
    if (!varianteElegida) return;

    // Si estaba editando una hamburguesa existente, eliminarla primero
    if (hamburguesaEnProceso && hamburguesaYaEnCarrito(hamburguesaEnProceso.id)) {
      eliminar(hamburguesaEnProceso);
    }

    // Eliminar extras anteriores si existían
    eliminarExtrasAnteriores();

    agregarAlCarrito(varianteElegida);
    extrasSeleccionados.forEach(extra => {
      agregarAlCarrito({
        ...extra,
        tipoExtra: "HAMBURGUESA"
      });
    });

    setShowModalExtras(false);

  }, [varianteElegida, hamburguesaEnProceso, hamburguesaYaEnCarrito, eliminar, eliminarExtrasAnteriores, extrasSeleccionados, agregarAlCarrito]);

  // Función para finalizar producto con extras genéricos
  const finalizarProductoConExtras = useCallback(() => {
    if (!productoEnProceso) return;

    // Si el producto ya está en el carrito, eliminarlo primero
    if (hamburguesaYaEnCarrito(productoEnProceso.id)) {
      eliminar(productoEnProceso);
    }

    // Eliminar extras genéricos anteriores
    eliminarExtrasGenericosAnteriores();

    //Agregar
    agregarAlCarrito(productoEnProceso);
    extrasGenericosSeleccionados.forEach(extra => {
      agregarAlCarrito({
        ...extra,
        tipoExtra: "GENERAL",
        productoAsociado: productoEnProceso.id
      });
    });

    // Cerrar
    setProductoEnProceso(null);
    setExtrasGenericosSeleccionados([]);
    setShowModalExtrasGenericos(false);
    //document.body.style.overflow = 'auto';
    // setExtrasGenericosSeleccionados([]);
    // setProductoEnProceso(null);

  }, [productoEnProceso, hamburguesaYaEnCarrito, eliminar, eliminarExtrasGenericosAnteriores, extrasGenericosSeleccionados, agregarAlCarrito]);

  // Función para agregar producto normal
  const agregarProductoNormal = useCallback((producto) => {
    // Pollo Crispy: usar extras de hamburguesa
    if (producto.categoria === 'POLLO CRISPY' && extrasHamburguesas.length > 0) {
      iniciarSeleccionPolloExtrasHamburguesa(producto);
      return;
    }
    // Otros productos: verificar si tiene extras genéricos
    if (extrasGenericos.length > 0) {
      iniciarSeleccionExtrasGenericos(producto);
    } else {
      agregarAlCarrito(producto);
    }
  }, [extrasGenericos, extrasHamburguesas, agregarAlCarrito, iniciarSeleccionExtrasGenericos, iniciarSeleccionPolloExtrasHamburguesa]);

  const cancelar = useCallback(() => {
    disminuirCombo();
    cerrarModales();
  }, []);

  // Función para cerrar todos los modales
  const cerrarModales = useCallback(() => {
    setShowModalVariante(false);
    setShowModalExtras(false);
    setShowModalExtrasGenericos(false);
    setHamburguesaSeleccionada(null);
    setVarianteElegida(null);
    setExtrasSeleccionados([]);
    setExtrasGenericosSeleccionados([]);
    setHamburguesaEnProceso(null);
    setProductoEnProceso(null);
    document.body.style.overflow = 'auto';
  }, []);

  // ========== FUNCIONES DE CARGA DE DATOS ==========

  // Cargar extras y bebidas
  const cargarExtrasYBebidas = useCallback(() => {
    try {
      const extrasSnapshot = productos.filter(prod => prod.categoria === 'EXTRA' && prod.tipoExtra === 'HAMBURGUESA' && prod.visible);
      setExtrasHamburguesas(extrasSnapshot);

      const extrasGenericosSnapshot = productos.filter(prod => prod.categoria === 'EXTRA' && prod.tipoExtra === 'GENERAL' && prod.visible);
      setExtrasGenericos(extrasGenericosSnapshot);

      const bebidasSnapshot = productos.filter(prod => prod.categoria === 'BEBIDAS' && prod.visible);
      setBebidasDisponibles(bebidasSnapshot);

    } catch (error) {
      console.error("Error cargando extras y bebidas:", error);
    }
  }, [productos]);

  // ========== EFECTOS ==========
  useEffect(() => {
    cargarExtrasYBebidas();
  }, [cargarExtrasYBebidas]);

  useEffect(() => {
    if (showModalVariante || showModalExtras || showModalExtrasGenericos) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showModalVariante, showModalExtras, showModalExtrasGenericos]);

  useEffect(() => {
    localStorage.setItem("carrito", JSON.stringify(carrito));
  }, [carrito]);

  useEffect(() => {
    localStorage.setItem("combo", JSON.stringify(combo));
  }, [combo]);

  // ========== MEMOIZACIÓN DEL CONTEXTO ==========

  const contextValue = useMemo(() => ({
    // Estado del carrito
    carrito,
    setCarrito,
    mensajeWSP,
    actualizarMensajeWSP,

    // Funciones básicas del carrito
    agregarAlCarrito,
    vaciarCarrito,
    disminuir,
    aumentar,
    aumentarCombo,
    disminuirCombo,
    eliminar,
    totalCarrito,
    obtenerCategorias,
    obtenerProductos,
    productos,
    setProductos,
    categorias,
    setCategorias,

    // Estados para modales
    showModalVariante,
    showModalExtras,
    showModalExtrasGenericos,
    hamburguesaSeleccionada,
    variantesHamburguesa,
    varianteElegida,
    extrasSeleccionados,
    extrasGenericosSeleccionados,
    hamburguesaEnProceso,
    productoEnProceso,
    extrasHamburguesas,
    extrasGenericos,
    bebidasDisponibles,

    // Setters para actualizar desde componentes
    setVarianteElegida,
    setExtrasSeleccionados,
    setExtrasGenericosSeleccionados,
    setShowModalVariante,
    setShowModalExtras,
    setShowModalExtrasGenericos,

    // Funciones de selección
    obtenerHamburguesasConVariantes,
    iniciarSeleccionHamburguesa,
    iniciarSeleccionExtrasGenericos,
    iniciarSeleccionPolloExtrasHamburguesa,
    seleccionarVariante,
    toggleExtra,
    toggleExtraGenerico,
    volverAVariante,
    finalizarHamburguesa,
    finalizarProductoConExtras,
    cerrarModales,
    cancelar,
    agregarProductoNormal,

    // Funciones auxiliares
    limpiarNombreHamburguesa,
    hamburguesaYaEnCarrito,

    // Función para cargar datos
    cargarExtrasYBebidas

  }), [
    carrito,
    agregarAlCarrito,
    vaciarCarrito,
    disminuir,
    aumentar,
    aumentarCombo,
    disminuirCombo,
    eliminar,
    totalCarrito,
    showModalVariante,
    showModalExtras,
    showModalExtrasGenericos,
    hamburguesaSeleccionada,
    variantesHamburguesa,
    varianteElegida,
    extrasSeleccionados,
    extrasGenericosSeleccionados,
    hamburguesaEnProceso,
    productoEnProceso,
    extrasHamburguesas,
    extrasGenericos,
    bebidasDisponibles,
    mensajeWSP,
    setVarianteElegida,
    setExtrasSeleccionados,
    setExtrasGenericosSeleccionados,
    setShowModalVariante,
    setShowModalExtras,
    setShowModalExtrasGenericos,
    obtenerHamburguesasConVariantes,
    iniciarSeleccionHamburguesa,
    iniciarSeleccionExtrasGenericos,
    iniciarSeleccionPolloExtrasHamburguesa,
    seleccionarVariante,
    toggleExtra,
    toggleExtraGenerico,
    volverAVariante,
    finalizarHamburguesa,
    finalizarProductoConExtras,
    cerrarModales,
    cancelar,
    agregarProductoNormal,
    limpiarNombreHamburguesa,
    hamburguesaYaEnCarrito,
    cargarExtrasYBebidas,
    actualizarMensajeWSP,
    obtenerCategorias,
    obtenerProductos,
    productos,
    setProductos,
    categorias,
    setCategorias
  ]);

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};