import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

// Lets dashboard "Quick Actions" deep-link to e.g. /students?add=1 and open the Add modal.
export default function useAddParam(enabled, onAdd) {
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    if (params.get('add')) {
      if (enabled) onAdd();
      setParams({}, { replace: true });
    }
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps
}
