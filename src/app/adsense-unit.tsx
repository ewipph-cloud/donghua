"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: Record<string, never>[];
  }
}

export function AdSenseUnit() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;

    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
      initialized.current = true;
    } catch (error) {
      console.error("Iklan AdSense tidak dapat dimuat.", error);
    }
  }, []);

  return (
    <aside className="catalog-ad" aria-label="Iklan">
      <span className="catalog-ad-label">IKLAN</span>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-7311117660161505"
        data-ad-slot="8067309159"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}

export function InFeedAdUnit() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;

    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
      initialized.current = true;
    } catch (error) {
      console.error("Iklan In-feed AdSense tidak dapat dimuat.", error);
    }
  }, []);

  return (
    <aside className="catalog-infeed-ad" aria-label="Iklan">
      <span className="catalog-ad-label">IKLAN</span>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-7311117660161505"
        data-ad-slot="2922380996"
        data-ad-format="fluid"
        data-ad-layout-key="+1r+rx+1+2-3"
      />
    </aside>
  );
}
