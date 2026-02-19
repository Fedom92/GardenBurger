import { createContext, useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebaseConfig/firebase";

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
  return nombre
    .replace(/\s+SIMPLE$/i, '')
    .replace(/\s+DOBLE$/i, '')
    .replace(/\s+TRIPLE$/i, '')
    .trim();
};

export const CartProvider = ({ children }) => {
  const [carrito, setCarrito] = useState(getCarritoInicial);
  const [combo, setCombo] = useState(getComboInicial);

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
  const [categoriasHamburguesas] = useState(["SIMPLE", "DOBLE", "TRIPLE"]);

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
      //const productoExistente = prevCarrito.findIndex((prod) => prod.id === producto.id);

      // if (productoExistente > -1) {

      //   const nuevoCarrito = [...prevCarrito];
      //   nuevoCarrito[productoExistente] = {
      //     ...nuevoCarrito[productoExistente],
      //     amountInCart: nuevoCarrito[productoExistente].amountInCart + 1,
      //     subtotal: (nuevoCarrito[productoExistente].amountInCart + 1) * nuevoCarrito[productoExistente].precio
      //   };
      //   return nuevoCarrito;
      // } else {
      //  if (carrito) {
      //   return [...prevCarrito, {
      //     ...producto,
      //     combo:prevCarrito.combo+1,
      //     amountInCart: 1,
      //     subtotal: producto.precio
      //   }];

      //  } else {
   
        return [...prevCarrito, {
          ...producto,
          combo:combo,
          amountInCart: 1,
          subtotal: producto.precio
        }];
      //}
    });
  }, [combo]);


    const actualizarMensajeWSP = useCallback((nuevoMensaje) => {
      setMensajeWSP(nuevoMensaje);
  }, []);
  
  const aumentarCombo = useCallback(() => {
    setCombo(prevCombo => {
    const nuevoCombo = prevCombo + 1;
    console.log("Nuevo combo (dentro del setState):", nuevoCombo); // ✅ 1, 2, 3...
    return nuevoCombo;
  });
  }, []);

  const disminuirCombo = useCallback(()=>{
    setCombo(prevCombo => {
    const nuevoCombo = prevCombo - 1;
    console.log("Nuevo combo (dentro del setState):", nuevoCombo); // ✅ 1, 2, 3...
    return nuevoCombo;
  });
  }, []);

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
    setCarrito(prevCarrito => prevCarrito.filter((prod) => !(prod.id === producto.id && prod.combo === producto.combo)));
  }, []);

  const totalCarrito = useCallback(() => {
    return parseFloat(carrito.reduce((total, prod) => total + (prod.amountInCart * prod.precio), 0).toFixed(2));
  }, [carrito]);

  const vaciarCarrito = useCallback(() => {
    setCarrito([]);
    setCombo(0);
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

  // ========== FUNCIONES AUXILIARES ==========

  // Función para obtener hamburguesas con variantes
  const obtenerHamburguesasConVariantes = useCallback((productos) => {
    const hamburguesas = productos.filter(producto => 
      categoriasHamburguesas.includes(producto.categoria)
    );
    
    const hamburguesasMap = new Map();
    
    hamburguesas.forEach(producto => {
      const nombreBase = limpiarNombreHamburguesa(producto.descripcion);
      
      if (!hamburguesasMap.has(nombreBase)) {
        hamburguesasMap.set(nombreBase, {
          variantes: []
        });
      }
      
      hamburguesasMap.get(nombreBase).variantes.push(producto);
    });
    
    const hamburguesasUnicas = [];
    
    hamburguesasMap.forEach((grupo, nombreBase) => {
      const variantesOrdenadas = grupo.variantes.sort((a, b) => {
        const orden = { "SIMPLE": 1, "DOBLE": 2, "TRIPLE": 3 };
        const tipoA = a.descripcion.toUpperCase().includes("DOBLE") ? "DOBLE" : 
                     a.descripcion.toUpperCase().includes("TRIPLE") ? "TRIPLE" : "SIMPLE";
        const tipoB = b.descripcion.toUpperCase().includes("DOBLE") ? "DOBLE" : 
                     b.descripcion.toUpperCase().includes("TRIPLE") ? "TRIPLE" : "SIMPLE";
        return orden[tipoA] - orden[tipoB];
      });
      
      const productoParaMostrar = variantesOrdenadas.find(v => 
        v.descripcion.toUpperCase().includes("SIMPLE")
      ) || variantesOrdenadas[0];
      
      hamburguesasUnicas.push({
        ...productoParaMostrar,
        descripcion: nombreBase,
        nombreBase: nombreBase,
        variantes: variantesOrdenadas,
        descripcionOriginal: productoParaMostrar.descripcion
      });
    });
    
    return hamburguesasUnicas;
  }, [categoriasHamburguesas]);

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

  // Función para iniciar selección de extras genéricos
  const iniciarSeleccionExtrasGenericos = useCallback((producto) => {
    setProductoEnProceso(producto);
    setExtrasGenericosSeleccionados([]);
    setShowModalExtrasGenericos(true);
    document.body.style.overflow = 'hidden';
  }, []);

  // Función para seleccionar variante
  const seleccionarVariante = useCallback((variante) => {
    setVarianteElegida(variante);
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
    
  }, [productoEnProceso, hamburguesaYaEnCarrito, eliminar, eliminarExtrasGenericosAnteriores,extrasGenericosSeleccionados,agregarAlCarrito]);

  // Función para agregar producto normal
  const agregarProductoNormal = useCallback((producto) => {
    // Verificar si tiene extras genéricos
    if (extrasGenericos.length > 0) {
      iniciarSeleccionExtrasGenericos(producto);
    } else {
      agregarAlCarrito(producto);
    }
  }, [extrasGenericos, agregarAlCarrito, iniciarSeleccionExtrasGenericos]);

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
  const cargarExtrasYBebidas = useCallback(async () => {
    try {
      const productosRef = collection(db, "productos");
      
      // Obtener extras para hamburguesas
      const extrasQuery = query(
        productosRef, 
        where("categoria", "==", "EXTRA"),
        where("tipoExtra", "==", "HAMBURGUESA"),
        where("visible", "==", true)
      );
      const extrasSnapshot = await getDocs(extrasQuery);
      const extrasData = extrasSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
      
      setExtrasHamburguesas(extrasData);
      
      // Obtener extras genéricos
      const extrasGenericosQuery = query(
        productosRef, 
        where("categoria", "==", "EXTRA"),
        where("tipoExtra", "==", "GENERAL"),
        where("visible", "==", true)
      );
      const extrasGenericosSnapshot = await getDocs(extrasGenericosQuery);
      const extrasGenericosData = extrasGenericosSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
      
      setExtrasGenericos(extrasGenericosData);
      
      // Obtener bebidas
      const bebidasQuery = query(
        productosRef, 
        where("categoria", "==", "BEBIDAS"),
        where("visible", "==", true)
      );
      const bebidasSnapshot = await getDocs(bebidasQuery);
      const bebidasData = bebidasSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
      
      setBebidasDisponibles(bebidasData);
    } catch (error) {
      console.error("Error cargando extras y bebidas:", error);
    }
  }, []);

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
    cantidadCarrito,
    disminuir,
    aumentar,
    aumentarCombo,
    disminuirCombo,
    eliminar,
    totalCarrito,
    cantidadHambPapas,
    cantidadBebidas,
    
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
    categoriasHamburguesas,
    
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
    cantidadCarrito,
    disminuir,
    aumentar,
    aumentarCombo,
    disminuirCombo,
    eliminar,
    totalCarrito,
    cantidadHambPapas,
    cantidadBebidas,
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
    categoriasHamburguesas,
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
    actualizarMensajeWSP
  ]);

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};