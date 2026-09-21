"use client";

import React, { useMemo, useState } from "react";
import { Table, Pagination, Form, Row, Col, Button, Dropdown } from "react-bootstrap";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  createColumnHelper,
  HeaderGroup,
  Header,
  Row as TableRow,
  Cell,
  flexRender,
} from "@tanstack/react-table";

function getTextContent(node: React.ReactNode): string {
  if (node === null || node === undefined) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(getTextContent).join(" ");
  if (React.isValidElement(node) && node.props) {
    return getTextContent(
      (node.props as { children?: React.ReactNode }).children,
    );
  }
  return "";
}

interface ParsedTableData {
  headers: React.ReactNode[];
  rows: Record<string, React.ReactNode>[];
}

function parseChildren(children: React.ReactNode): ParsedTableData {
  const headers: React.ReactNode[] = [];
  const rows: Record<string, React.ReactNode>[] = [];

  const childArray = React.Children.toArray(children);

  const extractElements = (
    elementList: React.ReactNode[],
    targetType: string,
  ): React.ReactElement<{ children?: React.ReactNode }>[] => {
    const result: React.ReactElement<{ children?: React.ReactNode }>[] = [];
    const traverse = (node: React.ReactNode) => {
      React.Children.forEach(node, (child) => {
        if (React.isValidElement<{ children?: React.ReactNode }>(child)) {
          const typeName =
            typeof child.type === "string"
              ? child.type
              : (child.type as { name?: string }).name;
          if (
            typeName === targetType ||
            (typeof child.type === "string" &&
              child.type.toLowerCase() === targetType.toLowerCase())
          ) {
            result.push(child);
          } else if (child.props && child.props.children) {
            traverse(child.props.children);
          }
        }
      });
    };
    traverse(elementList);
    return result;
  };

  const theadElements = extractElements(childArray, "thead");
  if (theadElements.length > 0) {
    const thElements = extractElements(theadElements, "th");
    thElements.forEach((th) => {
      headers.push(th.props.children);
    });
  }

  const tbodyElements = extractElements(childArray, "tbody");
  const trElements = extractElements(
    tbodyElements.length > 0 ? tbodyElements : childArray,
    "tr",
  );

  trElements.forEach((tr) => {
    const tdElements = extractElements([tr], "td");
    if (tdElements.length > 0) {
      const rowObj: Record<string, React.ReactNode> = {};
      tdElements.forEach((td, colIdx) => {
        const colKey = `col_${colIdx}`;
        rowObj[colKey] = td.props.children;
        if (colIdx >= headers.length) {
          headers.push(`Column ${colIdx + 1}`);
        }
      });
      rows.push(rowObj);
    }
  });

  return { headers, rows };
}

interface TableI18n {
  searchPlaceholder: string;
  noMatchingRecords: string;
  exportCsv: string;
  toggleColumns: string;
  pageText: (current: number, total: number, rows: number) => string;
}

const TABLE_LOCALES: Record<string, TableI18n> = {
  en: {
    searchPlaceholder: "Search...",
    noMatchingRecords: "No matching records found",
    exportCsv: "Export CSV",
    toggleColumns: "Columns",
    pageText: (current, total, rows) => `Page ${current} of ${total} (${rows} total rows)`,
  },
  es: {
    searchPlaceholder: "Buscar...",
    noMatchingRecords: "No se encontraron registros coincidentes",
    exportCsv: "Exportar CSV",
    toggleColumns: "Columnas",
    pageText: (current, total, rows) => `Página ${current} de ${total} (${rows} filas en total)`,
  },
  fr: {
    searchPlaceholder: "Rechercher...",
    noMatchingRecords: "Aucun enregistrement correspondant trouvé",
    exportCsv: "Exporter CSV",
    toggleColumns: "Colonnes",
    pageText: (current, total, rows) => `Page ${current} sur ${total} (${rows} lignes au total)`,
  },
  de: {
    searchPlaceholder: "Suchen...",
    noMatchingRecords: "Keine übereinstimmenden Datensätze gefunden",
    exportCsv: "CSV exportieren",
    toggleColumns: "Spalten",
    pageText: (current, total, rows) => `Seite ${current} von ${total} (Gesamt: ${rows} Zeilen)`,
  },
  it: {
    searchPlaceholder: "Cerca...",
    noMatchingRecords: "Nessun elemento corrispondente trovato",
    exportCsv: "Esporta CSV",
    toggleColumns: "Colonne",
    pageText: (current, total, rows) => `Pagina ${current} di ${total} (${rows} righe totali)`,
  },
  nl: {
    searchPlaceholder: "Zoeken...",
    noMatchingRecords: "Geen overeenkomende resultaten gevonden",
    exportCsv: "Exporteren naar CSV",
    toggleColumns: "Kolommen",
    pageText: (current, total, rows) => `Pagina ${current} van ${total} (${rows} rijen in totaal)`,
  },
  ja: {
    searchPlaceholder: "検索...",
    noMatchingRecords: "一致するレコードが見つかりません",
    exportCsv: "CSV エクスポート",
    toggleColumns: "列",
    pageText: (current, total, rows) => `${total} ページ中 ${current} ページ目 (全 ${rows} 行)`,
  },
  zh: {
    searchPlaceholder: "搜索...",
    noMatchingRecords: "未找到匹配的记录",
    exportCsv: "导出 CSV",
    toggleColumns: "列显示",
    pageText: (current, total, rows) => `第 ${current} 页，共 ${total} 页（共 ${rows} 条记录）`,
  },
  pl: {
    searchPlaceholder: "Szukaj...",
    noMatchingRecords: "Brak pasujących rekordów",
    exportCsv: "Eksportuj CSV",
    toggleColumns: "Kolumny",
    pageText: (current, total, rows) => `Strona ${current} z ${total} (łącznie ${rows} wierszy)`,
  },
  pt: {
    searchPlaceholder: "Pesquisar...",
    noMatchingRecords: "Nenhum registro correspondente encontrado",
    exportCsv: "Exportar CSV",
    toggleColumns: "Colunas",
    pageText: (current, total, rows) => `Página ${current} de ${total} (${rows} linhas no total)`,
  },
  ru: {
    searchPlaceholder: "Поиск...",
    noMatchingRecords: "Совпадающих записей не найдено",
    exportCsv: "Экспорт в CSV",
    toggleColumns: "Колонки",
    pageText: (current, total, rows) => `Страница ${current} из ${total} (всего строк: ${rows})`,
  },
  fi: {
    searchPlaceholder: "Hae...",
    noMatchingRecords: "Vastaavia tietueita ei löytynyt",
    exportCsv: "Vie CSV",
    toggleColumns: "Sarakkeet",
    pageText: (current, total, rows) => `Sivu ${current} / ${total} (yhteensä ${rows} riviä)`,
  },
  sv: {
    searchPlaceholder: "Sök...",
    noMatchingRecords: "Inga matchande poster hittades",
    exportCsv: "Exportera CSV",
    toggleColumns: "Kolumner",
    pageText: (current, total, rows) => `Sida ${current} av ${total} (totalt ${rows} rader)`,
  },
};

