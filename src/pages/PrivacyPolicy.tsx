import type { Component } from "solid-js";
import { useNavigate } from "@solidjs/router";

const SECTIONS: Array<{ index: string; title: string; body: string }> = [
  {
    index: "01",
    title: "ACCOUNT DETAILS",
    body: "When you register, we store your username, your email address, and your password as a one-way bcrypt hash — your plain password is never saved and cannot be read back. Your internal user ID is stored encrypted.",
  },
  {
    index: "02",
    title: "EMAIL VERIFICATION",
    body: "Registration sends a 6-digit code to your email address. The code is stored hashed and expires shortly after it is issued. Your address is used only for verification and account recovery.",
  },
  {
    index: "03",
    title: "SESSION",
    body: "Signing in keeps a session token, your username, and your role in your browser's local storage so you stay signed in. Signing out or clearing site data removes it from the device.",
  },
  {
    index: "04",
    title: "WATCHLIST",
    body: "Stations you save — name, brand, location, preferred grade, and the price snapshot shown — are stored linked to your account so your watchlist follows you. Removing a station deletes that record.",
  },
  {
    index: "05",
    title: "COOKIES",
    body: "Essential session cookies keep you signed in. Optional functional, statistics, and marketing preferences are set through the cookie banner and stored in your browser and on your account. You can change them any time from the banner.",
  },
  {
    index: "06",
    title: "LOCATION",
    body: "If you share your GPS position or drop a pin, it stays on your device and is used only to compute distances to nearby stations. Map search and driving directions are fulfilled by third-party services (Nominatim, OSRM, OpenFreeMap tiles), which receive those queries under their own policies.",
  },
  {
    index: "07",
    title: "WHAT WE DON'T COLLECT",
    body: "No payment details, no background tracking, no advertising profiles. Your data is never sold. Short-lived server logs and IP-based rate limiting exist only to keep the service running and block abuse.",
  },
  {
    index: "08",
    title: "ACCESS & DELETION",
    body: "To review, export, or delete your account and its data, email soul.jsx@gmail.com from your registered address and it will be handled manually.",
  },
];

const PrivacyPolicy: Component = () => {
  const navigate = useNavigate();

  return (
    <div class="bg-black text-on-surface min-h-screen px-container-margin py-xl">
      <div class="max-w-4xl mx-auto flex flex-col gap-lg">
        <button
          onClick={() => navigate("/")}
          class="self-start flex items-center gap-xs font-label-md text-label-md text-text-muted uppercase tracking-[2px] hover:text-primary transition-colors cursor-pointer"
        >
          <span class="material-symbols-outlined text-[18px]">arrow_back</span>
          BACK TO HOME
        </button>

        <div class="border-b border-hairline pb-md">
          <span class="font-label-sm text-label-sm text-text-muted uppercase mb-xs block">LEGAL</span>
          <h1 class="font-headline-lg text-headline-lg text-primary uppercase mb-xs">
            PRIVACY POLICY
          </h1>
          <p class="font-body-md text-body-md text-text-body">
            What signing in collects — nothing more.
          </p>
          <span class="font-label-sm text-[10px] text-text-muted uppercase tracking-[2px]">
            LAST UPDATED: SEPTEMBER 2026
          </span>
        </div>

        {SECTIONS.map((s) => (
          <section class="border-b border-hairline pb-md">
            <span class="font-label-sm text-label-sm text-text-muted uppercase mb-xs block">
              {s.index} / {s.title}
            </span>
            <p class="font-body-md text-body-md text-text-body leading-relaxed">{s.body}</p>
          </section>
        ))}

        <div class="flex flex-col gap-xs pt-sm">
          <span class="font-label-md text-label-md text-text-muted uppercase">QUESTIONS ABOUT YOUR DATA?</span>
          <a
            href="mailto:soul.jsx@gmail.com"
            class="font-label-md text-label-md text-primary uppercase tracking-[2px] hover:opacity-70 transition-opacity w-fit"
          >
            soul.jsx@gmail.com
          </a>
          <span class="font-label-md text-label-md text-text-muted uppercase mt-md">
            MADE BY SOUL.jsx · © {new Date().getFullYear()} OCTANE
          </span>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
