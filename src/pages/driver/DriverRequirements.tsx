import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { FileText, Camera, Car, Users, Phone, Mail, MapPin, Shield, ArrowRight, CheckCircle, AlertCircle } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";

const requiredDocs = [
  {
    icon: FileText,
    title: "Valid Driver's License",
    description: "A current, government-issued Nigerian driver's license. Must not be expired.",
    required: true,
  },
  {
    icon: FileText,
    title: "National Identification Number (NIN)",
    description: "Your NIN slip or card for identity verification.",
    required: true,
  },
  {
    icon: Camera,
    title: "Passport Photograph",
    description: "A recent, clear passport-sized photograph with a white background.",
    required: true,
  },
  {
    icon: Car,
    title: "Vehicle Papers",
    description: "Vehicle registration, insurance, and proof of ownership (if you own a vehicle).",
    required: false,
  },
  {
    icon: Users,
    title: "Guarantor Details",
    description: "Name, phone number, address, and relationship of a guarantor who can vouch for you.",
    required: true,
  },
  {
    icon: Phone,
    title: "Phone Number",
    description: "An active Nigerian phone number for communication and trip updates.",
    required: true,
  },
  {
    icon: Mail,
    title: "Email Address",
    description: "A valid email address for account setup and notifications.",
    required: true,
  },
  {
    icon: MapPin,
    title: "Residential Address",
    description: "Your current residential address with state and city.",
    required: true,
  },
  {
    icon: Shield,
    title: "Roadworthiness Certificate",
    description: "A valid roadworthiness certificate for your vehicle (if applicable).",
    required: false,
  },
];

const DriverRequirements = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-24 pb-12 bg-primary">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Driver Requirements
            </h1>
            <p className="text-white/80 text-lg max-w-2xl mx-auto">
              Here's what you need to become a Borix Express driver. Make sure you have these ready before applying.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Requirements List */}
      <section className="section-padding">
        <div className="container-custom max-w-4xl">
          <div className="space-y-6">
            {requiredDocs.map((doc, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="bg-card rounded-xl p-6 shadow-sm border border-border flex gap-5"
              >
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <doc.icon className="w-6 h-6 text-accent" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-foreground">{doc.title}</h3>
                    {doc.required ? (
                      <span className="text-xs font-semibold bg-accent/10 text-accent px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Required
                      </span>
                    ) : (
                      <span className="text-xs font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Optional
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm">{doc.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 text-center bg-primary rounded-2xl p-10"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Have Everything Ready?
            </h2>
            <p className="text-white/80 mb-8">
              Start your application now. It only takes a few minutes.
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

export default DriverRequirements;
