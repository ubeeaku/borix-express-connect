import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";

const sections: { title: string; paragraphs: ReactNode[] }[] = [
  {
    title: "1. About these terms",
    paragraphs: [
      "These Terms and Conditions (\"Terms\") apply when you use the Borix Express website or app, make a booking, or use our transport services. By using the service, you agree to these Terms. If you do not agree, do not use the booking service.",
      "Borix Express currently operates scheduled intercity services between Jos and Abuja, in both directions. These Terms do not remove any rights you have under applicable consumer-protection law.",
    ],
  },
  {
    title: "2. Eligibility and account details",
    paragraphs: [
      "Bookings and accounts must be managed by an adult. An adult arranging travel for a child is responsible for ensuring suitable supervision and providing accurate passenger information.",
      "You must provide accurate contact and booking details, keep your sign-in credentials confidential, and tell us if you believe your account has been used without permission. You are responsible for activity carried out through your account, except where applicable law provides otherwise.",
    ],
  },
  {
    title: "3. Making and paying for a booking",
    paragraphs: [
      "A booking request is subject to seat and departure availability. A booking is confirmed only after the payment provider or wallet confirms successful payment and Borix issues a booking reference. Check your confirmation for the route, date, departure time, passenger details and seat information, and contact us promptly if something is incorrect.",
      "Prices and applicable charges are shown before you submit payment. Payments are handled by our payment providers; their checkout and payment rules may also apply. Do not share your card PIN, one-time password or account password with anyone claiming to be Borix support.",
    ],
  },
  {
    title: "4. Changes, cancellations and refunds",
    paragraphs: [
      <>You may reasonably cancel an advance booking under applicable consumer-protection law. Please contact us at least 24 hours before departure where possible so we can assist. Changes depend on seat availability and may require a fare adjustment. A cancellation may be subject to a reasonable charge where permitted by law; any applicable cancellation terms or charges will be disclosed before you book. We will explain the refund options for your booking. See the <a className="font-medium text-accent underline" href="https://fccpc.gov.ng/consumers/consumer-rights-responsibilities/rights-responsibilities/" target="_blank" rel="noreferrer">FCCPC consumer rights guidance</a>.</>,
      "If Borix cancels or materially changes a departure, we will contact affected passengers and explain the available rebooking or refund options. A missed departure or late arrival may affect your ability to travel; contact support as soon as possible if you expect to be delayed.",
    ],
  },
  {
    title: "5. Before and during your journey",
    paragraphs: [
      "Please arrive at the departure point at least 30 minutes before the scheduled time and have your booking reference available. Follow reasonable instructions from the driver and park staff, use your assigned seat, and behave in a way that keeps passengers and staff safe.",
      "You must not bring prohibited, illegal or dangerous items, damage the vehicle, smoke where prohibited, threaten or harass another person, or interfere with safe operation of the service. Tell us before travel about any assistance you need so we can advise what arrangements are available.",
    ],
  },
  {
    title: "6. Schedules and service availability",
    paragraphs: [
      "Departure times, routes, vehicles and seat availability may change because of road conditions, weather, safety, operational needs or events outside our reasonable control. We will make reasonable efforts to notify affected passengers and provide available alternatives. Nothing in these Terms excludes rights or remedies that cannot lawfully be excluded.",
    ],
  },
  {
    title: "7. Driver applications",
    paragraphs: [
      "Driver applications must contain truthful and complete information. Submitting an application does not guarantee approval, account activation, a vehicle assignment or a trip assignment. Drivers must maintain valid required documents, follow safety instructions and comply with applicable transport laws and any driver-specific agreement supplied by Borix.",
    ],
  },
  {
    title: "8. Website and app use",
    paragraphs: [
      "You may use the website and app only for lawful purposes and in accordance with these Terms. Do not attempt to disrupt the service, access another person's account or information, introduce malicious code, or copy or misuse Borix branding and content without permission.",
      "The service may contain links to third-party services such as payment providers. Their services are governed by their own terms and privacy notices.",
    ],
  },
  {
    title: "9. Liability and events outside our control",
    paragraphs: [
      "We take reasonable steps to operate a safe and reliable service. To the extent permitted by law, Borix is not responsible for loss caused by inaccurate information you provide, your failure to follow safety instructions, or an event outside our reasonable control. These Terms do not limit liability or consumer rights that cannot be limited under applicable law.",
    ],
  },
  {
    title: "10. Privacy, changes and governing law",
    paragraphs: [
      <>Our <Link className="font-medium text-accent underline" to="/privacy-policy">Privacy Policy</Link> explains how we handle personal information. We may update these Terms when our service or legal requirements change; the latest version will appear here with its update date. These Terms are governed by the laws of the Federal Republic of Nigeria, subject to any mandatory consumer protections and the jurisdiction of competent Nigerian courts.</>,
      "Last updated: October 27, 2026. Questions or support: borixexpressltd@gmail.com · +234 903 657 3414.",
    ],
  },
];

const TermsAndConditions = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <main className="pt-24 pb-16">
      <div className="container-custom max-w-4xl">
        <header className="rounded-2xl bg-primary px-6 py-10 text-white md:px-10">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">Borix Express</p>
          <h1 className="mt-2 text-3xl font-bold md:text-5xl">Terms and Conditions</h1>
          <p className="mt-4 text-white/75">The terms for using our website, app and transport services.</p>
          <p className="mt-2 text-sm text-white/60">Last updated October 27, 2026</p>
        </header>
        <div className="mt-8 space-y-8">
          {sections.map((section) => (
            <section key={section.title} className="rounded-xl border border-border bg-card p-6 md:p-8">
              <h2 className="text-xl font-bold text-foreground">{section.title}</h2>
              <div className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
                {section.paragraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
        <p className="mt-8 text-sm text-muted-foreground">
          See also our <Link to="/privacy-policy" className="text-accent underline">Privacy Policy</Link>.
        </p>
      </div>
    </main>
    <Footer />
  </div>
);

export default TermsAndConditions;
