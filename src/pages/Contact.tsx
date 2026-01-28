import { motion } from "framer-motion";
import { Phone, Mail, MapPin, MessageCircle, Clock, Send } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

const contactInfo = [
  {
    icon: Phone,
    title: "Phone",
    value: "+234 903 657 3414",
    description: "Mon-Sun, 6am-10pm",
    action: "tel:+2349036573414",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp",
    value: "Chat with us",
    description: "Quick responses",
    action: "https://wa.me/2349036573414",
  },
  {
    icon: Mail,
    title: "Email",
    value: "borixexpressltd@gmail.com",
    description: "We reply within 24 hours",
    action: "mailto:borixexpressltd@gmail.com",
  },
  {
    icon: Clock,
    title: "Operating Hours",
    value: "6:00 AM - 10:00 PM",
    description: "Daily service",
    action: null,
  },
];

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Message Sent! ✉️",
      description: "We'll get back to you as soon as possible.",
    });
    setFormData({ name: "", email: "", phone: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-24 pb-12 bg-primary">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Contact Us
            </h1>
            <p className="text-white/80 text-lg max-w-2xl mx-auto">
              Have questions? We're here to help. Reach out to us through any of the channels below.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Cards */}
      <section className="py-16">
        <div className="container-custom">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 -mt-24">
            {contactInfo.map((info, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {info.action ? (
                  <a
                    href={info.action}
                    target={info.action.startsWith("http") ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="block bg-card rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 h-full"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
                      <info.icon className="w-7 h-7 text-accent" />
                    </div>
                    <h3 className="font-bold text-foreground mb-1">{info.title}</h3>
                    <p className="font-medium text-accent">{info.value}</p>
                    <p className="text-sm text-muted-foreground mt-1">{info.description}</p>
                  </a>
                ) : (
                  <div className="bg-card rounded-2xl p-6 shadow-lg h-full">
                    <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
                      <info.icon className="w-7 h-7 text-accent" />
                    </div>
                    <h3 className="font-bold text-foreground mb-1">{info.title}</h3>
                    <p className="font-medium text-foreground">{info.value}</p>
                    <p className="text-sm text-muted-foreground mt-1">{info.description}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form & Map */}
      <section className="section-padding bg-muted">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                Send Us a Message
              </h2>
              <p className="text-muted-foreground mb-8">
                Fill out the form below and we'll get back to you shortly.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="Your name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="h-12 mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Your phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="h-12 mt-1"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Your email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-12 mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="How can we help you?"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="mt-1 min-h-[150px]"
                    required
                  />
                </div>

                <Button variant="accent" size="lg" type="submit" className="w-full md:w-auto">
                  Send Message
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </motion.div>

            {/* Map */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="h-full min-h-[400px]"
            >
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                Our Location
              </h2>
              <p className="text-muted-foreground mb-8">
                Visit our head office in Jos, Nigeria.
              </p>

              <div className="bg-card rounded-2xl overflow-hidden shadow-lg h-[400px]">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3930.2234!2d8.8891!3d9.8965!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x105373b8b9d3e8c5%3A0x8b8b8b8b8b8b8b8b!2s47%20Cornerstone%20Kabong%2C%20Off%20Rukuba%20Road%2C%20Jos!5e0!3m2!1sen!2sng!4v1700000000000!5m2!1sen!2sng"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Borix Express Location"
                />
              </div>

              <div className="mt-6 flex items-start gap-3 p-4 bg-card rounded-xl">
                <MapPin className="w-5 h-5 text-accent mt-1" />
                <div>
                  <p className="font-semibold text-foreground">Head Office</p>
                  <p className="text-muted-foreground">
                    No.47 cornerstone Kabong, Off Rukuba Road, Jos Nigeria
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Contact;
