// Asseris — W13 Fase 4: ambient JSX intrinsics shim.
// React types sengaja TIDAK dipasang (@types/react absen; React dipin via CDN).
// Di bawah `noImplicitAny:true`, tiap elemen host JSX (<div>/<span>/…) memicu
// TS7026 karena `JSX.IntrinsicElements` tak ada. Deklarasi index-signature ini
// memulihkan perilaku pra-ratchet untuk elemen host (longgar, =any) TANPA menarik
// @types/react. Ambient global (berkas non-module: tanpa top-level import/export).
// Padanan konsep `shims-css.d.ts`. Permanen/struktural — bukan shim penambal-fondasi.
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
  interface Element extends Record<string, any> {}
  interface ElementClass extends Record<string, any> {}
}

// React dipin via CDN tanpa @types/react. Di bawah `noImplicitAny:true`, impor
// modul ini memicu TS7016 ("tak ada file deklarasi"). Deklarasi modul ambient
// (bertubuh kosong = bertipe any) memulihkan perilaku pra-ratchet. Sejalan dgn
// keputusan W12/W13: TANPA @types/react.
declare module 'react';
declare module 'react/jsx-runtime';
declare module 'react-dom/client';
declare module 'react-dom';
