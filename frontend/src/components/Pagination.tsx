interface PaginationProps {
  /** Zero-based current page. */
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const MAX_VISIBLE_PAGE_BUTTONS = 5;

/** Returns a window of zero-based page indexes centred on the current page. */
export function visiblePageIndexes(page: number, totalPages: number): number[] {
  const windowSize = Math.min(MAX_VISIBLE_PAGE_BUTTONS, totalPages);
  const start = Math.min(Math.max(page - Math.floor(windowSize / 2), 0), totalPages - windowSize);
  return Array.from({ length: windowSize }, (_, offset) => start + offset);
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        type="button"
        className="button button--secondary button--small"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 0}
      >
        Previous
      </button>
      <ul className="pagination__pages">
        {visiblePageIndexes(page, totalPages).map((pageIndex) => (
          <li key={pageIndex}>
            <button
              type="button"
              className={`pagination__page${pageIndex === page ? ' pagination__page--current' : ''}`}
              onClick={() => onPageChange(pageIndex)}
              aria-current={pageIndex === page ? 'page' : undefined}
              aria-label={`Page ${pageIndex + 1}`}
            >
              {pageIndex + 1}
            </button>
          </li>
        ))}
      </ul>
      <span className="pagination__summary">
        Page {page + 1} of {totalPages}
      </span>
      <button
        type="button"
        className="button button--secondary button--small"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages - 1}
      >
        Next
      </button>
    </nav>
  );
}
