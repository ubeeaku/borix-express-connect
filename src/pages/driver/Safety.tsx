import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Shield, Phone, AlertTriangle, Eye, MapPin, CheckCircle } from "lucide-react";

const safetyPolicies = [
  "All passengers must wear seatbelts at all times",
  "Maximum speed limit strictly enforced on all routes",
  "No night driving — all trips operate during daylight hours",
  "Mandatory rest breaks on long routes",
  "Regular vehicle safety inspections before every trip",
  "Zero tolerance for distracted driving",
];

const emergencyContacts = [
  { name: "Borix Express Emergency Line", number: "+234 903 657 3414" },
  { name: "Nigeria Police (Emergency)", number: "112" },
  { name: "Federal Road Safety Corps (FRSC)", number: "122" },
  { name: "National Emergency Management Agency", number: "0800-CALLNEMA" },
];

const complianceRules = [
  "All vehicles registered and insured with comprehensive coverage",
  "Drivers undergo background checks and drug testing",
  "Compliance with Federal Road Safety Corps regulations",
  "Valid vehicle inspection certificates maintained",
  "Fire extinguishers and first aid kits in every vehicle",
  "Driver training programme on defensive driving techniques",
];

const monitoringInfo = [
  { icon: MapPin, title: "GPS Tracking", description: "Every vehicle is tracked in real-time throughout the journey." },
  { icon: Eye, title: "Trip Monitoring", description: "Our operations team monitors all active trips and can intervene if needed." },
  { icon: Phone, title: "24/7 Support", description: "Passengers and drivers can reach our support team at any time during a trip." },
  { icon: AlertTriangle, title: "Incident Response", description: "Rapid response protocol for any road incidents with emergency services coordination." },
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
              Safety isn't just a policy — it's our promise. Every trip, every route, every driver.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Passenger Safety */}
      <section className="section-padding">
        <div className="container-custom max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl font-bold text-foreground mb-8">Passenger Safety Policy</h2>
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
          </motion.div>
        </div>
      </section>

      {/* Compliance */}
      <section className="section-padding">
        <div className="container-custom max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl font-bold text-foreground mb-8">Compliance & Regulations</h2>
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
            <h2 className="text-3xl font-bold text-foreground mb-8">Trip Monitoring</h2>
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
