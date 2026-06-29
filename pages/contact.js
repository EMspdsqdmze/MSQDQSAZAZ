import Link from "next/link";

export default function Contact() {
  return (
    <main>
      <header className="siteHeader">
        <Link className="brand" href="/">TirageZone</Link>
        <nav>
          <Link href="/">Accueil</Link>
          <Link href="/status">Suivi</Link>
          <Link href="/rules">Règlement</Link>
          <Link href="/privacy">Confidentialité</Link>
          <Link href="/contact">Contact</Link>
        </nav>
        <div className="headerActions">
          <Link className="loginLink" href="/status">Suivi</Link>
          <Link className="registerLink" href="/signup">Participer</Link>
        </div>
      </header>

      <section className="legalPage">
        <h1>Contact</h1>
        <p>
          Pour une question sur le concours, une demande RGPD ou un signalement, contactez
          l'organisateur avec le moyen de contact indiqué dans vos communications officielles.
        </p>
        <p className="contactBox">Contact à configurer avant la mise en ligne</p>
        <p>
          Ne transmettez jamais de mot de passe, code SMS, code de vérification ou information
          bancaire. Ces informations ne sont pas nécessaires au concours.
        </p>
      </section>
    </main>
  );
}
