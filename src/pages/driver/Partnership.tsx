import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Handshake, DollarSign, Car, Shield, FileText, ArrowRight, CheckCircle } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";

const commissionDetails = [
  { label: "Per-trip earnings", value: "Competitive rate per completed trip" },
  { label: "Payment frequency", value: "Weekly bank transfers" },
  { label: "Bonus trips", value: "Extra pay for peak-hour and holiday trips" },
  { label: "Fuel support", value: "Fuel allowance included for partnership vehicles" },
];

const responsibilities = [
  "Maintain vehicle cleanliness inside and out",
  "Follow scheduled departure and arrival times",
  "Report any vehicle issues immediately",
  "Treat passengers with respect and professionalism",
  "Complete all assigned trips unless emergency",
  "Keep all documents up to date",
];

const vehicleCare = [
  "Regular servicing at approved mechanic centres",
  "Weekly vehicle inspection checks",
  "Immediate reporting of mechanical faults",
  "No unauthorized modifications to the vehicle",
  "Borix Express covers major maintenance for partnership vehicles",
];

const codeOfConduct = [
  "No smoking, drinking, or use of substances while on duty",
  "No speeding — strict adherence to speed limits",
  "No unauthorized passengers or cargo",
  "Professional dress code and grooming",
  "Use of designated routes only",
  "Respectful communication at all times",
];

const Partnership = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-24 pb-16 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80" />
        <div className="container-custom relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-accent/20 text-accent px-4 py-2 rounded-full text-sm font-semibold mb-6">
              <Handshake className="w-4 h-4" />
              Driver Partnership
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Partner With <span className="text-accent">Borix Express</span>
            </h1>
            <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto">
              Don't have a vehicle? No problem. Join our partnership programme and drive a Borix Express vehicle while earning great pay.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Commission Model */}
      <section className="section-padding">
        <div className="container-custom max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl font-bold text-foreground mb-8 flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-accent" /> Commission Model
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {commissionDetails.map((item, i) => (
                <div key={i} className="bg-card rounded-xl p-5 border border-border">
                  <p className="font-semibold text-foreground">{item.label}</p>
                  <p className="text-muted-foreground text-sm mt-1">{item.value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Responsibilities */}
      <section className="section-padding bg-muted">
        <div className="container-custom max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl font-bold text-foreground mb-8 flex items-center gap-3">
              <FileText className="w-8 h-8 text-accent" /> Your Responsibilities
            </h2>
            <div className="space-y-3">
              {responsibilities.map((item, i) => (
                <div key={i} className="flex items-start gap-3 bg-card rounded-lg p-4 border border-border">
                  <CheckCircle className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Vehicle Care */}
      <section className="section-padding">
        <div className="container-custom max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl font-bold text-foreground mb-8 flex items-center gap-3">
              <Car className="w-8 h-8 text-accent" /> Vehicle Care Policy
            </h2>
            <div className="space-y-3">
              {vehicleCare.map((item, i) => (
                <div key={i} className="flex items-start gap-3 bg-card rounded-lg p-4 border border-border">
                  <CheckCircle className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Code of Conduct */}
      <section className="section-padding bg-muted">
        <div className="container-custom max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl font-bold text-foreground mb-8 flex items-center gap-3">
              <Shield className="w-8 h-8 text-accent" /> Code of Conduct
            </h2>
            <div className="space-y-3">
              {codeOfConduct.map((item, i) => (
                <div key={i} className="flex items-start gap-3 bg-card rounded-lg p-4 border border-border">
                  <CheckCircle className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding bg-primary">
        <div className="container-custom text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Partner?</h2>
            <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
              Apply today and start earning as a Borix Express partner driver.
            </p>
            <Link to="/driver/apply">
              <Button className="btn-hero text-lg px-10 py-6">
                Apply Now <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Partnership;
