"use client";

import { useEffect, useState } from "react";

/**
 * Click to copy, with the copied state living on the button itself. PRODUCT.md
 * rules out a contact form: it is a spam magnet and a lie about how fast anyone
 * replies. An address you can take in one click is the honest affordance.
 */
export function CopyEmail({ email, labels }: { email: string; labels: { copy: string; copied: string } }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(email);
          setCopied(true);
        } catch {
          // Clipboard denied (insecure context, or the user said no). The
          // address is plain text right next to this button, so there is
          // nothing to recover from.
        }
      }}
      className="group inline-flex items-center gap-2 border border-rule bg-bg px-3 py-1 text-chrome text-dim transition-colors duration-200 hover:border-amber hover:text-amber"
    >
      <span aria-hidden="true">{copied ? "[x]" : "[ ]"}</span>
      <span>{copied ? labels.copied : labels.copy}</span>
      {/* Announced once per copy rather than on every render. */}
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? labels.copied : ""}
      </span>
    </button>
  );
}
