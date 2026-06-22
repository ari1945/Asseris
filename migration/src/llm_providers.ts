/* ============================================================
   Asseris — Registry Provider LLM (FASE 1 · plain JS IIFE)
   Sumber tunggal daftar provider model bahasa + pembaca konfigurasi
   yang tersimpan di Pengaturan › AI & LLM (ams.v1.settings → .ai).

   CATATAN PROTOTIPE: aplikasi ini TIDAK memanggil API nyata. Panel
   pengaturan menyimpan pilihan provider/kunci/model & menampilkan
   status simulatif. Untuk produksi, panggilan harus lewat PROXY
   SERVER (kunci di server, auth, rate-limit, redaksi PII) — bukan
   dari browser (CORS & kunci terekspos). Lihat catatan `browser`.
   ============================================================ */
(function () {
  /* tiap provider: SATU model default (sesuai keputusan desain).
     browser: 'expose' = bisa dipanggil dari browser tetapi kunci API
     terekspos di klien · 'proxy' = diblokir CORS / wajib proxy server. */
  const PROVIDERS = [
    {
      id: 'openai', label: 'OpenAI', short: 'OpenAI', initials: 'AI', accent: '#10a37f',
      model: 'gpt-4o', modelLabel: 'GPT-4o',
      keyPrefix: 'sk-', keyPlaceholder: 'sk-····················',
      baseUrl: 'https://api.openai.com/v1', endpoint: 'POST /chat/completions',
      browser: 'expose', compat: 'OpenAI',
      note: 'Kompatibel luas. Dari browser kunci API akan terekspos — gunakan proxy server untuk produksi.',
    },
    {
      id: 'anthropic', label: 'Anthropic', short: 'Anthropic', initials: 'An', accent: '#d97757',
      model: 'claude-sonnet-4-5', modelLabel: 'Claude Sonnet 4.5',
      keyPrefix: 'sk-ant-', keyPlaceholder: 'sk-ant-················',
      baseUrl: 'https://api.anthropic.com/v1', endpoint: 'POST /messages',
      browser: 'proxy', compat: 'Anthropic Messages',
      note: 'Panggilan langsung dari browser diblokir secara default (CORS). Wajib lewat proxy server.',
    },
    {
      id: 'gemini', label: 'Google Gemini', short: 'Gemini', initials: 'Ge', accent: '#4285f4',
      model: 'gemini-2.5-pro', modelLabel: 'Gemini 2.5 Pro',
      keyPrefix: 'AIza', keyPlaceholder: 'AIza··························',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta', endpoint: 'POST /models/{model}:generateContent',
      browser: 'expose', compat: 'Google AI',
      note: 'Kunci dikirim sebagai parameter — terekspos di klien. Gunakan proxy untuk produksi.',
    },
    {
      id: 'kimi', label: 'Moonshot Kimi', short: 'Kimi', initials: 'Ki', accent: '#5b5bd6',
      model: 'kimi-k2', modelLabel: 'Kimi K2',
      keyPrefix: 'sk-', keyPlaceholder: 'sk-····················',
      baseUrl: 'https://api.moonshot.cn/v1', endpoint: 'POST /chat/completions',
      browser: 'proxy', compat: 'OpenAI',
      note: 'API kompatibel-OpenAI. CORS terbatas — disarankan melalui proxy server.',
    },
    {
      id: 'deepseek', label: 'DeepSeek', short: 'DeepSeek', initials: 'Ds', accent: '#4d6bfe',
      model: 'deepseek-chat', modelLabel: 'DeepSeek-V3',
      keyPrefix: 'sk-', keyPlaceholder: 'sk-····················',
      baseUrl: 'https://api.deepseek.com/v1', endpoint: 'POST /chat/completions',
      browser: 'expose', compat: 'OpenAI',
      note: 'API kompatibel-OpenAI. Dari browser kunci terekspos — gunakan proxy untuk produksi.',
    },
  ];
  const BY_ID: any = {};
  PROVIDERS.forEach((p: any) => { BY_ID[p.id] = p; });

  const DEFAULTS = { provider: 'anthropic', keys: {}, baseUrls: {}, share: true, temperature: 'standar' };

  function readSettings() {
    try { return JSON.parse(localStorage.getItem('ams.v1.settings') || '{}'); } catch (e) { return {}; }
  }

  /* konfigurasi LLM aktif yang sudah ter-resolve (provider + model + kunci). */
  function amsLLMConfig() {
    const ai = Object.assign({}, DEFAULTS, (readSettings().ai || {}));
    const prov = BY_ID[ai.provider] || BY_ID[DEFAULTS.provider];
    const key = (ai.keys && ai.keys[prov.id]) || '';
    const baseUrl = (ai.baseUrls && ai.baseUrls[prov.id]) || prov.baseUrl;
    return {
      provider: prov.id, providerLabel: prov.label, short: prov.short, accent: prov.accent,
      model: prov.model, modelLabel: prov.modelLabel,
      hasKey: !!(key && key.trim()), keyMasked: maskKey(key),
      baseUrl, browser: prov.browser, note: prov.note, compat: prov.compat,
      share: ai.share !== false, temperature: ai.temperature || 'standar',
    };
  }

  function maskKey(k: any) {
    k = (k || '').trim();
    if (!k) return '';
    if (k.length <= 8) return k[0] + '••••';
    return k.slice(0, 5) + '••••••••' + k.slice(-3);
  }

  /* status simulatif untuk badge ringkas (header co-pilot, dst). */
  function amsLLMStatus() {
    const c = amsLLMConfig();
    if (!c.hasKey) return { ok: false, level: 'unset', label: 'Belum dikonfigurasi', cfg: c };
    if (c.browser === 'proxy') return { ok: true, level: 'proxy', label: 'Aktif · via proxy', cfg: c };
    return { ok: true, level: 'ready', label: 'Aktif', cfg: c };
  }

  (window as any).AMS_LLM = { PROVIDERS, BY_ID, DEFAULTS };
  (window as any).amsLLMConfig = amsLLMConfig;
  (window as any).amsLLMStatus = amsLLMStatus;
  (window as any).amsLLMMaskKey = maskKey;
})();


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export const AMS_LLM = (window as any).AMS_LLM;
export const amsLLMConfig = (window as any).amsLLMConfig;
export const amsLLMMaskKey = (window as any).amsLLMMaskKey;
export const amsLLMStatus = (window as any).amsLLMStatus;
