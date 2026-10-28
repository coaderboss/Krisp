"use client";

import { useState, useEffect } from "react";
import { BellRing, X, Loader2, ShieldCheck } from "lucide-react";

export default function PushSubscriber() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSupported, setIsSupported] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      
      // 🟢 FIX: Register the Service Worker first before checking push manager!
      navigator.serviceWorker.register("/sw.js")
        .then((registration) => {
          return registration.pushManager.getSubscription();
        })
        .then((sub) => {
          if (sub) setIsSubscribed(true);
          setLoading(false);
        })
        .catch(err => {
          console.error("[Push] Service Worker Registration Failed:", err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("Please allow notification permissions in your browser settings to get alerts.");
        setLoading(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
      });

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription)
      });

      if (response.ok) {
        setIsSubscribed(true);
      } else {
        const errData = await response.json();
        alert(`Failed to save subscription securely. Reason: ${errData.error || "Unknown"}`);
      }
    } catch (error) {
      console.error("[Push] Subscription failed:", error);
      alert("Network error or VAPID key missing. Make sure .env variables are loaded.");
    }
    setLoading(false);
  };

  // Agar support nahi hai, ya pehle se subscribed hai, ya user ne dismiss kar diya, toh kuch mat dikhao.
  if (!isSupported || isSubscribed || dismissed) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-8 fade-in duration-500">
      <div className="bg-slate-900 border border-slate-700 p-4 rounded-2xl shadow-2xl max-w-sm flex gap-4 items-start relative">
        <button 
          onClick={() => setDismissed(true)} 
          className="absolute -top-2 -right-2 bg-slate-700 hover:bg-red-500 text-white rounded-full p-1 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
        
        <div className="w-10 h-10 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center shrink-0">
          <BellRing className="w-5 h-5 animate-pulse" />
        </div>
        
        <div>
          <h4 className="text-sm font-black text-white mb-1">Enable Event Alerts</h4>
          <p className="text-xs text-slate-400 mb-3 font-medium">Get real-time push notifications when you are shortlisted or new forms drop.</p>
          
          <button 
            onClick={handleSubscribe} 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest py-2 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Allow Notifications"}
          </button>
        </div>
      </div>
    </div>
  );
}