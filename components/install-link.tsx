"use client";
import Link from "next/link";
import { usePwaInstall } from "./pwa-install-provider";
export default function InstallLink() {
  const { installed } = usePwaInstall();
  return installed ? null : <Link href="/install">Install app</Link>;
}
