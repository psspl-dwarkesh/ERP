import { useMemo, useState } from "react";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import * as Tabs from "@radix-ui/react-tabs";
import { Command } from "cmdk";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpRight,
  Check,
  ChevronDown,
  Columns3,
  Copy,
  LayoutList,
  MoreHorizontal,
  Search,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import type { RecordRow } from "../data";

export function ProductTabs({
  items,
  value,
  onChange,
}: {
  items: { label: string; value: string; count?: number }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Tabs.Root
      value={value}
      onValueChange={onChange}
      className="product-tabs-root"
    >
      <Tabs.List className="inner-tabs" aria-label="Workspace views">
        {items.map((item) => (
          <Tabs.Trigger
            key={item.value}
            className="product-tab"
            value={item.value}
          >
            {item.label}
            {item.count !== undefined && (
              <span className="tab-count">{item.count}</span>
            )}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
    </Tabs.Root>
  );
}

export function ProductCommand({
  items,
  onNavigate,
}: {
  items: {
    name: string;
    description: string;
    icon: LucideIcon;
    keywords?: string;
  }[];
  onNavigate: (name: string) => void;
}) {
  return (
    <Command className="product-command" label="Navigate the workspace" loop>
      <div className="command-input">
        <Search size={19} />
        <Command.Input placeholder="Jump to a module or PRJ-0264…" />
        <kbd>ESC</kbd>
      </div>
      <Command.List>
        <Command.Empty>
          No matching destinations. Try a module name.
        </Command.Empty>
        <Command.Group heading="Workspace">
          {items.map((item) => (
            <Command.Item
              key={item.name}
              value={item.name}
              keywords={[item.description, item.keywords || ""]}
              onSelect={() => onNavigate(item.name)}
            >
              <item.icon size={18} />
              <span>
                <strong>{item.name}</strong>
                <small>{item.description}</small>
              </span>
              <ArrowUpRight size={15} />
            </Command.Item>
          ))}
        </Command.Group>
      </Command.List>
      <div className="command-footer">
        <span>
          <kbd>↑</kbd>
          <kbd>↓</kbd> to navigate
        </span>
        <span>
          <kbd>↵</kbd> to open
        </span>
        <span>Demo workspace</span>
      </div>
    </Command>
  );
}

type DataGridProps = {
  data: RecordRow[];
  labels: { main: string; owner: string; value: string; date: string };
  onOpen: (row: RecordRow) => void;
  onExport: (rows: RecordRow[]) => void;
  onClear: () => void;
  badge: (status: string) => React.ReactNode;
  notify: (message: string) => void;
};
export function DataGrid({
  data,
  labels,
  onOpen,
  onExport,
  onClear,
  badge,
  notify,
}: DataGridProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selection, setSelection] = useState<RowSelectionState>({});
  const [visibility, setVisibility] = useState<VisibilityState>({});
  const [compact, setCompact] = useState(false);
  const columns = useMemo<ColumnDef<RecordRow>[]>(
    () => [
      {
        id: "select",
        enableHiding: false,
        enableSorting: false,
        header: ({ table }) => (
          <input
            type="checkbox"
            aria-label="Select all visible records"
            checked={table.getIsAllRowsSelected()}
            ref={(el) => {
              if (el) el.indeterminate = table.getIsSomeRowsSelected();
            }}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            aria-label={`Select ${row.original.id}`}
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
      },
      {
        accessorKey: "name",
        header: labels.main,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="grid-record">
            <span className="record-code">{row.original.id}</span>
            <div>
              <button
                className="record-name"
                onClick={() => onOpen(row.original)}
              >
                {row.original.name}
              </button>
              <small>{row.original.subtitle}</small>
              {row.original.progress !== undefined && (
                <span className="grid-progress">
                  <i style={{ width: `${row.original.progress}%` }} />
                  <span>{row.original.progress}%</span>
                </span>
              )}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => badge(row.original.status),
      },
      {
        accessorKey: "owner",
        header: labels.owner,
        cell: ({ row }) => (
          <span className="grid-owner">
            <i>
              {row.original.owner
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </i>
            {row.original.owner}
          </span>
        ),
      },
      {
        accessorKey: "value",
        header: labels.value,
        sortingFn: (a, b) =>
          numericValue(a.original.value) - numericValue(b.original.value),
      },
      {
        accessorKey: "date",
        header: labels.date,
        sortingFn: (a, b) =>
          dateValue(a.original.date) - dateValue(b.original.date),
      },
      {
        id: "actions",
        enableHiding: false,
        enableSorting: false,
        header: () => null,
        cell: ({ row }) => (
          <Dropdown.Root>
            <Dropdown.Trigger asChild>
              <button
                className="icon-button"
                aria-label={`Actions for ${row.original.id}`}
              >
                <MoreHorizontal size={16} />
              </button>
            </Dropdown.Trigger>
            <Dropdown.Portal>
              <Dropdown.Content
                className="product-dropdown"
                align="end"
                sideOffset={6}
              >
                <Dropdown.Label>{row.original.id}</Dropdown.Label>
                <Dropdown.Item onSelect={() => onOpen(row.original)}>
                  <ArrowUpRight size={14} />
                  Open record
                </Dropdown.Item>
                <Dropdown.Item
                  onSelect={() => {
                    navigator.clipboard
                      .writeText(row.original.id)
                      .then(() => notify("Record ID copied."))
                      .catch(() => notify(`Record ID: ${row.original.id}`));
                  }}
                >
                  <Copy size={14} />
                  Copy record ID
                </Dropdown.Item>
                <Dropdown.Separator />
                <Dropdown.Item onSelect={() => onExport([row.original])}>
                  <ArrowDownToLine size={14} />
                  Export this record
                </Dropdown.Item>
              </Dropdown.Content>
            </Dropdown.Portal>
          </Dropdown.Root>
        ),
      },
    ],
    [
      labels.main,
      labels.owner,
      labels.value,
      labels.date,
      onOpen,
      onExport,
      badge,
      notify,
    ],
  );
  const table = useReactTable({
    data,
    columns,
    getRowId: (row) => row.id,
    state: { sorting, rowSelection: selection, columnVisibility: visibility },
    onSortingChange: setSorting,
    onRowSelectionChange: setSelection,
    onColumnVisibilityChange: setVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: true,
  });
  const selected = table.getSelectedRowModel().rows;
  return (
    <div className={`product-grid ${compact ? "compact" : ""}`}>
      <div className="grid-viewbar">
        <div>
          <span className="view-dot" />
          {selected.length ? (
            <>
              <strong>{selected.length} selected</strong>
              <button className="grid-clear" onClick={() => setSelection({})}>
                <X size={12} />
                Clear
              </button>
            </>
          ) : (
            <>
              <strong>All records</strong>
              <span className="grid-count">{data.length}</span>
            </>
          )}
        </div>
        <div>
          {selected.length > 0 && (
            <button
              className="grid-tool"
              onClick={() => onExport(selected.map((r) => r.original))}
            >
              <ArrowDownToLine size={14} />
              Export selected
            </button>
          )}
          <Dropdown.Root>
            <Dropdown.Trigger asChild>
              <button className="grid-tool" aria-label="Display options">
                <Columns3 size={14} />
                Display
                <ChevronDown size={12} />
              </button>
            </Dropdown.Trigger>
            <Dropdown.Portal>
              <Dropdown.Content
                className="product-dropdown"
                align="end"
                sideOffset={7}
              >
                <Dropdown.Label>Visible columns</Dropdown.Label>
                {table
                  .getAllLeafColumns()
                  .filter((c) => c.getCanHide())
                  .map((c) => (
                    <Dropdown.CheckboxItem
                      key={c.id}
                      checked={c.getIsVisible()}
                      onCheckedChange={(checked) =>
                        c.toggleVisibility(!!checked)
                      }
                      onSelect={(e) => e.preventDefault()}
                    >
                      <span className="menu-check">
                        <Dropdown.ItemIndicator>
                          <Check size={13} />
                        </Dropdown.ItemIndicator>
                      </span>
                      {String(c.columnDef.header)}
                    </Dropdown.CheckboxItem>
                  ))}
                <Dropdown.Separator />
                <Dropdown.CheckboxItem
                  checked={compact}
                  onCheckedChange={(checked) => setCompact(!!checked)}
                  onSelect={(e) => e.preventDefault()}
                >
                  <span className="menu-check">
                    <Dropdown.ItemIndicator>
                      <Check size={13} />
                    </Dropdown.ItemIndicator>
                  </span>
                  <LayoutList size={13} />
                  Compact rows
                </Dropdown.CheckboxItem>
              </Dropdown.Content>
            </Dropdown.Portal>
          </Dropdown.Root>
        </div>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => (
                  <th
                    key={header.id}
                    className={`grid-col-${header.column.id}`}
                    aria-sort={
                      header.column.getIsSorted() === "asc"
                        ? "ascending"
                        : header.column.getIsSorted() === "desc"
                          ? "descending"
                          : undefined
                    }
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        className="sort-label"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {header.column.getIsSorted() === "desc" ? (
                          <ArrowDown size={12} />
                        ) : header.column.getIsSorted() === "asc" ? (
                          <ArrowUp size={12} />
                        ) : (
                          <ChevronDown size={11} />
                        )}
                      </button>
                    ) : (
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} data-selected={row.getIsSelected()}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className={`grid-col-${cell.column.id}`}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length === 0 && (
          <div className="empty">
            <Search size={24} />
            <h3>No matching records</h3>
            <p>Try another search or status filter.</p>
            <button className="button" onClick={onClear}>
              Clear filters
            </button>
          </div>
        )}
      </div>
      <div className="grid-pagination">
        <span>
          {data.length} records <span>·</span> Illustrative data
        </span>
        <span>All records loaded</span>
      </div>
    </div>
  );
}

function numericValue(value: string) {
  const number = Number(
    value.replaceAll(",", "").match(/\d+(\.\d+)?/)?.[0] || 0,
  );
  return (
    number *
    (/\bCr\b/.test(value) ? 10000000 : /\bL\b/.test(value) ? 100000 : 1)
  );
}
function dateValue(value: string) {
  const date = /\b20\d\d\b/.test(value) ? Date.parse(value) : NaN;
  return Number.isNaN(date) ? numericValue(value) : date;
}
