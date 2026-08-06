/* ============================================================
   Asseris — primitif <Overlay> (PRD Fase A)
   ------------------------------------------------------------
   SATU kontrak untuk seluruh overlay app. Sebelum ini, 47 situs
   `position:fixed; inset:0` dirakit tangan di 29 berkas dengan hasil:
   `role="dialog"`/`aria-modal` 0 berkas · handler Escape 4/29 ·
   focus trap 0 · scroll lock 0 · `zIndex: 90` datar 31× · guard draft 0.
   Lihat docs/prd-overlay-contract-and-addressable-objects.md §1 P2.

   Yang WAJIB disediakan primitif ini, bukan lagi tanggung jawab pemakai:
     · role="dialog" + aria-modal + label (aria-labelledby / aria-label)
     · focus trap Tab/Shift-Tab + RESTORE fokus ke elemen pemicu saat tutup
     · Escape
     · scroll lock berbasis COUNTER (overlay bertumpuk — bukan boolean)
     · backdrop click yang MENOLAK menutup bila ada perubahan belum tersimpan
     · tinggi mengikuti isi (`maxHeight`), bukan viewport dipaku

   CATATAN TIPE: @types/react sengaja absen (lihat jsx-intrinsics.d.ts) →
   `React` bertipe any dan `React.ReactNode`/`CSSProperties` TIDAK tersedia
   sebagai tipe. Berkas ini baru, jadi tak punya baseline suppression:
   ratchet `@typescript-eslint/no-explicit-any` berlaku penuh → dipakai tipe
   struktural sendiri (`OvNode`/`OvStyle`) + anotasi LHS untuk hasil hook
   (menghindari TS2347 "untyped function calls may not accept type arguments").
   Tipe DOM tersedia (tsconfig lib: DOM), jadi HTMLElement/KeyboardEvent nyata.
   ============================================================ */
import React from 'react';
import { I } from './icons';

const {
  useCallback: useCallbackOV,
  useEffect: useEffectOV,
  useId: useIdOV,
  useRef: useRefOV,
  useState: useStateOV,
} = React;

/* Node React & style inline — React types absen, jadi struktural. */
type OvNode = unknown;
type OvStyle = Record<string, string | number | undefined>;

export type OverlayVariant = 'modal' | 'sheet' | 'page';
export type OverlaySize = 'sm' | 'md' | 'lg' | 'xl';
export type ZLayer = 'sheet' | 'modal' | 'confirm' | 'toast';

/* ------------------------------------------------------------
   Skala z BERNAMA — mengganti 31× `zIndex: 90` datar yang membuat
   penumpukan bergantung urutan DOM, bukan desain.
   ------------------------------------------------------------ */
export const Z: Record<ZLayer, number> = {
  sheet: 80,     // konteks pendamping (drawer SA, lineage)
  modal: 90,     // tugas atomik / detail
  confirm: 95,   // konfirmasi DI ATAS modal (gate fase, buang perubahan)
  toast: 9999,   // notifikasi — selalu teratas
};

/* ------------------------------------------------------------
   Scroll lock — COUNTER, bukan boolean.
   Boolean akan salah pada overlay bertumpuk: menutup yang atas
   melepaskan lock milik yang bawah. Diekspor agar dapat diuji.
   ------------------------------------------------------------ */
let scrollLocks = 0;
let savedOverflow: string | null = null;

function bodyEl(): HTMLElement | null {
  if (typeof document === 'undefined' || !document.body) return null;
  return document.body;
}

export function lockScroll(): void {
  scrollLocks += 1;
  const body = bodyEl();
  if (!body || scrollLocks !== 1) return;
  savedOverflow = body.style.overflow;
  body.style.overflow = 'hidden';
}

export function unlockScroll(): void {
  if (scrollLocks === 0) return;          // tak boleh minus
  scrollLocks -= 1;
  const body = bodyEl();
  if (!body || scrollLocks !== 0) return;
  body.style.overflow = savedOverflow == null ? '' : savedOverflow;
  savedOverflow = null;
}

export function scrollLockDepth(): number {
  return scrollLocks;
}

/* Hanya untuk uji — memulihkan modul ke keadaan bersih antar-kasus. */
export function __resetScrollLock(): void {
  scrollLocks = 0;
  savedOverflow = null;
  const body = bodyEl();
  if (body) body.style.overflow = '';
}

/* ------------------------------------------------------------
   Focus trap
   ------------------------------------------------------------
   Sengaja TIDAK memfilter berdasar visibilitas (offsetParent): jsdom
   tak punya layout sehingga filter itu akan membuang semua kandidat di
   uji, dan di app nyata elemen tersembunyi umumnya sudah `disabled`
   atau `aria-hidden`. Yang difilter: disabled, aria-hidden, tabindex=-1.
   ------------------------------------------------------------ */
