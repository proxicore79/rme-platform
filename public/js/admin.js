/* Operations console */
(function () {
  const $ = (s) => document.querySelector(s);
  const KEY = 'rme_adm_key';
  let key = '';
  let refreshTimer = null;
  let selectedRef = null;
  const filters = { search: '', status: '', origin: '' };

  const admApi = (url, opts = {}) => {
    if (!key) throw new Error('No admin key');
    return api(url, { ...opts, headers: { ...(opts.headers || {}), 'X-Admin-Key': key } });
  };

  function esc(s) { return window.escHtml(s); }

  document.addEventListener('DOMContentLoaded', () => {
    const saved = sessionStorage.getItem(KEY) || '';
    if (saved) { key = saved; $('#adm-key').value = saved; tryLogin(); }
    $('#adm-enter').addEventListener('click', tryLogin);
    $('#adm-key').addEventListener('keydown', (e) => { if (e.key === 'Enter') tryLogin(); });
    $('#adm-exit').addEventListener('click', () => {
      key = ''; sessionStorage.removeItem(KEY);
      $('#adm-workspace').classList.add('hide');
      $('#adm-login').classList.remove('hide');
      stopRefresh();
    });
    document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => switchTab(t.dataset.tab)));
  });

  async function tryLogin() {
    key = $('#adm-key').value.trim();
    if (!key) return toast('Enter the admin key.', 'err');
    const btn = $('#adm-enter'); btn.disabled = true;
    try {
      await admApi('/api/admin/stats');
      sessionStorage.setItem(KEY, key);
      $('#adm-login').classList.add('hide');
      $('#adm-workspace').classList.remove('hide');
      toast('Console unlocked.', 'ok');
      switchTab('dash');
      startRefresh();
    } catch (e) {
      toast('Wrong key: ' + e.message, 'err');
      key = '';
    }
    btn.disabled = false;
  }

  function switchTab(name) {
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.dataset.tab === name));
    ['dash', 'ship', 'notif', 'actv', 'sys'].forEach((t) => $(`#tab-${t}`).classList.toggle('hide', t !== name));
    $('#tab-dash').dataset.active = name === 'dash' ? '1' : '0';
    if (name === 'dash') renderDash();
    if (name === 'ship') renderShipments();
    if (name === 'notif') renderNotifs();
    if (name === 'actv') renderActivity();
    if (name === 'sys') renderSys();
  }
  window.__admTab = switchTab;

  function startRefresh() {
    stopRefresh();
    refreshTimer = setInterval(() => {
      if ($('#tab-dash').dataset.active === '1' && !$('#adm-workspace').classList.contains('hide')) {
        try { renderDash(true); } catch (e) {}
      }
    }, 20000);
  }
  function stopRefresh() { clearInterval(refreshTimer); refreshTimer = null; }

  /* ---------------- Overview ---------------- */
  async function renderDash(silent) {
    const el = $('#tab-dash');
    if (silent) { /* keep, update below */ }
    try {
      const { stats } = await admApi('/api/admin/stats');
      const statusRows = Object.entries(stats.byStatus || {}).sort((a, b) => b[1] - a[1]);
      const maxS = Math.max(1, ...statusRows.map(([, n]) => n));
      const originRows = Object.entries(stats.byOrigin || {});
      const maxO = Math.max(1, ...originRows.map(([, n]) => n));
      const flag = { US: '🇺🇸', UK: '🇬🇧', CN: '🇨🇳' };
      const originName = { US: 'USA', UK: 'UK', CN: 'China' };

      const cards = `
        <div class="grid g4" style="gap:14px;margin-bottom:18px">
          <div class="stat-card"><div class="sc-label">Total shipments</div><div class="sc-val">${stats.total}</div><div class="sc-sub">${stats.active} active · ${stats.delivered} delivered</div></div>
          <div class="stat-card"><div class="sc-label">Exceptions</div><div class="sc-val ${stats.exceptions ? 'red' : ''}">${stats.exceptions}</div><div class="sc-sub">need attention</div></div>
          <div class="stat-card"><div class="sc-label">Revenue (booked)</div><div class="sc-val">${money(stats.revenueUsd)}</div><div class="sc-sub">USD door-to-door value</div></div>
          <div class="stat-card"><div class="sc-label">Notifications sent</div><div class="sc-val">${stats.notificationsSent}</div><div class="sc-sub">${stats.bookedToday} booked today</div></div>
        </div>`;

      const statusHtml = statusRows.map(([code, n]) => `
        <div style="margin:8px 0">
          <div style="display:flex;justify-content:space-between;font-size:.85rem">
            <span><span class="pill ${statusMeta(code).pill}">${statusMeta(code).label}</span></span><b>${n}</b>
          </div>
          <div class="bar" style="margin-top:4px"><i style="width:${(n / maxS) * 100}%"></i></div>
        </div>`).join('');

      const originHtml = originRows.map(([code, n]) => `
        <div style="margin:8px 0">
          <div style="display:flex;justify-content:space-between;font-size:.85rem"><span>${flag[code]} ${originName[code]}</span><b>${n}</b></div>
          <div class="bar" style="margin-top:4px"><i style="width:${(n / maxO) * 100}%"></i></div>
        </div>`).join('');

      el.innerHTML = cards + `
      <div class="grid" style="grid-template-columns:1.3fr .7fr;align-items:start">
        <div>
          <div class="card">
            <h3 style="display:flex;justify-content:space-between"><span>🕒 Recent network events</span>
              <button class="btn btn-sm btn-ghost" style="color:var(--navy);border-color:var(--line)" onclick="__admTab('actv')">Full activity →</button></h3>
            ${eventFeedHtml((stats.recent || []).slice(0, 9))}
          </div>
          <div class="card mt2">
            <h3>🚦 Live notification stream</h3>
            <div id="dash-notif-feed">loading…</div>
          </div>
        </div>
        <div>
          <div class="card"><h3>Status mix</h3>${statusHtml || '<p class="muted small">No shipments yet.</p>'}</div>
          <div class="card mt2"><h3>By origin corridor</h3>${originHtml || '<p class="muted small">No shipments yet.</p>'}</div>
          <div class="card mt2" style="text-align:center">
            <b>Quick action</b>
            <button class="btn btn-navy btn-block mt1" onclick="__admTab('ship')">Manage shipments</button>
            <button class="btn btn-gold btn-block mt1" onclick="openCreate()">+ New shipment (manual)</button>
          </div>
        </div>
      </div>`;

      const nf = $('#dash-notif-feed');
      try {
        const nr = await admApi('/api/admin/notifications?per=7');
        nf.innerHTML = notifFeedHtml(nr.notifications, 3);
      } catch (e) { nf.innerHTML = '<p class="muted small">—</p>'; }
    } catch (e) {
      if (!silent) el.innerHTML = `<div class="card"><p class="red">Failed to load dashboard: ${esc(e.message)}</p></div>`;
    }
  }

  function eventFeedHtml(events) {
    if (!events.length) return '<p class="muted small">No activity yet.</p>';
    return events.map((e) => `
      <div style="display:flex;gap:12px;padding:9px 0;border-bottom:1px solid var(--line);align-items:center">
        <span class="avatar mono" style="font-size:.66rem;border-radius:9px;width:auto;padding:0 8px;height:24px">${esc(e.trackingNo)}</span>
        <div style="flex:1;min-width:0">
          <div class="small" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><b>${esc(e.label)}</b> <span class="muted">· ${esc(e.location || '')}</span></div>
        </div>
        <span class="small faint" style="white-space:nowrap">${timeAgo(e.at)}</span>
      </div>`).join('');
  }

  function notifFeedHtml(items, limit = 10) {
    if (!items.length) return '<p class="muted small">No notifications yet — advance a shipment to generate one.</p>';
    return items.slice(0, limit).map((n) => `
      <div class="notif-item ${n.channel}">
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <span class="pill ${n.channel === 'email' ? 'pill-gold' : n.channel === 'sms' ? 'pill-blue' : 'pill-green'}" style="text-transform:uppercase">${n.channel}</span>
          <span class="pill ${n.status === 'sent' ? 'pill-gray' : 'pill-amber'}">${n.status}</span>
          <span class="mono small" style="margin-left:auto">${esc(n.trackingNo)}</span>
        </div>
        <div class="small" style="margin-top:5px"><b>${esc(n.subject)}</b></div>
        <div class="small muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(n.body)}</div>
        <div class="small faint" style="margin-top:3px">→ ${esc(n.to)} · ${timeAgo(n.createdAt)}</div>
      </div>`).join('');
  }

  /* ---------------- Shipments ---------------- */
  async function renderShipments() {
    const el = $('#tab-ship');
    el.innerHTML = `
      <div class="card">
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:12px">
          <input class="input" id="f-search" placeholder="Search tracking / sender / recipient…" style="flex:1;min-width:180px" value="${esc(filters.search)}">
          <select class="input" id="f-status" style="width:170px">
            <option value="">All statuses</option>
            <option ${filters.status === 'ACTIVE' ? 'selected' : ''} value="ACTIVE">Active</option>
            <option ${filters.status === 'DELIVERED' ? 'selected' : ''} value="DELIVERED">Delivered</option>
            ${Object.keys(STATUS_META).map((c) => `<option ${filters.status === c ? 'selected' : ''} value="${c}">${STATUS_META[c].label}</option>`).join('')}
          </select>
          <select class="input" id="f-origin" style="width:120px">
            <option value="">All origins</option><option ${filters.origin === 'US' ? 'selected' : ''} value="US">🇺🇸 USA</option>
            <option ${filters.origin === 'UK' ? 'selected' : ''} value="UK">🇬🇧 UK</option><option ${filters.origin === 'CN' ? 'selected' : ''} value="CN">🇨🇳 China</option>
          </select>
          <button class="btn btn-navy btn-sm" id="f-go">Apply</button>
          <button class="btn btn-outline btn-sm" id="f-reset">Reset</button>
          <button class="btn btn-gold btn-sm" style="margin-left:auto" id="create-btn">+ New shipment</button>
        </div>
        <div id="create-panel"></div>
        <div id="ship-list"><div class="empty-state"><span class="spin"></span> Loading shipments…</div></div>
      </div>
      <div id="ship-detail"></div>`;

    $('#f-go').onclick = () => { filters.search = $('#f-search').value.trim(); filters.status = $('#f-status').value; filters.origin = $('#f-origin').value; fetchShipments(); };
    $('#f-reset').onclick = () => { filters.search = ''; filters.status = ''; filters.origin = ''; $('#f-search').value = ''; $('#f-status').value = ''; $('#f-origin').value = ''; fetchShipments(); };
    $('#f-search').addEventListener('keydown', (e) => { if (e.key === 'Enter') { filters.search = $('#f-search').value.trim(); fetchShipments(); } });
    $('#create-btn').onclick = () => openCreate();
    fetchShipments();
  }

  async function fetchShipments() {
    const q = new URLSearchParams();
    if (filters.search) q.set('search', filters.search);
    if (filters.status) q.set('status', filters.status);
    if (filters.origin) q.set('origin', filters.origin);
    q.set('per', '25');
    try {
      const res = await admApi('/api/admin/shipments?' + q.toString());
      const rows = res.shipments.map((s) => {
        const sm = statusMeta(s.currentStatus);
        return `
        <tr style="cursor:pointer" onclick="openShipment('${s.id}','${esc(s.trackingNo)}')">
          <td><span class="mono" style="font-size:.82rem">${esc(s.trackingNo)}</span><br><span class="small faint">${timeAgo(s.bookedAt)}</span></td>
          <td>${s.originFlag || '—'}<br><span class="small muted">${esc(s.originCity || '')}</span></td>
          <td>${s.destinationFlag || ''} <b>${esc(s.destinationCity)}</b><br><span class="small muted">${esc(s.destinationCountry)}</span></td>
          <td><span class="pill pill-gray">${s.serviceIcon} ${s.service}</span></td>
          <td>${esc((s.parcel || {}).description || '—')}<br><span class="small faint">${(s.parcel || {}).weightKg} kg</span></td>
          <td><span class="pill ${sm.pill}">${sm.label}</span></td>
          <td class="num">${money(s.totalUsd)}</td>
        </tr>`;
      }).join('');
      $('#ship-list').innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center" class="small muted"><span>${res.total} shipment${res.total === 1 ? '' : 's'} found</span><span>${res.page} · ${Math.ceil(res.total / 25)} pages</span></div>
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>Tracking</th><th>From</th><th>To</th><th>Service</th><th>Contents</th><th>Status</th><th>Total</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="7" class="center muted">No shipments match.</td></tr>'}</tbody>
        </table></div>`;
    } catch (e) {
      $('#ship-list').innerHTML = `<div class="card"><p class="red">${esc(e.message)}</p></div>`;
    }
  }

  async function openShipment(id, tracking) {
    selectedRef = id;
    const el = $('#ship-detail');
    el.innerHTML = '<div class="card mt2"><span class="spin"></span> Loading shipment detail…</div>';
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    try {
      const res = await admApi('/api/admin/shipments/' + encodeURIComponent(tracking || id));
      renderShipmentDetail(el, res);
    } catch (e) { el.innerHTML = `<div class="card mt2"><p class="red">${esc(e.message)}</p></div>`; }
  }
  window.openShipment = openShipment;

  function renderShipmentDetail(el, res) {
    const s = res.shipment;
    const tl = res.timeline.milestones || [];
    const done = tl.filter((m) => m.state !== 'todo');
    const sm = statusMeta(s.currentStatus);
    const nextChoices = tl.filter((m) => m.state === 'todo');
    const exceptionChoices = ['ON_HOLD', 'ADDRESS_ISSUE'];

    const sender = s.sender || {}, recipient = s.recipient || {}, parcel = s.parcel || {};
    el.innerHTML = `
    <div class="card mt2" style="border-top:3px solid var(--gold)">
      <div style="display:flex;gap:14px;justify-content:space-between;flex-wrap:wrap;align-items:flex-start">
        <div>
          <h3 style="margin:0">${esc(s.trackingNo)} <span class="pill ${sm.pill}">${sm.label}</span></h3>
          <div class="small muted mt1">${s.originFlag} ${esc(s.originCity || s.origin)} → ${s.destinationFlag} ${esc(s.destinationCity)}, ${esc(s.destinationCountry)} · <b>${s.serviceIcon} ${s.serviceName}</b> (${s.service})</div>
          <div class="small mt1"><span class="pill pill-gray">Booked ${fmtDT(s.bookedAt)}</span> <span class="pill pill-blue">${s.eventsCount ?? done.length} events</span> <span class="pill ${s.insured ? 'pill-green' : 'pill-gray'}">${s.insured ? 'Insured' : 'Not insured'}</span></div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-sm btn-outline" onclick="window.open('/track.html?q=${esc(s.trackingNo)}','_blank')">Public page ↗</button>
          <button class="btn btn-sm btn-red" onclick="delShip('${s.id}')">Delete</button>
        </div>
      </div>
      <div class="grid mt2" style="grid-template-columns:1fr 1fr 1fr;gap:14px">
        <div class="quiet card"><b>Sender</b><div class="small mt1">${esc(sender.name || '—')}</div><div class="small muted">${esc(sender.phone || '')}${sender.phone && sender.email ? '<br>' : ''}${esc(sender.email || '')}</div></div>
        <div class="quiet card"><b>Recipient</b><div class="small mt1">${esc(recipient.name || '—')}</div><div class="small muted">${esc(recipient.phone || '')}${recipient.phone && recipient.email ? '<br>' : ''}${esc(recipient.email || '')}</div>${s.deliveredTo ? `<div class="small green">Signed by ${esc(s.deliveredTo)}</div>` : ''}</div>
        <div class="quiet card"><b>Parcel</b><div class="small mt1">${esc(parcel.description || '—')}</div><div class="small muted">${parcel.weightKg} kg · ${parcel.pieces || 1} pc · value ${money(parcel.valueUsd || 0)}</div></div>
      </div>
      ${s.onHoldReason ? `<div class="warn" style="margin-top:12px"><b>Hold reason:</b> ${esc(s.onHoldReason)}</div>` : ''}
      <hr class="divider">
      <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-end">
        <div class="field" style="margin:0;flex:1;min-width:190px">
          <label>Advance to next stage</label>
          <select class="input" id="adv-code">
            ${nextChoices.length ? nextChoices.map((m) => `<option value="${m.code}">${m.label}</option>`).join('') : '<option value="" disabled>All stages complete</option>'}
            <optgroup label="Exceptions">${exceptionChoices.map((c) => `<option value="${c}">⚠ ${statusMeta(c).label}</option>`).join('')}</optgroup>
          </select>
        </div>
        <div class="field" style="margin:0;flex:1;min-width:160px"><label>Location</label><input class="input" id="adv-loc" placeholder="e.g. Entebbe · EBB" value="${esc((s.eventsCount && s.destinationCity) || '')}"></div>
        <div class="field" style="margin:0;flex:1.4;min-width:220px"><label>Note (optional)</label><input class="input" id="adv-note" placeholder="e.g. cleared, docs OK / hold reason / signed by…"></div>
        <button class="btn btn-navy" id="adv-btn">Apply &amp; notify ⏩</button>
      </div>
      <div class="small faint mt1">Applying a stage records it on the timeline and fires email/SMS/app notifications to opted-in sender &amp; recipient.</div>
      <div id="adv-out" class="mt1"></div>
    </div>

    <div class="grid mt2" style="grid-template-columns:1.5fr 1fr;align-items:start">
      <div class="card">
        <h3>Timeline</h3>
        <div class="timeline">
          ${tl.map((m) => `
            <div class="tl-item ${m.state}">
              <div class="tl-node">${m.state === 'done' ? '✓' : m.icon}</div>
              <div><div class="tl-title">${m.label}</div>
                <div class="tl-time">${m.at ? fmtDT(m.at) : 'Pending'}</div>
                ${m.location ? `<div class="tl-loc">${esc(m.location)}</div>` : ''}
                ${m.note ? `<div class="tl-note">${esc(m.note)}</div>` : ''}
              </div>
            </div>`).join('')}
        </div>
      </div>
      <div>
        <div class="card">
          <h3>Financials &amp; preferences</h3>
          <div class="kv" style="grid-template-columns:130px 1fr">
            <b>Total (USD)</b><span class="serif" style="font-size:1.25rem">${money(s.totalUsd)}</span>
            <b>Declared value</b><span>${money(s.declaredValueUsd)}</span>
            <b>Insurance</b><span>${s.insured ? 'Yes' : 'No'}</span>
            <b>ETA date</b><span>${fmtD(s.etaDate)}</span>
            <b>Notes</b><span class="small">${esc(s.notes || '—')}</span>
          </div>
          ${s.quote && s.quote.lines ? `<hr class="divider"><h3>Quote breakdown</h3>` +
            s.quote.lines.map((l) => `<div class="total-row small" style="padding:3px 0"><span class="muted">${esc(l.label)}</span><b class="num">${money(l.amount)}</b></div>`).join('') : ''}
        </div>
        <div class="card mt2" style="text-align:center"><b>Testing tip</b><p class="small muted">Apply “Out for delivery” then “Delivered” to watch notifications fire end-to-end.</p></div>
      </div>
    </div>`;

    const btn = $('#adv-btn');
    btn.onclick = async () => {
      const code = $('#adv-code').value;
      if (!code) return toast('Choose a stage first.', 'err');
      btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Applying & notifying…';
      try {
        const res = await admApi('/api/admin/advance', {
          method: 'POST',
          body: JSON.stringify({ trackingNo: s.trackingNo, code, location: $('#adv-loc').value, note: $('#adv-note').value }),
        });
        const st = res.notifications.filter((n) => n.channel !== 'app');
        const sent = st.filter((n) => n.status === 'sent').length;
        const sim = st.filter((n) => n.status === 'simulated').length;
        $('#adv-out').innerHTML = `
          <div class="pill pill-green">✓ ${esc(res.event.label)} recorded</div>
          <div class="small mt1">Notifications: ${sent} sent live${sim ? ` · ${sim} simulated (add SMTP/Twilio keys to go live)` : ''} · ${res.notifications.filter((n) => n.channel === 'app').length} in-app</div>`;
        toast(`Stage applied: ${res.event.label}`, 'ok');
        selectedRef = null;
        renderDash(true);
        fetchShipments();
      } catch (e) { toast(e.message, 'err'); }
      btn.disabled = false; btn.innerHTML = 'Apply & notify ⏩';
    };
  }

  async function delShip(id) {
    if (!confirm('Delete this shipment and its timeline? This cannot be undone.')) return;
    try {
      await admApi('/api/admin/delete-shipment', { method: 'POST', body: JSON.stringify({ id }) });
      toast('Shipment deleted.', 'ok');
      $('#ship-detail').innerHTML = '';
      renderDash(true); fetchShipments();
    } catch (e) { toast(e.message, 'err'); }
  }
  window.delShip = delShip;

  function openCreate() {
    const panel = $('#create-panel');
    const show = panel.innerHTML === '';
    if (show) {
      panel.innerHTML = `
      <div class="card quiet mb2">
        <h3>New shipment (manual)</h3>
        <div class="grid g3">
          <div class="field"><label>Origin</label><select class="input" id="c-origin"><option value="US">🇺🇸 USA</option><option value="UK">🇬🇧 UK</option><option value="CN">🇨🇳 China</option></select></div>
          <div class="field"><label>Destination</label><select class="input" id="c-to">${destinationOptions()}</select></div>
          <div class="field"><label>Service</label><select class="input" id="c-svc"><option value="EXPRESS">Express Air</option><option value="STANDARD">Standard Air</option><option value="SEA">Economy Sea</option></select></div>
          <div class="field"><label>Weight (kg)</label><input class="input" id="c-w" type="number" min="0.1" step="0.1" value="5"></div>
          <div class="field"><label>Total (USD)</label><input class="input" id="c-total" type="number" min="0" value="80"></div>
          <div class="field"><label>Contents</label><input class="input" id="c-desc" value="General cargo"></div>
          <div class="field"><label>Sender name</label><input class="input" id="c-sname" placeholder="Sender name"></div>
          <div class="field"><label>Sender phone / email</label><input class="input" id="c-scontact" placeholder="phone or email"></div>
          <div class="field"><label>Recipient name</label><input class="input" id="c-rname" placeholder="Recipient name"></div>
          <div class="field"><label>Recipient phone</label><input class="input" id="c-rphone" placeholder="+256 7XX XXX XXX"></div>
          <div class="field"><label>Recipient email</label><input class="input" id="c-remail" placeholder="recipient@example.com"></div>
          <div class="field"><label>Origin city</label><input class="input" id="c-city" placeholder="e.g. New York, NY"></div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-gold" id="c-save">Create shipment</button>
          <button class="btn btn-outline" id="c-cancel">Cancel</button>
        </div>
      </div>`;
      $('#c-cancel').onclick = () => { panel.innerHTML = ''; };
      $('#c-save').onclick = async () => {
        const btn = $('#c-save'); btn.disabled = true;
        const [sName, sPhone, sEmail] = (v) => { const parts = (v || '').split(','); return [parts[0].trim(), parts[1] ? parts[1].trim() : '', parts[2] ? parts[2].trim() : '']; };
        const [sn, sp] = sName($('#c-sname').value);
        try {
          const res = await admApi('/api/admin/shipments', {
            method: 'POST',
            body: JSON.stringify({
              origin: $('#c-origin').value, originCity: $('#c-city').value,
              destinationKey: $('#c-to').value, service: $('#c-svc').value,
              parcel: { weightKg: +$('#c-w').value, description: $('#c-desc').value, pieces: 1 },
              sender: { name: sn, phone: sp, email: '' }, recipient: { name: $('#c-rname').value, phone: $('#c-rphone').value, email: $('#c-remail').value },
              totalUsd: +$('#c-total').value,
            }),
          });
          toast('Shipment created: ' + res.shipment.trackingNo, 'ok');
          panel.innerHTML = ''; fetchShipments(); renderDash(true);
          openShipment(res.shipment.id, res.shipment.trackingNo);
        } catch (e) { toast(e.message, 'err'); }
        btn.disabled = false;
      };
    } else { panel.innerHTML = ''; }
  }
  window.openCreate = openCreate;

  function destinationOptions() {
    const cities = [['Kampala', '🇺🇬 Kampala, Uganda'], ['Gulu', '🇺🇬 Gulu, Uganda'], ['Mbarara', '🇺🇬 Mbarara, Uganda'], ['Entebbe', '🇺🇬 Entebbe, Uganda'], ['Nairobi', '🇰🇪 Nairobi, Kenya'], ['Mombasa', '🇰🇪 Mombasa, Kenya'], ['Kigali', '🇷🇼 Kigali, Rwanda'], ['Dar es Salaam', '🇹🇿 Dar es Salaam, Tanzania'], ['Juba', '🇸🇸 Juba, S. Sudan'], ['Kinshasa', '🇨🇩 Kinshasa, DRC']];
    return cities.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
  }

  /* ---------------- Notifications ---------------- */
  async function renderNotifs() {
    const el = $('#tab-notif');
    el.innerHTML = '<div class="card"><span class="spin"></span> Loading…</div>';
    try {
      const res = await admApi('/api/admin/notifications?per=100');
      const counts = res.notifications.reduce((a, n) => { a[n.status] = (a[n.status] || 0) + 1; a[n.channel] = (a[n.channel] || 0) + 1; return a; }, {});
      el.innerHTML = `
      <div class="grid g4" style="gap:14px;margin-bottom:16px">
        <div class="stat-card"><div class="sc-label">Total</div><div class="sc-val">${res.total}</div></div>
        <div class="stat-card"><div class="sc-label">Sent live</div><div class="sc-val green">${counts.sent || 0}</div></div>
        <div class="stat-card"><div class="sc-label">Simulated</div><div class="sc-val" style="color:var(--amber)">${counts.simulated || 0}</div><div class="sc-sub">awaiting provider keys</div></div>
        <div class="stat-card"><div class="sc-label">In-app stream</div><div class="sc-val">${counts.app || 0}</div></div>
      </div>
      <div class="card"><div style="max-height:62vh;overflow:auto">${notifFeedHtml(res.notifications, 100)}</div></div>`;
    } catch (e) { el.innerHTML = `<div class="card"><p class="red">${esc(e.message)}</p></div>`; }
  }

  /* ---------------- Activity ---------------- */
  async function renderActivity() {
    const el = $('#tab-actv');
    el.innerHTML = '<div class="card"><span class="spin"></span> Loading…</div>';
    try {
      const res = await admApi('/api/admin/activity');
      const events = (res.events || []).map((e) => `
        <div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--line)">
          <span class="avatar mono" style="font-size:.64rem">${esc(e.trackingNo)}</span>
          <div style="flex:1"><b>${esc(e.label)}</b> <span class="small muted">· ${esc(e.location || '')}</span>
            <div class="small faint">by ${esc(e.actor)} · ${fmtDT(e.at)}</div></div>
        </div>`).join('');
      const notifs = (res.notifications || []).map((n) => `
        <div class="notif-item ${n.channel}">
          <div style="display:flex;gap:8px;align-items:center"><span class="pill ${n.channel === 'email' ? 'pill-gold' : n.channel === 'sms' ? 'pill-blue' : 'pill-green'}">${n.channel}</span><span class="pill ${n.status === 'sent' ? 'pill-gray' : 'pill-amber'}">${n.status}</span><span class="small faint" style="margin-left:auto">${timeAgo(n.createdAt)}</span></div>
          <div class="small" style="margin-top:4px"><b>${esc(n.subject)}</b></div>
          <div class="small faint">→ ${esc(n.to)}</div>
        </div>`).join('');
      el.innerHTML = `<div class="grid g2" style="align-items:start">
        <div class="card"><h3>Status events</h3>${events || '<p class="muted">None yet.</p>'}</div>
        <div class="card"><h3>Notifications</h3><div style="max-height:70vh;overflow:auto">${notifs || '<p class="muted">None yet.</p>'}</div></div>
      </div>`;
    } catch (e) { el.innerHTML = `<div class="card"><p class="red">${esc(e.message)}</p></div>`; }
  }

  /* ---------------- System / backend ---------------- */
  async function renderSys() {
    const el = $('#tab-sys');
    el.innerHTML = '<div class="card"><span class="spin"></span> Loading…</div>';
    try {
      const info = await admApi('/api/admin/meta');
      const health = await api('/api/health');
      el.innerHTML = `
      <div class="grid g2" style="align-items:start">
        <div class="card">
          <h3>Running mode</h3>
          <div class="kv" style="grid-template-columns:150px 1fr">
            <b>Backend</b><span><span class="pill ${health.backend === 'demo' ? 'pill-amber' : 'pill-green'}">${health.backend}</span></span>
            <b>Storage</b><span>${health.backend === 'demo' ? 'Built-in demo database (JSON) — persists in data/demo-db.json' : 'Live Supabase project: ' + health.project}</span>
            <b>Ready</b><span>${health.ready ? '✓ yes' : '⚠ service-role key missing'}</span>
            <b>Admin key</b><span><code class="chip">ADMIN_KEY</code> env · demo default <code class="chip">rme-admin-2024</code></span>
          </div>
          ${health.backend === 'demo' ? `<div class="warn" style="margin-top:14px"><b>Demo mode.</b> Everything works locally with seeded data. To go live on Supabase: run the schema in <code class="chip">supabase/schema.sql</code> in your project, then set <code class="chip">RM_USE_SUPABASE=true</code>, <code class="chip">SUPABASE_URL</code> and <code class="chip">SUPABASE_SERVICE_ROLE_KEY</code> in <code class="chip">.env</code> and restart. No code changes needed.</div>` : ''}
        </div>
        <div class="card">
          <h3>Demo data tools</h3>
          <p class="small muted">Reset the demo database to its seeded state (demo backend only).</p>
          <button class="btn btn-outline btn-sm" id="sys-reset" ${health.backend !== 'demo' ? 'disabled' : ''}>Reset demo database</button>
          <hr class="divider">
          <h3>Notification providers</h3>
          <p class="small muted">Add keys in <code class="chip">.env</code> to send real email/SMS. Until then all messages are logged and marked <b>simulated</b>.</p>
          <ul class="small" style="line-height:1.9;padding-left:18px">
            <li><b>Email</b> — <code class="chip">SENDGRID_API_KEY</code> or <code class="chip">SMTP_HOST/USER/PASS</code></li>
            <li><b>SMS</b> — <code class="chip">TWILIO_ACCOUNT_SID</code>, <code class="chip">TWILIO_AUTH_TOKEN</code>, <code class="chip">TWILIO_FROM</code></li>
          </ul>
          <p class="small muted">Production note: keep <code class="chip">SUPABASE_SERVICE_ROLE_KEY</code> and provider keys server-side only.</p>
        </div>
      </div>
      <div class="card mt2">
        <h3>API surface</h3>
        <div style="overflow:auto"><table class="tbl small">
          <thead><tr><th>Method</th><th>Endpoint</th><th>Access</th></tr></thead>
          <tbody>
            <tr><td>GET</td><td>/api/quote, /api/track/:no, /api/lookups, /api/activity</td><td>public</td></tr>
            <tr><td>POST</td><td>/api/booking, /api/subscribe, /api/contact</td><td>public</td></tr>
            <tr><td>GET</td><td>/api/admin/stats · shipments · notifications · activity</td><td>admin key</td></tr>
            <tr><td>POST</td><td>/api/admin/advance · set-status · shipments · delete-shipment · reset-demo</td><td>admin key</td></tr>
          </tbody>
        </table></div>
      </div>`;
      const rb = $('#sys-reset');
      if (rb) rb.onclick = async () => {
        if (!confirm('Reset demo database to seeded data?')) return;
        try { const r = await admApi('/api/admin/reset-demo', { method: 'POST' }); toast(`Demo reset — ${r.shipments} shipments seeded.`, 'ok'); renderDash(true); } catch (e) { toast(e.message, 'err'); }
      };
    } catch (e) { el.innerHTML = `<div class="card"><p class="red">${esc(e.message)}</p></div>`; }
  }
})();
