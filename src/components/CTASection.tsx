import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const CTASection = () => {
  return (
    <section className="py-24">
      <div className="container mx-auto px-6">
        <motion.div
          className="relative rounded-3xl gradient-primary p-12 md:p-20 text-center overflow-hidden"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/10 translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-extrabold text-primary-foreground tracking-tight mb-4">
              Ready to stop scrolling
              <br />
              and start living?
            </h2>
            <p className="text-primary-foreground/80 text-lg max-w-md mx-auto mb-8">
              Join thousands of people who chose real connections over loneliness.
            </p>
            <Button
              size="xl"
              className="bg-background text-foreground hover:bg-background/90 shadow-lg font-bold rounded-full"
            >
              Join chillout free
              <ArrowRight className="h-5 w-5 ml-1" />
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
