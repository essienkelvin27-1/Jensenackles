import type { Metadata } from "next";
import { createEventAction, setEventPublishedAction } from "@/app/actions";
import { Notice, PageHeading } from "@/app/components";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Events and inventory" };

type Event = {
  id: string;
  name: string;
  venue: string;
  starts_at: string;
  price_cents: number;
  capacity: number;
  published: boolean;
};

export default async function AdminEvents({ searchParams }: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const { supabase } = await requireAdmin();
  const { data: events, error } = await supabase.from("events")
    .select("id,name,venue,starts_at,price_cents,capacity,published")
    .order("starts_at", { ascending: false })
    .limit(200);
  return (
    <>
      <PageHeading eyebrow="What’s on" title="Events & inventory." description="Create events, set ticket prices and capacity, and control which events are shown to customers." />
      <Notice error={params.error} message={params.message} />
      <div className="split-layout">
        <section className="panel">
          <h2>Create an event</h2>
          <form action={createEventAction} className="form-stack">
            <div className="field"><label htmlFor="name">Event name</label><input id="name" name="name" minLength={3} maxLength={120} required /></div>
            <div className="field"><label htmlFor="description">Description</label><textarea id="description" name="description" minLength={10} maxLength={4000} required /></div>
            <div className="field"><label htmlFor="venue">Venue</label><input id="venue" name="venue" maxLength={200} required /></div>
            <div className="field"><label htmlFor="starts_at">Start date and time (UTC)</label><input id="starts_at" name="starts_at" type="datetime-local" required /><span className="field-hint">Times are saved as UTC.</span></div>
            <div className="field"><label htmlFor="price_dollars">Ticket price (USD)</label><input id="price_dollars" name="price_dollars" type="number" min="0.01" step="0.01" required /></div>
            <div className="field"><label htmlFor="capacity">Ticket capacity</label><input id="capacity" name="capacity" type="number" min="1" step="1" required /></div>
            <div className="field"><label htmlFor="image_url">Event image URL (optional)</label><input id="image_url" name="image_url" type="url" /></div>
            <label className="checkbox-field"><input name="published" type="checkbox" /> Publish immediately</label>
            <button className="button button-dark" type="submit">Create event</button>
          </form>
        </section>
        <section className="panel">
          <h2>Manage events</h2>
          {error && <p className="notice notice-error">Events could not be loaded.</p>}
          {(!events || events.length === 0) && !error && <p className="muted text-small">No events have been created.</p>}
          {(events as Event[] | null)?.map((event) => (
            <article className="list-row event-admin-row" key={event.id}>
              <div><h3>{event.name}</h3><p>{event.venue}<br />{new Date(event.starts_at).toLocaleString()}<br />{event.capacity} capacity · {new Intl.NumberFormat("en", { style: "currency", currency: "USD" }).format(event.price_cents / 100)}</p></div>
              <form action={setEventPublishedAction}>
                <input type="hidden" name="event_id" value={event.id} />
                <input type="hidden" name="published" value={String(!event.published)} />
                <button className={`button button-small ${event.published ? "button-outline" : "button-dark"}`} type="submit">{event.published ? "Unpublish" : "Publish"}</button>
              </form>
            </article>
          ))}
        </section>
      </div>
    </>
  );
}
