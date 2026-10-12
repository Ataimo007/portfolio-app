export function configuredMailboxes(env = process.env) {
  if (!env.MAIL_HOST) return [];
  const accounts = [];
  if (env.MAIL_USER && env.MAIL_PASSWORD)
    accounts.push({
      id: "ataimo",
      address: env.MAIL_USER,
      password: env.MAIL_PASSWORD,
    });
  if (env.MAIL_ADMIN_PASSWORD)
    accounts.push({
      id: "admin",
      address: "admin@ataimo.com",
      password: env.MAIL_ADMIN_PASSWORD,
    });
  return accounts;
}
