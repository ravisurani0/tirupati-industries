import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  LayoutGrid,
  List
} from 'lucide-react';

export default function DataTable({
  data = [],
  columns = [],
  initialSort = null, // { key: 'date', direction: 'desc' }
  searchable = true,
  searchPlaceholder = 'Search records...',
  searchFilter = null,
  pagination = true,
  pageSize: defaultPageSize = 10,
  pageSizeOptions = [5, 10, 25, 50, 100],
  showPageSize = true,
  loading = false,
  emptyMessage = 'No records found matching criteria.',
  renderCard = null, // (row, index) => ReactNode for mobile cards
  defaultView = 'auto', // 'auto', 'table', 'cards'
  topActions = null, // ReactNode for extra buttons or custom filters
  className = '',
  tableClassName = 'app-table'
}) {
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState(initialSort);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [viewMode, setViewMode] = useState(defaultView); // 'auto', 'cards', 'table'

  // Handle Sort Toggle
  const handleSort = (key, sortable = true) => {
    if (!sortable) return;

    setSortConfig((prev) => {
      if (!prev || prev.key !== key) {
        return { key, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return null; // Return to neutral unsorted
    });
    setCurrentPage(1);
  };

  // 1. Filtering
  const filteredData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    if (!search || !search.trim()) return data;

    const term = search.trim().toLowerCase();

    if (searchFilter) {
      return data.filter((row) => searchFilter(row, term));
    }

    return data.filter((row) => {
      return columns.some((col) => {
        let val = null;
        if (col.sortValue) {
          val = col.sortValue(row);
        } else if (col.key) {
          val = row[col.key];
        }

        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(term);
      });
    });
  }, [data, search, columns, searchFilter]);

  // 2. Sorting
  const sortedData = useMemo(() => {
    if (!sortConfig || !sortConfig.key) return filteredData;

    const col = columns.find((c) => c.key === sortConfig.key);
    const direction = sortConfig.direction === 'desc' ? -1 : 1;

    return [...filteredData].sort((a, b) => {
      let aVal = col?.sortValue ? col.sortValue(a) : a[sortConfig.key];
      let bVal = col?.sortValue ? col.sortValue(b) : b[sortConfig.key];

      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      // Numeric comparison
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return (aVal - bVal) * direction;
      }

      // Check if values can be parsed as numbers (excluding dates)
      const numA = Number(aVal);
      const numB = Number(bVal);
      if (!isNaN(numA) && !isNaN(numB) && typeof aVal !== 'boolean' && String(aVal).trim() !== '' && !String(aVal).includes('-')) {
        return (numA - numB) * direction;
      }

      // Date or String comparison
      const strA = String(aVal).toLowerCase();
      const strB = String(bVal).toLowerCase();
      return strA.localeCompare(strB) * direction;
    });
  }, [filteredData, sortConfig, columns]);

  // 3. Pagination
  const totalItems = sortedData.length;
  const totalPages = pagination ? Math.max(1, Math.ceil(totalItems / pageSize)) : 1;
  const safePage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;
    const start = (safePage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, safePage, pageSize, pagination]);

  // Reset page when page size changes
  const handlePageSizeChange = (newSize) => {
    setPageSize(Number(newSize));
    setCurrentPage(1);
  };

  const startIndex = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIndex = Math.min(safePage * pageSize, totalItems);

  // Pagination navigation helpers
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push('...');

      const start = Math.max(2, safePage - 1);
      const end = Math.min(totalPages - 1, safePage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }

      if (safePage < totalPages - 2) pages.push('...');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className={`datatable-container w-full ${className}`}>
      {/* DataTable Controls Bar (Search, PageSize, TopActions, ViewToggle) */}
      <div className="datatable-toolbar flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3.5">
        <div className="flex items-center gap-2.5 flex-wrap flex-1 min-w-0">
          {searchable && (
            <div className="search-input-wrapper relative flex-1 min-w-[200px] max-w-sm">
              <input
                type="text"
                className="form-control form-control-sm w-full pl-8 pr-3"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          )}

          {showPageSize && pagination && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
              <span>Show</span>
              <select
                className="form-select form-select-sm py-1 px-2 text-xs"
                value={pageSize}
                onChange={(e) => handlePageSizeChange(e.target.value)}
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <span>rows</span>
            </div>
          )}

          {topActions}
        </div>

        {renderCard && (
          <div className="view-toggle self-end md:self-auto shrink-0">
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode(viewMode === 'cards' ? 'auto' : 'cards')}
              title="Cards View"
            >
              <LayoutGrid size={13} />
              <span>Cards</span>
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode(viewMode === 'table' ? 'auto' : 'table')}
              title="Table View"
            >
              <List size={13} />
              <span>Table</span>
            </button>
          </div>
        )}
      </div>

      {/* Mobile Card List View (conditional on renderCard) */}
      {renderCard && (
        <div
          className={`mobile-cards-list ${
            viewMode === 'cards' ? 'force-cards' : viewMode === 'table' ? 'hidden' : ''
          }`}
        >
          {loading ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              <div className="inline-block animate-spin mr-2">⏳</div>
              Loading records...
            </div>
          ) : paginatedData.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              {emptyMessage}
            </div>
          ) : (
            paginatedData.map((row, idx) => renderCard(row, (safePage - 1) * pageSize + idx))
          )}
        </div>
      )}

      {/* Desktop Responsive Table View */}
      <div
        className={`table-responsive ${
          renderCard && viewMode === 'cards'
            ? 'force-hidden'
            : renderCard && viewMode === 'table'
            ? 'force-table'
            : renderCard
            ? 'hidden md:block'
            : 'block'
        }`}
      >
        <table className={tableClassName}>
          <thead>
            <tr>
              {columns.map((col) => {
                const isSortable = col.sortable !== false;
                const isCurrentSort = sortConfig?.key === col.key;
                const alignClass =
                  col.align === 'right'
                    ? 'text-right'
                    : col.align === 'center'
                    ? 'text-center'
                    : 'text-left';

                return (
                  <th
                    key={col.key || col.label}
                    style={col.width ? { width: col.width } : {}}
                    className={`${alignClass} ${col.headerClassName || ''} ${
                      isSortable ? 'cursor-pointer select-none group hover:bg-slate-100/80 transition-colors' : ''
                    }`}
                    onClick={() => handleSort(col.key, isSortable)}
                    title={isSortable ? `Click to sort by ${col.label}` : ''}
                  >
                    <div
                      className={`inline-flex items-center gap-1.5 ${
                        col.align === 'right' ? 'justify-end w-full' : col.align === 'center' ? 'justify-center w-full' : ''
                      }`}
                    >
                      <span className={isCurrentSort ? 'text-blue-600 font-bold' : ''}>
                        {col.label}
                      </span>
                      {isSortable && (
                        <span className="shrink-0 transition-transform">
                          {isCurrentSort ? (
                            sortConfig.direction === 'asc' ? (
                              <ArrowUp size={12} className="text-blue-600" />
                            ) : (
                              <ArrowDown size={12} className="text-blue-600" />
                            )
                          ) : (
                            <ArrowUpDown size={11} className="text-slate-400 opacity-60 group-hover:opacity-100" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-slate-500">
                  <div className="inline-block animate-spin mr-2">⏳</div>
                  Loading table data...
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-slate-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIdx) => {
                const globalIdx = (safePage - 1) * pageSize + rowIdx;
                return (
                  <tr key={row.id || globalIdx}>
                    {columns.map((col) => {
                      const alignClass =
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left';

                      return (
                        <td
                          key={col.key || col.label}
                          className={`${alignClass} ${col.className || ''}`}
                          style={col.width ? { width: col.width } : {}}
                        >
                          {col.render ? col.render(row, globalIdx) : row[col.key]}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {pagination && totalItems > 0 && (
        <div className="datatable-pagination flex flex-col sm:flex-row items-center justify-between gap-3 pt-3.5 border-t border-slate-200 mt-2 text-xs text-slate-500">
          <div>
            Showing <strong className="text-slate-800 font-semibold">{startIndex}</strong> to{' '}
            <strong className="text-slate-800 font-semibold">{endIndex}</strong> of{' '}
            <strong className="text-slate-800 font-semibold">{totalItems}</strong> entries
            {search.trim() && totalItems !== data.length && (
              <span className="text-slate-400 ml-1">(filtered from {data.length} total)</span>
            )}
          </div>

          <div className="flex items-center gap-1 flex-wrap justify-center">
            <button
              type="button"
              className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              onClick={() => setCurrentPage(1)}
              disabled={safePage === 1}
              title="First Page"
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              type="button"
              className="px-2 py-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
            >
              <ChevronLeft size={14} />
              <span>Prev</span>
            </button>

            {getPageNumbers().map((p, pIdx) => {
              if (p === '...') {
                return (
                  <span key={`ellipsis_${pIdx}`} className="px-2 py-1 text-slate-400">
                    ...
                  </span>
                );
              }
              const isActive = p === safePage;
              return (
                <button
                  key={`page_${p}`}
                  type="button"
                  className={`min-w-[28px] h-7 px-2 rounded font-semibold text-xs transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  onClick={() => setCurrentPage(p)}
                >
                  {p}
                </button>
              );
            })}

            <button
              type="button"
              className="px-2 py-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
            <button
              type="button"
              className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              onClick={() => setCurrentPage(totalPages)}
              disabled={safePage === totalPages}
              title="Last Page"
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
