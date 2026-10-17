import { useEffect, useState } from 'react';
import { api } from '../api';

let cached;

/** Categories and statuses come from the server so both sides always agree. */
export function useMeta() {
  const [meta, setMeta] = useState(cached || { categories: [], statuses: [] });

  useEffect(() => {
    if (cached) return;
    api('/meta').then((data) => {
      cached = data;
      setMeta(data);
    });
  }, []);

  return meta;
}
