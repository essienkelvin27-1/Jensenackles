"use client";

import QRCode from "qrcode";
import { jsPDF } from "jspdf";

export default function TicketDownload({ ticket, event }: {
  ticket: { id: string; qr_token: string };
  event: { name: string; venue: string; starts_at: string };
}) {
  async function download() {
    const qr = await QRCode.toDataURL(ticket.qr_token, { width: 220, margin: 1 });
    const pdf = new jsPDF();
    pdf.setFontSize(11);
    pdf.setTextColor(34, 94, 89);
    pdf.text("TOURTICKETS  /  DIGITAL ADMISSION", 20, 22);
    pdf.setTextColor(23, 41, 44);
    pdf.setFontSize(24);
    pdf.text(event.name, 20, 42, { maxWidth: 170 });
    pdf.setFontSize(12);
    pdf.text(event.venue, 20, 55);
    pdf.text(new Intl.DateTimeFormat("en", { dateStyle: "long", timeStyle: "short" }).format(new Date(event.starts_at)), 20, 64);
    pdf.addImage(qr, "PNG", 20, 78, 48, 48);
    pdf.setFontSize(9);
    pdf.setTextColor(98, 114, 118);
    pdf.text(`Ticket ${ticket.id}`, 20, 137);
    pdf.text("Present this QR code at the entrance. Keep your ticket private.", 20, 146);
    pdf.save(`tourtickets-${ticket.id.slice(0, 8)}.pdf`);
  }

  return <button className="button button-outline button-small" type="button" onClick={() => void download()}>Download PDF</button>;
}
