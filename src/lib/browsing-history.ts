"use client";

import { useEffect, useState } from "react";
import { recordContentView, sanitizeContentViews, type ContentView, type ContentViewKind } from "@/domain/browsing";
import { trackingDisabled } from "./track";

const HISTORY_KEY = "trovio:content-views:v1";
const DISABLED_KEY = "trovio:no-personalization";
const CHANGE_EVENT = "trovio:content-views-changed";

export function browsingPersonalizationEnabled(): boolean {
  try {
    return !trackingDisabled() && localStorage.getItem(DISABLED_KEY) !== "1";
  } catch {
    return false;
  }
}

function readViews(): ContentView[] {
  try {
    return sanitizeContentViews(JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]"));
  } catch {
    return [];
  }
}

export function trackContentView(kind: ContentViewKind, id: string): void {
  if (!browsingPersonalizationEnabled()) return;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(recordContentView(readViews(), kind, id)));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // Browsing must remain functional when storage is blocked.
  }
}

export function useBrowsingHistory() {
  const [views, setViews] = useState<ContentView[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const refresh = () => {
      const active = browsingPersonalizationEnabled();
      setAllowed(!trackingDisabled());
      setEnabled(active);
      setViews(active ? readViews() : []);
    };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("trovio:consent-changed", refresh);
    window.addEventListener(CHANGE_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("trovio:consent-changed", refresh);
      window.removeEventListener(CHANGE_EVENT, refresh);
    };
  }, []);

  const setEnabledPreference = (value: boolean) => {
    try {
      localStorage.setItem(DISABLED_KEY, value ? "0" : "1");
      if (!value) localStorage.removeItem(HISTORY_KEY);
      window.dispatchEvent(new Event(CHANGE_EVENT));
    } catch {
      // Keep recommendations usable without browser storage.
    }
  };

  const clear = () => {
    try {
      localStorage.removeItem(HISTORY_KEY);
      window.dispatchEvent(new Event(CHANGE_EVENT));
    } catch {
      setViews([]);
    }
  };

  return { views, enabled, allowed, setEnabled: setEnabledPreference, clear };
}
