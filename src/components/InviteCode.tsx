"use client";

import { useState } from "react";

export function InviteCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="invite-code"
      title="Copy invite code"
    >
      <span className="invite-code-label">{copied ? "Copied" : "Invite"}</span>
      <span className="invite-code-value">{code}</span>
    </button>
  );
}