const FOCUSABLE_SEL = [
  'a[href]', 'area[href]', 'button', 'input', 'select', 'textarea',
  'iframe', 'object', 'embed', '[contenteditable="true"]', '[tabindex]',
].join(',');

export function focusableWithin(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  const out: HTMLElement[] = [];
  const found = root.querySelectorAll(FOCUSABLE_SEL);
  for (let i = 0; i < found.length; i += 1) {
    const el = found[i] as HTMLElement;
    if (el.hasAttribute('disabled')) continue;
    if (el.getAttribute('aria-hidden') === 'true') continue;
    if (el.getAttribute('tabindex') === '-1') continue;
    if (el.getAttribute('type') === 'hidden') continue;
    out.push(el);
  }
  return out;
}

/* ------------------------------------------------------------
   Geometri per varian
   ------------------------------------------------------------ */
/* Skala lebar diturunkan dari korpus 47 situs, bukan dikarang: lebar yang
   benar-benar dipakai mengelompok di {460} {560,560} {680,720} {900,920,940,940}.
   Empat langkah ini membuat simpangan maksimum hanya +40px dan TAK PERNAH
   menyempitkan panel bertabel lebar (penyempitan = satu-satunya arah berisiko). */
const MODAL_W: Record<OverlaySize, number> = { sm: 460, md: 560, lg: 720, xl: 940 };
/* Sheet punya korpusnya SENDIRI: 420 · 440 · 460 · 480 · 540 · 760 · 780.
   `sm` dinaikkan 440→480 di PR-2b karena 440 akan MENYEMPITKAN drawer 480px —
   melanggar aturan "tak pernah menyempitkan" yang jadi dasar skala ini.
   Dengan 480/600/780 seluruh korpus sheet hanya melebar (maks +60), nol menyempit.
   Efek: EngagementDetail (PR-2a, 440) melebar ke 480. */
const SHEET_W: Record<OverlaySize, number> = { sm: 480, md: 600, lg: 780, xl: 940 };

export function panelGeometry(variant: OverlayVariant, size: OverlaySize): OvStyle {
  if (variant === 'sheet') {
    return { width: `min(${SHEET_W[size]}px, 94vw)`, height: '100%', maxHeight: '100%', borderRadius: 0 };
  }
  if (variant === 'page') {
    /* DEPRECATED — bentuk warisan "halaman menyamar modal". Ada HANYA agar
       migrasi Fase A tak mengubah piksel; objeknya dipindah ke rute di Fase C.
       Jangan pakai untuk overlay baru. */
    return { width: 1000, maxWidth: '96vw', height: '92vh' };
  }
  /* modal: tinggi MENGIKUTI ISI (maxHeight), tak pernah dipaku. */
  return { width: MODAL_W[size], maxWidth: '96vw', maxHeight: '94vh' };
}

type CloseSource = 'escape' | 'backdrop' | 'action';

export type OverlayProps = {
  /** Render hanya bila true (default true) — pemakai boleh menghias sendiri. */
  open?: boolean;
  onClose: () => void;
  variant?: OverlayVariant;
  size?: OverlaySize;
  zLayer?: ZLayer;
  /** Header standar bertombol-tutup. Diabaikan bila `header` diberikan. */
  title?: OvNode;
  /** Header kustom (mis. bilah gradien + tab). Dibungkus id label aria. */
  header?: OvNode;
  footer?: OvNode;
  /** Label aria bila header kustom tak memuat judul teks. */
  labelText?: string;
  /** false = Escape & backdrop TIDAK menutup (overlay ber-form wajib tombol). */
  dismissable?: boolean;
  /** Ada perubahan belum tersimpan? → tutup meminta konfirmasi dulu. */
  isDirty?: () => boolean;
  discardPrompt?: string;
  panelClassName?: string;
  panelStyle?: OvStyle;
  bodyStyle?: OvStyle;
  children?: OvNode;
};

