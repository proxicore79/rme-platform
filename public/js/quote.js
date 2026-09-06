/* Instant quote calculator */
(function () {
  const $ = (s) => document.querySelector(s);
  const out = {};

  function volW() {
    const l = parseFloat($('#q-l').value), w = parseFloat($('#q-w').value), h = parseFloat($('#q-h').value);
    if (!(l > 0) || !(w > 0) || !(h > 0)) return 0;
    return Math.round(((l * w * h) / 5000) * 10) / 10;
  }

  function params() {
    const svc = document.querySelector('input[name="svc"]:checked').value;
    const weight = parseFloat($('#q-weight').value);
    const v = volW();
    const h = $('#q-volhint');
    const weightUse = Math.max(weight || 0, v);
    h.innerHTML = v > 0 ? (v > (weight || 0)
      ? `📐 Volumetric weight ${v} kg is larger than actual — ${v} kg will be charged.`
      : `📐 Volumetric weight is ${v} kg (actual weight applies).`) : '';
    return {
      origin: $('#q-origin').value,
      to: $('#q-to').value,
      service: svc,
      weight,
      vol: v,
      ins: $('#q-ins').checked,
      value: parseFloat($('#q-value').value) || 0,
      weightUse,
    };
  }

  window.rmeQuote = out;

  document.addEventListener('DOMContentLoaded', () => {
    const qp = new URLSearchParams(location.search);
    if (qp.get('origin')) $('#q-origin').value = qp.get('origin');
    if (qp.get('to')) $('#q-to').value = qp.get('to');

    // service selector styling
    document.querySelectorAll('.svc-select').forEach((el) => {
      el.addEventListener('click', () => {
        document.querySelectorAll('.svc-select').forEach((x) => x.classList.remove('on'));
        el.classList.add('on');
        el.querySelector('input').checked = true;
      });
    });

    $('#q-ins').addEventListener('change', () => $('#q-value-wrap').classList.toggle('hide', !$('#q-ins').checked));

    let pending = null;
    $('#q-btn').addEventListener('click', async () => {
      const btn = $('#q-btn');
      const p = params();
      if (!(p.weight > 0) && !(p.vol > 0)) return toast('Please enter an actual weight or dimensions.', 'err');
      if (p.ins && !(p.value > 0)) return toast('Enter a declared value to insure the shipment.', 'err');
      btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Calculating…';
      try {
        const q = new URLSearchParams({
          origin: p.origin, to: p.to, service: p.service, weight: p.weight || p.vol,
          l: $('#q-l').value, w: $('#q-w').value, h: $('#q-h').value,
          ins: p.ins, value: p.value,
        });
        const res = await api('/api/quote?' + q.toString());
        clearTimeout(pending); pending = setTimeout(() => show(res.quote, p), 50);
      } catch (e) { toast(e.message, 'err'); }
      btn.disabled = false; btn.textContent = 'Calculate quote';
    });

    function show(q, p) {
      $('#q-total').textContent = money(q.total);
      $('#q-servicepill').textContent = q.serviceName;
      $('#q-eta').textContent = `by ${fmtD(q.etaDate)} (${q.etaDays.min}–${q.etaDays.max} business days)`;
      $('#q-lines').innerHTML = q.lines.map((l) => `
        <div class="total-row" style="padding:7px 0;border-bottom:1px dashed var(--line)">
          <span class="small muted">${l.label}</span><b class="num">${money(l.amount)}</b>
        </div>`).join('')
        + `<div class="total-row" style="padding:9px 0"><b>Total (door-to-door)</b><b class="serif" style="font-size:1.2rem;color:var(--navy)">${money(q.total)}</b></div>`;
      $('#q-notes').innerHTML = `<div class="small" style="color:#c9d6ea">Est. delivery window <b>${fmtD(q.minDate)} – ${fmtD(q.etaDate)}</b> · Billable weight <b>${q.billableKg} kg</b>${q.warnings.length ? '' : ''}</div>`;
      if (q.warnings.length) toast(q.warnings[0], 'info', 6000);
      // persist draft
      const draft = { origin: p.origin, to: p.to, service: p.service, weight: p.weight, l: $('#q-l').value, w: $('#q-w').value, h: $('#q-h').value, ins: p.ins, value: p.value, total: q.total };
      try { sessionStorage.setItem('rme_draft', JSON.stringify(draft)); } catch (e) {}
      const btn = $('#q-to-book');
      btn.disabled = false;
      btn.onclick = () => { location.href = '/book.html'; };
    }
  });
})();
