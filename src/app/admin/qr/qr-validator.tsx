"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Result = { valid: boolean; message: string; event?: string; checked_in_at?: string };

export default function QrValidator() {
  const [token, setToken] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function validate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const { data, error: validationError } = await createClient().rpc("validate_ticket", { p_qr_token: token.trim() });
      if (validationError) throw new Error(validationError.message);
      setResult(data as Result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not validate this ticket.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form className="qr-form" onSubmit={(event) => void validate(event)}>
        <input aria-label="Ticket QR token" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Enter or scan the ticket QR token" required />
        <button className="button button-dark" disabled={busy} type="submit">{busy ? "Checking…" : "Validate & check in"}</button>
      </form>
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      {result && <div className={`result-card ${result.valid ? "result-valid" : "result-invalid"}`} role="status"><strong>{result.message}</strong>{result.event && <p>{result.event}</p>}{result.checked_in_at && <small>{new Date(result.checked_in_at).toLocaleString()}</small>}</div>}
    </>
  );
}
