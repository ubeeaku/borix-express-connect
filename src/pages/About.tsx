import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Shield, Target, Heart, Users, MapPin } from "lucide-react";

const values = [
  {
    icon: Shield,
    title: "Safety First",
    description: "Review the departure information before travel and contact support if anything does not match your booking.",
  },
  {
    icon: Target,
    title: "Reliability",
    description: "Browse the departures available for your selected route and date.",
  },
  {
    icon: Heart,
    title: "Comfort",
    description: "Air-conditioned vehicles, comfortable seating, and a smooth ride. Travel the way you deserve.",
  },
  {
    icon: Users,
    title: "Community",
    description: "We're building more than a transport company. We're connecting communities across Northern Nigeria.",
  },
];

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-24 pb-16 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80" />
        <div className="container-custom relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 max-w-3xl mx-auto"
          >
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
              About <span className="text-accent">Borix Express</span>
            </h1>
            <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto">
              Borix Express currently offers intercity travel between Jos and Abuja in both directions.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">Our Mission</h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                Borix Express was founded with a goal of making intercity travel more convenient for passengers travelling between Jos and Abuja.
              </p>
              <p className="text-muted-foreground text-lg leading-relaxed">
                The Jos–Abuja corridor is our current service area. Passengers can review each listed departure's driver, vehicle, park, fare, and available seats before booking.
              </p>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-accent/10 rounded-2xl p-6 text-center">
                  <MapPin className="w-8 h-8 text-accent mx-auto mb-3" />
                  <p className="text-2xl font-bold text-foreground">Jos ↔ Abuja</p>
                  <p className="text-sm text-muted-foreground">Current service corridor</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section-padding bg-muted">
        <div className="container-custom">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">What We Stand For</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Our core values drive everything we do at Borix Express.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="card-elevated text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-5">
                  <value.icon className="w-7 h-7 text-accent" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{value.title}</h3>
                <p className="text-muted-foreground text-sm">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* What We're Building */}
      <section className="section-padding">
        <div className="container-custom max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">What We're Building</h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-6">
              Borix Express provides online booking for scheduled departures between Jos and Abuja.
            </p>
            <p className="text-muted-foreground text-lg leading-relaxed mb-6">
              Before paying, passengers can review the listed trip, driver, vehicle, park, seat availability, and fare.
            </p>
            <p className="text-muted-foreground text-lg leading-relaxed">
              For questions about a particular departure or pickup point, contact our support team before travelling.
            </p>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
