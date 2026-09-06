/* Shared front-end helpers — Royal Mail Express International */
(function () {
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));

  window.$ = $;
  window.$$ = $$;

  async function api(url, opts = {}) {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      ...opts,
    });
    let data = null;
    try { data = await res.json(); } catch (e) { /* non-json */ }
    if (!res.ok || (data && data.ok === false)) {
      const msg = (data && data.error) || `Request failed (${res.status})`;
      throw new Error(msg);
    }
    return data;
  }
  window.api = api;

  /* ---------- toasts ---------- */
  function ensureWrap() {
    let w = $('#toast-wrap');
    if (!w) { w = document.createElement('div'); w.id = 'toast-wrap'; document.body.appendChild(w); }
    return w;
  }
  function toast(msg, type = 'info', ms = 5200) {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<span>${escHtml(msg)}</span>`;
    ensureWrap().appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .4s'; setTimeout(() => t.remove(), 400); }, ms);
  }
  window.toast = (m, t) => toast(m, t);

  /* ---------- tiny utilities ---------- */
  window.escHtml = escHtml;
  function escHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  window.money = (n, cur = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, maximumFractionDigits: cur === 'USD' ? 2 : 0 }).format(Number(n) || 0);

  window.timeAgo = (iso) => {
    if (!iso) return '—';
    const s = Math.max(1, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'just now';
    const m = s / 60; if (m < 60) return `${Math.floor(m)} min ago`;
    const h = m / 60; if (h < 24) return `${Math.floor(h)} hr${h >= 2 ? 's' : ''} ago`;
    const d = h / 24; if (d < 30) return `${Math.floor(d)} day${d >= 2 ? 's' : ''} ago`;
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  window.fmtDT = (iso) => iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
  window.fmtD = (iso) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  /* ---------- status → visual mapping ---------- */
  const STATUS_META = {
    REGISTERED: { label: 'Registered', cls: 'st-active', pill: 'pill-blue' },
    PICKUP_SCHEDULED: { label: 'Pickup scheduled', cls: 'st-active', pill: 'pill-blue' },
    PICKED_UP: { label: 'Picked up', cls: 'st-active', pill: 'pill-blue' },
    ARRIVED_ORIGIN_HUB: { label: 'At origin hub', cls: 'st-active', pill: 'pill-blue' },
    EXPORT_SCAN: { label: 'Export cleared', cls: 'st-active', pill: 'pill-blue' },
    DEPARTED_ORIGIN: { label: 'Departed origin', cls: 'st-active', pill: 'pill-blue' },
    IN_TRANSIT: { label: 'In transit', cls: 'st-active', pill: 'pill-gold' },
    ARRIVED_GATEWAY: { label: 'Arrived in region', cls: 'st-active', pill: 'pill-gold' },
    CUSTOMS_CLEARANCE: { label: 'Customs clearance', cls: 'st-active', pill: 'pill-amber' },
    CUSTOMS_CLEARED: { label: 'Customs cleared', cls: 'st-active', pill: 'pill-amber' },
    OUT_FOR_DELIVERY: { label: 'Out for delivery', cls: 'st-active', pill: 'pill-gold' },
    DELIVERED: { label: 'Delivered', cls: 'st-done', pill: 'pill-green' },
    ON_HOLD: { label: 'On hold', cls: 'st-exc', pill: 'pill-red' },
    ADDRESS_ISSUE: { label: 'Address issue', cls: 'st-exc', pill: 'pill-red' },
  };
  window.statusMeta = (code) => STATUS_META[code] || { label: code, cls: 'st-todo', pill: 'pill-gray' };
  window.STATUS_META = STATUS_META;

  /* ---------- nav ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    const btn = $('.menu-btn');
    if (btn) btn.addEventListener('click', () => $('nav.main')?.classList.toggle('open'));
    // copy buttons
    $$('[data-copy]').forEach((el) => el.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(el.getAttribute('data-copy')); toast('Copied to clipboard', 'ok', 2200); }
      catch { toast('Copy not supported here', 'err'); }
    }));
  });
})();
