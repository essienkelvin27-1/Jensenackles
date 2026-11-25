import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import { PageHeading } from "@/app/components";
import { requireUser } from "@/lib/auth";
import TicketDownload from "./ticket-download";

export const metadata: Metadata = { title: "Your digital tickets" };
export const dynamic = "force-dynamic";

type Ticket = {
  id: string;
  order_id: string;
  qr_token: string;
  checked_in_at: string | null;
  events: { name: string; venue: string; starts_at: string } | { name: string; venue: string; starts_at: string }[] | null;
};

export default async function Tickets() {
  const { supabase } = await requireUser();
  const { data: tickets, error } = await supabase.from("tickets")
    .select("id,order_id,qr_token,checked_in_at,events(name,venue,starts_at)")
    .order("created_at", { ascending: false });
  const customerTickets = (tickets ?? []) as Ticket[];
  const ticketCards = await Promise.all(customerTickets.map(async (ticket) => {
    const event = Array.isArray(ticket.events) ? ticket.events[0] : ticket.events;
    if (!event) return null;
    const svg = await QRCode.toString(ticket.qr_token, { type: "svg", width: 220, margin: 1 });
    const qr = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
    return (
      <article className="ticket-card" key={ticket.id}>
        <div>
          <h3>{event.name}</h3>
          <p>{event.venue}<br />{new Intl.DateTimeFormat("en", { dateStyle: "full", timeStyle: "short" }).format(new Date(event.starts_at))}<br />Ticket {ticket.id.slice(0, 8).toUpperCase()}</p>
          {ticket.checked_in_at && <span className="status status-paid">Checked in</span>}
          <div className="ticket-actions"><TicketDownload ticket={ticket} event={event} /><Link className="button button-outline button-small" href={`/orders/${ticket.order_id}`}>Order details</Link></div>
        </div>
        <Image className="ticket-qr" src={qr} alt={`Admission QR code for ${event.name}`} width={92} height={92} unoptimized />
      </article>
    );
  }));

  return (
    <div className="page-shell">
      <Link className="back-link" href="/account">← Back to your account</Link>
      <PageHeading eyebrow="Ready when you are" title="Your digital tickets." description="Keep your QR codes handy at the door. You can also download a printable PDF for each ticket." />
      {error && <p className="notice notice-error">Tickets could not be loaded. Please refresh to try again.</p>}
      {!error && (!tickets || tickets.length === 0) && <div className="empty-state"><span className="empty-icon">✳</span><h3>No tickets just yet.</h3><p>Once a payment is verified, your tickets will show up here.</p><Link className="button button-dark button-small" href="/#events">Explore events</Link></div>}
      {ticketCards}
    </div>
  );
}
