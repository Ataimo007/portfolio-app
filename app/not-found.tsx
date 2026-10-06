import Link from "next/link";
import { Intro } from "@/components/site";
export default function NotFound() {
  return (
    <div className="page">
      <Intro label="404" title="This route doesn’t exist." />
      <Link className="button primary" href="/">
        Return home →
      </Link>
    </div>
  );
}
