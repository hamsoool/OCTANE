import type { Component } from "solid-js";
import { useNavigate } from "@solidjs/router";

const SECTIONS: Array<{ index: string; title: string; body: string }> = [
  {
    index: "01",
    title: "WHAT THIS IS",
    body: "OCTANE is a free website that shows what fuel roughly costs around Zambales. You can look up a station, see an estimated price for each type of fuel, and save the stations you use often. We do not sell fuel. We do not take payments. Nothing on this site buys you anything.",
  },
  {
    index: "02",
    title: "THE PRICES ARE ESTIMATES",
    body: "The numbers come from the government's weekly fuel price report for Northern Luzon, with small adjustments added for each brand and town. That means they are close to right on average, but not exact for any one station. Two stations on the same street can show the same price here and different prices at their pumps. The board at the station is the real price. Always check it before you fill up.",
  },
  {
    index: "03",
    title: "HOW PRICES CHANGE",
    body: "Fuel prices go up and down in steps, usually once a week, and usually in the same direction across most stations. We update our figures every week. The site does not predict future prices or send you alerts when something changes, so if you want to know today's price, look it up before you leave.",
  },
  {
    index: "04",
    title: "YOUR ACCOUNT",
    body: "Signing up is free and takes about a minute. You need a username, an email address, and a password of at least six characters. We email you a six-digit code once to confirm the address works. Use your account for yourself, and keep your password to yourself. Lost it? Use the Forgot Password link on the sign-in screen and we will email you a code.",
  },
  {
    index: "05",
    title: "WHAT WE STORE",
    body: "Your username, email address, and an encrypted version of your password. Plus the stations you save. That is the whole list. We do not see your browsing, we do not follow you around the web, and we never sell your details to anyone. The Privacy Policy explains this in more detail.",
  },
  {
    index: "06",
    title: "PLEASE DO NOT ABUSE IT",
    body: "This site runs on a small budget and a shared server, so a few requests per second is plenty. Please do not copy the whole database, resell the prices as your own product, or try to break in. We will quietly block anyone who does. Ordinary use by actual drivers is completely fine.",
  },
  {
    index: "07",
    title: "SOMETHING BROKEN?",
    body: "The map, the prices, and the sign-in page sometimes break, usually for a few minutes at a time. We cannot promise it will work every time you open it. If a number looks wrong, trust the pump and tell us, because wrong prices are worse than no prices.",
  },
  {
    index: "08",
    title: "WHO IS BEHIND THIS",
    body: "One person built this as a free side project for Zambales drivers. No company, no investors, nothing to sell you. The name, the design, and the code belong to SOUL.jsx. You are welcome to quote the prices with a link back, just not to pass them off as your own.",
  },
  {
    index: "09",
    title: "CHANGES AND CONTACT",
    body: "This page may change as the site grows. If something here is unclear or you think we got a price wrong, email soul.jsx@gmail.com and you will get a reply from a person.",
  },
];

const TermsOfUse: Component = () => {
  const navigate = useNavigate();

  return (
    <div class="bg-black text-on-surface min-h-dvh px-container-margin py-xl">
      <div class="max-w-4xl mx-auto flex flex-col gap-lg">
        <button
          onClick={() => navigate(-1)}
          class="self-start flex items-center gap-xs font-label-md text-label-md text-text-muted uppercase tracking-[2px] hover:text-primary transition-colors cursor-pointer"
        >
          <span class="material-symbols-outlined text-[18px]">arrow_back</span>
          Back
        </button>

        <div class="border-b border-hairline pb-md">
          <span class="font-label-sm text-label-sm text-text-muted uppercase mb-xs block">Terms &amp; Conditions</span>
          <h1 class="font-headline-lg text-headline-lg text-primary uppercase mb-xs">
            Terms of Use
          </h1>
          <p class="font-body-md text-body-md text-text-body leading-relaxed max-w-[60ch]">
            Nine things worth knowing. The short version: the prices here are good
            for planning and bad for arguing with a cashier, and everything else
            is just common sense about a free website.
          </p>
          <span class="font-label-sm text-label-sm text-text-muted uppercase tracking-[2px]">
            Updated September 2026
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
          <span class="font-label-md text-label-md text-text-muted uppercase">
            Something here unclear, or a price that looks wrong?
          </span>
          <a
            href="mailto:soul.jsx@gmail.com"
            class="font-label-md text-label-md text-primary uppercase tracking-[2px] hover:opacity-70 transition-opacity w-fit"
          >
            soul.jsx@gmail.com
          </a>
          <button
            onClick={() => navigate("/privacy")}
            class="self-start mt-sm font-label-sm text-label-sm text-text-body uppercase tracking-[2px] underline underline-offset-4 decoration-hairline hover:text-primary transition-colors"
          >
            What we store, in plain language
          </button>
          <span class="font-label-md text-label-md text-text-muted uppercase mt-md">
            SOUL.jsx &middot; &copy; {new Date().getFullYear()} OCTANE
          </span>
        </div>
      </div>
    </div>
  );
};

export default TermsOfUse;
