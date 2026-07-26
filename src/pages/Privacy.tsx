import LegalPage from "@/components/LegalPage";

const Privacy = () => (
  <LegalPage title="Privacy Policy" updated="July 26, 2026">
    <p>
      This Privacy Policy explains how chillout ("we", "us") collects, uses, and protects
      your information when you use the app. By using chillout, you agree to this policy.
    </p>

    <h2>Information we collect</h2>
    <p>
      Account details you provide (email, display name), profile content (bio, interests,
      avatar, posts), and activity such as plans you create or join and messages you send.
    </p>

    <h2>How we use it</h2>
    <p>
      To operate the service — authenticate you, show your profile and plans to others,
      deliver messages and notifications, and keep the community safe.
    </p>

    <h2>Sharing</h2>
    <p>
      Profile details, posts, and plans are visible to other signed-in users. We do not
      sell your personal data. We use Supabase to host data and provide authentication.
    </p>

    <h2>Your choices</h2>
    <p>
      You can edit or remove your profile information and posts at any time, and delete
      content you created. Contact us to request deletion of your account.
    </p>

    <h2>Contact</h2>
    <p>Questions about this policy? Reach us at support@chillout.example.</p>
  </LegalPage>
);

export default Privacy;
