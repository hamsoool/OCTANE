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
    body: "Registration sends a 6-digit code to your email address. The code is stored hashed, expires shortly after it is issued, and is deleted once used. We resend it when you sign in with an unverified account. Your address is used to confirm ownership and to send that code. It is never sold or shared, and there is no marketing email.",
  },
  {
    index: "03",
    title: "SESSION",
    body: "Signing in sets one essential cookie called 'session'. It is httpOnly, so scripts on this site cannot read it, and it expires after 24 hours. Your username and role are held in memory for the current tab only and are not written to browser storage. Signing out clears the cookie.",
  },
  {
    index: "04",
    title: "WATCHLIST",
    body: "Stations you save: name, brand, coordinates, preferred grade, and a price snapshot are stored linked to your account so your watchlist follows you. Removing a station deletes that record.",
  },
  {
    index: "05",
    title: "COOKIES",
    body: "Only one cookie is actually set: the essential session cookie described above. No advertising, analytics, or cross-site tracking cookies are used, and no third-party trackers are embedded on this site. A cookie banner appears the first time you visit so you can choose between accepting everything or only what is strictly necessary. You can change that choice at any time from the cookie icon in the bottom corner, or from the Cookie Settings link in the footer. Your selection is stored in this browser and on your account, and can be cleared at any time by clearing site data or asking us to remove it.",
  },
  {
    index: "06",
    title: "LOCATION",
    body: "If you share your GPS position or drop a pin, it stays on your device and is used only to compute distances to nearby stations. Map search and driving directions are fulfilled by third-party services (Nominatim, OSRM, OpenFreeMap tiles), which receive those queries under their own policies.",
  },
  {
    index: "07",
    title: "WHAT WE DON'T COLLECT",
    body: "No payment details, no background tracking, no advertising profiles, no third-party trackers. Your data is never sold. The server rate-limits by IP address to keep the service running and block abuse.",
  },
  {
    index: "08",
    title: "ACTIVITY LOG",
    body: "To keep the service secure, operator accounts keep an activity log on the server. When you sign in, sign out, register, verify your email, request or reset a password, change your cookie choices, or save and remove stations, we record the action, whether it succeeded, the time, your username, and your IP address. Passwords and verification codes are never written to this log. Administrators can view it in the operator console, and other users cannot.",
  },
  {
    index: "09",
    title: "ACCESS & DELETION",
    body: "To review, export, or delete your account and its data, email soul.jsx@gmail.com from your registered address. Deletion removes your account, your watchlist entries, and your stored cookie preferences. Entries in the activity log above are kept for security purposes after deletion, without your password. Passwords cannot be recovered because only a one-way hash is kept; if you lose yours, the site admin resets the account.",
  },
];

const PrivacyPolicy: Component = () => {
  const navigate = useNavigate();

  return (
    <div class="bg-black text-on-surface min-h-dvh px-container-margin py-xl">
      <div class="max-w-4xl mx-auto flex flex-col gap-lg">
        <button
          onClick={() => navigate(-1)}
          class="self-start flex items-center gap-xs font-label-md text-label-md text-text-muted uppercase tracking-[2px] hover:text-primary transition-colors cursor-pointer"
        >
          <span class="material-symbols-outlined text-[18px]">arrow_back</span>
          BACK
        </button>

        <div class="border-b border-hairline pb-md">
          <span class="font-label-sm text-label-sm text-text-muted uppercase mb-xs block">LEGAL</span>
          <h1 class="font-headline-lg text-headline-lg text-primary uppercase mb-xs">
            PRIVACY POLICY
          </h1>
          <p class="font-body-md text-body-md text-text-body leading-relaxed">
            An account is optional, and the map works without one. This is the
            full list of what signing in stores, and what it does not.
          </p>
          <span class="font-label-sm text-label-sm text-text-muted uppercase tracking-[2px]">
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
          <button
            onClick={() => navigate("/terms")}
            class="self-start mt-sm font-label-sm text-label-sm text-text-body uppercase tracking-[2px] underline underline-offset-4 decoration-hairline hover:text-primary transition-colors"
          >
            READ THE TERMS OF USE
          </button>
          <span class="font-label-md text-label-md text-text-muted uppercase mt-md">
            SOUL.jsx &middot; &copy; {new Date().getFullYear()} OCTANE
          </span>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
