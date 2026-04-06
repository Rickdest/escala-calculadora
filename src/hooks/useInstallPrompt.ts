import { useEffect, useState, useCallback } from "react";

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    const alreadySeen = localStorage.getItem("installTutorialSeen");
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (!alreadySeen && isMobile) {
      const timer = setTimeout(() => setShowTutorial(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const markAsSeen = useCallback(() => {
    localStorage.setItem("installTutorialSeen", "true");
    setShowTutorial(false);
  }, []);

  const installApp = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      markAsSeen();
    }
  }, [deferredPrompt, markAsSeen]);

  return { deferredPrompt, showTutorial, markAsSeen, installApp };
}
