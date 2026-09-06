/**
 * Shared HTML layout for Royal Mail Express International.
 */

const NAV = [
  { href: '/', label: 'Home', id: 'home' },
  { href: '/services.html', label: 'Services & Rates', id: 'services' },
  { href: '/quote.html', label: 'Instant Quote', id: 'quote' },
  { href: '/book.html', label: 'Book a Shipment', id: 'book' },
  { href: '/track.html', label: 'Track Package', id: 'track' },
  { href: '/contact.html', label: 'Contact', id: 'contact' },
];

function navHtml(activeId) {
  const items = NAV.map((n) => `<a href="${n.href}" class="${n.id === activeId ? 'active' : ''}">${n.label}</a>`).join('');
  return `${items}<a href="/admin.html" class="track-cta" title="Operations console">Admin</a>`;
}

function footerHtml({ demo } = {}) {
  const demoNote = demo
    ? `<span style="display:inline-flex;gap:6px;align-items:center"><span class="pill pill-amber">Running on the demo database</span><a href="/admin.html" style="text-decoration:underline">connect Supabase →</a></span>`
    : '';
  return `
  <footer class="footer no-print">
    <div class="wrap">
      <div class="foot-grid">
        <div>
          <div class="brand" style="margin-bottom:12px">
            <img src="/img/logo.png" alt="RME logo" class="badge-3d">
            <div><div class="bn" style="color:#fff">Royal Mail Express</div><div class="bs">International · Africa</div></div>
          </div>
          <p>Express parcels, air freight and consolidated sea cargo from Europe, the USA and Asia to cities across Africa — licensed customs brokerage and live tracking on every single consignment.</p>
          <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
            <a class="btn btn-gold btn-sm" href="/quote.html">Get an instant quote</a>
            <a class="btn btn-white btn-sm" href="/track.html">Track a shipment</a>
          </div>
        </div>
        <div>
          <h4>Ship from</h4>
          <p style="line-height:2"><a href="/quote.html?origin=US">🇺🇸 United States</a><br>
          <a href="/quote.html?origin=UK">🇬🇧 United Kingdom</a><br>
          <a href="/quote.html?origin=CN">🇨🇳 China</a></p>
          <h4>Company</h4>
          <p style="line-height:2"><a href="/about.html">About RME</a><br><a href="/contact.html">Contact &amp; offices</a><br><a href="/services.html">Services &amp; rates</a></p>
        </div>
        <div>
          <h4>Deliver to</h4>
          <p style="line-height:2">
            <a href="/quote.html?to=Kampala">🇺🇬 Kampala · Uganda</a><br>
            <a href="/quote.html?to=Nairobi">🇰🇪 Nairobi · Kenya</a><br>
            <a href="/quote.html?to=Kigali">🇷🇼 Kigali · Rwanda</a><br>
            <a href="/quote.html?to=Juba">🇸🇸 Juba · S. Sudan</a><br>
            <a href="/quote.html?to=Dar%20es%20Salaam">🇹🇿 Dar es Salaam</a><br>
            <a href="/quote.html?to=Kinshasa">🇨🇩 Kinshasa · DRC</a>
          </p>
        </div>
        <div>
          <h4>Head office — Kampala</h4>
          <p>RME House, Plot 17 Kampala Road,<br>P.O. Box 7261, Kampala, Uganda</p>
          <p style="line-height:2">
            ☎ &nbsp;+256 772 300 400 (24/7 desk)<br>
            💬 WhatsApp: +256 772 300 400<br>
            ✉ &nbsp;<a href="mailto:care@royalmail-express.com">care@royalmail-express.com</a><br>
            🕗 Mon–Fri 08:00–18:00 · Sat 09:00–14:00 EAT
          </p>
          <p class="small" style="color:#6f86a8">Hubs: JFK · LHR · SZX · EBB · NBO · MBA</p>
        </div>
      </div>
      <div class="foot-bottom">
        <span>© 2026 Royal Mail Express International Ltd. All rights reserved.</span>
        <span>${demoNote}</span>
      </div>
    </div>
  </footer>`;
}

export function layout({ title, desc, active = 'home', content, extraHead = '', demo = false }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} · Royal Mail Express International</title>
<meta name="description" content="${desc}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='48' fill='%230a1d36'/%3E%3Ctext x='50' y='66' font-size='52' text-anchor='middle' fill='%23e8c963' font-family='Georgia'%3ER%3C/text%3E%3C/svg%3E">
<link rel="stylesheet" href="/css/main.css">
${extraHead}
</head>
<body>
<div class="topbar no-print"><div class="wrap">
  <span>🚚 Door-to-door freight &amp; parcels — Europe · USA · Asia → Africa</span>
  <span>📞 24/7 desk +256 772 300 400 &nbsp;·&nbsp; ✉ care@royalmail-express.com</span>
</div></div>
<header class="site no-print">
  <div class="wrap navrow">
    <a class="brand" href="/">
      <img src="/img/logo.png" alt="Royal Mail Express International logo">
      <div>
        <div class="bn">Royal Mail Express</div>
        <div class="bs">International · Europe · USA · Asia → Africa</div>
      </div>
    </a>
    <button class="menu-btn" aria-label="Menu">☰</button>
    <nav class="main">${navHtml(active)}</nav>
  </div>
</header>
${content}
${footerHtml({ demo })}
<script src="/js/app.js"></script>
</body>
</html>`;
}
