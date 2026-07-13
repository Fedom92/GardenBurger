import React, { useMemo, useState } from "react";
import { useReactTable, getCoreRowModel, getSortedRowModel, getPaginationRowModel, flexRender } from "@tanstack/react-table";

export function quitarAcentos(str) {
    if (!str) return "";
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

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

const TablaGenerica = ({ data = [], columnas = [], sortBy, ordenDescendente, camposBusqueda = [], camposFiltros = [] , rowClassName = () => '' }) => {
    const columnasProcesadas = useMemo(() => generarColumnas(columnas), [columnas]);
    const [search, setSearch] = useState("");
    const [filtrosActivos, setFiltrosActivos] = useState({});

    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });
    const [sorting, setSorting] = useState(sortBy ? [{ id: sortBy, desc: ordenDescendente }] : []);

    const handleFiltroChange = (campo, valor) => {
        setFiltrosActivos(prev => ({ ...prev, [campo]: valor }));
    };

    const datosFiltrados = useMemo(() => {
        const busquedaNormalizada = search ? quitarAcentos(search) : "";
        const selectoresActivos = Object.entries(filtrosActivos).filter(([_, val]) => val !== "");

        return data.filter(item => {
            if (busquedaNormalizada && !camposBusqueda.some(campo =>
                quitarAcentos(String(item[campo] ?? "")).includes(busquedaNormalizada)
            )) {
                return false;
            }

            //Filtrado Múltiple (Debe satisfacer TODOS los filtros activos)
            return selectoresActivos.every(([campo, valorEsperado]) =>
                String(item[campo]) === valorEsperado
            );
        });
    }, [data, search, camposBusqueda, filtrosActivos]);

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
                data.map(item => item[campo])
                    .filter(val => val != null && String(val).trim() !== "")
            )].sort((a, b) => String(a).localeCompare(String(b)))
                .map(v => ({ valor: String(v), etiqueta: formatearEtiqueta(v) }));
            return acc;
        }, {}),
        [data, camposFiltros]);

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
                                <option value="">-- Filtrar por {campo.charAt(0).toUpperCase() + campo.slice(1)} --</option>
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
                    {table.getRowModel().rows.map((row) => (
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
                    ))}
                </tbody>
            </table>

            <div className="table__footer justify-content-end mt-4">
                <div className="table__footer-right">
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        &lt; Previo
                    </button>

                    {Array.from({ length: table.getPageCount() }, (_, i) => (
                        <span
                            key={i}
                            onClick={() => table.setPageIndex(i)}
                            className={
                                i === table.getState().pagination.pageIndex ? "active" : ""
                            }
                            style={{ margin: "0 4px", cursor: "pointer" }}
                        >
                            {i + 1}
                        </span>
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