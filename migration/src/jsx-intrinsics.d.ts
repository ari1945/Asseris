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
  // PR-4 — atribut yang berlaku untuk SETIAP elemen JSX, apa pun tipe propsnya.
  // Tanpa ini `<Row key={x} …/>` gagal pada komponen ber-props BERTIPE ("Property
  // 'key' does not exist on type 'RowProps'"), sehingga satu-satunya cara memberi
  // key adalah menjadikan props `any` — persis yang dicegah ratchet. Kontrak ini
  // biasanya datang dari @types/react, yang sengaja tak dipasang di sini.
  interface IntrinsicAttributes {
    key?: string | number | null;
  }
}

// React dipin via CDN tanpa @types/react. Di bawah `noImplicitAny:true`, impor
// modul ini memicu TS7016 ("tak ada file deklarasi"). Deklarasi modul ambient
// (bertubuh kosong = bertipe any) memulihkan perilaku pra-ratchet. Sejalan dgn
// keputusan W12/W13: TANPA @types/react.
declare module 'react';
declare module 'react/jsx-runtime';
declare module 'react-dom/client';
declare module 'react-dom';

// W14 Fase 0: `qrcode` (dipakai export_pdf.ts via dynamic import) tak punya @types.
declare module 'qrcode';
