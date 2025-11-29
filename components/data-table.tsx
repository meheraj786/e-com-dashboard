"use client";

import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import jsPDF from "jspdf";
import "jspdf-autotable";
import {
  ArrowUpDown,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Search,
} from "lucide-react";
import * as React from "react";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import autoTable from "jspdf-autotable";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  title?: string;
  search?: keyof TData;
  searchPlaceholder?: string;
  enableColumnVisibility?: boolean;
  enableExport?: boolean;
  enablePagination?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export default function DataTable<TData, TValue>({
  columns,
  data,
  title,
  search,
  searchPlaceholder = "Search...",
  enableColumnVisibility = true,
  enableExport = true,
  enablePagination = true,
  pageSize = 10,
  pageSizeOptions = [10, 20, 25, 30, 40, 50, 100, 200, 500, 1000],
  loading = false,
  emptyMessage = "No results found.",
  className,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [globalFilter, setGlobalFilter] = React.useState("");

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  const exportToCSV = () => {
    const headers = table.getVisibleFlatColumns().map((column) => column.id);
    const rows = table.getFilteredRowModel().rows.map((row) =>
      headers.map((header) => {
        const cell = row.getValue(header);
        return typeof cell === "string" || typeof cell === "number" ? cell : "";
      })
    );

    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${title || "data"}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToXLSX = () => {
    const headers = table.getVisibleFlatColumns().map((column) => column.id);
    const rows = table.getFilteredRowModel().rows.map((row) =>
      headers.map((header) => {
        const cell = row.getValue(header);
        return typeof cell === "string" || typeof cell === "number" ? cell : "";
      })
    );

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, `${title || "data"}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();

    // Add title with better styling
    if (title) {
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235); // Blue color
      doc.text(title, 14, 18);

      // Add a subtle line under the title
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.5);
      doc.line(14, 22, doc.internal.pageSize.width - 14, 22);
    }

    // Helper function to format column names
    const formatColumnName = (name: string): string => {
      return (
        name
          // Replace underscores with spaces
          .replace(/_/g, " ")
          // Insert space before capital letters (camelCase)
          .replace(/([a-z])([A-Z])/g, "$1 $2")
          // Capitalize first letter of each word
          .replace(/\b\w/g, (char) => char.toUpperCase())
      );
    };

    // Prepare table data - exclude "actions" column
    const allColumns = table.getVisibleFlatColumns();
    const filteredColumns = allColumns.filter(
      (column) => column.id.toLowerCase() !== "actions"
    );
    const headers = filteredColumns.map((column) =>
      formatColumnName(column.id)
    );

    const rows = table.getFilteredRowModel().rows.map((row) =>
      filteredColumns.map((column) => {
        // Try to get the formatted cell value first
        const columnDef = columns.find((col) => {
          const anyCol = col as unknown as Record<string, unknown>;
          if ("accessorKey" in anyCol) {
            return anyCol.accessorKey === column.id;
          }
          if ("id" in anyCol) {
            return anyCol.id === column.id;
          }
          return false;
        });

        // If column has a custom cell renderer, use it
        if (
          columnDef &&
          "cell" in columnDef &&
          typeof columnDef.cell === "function"
        ) {
          try {
            const cellContext = { row, column: { id: column.id } } as never;
            const cellValue = columnDef.cell(cellContext);
            // Extract text content from React elements
            if (
              cellValue &&
              typeof cellValue === "object" &&
              "props" in cellValue
            ) {
              // Handle React elements
              const reactElement = cellValue as {
                props?: { children?: unknown };
              };
              if (reactElement.props && reactElement.props.children) {
                const children = reactElement.props.children;
                if (
                  typeof children === "string" ||
                  typeof children === "number"
                ) {
                  // Replace Unicode Taka sign with PDF-friendly text
                  return String(children).replace(/৳/g, "TK ");
                }
                if (Array.isArray(children)) {
                  return children
                    .filter(
                      (c) => typeof c === "string" || typeof c === "number"
                    )
                    .join("")
                    .replace(/৳/g, "TK ");
                }
              }
            }
            if (
              typeof cellValue === "string" ||
              typeof cellValue === "number"
            ) {
              // Replace Unicode Taka sign with PDF-friendly text
              return String(cellValue).replace(/৳/g, "TK ");
            }
          } catch {
            // If custom renderer fails, fall back to raw value
          }
        }

        // Fall back to raw value
        const cell = row.getValue(column.id);
        return typeof cell === "string" || typeof cell === "number"
          ? String(cell)
          : "";
      })
    );

    // Add table with improved color contrast and smaller font
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: title ? 30 : 15,
      theme: "striped",
      styles: {
        fontSize: 7,
        cellPadding: 2.5,
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
        textColor: [30, 30, 30],
        fontStyle: "normal",
        overflow: "linebreak",
        cellWidth: "auto",
      },
      headStyles: {
        fillColor: [37, 99, 235], // Blue header background
        textColor: [255, 255, 255], // White text
        fontStyle: "bold",
        fontSize: 7.5,
        cellPadding: 3,
        halign: "left",
      },
      bodyStyles: {
        textColor: [30, 30, 30], // Dark text for readability
        fontSize: 7,
        cellPadding: 2.5,
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250], // Very light gray for alternate rows
      },
      columnStyles: {},
      margin: { top: 15, left: 10, right: 10 },
      tableWidth: "auto",
      didDrawPage: (data) => {
        // Add page numbers
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          data.settings.margin.left,
          doc.internal.pageSize.height - 10
        );
      },
    });

    doc.save(`${title || "data"}.pdf`);
  };

  // Much more subtle and professional styling using theme colors
  // All styling is now handled by Tailwind classes that respect dark mode

  if (loading) {
    return (
      <Card className={className}>
        {title && (
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-y-2 flex-wrap p-4 border-b">
          <div className="flex items-center space-x-2">
            {search && (
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={searchPlaceholder}
                  value={globalFilter ?? ""}
                  onChange={(event) =>
                    setGlobalFilter(String(event.target.value))
                  }
                  className="pl-8 max-w-sm"
                />
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {enableExport && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={exportToCSV}>
                    <FileText className="mr-2 h-4 w-4" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToXLSX}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Export as XLSX
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToPDF}>
                    <FileText className="mr-2 h-4 w-4" />
                    Export as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {enableColumnVisibility && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Columns <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => {
                      return (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          className="capitalize"
                          checked={column.getIsVisible()}
                          onCheckedChange={(value) =>
                            column.toggleVisibility(!!value)
                          }
                        >
                          {column.id}
                        </DropdownMenuCheckboxItem>
                      );
                    })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="border">
          <div className="overflow-x-auto">
            <Table className="border-collapse min-w-max">
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="bg-primary text-primary-foreground border-r font-semibold min-w-[150px] whitespace-nowrap"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table?.getRowModel().rows?.length ? (
                  table?.getRowModel().rows.map((row, index) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      className={`
                        ${index % 2 === 0 ? "bg-background" : "bg-muted/30"}
                        hover:bg-accent/50 transition-colors
                      `}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className="border-r min-w-[150px] whitespace-nowrap"
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center text-muted-foreground"
                    >
                      {emptyMessage}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination */}
        {enablePagination && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="flex items-center space-x-2">
              <p className="text-sm text-muted-foreground">
                Showing{" "}
                {table.getState().pagination.pageIndex *
                  table.getState().pagination.pageSize +
                  1}{" "}
                to{" "}
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) *
                    table.getState().pagination.pageSize,
                  table.getFilteredRowModel().rows.length
                )}{" "}
                of {table.getFilteredRowModel().rows.length} entries
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">Rows per page</p>
                <Select
                  value={`${table.getState().pagination.pageSize}`}
                  onValueChange={(value) => {
                    table.setPageSize(Number(value));
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue
                      placeholder={table.getState().pagination.pageSize}
                    />
                  </SelectTrigger>
                  <SelectContent side="top">
                    {pageSizeOptions.map((pageSize) => (
                      <SelectItem key={pageSize} value={`${pageSize}`}>
                        {pageSize}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center flex-wrap space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Helper function to create sortable column header
export function createSortableHeader(title: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SortableHeader = ({ column }: { column: any }) => {
    return (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-auto p-0 font-medium text-xs hover:bg-transparent hover:text-primary-foreground/80"
      >
        {title}
        <ArrowUpDown className="ml-2 h-3 w-3" />
      </Button>
    );
  };
  SortableHeader.displayName = "SortableHeader";
  return SortableHeader;
}
