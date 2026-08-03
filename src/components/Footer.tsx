import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border py-12">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <Link to="/" className="text-xl font-extrabold text-gradient">chillout</Link>
          <div className="flex gap-8 text-sm text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link to="/feedback" className="hover:text-foreground transition-colors">Feedback</Link>
            <a href="/#safety" className="hover:text-foreground transition-colors">Safety</a>
            <a href="mailto:support@chillout.example" className="hover:text-foreground transition-colors">Contact</a>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 chillout. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
