import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CTASection from "@/components/CTASection";
import SeoMeta, { SITE_URL } from "@/components/SeoMeta";
import { Button } from "@/components/ui/button";

type SeoPageContent = {
  slug: string;
  navLabel: string;
  title: string;
  metaDescription: string;
  badge: string;
  h1: string;
  lead: string[];
  differentiators: { title: string; body: string }[];
  sections: { heading: string; paragraphs: string[] }[];
  faq: { q: string; a: string }[];
};

const PAGES: SeoPageContent[] = [
  {
    slug: "omegle-alternative",
    navLabel: "Omegle alternative",
    title: "Omegle Alternative – Meet People Nearby by Interest | milo",
    metaDescription:
      "Looking for an Omegle alternative? milo matches you with compatible people nearby based on interests, location and availability — so online chats can turn into real meetups.",
    badge: "Omegle alternative",
    h1: "Looking for an Omegle Alternative?",
    lead: [
      "If you're looking for a way to meet new people without relying on completely random, anonymous roulette-style conversations, milo takes a different approach.",
      "milo connects you with people based on interests, location and availability, with the goal of turning online connections into real-world activities.",
    ],
    differentiators: [
      {
        title: "Matched, not random",
        body: "Omegle famously paired you with a completely random stranger. milo pairs you with people who share your interests, so every video chat starts with something in common.",
      },
      {
        title: "Nearby matters",
        body: "Instead of landing on someone another continent away, milo prioritises people near you — so a great conversation can actually become a plan.",
      },
      {
        title: "Built to meet up",
        body: "milo lets you create and join activities: grab a coffee, go hiking, hit the gym. The point is to leave the screen behind, not just scroll through it.",
      },
      {
        title: "Safety first",
        body: "Profiles give context, chats are encrypted, and there are clear reporting tools. Nobody hides behind total anonymity.",
      },
    ],
    sections: [
      {
        heading: "Why people are looking for an Omegle alternative",
        paragraphs: [
          "Omegle shut down in 2023 after more than a decade of completely unmoderated random chat. Its users quickly learned that pairing two strangers with zero shared context usually produced spam, bots and offensive behaviour far more often than genuine connection.",
          "The lesson from that era is simple: the novelty of 'who will I get?' wears off fast. What people actually want is to meet someone they click with and to feel safe while doing it.",
        ],
      },
      {
        heading: "How milo matching works",
        paragraphs: [
          "Instead of a lottery, milo matches on three signals: interests, location and availability. Add a few interests, and milo looks for people nearby who share them and are free around the same time as you.",
          "There's no algorithm feeding you strangers at random — there's a match, a reason to talk, and eventually a reason to meet up.",
        ],
      },
      {
        heading: "From strangers to people",
        paragraphs: [
          "The most common regret about Omegle-style apps is that every conversation ended at 'hi' and started again from zero. milo carries context: shared interests, a profile, a location and an open plan.",
          "That context is the difference between a random video call and a real connection.",
        ],
      },
    ],
    faq: [
      {
        q: "Is milo free?",
        a: "Yes. milo is free to start — create a profile, add your interests, video chat, and browse or create plans near you.",
      },
      {
        q: "Do I need a webcam to use milo?",
        a: "No. Video chat is optional. You can use milo purely for text chat and for creating and joining real-world plans.",
      },
      {
        q: "Is milo safe?",
        a: "milo is built with safety in mind: encrypted conversations, reporting tools, and encouragement to meet up in public places. You're always in control of what you share.",
      },
      {
        q: "Can minors use milo?",
        a: "No. milo is strictly 18 and over.",
      },
    ],
  },
  {
    slug: "ometv-alternative",
    navLabel: "OmeTV alternative",
    title: "OmeTV Alternative – Video Chat With People Who Share Your Interests | milo",
    metaDescription:
      "A safer OmeTV alternative. milo matches you with people who share your interests and are nearby, with profiles, encrypted chat and real-world plans — not random strangers.",
    badge: "OmeTV alternative",
    h1: "The OmeTV Alternative That Matches on More Than Luck",
    lead: [
      "OmeTV built its whole experience around hitting 'next' until you found someone interesting. The problem is the next button works both ways — interesting people get skipped over just as fast.",
      "milo takes a different approach: match on what you care about, talk to people who share it, and turn the conversation into a plan.",
    ],
    differentiators: [
      {
        title: "Interest-first matchmaking",
        body: "Tell milo what you're into and you'll be matched with people who are into the same things — no endless skipping.",
      },
      {
        title: "Real profiles, fewer bots",
        body: "Random video chat apps are full of bots and spam. milo's profiles and managed presence make real signal much easier to find.",
      },
      {
        title: "From video chat to meetup",
        body: "The exciting version of video chat is the one that ends with coffee next weekend. milo is built for that next step.",
      },
      {
        title: "Location you can use",
        body: "OmeTV is global roulette. milo can match you with someone in your city who is free right now.",
      },
    ],
    sections: [
      {
        heading: "The problem with next-button roulette",
        paragraphs: [
          "Random video chat platforms optimise for the thrill of the unknown. That's fun for about ten minutes, then it becomes exhausting — catfishing, bots, and a constant stream of strangers who vanish the second a conversation gets real.",
          "Matching on interests and location changes the entire dynamic: you start each conversation with common ground instead of a silent standoff.",
        ],
      },
      {
        heading: "How milo does video chat differently",
        paragraphs: [
          "milo's video chat connects you with people based on the interests you've added. When you connect, you can see what you have in common before you say a word.",
          "And because milo also handles plans, the conversation doesn't have to die in an app — it can become a meetup.",
        ],
      },
    ],
    faq: [
      {
        q: "How is milo different from OmeTV?",
        a: "milo matches on interests, location and availability instead of complete random strangers, and it's designed to move conversations into real-world plans.",
      },
      {
        q: "Can I chat without video?",
        a: "Yes. Video is optional — text chat works on its own.",
      },
      {
        q: "Is milo free?",
        a: "Yes, milo is free to start: profile, interests, video chat and plans.",
      },
    ],
  },
  {
    slug: "monkey-alternative",
    navLabel: "Monkey alternative",
    title: "Monkey Alternative – Match on Interests, Not Just Random Strangers | milo",
    metaDescription:
      "A thoughtful Monkey app alternative. milo pairs you with people who share your interests and are nearby, with profiles, safe chat and real plans — not infinite strangers.",
    badge: "Monkey alternative",
    h1: "A Monkey Alternative for People You'll Actually Click With",
    lead: [
      "Monkey made random video chat fun for a generation — short, fast, spontaneous. But fast and random also means shallow: matches vanish the moment a conversation gets interesting.",
      "milo keeps the energy but fixes the randomness. You match with people who share your interests, and those conversations are built to go somewhere.",
    ],
    differentiators: [
      {
        title: "Keep the vibe, drop the roulette",
        body: "Spontaneous video chat is great — milo keeps it, but points it at people who share your interests so first conversations actually land.",
      },
      {
        title: "Context that carries over",
        body: "Profiles, shared interests and open plans give you something real to talk about beyond 'so where are you from?'",
      },
      {
        title: "Made for people who want to meet",
        body: "If you're tired of digital-only friends, milo lets you take a connection from video chat to an actual plan.",
      },
      {
        title: "Safer by design",
        body: "Encrypted chat, reporting tools and a policy against full anonymity keep spam and harassment out.",
      },
    ],
    sections: [
      {
        heading: "What made Monkey great — and what it missed",
        paragraphs: [
          "Monkey nailed spontaneity and gamified matching, which is why it took off with younger users. But endless random pairings and vanishing chats meant most conversations never had a chance to become friendships.",
          "milo borrows the spontaneity and pairs it with matching that makes sense — so spontaneity leads somewhere instead of resetting every time.",
        ],
      },
      {
        heading: "Designed for the follow-through",
        paragraphs: [
          "The real promise of meeting people online is that it improves your life offline. milo is the only part of the stack that handles both halves: the match and the meetup.",
        ],
      },
    ],
    faq: [
      {
        q: "Is milo like the Monkey app?",
        a: "In spirit, yes — fun, spontaneous video chat. In practice, milo matches you by interest and location and helps you turn chats into real plans.",
      },
      {
        q: "Do I need to show my face?",
        a: "No. Text-only chat is fully supported.",
      },
      {
        q: "Is milo free to use?",
        a: "Yes — creating a profile, chatting and joining plans is free.",
      },
    ],
  },
  {
    slug: "ummingle-alternative",
    navLabel: "Ummingle alternative",
    title: "Ummingle Alternative – Interest-Based Matchmaking & Meetups | milo",
    metaDescription:
      "An Ummingle alternative with real matchmaking. milo pairs you with compatible people nearby based on interests, location and availability — and builds toward real meetups.",
    badge: "Ummingle alternative",
    h1: "The Ummingle Alternative That Gets You Out of the House",
    lead: [
      "Ummingle-style random video chat is fun for a moment, but it leaves every meaningful connection on the table — because random strangers rarely become plans.",
      "milo is structured around the outcome you actually want: meet compatible people, then meet them in real life.",
    ],
    differentiators: [
      {
        title: "Compatibility over randomness",
        body: "Match on shared interests instead of whoever the roulette lands on. Every chat starts with real common ground.",
      },
      {
        title: "Plans are the point",
        body: "milo lets people create and join activities. You don't just meet video strangers — you find people who actually want to do things.",
      },
      {
        title: "Location-aware matching",
        body: "Find people nearby who are free at the same time as you, not someone twelve time zones away.",
      },
      {
        title: "Context and safety",
        body: "Profiles, encrypted conversations and reporting make sure anonymity never shields bad behaviour.",
      },
    ],
    sections: [
      {
        heading: "Why random chat apps stall",
        paragraphs: [
          "Apps built purely on random video chat optimise for a single metric: time on app. That metric is at war with what users actually want — time off the app, doing things with real people.",
          "Once the novelty fades, random chat apps stall because they can't answer the only question that matters: what happens next?",
        ],
      },
      {
        heading: "What milo does instead",
        paragraphs: [
          "milo treats the chat as step one. Step two is a plan — a coffee, a hike, a game night — that gives the connection somewhere to go.",
          "That's the difference between collecting strangers and building a social life.",
        ],
      },
    ],
    faq: [
      {
        q: "What makes milo different from random chat apps?",
        a: "milo matches you by interests, location and availability, and connects that chat to real-world plans instead of keeping everything on screen.",
      },
      {
        q: "Can I use milo without video?",
        a: "Yes. Text chat and plans work perfectly well without a camera.",
      },
      {
        q: "Does it cost anything?",
        a: "milo is free to get started — profile, interests, video chat and plans.",
      },
    ],
  },
  {
    slug: "random-chat-alternative",
    navLabel: "Random chat alternative",
    title: "Random Chat Alternative – Meet People With a Purpose | milo",
    metaDescription:
      "Sick of random online chat? milo matches you with compatible people nearby based on interests, location and availability — and helps you turn conversations into real meetups.",
    badge: "Random chat alternative",
    h1: "A Random Chat Alternative With a Purpose",
    lead: [
      "Random chat apps have one thing in common: they hand you a stranger and hope something sticks. Sometimes it does — most of the time it doesn't.",
      "milo keeps the spontaneity but removes the randomness. You're matched with people who share your interests and your area, and the conversation has a reason to exist.",
    ],
    differentiators: [
      {
        title: "No more match roulette",
        body: "Your interests drive who shows up. No more guesswork, no more endless silences with people who have nothing in common with you.",
      },
      {
        title: "Chat with a trajectory",
        body: "Every milo connection can become a plan. The app is built around the next step, not just the next message.",
      },
      {
        title: "People you could actually meet",
        body: "Location and availability matching mean the person you're talking to could genuinely be at your coffee shop this weekend.",
      },
      {
        title: "Less noise, more signal",
        body: "Profiles and managed presence keep bots and ghosting from flooding the experience.",
      },
    ],
    sections: [
      {
        heading: "The fun part of random chat is real — and reproducible",
        paragraphs: [
          "The rush of talking to someone new is real, and you don't need pure randomness to get it. Matching on interests produces plenty of surprises — just with a higher chance of connection and a lower chance of spam.",
        ],
      },
      {
        heading: "Let the chat become the plan",
        paragraphs: [
          "milo connects the chat to real-world activities. The people you match with aren't just usernames — they're people who've said what they like and what they're doing. That makes the leap from screen to street much easier.",
        ],
      },
    ],
    faq: [
      {
        q: "Do I have to video chat?",
        a: "No. Text chat, video chat, or just creating and joining plans — your choice.",
      },
      {
        q: "How does milo decide who I match with?",
        a: "milo uses your interests, your location and your availability to prioritise people who share them.",
      },
      {
        q: "Is milo free?",
        a: "Yes, milo is free to start using.",
      },
    ],
  },
  {
    slug: "meet-people-nearby",
    navLabel: "Meet people nearby",
    title: "Meet People Nearby & Make Real Connections | milo",
    metaDescription:
      "Meet compatible people nearby based on interests, location and availability. Make new friends, discover activities and plan safe meetups with milo.",
    badge: "Meet people nearby",
    h1: "Meet People Nearby Who Want to Actually Hang Out",
    lead: [
      "It's easy to know a lot of people and still feel disconnected. milo exists to close that gap: it connects you with people near you who share your interests and are free at the same time as you.",
      "No random strangers, no infinite scrolling — just compatible people, and plans that take you out of the house.",
    ],
    differentiators: [
      {
        title: "Nearby by default",
        body: "milo matches on location first, so the person on the other end could genuinely meet you this week.",
      },
      {
        title: "Shared interests, shared plans",
        body: "You'll be matched with people who like what you like — and who've posted plans to do things about it.",
      },
      {
        title: "Availability that lines up",
        body: "Finding a time is half the battle of making friends. milo considers when you're free, not just who you are.",
      },
      {
        title: "Built for real-world safety",
        body: "Public meetups, verified profiles, encrypted chat and an easy path to report anything off.",
      },
    ],
    sections: [
      {
        heading: "Why 'nearby' changes everything",
        paragraphs: [
          "Meeting people online is easy; meeting people in real life is the hard part. When the people you meet are nearby, convenience stops being an excuse — the coffee shop is two blocks away and they're free on Tuesday.",
        ],
      },
      {
        heading: "How to meet people nearby with milo",
        paragraphs: [
          "Create a profile with a few interests, then either video chat with matched people in your area or browse plans people have posted near you and join one.",
          "Because plans are the point, you're always one step from actually meeting — not just one more message away from ghosting.",
        ],
      },
    ],
    faq: [
      {
        q: "How do I find people nearby on milo?",
        a: "Add your interests and milo matches you with compatible people nearby. You can also browse and join plans posted by people in your area.",
      },
      {
        q: "Is it safe to meet people from milo?",
        a: "milo encourages meeting in public places, keeps chats encrypted, and provides reporting tools. Always meet somewhere public on a first meetup.",
      },
      {
        q: "Is milo free?",
        a: "Yes — creating a profile, matching and joining plans is free.",
      },
    ],
  },
  {
    slug: "make-new-friends",
    navLabel: "Make new friends",
    title: "Make New Friends Online & Meet in Real Life | milo",
    metaDescription:
      "Make new friends online and meet them in real life. milo matches you with compatible people nearby based on interests, location and availability.",
    badge: "Make new friends",
    h1: "Make New Friends Online — and Actually Meet Them",
    lead: [
      "Making friends as an adult is genuinely hard, and it's not your fault — the tools for it barely exist. milo is built specifically for this: matching you with people who share your interests, are near you, and want to do things together.",
      "It's not about collecting followers. It's about finding your people.",
    ],
    differentiators: [
      {
        title: "Match on your interests",
        body: "Hiking, gaming, books, food, music — milo pairs you with people who share what you actually like, giving small talk a shortcut.",
      },
      {
        title: "Plans are social glue",
        body: "The fastest way to become friends is to do something together. milo lets you post a plan and have people join you.",
      },
      {
        title: "Local, real, available",
        body: "Match with people in your area who are free when you are. Friendship across the country is nice; friendship across town is friendship.",
      },
      {
        title: "Safe and easy",
        body: "Encrypted chat, public meetup guidance and reporting tools keep the low-stakes fun, low-stakes.",
      },
    ],
    sections: [
      {
        heading: "The adult friendship problem",
        paragraphs: [
          "School and university hand you a ready-made social life. Then it ends, and nobody hands you a replacement. Dating apps dominate the focus, but the bigger gap for most people is simply friends.",
          "milo tackles that gap head-on: a place where 'looking for friends' is the entire point, not an awkward side note.",
        ],
      },
      {
        heading: "One good plan beats a dozen DMs",
        paragraphs: [
          "You can small-talk forever with dozens of people and make zero friends. The moment you do something together — a hike, a board game, a gig — you have a shared memory and a real friendship can start.",
          "That's the milo model: match on common ground, then make a plan instead of another message.",
        ],
      },
    ],
    faq: [
      {
        q: "Can I really make friends on milo?",
        a: "Yes — that's the entire purpose. milo matches you with compatible people nearby who also want to do things, not just chat.",
      },
      {
        q: "Do I have to video chat to make friends?",
        a: "No. You can meet people entirely through plans — post an activity, people join, and you meet in person.",
      },
      {
        q: "Is milo free?",
        a: "Yes, milo is free to get started.",
      },
    ],
  },
];

