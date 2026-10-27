import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, CreditCard, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

const steps = [
  { icon: MapPin, title: "Choose a direction", text: "Travel between Jos and Abuja in either direction." },
  { icon: CalendarDays, title: "Pick your date", text: "See available departures, pickup parks, drivers, and seats for that date." },
  { icon: CreditCard, title: "Confirm your booking", text: "Review your passenger details and fare before paying." },
];

export const Testimonials = () => (
  <section className="section-padding bg-muted/60">
    <div className="container-custom">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <span className="text-accent font-semibold text-sm uppercase tracking-wider">How booking works</span>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2 mb-4">Plan Your Journey</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">Review the trip details and fare before you confirm a booking.</p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6">
        {steps.map((step, index) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="bg-card rounded-2xl p-8 shadow-sm"
          >
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
              <step.icon className="w-6 h-6 text-accent" />
            </div>
            <h3 className="font-bold text-foreground mb-2">{step.title}</h3>
            <p className="text-sm text-muted-foreground">{step.text}</p>
          </motion.div>
        ))}
      </div>
      <div className="text-center mt-8">
        <Link to="/help" className="inline-flex items-center gap-2 font-semibold text-accent hover:underline">
          Read the booking FAQs <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  </section>
);
