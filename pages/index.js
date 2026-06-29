import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { GIFTS } from "../lib/gifts";

const GIFT_ALIASES = {
  "snap-plus": ["snap", "snapchat", "snap plus", "snap+"],
  robux: ["roblox", "robux"],
  vbucks: ["vbucks", "v-bucks", "fortnite"],
  "psn-card": ["psn", "playstation", "carte psn"],
  "xbox-card": ["xbox", "carte xbox"],
  "brawl-pass": ["brawl pass"],
  "brawl-pass-plus": ["brawl pass plus"],
  "brawl-pass-pro": ["brawl pass pro"]
};

function normalizeSearch(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9+ -]/g, "")
    .trim();
}

function findGiftFromSearch(value) {
  const query = normalizeSearch(value);

  if (!query) {
    return null;
  }

  return GIFTS.find((gift) => {
    const label = normalizeSearch(gift.label);
    const aliases = GIFT_ALIASES[gift.id] || [];
    return label.includes(query) || aliases.some((alias) => normalizeSearch(alias).includes(query) || query.includes(normalizeSearch(alias)));
  });
}

function getGiftMatches(value) {
  const query = normalizeSearch(value);

  if (!query) {
    return [];
  }

  return GIFTS.filter((gift) => {
    const label = normalizeSearch(gift.label);
    const aliases = GIFT_ALIASES[gift.id] || [];
    return label.includes(query) || aliases.some((alias) => normalizeSearch(alias).includes(query) || query.includes(normalizeSearch(alias)));
  });
}

export default function Home() {
  const router = useRouter();
  const [giftSearch, setGiftSearch] = useState("");
  const [searchError, setSearchError] = useState("");
  const giftMatches = getGiftMatches(giftSearch);
  const hasSearch = giftSearch.trim().length > 0;

  function submitGiftSearch(event) {
    event.preventDefault();
    const gift = findGiftFromSearch(giftSearch);

    if (!giftSearch.trim()) {
      router.push("/signup");
      return;
    }

    if (!gift) {
      setSearchError("Cadeau introuvable. Essayez Snap Plus, Robux ou V-Bucks.");
      return;
    }

    setSearchError("");
    router.push(`/signup?gift=${encodeURIComponent(gift.id)}`);
  }

  return (
    <main>
      <Header />

      <section className="hero homeHero">
        <div className="heroCopy">
          <span className="eyebrow">Giveaway monitor</span>
          <h1>Choisis ton cadeau. Suis ta demande.</h1>
          <p>
            Une inscription simple, une vérification manuelle, et un suivi clair. Aucun mot de
            passe, aucun code SMS, aucun paiement.
          </p>
          <div className="heroActions">
            <Link href="/signup" className="heroButton">Participer</Link>
            <Link href="/status" className="ghostButton">Suivre ma demande</Link>
          </div>
          <div className="heroSearchCard">
            <form className="mockSearch" onSubmit={submitGiftSearch}>
              <span className="mockIcon">⌕</span>
              <input
                type="search"
                list="giftSuggestions"
                value={giftSearch}
                onChange={(event) => {
                  setGiftSearch(event.target.value);
                  setSearchError("");
                }}
                placeholder="e.g. Snap Plus, Robux, V-Bucks"
                aria-label="Rechercher un cadeau"
              />
              <datalist id="giftSuggestions">
                {GIFTS.map((gift) => (
                  <option key={gift.id} value={gift.label} />
                ))}
              </datalist>
              <button type="submit">Choisir</button>
            </form>
            {hasSearch && (
              <div className="giftSearchResults" role="listbox" aria-label="Résultats de recherche">
                {giftMatches.length > 0 ? (
                  giftMatches.map((gift) => (
                    <button
                      key={gift.id}
                      type="button"
                      onClick={() => router.push(`/signup?gift=${encodeURIComponent(gift.id)}`)}
                    >
                      <strong>{gift.label}</strong>
                      <span>{gift.needsGamePseudo ? "Pseudo requis" : "Pseudo non requis"}</span>
                    </button>
                  ))
                ) : (
                  <p>Aucun cadeau trouvé.</p>
                )}
              </div>
            )}
            {searchError && <p className="mockHint">{searchError}</p>}
            <div className="mockModes">
              <Link href="/signup">Validation manuelle</Link>
              <Link className="active" href="/status">Suivi en temps réel</Link>
              <Link href="/rules">Tirage</Link>
            </div>
            <div className="trustBar">
              <Link href="/signup">8 cadeaux</Link>
              <Link href="/privacy">Numéro masqué</Link>
              <Link href="/rules">Sans paiement</Link>
            </div>
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
