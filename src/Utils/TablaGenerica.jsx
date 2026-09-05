import React, { useEffect, useMemo, useState } from "react";
import { useReactTable, getCoreRowModel, getSortedRowModel, getPaginationRowModel, flexRender } from "@tanstack/react-table";

export function quitarAcentos(str) {
    // String() antes de normalizar: si llega un número, (123).normalize no existe.
    return String(str ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// Los campos de búsqueda y filtro pueden venir como rutas ("envio.zona_envio"),
// igual que los accessorKey de react-table. Sin esto se busca una clave que se
// llame así, con el punto adentro, y nunca coincide con nada.
const leerCampo = (obj, ruta) =>
    ruta.split(".").reduce((valor, clave) => valor?.[clave], obj);

// "envio.zona_envio" -> "Zona envio". Con la ruta cruda el select mostraba
// "Envio.zona_envio".
const etiquetaCampo = (ruta) => {
    const ultimo = ruta.split(".").pop().replace(/_/g, " ");
    return ultimo.charAt(0).toUpperCase() + ultimo.slice(1);
};

function formatearEtiqueta(valor) {
    if (typeof valor === "boolean") return valor ? "Sí" : "No";
    return String(valor);
}

function generarColumnas(columnas) {
    return columnas.flatMap((col) => {
        if (col.columnasBasicas && Array.isArray(col.columnasBasicas)) {
            return col.columnasBasicas.map((campo) => ({
                accessorKey: campo,
                header: campo.charAt(0).toUpperCase() + campo.slice(1),
            }));
        }
        return col;
    });
}

// Páginas a dibujar: hasta MAX_PAGINAS van todas; con más, primera + una ventana
// alrededor de la actual + última, con null donde va el "…". Sin esto la tabla
// de clientes, que crece sin límite, dibujaba cientos de <span>.
const MAX_PAGINAS = 7;
const VENTANA = 2;

function calcularPaginas(total, actual) {
    if (total <= MAX_PAGINAS) return [...Array(total).keys()];

    const paginas = new Set([0, total - 1]);
    for (let i = actual - VENTANA; i <= actual + VENTANA; i++) {
        if (i > 0 && i < total - 1) paginas.add(i);
    }

    const ordenadas = [...paginas].sort((a, b) => a - b);
    return ordenadas.flatMap((pagina, i) =>
        i > 0 && pagina - ordenadas[i - 1] > 1 ? [null, pagina] : [pagina]
    );
}

const SIN_CLASE = () => '';

const TablaGenerica = ({ data = [], columnas = [], sortBy, ordenDescendente, camposBusqueda = [], camposFiltros = [], rowClassName = SIN_CLASE }) => {
    const columnasProcesadas = useMemo(() => generarColumnas(columnas), [columnas]);
    const [search, setSearch] = useState("");
    const [filtrosActivos, setFiltrosActivos] = useState({});

    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });
    const [sorting, setSorting] = useState(sortBy ? [{ id: sortBy, desc: ordenDescendente }] : []);

    // Las pantallas pasan estos arrays como literales inline, así que su
    // identidad cambia en cada render y los useMemo de abajo no memoizaban nada.
    // La clave sí es estable mientras la lista de campos sea la misma.
    const busquedaKey = camposBusqueda.join("|");
    const filtrosKey = camposFiltros.join("|");

    const handleFiltroChange = (campo, valor) => {
        setFiltrosActivos(prev => ({ ...prev, [campo]: valor }));
    };

    // Al filtrar hay que volver al principio: con autoResetPageIndex en false,
    // buscar desde la página 3 dejaba la tabla en blanco sin explicación. Va
    // atado a la búsqueda y los filtros, NO a `data`: si dependiera de los datos,
    // cada actualización del listener de ATP o Delivery sacaría al usuario de la
    // página donde está.
    useEffect(() => {
        setPagination((p) => (p.pageIndex === 0 ? p : { ...p, pageIndex: 0 }));
    }, [search, filtrosActivos]);

    const datosFiltrados = useMemo(() => {
        const busquedaNormalizada = search ? quitarAcentos(search) : "";
        const selectoresActivos = Object.entries(filtrosActivos).filter(([_, val]) => val !== "");

        return data.filter(item => {
            if (busquedaNormalizada && !camposBusqueda.some(campo =>
                quitarAcentos(leerCampo(item, campo)).includes(busquedaNormalizada)
            )) {
                return false;
            }

            //Filtrado Múltiple (Debe satisfacer TODOS los filtros activos)
            return selectoresActivos.every(([campo, valorEsperado]) =>
                String(leerCampo(item, campo)) === valorEsperado
            );
        });
        // busquedaKey representa a camposBusqueda; la regla no puede saberlo.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, search, busquedaKey, filtrosActivos]);

    const table = useReactTable({
        data: datosFiltrados,
        columns: columnasProcesadas,
        state: {
            pagination,
            sorting,
        },
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        autoResetPageIndex: false,
    });

    // Agrupa y extrae opciones únicas de la data en un solo recorrido de la matriz utilizando reduce
    const opcionesPorSelector = useMemo(() =>
        camposFiltros.reduce((acc, campo) => {
            acc[campo] = [...new Set(
                data.map(item => leerCampo(item, campo))
                    .filter(val => val != null && String(val).trim() !== "")
            )].sort((a, b) => String(a).localeCompare(String(b)))
                .map(v => ({ valor: String(v), etiqueta: formatearEtiqueta(v) }));
            return acc;
        }, {}),
        // Ídem: filtrosKey representa a camposFiltros.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [data, filtrosKey]);

    const filas = table.getRowModel().rows;
    const paginas = calcularPaginas(table.getPageCount(), pagination.pageIndex);

    return (
        <div>
            <div className="col d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                {/* Contenedor de selects múltiples */}
                {camposFiltros.length > 0 && (
                    <div className="d-flex gap-2 flex-wrap">
                        {camposFiltros.map(campo => (
                            <select
                                key={campo}
                                value={filtrosActivos[campo] || ""}
                                onChange={(e) => handleFiltroChange(campo, e.target.value)}
                                className="form-control w-auto p-2"
                            >
                                <option value="">-- Filtrar por {etiquetaCampo(campo)} --</option>
                                {opcionesPorSelector[campo]?.map((opcion) => (
                                    <option key={opcion.valor} value={opcion.valor}>
                                        {opcion.etiqueta}
                                    </option>
                                ))}
                            </select>
                        ))}
                    </div>
                )}

                {/* Buscador general por texto */}
                {camposBusqueda.length > 0 && (
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar..."
                        className="form-control w-auto p-2"
                    />
                )}
            </div>

            {/* Con muchas columnas en pantalla angosta la tabla desbordaba la página. */}
            <div style={{ overflowX: "auto" }}>
                <table className="table__body">
                    <thead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        onClick={
                                            header.column.getCanSort()
                                                ? header.column.getToggleSortingHandler()
                                                : undefined
                                        }
                                        style={{
                                            cursor: header.column.getCanSort() ? "pointer" : "default",
                                        }}
                                    >
                                        {flexRender(
                                            header.column.columnDef.header,
                                            header.getContext()
                                        )}
                                        {{
                                            asc: " ▴",
                                            desc: " ▾",
                                        }[header.column.getIsSorted()] ?? null}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {filas.length === 0 ? (
                            <tr>
                                <td colSpan={columnasProcesadas.length || 1} className="text-center text-body-secondary py-4">
                                    No hay resultados
                                </td>
                            </tr>
                        ) : (
                            filas.map((row) => (
                                <tr
                                    className={rowClassName(row.original)}
                                    key={row.id}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <td key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="table__footer justify-content-end mt-4">
                <div className="table__footer-right">
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        &lt; Previo
                    </button>

                    {paginas.map((pagina, i) => (
                        pagina === null ? (
                            <span key={`hueco-${i}`} style={{ margin: "0 4px" }}>…</span>
                        ) : (
                            <span
                                key={pagina}
                                onClick={() => table.setPageIndex(pagina)}
                                className={pagina === pagination.pageIndex ? "active" : ""}
                                style={{ margin: "0 4px", cursor: "pointer" }}
                            >
                                {pagina + 1}
                            </span>
                        )
                    ))}

                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        Siguiente &gt;
                    </button>
                </div>
            </div>
        </div>
    );
}

export default TablaGenerica;
