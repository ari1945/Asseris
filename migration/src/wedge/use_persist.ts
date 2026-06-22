/* Wedge MVP — persist state ke localStorage (lokal, tanpa server).
   Pola sejajar usePersisted Asseris, tapi MANDIRI (tak menarik contexts/seam). */
import React from 'react';

const { useState: useStateP, useCallback: useCallbackP } = React;

export function loadLocal(key: string, def: any): any {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? def : JSON.parse(raw);
  } catch (e) { return def; }
}

export function usePersist(key: string, init: any): [any, (v: any) => void] {
  const [val, setVal] = useStateP(() => loadLocal(key, typeof init === 'function' ? init() : init));
  const set = useCallbackP((next: any) => {
    setVal((prev: any) => {
      const v = typeof next === 'function' ? next(prev) : next;
      try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* kuota/serialisasi — abaikan */ }
      return v;
    });
  }, [key]);
  return [val, set];
}
