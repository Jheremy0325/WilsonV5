// Update this page (the content is just a fallback if you fail to update the page)
import React, { useEffect } from "react";

declare global {
  interface Window { chatbase?: any; }
}

const Index = () => {
  useEffect(() => {
    // inject widget script once
    const id = "zv1kYupvRCB1hnrbSUtSw";
    if (!document.getElementById(id)) {
      const script = document.createElement("script");
      script.src = "https://www.chatbase.co/embed.min.js";
      script.id = id;
      script.async = true;
      document.body.appendChild(script);
      script.addEventListener("load", identifyUser);
    } else {
      identifyUser();
    }

    async function identifyUser() {
      try {
        const res = await fetch("/api/chatbase-token");
        if (!res.ok) return;
        const { token } = await res.json();
        if (!token) return;

        // If chatbase is ready, identify; otherwise queue the call
        if (window.chatbase) {
          window.chatbase("identify", { token });
        } else {
          // minimal queue fallback until embed creates window.chatbase
          (window as any).chatbase = (window as any).chatbase || ((...args: any[]) => {
            (window as any).chatbase_q = (window as any).chatbase_q || [];
            (window as any).chatbase_q.push(args);
          });
          (window as any).chatbase("identify", { token });
        }
      } catch (err) {
        console.error("Chatbase identify failed", err);
      }
    }

    // no cleanup required for the widget script
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">Welcome to Your Blank App</h1>
        <p className="text-xl text-muted-foreground">Start building your amazing project here!</p>
      </div>
    </div>
  );
};

export default Index;
