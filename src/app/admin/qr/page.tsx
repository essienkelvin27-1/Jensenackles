import type { Metadata } from "next";
import { PageHeading } from "@/app/components";
import QrValidator from "./qr-validator";

export const metadata: Metadata = { title: "QR ticket validation" };

export default function AdminQr() {
  return (
    <>
      <PageHeading eyebrow="At the door" title="QR ticket validation." description="Scan or enter a ticket QR token to verify its event and mark it checked in. A ticket can only be checked in once." />
      <section className="panel qr-panel">
        <h2>Check a ticket</h2>
        <QrValidator />
      </section>
    </>
  );
}