export default function InteractiveTable({
  searchable = false,
  sortable = false,
  paginated = false,
  pageSize = 10,
  exportable = false,
  columnToggle = false,
  stickyHeader = false,
  lang,
  "data-locale": dataLocale,
  children,
  className = "",
  ...tableProps
}: {
  searchable?: boolean;
  sortable?: boolean;
  paginated?: boolean;
  pageSize?: number;
  exportable?: boolean;
  columnToggle?: boolean;
  stickyHeader?: boolean;
  lang?: string;
  "data-locale"?: string;
  children?: React.ReactNode;
  className?: string;
  [key: string]: unknown;
}) {
  const [globalFilter, setGlobalFilter] = useState("");

  const activeLang = (
    (typeof lang === "string" ? lang : "") ||
    (typeof dataLocale === "string" ? dataLocale : "") ||
    "en"
  )
    .toLowerCase()
    .split("-")[0];

  const labels = TABLE_LOCALES[activeLang] || TABLE_LOCALES.en;

  const { headers, rows } = useMemo(
    () => parseChildren(children),
    [children],
  );

  const columnHelper = createColumnHelper<Record<string, React.ReactNode>>();

  const columns = useMemo(() => {
    return headers.map((headerNode, colIdx) => {
      const colKey = `col_${colIdx}`;
      return columnHelper.accessor((row) => row[colKey], {
        id: colKey,
        header: () => headerNode,
        cell: (info) => info.getValue(),
        sortingFn: (rowA, rowB, columnId) => {
          const valA = getTextContent(rowA.getValue(columnId));
          const valB = getTextContent(rowB.getValue(columnId));
          return valA.localeCompare(valB, undefined, {
            numeric: true,
            sensitivity: "base",
          });
        },
      });
    });
  }, [headers, columnHelper]);

  const table = useReactTable<Record<string, React.ReactNode>>({
    data: rows,
    columns,
    initialState: {
      pagination: {
        pageSize: pageSize || 10,
      },
    },
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, columnId, filterValue) => {
      const cellText = getTextContent(row.getValue(columnId));
      return cellText.toLowerCase().includes(String(filterValue).toLowerCase());
    },
    getCoreRowModel: getCoreRowModel(),
    ...(sortable ? { getSortedRowModel: getSortedRowModel() } : {}),
    ...(searchable ? { getFilteredRowModel: getFilteredRowModel() } : {}),
    ...(paginated ? { getPaginationRowModel: getPaginationRowModel() } : {}),
  });

  const handleExportCSV = () => {
    const visibleCols = table.getVisibleLeafColumns();
    const csvHeader = visibleCols
      .map((col) => {
        const rawHeader = typeof col.columnDef.header === "function"
          ? (col.columnDef.header as Function)({})
          : col.columnDef.header;
        const headerText = getTextContent(rawHeader);
        return `"${headerText.replace(/"/g, '""')}"`;
      })
      .join(",");

    const filteredRows = table.getFilteredRowModel().rows;
    const csvRows = filteredRows.map((row) =>
      visibleCols
        .map((col) => {
          const cellVal = getTextContent(row.getValue(col.id));
          return `"${cellVal.replace(/"/g, '""')}"`;
        })
        .join(","),
    );

    const csvContent = [csvHeader, ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "table-export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const tableClasses = [
    "table",
    "interactive-table",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const hasControls = searchable || exportable || columnToggle;

  return (
    <div className="interactive-table-container my-3">
      {hasControls && (
        <Row className="mb-2 align-items-center g-2">
          <Col className="d-flex align-items-center gap-2 ms-auto justify-content-end">
            {columnToggle && (
              <Dropdown align="end">
                <Dropdown.Toggle variant="outline-secondary" size="sm" id="dropdown-column-toggle">
                  {labels.toggleColumns}
                </Dropdown.Toggle>
                <Dropdown.Menu className="p-2" style={{ minWidth: "12rem" }}>
                  {table.getAllLeafColumns().map((col) => {
                    const rawHeader = typeof col.columnDef.header === "function"
                      ? (col.columnDef.header as Function)({})
                      : col.columnDef.header;
                    const headerText = getTextContent(rawHeader) || col.id;
                    return (
                      <Form.Check
                        key={col.id}
                        type="checkbox"
                        id={`toggle-col-${col.id}`}
                        label={headerText}
                        checked={col.getIsVisible()}
                        onChange={col.getToggleVisibilityHandler()}
                        className="my-1 small"
                      />
                    );
                  })}
                </Dropdown.Menu>
              </Dropdown>
            )}

            {exportable && (
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={handleExportCSV}
              >
                {labels.exportCsv}
              </Button>
            )}

            {searchable && (
              <Form.Control
                type="search"
                placeholder={labels.searchPlaceholder}
                value={globalFilter ?? ""}
                onChange={(e) => setGlobalFilter(e.target.value)}
                size="sm"
                style={{ width: "12.5rem" }}
              />
            )}
          </Col>
        </Row>
      )}

      <Table
        className={tableClasses}
        style={{
          tableLayout: "fixed",
          width: "100%",
          ...(tableProps.style as React.CSSProperties),
        }}
        {...tableProps}
      >
        <thead>
          {table.getHeaderGroups().map((headerGroup: HeaderGroup<Record<string, React.ReactNode>>) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header: Header<Record<string, React.ReactNode>, unknown>) => {
                const isSortable = sortable && header.column.getCanSort();
                const thStyle: React.CSSProperties = {
                  cursor: isSortable ? "pointer" : "default",
                  userSelect: isSortable ? "none" : "auto",
                  ...(stickyHeader
                    ? {
                        position: "sticky",
                        top: 0,
                        zIndex: 2,
                        backgroundColor: "var(--bs-body-bg, #ffffff)",
                        boxShadow: "inset 0 -2px 0 var(--bs-border-color, #dee2e6)",
                      }
                    : {}),
                };

                return (
                  <th key={header.id} onClick={isSortable ? header.column.getToggleSortingHandler() : undefined} style={thStyle}>
                    <div className="d-flex align-items-center justify-content-between gap-1">
                      <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                      {isSortable && (
                        <span className="small text-muted">
                          {{
                            asc: "▲",
                            desc: "▼",
                          }[header.column.getIsSorted() as string] ?? "⇅"}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row: TableRow<Record<string, React.ReactNode>>) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell: Cell<Record<string, React.ReactNode>, unknown>) => (
                  <td key={cell.id}>
                    {cell.getValue() as React.ReactNode}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={table.getVisibleLeafColumns().length} className="text-center text-muted py-3">
                {labels.noMatchingRecords}
              </td>
            </tr>
          )}
        </tbody>
      </Table>

      {paginated && table.getPageCount() > 1 && (() => {
        const currentPage = table.getState().pagination.pageIndex;
        const totalPages = table.getPageCount();
        const maxVisible = 5;

        let start = Math.max(0, currentPage - Math.floor(maxVisible / 2));
        let end = start + maxVisible - 1;

        if (end >= totalPages) {
          end = totalPages - 1;
          start = Math.max(0, end - maxVisible + 1);
        }

        const showFirstEllipsis = start > 0;
        const showLastEllipsis = end < totalPages - 1;
        const visiblePages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

        return (
          <div className="d-flex justify-content-between align-items-center mt-2">
            <span className="small text-muted">
              {labels.pageText(currentPage + 1, totalPages, rows.length)}
            </span>
            <Pagination size="sm" className="mb-0">
              <Pagination.First
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              />
              <Pagination.Prev
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              />
              {showFirstEllipsis && <Pagination.Ellipsis disabled />}
              {visiblePages.map((pageIdx) => (
                <Pagination.Item
                  key={pageIdx}
                  active={pageIdx === currentPage}
                  onClick={() => table.setPageIndex(pageIdx)}
                >
                  {pageIdx + 1}
                </Pagination.Item>
              ))}
              {showLastEllipsis && <Pagination.Ellipsis disabled />}
              <Pagination.Next
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              />
              <Pagination.Last
                onClick={() => table.setPageIndex(totalPages - 1)}
                disabled={!table.getCanNextPage()}
              />
            </Pagination>
          </div>
        );
      })()}
    </div>
  );
}
