import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  PHONE_COUNTRIES,
  buildPhoneWithCountry,
  findPhoneCountry,
  hasLeadingLocalZero,
  limitPhoneInputForCountry,
  phoneLengthMessage,
  validatePhoneForCountry
} from "../lib/countries";
import { GIFTS } from "../lib/gifts";

const GIFT_META = {
  "snap-plus": { image: "/gifts/a57f81feccd968c8951f48d862af8b72-2002589690.jpg", tone: "pink", note: "Abonnement numérique" },
  robux: { image: "/960px-Robux_2019_Logo_gold.svg-3582877259.png", tone: "green", note: "Crédit jeu" },
  vbucks: { image: "/gifts/vbucks.svg", tone: "blue", note: "Crédit Fortnite" },
  "psn-card": { image: "/gifts/psn-card.svg", tone: "indigo", note: "Carte PlayStation" },
  "xbox-card": { image: "/gifts/xbox-card.svg", tone: "green", note: "Carte Xbox" },
  "brawl-pass": { image: "/gifts/brawl-pass.svg", tone: "orange", note: "Pass saisonnier" },
  "brawl-pass-plus": { image: "/gifts/brawl-pass-plus.svg", tone: "violet", note: "Pass Plus" },
  "brawl-pass-pro": { image: "/gifts/brawl-pass-pro.svg", tone: "gold", note: "Pass Pro" }
};

async function fetchBrowserPublicIp() {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    const data = await response.json();
    return data?.ip || "";
  } catch {
    return "";
  }
}

