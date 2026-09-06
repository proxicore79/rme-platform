/* Booking flow — prefills quote draft, live estimate, submits booking. */
(function () {
  const $ = (s) => document.querySelector(s);

  function draft() { try { return JSON.parse(sessionStorage.getItem('rme_draft') || 'null'); } catch (e) { return null; } }

  document.addEventListener('DOMContentLoaded', () => {
    const qp = new URLSearchParams(location.search);
    const d = draft();

    if (qp.get('service')) $('#b-service').value = qp.get('service');
    if (d) {
      if (d.origin) $('#b-origin').value = d.origin;
      if (d.to) $('#b-to').value = d.to;
      if (d.service) $('#b-service').value = d.service;
      if (d.weight) $('#b-weight').value = d.weight;
      if (d.l) $('#b-l').value = d.l;
      if (d.w) $('#b-w').value = d.w;
      if (d.h) $('#b-h').value = d.h;
      if (d.ins) $('#b-ins').checked = true;
      if (d.value) $('#b-value').value = d.value;
    }

    const form = $('#book-form');
    const estimate = async () => {
      const weight = parseFloat($('#b-weight').value);
      if (!(weight > 0)) { $('#b-total').textContent = '—'; return; }
      const q = new URLSearchParams({
        origin: $('#b-origin').value, to: $('#b-to').value, service: $('#b-service').value,
        weight: weight || 1, l: $('#b-l').value || 0, w: $('#b-w').value || 0, h: $('#b-h').value || 0,
        ins: $('#b-ins').checked, value: $('#b-value').value || 0,
      });
      try {
        const res = await api('/api/quote?' + q.toString());
        const qt = res.quote;
        $('#b-total').textContent = money(qt.total);
        $('#b-eta').textContent = `Estimated delivery ${fmtD(qt.minDate)} – ${fmtD(qt.etaDate)}`;
        $('#b-lines').innerHTML = qt.lines.map((l) => `
          <div class="total-row" style="padding:6px 0;border-bottom:1px dashed var(--line)">
            <span class="small muted">${l.label}</span><b class="num small">${money(l.amount)}</b>
          </div>`).join('')
          + `<div class="small" style="padding:6px 0 0">Billable weight: <b>${qt.billableKg} kg</b></div>`;
        $('#b-notes2').innerHTML = qt.warnings.length ? `<span class="warn" style="display:block;margin:8px 0 0">${qt.warnings.join('<br>')}</span>` : 'Inclusive of fuel surcharge, handling and last-mile delivery. Duties/VAT quoted at clearance.';
        window.__bookQuote = qt;
      } catch (e) { /* silent */ }
    };
    ['b-origin', 'b-to', 'b-service', 'b-weight', 'b-l', 'b-w', 'b-h', 'b-ins', 'b-value'].forEach((id) => {
      $(`#${id}`).addEventListener(id === 'b-weight' || id.endsWith('-l') || id.endsWith('-w') || id.endsWith('-h') ? 'input' : 'change', () => clearTimeout(window.__estT) || (window.__estT = setTimeout(estimate, 400)));
    });
    estimate();

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('#b-submit');
      btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Issuing tracking number…';
      const payload = {
        origin: $('#b-origin').value,
        originCity: $('#b-origincity').value,
        destinationKey: $('#b-to').value,
        service: $('#b-service').value,
        parcel: {
          description: $('#b-desc').value,
          weightKg: parseFloat($('#b-weight').value),
          pieces: parseInt($('#b-pieces').value) || 1,
          dims: { l: +$('#b-l').value || 0, w: +$('#b-w').value || 0, h: +$('#b-h').value || 0 },
          valueUsd: parseFloat($('#b-value').value) || 0,
        },
        insured: $('#b-ins').checked,
        declaredValueUsd: parseFloat($('#b-value').value) || 0,
        sender: { name: $('#b-sname').value, phone: $('#b-sphone').value, email: $('#b-semail').value, address: $('#b-saddr').value },
        recipient: { name: $('#b-rname').value, phone: $('#b-rphone').value, email: $('#b-remail').value, address: $('#b-raddr').value },
        notifyPrefs: {
          senderEmail: $('#b-n-sender').checked, senderPhone: false,
          recipientEmail: $('#b-n-recip').checked, recipientPhone: $('#b-n-smss').checked,
        },
        notes: $('#b-notes').value,
      };
      try {
        const res = await api('/api/booking', { method: 'POST', body: JSON.stringify(payload) });
        $('#b-tracking').textContent = res.trackingNo;
        const parts = res.notified.filter((n) => n.channel !== 'app');
        const states = [...new Set(parts.map((p) => p.status))];
        const stateWord = states.length === 1 && states[0] === 'sent' ? 'Delivered by email/SMS' : states.includes('simulated') ? 'Logged (email/SMS pending provider keys)' : 'Recorded';
        $('#b-notified').innerHTML = `Notifications: <b>${stateWord}</b>. ${parts.length ? `${parts.length} message${parts.length > 1 ? 's' : ''} sent to sender/recipient.` : ''}<br>Booking total: ${money(res.totalUsd)} · Est. delivery ${fmtD(res.etaDate)}`;
        $('#b-tracklink').href = `/track.html?q=${encodeURIComponent(res.trackingNo)}`;
        $('#book-grid').classList.add('hide');
        $('#b-success').classList.remove('hide');
        try { sessionStorage.removeItem('rme_draft'); } catch (x) {}
        try { navigator.clipboard && navigator.clipboard.writeText(res.trackingNo).catch(() => {}); } catch (x) {}
      } catch (err) {
        toast(err.message, 'err');
        btn.disabled = false; btn.innerHTML = 'Confirm booking — issue tracking number';
      }
    });

    $('#b-new').addEventListener('click', () => {
      $('#book-grid').classList.remove('hide');
      $('#b-success').classList.add('hide');
      form.reset();
      $('#b-pieces').value = 1; $('#b-n-sender').checked = true; $('#b-n-recip').checked = true;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
})();
