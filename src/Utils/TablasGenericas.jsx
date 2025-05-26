import React, { useMemo, useState } from "react";
import { useReactTable, getCoreRowModel, getSortedRowModel, getPaginationRowModel, flexRender } from "@tanstack/react-table";

function quitarAcentos(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export default function TablaGenerica({ data, columnas, camposBusqueda = [] }) {
    const [search, setSearch] = useState("");
    const [paginaActual, setPaginaActual] = useState(1);
    const filasPorPagina = 25;

    const datosFiltrados = useMemo(() => {
        if (!search) return data;
        const normalizado = quitarAcentos(search);

        return data.filter((item) =>
            camposBusqueda.some((campo) => {
                const valor = quitarAcentos(String(item[campo] ?? ""));
                return valor.includes(normalizado);
            })
        );
    }, [data, search, camposBusqueda]);

    const table = useReactTable({
        data: datosFiltrados,
        columns: columnas,
        state: {
            pagination: {
                pageIndex: paginaActual - 1,
                pageSize: filasPorPagina,
            },
            sorting: [],
        },
        onPaginationChange: (updater) => {
            const nuevaPagina =
                typeof updater === "function"
                    ? updater({ pageIndex: paginaActual - 1, pageSize: filasPorPagina })
                    : updater;
            setPaginaActual(nuevaPagina.pageIndex + 1);
        },
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    return (
        <div>
            <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="form-control mb-3"
            />

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
                                        asc: " 🔼",
                                        desc: " 🔽",
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

            <div className="table__footer-right">
                <button
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
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                >
                    Siguiente &gt;
                </button>
            </div>
        </div>
    );
}
