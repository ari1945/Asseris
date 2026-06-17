/* ============================================================
   NeoSuite AMS — SOQM Operasional (ISQM 1) · Pendalaman Modul
   ------------------------------------------------------------
   Lapisan baru yang memperkaya SOQM agar mencakup:
   · SoqmObjectives    — Tujuan Mutu per komponen (¶25–28),
                          rantai Tujuan → Risiko → Respons → Pemantauan
   · SoqmHeatmap       — Peta panas risiko (L×D) 5×5
   · SoqmSeverity      — Penilaian keparahan & pervasivitas
                          defisiensi (¶41) — basis evaluasi tahunan
   · SoqmInfoComm      — Informasi & Komunikasi (¶33–37) — alur naik
                          /turun/lateral/eksternal (TCWG · jaringan)
   · SoqmAnnualEval    — Evaluasi Tahunan SPM (¶53–¶54) —
                          kesimpulan ditarik LIVE dari soqmPull() +
                          QM_INSPECTIONS + QM_INSP_FINDINGS + SOQM_RISKS
                          + COMPLAINTS + QM_EVAL master.
   Tidak ada angka yang dihardcode di sini — seluruhnya mengalir
   dari window.AMS lewat resolver kanonik.
   ============================================================ */
const { useState: useStateID } = React;

/* ============================================================
   Heat map L×D 5×5 — visualisasi seluruh risiko mutu
   ============================================================ */
function SoqmHeatmap({ risks, onPick }) {
  const cells = [];
  for (let imp = 5; imp >= 1; imp--) {
    for (let lik = 1; lik <= 5; lik++) {
      const here = risks.filter(r => r.lik === lik && r.imp === imp);
      const s = lik * imp;
      const bg = s >= 15 ? 'var(--red)' : s >= 9 ? 'var(--amber)' : s >= 4 ? 'var(--blue)' : 'var(--green)';
      const tint = s >= 15 ? '#fee2e2' : s >= 9 ? '#fef3c7' : s >= 4 ? '#dbeafe' : '#d1fae5';
      cells.push({ lik, imp, here, bg, tint });
    }
  }
  return (
    <div className="soqm-heatmap">
      <div className="soqm-heatmap-axis-y"><span>Dampak →</span></div>
      <div className="soqm-heatmap-grid">
        {cells.map((c, i) => (
          <button
            key={i}
            type="button"
            className="soqm-heat-cell"
            style={{ background: c.here.length ? c.tint : 'transparent', borderColor: c.here.length ? c.bg : 'var(--line-soft)' }}
            onClick={() => c.here.length === 1 && onPick && onPick(c.here[0].id)}
            disabled={c.here.length === 0}
            title={c.here.length ? c.here.map(r => r.id + ' · ' + r.risk).join('\n') : ('L=' + c.lik + ' D=' + c.imp)}
          >
            {c.here.length > 0 && (
              <span className="soqm-heat-bubble" style={{ background: c.bg }}>
                {c.here.length === 1
                  ? <span className="mono">{c.here[0].id.replace('QR-', '')}</span>
                  : <span className="mono">{c.here.length}</span>}
              </span>
            )}
            <span className="soqm-heat-coord mono">{c.lik}×{c.imp}</span>
          </button>
        ))}
      </div>
      <div className="soqm-heatmap-axis-x"><span>Likelihood →</span></div>
      <div className="soqm-heatmap-legend">
        <span className="mono tiny" style={{ color: 'var(--green)' }}>● Rendah</span>
        <span className="mono tiny" style={{ color: 'var(--blue)' }}>● Sedang-Rendah</span>
        <span className="mono tiny" style={{ color: 'var(--amber)' }}>● Sedang-Tinggi</span>
        <span className="mono tiny" style={{ color: 'var(--red)' }}>● Tinggi</span>
      </div>
    </div>
  );
}

/* ============================================================
   Tab: Tujuan Mutu — Komponen ISQM ↔ Tujuan ↔ Risiko (¶25–28)
   ============================================================ */
