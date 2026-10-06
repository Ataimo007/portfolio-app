import Portal from "@/components/portal";
export const metadata = {
  title: "Owner workspace",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <Portal ownerOnly />;
}
