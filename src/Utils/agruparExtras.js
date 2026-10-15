// Los EXTRA son líneas hermanas en el carrito, pero cada uno pertenece al producto
// que tiene arriba: así lo arma la Caja y así lo guarda la web. Esta es la única
// regla para agruparlos al mostrar (Caja, Cocina); el array que se guarda no cambia.
// Antes estaba escrita dos veces, en Caja.jsx y en VerPedidoModal.
//
// Devuelve [{ principal, extras: [] }]. Un extra suelto al principio del carrito no
// debería pasar, pero si pasa se muestra como línea propia en vez de desaparecer.
export const agruparExtras = (carrito = []) => {
    const grupos = [];
    let actual = null;

    carrito.forEach((item) => {
        if (item.categoria !== "EXTRA") {
            if (actual) grupos.push(actual);
            actual = { principal: item, extras: [] };
        } else if (actual) {
            actual.extras.push(item);
        } else {
            grupos.push({ principal: item, extras: [] });
        }
    });

    if (actual) grupos.push(actual);
    return grupos;
};
