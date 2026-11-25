"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type GiftCard = { issuer: string; card_code: string; amount: string; file: File | null };

export default function PaymentForm({ orderId, totalCents, bankInstructions }: {
  orderId: string;
  totalCents: number;
  bankInstructions: string;
}) {
  const [method, setMethod] = useState<"bank_transfer" | "gift_card">("bank_transfer");
  const [giftCards, setGiftCards] = useState<GiftCard[]>([{ issuer: "", card_code: "", amount: "", file: null }]);
  const [bankFile, setBankFile] = useState<File | null>(null);
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  function updateGiftCard(index: number, patch: Partial<GiftCard>) {
    setGiftCards((current) => current.map((card, i) => i === index ? { ...card, ...patch } : card));
  }

  async function uploadEvidence(supabase: ReturnType<typeof createClient>, userId: string, file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      throw new Error("Evidence must be a JPEG, PNG, or WebP image under 5 MB.");
    }
    const path = `${userId}/${orderId}/${crypto.randomUUID()}`;
    const { error: uploadError } = await supabase.storage.from("payment-evidence").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);
    return path;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Please sign in again before submitting payment.");

      let evidencePath: string | null = null;
      let cards: { issuer: string; card_code: string; amount_cents: number; image_path: string }[] = [];
      if (method === "bank_transfer") {
        if (!bankInstructions) throw new Error("Bank transfer instructions are not configured. Contact support before paying.");
        if (reference.trim().length < 3) throw new Error("Enter the bank transfer reference.");
        if (bankFile) evidencePath = await uploadEvidence(supabase, user.id, bankFile);
      } else {
        if (giftCards.some((card) => !card.issuer.trim() || !card.card_code.trim() || !card.amount || !card.file)) {
          throw new Error("Complete the issuer, card code, amount, and image for every gift card.");
        }
        const parsedCards = giftCards.map((card) => ({
          ...card,
          amount_cents: Math.round(Number(card.amount) * 100),
        }));
        if (parsedCards.some((card) => !Number.isSafeInteger(card.amount_cents) || card.amount_cents <= 0)) {
          throw new Error("Enter a valid positive amount for each gift card.");
        }
        if (parsedCards.reduce((sum, card) => sum + card.amount_cents, 0) !== totalCents) {
          throw new Error("Gift card values must exactly match the order total.");
        }
        for (const card of parsedCards) {
          if (!card.file || !["image/jpeg", "image/png", "image/webp"].includes(card.file.type) || card.file.size > 5 * 1024 * 1024) {
            throw new Error("Every card image must be a JPEG, PNG, or WebP under 5 MB.");
          }
        }
        cards = await Promise.all(parsedCards.map(async (card) => {
          if (!card.file) throw new Error("Choose an image for every gift card.");
          return {
            issuer: card.issuer.trim(),
            card_code: card.card_code.trim(),
            amount_cents: card.amount_cents,
            image_path: await uploadEvidence(supabase, user.id, card.file),
          };
        }));
      }

      const { error: submitError } = await supabase.rpc("submit_payment", {
        p_order_id: orderId,
        p_method: method,
        p_reference: method === "bank_transfer" ? reference.trim() : null,
        p_evidence_path: evidencePath,
        p_gift_cards: cards,
      });
      if (submitError) throw new Error(submitError.message);
      router.push(`/orders/${orderId}?message=Payment+submitted+for+review.`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not submit payment.");
    } finally {
      setBusy(false);
    }
  }

  const formatMoney = (cents: number) => new Intl.NumberFormat("en", { style: "currency", currency: "USD" }).format(cents / 100);
  return (
    <form className="form-stack" onSubmit={submit}>
      <div className="field">
        <label htmlFor="payment-method">Payment method</label>
        <select id="payment-method" value={method} onChange={(event) => {
          const value = event.target.value;
          if (value === "bank_transfer" || value === "gift_card") setMethod(value);
        }}>
          <option value="bank_transfer">Bank transfer</option>
          <option value="gift_card">Gift cards</option>
        </select>
      </div>
      {method === "bank_transfer" ? (
        <>
          {bankInstructions
            ? <div className="bank-instructions"><strong>Transfer instructions</strong><p>{bankInstructions}</p></div>
            : <p className="notice notice-error">Bank transfer instructions have not been configured. Please contact support before transferring.</p>}
          <div className="field"><label htmlFor="reference">Bank transfer reference</label><input id="reference" value={reference} onChange={(event) => setReference(event.target.value)} required minLength={3} /><span className="field-hint">Submit the transfer using your bank, then enter its reference here.</span></div>
          <div className="field"><label htmlFor="bank-evidence">Transfer receipt image (optional)</label><input id="bank-evidence" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setBankFile(event.target.files?.[0] ?? null)} /></div>
        </>
      ) : (
        <>
          <p className="field-hint">Add one or more cards. Their combined value must equal {formatMoney(totalCents)}. Each image is private and only visible to you and administrators.</p>
          {giftCards.map((card, index) => (
            <fieldset className="gift-card-fields" key={index}>
              <legend>Gift card {index + 1}</legend>
              <div className="field"><label htmlFor={`issuer-${index}`}>Issuer</label><input id={`issuer-${index}`} value={card.issuer} onChange={(event) => updateGiftCard(index, { issuer: event.target.value })} required /></div>
              <div className="field"><label htmlFor={`code-${index}`}>Card code</label><input id={`code-${index}`} value={card.card_code} onChange={(event) => updateGiftCard(index, { card_code: event.target.value })} autoComplete="off" required /></div>
              <div className="field"><label htmlFor={`amount-${index}`}>Value (USD)</label><input id={`amount-${index}`} type="number" min="0.01" step="0.01" value={card.amount} onChange={(event) => updateGiftCard(index, { amount: event.target.value })} required /></div>
              <div className="field"><label htmlFor={`image-${index}`}>Card image</label><input id={`image-${index}`} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => updateGiftCard(index, { file: event.target.files?.[0] ?? null })} required /></div>
              {giftCards.length > 1 && <button className="text-button" type="button" onClick={() => setGiftCards((current) => current.filter((_, i) => i !== index))}>Remove card</button>}
            </fieldset>
          ))}
          {giftCards.length < 10 && <button className="button button-outline" type="button" onClick={() => setGiftCards((current) => [...current, { issuer: "", card_code: "", amount: "", file: null }])}>+ Add another gift card</button>}
        </>
      )}
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      <button className="button button-dark" disabled={busy || (method === "bank_transfer" && !bankInstructions)} type="submit">{busy ? "Submitting securely…" : "Submit payment for review"}</button>
    </form>
  );
}
