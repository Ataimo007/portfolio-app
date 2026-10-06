import Portal from "@/components/portal";
export const metadata = {
  title: "Client portal",
  robots: { index: false, follow: false },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string }>;
}) {
  return <Portal authError={(await searchParams).auth} />;
}
