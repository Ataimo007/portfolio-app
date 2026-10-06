import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default function SignUp() {
  redirect("/api/auth/login?screen=signup");
}
