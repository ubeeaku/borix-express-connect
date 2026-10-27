import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";

const sections: { title: string; paragraphs: ReactNode[] }[] = [
  {
    title: "1. Who we are and who this notice covers",
    paragraphs: [
      "Borix Express (\"Borix\", \"we\", \"us\" or \"our\") operates intercity transport services and the Borix Express website and app. This notice explains how we handle personal information when you browse, make a booking, contact us, apply to drive, or travel with us.",
      "For questions or privacy requests, contact us at borixexpressltd@gmail.com or +234 903 657 3414.",
    ],
  },
  {
    title: "2. Information we collect",
    paragraphs: [
      "Passengers: name, email address, phone number, booking reference, route, travel date and time, seat selection, payment status, and information you provide when you contact support. If you book for someone else, you should have their permission to provide their details.",
      "Driver applicants: contact and address details, state and city, experience, driving licence and NIN information, photograph, vehicle and roadworthiness documents, guarantor details, and bank account details needed to assess an application and pay approved driver earnings.",
      "Payments: payments are handled by our payment provider. We receive transaction references, payment status, amount and related booking information. We do not ask you to send full card PINs or passwords to us.",
      "Technical information: basic device, browser, security, and service log information needed to operate the website, keep accounts secure, and diagnose errors. The app uses essential session storage for sign-in and service functions.",
    ],
  },
  {
    title: "3. Why we use information",
    paragraphs: [
      "We use personal information to create and manage bookings, confirm payments, allocate passengers to a departure, share necessary passenger details with the assigned driver and operating park, send service updates, answer requests, assess driver applications, coordinate trips, pay drivers, prevent fraud, protect people and property, and meet legal obligations.",
      "We process information where it is necessary to provide the service you request, to meet legal obligations, for legitimate operational and safety interests, or where you have given consent. Where we rely on consent, you may withdraw it; this does not affect processing that has another lawful basis.",
    ],
  },
  {
    title: "4. When we share information",
    paragraphs: [
      "We share only the information needed to provide the service. A passenger's name, phone number, route and booking details may be shared with the assigned driver and relevant operating park so they can coordinate the trip. Relevant driver and vehicle details may be shown to passengers to identify their scheduled service.",
      "We also use service providers that help us host the app and website, manage sign-in and databases, process payments, communicate service messages, and provide technical support. These providers may process information on our behalf under appropriate safeguards. We may disclose information where required by law, to protect users, or to resolve a dispute.",
      "Our database infrastructure is hosted in the European Union. Information may therefore be processed outside Nigeria. Where cross-border processing applies, we take steps required by applicable data-protection law.",
      "We do not sell personal information.",
    ],
  },
  {
    title: "5. How long we keep information",
    paragraphs: [
      "We keep information for as long as needed to provide the service, maintain booking and payment records, manage driver relationships, address disputes, protect the service, and satisfy legal or accounting requirements. Retention periods depend on the type of record and the reason it was collected. When information is no longer needed, we delete or de-identify it where appropriate.",
    ],
  },
  {
    title: "6. How we protect information",
    paragraphs: [
      "We use access controls and reasonable technical and organisational safeguards designed to protect information from unauthorised access, loss, misuse, alteration or disclosure. No online service can guarantee perfect security. Please keep your password private and tell us promptly if you suspect unauthorised access to your account.",
    ],
  },
  {
    title: "7. Your privacy rights",
    paragraphs: [
      "Subject to applicable law, you may ask to access or correct your personal information, request deletion or restriction, object to certain processing, request portability, or withdraw consent where consent is the basis for processing. You may also complain to the Nigeria Data Protection Commission. We may need to verify your identity before acting on a request and may retain records we are legally required to keep.",
      <>To make a request, email borixexpressltd@gmail.com with the subject "Privacy Request". For information about the Nigeria Data Protection Act and the Commission, visit the <a className="font-medium text-accent underline" href="https://ndpc.gov.ng/ndp-act-2023/" target="_blank" rel="noreferrer">Nigeria Data Protection Commission</a>.</>,
    ],
  },
  {
    title: "8. Children",
    paragraphs: [
      "Our online accounts and bookings are intended to be managed by adults. A parent or responsible adult arranging travel for a child should provide only the information needed for that journey and should contact us if they have a privacy concern about a child's information.",
    ],
  },
  {
    title: "9. Changes and contact",
    paragraphs: [
      "We may update this notice when our services or legal requirements change. We will publish the latest version on this page and update the date below.",
      "Last updated: October 27, 2026. Contact: borixexpressltd@gmail.com · +234 903 657 3414.",
    ],
  },
];

const PrivacyPolicy = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <main className="pt-24 pb-16">
      <div className="container-custom max-w-4xl">
        <header className="rounded-2xl bg-primary px-6 py-10 text-white md:px-10">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">Borix Express</p>
          <h1 className="mt-2 text-3xl font-bold md:text-5xl">Privacy Policy</h1>
          <p className="mt-4 text-white/75">How we collect, use and protect your information.</p>
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
          See also our <Link to="/terms-and-conditions" className="text-accent underline">Terms and Conditions</Link>.
        </p>
      </div>
    </main>
    <Footer />
  </div>
);

export default PrivacyPolicy;
