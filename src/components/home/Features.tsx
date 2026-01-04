import { motion } from "framer-motion";
import { Shield, Clock, Armchair, CreditCard, MapPin, Headphones } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Safety First",
    description: "All our vehicles undergo regular maintenance checks. Our drivers are fully licensed and trained.",
  },
  {
    icon: Clock,
    title: "Always On Time",
    description: "We pride ourselves on punctuality. Your trip will depart and arrive as scheduled.",
  },
  {
    icon: Armchair,
    title: "Comfortable Seats",
    description: "Spacious, air-conditioned buses with reclining seats for a relaxing journey.",
  },
  {
    icon: CreditCard,
    title: "Easy Payments",
    description: "Pay securely online with Paystack. Multiple payment options available.",
  },
  {
    icon: MapPin,
    title: "Wide Coverage",
    description: "We cover major cities across Nigeria including Lagos, Abuja, Jos, and more.",
  },
  {
    icon: Headphones,
    title: "24/7 Support",
    description: "Our customer service team is always available to assist you.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export const Features = () => {
  return (
    <section className="section-padding bg-muted">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-accent font-semibold text-sm uppercase tracking-wider">
            Why Choose Us
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2 mb-4">
            Travel With Confidence
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Borix Express is committed to providing the best intercity travel experience in Nigeria.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="card-elevated group cursor-default"
            >
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-5 group-hover:bg-accent transition-colors duration-300">
                <feature.icon className="w-7 h-7 text-accent group-hover:text-accent-foreground transition-colors duration-300" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
