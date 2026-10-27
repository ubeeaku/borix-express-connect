import { motion } from "framer-motion";
import { Shield, Clock, Armchair, CreditCard, MapPin, Headphones, CheckCircle2 } from "lucide-react";
import busInterior from "@/assets/jos-city.jpg";

const features = [
  {
    icon: Shield,
    title: "Driver information",
    description: "Review the driver and vehicle details shown on each available departure before booking.",
  },
  {
    icon: Clock,
    title: "Scheduled departures",
    description: "Choose from departures available for your selected route and travel date.",
  },
  {
    icon: CreditCard,
    title: "Easy Payments",
    description: "Pay securely with Paystack or your Borix wallet. Multiple payment options.",
  },
  {
    icon: Headphones,
    title: "Daily support",
    description: "Contact our support team daily between 6:00 AM and 10:00 PM.",
  },
];

const cities = ["Jos", "Abuja"];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export const Features = () => {
  return (
    <section className="section-padding bg-gradient-to-b from-background to-muted/40">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="text-accent font-semibold text-sm uppercase tracking-wider">
            Why Choose Us
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2 mb-4">
            Travel With Confidence
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Book scheduled intercity departures between Jos and Abuja.
          </p>
        </motion.div>

        {/* Feature grid + comfortable seats photo card */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 gap-6 mb-8"
        >
          {/* Photo feature card - spans 2 rows on md+ */}
          <motion.div
            variants={itemVariants}
            className="md:row-span-2 relative rounded-3xl overflow-hidden shadow-lg group min-h-[320px]"
          >
            <img
              src={busInterior}
              alt="Comfortable reclining seats inside a Borix Express coach"
              width={1200}
              height={912}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/60 to-transparent" />
            <div className="relative h-full flex flex-col justify-end p-8 text-white">
              <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center mb-4">
                <Armchair className="w-6 h-6 text-accent-foreground" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Comfortable Seats</h3>
              <p className="text-white/85 max-w-sm">
                Spacious, air-conditioned coaches with reclining leather seats for a relaxing journey.
              </p>
            </div>
          </motion.div>

          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="bg-card border border-border/60 rounded-2xl p-6 flex gap-4 items-start hover:border-accent/40 hover:shadow-md transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                <feature.icon className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Wide coverage panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-primary rounded-3xl p-8 md:p-10 text-white relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/20 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3" />
          <div className="relative grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-accent-foreground" />
              </div>
              <h3 className="text-2xl md:text-3xl font-bold mb-3">Jos–Abuja service</h3>
              <p className="text-white/80 mb-2">
                Choose Jos to Abuja or Abuja to Jos and see the parks and departures available for your date.
              </p>
              <p className="text-accent font-semibold text-sm">See current fares when you choose a travel date.</p>
            </div>
            <ul className="grid grid-cols-2 gap-3">
              {cities.map((city) => (
                <li key={city} className="flex items-center gap-2 text-white/90">
                  <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                  <span className="text-sm md:text-base">{city}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
