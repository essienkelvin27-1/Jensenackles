import Link from "next/link";
import { signOutAction } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  let user = null;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
  }

  return (
    <header className="site-header">
      <div className="nav-wrap">
        <Link className="brand" href="/" aria-label="TourTickets home">
          <span className="brand-mark">T</span><span>Tour<span className="brand-light">Tickets</span></span>
        </Link>
        <nav className="main-nav" aria-label="Main navigation">
          <Link href="/#events">Find tickets</Link>
          <Link href="/support">Support</Link>
          {user ? (
            <>
              <Link href="/account">My account</Link>
              <form action={signOutAction}><button className="nav-signout" type="submit">Sign out</button></form>
            </>
          ) : (
            <>
              <Link href="/login">Sign in</Link>
              <Link className="button button-small" href="/register">Create account</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function Notice({ message, error }: { message?: string; error?: string }) {
  if (!message && !error) return null;
  return <p className={`notice ${error ? "notice-error" : "notice-success"}`} role="status">{error ?? message}</p>;
}

export function PageHeading({ eyebrow, title, description }: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="page-heading">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
  );
}
