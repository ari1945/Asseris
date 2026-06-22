/* ============================================================
   Asseris Wedge MVP — entri LOKAL/OFFLINE (F1 carve-out)
   ------------------------------------------------------------
   Entri terpisah dari `main.tsx` (215-import + proxy tRPC). Hanya
   memuat lapisan kanon + mesin diagnostik + panel tipis wedge.
   TIDAK memuat: backend tRPC/auth/RBAC/konektor, ~149 view firma-OS,
   contexts/shell (seam server). Lihat PRD - Wedge MVP Build.

   Boot order: data (seed canon) → diagnostics (menyeret canon_* +
   forensic_canon via ESM) → render WedgeApp. Semua side-effect window
   (AMS / AMS_FORENSIC / AMS_DIAG) terpasang lewat impph modul.
   ============================================================ */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../styles_base.css';           // token desain (--navy/--blue/--red…), bundel lokal
import '../diagnostics';               // → canon_base→data, canon_part3→part1/2/4, forensic_canon
import { WedgeApp } from './WedgeApp';

const el = document.getElementById('root');
if (el) createRoot(el).render(<WedgeApp />);
