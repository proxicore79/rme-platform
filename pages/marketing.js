/**
 * Marketing site pages — server-rendered HTML fragments.
 */
const IMG = {
  hero: '/img/hero.jpg', us: '/img/corridor-us.jpg', uk: '/img/corridor-uk.jpg', cn: '/img/corridor-cn.jpg', ug: '/img/dest-ug.jpg',
};

const qs = (o) => Object.entries(o).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');

/* =============================================================== */
/* HOME                                                            */
/* =============================================================== */
export function homePage(ctx) {
  const svcCards = ctx.services.map((s) => `
    <div class="svc">
      <div class="top">
        <div class="icon-tile g">${s.icon}</div>
        <span class="eta">${s.daysMin}–${s.daysMax} days</span>
      </div>
      <h3>${s.name}</h3>
      <p class="muted small">${s.tagline}</p>
      <p class="small">${s.blurb}</p>
      <ul><li>Real-time tracking &amp; status notifications</li><li>Door-to-door across Africa</li><li>Insurance cover available</li></ul>
      <div class="price">from ${fromPrice(s.code)} USD/kg</div>
      <div style="margin-top:auto;display:flex;gap:8px;padding-top:14px">
        <a class="btn btn-navy btn-sm" href="/services.html">Details</a>
        <a class="btn btn-gold btn-sm" href="/book.html?service=${s.code}">Book now</a>
      </div>
    </div>`).join('');

  const lanes = [
    { o: 'US', img: IMG.us, meta: 'JFK · ATL · IAH · LAX — 3–5 days air · 28–40 days sea' },
    { o: 'UK', img: IMG.uk, meta: 'LHR · MAN — 3–5 days air · 28–40 days sea' },
    { o: 'CN', img: IMG.cn, meta: 'SZX · PVG · Yiwu — 3–5 days air · 28–40 days sea (LCL)' },
  ].map((l) => {
    const o = ctx.origins.find((x) => x.code === l.o);
    return `
    <div class="lane">
      <div class="lane-img" style="background-image:url('${l.img}')"></div>
      <div class="lane-shade"></div>
      <div class="lane-body">
        <h3>${o.flag} Ship from ${o.short}</h3>
        <div class="lane-meta">${l.meta}</div>
        <a class="btn btn-gold btn-sm" href="/quote.html?origin=${o.code}">Quote from ${o.short} →</a>
      </div>
    </div>`;
  }).join('');

  const destChips = ctx.destinations.map((d) => `
    <a class="dest-chip" href="/quote.html?to=${encodeURIComponent(d.key)}"><span>${d.flag}</span><span>${d.key}<small>${d.country}</small></span></a>`).join('');

  const steps = [
    ['1', '🗂️', 'Request a quote', 'Get an instant door-to-door price for your parcel or cargo in under a minute.'],
    ['2', '📦', 'We pick up', 'Our partner courier collects from your door anywhere in Europe, the USA or Asia — or drop off at our consolidation hub.'],
    ['3', '✈️ / 🚢', 'We fly or sail it', 'Export handling, the international leg and import customs clearance handled end-to-end.'],
    ['4', '🏠', 'Delivered + notified', 'Delivered to your door anywhere in Africa, with email & SMS updates at every step.'],
  ].map(([n, i, t, d]) => `
    <div class="step">
      <span class="num">${n}</span>
      <span style="font-size:1.7rem">${i}</span>
      <b>${t}</b>
      <p class="muted small" style="margin-bottom:0">${d}</p>
    </div>`).join('');

  const features = [
    ['🛃', 'Licensed customs brokerage', 'Import duties and clearance are handled by our licensed agents at Entebbe, NBO, Mombasa and beyond — door-to-door pricing includes handling and last-mile delivery.'],
    ['🔔', 'Tracking & instant notifications', 'Every shipment carries a unique tracking number. Email and SMS notifications fire automatically at each milestone.'],
    ['🛡️', 'Coverage for what matters', 'Add insurance from 2% of declared value — including electronics, samples and commercial goods.'],
    ['🏘️', 'Door-to-door Africa-wide', 'Home and office delivery across Kampala and other Ugandan cities, plus Kenya, Rwanda, Tanzania, South Sudan, DRC and more.'],
    ['💬', 'WhatsApp concierge desk', 'A real human in Kampala answers around the clock in English and Luganda.'],
    ['⚖️', 'Transparent pricing', 'Charged per chargeable kg (weight or volume). Fuel surcharges shown in your quote — no hidden fees at the door.'],
  ].map(([i, t, d]) => `
    <div class="card">
      <div class="icon-tile n">${i}</div>
      <h3 style="margin-top:12px">${t}</h3>
      <p class="muted small" style="margin-bottom:0">${d}</p>
    </div>`).join('');

  const content = `
  <section class="hero">
    <div class="bgpic" style="background-image:url('${IMG.hero}')"></div>
    <div class="overlay"></div>
    <div class="wrap content">
      <div>
        <div class="kicker">Royal Mail Express International</div>
        <h1>From Europe, USA and Asia to Africa!</h1>
        <p class="lede">Express parcels, air freight and consolidated sea cargo — shipped door-to-door across Africa with real-time tracking, licensed customs brokerage and notifications on every single shipment.</p>
        <div class="statline">
          <div class="stat"><b>3</b><span>Origin regions</span></div>
          <div class="stat"><b>15+</b><span>African cities</span></div>
          <div class="stat"><b>3–5d</b><span>Express air</span></div>
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:28px">
          <a class="btn btn-gold" href="/quote.html">Get an instant quote</a>
          <a class="btn btn-ghost" href="/book.html">Book a shipment</a>
        </div>
      </div>
      <div>
        <form class="trackbox" action="/track.html" method="get">
          <label>Track your package</label>
          <div class="row">
            <input type="text" name="q" placeholder="Paste your tracking number" autocomplete="off">
            <button class="btn btn-red" type="submit">Track</button>
          </div>
          <div class="hint">Format: RME-XX-YYMMDD-######-## · from your booking email</div>
        </form>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="section-head">
        <div class="eyebrow">Our services</div>
        <h2>One network. Three services. Every shipment tracked.</h2>
        <p class="muted">Express Air when it must arrive fast, Standard Air for everyday parcels, Economy Sea (LCL) for volume — all door-to-door from any address in Europe, the USA or Asia.</p>
      </div>
      <div class="grid g3">${svcCards}</div>
    </div>
  </section>

  <section class="section alt">
    <div class="wrap">
      <div class="section-head">
        <div class="eyebrow">Where we collect</div>
        <h2>Three corridors into Africa</h2>
        <p class="muted">Partner networks across the USA, Europe and Asia feed our African gateways, then clear and deliver through our own licensed brokerage and last-mile team.</p>
      </div>
      <div class="grid g3">${lanes}</div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="section-head">
        <div class="eyebrow">Destinations</div>
        <h2>Delivering across Uganda &amp; Africa</h2>
      </div>
      <div class="mini-grid">${destChips}</div>
    </div>
  </section>

  <section class="section alt" id="how">
    <div class="wrap">
      <div class="section-head">
        <div class="eyebrow">How it works</div>
        <h2>Shipped in four simple steps</h2>
      </div>
      <div class="steps">${steps}</div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="section-head">
        <div class="eyebrow">Why Royal Mail Express International</div>
        <h2>Built to keep your shipment visible</h2>
      </div>
      <div class="grid g3">${features}</div>
    </div>
  </section>`;

  return { title: 'From Europe, USA and Asia to Africa — freight, parcels & tracking', active: 'home', desc: 'Royal Mail Express International ships parcels, freight and consolidated sea cargo from Europe, the USA and Asia to cities across Africa — with live tracking and notifications.', content };
}

