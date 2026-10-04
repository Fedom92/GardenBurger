import { createContext, useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebaseConfig/firebase";
import { fetchMenuPublico } from "../Utils/menuPublico";
import { CATEGORIAS_HAMBURGUESA, CATEGORIAS_SOLO_CAJA } from "../Utils/Constantes";

export const CartContext = createContext();

// Inicializar carrito fuera del componente para evitar re-inicializaciones
const getCarritoInicial = () => {
  try {
    return JSON.parse(localStorage.getItem("carritoWeb")) || [];
  } catch {
    return [];
  }
};

// El último número de grupo usado (ver `grupo` en el provider). Las dos claves de
// localStorage cambiaron de nombre junto con el campo (04-10-2026; eran "carrito" y
// "combo"): un carrito guardado con la forma vieja no se carga.
const getGrupoInicial = () => {
  try {
    return JSON.parse(localStorage.getItem("carritoWebGrupo")) || 0;
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
  // Cada "Agregar al pedido" abre un grupo nuevo: el producto y sus extras salen con
  // el mismo número, y el par (id, grupo) identifica cada línea para aumentar,
  // disminuir y eliminar. No son los combos del arqueo (CATEGORIAS_COMBOS): hasta el
  // 04-10-2026 este campo se llamaba `combo` y se confundía. La Caja no lo usa.
  const [grupo, setGrupo] = useState(getGrupoInicial);
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);

  // Estados para modales y selecciones
  const [showModalVariante, setShowModalVariante] = useState(false);
  const [showModalExtras, setShowModalExtras] = useState(false);
  const [showModalExtrasGenericos, setShowModalExtrasGenericos] = useState(false);

  const [hamburguesaSeleccionada, setHamburguesaSeleccionada] = useState(null);
  const [variantesHamburguesa, setVariantesHamburguesa] = useState([]);
  const [varianteElegida, setVarianteElegida] = useState(null);
  const [extrasSeleccionados, setExtrasSeleccionados] = useState([]);
  const [extrasGenericosSeleccionados, setExtrasGenericosSeleccionados] = useState([]);
  const [productoEnProceso, setProductoEnProceso] = useState(null);

  // Estados para datos del menú
  const [extrasHamburguesas, setExtrasHamburguesas] = useState([]);
  const [extrasGenericos, setExtrasGenericos] = useState([]);
  const [bebidasDisponibles, setBebidasDisponibles] = useState([]);

  const obtenerCategorias = useCallback(async () => {
    // JSON estático publicado desde Productos: cero lecturas de Firestore
    try {
      const menu = await fetchMenuPublico();
      const categoriasDataOrdenada = [...menu.categorias]
        .sort((a, b) => a.nroOrden - b.nroOrden);
      setCategorias(categoriasDataOrdenada);
      return categoriasDataOrdenada;
    } catch (errorMenu) {
      console.warn("menu.json no disponible, fallback a Firestore:", errorMenu);
    }
    const categoriasRef = collection(db, "categorias");
    const categoriasSnapshot = await getDocs(categoriasRef);
    const categoriasDataOrdenada = categoriasSnapshot.docs
      .map(doc => ({
        ...doc.data(),
        id: doc.id
      }))
      .filter(c => !CATEGORIAS_SOLO_CAJA.includes(c.nombre))
      .sort((a, b) => a.nroOrden - b.nroOrden);
    setCategorias(categoriasDataOrdenada);
    return categoriasDataOrdenada;
  }, [])

  const obtenerProductos = useCallback(async () => {
    // JSON estático publicado desde Productos: cero lecturas de Firestore
    try {
      const menu = await fetchMenuPublico();
      setProductos(menu.productos);
      return menu.productos;
    } catch (errorMenu) {
      console.warn("menu.json no disponible, fallback a Firestore:", errorMenu);
    }
    const productosRef = collection(db, "productos");
    const q = query(productosRef, where("visible", "==", true));
    const productosSnapshot = await getDocs(q);
    const productosData = productosSnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    })).filter(p => !CATEGORIAS_SOLO_CAJA.includes(p.categoria));
    setProductos(productosData);
    return productosData;
  }, [])

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
            cantidad: nuevoCarrito[idxBebida].cantidad + 1
          };
          return nuevoCarrito;
        }
      }

      return [...prevCarrito, {
        ...producto,
        grupo,
        cantidad: 1,
        subtotal: producto.precio
      }];
    });

  }, [grupo]);


  const aumentarGrupo = useCallback(() => setGrupo(prev => prev + 1), []);

  const disminuirGrupo = useCallback(() => setGrupo(prev => prev - 1), []);

  const esMismoProducto = (prod, producto) => {
    return prod.id === producto.id && prod.grupo === producto.grupo;
  };

  const aumentar = useCallback((productoParam) => {
    setCarrito(prevCarrito =>
      prevCarrito.map((prod) =>
        esMismoProducto(prod, productoParam)
          ? { ...prod, cantidad: prod.cantidad + 1, subtotal: (prod.cantidad + 1) * prod.precio }
          : prod
      )
    );
  }, []);

  const disminuir = useCallback((productoParam) => {
    setCarrito(prevCarrito =>
      prevCarrito.map((prod) =>
        esMismoProducto(prod, productoParam) && prod.cantidad > 1
          ? { ...prod, cantidad: prod.cantidad - 1, subtotal: (prod.cantidad - 1) * prod.precio }
          : prod
      )
    );
  }, []);

  // Una línea se elimina junto con sus extras: los que tiene inmediatamente debajo.
  // Es la misma regla con la que la Caja y Cocina los asocian (por posición): si
  // quedaran sueltos, se le pegarían al producto de arriba. Antes se borraba solo la
  // línea, y el bacon de una hamburguesa eliminada terminaba en otra. No alcanza con
  // mirar el grupo: una bebida, o un producto que entra sin modal, puede llevar el
  // mismo número que la hamburguesa de arriba.
  const eliminar = useCallback((productoParam) => {
    setCarrito(prevCarrito => {
      const desde = prevCarrito.findIndex(prod => esMismoProducto(prod, productoParam));
      if (desde === -1) return prevCarrito;

      let hasta = desde + 1;
      if (prevCarrito[desde].categoria !== "EXTRA") {
        while (hasta < prevCarrito.length && prevCarrito[hasta].categoria === "EXTRA") hasta++;
      }
      return [...prevCarrito.slice(0, desde), ...prevCarrito.slice(hasta)];
    });
  }, []);

  const totalCarrito = useCallback(() => {
    return parseFloat(carrito.reduce((total, prod) => total + (prod.cantidad * prod.precio), 0));
  }, [carrito]);

  const vaciarCarrito = useCallback(() => {
    setCarrito([]);
    setGrupo(0);
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

  // ========== FUNCIONES DE SELECCIÓN ==========

  // Función para iniciar selección de hamburguesa
  const iniciarSeleccionHamburguesa = useCallback((hamburguesa) => {
    if (hamburguesa.variantes && hamburguesa.variantes.length > 0) {
      setHamburguesaSeleccionada(hamburguesa);
      setVariantesHamburguesa(hamburguesa.variantes);
      setVarianteElegida(hamburguesa.variantes[0]);
      setExtrasSeleccionados([]);
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

    agregarAlCarrito(varianteElegida);
    extrasSeleccionados.forEach(extra => {
      agregarAlCarrito({
        ...extra,
        tipoExtra: "HAMBURGUESA"
      });
    });

    setShowModalExtras(false);

  }, [varianteElegida, extrasSeleccionados, agregarAlCarrito]);

  // Función para finalizar producto con extras genéricos.
  // Cada producto que se agrega es una línea nueva con sus propios extras, igual que
  // una hamburguesa. Antes intentaba "reemplazar" al mismo producto si ya estaba: la
  // línea vieja quedaba (la comparación nunca coincidía), pero se le borraban sus
  // extras, y una segunda Caja Papas le sacaba el cheddar a la primera.
  const finalizarProductoConExtras = useCallback(() => {
    if (!productoEnProceso) return;

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

  }, [productoEnProceso, extrasGenericosSeleccionados, agregarAlCarrito]);

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
    disminuirGrupo();
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
    localStorage.setItem("carritoWeb", JSON.stringify(carrito));
  }, [carrito]);

  useEffect(() => {
    localStorage.setItem("carritoWebGrupo", JSON.stringify(grupo));
  }, [grupo]);

  // ========== MEMOIZACIÓN DEL CONTEXTO ==========

  const contextValue = useMemo(() => ({
    // Estado del carrito
    carrito,
    setCarrito,

    // Funciones básicas del carrito
    agregarAlCarrito,
    vaciarCarrito,
    disminuir,
    aumentar,
    aumentarGrupo,
    disminuirGrupo,
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

    // Función para cargar datos
    cargarExtrasYBebidas

  }), [
    carrito,
    agregarAlCarrito,
    vaciarCarrito,
    disminuir,
    aumentar,
    aumentarGrupo,
    disminuirGrupo,
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
    productoEnProceso,
    extrasHamburguesas,
    extrasGenericos,
    bebidasDisponibles,
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
    cargarExtrasYBebidas,
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