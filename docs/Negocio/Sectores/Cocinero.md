---
tags: [gardenburger, negocio, sectores]
aliases: [Cocina]
actualizado: 2026-10-22
---

# Cocinero

↑ [[Sectores]]

Prepara la comida. Trabaja en **Cocina** (`/gestion-cocina`), con dos solapas: **En espera**
(los pedidos cobrados, `CONFIRMADO`) y **Cocinando** (los que él mandó a cocinar, `COCINA`).

## Qué ve

- **Todo menos las bebidas**: las despacha la caja. Lo decide `getItemsCocina()`
  (`Utils/ruteoPedido.js`), que saca la categoría `BEBIDAS`. Se aplica en las tarjetas y en el
  detalle del pedido, **no** en el ticket impreso, que lleva todo porque es el del cliente.
- **Un pedido sin nada que cocinar no le llega** (08-10-2026): al cobrarse va directo al mostrador
  o al delivery. Lo decide la misma función, así lo que la cocina muestra y lo que recibe no se
  desalinean.
- Cada extra con su producto, en dos columnas (`agruparExtras`).
- El **contador de carnes** de lo seleccionado: `CANTIDAD_CARNES` (SIMPLE 1, DOBLE 2, TRIPLE 3, y
  el extra "CARNE EXTRA" 1).

## Qué hace

1. **"Empezar a cocinar"** con los pedidos que tildó en espera: pasan a `COCINA` con su nombre.
2. **"Cocinados TODOS"** marca terminados **todos** los suyos de una vez, y cada uno va al
   mostrador (`ATP`) o al delivery según su zona. **Es el único botón, a propósito**: cada
   cocinero ve solo los que él mandó a cocinar, y en la práctica salen juntos (dueño,
   14-09-2026).
3. **Imprime el ticket** del cliente. Por eso los pedidos que saltean la cocina se imprimen desde
   el *ATP*.

## Pedidos con horario especial

Llevan la hora en rojo. Si al mandar a cocinar falta más de `TIEMPO_MIN_PEDIDOESP` (30 min) para
alguno, se abre un aviso con la lista de los adelantados, **destildados**: los que no se marquen se
quedan en espera. El cálculo de los minutos usa la hora del servidor, no la de la PC.

## Lo que no se trata

Un pedido que queda en `COCINA` porque el cocinero que lo tomó se fue no tiene una salida especial
(decisión del dueño, auditoría 11-10-2026).
