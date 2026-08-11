import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// Shared shell for static legal pages (Privacy, Terms).
const LegalPage = ({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <main className="container mx-auto max-w-2xl px-6 pt-28 pb-16">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back home</Link>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight md:text-4xl">
        {title}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: {updated}</p>

      {/* Placeholder banner — remove once real legal copy is in place. */}
      <div className="mt-6 rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        This is placeholder text. Replace it with your reviewed legal copy before launch.
      </div>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-bold [&_p]:text-muted-foreground">
        {children}
      </div>
    </main>
    <Footer />
  </div>
);

export default LegalPage;
