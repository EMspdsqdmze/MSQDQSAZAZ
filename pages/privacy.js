import Link from "next/link";

export default function Privacy() {
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
        <h1>Politique de confidentialité</h1>
        <p>
          Les données collectées servent uniquement à gérer la participation, éviter les doublons,
          lutter contre le spam et permettre la validation manuelle du concours.
        </p>
        <h2>Données traitées</h2>
        <p>
          Le cadeau choisi, le pseudo de jeu si nécessaire, le numéro de téléphone, la date
          d'inscription, l'adresse IP publique utilisée lors de l'inscription, le statut de
          validation et des journaux techniques limités.
        </p>
        <h2>Protection du téléphone</h2>
        <p>
          Le numéro complet et l'adresse IP sont chiffrés côté serveur. Une empreinte HMAC sert
          à bloquer les doublons sans exposer le numéro. Les données complètes sont réservées à
          l'interface administrateur authentifiée.
        </p>
        <h2>Durée de conservation</h2>
        <p>
          Les données doivent être supprimées lorsqu'elles ne sont plus nécessaires au concours.
          En production, définissez une durée explicite, par exemple 90 jours après la fin du
          tirage, sauf obligation légale contraire.
        </p>
        <h2>Droits RGPD</h2>
        <p>
          Les participants peuvent demander l'accès, la rectification ou la suppression de leurs
          données via la page contact.
        </p>
      </section>
    </main>
  );
}
