import PublicInstall from "@/components/public-install";
export const metadata = {
  title: "Install Ataimo",
  description:
    "Add Ataimo to your phone’s home screen. No account is needed to install and explore the portfolio.",
};
export default function Page() {
  return (
    <div className="page portal-page install-page">
      <div className="portal-intro">
        <p className="eyebrow">Ataimo, wherever you work</p>
        <h1>Keep it close.</h1>
        <p>
          The same portfolio and client workspace, ready to open from your
          phone.
        </p>
      </div>
      <PublicInstall />
    </div>
  );
}
