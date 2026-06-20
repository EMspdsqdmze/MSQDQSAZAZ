import Link from "next/link";

export default function Home() {
  return (
    <main>
      <Header />

      <section className="hero homeHero">
        <div className="heroCopy">
          <span className="eyebrow">Tirage au sort</span>
          <h1>Epstein Giveaway</h1>
          <p>
            Choisissez le cadeau qui vous intéresse, laissez votre numéro, puis suivez l'état
            de votre demande. Aucune connexion, aucun mot de passe, aucun paiement.
          </p>
          <div className="heroActions">
            <Link href="/signup" className="heroButton">Participer</Link>
            <Link href="/status" className="ghostButton">Suivre ma demande</Link>
          </div>
          <div className="trustBar">
            <span>Pas de mot de passe</span>
            <span>Pas de code SMS</span>
            <span>Pas de carte bancaire</span>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function Header() {
  return (
    <header className="siteHeader">
      <Link className="brand" href="/">Epstein Giveaway</Link>
      <nav>
        <Link className="active" href="/">Accueil</Link>
        <Link href="/status">Suivi</Link>
        <Link href="/rules">Règlement</Link>
        <Link href="/privacy">Confidentialité</Link>
        <Link href="/contact">Contact</Link>
      </nav>
      <div className="headerActions">
        <Link className="registerLink" href="/signup">Participer</Link>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="siteFooter">
      <div className="footerGrid">
        <div>
          <h3>Produit</h3>
          <Link href="/signup">Participer</Link>
          <Link href="/signup">Cadeaux</Link>
          <Link href="/status">Suivi</Link>
        </div>
        <div>
          <h3>Ressources</h3>
          <Link href="/rules">Règlement</Link>
          <Link href="/privacy">Confidentialité</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/status">Suivi</Link>
        </div>
        <div>
          <h3>Mentions légales</h3>
          <Link href="/privacy">Politique de confidentialité</Link>
          <Link href="/rules">Conditions de participation</Link>
          <Link href="/rules">Règlement du concours</Link>
        </div>
        <div>
          <h3>Contact</h3>
          <Link href="/contact">Nous contacter</Link>
          <Link href="/signup">S'inscrire</Link>
        </div>
      </div>

      <div className="footerBottom">
        <span>© Epstein Giveaway 2026. Tous droits réservés.</span>
        <div>
          <Link href="/privacy">Politique de confidentialité</Link>
          <span>·</span>
          <Link href="/rules">Conditions d'utilisation</Link>
          <span>·</span>
          <Link href="/contact">Contact</Link>
        </div>
      </div>
    </footer>
  );
}
