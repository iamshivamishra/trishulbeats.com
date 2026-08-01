import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  buildHref: (page: number) => string;
}

function getPageRange(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "...")[] = [];

  if (current <= 4) {
    pages.push(1, 2, 3, 4, 5, "...", total);
  } else if (current >= total - 3) {
    pages.push(1, "...", total - 4, total - 3, total - 2, total - 1, total);
  } else {
    pages.push(1, "...", current - 1, current, current + 1, "...", total);
  }

  return pages;
}

export default function Pagination({ currentPage, totalPages, buildHref }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageRange(currentPage, totalPages);

  return (
    <nav className="mt-8 flex items-center justify-center gap-1" aria-label="Pagination">
      {currentPage > 1 ? (
        <Link
          href={buildHref(currentPage - 1)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-sm text-muted-foreground transition-colors hover:bg-accent"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
      ) : (
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-md text-sm text-muted-foreground/40">
          <ChevronLeft className="h-4 w-4" />
        </span>
      )}

      {pages.map((page, i) =>
        page === "..." ? (
          <span
            key={`ellipsis-${i}`}
            className="inline-flex h-9 w-9 items-center justify-center text-sm text-muted-foreground"
          >
            ...
          </span>
        ) : (
          <Link
            key={page}
            href={buildHref(page)}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-colors ${
              page === currentPage
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-accent"
            }`}
            aria-current={page === currentPage ? "page" : undefined}
          >
            {page}
          </Link>
        )
      )}

      {currentPage < totalPages ? (
        <Link
          href={buildHref(currentPage + 1)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-sm text-muted-foreground transition-colors hover:bg-accent"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-md text-sm text-muted-foreground/40">
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}
