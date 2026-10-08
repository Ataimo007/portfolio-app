export const metadata = {
  title: "Email preferences",
  robots: { index: false, follow: false },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; updated?: string }>;
}) {
  const { token, updated } = await searchParams;
  const valid = Boolean(token && /^[a-f0-9]{64}$/.test(token));
  return (
    <section className="section">
      <div className="section-heading">
        <h1>Email preferences</h1>
      </div>
      {updated === "1" ? (
        <p role="status">
          You are unsubscribed from optional portfolio emails. Your account,
          in-app notifications and security emails are unaffected.
        </p>
      ) : valid ? (
        <form action="/api/email/unsubscribe" method="post">
          <p>
            Stop optional welcome and activity emails sent to the address
            associated with this link. You can continue using your workspace and
            receiving in-app updates.
          </p>
          <input type="hidden" name="token" value={token} />
          <button className="button button-primary" type="submit">
            Unsubscribe from emails
          </button>
        </form>
      ) : (
        <p>
          This preference link is missing or invalid. Open the unsubscribe link
          in a portfolio email.
        </p>
      )}
    </section>
  );
}
