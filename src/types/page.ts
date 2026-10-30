/** Paginated collection: the rows of the requested page plus the total matching count. */
interface Page<T> {
  results: T[];
  count: number;
}

export type { Page };
