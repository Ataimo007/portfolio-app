import PlatformStatus from "@/components/platform-status";
export const metadata = {
  robots: { index: false, follow: false },
  title: "Platform status",
};
export default function Page() {
  return <PlatformStatus />;
}
