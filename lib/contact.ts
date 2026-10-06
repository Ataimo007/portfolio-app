export type Contact = {
  name: string;
  email: string;
  company: string;
  message: string;
};
export function validateContact(input: unknown): Contact | null {
  if (!input || typeof input !== "object") return null;
  const data = input as Record<string, unknown>;
  if (
    !["name", "email", "company", "message"].every(
      (k) => typeof data[k] === "string",
    )
  )
    return null;
  const { name, email, company, message } = data as Contact;
  if (
    !name.trim() ||
    name.length > 120 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    company.length > 200 ||
    message.trim().length < 10 ||
    message.length > 5000
  )
    return null;
  return {
    name: name.trim(),
    email: email.trim(),
    company: company.trim(),
    message: message.trim(),
  };
}
