import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Shield, Phone, AlertTriangle, CheckCircle } from "lucide-react";

const safetyPolicies = [
  "Wear your seatbelt throughout the journey.",
  "Follow the driver's safety instructions and applicable road rules.",
  "Before boarding, confirm that the driver, vehicle, route, and park match your booking details.",
  "Keep your booking confirmation available and contact Borix support if trip details do not match.",
];

const emergencyContacts = [
  { name: "Borix Express Emergency Line", number: "+234 903 657 3414" },
  { name: "Federal Road Safety Corps (FRSC)", number: "122" },
];

const complianceRules = [
  "Review the driver and vehicle information on the departure card before booking.",
  "Use the pickup park shown on your departure and booking confirmation.",
  "Contact the support team if you need to confirm a pickup location or report a safety concern.",
];

const monitoringInfo = [
  { icon: Phone, title: "Borix support", description: "Call +234 903 657 3414 daily from 6:00 AM to 10:00 PM." },
  { icon: AlertTriangle, title: "Road emergency", description: "For a road crash or immediate danger, call the FRSC emergency line at 122." },
];

const Safety = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-24 pb-16 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80" />
        <div className="container-custom relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-accent/20 text-accent px-4 py-2 rounded-full text-sm font-semibold mb-6">
              <Shield className="w-4 h-4" />
              Your Safety Matters
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Safety at <span className="text-accent">Borix Express</span>
            </h1>
            <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto">
              Practical guidance for passengers before and during a trip.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Passenger Safety */}
      <section className="section-padding">
        <div className="container-custom max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl font-bold text-foreground mb-8">Passenger safety guidance</h2>
            <div className="space-y-3">
              {safetyPolicies.map((policy, i) => (
                <div key={i} className="flex items-start gap-3 bg-card rounded-lg p-4 border border-border">
                  <CheckCircle className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">{policy}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Emergency Contacts */}
      <section className="section-padding bg-muted">
        <div className="container-custom max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl font-bold text-foreground mb-8 flex items-center gap-3">
              <Phone className="w-8 h-8 text-accent" /> Emergency Contacts
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {emergencyContacts.map((contact, i) => (
                <div key={i} className="bg-card rounded-xl p-5 border border-border">
                  <p className="font-semibold text-foreground">{contact.name}</p>
                  <a href={`tel:${contact.number}`} className="text-accent font-bold text-lg hover:underline">
                    {contact.number}
                  </a>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              The FRSC lists 122 as its toll-free emergency line. See the <a className="font-semibold text-accent underline" href="https://frsc.gov.ng/commands/national-headquarters/" target="_blank" rel="noreferrer">official FRSC contact page</a>.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Compliance */}
      <section className="section-padding">
        <div className="container-custom max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl font-bold text-foreground mb-8">Before boarding</h2>
            <div className="space-y-3">
              {complianceRules.map((rule, i) => (
                <div key={i} className="flex items-start gap-3 bg-card rounded-lg p-4 border border-border">
                  <CheckCircle className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">{rule}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trip Monitoring */}
      <section className="section-padding bg-muted">
        <div className="container-custom max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl font-bold text-foreground mb-8">Getting help</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {monitoringInfo.map((item, i) => (
                <div key={i} className="card-elevated">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                    <item.icon className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm">{item.description}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Safety;
