import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border py-12">
      <div className="container mx-auto px-6">
        <div className="flex flex-col justify-between gap-10 md:flex-row md:items-start">
          <div>
            <Link to="/" className="text-xl font-extrabold text-gradient">milo</Link>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              Meet compatible people nearby based on interests, location and availability.
            </p>
          </div>

          <div className="grid gap-10 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold">Company</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li><Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link></li>
                <li><Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link></li>
                <li><Link to="/feedback" className="hover:text-foreground transition-colors">Feedback</Link></li>
                <li><a href="/#safety" className="hover:text-foreground transition-colors">Safety</a></li>
                <li><a href="mailto:support@milo.example" className="hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold">Explore</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li><Link to="/omegle-alternative" className="hover:text-foreground transition-colors">Omegle alternative</Link></li>
                <li><Link to="/ometv-alternative" className="hover:text-foreground transition-colors">OmeTV alternative</Link></li>
                <li><Link to="/monkey-alternative" className="hover:text-foreground transition-colors">Monkey alternative</Link></li>
                <li><Link to="/meet-people-nearby" className="hover:text-foreground transition-colors">Meet people nearby</Link></li>
                <li><Link to="/make-new-friends" className="hover:text-foreground transition-colors">Make new friends</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">© 2026 milo. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;