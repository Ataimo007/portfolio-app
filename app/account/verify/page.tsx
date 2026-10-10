import AccountVerification from "@/components/account-verification";
export const metadata = {
  title: "Account verification",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default function Page() {
  return <AccountVerification />;
}