function fromPrice(code) {
  return { EXPRESS: '12.90', STANDARD: '8.20', SEA: '3.40' }[code] || '—';
}

/* =============================================================== */
/* SERVICES                                                        */
/* =============================================================== */
export function servicesPage(ctx) {
  const rows = ctx.services.map((s) => `
    <div class="svc" id="svc-${s.code}">
      <div class="top"><div class="icon-tile g">${s.icon}</div><span class="eta">${s.daysMin}–${s.daysMax} business days</span></div>
      <h3 style="font-size:1.3rem">${s.name}</h3>
      <p class="small" style="color:#38445a">${s.blurb}</p>
      <div class="grid g2" style="gap:10px">
        <div><b class="small">What's included</b><ul class="small">
          <li>Door-to-door pickup &amp; delivery</li><li>Export + import customs handling</li>
          <li>Full tracking with notifications</li><li>Proof of delivery</li>
        </ul></div>
        <div><b class="small">Best for</b><ul class="small">
          ${s.code === 'EXPRESS' ? '<li>Urgent documents & gifts</li><li>Time-critical business cargo</li><li>Dedicated handling</li>' : ''}
          ${s.code === 'STANDARD' ? '<li>Everyday personal parcels</li><li>Trade samples & e-commerce</li><li>Best air value</li>' : ''}
          ${s.code === 'SEA' ? '<li>Household goods & furniture</li><li>Heavy / bulky commercial cargo</li><li>Lowest cost per kg (min. 20 kg)</li>' : ''}
        </ul></div>
      </div>
      <hr class="divider" style="margin:8px 0">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <span class="price">From ${s.code === 'SEA' ? '2.60' : s.code === 'STANDARD' ? '8.00' : '12.40'} USD/kg to Kampala</span>
        <a class="btn btn-gold btn-sm" href="/book.html?service=${s.code}">Book ${s.name}</a>
      </div>
    </div>`).join('');

  const content = `
  <div class="strip">
    <div class="wrap">
      <div class="crumbs"><a href="/">Home</a> / Services</div>
      <h1>Services &amp; door-to-door rates</h1>
      <p>Three clearly-priced services from every origin, with live tracking and notification on every shipment.</p>
    </div>
  </div>
  <section class="section" style="padding-top:10px;margin-top:-46px">
    <div class="wrap">
      <div class="grid g3" style="align-items:start">${rows}</div>

      <div class="card mt3">
        <h3>Lane &amp; gateway comparison</h3>
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>Origin</th><th>Export gateways</th><th>Express air (door-to-door)</th><th>Economy sea (LCL)</th><th>Partner network</th></tr></thead>
          <tbody>
            ${ctx.origins.map((o) => `<tr>
              <td><b>${o.flag} ${o.short}</b></td>
              <td class="small muted">${o.gateways.join(' · ')}</td>
              <td>3–5 business days</td>
              <td>28–40 days via Mombasa</td>
              <td class="small">${o.partner}</td>
            </tr>`).join('')}
          </tbody>
        </table></div>
        <p class="small muted mt1">All times are indicative business-day estimates after pickup. Sea transit is to gateway port plus road haulage to destination.</p>
      </div>

      <div class="grid g2 mt3" style="align-items:start">
        <div class="card">
          <h3>What's charged for</h3>
          <p class="small muted">Charges are applied to the <b>chargeable weight</b> — the greater of actual weight and volumetric weight (length × width × height ÷ 5,000).</p>
          <ul class="small" style="line-height:1.9">
            <li><b>Freight</b> — per-kg door-to-door rate × zone factor</li>
            <li><b>Fuel &amp; security surcharge</b> — 9% of freight</li>
            <li><b>Handling &amp; documentation</b> — per-shipment fee + last-mile delivery</li>
            <li><b>Insurance</b> — optional, 2% of declared value (min. 6 USD)</li>
          </ul>
          <p class="small muted">Import duties &amp; VAT are quoted separately and cleared by our customs desk before release.</p>
        </div>
        <div class="card">
          <h3>Common questions</h3>
          <details style="margin-bottom:10px"><summary><b>How do notifications work?</b></summary>
          <p class="small muted">Choose at booking to notify the sender, the recipient, or both by email and/or SMS. You'll receive a message at every tracking milestone — pickup, departure, arrival, customs and delivery.</p></details>
          <details style="margin-bottom:10px"><summary><b>Can I ship liquids, batteries or food?</b></summary>
          <p class="small muted">Most personal and commercial goods are fine. Dangerous goods, aerosols and perishables need advance approval from our desk — ask before booking.</p></details>
          <details style="margin-bottom:10px"><summary><b>What happens at customs?</b></summary>
          <p class="small muted">Our licensed brokers file import entries on your behalf. You receive a clearance advice with any duties due before the shipment is released for delivery.</p></details>
          <details><summary><b>Do you consolidate multiple boxes?</b></summary>
          <p class="small muted">Yes — for air we consolidate into one shipment per booking; for sea (LCL) your cargo travels in shared containers, charged on billable volume or weight.</p></details>
        </div>
      </div>
    </div>
  </section>`;
  return { title: 'Services & rates', active: 'services', desc: 'Express Air, Standard Air and Economy Sea (LCL) from the USA, UK and China to Uganda and Africa.', content };
}

