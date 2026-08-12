import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex", subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "Page Capture — Automatic screenshots for licensing applications",
  description: "A local-first Chrome and Edge extension that captures each licensing application page before you continue.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "Page Capture",
    description: "Every licensing application page. Already captured.",
    type: "website",
    images: [{ url: "/og.png", width: 1733, height: 909, alt: "Page Capture — Every page. Already captured." }],
  },
  twitter: { card: "summary_large_image", title: "Page Capture", description: "Every licensing application page. Already captured.", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${manrope.variable} ${plexMono.variable}`}>{children}</body></html>;
}
