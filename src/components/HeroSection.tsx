import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin, Users, Shield } from "lucide-react";
import heroImage from "@/assets/hero-friends.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background image with overlay */}
      <div className="absolute inset-0">
        <img src={heroImage} alt="Friends enjoying time together" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-background/60" />
      </div>

      <div className="container relative z-10 mx-auto px-6 py-20">
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground mb-6">
              <span className="h-2 w-2 rounded-full gradient-primary" />
              Now in beta — join the vibe
            </span>
          </motion.div>

          <motion.h1
            className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            Find your <span className="text-gradient">people</span>,
            <br />
            make it <span className="text-gradient">happen</span>.
          </motion.h1>

          <motion.p
            className="text-lg text-muted-foreground max-w-lg mb-8 leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            Feeling lonely or just wanna go out? chillout connects you with
            real people nearby who share your vibe. Safe, easy, no pressure.
          </motion.p>

          <motion.div
            className="flex flex-wrap gap-4 mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <Button variant="gradient" size="xl" asChild>
              <Link to="/chat">Get Started</Link>
            </Button>
            <Button variant="gradient-outline" size="xl">
              How it Works
            </Button>
          </motion.div>

          <motion.div
            className="flex flex-wrap gap-6 text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.5 }}
          >
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" /> Location-based
            </span>
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-secondary" /> Verified users
            </span>
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Safety first
            </span>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
