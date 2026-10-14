import SignupForm from "@/components/signup-form";
export const metadata = {
  title: "Create your account",
  robots: { index: false, follow: false },
};
export default async function Signup({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const mode = (await searchParams).mode === "resend" ? "resend" : "signup";
  return (
    <div className="page signup-page">
      <div className="signup-introduction">
        <h1>
          A place to <em>work together.</em>
        </h1>
        <p>
          Request a consultation, follow your engagement and keep our
          conversation in one private workspace.
        </p>
      </div>
      <SignupForm key={mode} initialMode={mode} />
    </div>
  );
}