/* =============================================================== */
/* QUOTE                                                           */
/* =============================================================== */
export function quotePage(ctx) {
  const originOpts = ctx.origins.map((o) => `<option value="${o.code}">${o.flag} ${o.name}</option>`).join('');
  const destOpts = [...new Set(ctx.destinations.map((d) => d.country))].map((c) => {
    const inner = ctx.destinations.filter((d) => d.country === c)
      .map((d) => `<option value="${d.key}">${d.flag} ${d.key}</option>`).join('');
    return `<optgroup label="${c}">${inner}</optgroup>`;
  }).join('');
  const content = `
  <div class="strip">
    <div class="wrap">
      <div class="crumbs"><a href="/">Home</a> / Instant quote</div>
      <h1>Instant door-to-door quote</h1>
      <p>Weight, route and service in — a transparent breakdown out. No sign-up required.</p>
    </div>
  </div>
  <section class="section" style="padding-top:8px;margin-top:-48px">
    <div class="wrap">
      <div class="grid" style="grid-template-columns:1.15fr .85fr;align-items:start" id="quote-grid">
        <div class="card">
          <div class="field">
            <label>1 · Where is it shipping from?</label>
            <select class="input" id="q-origin">${originOpts}</select>
          </div>
          <div class="field">
            <label>2 · Where is it going?</label>
            <select class="input" id="q-to">${destOpts}</select>
          </div>
          <div class="field">
            <label>3 · Which service?</label>
            <div id="q-service" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
              ${ctx.services.map((s) => `
                <label class="svc-select ${s.code === 'STANDARD' ? 'on' : ''}" data-svc="${s.code}">
                  <input type="radio" name="svc" value="${s.code}" ${s.code === 'STANDARD' ? 'checked' : ''} hidden>
                  <div style="font-size:1.5rem">${s.icon}</div>
                  <b>${s.name}</b><small class="muted">${s.daysMin}–${s.daysMax} days</small>
                </label>`).join('')}
            </div>
          </div>
          <div class="field">
            <label>4 · Shipment size</label>
            <div class="input-row">
              <div><div class="small muted" style="margin-bottom:4px">Actual weight (kg) *</div><input class="input" id="q-weight" type="number" min="0.1" step="0.1" value="8" placeholder="e.g. 8"></div>
              <div><div class="small muted" style="margin-bottom:4px">Volumetric weight</div>
                <div class="input-row3">
                  <input class="input" id="q-l" type="number" min="0" placeholder="L cm">
                  <input class="input" id="q-w" type="number" min="0" placeholder="W cm">
                  <input class="input" id="q-h" type="number" min="0" placeholder="H cm">
                </div>
              </div>
            </div>
            <p class="small muted mt1" id="q-volhint"></p>
          </div>
          <div class="field">
            <label class="switch"><input type="checkbox" id="q-ins"> <span><b>Add insurance</b> — 2% of declared value (min. 6 USD)</span></label>
            <div id="q-value-wrap" class="input-row hide" style="margin-top:8px">
              <input class="input" id="q-value" type="number" min="0" step="10" placeholder="Declared value in USD">
            </div>
          </div>
          <button class="btn btn-navy btn-block" id="q-btn">Calculate quote</button>
          <p class="small faint mt1 center">Door-to-door estimate incl. fuel surcharge, handling &amp; last-mile. Duties/VAT quoted separately at clearance.</p>
        </div>

        <div>
          <div class="quote-card" id="q-result">
            <div class="head">
              <div class="total-row"><span class="muted small">Estimated total (door-to-door)</span><span class="pill pill-gold" id="q-servicepill">Standard Air</span></div>
              <div class="price-tag" id="q-total">—</div>
              <div class="small muted">Est. delivery <span id="q-eta">—</span></div>
            </div>
            <div style="padding:8px 20px" id="q-lines"></div>
            <div class="foot" id="q-notes"><div class="small" style="color:#c9d6ea">Fill in the quote fields and press “Calculate”.</div></div>
          </div>
          <div class="card quiet mt2">
            <h3>💡 Quote tips</h3>
            <ul class="small muted" style="line-height:1.8;margin:0;padding-left:18px">
              <li>Use the greater of actual and volumetric weight.</li>
              <li>Shipments over 25 kg get automatic per-kg discounts.</li>
              <li>Sea (LCL) suits cargo over ~20 chargeable kg.</li>
              <li>Pay in USD, or on request in UGX/GBP at the day's rate.</li>
            </ul>
          </div>
          <div class="card mt2" style="text-align:center">
            <b>Happy with the price?</b>
            <p class="small muted">Lock it in by booking online — you'll get a tracking number instantly.</p>
            <button class="btn btn-gold btn-block" id="q-to-book" disabled>Continue to booking →</button>
          </div>
        </div>
      </div>
    </div>
  </section>
  <script src="/js/quote.js"></script>`;
  return { title: 'Instant quote — door-to-door pricing', active: 'quote', desc: 'Get a transparent door-to-door shipping quote from the US, UK or China to Kampala and cities across Africa.', content };
}

