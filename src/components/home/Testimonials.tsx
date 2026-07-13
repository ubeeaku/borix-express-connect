import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Chidi Okonkwo",
    location: "Lagos",
    rating: 5,
    color: "bg-accent text-accent-foreground",
    text: "Borix Express has made my Lagos to Abuja trips so much easier. The buses are clean, comfortable, and always on time. Highly recommended!",
  },
  {
    name: "Amina Ibrahim",
    location: "Jos",
    rating: 5,
    color: "bg-primary text-primary-foreground",
    text: "I've been using Borix Express for over a year now. The online booking is seamless, and their customer service is excellent.",
  },
  {
    name: "Emeka Nwankwo",
    location: "Abuja",
    rating: 5,
    color: "bg-emerald-600 text-white",
    text: "Safe, reliable, and affordable. What more could you ask for? Borix Express is my go-to for intercity travel.",
  },
];

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export const Testimonials = () => {
  return (
    <section className="section-padding bg-muted/60">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-accent font-semibold text-sm uppercase tracking-wider">
            Testimonials
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2 mb-4">
            What Our Customers Say
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Thousands of happy customers trust us for their travel needs.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-card border-l-4 border-accent rounded-tr-2xl rounded-br-2xl rounded-bl-2xl p-8 relative shadow-sm hover:shadow-lg transition-shadow duration-300"
            >
              <Quote className="absolute top-6 right-6 w-8 h-8 text-accent/20" />

              <div className="flex gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-accent text-accent" />
                ))}
              </div>

              <p className="text-foreground mb-6 leading-relaxed text-sm md:text-base">
                "{testimonial.text}"
              </p>

              <div className="flex items-center gap-3 pt-4 border-t border-border/60">
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm ${testimonial.color}`}
                  aria-hidden
                >
                  {getInitials(testimonial.name)}
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">Verified passenger · {testimonial.location}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
