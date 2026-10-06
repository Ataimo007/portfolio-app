import type { Contact } from "./contact";
export async function sendContact(data: Contact) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM;
  const to = process.env.CONTACT_TO;
  if (!key || !from || !to) return "unconfigured";
  const result = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: data.email,
      subject: "Portfolio enquiry",
      text: `Name: ${data.name}\nCompany: ${data.company}\n\n${data.message}`,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!result.ok) throw new Error("Delivery failed");
  return "sent";
}
