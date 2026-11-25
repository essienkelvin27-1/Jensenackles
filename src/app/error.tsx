"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="auth-shell">
      <section className="auth-card">
        <span className="eyebrow">A small hiccup</span>
        <h1>That didn’t load.</h1>
        <p>We couldn’t complete that request. Try again, or come back to the home page.</p>
        <button className="button button-dark" onClick={reset} type="button">Try again</button>
      </section>
    </div>
  );
}
