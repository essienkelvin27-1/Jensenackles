import Link from "next/link";
import { createOrderAction } from "@/app/actions";
import { Notice } from "@/app/components";
import { createClient } from "@/lib/supabase/server";

type Event = {
  id: string;
  name: string;
  description: string;
  venue: string;
  starts_at: string;
  price_cents: number;
  capacity: number;
  image_url: string | null;
};

export default async function Home({ searchParams }: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  let events: Event[] = [];
  let backendError = "";
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (configured) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("events")
      .select("id,name,description,venue,starts_at,price_cents,capacity,image_url")
      .eq("published", true)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at")
      .limit(50);
    if (error) backendError = "Upcoming events could not be loaded. Please try again later.";
    else events = (data ?? []) as Event[];
  }

  return (
    <>
      <section className="hero">
        <div className="hero-orb hero-orb-one" />
        <div className="hero-orb hero-orb-two" />
        <div className="hero-content">
          <span className="eyebrow eyebrow-light">Make room for a good night</span>
          <h1>Live is better<br /><span>when you’re there.</span></h1>
          <p>Find your next unforgettable night. Secure your tickets, skip the stress, and get back to the good part.</p>
          <a className="button button-coral" href="#events">Explore events <span aria-hidden="true">↗</span></a>
          <div className="hero-proof"><span className="proof-dot" /> A smoother way to get there</div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="ticket-illustration">
            <span className="ticket-kicker">YOUR NEXT<br />GREAT NIGHT</span>
            <span className="ticket-star">✳</span>
            <span className="ticket-line" />
            <span className="ticket-bottom">LIVE EXPERIENCES · MADE EASY</span>
          </div>
          <span className="hero-caption">KEEP THE MOMENT.<br />WE’LL HANDLE THE TICKET.</span>
        </div>
        <div className="hero-bottom"><span>01 — DISCOVER</span><span>02 — BOOK</span><span>03 — BE THERE</span></div>
      </section>

      <section className="section events-section" id="events">
        <div className="section-top">
          <div><span className="eyebrow">On the calendar</span><h2>Find your next <em>favorite.</em></h2></div>
          <span className="section-note">The best nights don’t happen by accident.</span>
        </div>
        <Notice error={params.error} message={params.message} />
        {backendError && <p className="notice notice-error">{backendError}</p>}
        {!configured ? (
          <div className="empty-state">
            <span className="empty-icon">✳</span>
            <h3>Your next night out starts here.</h3>
            <p>Connect a Supabase project and publish an event to start selling tickets.</p>
          </div>
        ) : events.length === 0 && !backendError ? (
          <div className="empty-state">
            <span className="empty-icon">✳</span>
            <h3>Something good is on its way.</h3>
            <p>There are no upcoming events just yet. Check back soon.</p>
          </div>
        ) : (
          <div className="event-grid">
            {events.map((event) => (
              <article className="event-card" key={event.id}>
                <div className="event-art" style={event.image_url ? { backgroundImage: `linear-gradient(180deg,transparent 35%,rgba(16,28,34,.5)),url("${event.image_url}")` } : undefined}>
                  <span className="event-date">{new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(event.starts_at))}</span>
                  {!event.image_url && <span className="event-art-mark">✳</span>}
                  <span className="event-venue">{event.venue}</span>
                </div>
                <div className="event-details">
                  <div className="event-date-long">{new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date(event.starts_at))}</div>
                  <h3>{event.name}</h3>
                  <p>{event.description}</p>
                  <div className="event-buy">
                    <span>From <strong>{new Intl.NumberFormat("en", { style: "currency", currency: "USD" }).format(event.price_cents / 100)}</strong></span>
                    <form action={createOrderAction}>
                      <input type="hidden" name="event_id" value={event.id} />
                      <label className="sr-only" htmlFor={`quantity-${event.id}`}>Ticket quantity</label>
                      <select className="quantity-select" id={`quantity-${event.id}`} name="quantity" defaultValue="1" aria-label={`Ticket quantity for ${event.name}`}>
                        {Array.from({ length: 10 }, (_, index) => (
                          <option key={index + 1} value={index + 1}>{index + 1} {index === 0 ? "ticket" : "tickets"}</option>
                        ))}
                      </select>
                      <button className="button button-dark button-small" type="submit">Get tickets <span aria-hidden="true">↗</span></button>
                    </form>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="trust-band">
        <div><span className="trust-icon">◎</span><span><strong>Tickets that stay with you</strong><small>Digital tickets, always in your account.</small></span></div>
        <div><span className="trust-icon">↗</span><span><strong>Human help when you need it</strong><small>Real support for the moments that matter.</small></span></div>
        <Link href="/support" className="text-link">How it works <span aria-hidden="true">↗</span></Link>
      </section>
    </>
  );
}
