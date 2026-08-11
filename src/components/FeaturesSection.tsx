import { motion } from "framer-motion";
import { MapPin, MessageCircle, Users, Sparkles, Calendar, Lock } from "lucide-react";

const features = [
  {
    icon: MapPin,
    title: "Nearby Matches",
    description: "Discover people around you who are free right now and share your interests.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: MessageCircle,
    title: "Encrypted Chat",
    description: "End-to-end encrypted messaging so your conversations stay private.",
    color: "text-secondary",
    bg: "bg-secondary/10",
  },
  {
    icon: Users,
    title: "Solo or Squad",
    description: "Meet one-on-one or create small group hangouts — your call.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Sparkles,
    title: "Interest Matching",
    description: "AI-powered suggestions based on your hobbies, music taste, and vibe.",
    color: "text-secondary",
    bg: "bg-secondary/10",
  },
  {
    icon: Calendar,
    title: "Availability Status",
    description: "Set when you're free and get matched with people available at the same time.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Lock,
    title: "Verified Profiles",
    description: "Photo & ID verification so you always know who you're meeting.",
    color: "text-secondary",
    bg: "bg-secondary/10",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const FeaturesSection = () => {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl font-extrabold tracking-tight mb-4">
            Everything you need to <span className="text-gradient">connect</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Built for real connections, not endless scrolling.
          </p>
        </motion.div>

        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={item}
              className="bg-card rounded-2xl p-6 shadow-card hover:shadow-soft transition-shadow duration-300 group"
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${f.bg} mb-4`}>
                <f.icon className={`h-6 w-6 ${f.color}`} />
              </div>
              <h3 className="text-lg font-bold mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
