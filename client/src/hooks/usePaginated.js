import { useCallback, useEffect, useRef, useState } from 'react';
import { getError } from '../services/api.js';

// Fetches a paginated list and re-fetches when filters or the page change.
// `filters` should be a memoised object; `reload()` refreshes the current page after create/update/delete.
export default function usePaginated(fetcher, filters = {}, limit = 10) {
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ data: [], pagination: { page: 1, pages: 1, total: 0 }, loading: true, error: '' });
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const key = JSON.stringify(filters);

  useEffect(() => setPage(1), [key]); // new filters -> back to page 1

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const res = await fetcher({ ...filtersRef.current, page, limit });
      if (res.data.length === 0 && page > 1) return setPage(page - 1); // deleted the last row of the last page
      setState({ data: res.data, pagination: res.pagination, loading: false, error: '' });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: getError(e).message }));
    }
  }, [fetcher, key, page, limit]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, page, setPage, reload: load };
}
