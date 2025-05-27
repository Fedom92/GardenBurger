import React, { useMemo, useState } from "react";
import { useReactTable, getCoreRowModel, getSortedRowModel, getPaginationRowModel, flexRender } from "@tanstack/react-table";

function quitarAcentos(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
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

const TablaGenerica = ({ data, columnas, camposBusqueda = [], campoSelector = null }) => {
    const columnasProcesadas = useMemo(() => generarColumnas(columnas), [columnas]);
    const [search, setSearch] = useState("");
    const [filtroSelector, setFiltroSelector] = useState("");
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 25,
    });

    const datosFiltrados = useMemo(() => {
        let resultado = data;

        if (camposBusqueda.length > 0 && search) {
            const normalizado = quitarAcentos(search);
            resultado = resultado.filter((item) =>
                camposBusqueda.some((campo) => {
                    const valor = quitarAcentos(String(item[campo] ?? ""));
                    return valor.includes(normalizado);
                })
            );
        }

        if (campoSelector && filtroSelector) {
            resultado = resultado.filter(
                (item) => String(item[campoSelector]) === filtroSelector
            );
        }

        return resultado;
    }, [data, search, camposBusqueda, campoSelector, filtroSelector]);

    const table = useReactTable({
        data: datosFiltrados,
        columns: columnasProcesadas,
        state: {
            pagination,
        },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    const opcionesSelector = useMemo(() => {
        if (!campoSelector) return [];
        const setUnico = new Set();
        data.forEach((item) => {
            if (item[campoSelector] != null) {
                setUnico.add(item[campoSelector]);
            }
        });
        return Array.from(setUnico);
    }, [data, campoSelector]);

    return (
        <div>
            <div className="col d-flex justify-content-between align-items-center">
                {campoSelector && (
                    <select
                        value={filtroSelector}
                        onChange={(e) => setFiltroSelector(e.target.value)}
                        className="form-control mb-3 w-auto"
                    >
                        <option value="">-- Filtrar por {campoSelector} --</option>
                        {opcionesSelector.map((opcion) => (
                            <option key={opcion} value={opcion}>
                                {opcion}
                            </option>
                        ))}
                    </select>
                )}

                {camposBusqueda.length > 0 && (
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar..."
                        className="form-control mb-3 w-auto"
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
                        <tr key={row.id}>
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