/* =============================================================== */
/* BOOK                                                            */
/* =============================================================== */
export function bookPage(ctx) {
  const originOpts = ctx.origins.map((o) => `<option value="${o.code}">${o.flag} ${o.name}</option>`).join('');
  const destOpts = [...new Set(ctx.destinations.map((d) => d.country))].map((c) => {
    const inner = ctx.destinations.filter((d) => d.country === c)
      .map((d) => `<option value="${d.key}">${d.flag} ${d.key}</option>`).join('');
    return `<optgroup label="${c}">${inner}</optgroup>`;
  }).join('');
  const content = `
  <div class="strip">
    <div class="wrap">
      <div class="crumbs"><a href="/">Home</a> / Book a shipment</div>
      <h1>Book your shipment</h1>
      <p>Complete the form and we'll issue a tracking number immediately. Our Kampala desk confirms pickup within hours.</p>
    </div>
  </div>
  <section class="section" style="padding-top:8px;margin-top:-46px">
    <div class="wrap grid" style="grid-template-columns:1.15fr .85fr;align-items:start" id="book-grid">
      <form id="book-form" class="card" novalidate>
        <h3>1 · Shipment details</h3>
        <div class="grid g2" style="gap:12px">
          <div class="field"><label>Origin country <span class="req">*</span></label><select class="input" id="b-origin" required>${originOpts}</select></div>
          <div class="field"><label>Origin city / zip</label><input class="input" id="b-origincity" placeholder="e.g. New York, NY 10001"></div>
          <div class="field"><label>Destination <span class="req">*</span></label><select class="input" id="b-to" required>${destOpts}</select></div>
          <div class="field"><label>Service <span class="req">*</span></label><select class="input" id="b-service" required>
            ${ctx.services.map((s) => `<option value="${s.code}">${s.icon} ${s.name} — ${s.daysMin}–${s.daysMax} days</option>`).join('')}
          </select></div>
        </div>
        <div class="field"><label>What are you sending? <span class="req">*</span></label><input class="input" id="b-desc" required placeholder="e.g. Laptop & personal documents"></div>
        <div class="grid g3" style="gap:12px">
          <div class="field"><label>Weight (kg) <span class="req">*</span></label><input class="input" id="b-weight" type="number" min="0.1" step="0.1" required></div>
          <div class="field"><label>Pieces</label><input class="input" id="b-pieces" type="number" min="1" value="1"></div>
          <div class="field"><label>Value (USD)</label><input class="input" id="b-value" type="number" min="0" value="0"></div>
        </div>
        <div class="grid g3" style="gap:12px">
          <div class="field"><label>Length (cm)</label><input class="input" id="b-l" type="number" min="0"></div>
          <div class="field"><label>Width (cm)</label><input class="input" id="b-w" type="number" min="0"></div>
          <div class="field"><label>Height (cm)</label><input class="input" id="b-h" type="number" min="0"></div>
        </div>
        <label class="switch" style="margin:6px 0"><input type="checkbox" id="b-ins"> <span>Insure this shipment (2% of declared value)</span></label>

        <hr class="divider">
        <h3>2 · Sender (person we pick up from)</h3>
        <div class="grid g2" style="gap:12px">
          <div class="field"><label>Full name <span class="req">*</span></label><input class="input" id="b-sname" required placeholder="Full name"></div>
          <div class="field"><label>Phone <span class="req">*</span></label><input class="input" id="b-sphone" required placeholder="+1 555 000 1111"></div>
          <div class="field"><label>Email</label><input class="input" id="b-semail" type="email" placeholder="sender@example.com"></div>
          <div class="field"><label>Street address for pickup</label><input class="input" id="b-saddr" placeholder="Address / city / zip"></div>
        </div>

        <hr class="divider">
        <h3>3 · Recipient in Africa</h3>
        <div class="grid g2" style="gap:12px">
          <div class="field"><label>Full name <span class="req">*</span></label><input class="input" id="b-rname" required placeholder="Full name"></div>
          <div class="field"><label>Phone (for delivery) <span class="req">*</span></label><input class="input" id="b-rphone" required placeholder="+256 7XX XXX XXX"></div>
          <div class="field"><label>Email</label><input class="input" id="b-remail" type="email" placeholder="recipient@example.com"></div>
          <div class="field"><label>Delivery address (or "call on arrival")</label><input class="input" id="b-raddr" placeholder="Area / street / landmark"></div>
        </div>

        <hr class="divider">
        <h3>4 · Notifications &amp; notes</h3>
        <div class="grid g2" style="gap:8px">
          <label class="checkbox-line"><input type="checkbox" id="b-n-sender" checked><span><b>Email the sender</b><br><span class="small muted">status updates to the sender's email</span></span></label>
          <label class="checkbox-line"><input type="checkbox" id="b-n-recip" checked><span><b>Email the recipient</b><br><span class="small muted">delivery &amp; customs updates to the recipient</span></span></label>
          <label class="checkbox-line"><input type="checkbox" id="b-n-smss"><span><b>SMS the recipient</b><br><span class="small muted">text alerts on the recipient's phone</span></span></label>
        </div>
        <div class="field mt1"><label>Notes for our team</label><textarea class="input" id="b-notes" placeholder="Fragile items? Call first? Insurance receipts?"></textarea></div>

        <button class="btn btn-gold btn-block mt2" id="b-submit" type="submit">Confirm booking — issue tracking number</button>
        <p class="small muted center mt1">🔒 Demo checkout — no card required. Payment (MTN MoMo / Airtel Money / bank / card) is arranged with our desk after booking.</p>
      </form>

      <div>
        <div class="quote-card">
          <div class="head"><div class="muted small">Live estimate for this booking</div>
            <div class="price-tag" id="b-total">—</div>
            <div class="small muted" id="b-eta">—</div>
          </div>
          <div style="padding:6px 20px" id="b-lines"></div>
          <div class="foot small" id="b-notes2"></div>
        </div>
        <div class="card quiet mt2">
          <h3>What happens next?</h3>
          <ol class="small muted" style="line-height:1.9;margin:0;padding-left:20px">
            <li>You receive a tracking number (format RME-XX-YYMMDD-######-##).</li>
            <li>Our partner courier contacts the sender to schedule pickup.</li>
            <li>Email/SMS updates fire at every milestone — no app needed.</li>
            <li>Customs desk clears the shipment and it goes out for delivery.</li>
          </ol>
        </div>
      </div>
    </div>
    <div class="card mt2 hide" id="b-success">
      <div style="text-align:center;padding:8px 0">
        <div style="font-size:3rem">🎉</div>
        <h2>Shipment booked!</h2>
        <p class="muted">Your Royal Mail Express tracking number is:</p>
        <div style="font-family:Georgia,serif;font-size:1.9rem;font-weight:700;color:var(--navy);letter-spacing:.5px" id="b-tracking">—</div>
        <div class="small muted mt1" id="b-notified"></div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:18px">
          <a class="btn btn-navy" id="b-tracklink" href="#">Track this shipment →</a>
          <button class="btn btn-outline" id="b-new">Book another</button>
        </div>
      </div>
    </div>
  </section>
  <script src="/js/book.js"></script>`;
  return { title: 'Book a shipment', active: 'book', desc: 'Book door-to-door freight from the USA, UK or China to Uganda and Africa and receive a tracking number instantly.', content };
}

