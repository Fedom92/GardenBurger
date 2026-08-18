// La cocina prepara comida: las bebidas las despacha la caja. Se filtran acá y no en
// la query porque el carrito es un array dentro del documento del pedido.
export const getItemsCocina = (carrito = []) =>
    carrito.filter(item => item.categoria !== "BEBIDAS");
