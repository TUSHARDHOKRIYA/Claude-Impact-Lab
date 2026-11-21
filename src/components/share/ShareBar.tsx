"use client";

import { useEffect, useState } from "react";

import { GovButton } from "@/components/gov/GovButton";

type ShareBarProps = {
  path: string;
  title: string;
  text: string;
};

function isMobileShare(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return false;
  }
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export function ShareBar({ path, title, text }: ShareBarProps) {
  const [url, setUrl] = useState(path);
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setUrl(new URL(path, window.location.origin).toString());
    setCanNativeShare(isMobileShare());
  }, [path]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function nativeShare() {
    if (!navigator.share) return;
    try {
      await navigator.share({ title, text, url });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
    }
  }

  const tweet = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;

  return (
    <nav className="mt-12 min-w-0" aria-labelledby="share-report-heading">
      <h2 id="share-report-heading" className="ux4g-heading-xs-strong">
        Share this report
      </h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {canNativeShare ? (
          <GovButton type="button" variant="secondary" onClick={nativeShare}>
            Share
          </GovButton>
        ) : null}
        <GovButton type="button" variant={copied ? "primary" : "secondary"} onClick={copyLink}>
          {copied ? "Copied" : "Copy link"}
        </GovButton>
        <GovButton href={tweet} variant="secondary" target="_blank" rel="noopener noreferrer">
          X
          <span className="sr-only"> (opens in a new tab)</span>
        </GovButton>
        <GovButton href={whatsapp} variant="secondary" target="_blank" rel="noopener noreferrer">
          WhatsApp
          <span className="sr-only"> (opens in a new tab)</span>
        </GovButton>
      </div>
      <p className="sr-only" aria-live="polite">
        {copied ? "Link copied" : ""}
      </p>
    </nav>
  );
}