function Overlay(props: OverlayProps) {
  const {
    open = true, onClose, variant = 'modal', size = 'md', zLayer,
    title, header, footer, labelText,
    dismissable = true, isDirty,
    discardPrompt = 'Ada perubahan yang belum tersimpan pada formulir ini. Tutup dan buang perubahan tersebut?',
    panelClassName = '', panelStyle, bodyStyle, children,
  } = props;

  const panelRef: { current: HTMLElement | null } = useRefOV(null);
  const triggerRef: { current: HTMLElement | null } = useRefOV(null);
  const [askDiscard, setAskDiscard]: [boolean, (v: boolean) => void] = useStateOV(false);
  const titleId: string = useIdOV();

  const requestClose: (source: CloseSource) => void = useCallbackOV((source: CloseSource) => {
    if (source !== 'action' && dismissable === false) return;
    if (typeof isDirty === 'function' && isDirty()) { setAskDiscard(true); return; }
    onClose();
  }, [dismissable, isDirty, onClose]);

  /* Escape + focus trap. Saat prompt "buang perubahan" terbuka, overlay INI
     berhenti mendengar agar Escape hanya ditangani prompt (yang paling atas). */
  useEffectOV(() => {
    if (!open || askDiscard || typeof document === 'undefined') return undefined;
    const onKey = (ev: KeyboardEvent): void => {
      if (ev.key === 'Escape') { ev.stopPropagation(); requestClose('escape'); return; }
      if (ev.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = focusableWithin(panel);
      if (items.length === 0) { ev.preventDefault(); panel.focus(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const inside = active != null && panel.contains(active);
      if (ev.shiftKey && (active === first || !inside)) { ev.preventDefault(); last.focus(); return; }
      if (!ev.shiftKey && (active === last || !inside)) { ev.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('keydown', onKey, true); };
  }, [open, askDiscard, requestClose]);

  /* Fokus masuk ke panel saat buka; DIPULIHKAN ke elemen pemicu saat tutup. */
  useEffectOV(() => {
    if (!open || typeof document === 'undefined') return undefined;
    const active = document.activeElement;
    triggerRef.current = active instanceof HTMLElement ? active : null;
    if (panelRef.current) panelRef.current.focus();
    return () => {
      const back = triggerRef.current;
      triggerRef.current = null;
      if (back && document.contains(back)) back.focus();
    };
  }, [open]);

  /* Scroll lock — bertumpuk aman lewat counter. */
  useEffectOV(() => {
    if (!open) return undefined;
    lockScroll();
    return () => { unlockScroll(); };
  }, [open]);

  if (!open) return null;

  const zi: number = Z[zLayer || (variant === 'sheet' ? 'sheet' : 'modal')];
  const isSheet = variant === 'sheet';
  const labelled = header != null || title != null;

  const onBackdropMouseDown = (ev: { target: EventTarget | null; currentTarget: EventTarget | null }): void => {
    /* mousedown (bukan click) + target===currentTarget: seleksi teks yang
       dilepas di luar panel tak lagi ikut menutup overlay. */
    if (ev.target !== ev.currentTarget) return;
    requestClose('backdrop');
  };

  return (
    <>
      <div
        className={'ov-backdrop ov-' + variant}
        style={{
          position: 'fixed', inset: 0, zIndex: zi, background: 'rgba(0,20,30,.42)',
          display: 'flex',
          alignItems: isSheet ? 'stretch' : 'center',
          justifyContent: isSheet ? 'flex-end' : 'center',
          padding: isSheet ? 0 : 16,
        }}
        onMouseDown={onBackdropMouseDown}
      >
        <div
          ref={panelRef}
          className={'panel ov-panel ' + panelClassName}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelled ? titleId : undefined}
          aria-label={labelled ? undefined : labelText}
          tabIndex={-1}
          style={{
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: 'var(--shadow-lg)', padding: 0, outline: 'none',
            ...panelGeometry(variant, size),
            ...(panelStyle || {}),
          }}
        >
          {header != null ? (
            <div id={titleId} style={{ flex: '0 0 auto' }}>{header}</div>
          ) : title != null ? (
            <div className="ov-head" style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
              <div id={titleId} style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 15 }}>{title}</div>
              <button className="top-btn" aria-label="Tutup" onClick={() => requestClose('action')}><I.x size={16} /></button>
            </div>
          ) : null}

          <div className="ov-body" style={{ flex: 1, minHeight: 0, overflow: 'auto', ...(bodyStyle || {}) }}>
            {children}
          </div>

          {footer != null ? <div className="ov-foot" style={{ flex: '0 0 auto' }}>{footer}</div> : null}
        </div>
      </div>

      {askDiscard && (
        <Overlay
          variant="modal"
          size="sm"
          zLayer="confirm"
          labelText="Konfirmasi buang perubahan"
          onClose={() => setAskDiscard(false)}
          footer={(
            <div className="row jb ac" style={{ padding: '11px 16px', borderTop: '1px solid var(--line)', background: 'var(--surface-2)' }}>
              <button className="btn sm" onClick={() => setAskDiscard(false)}>Kembali menyunting</button>
              <button className="btn sm" style={{ background: 'var(--red-solid)', borderColor: 'var(--red-solid)', color: '#fff' }} onClick={() => { setAskDiscard(false); onClose(); }}>
                Buang perubahan
              </button>
            </div>
          )}
        >
          <div style={{ padding: '15px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--amber)', flex: '0 0 auto', marginTop: 1 }}><I.alert size={16} /></span>
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>{discardPrompt}</div>
          </div>
        </Overlay>
      )}
    </>
  );
}

Object.assign(window, { Overlay, Z_OVERLAY: Z });

export { Overlay };
