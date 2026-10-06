import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { GeistSans } from "geist/font/sans";
import localFont from "next/font/local";
const InstrumentSerif = localFont({
  src: "../public/fonts/InstrumentSerif-Regular.ttf",
  variable: "--font-instrument",
  display: "swap",
});
const JetBrainsMono = localFont({
  src: "../public/fonts/JetBrainsMono-Regular.woff2",
  variable: "--font-geist-mono",
  display: "swap",
});
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import PwaInstallProvider from "@/components/pwa-install-provider";
import PwaRegistration from "@/components/pwa-registration";
import Navigation from "@/components/navigation";
import { SocialLinks } from "@/components/site";
import { profile } from "@/content/site";
import "./globals.css";
import "./brand.css";
import "./portal.css";
import "./platform.css";
export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || "https://ataimoedem.com"),
  title: {
    default:
      "Ataimo Edem | API Management, Solutions Architecture & Customer Engineering",
    template: "%s | Ataimo Edem",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Ataimo", statusBarStyle: "default" },
  icons: { apple: "/brand/pwa-192.png" },
  description: profile.summary,
  openGraph: {
    type: "website",
    siteName: "Ataimo Edem",
    title: "Ataimo Edem — Enterprise API Platforms",
    description: profile.summary,
  },
  twitter: { card: "summary_large_image" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${JetBrainsMono.variable} ${InstrumentSerif.variable}`}
    >
      <body className="tech-grid-bg text-text-main font-sans antialiased">
        <PwaInstallProvider>
          <PwaRegistration />
          <a className="skip-link" href="#main">
            Skip to content
          </a>
          <header className="site-header">
            <div className="header-identity">
              <Link className="brand" href="/" aria-label="Ataimo Edem home">
                <span className="monogram">
                  AE<span>.</span>
                </span>
                <span>
                  ATAIMO EDEM<small>ENGINEER & ARCHITECT</small>
                </span>
              </Link>
              <div
                className="header-contact"
                role="group"
                aria-label="Direct contact"
              >
                <a href={`mailto:${profile.email}`}>
                  <Mail size={16} aria-hidden="true" />
                  {profile.email}
                </a>
                <a href={profile.phoneHref}>
                  <Phone size={16} aria-hidden="true" />
                  {profile.phone}
                </a>
              </div>
            </div>
            <Navigation />
          </header>
          <main id="main">{children}</main>
          <footer>
            <div>
              <strong>
                Ataimo Edem<span className="accent">.</span>
              </strong>
              <p>
                API Management · Solutions Architecture · Customer Engineering
              </p>
            </div>
            <SocialLinks />
            <nav
              className="footer-legal"
              aria-label="Legal and platform information"
            >
              <Link href="/install">Install app</Link>
              <Link href="/status">Platform status</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
            </nav>
            <small>© Ataimo Edem</small>
          </footer>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Person",
                name: profile.name,
                jobTitle: "Customer Success Engineer",
                url: metadata.metadataBase?.toString(),
                sameAs: [profile.github, profile.linkedin],
              }),
            }}
          />
          {process.env.VERCEL && (
            <>
              <Analytics />
              <SpeedInsights />
            </>
          )}
        </PwaInstallProvider>
      </body>
    </html>
  );
}
