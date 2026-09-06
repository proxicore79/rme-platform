/**
 * Portal pages — live tracking (public) and the admin console.
 */
export function trackPage(ctx) {
  const samples = ctx.sampleTracking.map((t) => `<a href="/track.html?q=${t}">${t}</a>`).join(' · ');
  const content = `
  <div class="strip">
    <div class="wrap">
      <div class="crumbs"><a href="/">Home</a> / Track a package</div>
      <h1>Track your shipment</h1>
      <p>Enter your Royal Mail Express tracking number for a live, up-to-the-minute journey timeline.</p>
      <form class="trackbox" action="/track.html" method="get" style="max-width:680px;margin-top:8px">
        <div class="row">
          <input type="text" name="q" id="tq" placeholder="RME-US-260901-240820-93" autocomplete="off" value="${ctx.tracking ? esc(ctx.tracking) : ''}">
          <button class="btn btn-red" type="submit">Track</button>
        </div>
        <div class="sample">Demo numbers: ${samples}</div>
      </form>
    </div>
  </div>
  <section class="section" style="padding-top:6px">
    <div class="wrap" id="track-root">
      <div class="empty-state" id="track-loading"><div class="ico">🔎</div><p>Enter a tracking number above, or pick a demo shipment.</p></div>
    </div>
  </section>
  <script src="/js/track.js"></script>`;
  return { title: 'Track your shipment', active: 'track', desc: 'Track a Royal Mail Express International shipment in real time by tracking number.', content };
}

export function adminPage(ctx) {
  const content = `
  <div class="strip"><div class="wrap"><div class="crumbs"><a href="/">Home</a> / Operations console</div>
    <h1>RME Operations Console</h1>
    <p>Shipments, status advancement, notifications and network activity — admin only.</p></div></div>
  <section class="section" style="padding-top:0">
    <div class="wrap">
      <!-- login -->
      <div class="card" id="adm-login" style="max-width:480px;margin:30px auto">
        <div style="text-align:center;margin-bottom:10px"><img src="/img/logo.png" style="width:74px;border-radius:50%"></div>
        <h2 style="text-align:center">Operations console</h2>
        <div class="field"><label>Admin access key</label>
          <input class="input mono" id="adm-key" type="password" placeholder="••••••••••••" autocomplete="off">
          <p class="small muted" style="margin-top:6px">Demo default: <code class="chip">rme-admin-2024</code>. The live key is set by the <code class="chip">ADMIN_KEY</code> environment variable.</p>
        </div>
        <button class="btn btn-navy btn-block" id="adm-enter">Unlock console</button>
      </div>
      <!-- workspace -->
      <div id="adm-workspace" class="hide">
        <div class="tabs">
          <button class="tab on" data-tab="dash">📊 Overview</button>
          <button class="tab" data-tab="ship">📦 Shipments</button>
          <button class="tab" data-tab="notif">🔔 Notifications</button>
          <button class="tab" data-tab="actv">🕒 Activity</button>
          <button class="tab" data-tab="sys">🛠 Backend</button>
          <button class="btn btn-sm btn-red" style="margin-left:auto" id="adm-exit">Lock console</button>
        </div>
        <div id="tab-dash"></div>
        <div id="tab-ship" class="hide"></div>
        <div id="tab-notif" class="hide"></div>
        <div id="tab-actv" class="hide"></div>
        <div id="tab-sys" class="hide"></div>
      </div>
    </div>
  </section>
  <script src="/js/admin.js"></script>`;
  return { title: 'Operations console', active: '', desc: 'Royal Mail Express International operations console.', content };
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
