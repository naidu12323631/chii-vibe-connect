import { motion } from "framer-motion";
import { Shield, MapPin, AlertTriangle, Eye, UserCheck, Phone } from "lucide-react";

const safetyFeatures = [
  { icon: UserCheck, title: "ID Verification", desc: "Multi-step identity check before you can meet anyone." },
  { icon: MapPin, title: "Live Location Sharing", desc: "Share your real-time location with trusted contacts during meetups." },
  { icon: AlertTriangle, title: "SOS Button", desc: "One-tap emergency alert that notifies your emergency contacts and nearby help." },
  { icon: Eye, title: "Profile Reviews", desc: "Community-driven ratings keep the space safe and accountable." },
  { icon: Shield, title: "AI Safety Monitor", desc: "Proactive detection of suspicious behavior and inappropriate content." },
  { icon: Phone, title: "Emergency Contacts", desc: "Pre-set trusted contacts who get notified instantly if you need help." },
];

const SafetySection = () => {
  return (
    <section className="py-24">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground mb-4">
              <Shield className="h-4 w-4" /> Safety is non-negotiable
            </span>
            <h2 className="text-4xl font-extrabold tracking-tight mb-4">
              Your safety, <span className="text-gradient">our priority</span>
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              We've built milo with safety at its core — especially for women and
              vulnerable users. Every feature is designed so you feel comfortable and in control.
            </p>

            {/* SOS demo */}
            <div className="relative inline-flex">
              <motion.button
                className="gradient-primary text-primary-foreground font-bold px-8 py-4 rounded-full shadow-glow text-lg flex items-center gap-3"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <AlertTriangle className="h-5 w-5" />
                SOS Emergency
              </motion.button>
              <span className="absolute -top-2 -right-2 flex h-5 w-5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex rounded-full h-5 w-5 bg-destructive" />
              </span>
            </div>
          </motion.div>

          <motion.div
            className="grid sm:grid-cols-2 gap-4"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {safetyFeatures.map((f) => (
              <div
                key={f.title}
                className="bg-card rounded-xl p-5 shadow-card hover:shadow-soft transition-shadow duration-300"
              >
                <f.icon className="h-5 w-5 text-primary mb-3" />
                <h3 className="font-bold text-sm mb-1">{f.title}</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default SafetySection;
