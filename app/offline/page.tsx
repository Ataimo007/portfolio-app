import Link from "next/link";
export const metadata = { title: "You’re offline" };
export default function Page() {
  return (
    <div className="page portal-page">
      <p className="eyebrow">Connection paused</p>
      <h1>Your workspace will be here.</h1>
      <p>
        Reconnect to view private messages, consultations and email. Private
        account data is never stored in the offline cache.
      </p>
      <Link className="button primary" href="/portal">
        Try your workspace again
      </Link>
    </div>
  );
}
