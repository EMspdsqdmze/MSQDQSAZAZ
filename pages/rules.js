import Link from "next/link";

export default function Rules() {
  return (
    <main>
      <SimpleHeader />
      <section className="legalPage">
        <h1>Règlement du concours</h1>
        <p>
          Ce concours permet de participer à un tirage au sort pour tenter de recevoir un cadeau
          numérique parmi Snap Plus, Robux, V-Bucks, cartes PSN, cartes Xbox et Brawl Pass.
        </p>
        <h2>Participation</h2>
        <p>
          Une seule inscription est autorisée par numéro de téléphone. Toute tentative de doublon,
          fraude, automatisation ou information manifestement fausse peut entraîner un refus.
        </p>
        <h2>Dotations</h2>
        <p>
          Les cadeaux sont soumis à disponibilité et à tirage au sort. Une inscription validée ne
          constitue jamais une garantie de gain.
        </p>
        <h2>Informations interdites</h2>
        <p>
          Le site ne demande jamais de mot de passe, code SMS, code de vérification, information
          bancaire ou email sensible. Toute demande de ce type doit être considérée comme suspecte.
        </p>
        <h2>Validation</h2>
        <p>
          Les inscriptions sont examinées manuellement par l'administrateur, qui peut confirmer ou
          refuser une inscription avant le tirage.
        </p>
      </section>
    </main>
  );
}

function SimpleHeader() {
  return (
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
  );
}