const SeoPage = ({ slug }: { slug: string }) => {
  const page = PAGES.find((p) => p.slug === slug);

  if (!page) return null;

  const canonicalPath = `/${page.slug}`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "milo",
      applicationCategory: "SocialNetworkingApplication",
      operatingSystem: "Web, Android, iOS",
      url: `${SITE_URL}${canonicalPath}`,
      description: page.metaDescription,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    ...[
      page.faq.length > 0
        ? {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: page.faq.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }
        : null,
    ].filter(Boolean),
  ];

  const others = PAGES.filter((p) => p.slug !== page.slug);

  return (
    <>
      <SeoMeta
        title={page.title}
        description={page.metaDescription}
        path={canonicalPath}
        type="website"
        jsonLd={jsonLd}
      />
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto max-w-3xl px-6 pt-28 pb-20">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full gradient-primary px-4 py-1.5 text-sm font-medium text-primary-foreground">
              {page.badge}
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              {page.h1}
            </h1>
            {page.lead.map((p, i) => (
              <p key={i} className="mt-5 text-lg leading-relaxed text-muted-foreground">
                {p}
              </p>
            ))}
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Button variant="gradient" size="lg" asChild>
                <Link to="/chat">Start chatting — free</Link>
              </Button>
              <Button variant="gradient-outline" size="lg" asChild>
                <Link to="/app">See plans near you</Link>
              </Button>
            </div>
          </div>

          <div className="mt-16 grid gap-4 sm:grid-cols-2">
            {page.differentiators.map((d) => (
              <div key={d.title} className="rounded-2xl border border-border bg-card p-6">
                <h2 className="text-base font-bold">{d.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 space-y-12">
            {page.sections.map((s) => (
              <section key={s.heading}>
                <h2 className="text-2xl font-extrabold tracking-tight">{s.heading}</h2>
                {s.paragraphs.map((p, i) => (
                  <p key={i} className="mt-4 leading-relaxed text-foreground/80">
                    {p}
                  </p>
                ))}
              </section>
            ))}
          </div>

          <section className="mt-16">
            <h2 className="text-2xl font-extrabold tracking-tight">Frequently asked questions</h2>
            <div className="mt-6 space-y-3">
              {page.faq.map((f) => (
                <details key={f.q} className="rounded-2xl border border-border bg-card px-6 py-4">
                  <summary className="cursor-pointer text-sm font-semibold">{f.q}</summary>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="mt-16">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Explore more
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {others.map((o) => (
                <Link
                  key={o.slug}
                  to={`/${o.slug}`}
                  className="rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                >
                  {o.navLabel}
                </Link>
              ))}
            </div>
          </section>
        </main>
        <CTASection />
        <Footer />
      </div>
    </>
  );
};

export default SeoPage;