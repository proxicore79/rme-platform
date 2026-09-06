/**
 * Notification engine.
 * Every status change raises notifications to the parties who opted in:
 *   'email' — delivered via SendGrid or SMTP (nodemailer) when configured
 *   'sms'   — delivered via Twilio when configured
 *   'app'   — always logged to the in-app notification stream (dashboard)
 * If no external provider is configured, email/SMS messages are fully formed,
 * logged and flagged `simulated`, so the whole flow is demoable without keys.
 */
import { env } from './config.js';
import { getStore } from './db.js';

async function deliverEmail(to, subject, text) {
  if (env.sendgridKey) {
    const { default: sg } = await import('@sendgrid/mail');
    sg.setApiKey(env.sendgridKey);
    const [, err] = await sg.send({ to, from: env.sendgridFrom, subject, text }).then((r) => [r, null], (e) => [null, e]);
    if (err) throw err;
    return true;
  }
  if (env.smtpHost) {
    const { default: nm } = await import('nodemailer');
    const t = nm.createTransport({
      host: env.smtpHost, port: env.smtpPort, secure: env.smtpSecure,
      auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPass } : undefined,
    });
    await t.sendMail({ from: env.mailFrom, to, subject, text });
    return true;
  }
  return false; // simulated
}

async function deliverSms(to, body) {
  if (env.twilioSid && env.twilioToken && env.twilioFrom) {
    const { default: Twilio } = await import('twilio');
    const client = new Twilio(env.twilioSid, env.twilioToken);
    await client.messages.create({ from: env.twilioFrom, to, body });
    return true;
  }
  return false;
}

/**
 * Compose + dispatch notifications for a shipment change.
 * @returns {Promise<Array>} the notification-log rows created
 */
export async function sendNotifications({ shipmentId, trackingNo, kind, shipment, event, notifyPrefs }) {
  const prefs = notifyPrefs || { senderEmail: true, senderPhone: false, recipientEmail: true, recipientPhone: false };
  const store = getStore();
  const subject = buildSubject(trackingNo, kind, event);
  const text = buildBody(shipment, event, kind);
  const recipients = [
    ...(shipment.sender?.email && prefs.senderEmail !== false ? [{ to: shipment.sender.email, who: 'sender', channel: 'email' }] : []),
    ...(shipment.recipient?.email && prefs.recipientEmail !== false ? [{ to: shipment.recipient.email, who: 'recipient', channel: 'email' }] : []),
    ...(shipment.sender?.phone && prefs.senderPhone ? [{ to: shipment.sender.phone, who: 'sender', channel: 'sms' }] : []),
    ...(shipment.recipient?.phone && prefs.recipientPhone ? [{ to: shipment.recipient.phone, who: 'recipient', channel: 'sms' }] : []),
  ];

  const rows = [];
  for (const r of recipients) {
    let delivered = false;
    try {
      delivered = r.channel === 'email' ? await deliverEmail(r.to, subject, text) : await deliverSms(r.to, text);
    } catch (e) {
      delivered = false;
    }
    rows.push(await store.insertNotification({
      shipmentId, trackingNo, channel: r.channel, to: r.to, kind,
      subject, body: text, status: delivered ? 'sent' : 'simulated',
    }));
  }
  // Always persist an in-app stream entry.
  rows.push(await store.insertNotification({
    shipmentId, trackingNo, channel: 'app', to: 'dashboard', kind,
    subject, body: text, status: 'sent',
  }));
  return rows;
}

export function buildSubject(trackingNo, kind, event) {
  if (kind === 'booking') return `Booking confirmed — ${trackingNo}`;
  if (kind === 'system') return `Update on shipment ${trackingNo}`;
  return `${trackingNo} — ${event?.label || 'status update'}`;
}

function buildBody(shipment, event, kind) {
  const lines = [
    'Royal Mail Express International',
    'Door-to-door freight · USA · UK · China → Uganda & Africa',
    '----------------------------------------',
    kind === 'booking'
      ? `Your booking is confirmed. Keep this tracking number safe.`
      : `Status update: ${event?.label || 'see details'}`,
    `Tracking number: ${shipment.trackingNo}`,
  ];
  if (shipment.service) lines.push(`Service: ${shipment.service}`);
  if (event?.location) lines.push(`Location: ${event.location}`);
  if (event?.at) lines.push(`Time: ${new Date(event.at).toLocaleString()}`);
  if (event?.note) lines.push(`Note: ${event.note}`);
  lines.push('----------------------------------------');
  lines.push('Track anytime at your Royal Mail Express portal');
  lines.push('Support: Kampala HQ · +256 772 300 400 · Mon–Sat');
  return lines.join('\n');
}