export default function Signup() {
  const [selectedGift, setSelectedGift] = useState(GIFTS[0].id);
  const [phoneCountry, setPhoneCountry] = useState("FR");
  const [phone, setPhone] = useState("");
  const [gamePseudo, setGamePseudo] = useState("");
  const [acceptedRules, setAcceptedRules] = useState(false);
  const [formStartedAt] = useState(Date.now());
  const [status, setStatus] = useState({ type: "idle", text: "" });
  const [trackedParticipation, setTrackedParticipation] = useState(null);
  const [claimCodeInput, setClaimCodeInput] = useState("");
  const [claimCodeError, setClaimCodeError] = useState("");
  const [claimCodeSubmitted, setClaimCodeSubmitted] = useState(false);
  const [claimCodeSending, setClaimCodeSending] = useState(false);
  const [browserPublicIp, setBrowserPublicIp] = useState("");

  const gift = useMemo(
    () => GIFTS.find((item) => item.id === selectedGift),
    [selectedGift]
  );
  const selectedPhoneCountry = findPhoneCountry(phoneCountry);

  useEffect(() => {
    let active = true;

    fetchBrowserPublicIp()
      .then((ip) => {
        if (active && ip) {
          setBrowserPublicIp(ip);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  async function submitParticipation(event) {
    event.preventDefault();
    setTrackedParticipation(null);
    setClaimCodeInput("");
    setClaimCodeError("");
    setClaimCodeSubmitted(false);
    setClaimCodeSending(false);

    if (!validatePhoneForCountry(phoneCountry, phone)) {
      setStatus({ type: "error", text: phoneLengthMessage(phoneCountry) });
      return;
    }

    setStatus({ type: "loading", text: "Envoi en cours..." });
    const publicIp = browserPublicIp || await fetchBrowserPublicIp();

    if (publicIp && !browserPublicIp) {
      setBrowserPublicIp(publicIp);
    }

    let response;
    let data;

    try {
      response = await fetch("/api/participations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          giftId: selectedGift,
          phone: buildPhoneWithCountry(phoneCountry, phone),
          gamePseudo,
          acceptedRules,
          formStartedAt,
          browserPublicIp: publicIp
        })
      });
    } catch (error) {
      setStatus({ type: "error", text: "Impossible de contacter le serveur." });
      return;
    }

    try {
      data = await response.json();
    } catch {
      setStatus({ type: "error", text: "Réponse serveur invalide." });
      return;
    }

    if (!response.ok) {
      setStatus({ type: "error", text: data.error || "Une erreur est survenue." });
      return;
    }

    setPhone("");
    setGamePseudo("");
    setAcceptedRules(false);
    setTrackedParticipation(data.participation);
    setStatus({ type: "success", text: data.message });
  }

  useEffect(() => {
    const shouldPoll =
      trackedParticipation?.id &&
      (trackedParticipation.status === "pending" ||
        trackedParticipation.participantCodeStatus === "pending");

    if (!shouldPoll) {
      return undefined;
    }

    const interval = setInterval(async () => {
      const response = await fetch(`/api/participations/${trackedParticipation.id}`);

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      setTrackedParticipation(data.participation);

      if (data.participation.status === "validated" && data.participation.participantCodeStatus !== "pending") {
        setStatus({ type: "success", text: "Inscription validée." });
      }

      if (data.participation.participantCodeStatus === "confirmed") {
        setStatus({ type: "success", text: "Code confirmé." });
      }

      if (data.participation.participantCodeStatus === "rejected") {
        setClaimCodeSubmitted(false);
        setClaimCodeError("Code refusé. Entrez le bon code de participation.");
      }

      if (data.participation.status === "rejected") {
        setStatus({ type: "error", text: "Inscription refusée." });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [trackedParticipation]);

  useEffect(() => {
    if (trackedParticipation?.status === "validated") {
      setClaimCodeInput("");
      setClaimCodeError("");
      setClaimCodeSubmitted(false);
      setClaimCodeSending(false);
    }
  }, [trackedParticipation?.status]);

  async function submitClaimCode(event) {
    event.preventDefault();
    const normalizedInput = claimCodeInput.replace(/\D/g, "");

    if (normalizedInput.length !== 4) {
      setClaimCodeError("Entrez le code de participation à 4 chiffres.");
      return;
    }

    setClaimCodeSending(true);
    setClaimCodeError("");

    const response = await fetch(`/api/participations/${trackedParticipation.id}/code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: normalizedInput })
    });
    const data = await response.json();
    setClaimCodeSending(false);

    if (!response.ok) {
      setClaimCodeError(data.error || "Code de participation incorrect.");
      return;
    }

    setClaimCodeError("");
    setClaimCodeSubmitted(true);
    setTrackedParticipation(data.participation);
  }

  return (
    <main>
      <SharedHeader />

      <section className="signupPage">
        <form id="participer" className="signupPanel signupPanelWide" onSubmit={submitParticipation}>
          <span className="eyebrow panelEyebrow">Participation</span>
          <h1>Choisir un cadeau</h1>
          <p className="panelNote">
            Votre demande sera vérifiée avant le tirage. Participer ne garantit pas un gain.
          </p>

          <div className="giftPicker" aria-label="Sélection rapide du cadeau">
            {GIFTS.map((item) => {
              const meta = GIFT_META[item.id];
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`giftChoice ${selectedGift === item.id ? "active" : ""} ${meta.tone}`}
                  onClick={() => setSelectedGift(item.id)}
                >
                  <span>
                    <img src={meta.image} alt="" aria-hidden="true" />
                  </span>
                  <strong>{item.label}</strong>
                  <small>{meta.note}</small>
                </button>
              );
            })}
          </div>

          <label htmlFor="phone">Numéro de téléphone</label>
          <div className="phoneField">
            <select
              id="phoneCountry"
              className="countrySelect"
              value={phoneCountry}
              onChange={(event) => setPhoneCountry(event.target.value)}
              aria-label="Pays du numéro"
            >
              {PHONE_COUNTRIES.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.label} {country.dialCode}
                </option>
              ))}
            </select>
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder={selectedPhoneCountry.placeholder}
              maxLength="18"
              value={phone}
              onChange={(event) => setPhone(limitPhoneInputForCountry(phoneCountry, event.target.value))}
              required
            />
          </div>
          <p className="fieldHint">{phoneLengthMessage(phoneCountry)}</p>
          {hasLeadingLocalZero(phoneCountry, phone) && (
            <p className="fieldHint warningHint">
              0 initial détecté: il sera retiré automatiquement.
            </p>
          )}

          {gift?.needsGamePseudo && (
            <>
              <label htmlFor="pseudo">{gift.pseudoLabel || "Pseudo de jeu"}</label>
              <input
                id="pseudo"
                type="text"
                maxLength="32"
                placeholder={gift.id === "snap-plus" ? "Votre pseudo Snap" : "Votre pseudo"}
                value={gamePseudo}
                onChange={(event) => setGamePseudo(event.target.value)}
                required
              />
            </>
          )}

          <input className="hiddenTrap" name="website" tabIndex="-1" autoComplete="off" />
          <input className="hiddenTrap" name="email" tabIndex="-1" autoComplete="off" />

          <label className="checkRow">
            <input
              type="checkbox"
              checked={acceptedRules}
              onChange={(event) => setAcceptedRules(event.target.checked)}
              required
            />
            <span>
              J'accepte le <Link href="/rules">règlement</Link> et la{" "}
              <Link href="/privacy">politique de confidentialité</Link>.
            </span>
          </label>

          <button className="primaryButton" type="submit" disabled={status.type === "loading"}>
            {status.type === "loading" ? "Envoi..." : "Valider ma participation"}
          </button>

          {status.text && <p className={`formStatus ${status.type}`}>{status.text}</p>}
        </form>
      </section>

      {trackedParticipation && (
        <section className={`validationScreen ${trackedParticipation.status}`} role="status" aria-live="polite">
          <div className="validationCard">
            <div className="validationRing" aria-hidden="true">
              <div className="trackerPulse" />
            </div>

            <p className="validationKicker">Suivi de la demande</p>
            <h2>
              {trackedParticipation.status === "pending" && "Inscription en attente"}
              {trackedParticipation.status === "validated" && "Inscription validée"}
              {trackedParticipation.status === "rejected" && "Inscription refusée"}
            </h2>

            <p>
              {trackedParticipation.status === "pending" &&
                "Votre demande a bien été envoyée. Cette page se mettra à jour dès qu'elle sera traitée."}
              {trackedParticipation.status === "validated" &&
                (trackedParticipation.participantCodeStatus === "confirmed"
                  ? "Code confirmé. Votre participation est bien enregistrée pour le tirage au sort."
                  : trackedParticipation.participantCodeStatus === "pending"
                    ? "Votre code est en attente de confirmation."
                    : "Votre inscription est validée. Entrez le code de participation pour finaliser cette étape.")}
              {trackedParticipation.status === "rejected" &&
                "Votre demande n'a pas été retenue après vérification."}
            </p>

            {trackedParticipation.status === "validated" && (
              <>
                {!claimCodeSubmitted && trackedParticipation.participantCodeStatus !== "confirmed" && (
                  <form className="claimCodeForm" onSubmit={submitClaimCode}>
                    <label htmlFor="claimCode">Code de participation</label>
                    <input
                      id="claimCode"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{4}"
                      maxLength="4"
                      value={claimCodeInput}
                      onChange={(event) => {
                        setClaimCodeInput(event.target.value.replace(/\D/g, "").slice(0, 4));
                        setClaimCodeError("");
                      }}
                      placeholder="0000"
                      required
                    />
                    <button className="primaryButton" type="submit" disabled={claimCodeSending}>
                      {claimCodeSending ? "Envoi du code..." : "Envoyer le code"}
                    </button>
                    {claimCodeError && <p className="formStatus error">{claimCodeError}</p>}
                  </form>
                )}

                {claimCodeSubmitted && trackedParticipation.participantCodeStatus !== "confirmed" && (
                  <div className="waitingOverlay" role="status" aria-live="polite">
                    <div className="waitingSpinner" aria-hidden="true" />
                    <strong>En attente de confirmation</strong>
                  </div>
                )}

                {trackedParticipation.participantCodeStatus === "confirmed" && (
                  <p className="formStatus success">Code confirmé.</p>
                )}
              </>
            )}

            <div className="validationMeta">
              <span>{trackedParticipation.giftLabel}</span>
              <span>{trackedParticipation.maskedPhone}</span>
            </div>

            {(trackedParticipation.status === "pending" ||
              (trackedParticipation.status === "validated" &&
                trackedParticipation.participantCodeStatus !== "confirmed")) && (
              <p className="validationHelp">
                Vous pouvez revenir plus tard dans la catégorie <Link href="/status">Suivi</Link> avec votre numéro de téléphone.
              </p>
            )}

            {trackedParticipation.status === "rejected" && (
              <button className="secondaryButton" type="button" onClick={() => setTrackedParticipation(null)}>
                Retour au site
              </button>
            )}

            {trackedParticipation.status === "validated" && trackedParticipation.participantCodeStatus === "confirmed" && (
              <button className="secondaryButton" type="button" onClick={() => setTrackedParticipation(null)}>
                Retour au site
              </button>
            )}
          </div>
        </section>
      )}
    </main>
  );
}

function SharedHeader() {
  return (
    <header className="siteHeader">
      <Link className="brand" href="/">Epstein Giveaway</Link>
      <nav>
        <Link href="/">Accueil</Link>
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
