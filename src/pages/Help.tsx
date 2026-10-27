import { Link } from "react-router-dom";
import { ArrowRight, Mail, Phone } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const faqs = [
  {
    question: "Which routes can I book?",
    answer: "Borix Express currently lists Jos to Abuja and Abuja to Jos. Available departures, parks, seats, and fares depend on the date you select.",
  },
  {
    question: "How do I see the current fare and available seats?",
    answer: "Start a booking, choose your route and travel date, then review the departure cards. The card shows the fare, pickup park, driver, and seats still available before you enter passenger details.",
  },
  {
    question: "When is my booking confirmed?",
    answer: "A booking is confirmed after payment succeeds and Borix issues a booking reference. Keep the confirmation for your trip.",
  },
  {
    question: "Can I change or cancel a booking?",
    answer: "Contact Borix support as early as possible, preferably at least 24 hours before departure. Options depend on the booking and applicable consumer-protection law. Any fare or cancellation terms shown before payment apply.",
  },
  {
    question: "What if Borix changes or cancels my departure?",
    answer: "Contact support using the phone number or email below. Borix will explain the available rebooking or refund options for your booking.",
  },
  {
    question: "Where do I board?",
    answer: "Check the park shown on your selected departure and on your booking confirmation. Contact support before travelling if you need directions or want to confirm the exact pickup point.",
  },
  {
    question: "How can I apply to drive?",
    answer: "Use the Drive With Us page to review the current requirements and submit an application. Applications are reviewed before a driver account is approved.",
  },
];

const Help = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <main>
      <section className="pt-24 pb-12 bg-primary">
        <div className="container-custom text-center py-12">
          <p className="text-accent font-semibold uppercase tracking-wide mb-3">Borix Express Help</p>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">Frequently Asked Questions</h1>
          <p className="text-white/80 text-lg max-w-2xl mx-auto">Answers about routes, fares, bookings, boarding, and driver applications.</p>
        </div>
      </section>
      <section className="section-padding">
        <div className="container-custom max-w-3xl space-y-3">
          {faqs.map(({ question, answer }) => (
            <details key={question} className="group rounded-xl border border-border bg-card p-5">
              <summary className="cursor-pointer list-none font-semibold text-foreground flex items-center justify-between gap-4">
                {question}
                <span className="text-accent transition-transform group-open:rotate-90" aria-hidden="true">›</span>
              </summary>
              <p className="mt-3 leading-relaxed text-muted-foreground">{answer}</p>
            </details>
          ))}
          <div className="mt-10 rounded-2xl bg-muted p-6">
            <h2 className="text-xl font-bold text-foreground mb-2">Need help with a specific trip?</h2>
            <p className="text-muted-foreground mb-4">Have your booking reference ready so the support team can assist you.</p>
            <div className="flex flex-wrap gap-4">
              <a className="inline-flex items-center gap-2 font-semibold text-accent" href="tel:+2349036573414"><Phone className="h-4 w-4" />+234 903 657 3414</a>
              <a className="inline-flex items-center gap-2 font-semibold text-accent" href="mailto:borixexpressltd@gmail.com"><Mail className="h-4 w-4" />Email support</a>
            </div>
            <Link to="/booking" className="mt-5 inline-flex items-center gap-2 font-semibold text-foreground hover:text-accent">Check departures <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>
    </main>
    <Footer />
  </div>
);

export default Help;
