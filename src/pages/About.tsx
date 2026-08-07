import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Shield, Target, Heart, Users, MapPin, Clock } from "lucide-react";

const values = [
  {
    icon: Shield,
    title: "Safety First",
    description: "Every trip is monitored. Every vehicle is inspected. Every driver is vetted. Your safety is non-negotiable.",
  },
  {
    icon: Target,
    title: "Reliability",
    description: "We run on schedule. No delays, no cancellations, no excuses. When we say we'll be there, we're there.",
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
              Nigeria's most trusted intercity transport service, connecting Jos and Abuja with safe, reliable, and affordable rides.
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
                Borix Express was founded with a single goal: to make intercity travel in Nigeria safe, comfortable, and dependable. We believe every Nigerian deserves access to quality transport that runs on time, every time.
              </p>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Starting with the Jos–Abuja corridor, we're building a transport network that sets the standard for intercity travel across Nigeria. Our fleet of well-maintained vehicles and professionally trained drivers ensure every journey is a pleasant experience.
              </p>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-accent/10 rounded-2xl p-6 text-center">
                  <MapPin className="w-8 h-8 text-accent mx-auto mb-3" />
                  <p className="text-2xl font-bold text-foreground">2</p>
                  <p className="text-sm text-muted-foreground">Active Routes</p>
                </div>
                <div className="bg-accent/10 rounded-2xl p-6 text-center">
                  <Users className="w-8 h-8 text-accent mx-auto mb-3" />
                  <p className="text-2xl font-bold text-foreground">50+</p>
                  <p className="text-sm text-muted-foreground">Professional Drivers</p>
                </div>
                <div className="bg-accent/10 rounded-2xl p-6 text-center">
                  <Clock className="w-8 h-8 text-accent mx-auto mb-3" />
                  <p className="text-2xl font-bold text-foreground">Daily</p>
                  <p className="text-sm text-muted-foreground">Departures</p>
                </div>
                <div className="bg-primary rounded-2xl p-6 text-center">
                  <Shield className="w-8 h-8 text-accent mx-auto mb-3" />
                  <p className="text-2xl font-bold text-white">100%</p>
                  <p className="text-sm text-white/70">Safety Record</p>
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
              Borix Express isn't just a bus service — it's a movement to transform how Nigerians travel between cities. We're combining technology with exceptional service to create a booking and travel experience that rivals the best in the world.
            </p>
            <p className="text-muted-foreground text-lg leading-relaxed mb-6">
              From our easy online booking system to real-time trip tracking, from vetted professional drivers to comfortable modern vehicles — every detail is designed to give you peace of mind on the road.
            </p>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Whether you're a daily commuter, a student heading home, or a business traveller — Borix Express is your trusted partner on the Jos–Abuja route and beyond.
            </p>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
