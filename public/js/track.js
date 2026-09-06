/* Live tracking page */
(function () {
  const root = () => document.getElementById('track-root');

  document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('tq');
    const qp = new URLSearchParams(location.search);
    const q = qp.get('q');
    if (input) {
      const form = input.closest('form');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (input.value.trim()) { location.href = '/track.html?q=' + encodeURIComponent(input.value.trim()); }
      });
      if (q) input.value = q;
    }
    if (q) loadTrack(q);
  });

  async function loadTrack(tracking) {
    root().innerHTML = `<div class="empty-state"><div class="ico"><span class="spin" style="border-color:#cfd7e4;border-top-color:var(--navy);width:34px;height:34px"></span></div><p>Fetching the latest scan for <b class="mono">${escHtml(tracking)}</b>…</p></div>`;
    try {
      const res = await api('/api/track/' + encodeURIComponent(tracking));
      render(res);
    } catch (e) {
      root().innerHTML = `
        <div class="empty-state" style="max-width:520px;margin:20px auto">
          <div class="ico">🤔</div>
          <h3>We couldn't find that shipment</h3>
          <p class="muted">${escHtml(e.message)}</p>
          <p class="small muted">Still stuck? Call our 24/7 desk on <b>+256 772 300 400</b> — we'll dig it out for you.</p>
        </div>`;
    }
  }
  window.__loadTrack = loadTrack;

  function render(data) {
    const s = data.shipment;
    const sm = statusMeta(s.currentStatus);
    const pct = Math.min(100, Math.round(((s.currentIndex + (sm.cls === 'st-done' ? 1 : 0)) / Math.max(1, s.timelineLength)) * 100));

    const exceptionsHtml = (data.exceptions || []).map((x) => `
      <div class="card" style="border-left:4px solid var(--red);margin-top:14px">
        <div style="display:flex;gap:12px;align-items:flex-start">
          <span style="font-size:1.5rem">${x.icon}</span>
          <div style="flex:1">
            <b class="red">${x.label}</b>
            <p class="small muted" style="margin:2px 0">${escHtml(x.note || x.hint)}</p>
            <div class="small faint">${x.location || ''}${x.at ? ' · ' + fmtDT(x.at) : ''}</div>
          </div>
        </div>
      </div>`).join('');

    const timeline = data.milestones.map((m) => `
      <div class="tl-item ${m.state}">
        <div class="tl-node">${m.state === 'done' ? '✓' : m.icon}</div>
        <div>
          <div class="tl-title">${m.label}</div>
          ${m.state === 'active' ? `<span class="pill pill-gold small">current milestone</span>` : ''}
          <div class="tl-time">${m.at ? fmtDT(m.at) : 'Pending'}</div>
          ${m.location ? `<div class="tl-loc">📍 ${escHtml(m.location)}</div>` : ''}
          ${m.note ? `<div class="tl-note">${escHtml(m.note)}</div>` : ''}
        </div>
      </div>`).join('');

    const sender = s.sender || {}, recipient = s.recipient || {}, parcel = s.parcel || {};
    const prefsCheck = (s.insured ? '<span class="pill pill-green">Insured</span>' : '<span class="pill pill-gray">Not insured</span>');

    root().innerHTML = `
    <div class="grid" style="grid-template-columns:1.6fr 1fr;align-items:start">
      <div style="min-width:0">
        <div class="card" style="margin-bottom:18px">
          <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center">
            <div>
              <div class="small muted" style="text-transform:uppercase;letter-spacing:.1em">Shipment</div>
              <div class="serif" style="font-size:1.5rem;font-weight:700;color:var(--navy);letter-spacing:.4px">${s.trackingNo}</div>
              <div class="small muted">Booked ${fmtD(s.bookedAt)} · <span>${s.serviceIcon} ${s.serviceName}</span></div>
            </div>
            <div style="text-align:right">
              <div class="big-pill ${sm.cls}">${sm.label}</div>
              <div class="small mt1" style="color:var(--muted)">${data.eta.windowText}</div>
            </div>
          </div>
          <div class="bar" style="margin-top:14px"><i style="width:${pct}%"></i></div>
          <div class="small faint mt1" style="display:flex;justify-content:space-between">
            <span>${s.originFlag} ${escHtml(s.originCity || s.origin)}</span>
            <span>${s.destinationFlag} ${escHtml(s.destinationCity)}, ${s.destinationCountry}</span>
          </div>
        </div>

        ${exceptionsHtml}

        <div class="card" style="margin-top:16px">
          <h3 style="display:flex;justify-content:space-between;align-items:center">
            <span>Journey timeline</span>
            <span class="pill pill-navy small">${(data.milestones.filter((m) => m.state !== 'todo').length)} of ${s.timelineLength} milestones</span>
          </h3>
          <div class="timeline mt1">${timeline}</div>
          <div class="no-print" style="text-align:right"><button class="btn btn-outline btn-sm" onclick="window.print()">🖨 Print / save PDF</button></div>
        </div>
      </div>

      <div>
        <div class="card">
          <h3>Shipment summary</h3>
          <div class="kv" style="grid-template-columns:118px 1fr">
            <b>Status</b><span>${sm.label}</span>
            <b>ETA</b><span>${data.eta.windowText}</span>
            <b>Service</b><span>${s.serviceIcon} ${s.serviceName} (${s.service})</span>
            <b>Origin</b><span>${s.originFlag} ${escHtml(s.originCity || s.origin)}</span>
            <b>Destination</b><span>${s.destinationFlag} ${escHtml(s.destinationCity)}, ${s.destinationCountry}</span>
            <b>Weight</b><span>${parcel.weightKg} kg${parcel.pieces > 1 ? ' · ' + parcel.pieces + ' pieces' : ''}</span>
            <b>Contents</b><span>${escHtml(parcel.description || '—')}</span>
            <b>Value</b><span>${money(parcel.valueUsd || 0)}</span>
            <b>Cover</b><span>${prefsCheck}</span>
            <b>Duties</b><span class="small muted">settled at clearance</span>
          </div>
        </div>

        <div class="card mt2">
          <h3>📤 Sender</h3>
          <p style="margin:0"><b>${escHtml(sender.name || '—')}</b></p>
          <p class="small muted" style="margin:0">${sender.phone ? escHtml(sender.phone) + '<br>' : ''}${sender.email ? escHtml(sender.email) : ''}</p>
          <hr class="divider" style="margin:12px 0">
          <h3>📥 Recipient</h3>
          <p style="margin:0"><b>${escHtml(recipient.name || '—')}</b></p>
          <p class="small muted" style="margin:0">${recipient.phone ? escHtml(recipient.phone) + '<br>' : ''}${recipient.email ? escHtml(recipient.email) : ''}<br>${recipient.address ? escHtml(recipient.address) : ''}</p>
          ${s.deliveredTo ? `<p class="small green mt1">✔ Signed for by ${escHtml(s.deliveredTo)}</p>` : ''}
        </div>

        <div class="card quiet mt2">
          <h3>🔔 Notify me of updates</h3>
          <p class="small muted">Get an email or SMS when this shipment changes status.</p>
          <div class="field"><input class="input" id="sub-email" type="email" placeholder="you@email.com"></div>
          <div class="field"><input class="input" id="sub-phone" type="text" placeholder="+256 7XX XXX XXX (optional)"></div>
          <button class="btn btn-navy btn-block btn-sm" id="sub-btn">Subscribe to updates</button>
        </div>

        <div class="card mt2" style="background:var(--navy);color:#dfe8f5">
          <h3 style="color:#fff">Need help?</h3>
          <p class="small" style="margin:0">📞 +256 772 300 400 (24/7)<br>✉️ care@royalmail-express.com<br>💬 WhatsApp same number</p>
        </div>
      </div>
    </div>`;

    const subBtn = document.getElementById('sub-btn');
    if (subBtn) subBtn.addEventListener('click', async () => {
      const email = document.getElementById('sub-email').value.trim();
      const phone = document.getElementById('sub-phone').value.trim();
      if (!email && !phone) return toast('Enter an email or phone number.', 'err');
      try {
        await api('/api/subscribe', { method: 'POST', body: JSON.stringify({ trackingNo: s.trackingNo, email, phone }) });
        toast('Subscribed — you will be notified on the next status change.', 'ok');
      } catch (e) { toast(e.message, 'err'); }
    });
  }
})();
