import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Car, DollarSign, MapPin, Shield, Clock, Users, ArrowRight, CheckCircle } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";

const benefits = [
  {
    icon: Clock,
    title: "Flexible Trips",
    description: "Choose trips that fit your schedule. Drive when it works for you.",
  },
  {
    icon: DollarSign,
    title: "Weekly Earnings",
    description: "Earn competitive pay with weekly payouts directly to your bank account.",
  },
  {
    icon: MapPin,
    title: "Route Specialization",
    description: "Focus on the Jos–Abuja corridor. Master the route and build your reputation.",
  },
  {
    icon: Shield,
    title: "Support & Safety",
    description: "24/7 support, vehicle monitoring, and comprehensive safety protocols.",
  },
];

const requirements = [
  "Valid Nigerian driver's license",
  "National Identification Number (NIN)",
  "Passport photograph",
  "Minimum 2 years driving experience",
  "Clean driving record",
  "Smartphone with data plan",
];

const DriveWithUs = () => {
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
            <div className="inline-flex items-center gap-2 bg-accent/20 text-accent px-4 py-2 rounded-full text-sm font-semibold mb-6">
              <Car className="w-4 h-4" />
              Now Recruiting Drivers
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Drive with{" "}
              <span className="text-accent">Borix Express</span>
            </h1>
            <p className="text-white/80 text-lg md:text-xl mb-10 max-w-2xl mx-auto">
              Join Nigeria's fastest-growing intercity transport service. Earn great pay driving the Jos–Abuja route with a trusted brand.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/driver/apply">
                <Button className="btn-hero text-lg px-10 py-6">
                  Apply as Driver
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to="/driver/requirements">
                <button className="btn-outline-hero text-lg px-10 py-4">
                  View Requirements
                </button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section className="section-padding">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Why Drive With Us?
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              We take care of our drivers so they can focus on delivering safe, comfortable rides.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="card-elevated text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-5">
                  <benefit.icon className="w-7 h-7 text-accent" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{benefit.title}</h3>
                <p className="text-muted-foreground text-sm">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Requirements Preview */}
      <section className="section-padding bg-muted">
        <div className="container-custom">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                What You Need to Get Started
              </h2>
              <div className="space-y-4">
                {requirements.map((req, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
                    <span className="text-foreground">{req}</span>
                  </div>
                ))}
              </div>
              <Link to="/driver/requirements" className="inline-block mt-8">
                <Button variant="outline" className="font-semibold">
                  See Full Requirements
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-primary rounded-2xl p-8 text-white"
            >
              <div className="flex items-center gap-3 mb-6">
                <Users className="w-8 h-8 text-accent" />
                <h3 className="text-2xl font-bold">Join 50+ Drivers</h3>
              </div>
              <p className="text-white/80 mb-6">
                Our growing team of professional drivers covers the Jos–Abuja corridor daily, serving thousands of passengers.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-accent">₦200K+</p>
                  <p className="text-white/70 text-sm">Avg. Monthly Earnings</p>
                </div>
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-accent">2</p>
                  <p className="text-white/70 text-sm">Daily Routes</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding bg-primary">
        <div className="container-custom text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Start Earning?
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
              Apply today and start driving within days of approval.
            </p>
            <Link to="/driver/apply">
              <Button className="btn-hero text-lg px-10 py-6">
                Apply Now
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default DriveWithUs;