/* =============================================================== */
/* CONTACT / ABOUT / 404                                           */
/* =============================================================== */
export function contactPage() {
  const content = `
  <div class="strip"><div class="wrap"><div class="crumbs"><a href="/">Home</a> / Contact</div>
    <h1>Talk to a human in Kampala</h1>
    <p>Reach the operations desk 24/7 — by phone, WhatsApp, email or the form below.</p></div></div>
  <section class="section" style="padding-top:8px;margin-top:-48px">
    <div class="wrap grid g3">
      <div class="card"><div style="font-size:1.6rem">📞</div><h3>Phone &amp; WhatsApp</h3>
        <p><b>+256 772 300 400</b><br><span class="muted small">24/7 tracking line</span></p>
        <p class="small muted">English &amp; Luganda support. WhatsApp status messages available.</p></div>
      <div class="card"><div style="font-size:1.6rem">✉️</div><h3>Email</h3>
        <p><b>care@royalmail-express.com</b><br><span class="muted small">replies within one business day</span></p>
        <p class="small muted">For customs documents: clearance@royalmail-express.com</p></div>
      <div class="card"><div style="font-size:1.6rem">📍</div><h3>Head office</h3>
        <p>RME House, Plot 17 Kampala Road,<br>P.O. Box 7261, Kampala, Uganda</p>
        <p class="small muted">Mon–Fri 08:00–18:00 · Sat 09:00–14:00 EAT</p></div>
    </div>
    <div class="wrap grid mt2" style="grid-template-columns:1.1fr .9fr;align-items:start">
      <form class="card" id="c-form">
        <h3>Send us a message</h3>
        <div class="grid g2" style="gap:12px">
          <div class="field"><label>Name</label><input class="input" id="c-name"></div>
          <div class="field"><label>Email / phone</label><input class="input" id="c-email"></div>
        </div>
        <div class="field"><label>Subject</label><select class="input" id="c-subj">
          <option>Booking a shipment</option><option>Tracking a package</option><option>Customs / duties question</option>
          <option>Commercial / trade quote</option><option>Something else</option></select></div>
        <div class="field"><label>Message</label><textarea class="input" id="c-msg"></textarea></div>
        <button class="btn btn-navy" type="submit">Send message</button>
      </form>
      <div class="card">
        <h3>Office locations</h3>
        <ul style="line-height:2;padding-left:18px" class="small">
          <li>🇺🇬 <b>Kampala HQ</b> — Kampala Road, Kampala</li>
          <li>🇺🇬 <b>Entebbe desk</b> — Airport area (cargo clearances)</li>
          <li>🇺🇸 <b>Atlanta</b> — US consolidation hub</li>
          <li>🇬🇧 <b>London</b> — UK partner network</li>
          <li>🇨🇳 <b>Shenzhen / Yiwu</b> — China trade desks</li>
        </ul>
        <hr class="divider">
        <p class="small muted">Authorised freight forwarder &amp; licensed customs broker. IATA / CASS member network partners.</p>
      </div>
    </div>
  </section>
  <script>
    document.getElementById('c-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('c-name').value;
      const msg = document.getElementById('c-msg').value;
      try {
        const r = await api('/api/contact', { method:'POST', body: JSON.stringify({ name, message: msg, email: document.getElementById('c-email').value, subject: document.getElementById('c-subj').value }) });
        toast(r.message, 'ok'); e.target.reset();
      } catch(err){ toast(err.message, 'err'); }
    });
  </script>`;
  return { title: 'Contact us', active: 'contact', desc: 'Contact Royal Mail Express International in Kampala — 24/7 phone, WhatsApp, email and office locations.', content };
}

