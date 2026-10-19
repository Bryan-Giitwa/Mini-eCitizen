const nodemailer = require("nodemailer");

const SMS_ENDPOINT = "https://api.jmatecsystems.com/api/v1/sms/sendsms";
const APP_URL = process.env.CLIENT_URL || "https://hudumahub.jmatecsystems.com";

let transporter;

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );
}

function getFirstName(name) {
  return String(name || "Citizen")
    .trim()
    .split(/\s+/)[0]
    .slice(0, 32);
}

function createEmail({
  name,
  greetingPrefix = "Hello",
  greetingName = name,
  subject,
  heading,
  intro,
  details = [],
  footer,
}) {
  const safeGreetingName = escapeHtml(greetingName);
  const detailRows = details
    .map(
      ({ label, value }) => `
    <tr>
      <td style="padding:12px 0;color:#667085;font-size:13px;border-bottom:1px solid #e7edf0;">${escapeHtml(label)}</td>
      <td style="padding:12px 0;color:#18324a;font-size:14px;font-weight:700;text-align:right;border-bottom:1px solid #e7edf0;">${escapeHtml(value)}</td>
    </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:24px 12px;background:#f2f5f7;font-family:Arial,Helvetica,sans-serif;color:#18324a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(subject)}</div>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e1e8ec;border-radius:12px;overflow:hidden;">
      <tr><td style="height:6px;background:#16877d;font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr><td style="padding:24px 32px;background:#18324a;color:#ffffff;">
        <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#c9e8e4;">HUDUMA HUB</p>
        <h1 style="margin:12px 0 0;font-size:24px;line-height:1.3;color:#ffffff;">${escapeHtml(heading)}</h1>
      </td></tr>
      <tr><td style="padding:30px 32px 24px;">
        <p style="margin:0 0 14px;font-size:16px;line-height:1.6;">${escapeHtml(greetingPrefix)} ${safeGreetingName},</p>
        <p style="margin:0 0 22px;color:#475467;font-size:15px;line-height:1.7;">${escapeHtml(intro)}</p>
        ${details.length ? `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 24px;border-top:1px solid #e7edf0;">${detailRows}</table>` : ""}
        <a href="${escapeHtml(APP_URL)}" style="display:inline-block;padding:12px 18px;background:#16877d;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;border-radius:6px;">Visit Huduma Hub</a>
        <p style="margin:24px 0 0;color:#475467;font-size:14px;line-height:1.6;">${escapeHtml(footer)}</p>
      </td></tr>
      <tr><td style="padding:18px 32px;background:#f7f9fa;border-top:1px solid #e7edf0;color:#667085;font-size:12px;line-height:1.6;">
        This is an automated service message from Huduma Hub. Please do not reply to this email.
      </td></tr>
    </table>
  </body>
</html>`;

  const textDetails = details
    .map(({ label, value }) => `${label}: ${value}`)
    .join("\n");
  return {
    subject,
    text: `Huduma Hub\n\n${greetingPrefix} ${greetingName},\n\n${intro}${textDetails ? `\n\n${textDetails}` : ""}\n\n${footer}\n\nVisit ${APP_URL}`,
    html,
  };
}

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT || 465);
  const user = process.env.EMAIL_USERNAME;
  const pass = process.env.EMAIL_PASSWORD;
  if (
    !host ||
    !user ||
    !pass ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw new Error(
      "Email notifications require valid EMAIL_HOST, EMAIL_PORT, EMAIL_USERNAME, and EMAIL_PASSWORD settings",
    );
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });
  return transporter;
}

async function sendEmail(to, message) {
  if (!to) throw new Error("Email notification recipient is missing");
  const from =
    process.env.EMAIL_FROM || `Huduma Hub <${process.env.EMAIL_USERNAME}>`;
  await getTransporter().sendMail({ from, to, ...message });
}

async function sendSms(phone, message) {
  if (!phone)
    throw new Error(
      "SMS notification recipient has no registered phone number",
    );
  const apiKey = process.env.SMS_API_KEY;
  const senderId = process.env.SMS_SENDER_ID;
  if (!apiKey || !senderId) {
    throw new Error(
      "SMS notifications require SMS_API_KEY and SMS_SENDER_ID settings",
    );
  }

  const recipient = String(phone).replace(/\D/g, "");
  if (!recipient)
    throw new Error("SMS notification recipient phone number is invalid");

  const response = await fetch(SMS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      sender_id: senderId,
      message,
      phone: recipient,
    }),
    signal: AbortSignal.timeout(10000),
  });

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(
      `SMS provider returned a non-JSON response (HTTP ${response.status})`,
    );
  }

  const hasSuccessfulRecipient =
    Array.isArray(result?.data) &&
    result.data.some((entry) => entry.status === "success");
  if (
    !response.ok ||
    result?.status_code !== 2000 ||
    result?.status !== "complete" ||
    !hasSuccessfulRecipient
  ) {
    throw new Error(
      `SMS provider did not confirm delivery (HTTP ${response.status})`,
    );
  }
}

async function deliver(event, channels) {
  const outcomes = await Promise.allSettled(
    channels.map(async ([channel, send]) => {
      await send();
      console.info(`[notifications] ${event}: ${channel} delivered`);
    }),
  );

  outcomes.forEach((outcome, index) => {
    if (outcome.status === "rejected") {
      const reason =
        outcome.reason instanceof Error
          ? outcome.reason.message
          : String(outcome.reason);
      console.error(
        `[notifications] ${event}: ${channels[index][0]} delivery failed: ${reason}`,
      );
    }
  });
}

async function sendWelcome({ name, email, phone }) {
  const firstName = getFirstName(name);
  const message = createEmail({
    name,
    subject: "Welcome to Huduma Hub",
    heading: "Welcome to Huduma Hub",
    intro:
      "Your citizen account is ready. You can now report local service issues, follow their progress, and stay informed as your community requests are handled.",
    footer:
      "Thank you for helping make our communities better. We are glad to have you with us.",
  });
  const sms = `Hi ${firstName}, Welcome to Huduma Hub! Your citizen account is ready. Submit requests and track progress online.`;
  await deliver("citizen welcome", [
    ["email", () => sendEmail(email, message)],
    ["sms", () => sendSms(phone, sms)],
  ]);
}

async function sendRequestReceived({
  id,
  name,
  email,
  phone,
  category,
  location,
}) {
  const firstName = getFirstName(name);
  const subject = `We received your request #${id}`;
  const intro =
    "Your service request has been received and is now Pending. Our team will review it and keep you informed as its status changes.";
  const message = createEmail({
    name,
    greetingPrefix: "Hi",
    greetingName: firstName,
    subject,
    heading: "Request received",
    intro,
    details: [
      { label: "Request number", value: `#${id}` },
      { label: "Service category", value: category },
      { label: "Location", value: location },
      { label: "Current status", value: "Pending" },
    ],
    footer:
      "You can sign in to Huduma Hub at any time to view your request and its activity.",
  });
  const sms = `Hi ${firstName}, Huduma Hub received your ${category}. Status: Pending. We will keep you updated.`;

  await deliver(`request ${id} received`, [
    ["email", () => sendEmail(email, message)],
    ["sms", () => sendSms(phone, sms)],
  ]);
}

async function sendRequestStatusUpdate({
  id,
  name,
  email,
  phone,
  category,
  location,
  status,
}) {
  const firstName = getFirstName(name);
  const subject = `Request #${id} status update: ${status}`;
  const intro = `There is an update to your service request. Its current status is ${status}.`;
  const message = createEmail({
    name,
    subject,
    heading: "Your request has an update",
    intro,
    details: [
      { label: "Request number", value: `#${id}` },
      { label: "Service category", value: category },
      { label: "Location", value: location },
      { label: "Current status", value: status },
    ],
    footer:
      "You can sign in to Huduma Hub to view the full request details and activity history.",
  });
  const sms = `Hi ${firstName}, Huduma Hub Request (${category}) is now ${status}. Sign in to view the latest update.`;
  await deliver(`request ${id} status update`, [
    ["email", () => sendEmail(email, message)],
    ["sms", () => sendSms(phone, sms)],
  ]);
}

async function sendSupportContact({ name, email, phone, message: inquiry }) {
  const firstName = getFirstName(name);
  const supportEmail = process.env.SUPPORT_EMAIL || process.env.EMAIL_USERNAME;
  if (!supportEmail) {
    throw new Error("Support email recipient is not configured");
  }

  const details = [
    { label: "Name", value: name },
    { label: "Email", value: email },
    { label: "Phone", value: phone },
  ];
  const supportMessage = createEmail({
    name: "Support team",
    subject: "Huduma Hub support inquiry",
    heading: "New support inquiry",
    intro: inquiry,
    details,
    footer: "Reply directly to this email to contact the citizen.",
  });
  const confirmation = createEmail({
    name,
    greetingPrefix: "Hi",
    greetingName: firstName,
    subject: "We received your Huduma Hub support request",
    heading: "We’re here to help",
    intro:
      "We have received your message. A Huduma Hub support team member will contact you soon using the details you provided.",
    details: [{ label: "Your message", value: inquiry }],
    footer:
      "Thank you for contacting Huduma Hub. If your matter is urgent, you can also reach us on WhatsApp.",
  });

  await sendEmail(supportEmail, {
    ...supportMessage,
    replyTo: { name, address: email },
  });
  await sendEmail(email, confirmation);
}

module.exports = {
  sendWelcome,
  sendRequestReceived,
  sendRequestStatusUpdate,
  sendSupportContact,
};
