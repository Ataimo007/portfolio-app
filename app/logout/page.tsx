import Link from "next/link";
export default function LogoutPage() {
  return (
    <main className="page">
      <h1>Log out</h1>
      <p>Ready to leave your workspace?</p>
      <form action="/api/auth/logout" method="post">
        <button className="button primary" type="submit">
          Log out
        </button>
      </form>
      <Link href="/portal">Back to your workspace</Link>
    </main>
  );
}