export function aboutPage() {
  const content = `
  <div class="strip"><div class="wrap"><div class="crumbs"><a href="/">Home</a> / About</div>
    <h1>Moving things home — and Africa forward</h1>
    <p>Royal Mail Express International was founded in Kampala to make shipping from the USA, UK and China to Uganda and Africa simple, visible and trustworthy.</p></div></div>
  <section class="section" style="padding-top:8px;margin-top:-48px">
    <div class="wrap grid" style="grid-template-columns:1fr .9fr;align-items:start">
      <div>
        <h2>Our story</h2>
        <p>Every diaspora family knows the pain: a parcel posted in New York or London that disappears into the void, or a business in Kampala waiting weeks on a container with no visibility. Royal Mail Express International was built to end that.</p>
        <p>We pair partner courier networks in the United States, the United Kingdom and China with our own licensed brokerage and last-mile team in Uganda and East Africa — then wrap the whole journey in one tracking number and automatic notifications.</p>
        <p class="muted">Today we move personal effects, gifts, trade samples, e-commerce and full LCL containers from three continents into Kampala and more than a dozen African cities.</p>
        <div class="grid g3 mt2">
          <div class="card center"><div class="serif" style="font-size:1.8rem;color:var(--gold)">24/7</div><div class="small muted">support desk</div></div>
          <div class="card center"><div class="serif" style="font-size:1.8rem;color:var(--gold)">15+</div><div class="small muted">cities served</div></div>
          <div class="card center"><div class="serif" style="font-size:1.8rem;color:var(--gold)">3</div><div class="small muted">origin continents</div></div>
        </div>
      </div>
      <div class="card">
        <h3>Our commitments</h3>
        <ul style="line-height:2.1;padding-left:18px">
          <li>✔ <b>Honest weight</b> — charged on real, declared dimensions</li>
          <li>✔ <b>Live updates</b> — you should never have to ask where it is</li>
          <li>✔ <b>Licensed brokerage</b> — customs handled by professionals</li>
          <li>✔ <b>Safe hands</b> — insured options on every lane</li>
          <li>✔ <b>Local voice</b> — Kampala-based, English &amp; Luganda</li>
        </ul>
        <hr class="divider">
        <p class="small muted">“Every box we move carries a story — a graduation gift, medicine, a first stock order. We treat it that way.” — RME operations team</p>
        <a class="btn btn-gold btn-block" href="/quote.html">Get your quote</a>
      </div>
    </div>
  </section>`;
  return { title: 'About Royal Mail Express International', active: 'about', desc: 'About Royal Mail Express International — freight and parcel services between the USA, UK, China and Uganda/Africa.', content };
}

export function notFoundPage() {
  const content = `
  <section class="section"><div class="wrap center" style="max-width:560px;margin:auto">
    <div style="font-size:4rem">🧭</div>
    <h1>Page not found</h1>
    <p class="muted">The page you're looking for has moved — or never existed.</p>
    <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
      <a class="btn btn-navy" href="/">Back to home</a>
      <a class="btn btn-outline" href="/track.html">Track a shipment</a>
    </div>
  </div></section>`;
  return { title: 'Not found', active: '', desc: 'Page not found', content };
}
