import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/app/components";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "TourTickets — Live experiences, made easy",
    template: "%s | TourTickets",
  },
  description: "Discover live events, book tickets securely, and keep every ticket in one place.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        <main>{children}</main>
        <footer className="site-footer">
          <div className="footer-inner">
            <Link className="brand" href="/">Tour<span className="brand-light">Tickets</span></Link>
            <p>Good nights start here.</p>
            <span>© {new Date().getFullYear()} TourTickets</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