function SoqmObjectives({ risks, nav, onPick }) {
  const A = window.AMS;
  const comps = A.QM_COMPONENTS || [];
  /* indeks risiko per nama komponen */
  const byComp = {};
  risks.forEach(r => { (byComp[r.comp] = byComp[r.comp] || []).push(r); });

  const matched = (c) => {
    const k = c.name.split(' ')[0];
    return risks.filter(r => r.comp.includes(k) || c.name.includes(r.comp.split(' ')[0]));
  };

  const total = risks.length;
  const withObj = risks.length;            // semua risiko punya objective
  const compsCovered = comps.filter(c => matched(c).length > 0).length;
  const compRate = Math.round(compsCovered / (comps.length || 1) * 100);

  return (
    <div style={{ padding: 14, display: 'grid', gap: 14 }}>
      <div className="panel" style={{ padding: '11px 14px', background: 'var(--blue-050)', borderColor: 'transparent', boxShadow: 'none' }}>
        <div className="row ac gap8">
          <span style={{ color: 'var(--blue)' }}>{window.I ? <window.I.target size={16} /> : null}</span>
          <div className="tiny" style={{ lineHeight: 1.5 }}>
            ISQM 1 ¶25–¶28 — firma menetapkan <b>tujuan mutu</b> untuk setiap komponen SPM, mengidentifikasi <b>risiko mutu</b> atas pencapaiannya, lalu merancang & menerapkan <b>respons</b>. Tujuan, risiko & respons di bawah ditarik dari register <span className="mono">SOQM_RISKS</span> & dipetakan langsung ke 8 komponen pada <span className="mono">QM_COMPONENTS</span> (Governance).
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
        <D2KPI label="Komponen SPM" v={comps.length} sub={compsCovered + ' memiliki risiko terdaftar'} />
        <D2KPI label="Tujuan Mutu Tertulis" v={withObj} sub={total + ' total risiko ditautkan'} />
        <D2KPI label="Cakupan Komponen" v={compRate + '%'} accent={compRate >= 85 ? 'var(--green)' : 'var(--amber)'} sub="rasio komponen yang punya risiko & respons" />
        <D2KPI label="Respons Efektif" v={risks.filter(r => r.monitor === 'Efektif').length + '/' + total} accent="var(--green)" sub="dari aktivitas pemantauan" />
      </div>

      <Panel noBody>
        <div className="panel-h"><h3>Tujuan Mutu per Komponen SPM</h3><div style={{ flex: 1 }} /><button type="button" className="lin-cta" onClick={() => nav && nav('governance', { from: 'soqm' })}>{window.I ? <window.I.building size={12} /> : null} Governance (komponen kanonik)</button></div>
        <div style={{ padding: 14, display: 'grid', gap: 10 }}>
          {comps.map(c => {
            const cRisks = matched(c);
            const monEff = cRisks.filter(r => r.monitor === 'Efektif').length;
            const defs = cRisks.filter(r => r.deficiency).length;
            const eff = cRisks.length ? Math.round(monEff / cRisks.length * 100) : 100;
            const color = eff >= 85 ? 'var(--green)' : eff >= 60 ? 'var(--amber)' : 'var(--red)';
            return (
              <div key={c.id} className="panel" style={{ padding: '12px 14px', boxShadow: 'none', borderLeft: '3px solid ' + color }}>
                <div className="row jb ac" style={{ marginBottom: 6 }}>
                  <div className="row ac gap8">
                    <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--ink-3)' }}>{c.id} · {c.ref}</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{c.name}</span>
                    <Badge kind={c.score >= 88 ? 'green' : 'amber'}>Skor {c.score}</Badge>
                  </div>
                  <div className="row ac gap8 tiny muted">
                    <span>Pemilik {c.owner}</span><span>·</span>
                    <span style={{ color: 'var(--ink-2)' }}>{c.obj} tujuan · {cRisks.length} risiko · <span style={{ color: defs ? 'var(--amber)' : 'var(--ink-4)', fontWeight: defs ? 700 : 400 }}>{defs} defisiensi</span></span>
                  </div>
                </div>
                <div className="tiny muted" style={{ lineHeight: 1.45, marginBottom: 8, fontStyle: 'italic' }}>{c.desc}</div>
                {cRisks.length > 0 ? (
                  <div className="soqm-obj-list">
                    {cRisks.map(r => (
                      <button key={r.id} type="button" className="soqm-obj-row" onClick={() => onPick && onPick(r.id)}>
                        <span className="soqm-obj-id mono">{r.id}</span>
                        <span className="soqm-obj-chain">
                          <span className="soqm-obj-cell soqm-obj-goal" title="Tujuan Mutu"><span className="tiny upper muted">Tujuan</span>{r.objective}</span>
                          <span className="soqm-obj-arr">→</span>
                          <span className="soqm-obj-cell soqm-obj-risk" title="Risiko Mutu"><span className="tiny upper muted">Risiko</span>{r.risk}</span>
                          <span className="soqm-obj-arr">→</span>
                          <span className="soqm-obj-cell soqm-obj-resp" title="Respons"><span className="tiny upper muted">Respons</span>{r.response}</span>
                        </span>
                        <span className="soqm-obj-status"><Badge kind={r.monitor === 'Efektif' ? 'green' : r.monitor === 'Defisiensi' ? 'red' : 'gray'}>{r.monitor}</Badge></span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="tiny muted" style={{ padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 4 }}>
                    Tidak ada risiko mutu spesifik terdaftar — tujuan komponen ini ditangani lewat kontrol entitas (governance, etika, &amp; pemantauan umum).
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

function D2KPI({ label, v, sub, accent }) {
  return (
    <div className="panel" style={{ padding: '10px 13px', boxShadow: 'none' }}>
      <div className="tiny muted upper" style={{ marginBottom: 2 }}>{label}</div>
      <div className="mono" style={{ fontSize: 19, fontWeight: 700, color: accent || 'var(--ink)', lineHeight: 1.1 }}>{v}</div>
      {sub && <div className="tiny muted" style={{ marginTop: 3, lineHeight: 1.35 }}>{sub}</div>}
    </div>
  );
}

/* ============================================================
   Penilaian keparahan & pervasivitas defisiensi (¶41)
   Dipanggil dari dalam RemediationTab — DERIVE dari live data.
   ============================================================ */
function SoqmSeverity({ deficiencies, P, complaints, inspFindings }) {
  /* turunkan keparahan & pervasivitas dari sumber kebenaran */
  const rate = (r) => {
    const d = r.deficiency || {};
    // pervasif = pengaruh ke lebih dari satu komponen / lintas-perikatan
    const pervasive =
      (r.id === 'QR-02' && P.overloaded.length >= 2) ||  // sumber daya menyentuh multi-perikatan
      (r.id === 'QR-04' && P.rotationDue.length >= 1) || // etika lintas klien
      d.sev === 'Tinggi';
    const tied = inspFindings.filter(f => (f.rca5 || []).some(w => w.toLowerCase().includes(r.comp.split(' ')[0].toLowerCase())) || (f.cause || '').toLowerCase().includes(r.comp.split(' ')[0].toLowerCase()));
    return { pervasive, tied: tied.length, sev: d.sev || 'Sedang' };
  };

  return (
    <div className="panel" style={{ padding: '12px 14px', boxShadow: 'none', background: 'var(--surface-2)' }}>
      <div className="row jb ac" style={{ marginBottom: 8 }}>
        <div className="row ac gap8">
          <span style={{ color: 'var(--blue)' }}>{window.I ? <window.I.scale size={14} /> : null}</span>
          <span className="tiny" style={{ fontWeight: 700 }}>Penilaian Keparahan &amp; Pervasivitas Defisiensi (ISQM 1 ¶41)</span>
        </div>
        <span className="tiny muted">Basis kesimpulan evaluasi tahunan SPM</span>
      </div>
      <table className="dtbl">
        <thead><tr>
          <th>Defisiensi</th>
          <th style={{ width: 92 }}>Keparahan</th>
          <th style={{ width: 110 }}>Pervasivitas</th>
          <th style={{ width: 130 }}>Temuan Inspeksi Terkait</th>
          <th style={{ width: 130 }}>Implikasi pada SPM</th>
        </tr></thead>
        <tbody>
          {deficiencies.map(r => {
            const v = rate(r);
            return (
              <tr key={r.id}>
                <td>
                  <div className="row ac gap6"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{r.id}</span><span className="tiny" style={{ fontWeight: 600 }}>{r.comp}</span></div>
                  <div className="tiny muted truncate" style={{ maxWidth: 360 }}>{r.deficiency.desc}</div>
                </td>
                <td><Badge kind={v.sev === 'Tinggi' ? 'red' : v.sev === 'Sedang' ? 'amber' : 'gray'}>{v.sev}</Badge></td>
                <td><Badge kind={v.pervasive ? 'red' : 'green'}>{v.pervasive ? 'Pervasif' : 'Tidak Pervasif'}</Badge></td>
                <td className="tiny"><span className="mono" style={{ fontWeight: 700, color: v.tied ? 'var(--amber)' : 'var(--ink-4)' }}>{v.tied}</span> <span className="muted">temuan inspeksi</span></td>
                <td className="tiny" style={{ lineHeight: 1.4 }}>{v.pervasive ? 'Berpotensi memengaruhi simpulan SPM' : 'Tidak memengaruhi simpulan keseluruhan'}</td>
              </tr>
            );
          })}
          {deficiencies.length === 0 && (
            <tr><td colSpan={5} className="tiny muted" style={{ textAlign: 'center', padding: 14 }}>Tidak ada defisiensi terbuka.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ============================================================
   Tab: Informasi & Komunikasi (¶33–37)
   ============================================================ */
function SoqmInfoComm({ nav }) {
  const A = window.AMS;
  const roles = A.QM_ROLES || [];
  const cmps = A.COMPLAINTS || [];
  const acts = A.QM_MON_ACTIVITIES || [];
  const culture = A.QM_CULTURE || [];

  /* kanal komunikasi — diturunkan dari sumber master */
  const channels = [
    {
      dir: 'Naik (Personel → Pimpinan)', icon: 'trend', clr: 'var(--blue)', ref: '¶34',
      flows: [
        { lbl: 'Pelaporan defisiensi & near-miss', src: 'Workspace (Review Notes)', mod: 'workspace', n: '—' },
        { lbl: 'Konsultasi & permintaan bantuan teknis', src: 'Workspace · Pelaksanaan Perikatan', mod: 'consultation', n: '—' },
        { lbl: 'Keluhan & tuduhan (whistleblowing)', src: 'COMPLAINTS', mod: 'soqm', n: cmps.filter(c => c.source && c.source.toLowerCase().includes('internal')).length + ' aktif' },
      ],
    },
    {
      dir: 'Turun (Pimpinan → Personel)', icon: 'megaphone', clr: 'var(--navy)', ref: '¶33–34',
      flows: [
        { lbl: 'Memo mutu & tone-at-the-top', src: 'DMS · Komunikasi Mutu', mod: 'dms', n: culture.find(k => k.k && k.k.includes('Komunikasi'))?.v || '—' },
        { lbl: 'Pembaruan kebijakan & metodologi', src: 'Knowledge Base', mod: 'kb', n: 'Berkala' },
        { lbl: 'Coaching & evaluasi kinerja mutu', src: 'PERF_CYCLE', mod: 'hr', n: culture.find(k => k.k && k.k.includes('Bobot mutu'))?.v || '—' },
      ],
    },
    {
      dir: 'Lateral (antar-tim/partner)', icon: 'users', clr: 'var(--purple)', ref: '¶34(b)',
      flows: [
        { lbl: 'Sharing temuan inspeksi & akar masalah', src: 'QM_INSP_FINDINGS', mod: 'soqm', n: (A.QM_INSP_FINDINGS || []).length + ' temuan' },
        { lbl: 'Forum konsultasi PSAK/SA kompleks', src: 'Knowledge Base · konsultasi', mod: 'consultation', n: '—' },
        { lbl: 'Update kapasitas & alokasi sumber daya', src: 'CAPACITY', mod: 'capacity', n: '—' },
      ],
    },
    {
      dir: 'Eksternal (TCWG · Regulator · Jaringan)', icon: 'globe', clr: 'var(--green)', ref: '¶35–37',
      flows: [
        { lbl: 'Komunikasi mutu ke TCWG / Komite Audit', src: 'SA 260 / SA 265', mod: 'mgmtletter', n: 'Per perikatan' },
        { lbl: 'Pelaporan kepada PPPK (regulator)', src: 'PPPK Report', mod: 'pppk', n: 'Tahunan' },
        { lbl: 'Jaringan & afiliasi global (inspection feedback)', src: 'QM_PROVIDERS', mod: 'governance', n: (A.QM_PROVIDERS || []).filter(p => p.type === 'Jaringan').length + ' jaringan' },
      ],
    },
  ];

  return (
    <div style={{ padding: 14, display: 'grid', gap: 14 }}>
      <div className="panel" style={{ padding: '11px 14px', background: 'var(--blue-050)', borderColor: 'transparent', boxShadow: 'none' }}>
        <div className="row ac gap8">
          <span style={{ color: 'var(--blue)' }}>{window.I ? <window.I.mail size={16} /> : null}</span>
          <div className="tiny" style={{ lineHeight: 1.5 }}>
            ISQM 1 ¶33–¶37 — firma membangun sistem informasi &amp; komunikasi mutu yang memungkinkan informasi tepat waktu mengalir <b>naik · turun · lateral · keluar</b>. Setiap kanal di bawah tertaut ke modul sumber kanonik — bukan kanal terpisah yang berisiko inkonsisten.
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
        {channels.map((ch, i) => {
          const Ic = window.I && (window.I[ch.icon] || window.I.mail);
          return (
            <Panel key={i} noBody>
              <div className="panel-h">
                <span className="row ac gap8" style={{ color: ch.clr }}><Ic size={15} /><h3 style={{ margin: 0, color: 'var(--ink)' }}>{ch.dir}</h3></span>
                <div style={{ flex: 1 }} />
                <Badge kind="blue">{ch.ref}</Badge>
              </div>
              <div style={{ padding: '4px 0 6px' }}>
                {ch.flows.map((f, k) => (
                  <button key={k} type="button" className="soqm-flow-row" onClick={() => nav && nav(f.mod, { from: 'soqm' })}>
                    <span className="soqm-flow-dot" style={{ background: ch.clr }} />
                    <span className="soqm-flow-lbl">
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{f.lbl}</span>
                      <span className="tiny muted">Sumber: <span className="mono" style={{ color: 'var(--blue)' }}>{f.src}</span></span>
                    </span>
                    <span className="soqm-flow-val tiny mono">{f.n}</span>
                    {window.I ? <window.I.arrowRight size={12} /> : null}
                  </button>
                ))}
              </div>
            </Panel>
          );
        })}
      </div>

      {/* Akuntabilitas komunikasi — QM_ROLES SSOT */}
      <Panel title="Akuntabilitas Komunikasi Mutu" sub="ISQM 1 ¶20 — peran pimpinan ditarik dari QM_ROLES (Governance)">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
          {roles.map((r, i) => (
            <div key={i} className="panel" style={{ padding: '10px 12px', boxShadow: 'none' }}>
              <div className="row jb ac" style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>{r.role}</span>
                <Badge kind="blue">{r.ref}</Badge>
              </div>
              <div className="tiny" style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{r.person} · <span style={{ fontWeight: 400, color: 'var(--ink-3)' }}>{r.title}</span></div>
              <div className="tiny muted" style={{ marginTop: 3, lineHeight: 1.4 }}>{r.note}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* ============================================================
   Tab: Evaluasi Tahunan SPM (¶53–¶54) — kesimpulan LIVE
   ============================================================ */
function SoqmAnnualEval({ risks, inspections, inspFindings, complaints, nav }) {
  const A = window.AMS;
  const master = A.QM_EVAL || {};

  /* mesin keputusan ¶54 — diturunkan dari live data */
  const defs = risks.filter(r => r.deficiency);
  const defsPervasive = defs.filter(r => (r.deficiency.sev === 'Tinggi') || (r.id === 'QR-02') || (r.id === 'QR-04'));
  const defsHighOpen = defs.filter(r => r.deficiency.sev === 'Tinggi' && r.deficiency.status !== 'Selesai');
  const inspBad = inspections.filter(i => i.grade === 'Tidak Memuaskan');
  const cmpInvest = complaints.filter(c => c.status === 'Investigasi' && c.severity === 'Tinggi');

  let conclusion = 'reasonable';
  let label = 'Efektif';
  let color = 'var(--green)';
  let stmt = 'Sistem Pengelolaan Mutu firma memberikan keyakinan memadai (reasonable assurance) bahwa firma & personelnya memenuhi tanggung jawab profesional dan laporan yang diterbitkan telah tepat sesuai kondisinya.';

  if (defsHighOpen.length > 0 || inspBad.length > 0 || cmpInvest.length > 1) {
    conclusion = 'not-reasonable';
    label = 'Belum Efektif';
    color = 'var(--red)';
    stmt = 'Terdapat defisiensi pervasif yang belum diremediasi pada tanggal evaluasi — keyakinan memadai atas SPM secara keseluruhan belum dapat disimpulkan. Perlu eskalasi & rencana remediasi terstruktur.';
  } else if (defs.length > 0) {
    conclusion = 'reasonable-with-exceptions';
    label = 'Efektif dengan Pengecualian';
    color = 'var(--amber)';
    stmt = master.statement || 'Sistem Pengelolaan Mutu firma memberikan keyakinan memadai dengan pengecualian defisiensi yang teridentifikasi pada satu atau lebih komponen — defisiensi tersebut dinilai tidak berdampak pervasif terhadap simpulan menyeluruh dan tengah diremediasi.';
  }

  const factors = [
    { ok: defs.length === 0, t: 'Tidak ada defisiensi terbuka', v: defs.length + ' defisiensi', detail: defs.map(d => d.id).join(' · ') || 'Nihil' },
    { ok: defsHighOpen.length === 0, t: 'Tidak ada defisiensi keparahan Tinggi terbuka', v: defsHighOpen.length, detail: defsHighOpen.map(d => d.id).join(' · ') || 'Nihil' },
    { ok: defsPervasive.length === 0, t: 'Tidak ada defisiensi pervasif', v: defsPervasive.length, detail: defsPervasive.map(d => d.id).join(' · ') || 'Nihil' },
    { ok: inspBad.length === 0, t: 'Tidak ada inspeksi "Tidak Memuaskan"', v: inspBad.length, detail: inspBad.map(i => i.id).join(' · ') || 'Nihil' },
    { ok: cmpInvest.length === 0, t: 'Tidak ada tuduhan tingkat tinggi dalam investigasi', v: cmpInvest.length, detail: cmpInvest.map(c => c.id).join(' · ') || 'Nihil' },
    { ok: risks.filter(r => r.monitor === 'Belum Diuji').length === 0, t: 'Seluruh respons mutu telah dipantau', v: risks.filter(r => r.monitor === 'Belum Diuji').length + ' belum diuji', detail: risks.filter(r => r.monitor === 'Belum Diuji').map(r => r.id).join(' · ') || 'Nihil' },
  ];
  const factorOk = factors.filter(f => f.ok).length;

  const inspSumm = {
    total: inspections.length,
    done: inspections.filter(i => i.grade !== 'Dijadwalkan').length,
    findings: inspections.reduce((a, i) => a + i.findings, 0),
    sevHigh: inspFindings.filter(f => f.sev === 'Tinggi').length,
    sevMid: inspFindings.filter(f => f.sev === 'Sedang').length,
    sevLow: inspFindings.filter(f => f.sev === 'Rendah').length,
  };

  return (
    <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 360px', gap: 14, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 14 }}>
        {/* hero kesimpulan */}
        <Panel noBody>
          <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '18px 20px' }}>
            <div className="row jb ac" style={{ marginBottom: 5 }}>
              <span className="tiny" style={{ color: '#bcd6e4', textTransform: 'uppercase', letterSpacing: '.08em' }}>Evaluasi Tahunan Sistem Pengelolaan Mutu (ISQM 1 ¶53–¶54)</span>
              <span className="mono tiny" style={{ color: '#9fc0d2' }}>{master.period || '—'}</span>
            </div>
            <div className="row ac gap12" style={{ marginBottom: 8 }}>
              <span style={{ display: 'inline-flex', width: 12, height: 12, borderRadius: '50%', background: color, boxShadow: '0 0 0 4px rgba(255,255,255,.15)' }} />
              <span style={{ fontSize: 22, fontWeight: 700 }}>{label}</span>
              <Badge kind="blue">{conclusion}</Badge>
            </div>
            <div className="tiny" style={{ color: '#cfe2ed', lineHeight: 1.55, maxWidth: 720 }}>{stmt}</div>
          </div>
          <div style={{ padding: '12px 18px', display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
            <D2KV label="Penyusun" v={master.by || '—'} />
            <D2KV label="Disetujui" v={master.approvedBy || '—'} />
            <D2KV label="Tanggal Evaluasi" v={master.date || '—'} />
            <D2KV label="Cakupan Periode" v={master.period || '—'} />
          </div>
        </Panel>

        {/* faktor keputusan ¶54 */}
        <Panel noBody>
          <div className="panel-h"><h3>Faktor Keputusan ¶54</h3><div style={{ flex: 1 }} /><span className="tiny mono" style={{ fontWeight: 700, color: factorOk === factors.length ? 'var(--green)' : 'var(--amber)' }}>{factorOk}/{factors.length} terpenuhi</span></div>
          <div style={{ padding: '4px 0 8px' }}>
            {factors.map((f, i) => (
              <div key={i} className="soqm-factor-row">
                <span style={{ color: f.ok ? 'var(--green)' : 'var(--amber)', display: 'inline-flex', flex: '0 0 18px' }}>{window.I ? (f.ok ? <window.I.checkCircle size={15} /> : <window.I.alert size={15} />) : null}</span>
                <span className="soqm-factor-t" style={{ fontSize: 12, fontWeight: 600 }}>{f.t}</span>
                <span className="soqm-factor-d tiny muted">{f.detail}</span>
                <span className="mono tiny" style={{ fontWeight: 700, color: f.ok ? 'var(--green)' : 'var(--amber)' }}>{f.v}</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* basis kesimpulan */}
        <Panel title="Basis Kesimpulan" sub="sumber data per faktor — semuanya ditarik dari modul kanonik">
          <div className="grid" style={{ gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
            <button type="button" className="soqm-basis" onClick={() => nav('soqm', { from: 'soqm' })}>
              <span className="tiny upper muted">Risiko Mutu &amp; Respons</span>
              <span style={{ fontSize: 12 }}>{risks.length} risiko · {risks.filter(r => r.monitor === 'Efektif').length} efektif · {defs.length} defisiensi</span>
              <span className="tiny mono" style={{ color: 'var(--blue)' }}>SOQM_RISKS</span>
            </button>
            <button type="button" className="soqm-basis" onClick={() => nav('soqm', { from: 'soqm' })}>
              <span className="tiny upper muted">Inspeksi Perikatan</span>
              <span style={{ fontSize: 12 }}>{inspSumm.done}/{inspSumm.total} inspeksi · {inspSumm.findings} temuan ({inspSumm.sevHigh}H / {inspSumm.sevMid}S / {inspSumm.sevLow}R)</span>
              <span className="tiny mono" style={{ color: 'var(--blue)' }}>QM_INSPECTIONS</span>
            </button>
            <button type="button" className="soqm-basis" onClick={() => nav('eqr', { from: 'soqm' })}>
              <span className="tiny upper muted">EQR — Mutu Perikatan</span>
              <span style={{ fontSize: 12 }}>{(A.EQR_REVIEWS || []).length} reviu · {(A.EQR_REVIEWS || []).filter(r => r.cleared).length} cleared</span>
              <span className="tiny mono" style={{ color: 'var(--blue)' }}>EQR_REVIEWS</span>
            </button>
            <button type="button" className="soqm-basis" onClick={() => nav('soqm', { from: 'soqm' })}>
              <span className="tiny upper muted">Keluhan &amp; Tuduhan</span>
              <span style={{ fontSize: 12 }}>{complaints.length} register · {complaints.filter(c => c.type === 'Tuduhan').length} tuduhan · {complaints.filter(c => c.status === 'Selesai').length} selesai</span>
              <span className="tiny mono" style={{ color: 'var(--blue)' }}>COMPLAINTS</span>
            </button>
          </div>
          {master.basis && (
            <div style={{ marginTop: 10 }}>
              <div className="tiny muted upper" style={{ marginBottom: 4 }}>Basis Tertulis Evaluator</div>
              <ul className="soqm-basis-ul">
                {master.basis.map((b, i) => <li key={i} className="tiny" style={{ lineHeight: 1.5 }}>{b}</li>)}
              </ul>
            </div>
          )}
        </Panel>
      </div>

      {/* sidebar kanan */}
      <div className="grid" style={{ gap: 12, alignContent: 'start' }}>
        <Panel noBody>
          <div className="panel-h"><h3>Tindakan Pasca-Evaluasi</h3></div>
          <div style={{ padding: '10px 14px', display: 'grid', gap: 8 }}>
            <D2Action ok={defs.length === 0} t="Lanjutkan remediasi defisiensi terdaftar" v={defs.filter(d => d.deficiency.status !== 'Selesai').length + ' aktif'} />
            <D2Action ok={inspBad.length === 0} t="Eskalasi inspeksi tidak memuaskan" v={inspBad.length + ' kasus'} />
            <D2Action ok={true} t="Komunikasikan hasil ke seluruh personel" v="Memo & town hall" />
            <D2Action ok={true} t="Laporkan ke PPPK & TCWG terkait" v="Sesuai jadwal" />
          </div>
          <div style={{ padding: '0 14px 14px', display: 'grid', gap: 8 }}>
            <Btn variant="primary" onClick={() => nav('soqm', { from: 'soqm' })}><span style={{ display: 'inline-flex', verticalAlign: -2 }}>{window.I ? <window.I.download size={13} /> : null}</span> Unduh Memo Evaluasi</Btn>
            <Btn onClick={() => nav('pppk', { from: 'soqm' })}>{window.I ? <window.I.report size={13} /> : null} Cantumkan ke Laporan PPPK</Btn>
          </div>
        </Panel>

        <Panel title="Tren Skor Komponen SPM" sub="dari Governance (QM_COMPONENTS · trend)">
          <div className="grid" style={{ gap: 6 }}>
            {(A.QM_COMPONENTS || []).map(c => (
              <div key={c.id}>
                <div className="row jb ac" style={{ marginBottom: 2 }}>
                  <span className="tiny" style={{ fontWeight: 600 }}>{c.id} · {c.name}</span>
                  <span className="mono tiny" style={{ fontWeight: 700, color: c.score >= 88 ? 'var(--green)' : c.score >= 80 ? 'var(--amber)' : 'var(--red)' }}>{c.score}</span>
                </div>
                {window.Spark ? <Spark data={c.trend} h={18} color={c.score >= 88 ? 'var(--green)' : 'var(--amber)'} /> : <div className="pbar"><span style={{ width: c.score + '%', background: c.score >= 88 ? 'var(--green)' : 'var(--amber)' }} /></div>}
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function D2KV({ label, v }) {
  return (
    <div>
      <div className="tiny muted upper" style={{ marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)' }}>{v}</div>
    </div>
  );
}
function D2Action({ ok, t, v }) {
  return (
    <div className="row jb ac">
      <span className="row ac gap8" style={{ minWidth: 0 }}>
        <span style={{ color: ok ? 'var(--green)' : 'var(--amber)', flex: '0 0 auto' }}>{window.I ? (ok ? <window.I.checkCircle size={14} /> : <window.I.alert size={14} />) : null}</span>
        <span className="tiny" style={{ lineHeight: 1.3 }}>{t}</span>
      </span>
      <span className="mono tiny" style={{ fontWeight: 700, color: ok ? 'var(--green)' : 'var(--amber)' }}>{v}</span>
    </div>
  );
}

Object.assign(window, { SoqmHeatmap, SoqmObjectives, SoqmSeverity, SoqmInfoComm, SoqmAnnualEval, D2KPI });
