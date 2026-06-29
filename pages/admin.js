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
  pending: "En attente",
  validated: "Validée",
  rejected: "Refusée"
};

const CODE_STATUS_LABELS = {
  pending: "Code en attente",
  confirmed: "Code confirmé",
  rejected: "Code refusé"
};

export default function Admin() {
  const [token, setToken] = useState("");
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [codeBusyId, setCodeBusyId] = useState("");
  const [deleteBusyId, setDeleteBusyId] = useState("");
  const [operatorBusyId, setOperatorBusyId] = useState("");
  const [lookupCountry, setLookupCountry] = useState("FR");
  const [lookupPhone, setLookupPhone] = useState("");
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [inquerelyPhone, setInquerelyPhone] = useState("");
  const [inquerelyCountry, setInquerelyCountry] = useState("FR");
  const [inquerelyResult, setInquerelyResult] = useState(null);
  const [inquerelyBusy, setInquerelyBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const selectedLookupCountry = findPhoneCountry(lookupCountry);
  const selectedInquerelyCountry = findPhoneCountry(inquerelyCountry);

  async function loadEntries(event) {
    event?.preventDefault();
    setError("");
    setRefreshing(true);

    let response;
    let data;

    try {
      response = await fetch("/api/admin/participations", {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      setRefreshing(false);
      setError("Impossible de contacter l'API admin.");
      return;
    }

    try {
      data = await response.json();
    } catch {
      const text = await response.text();
      setRefreshing(false);
      setError(
        `Erreur API admin ${response.status}: ${text || response.statusText}`
      );
      return;
    }

    setRefreshing(false);

    if (!response.ok) {
      setError(data.error || `Accès refusé (${response.status}).`);
      return;
    }

    setAuthenticated(true);
    setEntries(data.participations);
  }

  useEffect(() => {
    if (!authenticated) {
      return undefined;
    }

    const interval = setInterval(() => {
      loadEntries();
    }, 5000);

    return () => clearInterval(interval);
  }, [authenticated]);

  async function reviewEntry(id, nextStatus) {
    setError("");
    setBusyId(id);
    const reason = nextStatus === "rejected"
      ? window.prompt("Raison du refus visible par le participant:", "")
      : "";

    if (nextStatus === "rejected" && reason === null) {
      setBusyId("");
      return;
    }

    let response;
    let data;

    try {
      response = await fetch(`/api/admin/participations/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: nextStatus, reason })
      });
    } catch (error) {
      setBusyId("");
      setError("Impossible de contacter l'API admin.");
      return;
    }

    try {
      data = await response.json();
    } catch {
      setBusyId("");
      setError("Réponse invalide de l'API admin.");
      return;
    }

    setBusyId("");

    if (!response.ok) {
      setError(data.error || "Action impossible.");
      return;
    }

    setEntries((current) =>
      current.map((entry) =>
        entry.id === id
          ? { ...entry, ...data.participation, phone: entry.phone }
          : entry
      )
    );
  }

  async function reviewCode(id, codeStatus) {
    setError("");
    setCodeBusyId(id);

    let response;
    let data;

    try {
      response = await fetch(`/api/admin/participations/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ codeStatus })
      });
    } catch (error) {
      setCodeBusyId("");
      setError("Impossible de contacter l'API admin.");
      return;
    }

    try {
      data = await response.json();
    } catch {
      setCodeBusyId("");
      setError("Réponse invalide de l'API admin.");
      return;
    }

    setCodeBusyId("");

    if (!response.ok) {
      setError(data.error || "Action impossible sur le code.");
      return;
    }

    setEntries((current) =>
      current.map((entry) =>
        entry.id === id
          ? { ...entry, ...data.participation, phone: entry.phone }
          : entry
      )
    );
  }

  async function verifyOperator(id) {
    setError("");
    setOperatorBusyId(id);

    let response;
    let data;

    try {
      response = await fetch(`/api/admin/participations/${id}/operator`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      setOperatorBusyId("");
      setError("Impossible de contacter l'API admin.");
      return;
    }

    try {
      data = await response.json();
    } catch {
      setOperatorBusyId("");
      setError("Réponse invalide de l'API admin.");
      return;
    }

    setOperatorBusyId("");

    if (!response.ok) {
      setError(data.error || "Vérification opérateur impossible.");
      return;
    }

    setEntries((current) =>
      current.map((entry) =>
        entry.id === id
          ? { ...entry, operatorVerification: data.verification }
          : entry
      )
    );
  }

  async function lookupNumber(event) {
    event.preventDefault();
    setError("");
    setLookupResult(null);

    if (!validatePhoneForCountry(lookupCountry, lookupPhone)) {
      setError(phoneLengthMessage(lookupCountry));
      return;
    }

    setLookupBusy(true);

    let response;
    let data;

    try {
      response = await fetch("/api/admin/phone-lookup", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ phone: buildPhoneWithCountry(lookupCountry, lookupPhone) })
      });
    } catch (error) {
      setLookupBusy(false);
      setError("Impossible de contacter l'API admin.");
      return;
    }

    try {
      data = await response.json();
    } catch {
      setLookupBusy(false);
      setError("Réponse invalide de l'API admin.");
      return;
    }

    setLookupBusy(false);

    if (!response.ok) {
      setError(data.error || "Lookup du numéro impossible.");
      return;
    }

    setLookupResult(data.verification);
  }

  async function lookupInquerely(event) {
    event.preventDefault();
    setError("");
    setInquerelyResult(null);

    if (!validatePhoneForCountry(inquerelyCountry, inquerelyPhone)) {
      setError(phoneLengthMessage(inquerelyCountry));
      return;
    }

    setInquerelyBusy(true);

    let response;
    let data;

    try {
      response = await fetch("/api/admin/inquerely-lookup", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ phone: buildPhoneWithCountry(inquerelyCountry, inquerelyPhone) })
      });
    } catch (error) {
      setInquerelyBusy(false);
      setError("Impossible de contacter l'API admin.");
      return;
    }

    try {
      data = await response.json();
    } catch {
      setInquerelyBusy(false);
      setError("Réponse invalide de l'API admin.");
      return;
    }

    setInquerelyBusy(false);

    if (!response.ok) {
      setError(data.error || "Lookup Inquerely impossible.");
      return;
    }

    setInquerelyResult(data.lookup);
  }

  async function deleteEntry(id) {
    const confirmed = window.confirm("Supprimer cette inscription du panel admin ?");

    if (!confirmed) {
      return;
    }

    setError("");
    setDeleteBusyId(id);

    const response = await fetch(`/api/admin/participations/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    setDeleteBusyId("");

    if (!response.ok) {
      setError(data.error || "Suppression impossible.");
      return;
    }

    setEntries((current) => current.filter((entry) => entry.id !== id));
  }

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

      <section className={`adminPage ${authenticated ? "adminPageFullscreen" : ""}`}>
        {!authenticated && (
          <form className="adminLogin adminLoginCard" onSubmit={loadEntries}>
            <div className="adminLoginHeader">
              <h1>Welcome Back</h1>
              <p>Sign in with your admin key.</p>
            </div>

            <div>
              <label htmlFor="adminToken">Admin Key</label>
              <input
                id="adminToken"
                type="password"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="Admin key"
              />
              <Link className="forgotLink" href="/contact">Forgot key?</Link>
            </div>

            <button className="primaryButton" type="submit">Sign In</button>
            {error && <p className="formStatus error">{error}</p>}
          </form>
        )}

        {authenticated && error && <p className="formStatus error">{error}</p>}

        {authenticated && (
          <>
            <div className="adminToolbar">
              <span>{entries.length} inscription{entries.length > 1 ? "s" : ""}</span>
              <button
                type="button"
                className="refreshButton"
                disabled={refreshing}
                onClick={() => loadEntries()}
              >
                {refreshing ? "Actualisation..." : "Actualiser"}
              </button>
            </div>

            <div className="tableWrap">
              <table>
              <thead>
                <tr>
                  <th>Cadeau</th>
                  <th>Pseudo</th>
                  <th>Discord</th>
                  <th>Téléphone</th>
                  <th>IP publique</th>
                  <th>Statut</th>
                  <th>Raison</th>
                  <th>Opérateur</th>
                  <th>Code</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.giftLabel}</td>
                    <td>{entry.gamePseudo || "-"}</td>
                    <td>{entry.discordPseudo || "-"}</td>
                    <td>
                      <span className="phoneValue">{entry.phone || entry.maskedPhone}</span>
                    </td>
                    <td>
                      <span className="phoneValue">{entry.publicIp || "Non disponible"}</span>
                    </td>
                    <td><span className={`badge ${entry.status}`}>{STATUS_LABELS[entry.status]}</span></td>
                    <td>{entry.reviewReason || "-"}</td>
                    <td>
                      {entry.operatorVerification ? (
                        <div className="operatorResult">
                          <strong>{entry.operatorVerification.carrier}</strong>
                          <span>
                            {entry.operatorVerification.countryName || "Pays inconnu"}
                            {entry.operatorVerification.lineType ? ` · ${entry.operatorVerification.lineType}` : ""}
                          </span>
                          <span>{entry.operatorVerification.valid ? "Numéro valide" : "Numéro invalide"}</span>
                        </div>
                      ) : (
                        <span className="mutedCell">Non vérifié</span>
                      )}
                    </td>
                    <td>
                      {entry.participantEnteredCode && (
                        <div className="codeConfirmed">
                          <span>Saisi: {entry.participantEnteredCode}</span>
                          <span>{CODE_STATUS_LABELS[entry.participantCodeStatus] || "Code en attente"}</span>
                          {entry.participantCodeConfirmedAt && (
                            <small>{new Date(entry.participantCodeConfirmedAt).toLocaleString("fr-FR")}</small>
                          )}
                        </div>
                      )}
                      {!entry.participantEnteredCode && (
                        <span className="mutedCell">En attente</span>
                      )}
                    </td>
                    <td>{new Date(entry.createdAt).toLocaleString("fr-FR")}</td>
                    <td>
                      <div className="adminActions">
                        <button
                          type="button"
                          className="approveButton"
                          disabled={busyId === entry.id || entry.status === "validated"}
                          onClick={() => reviewEntry(entry.id, "validated")}
                        >
                          Valider
                        </button>
                        <button
                          type="button"
                          className="rejectButton"
                          disabled={busyId === entry.id || entry.status === "rejected"}
                          onClick={() => reviewEntry(entry.id, "rejected")}
                        >
                          Refuser
                        </button>
                        <button
                          type="button"
                          className="deleteButton"
                          disabled={deleteBusyId === entry.id}
                          onClick={() => deleteEntry(entry.id)}
                        >
                          {deleteBusyId === entry.id ? "Suppression..." : "Supprimer"}
                        </button>
                        <button
                          type="button"
                          className="operatorButton"
                          disabled={operatorBusyId === entry.id}
                          onClick={() => verifyOperator(entry.id)}
                        >
                          {operatorBusyId === entry.id ? "Lookup..." : "Lookup"}
                        </button>
                        {entry.participantEnteredCode && (
                          <>
                            <button
                              type="button"
                              className="approveButton"
                              disabled={codeBusyId === entry.id || entry.participantCodeStatus === "confirmed"}
                              onClick={() => reviewCode(entry.id, "confirmed")}
                            >
                              Confirmer code
                            </button>
                            <button
                              type="button"
                              className="rejectButton"
                              disabled={codeBusyId === entry.id || entry.participantCodeStatus === "rejected"}
                              onClick={() => reviewCode(entry.id, "rejected")}
                            >
                              Refuser code
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr>
                    <td colSpan="11">Aucune inscription chargée.</td>
                  </tr>
                )}
              </tbody>
              </table>
            </div>

            <form className="lookupPanel" onSubmit={lookupNumber}>
              <div>
                <label htmlFor="lookupPhone">Lookup numéro</label>
                <div className="phoneField lookupPhoneField">
                  <select
                    id="lookupCountry"
                    className="countrySelect"
                    value={lookupCountry}
                    onChange={(event) => setLookupCountry(event.target.value)}
                    aria-label="Pays du numéro"
                  >
                    {PHONE_COUNTRIES.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.label} {country.dialCode}
                      </option>
                    ))}
                  </select>
                  <input
                    id="lookupPhone"
                    type="tel"
                    inputMode="tel"
                    placeholder={selectedLookupCountry.placeholder}
                    maxLength="18"
                    value={lookupPhone}
                    onChange={(event) => setLookupPhone(limitPhoneInputForCountry(lookupCountry, event.target.value))}
                    required
                  />
                </div>
                <p className="fieldHint">{phoneLengthMessage(lookupCountry)}</p>
                {hasLeadingLocalZero(lookupCountry, lookupPhone) && (
                  <p className="fieldHint warningHint">
                    0 initial détecté: il sera retiré automatiquement avant le lookup.
                  </p>
                )}
              </div>
              <button className="refreshButton" type="submit" disabled={lookupBusy}>
                {lookupBusy ? "Recherche..." : "Lookup"}
              </button>
              {lookupResult && (
                <div className="lookupResult">
                  <strong>{lookupResult.carrier}</strong>
                  <span>{lookupResult.number || lookupPhone}</span>
                  <span>
                    {lookupResult.valid ? "Numéro valide" : "Numéro invalide"}
                    {lookupResult.countryName ? ` · ${lookupResult.countryName}` : ""}
                    {lookupResult.lineType ? ` · ${lookupResult.lineType}` : ""}
                  </span>
                  {lookupResult.location && <span>{lookupResult.location}</span>}
                </div>
              )}
            </form>

            <form className="lookupPanel" onSubmit={lookupInquerely}>
              <div>
                <label htmlFor="inquerelyPhone">Lookup Inquerely</label>
                <div className="phoneField lookupPhoneField">
                  <select
                    id="inquerelyCountry"
                    className="countrySelect"
                    value={inquerelyCountry}
                    onChange={(event) => setInquerelyCountry(event.target.value)}
                    aria-label="Pays du numéro Inquerely"
                  >
                    {PHONE_COUNTRIES.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.label} {country.dialCode}
                      </option>
                    ))}
                  </select>
                  <input
                    id="inquerelyPhone"
                    type="tel"
                    inputMode="tel"
                    placeholder={selectedInquerelyCountry.placeholder}
                    maxLength="18"
                    value={inquerelyPhone}
                    onChange={(event) => setInquerelyPhone(limitPhoneInputForCountry(inquerelyCountry, event.target.value))}
                    required
                  />
                </div>
                <p className="fieldHint">{phoneLengthMessage(inquerelyCountry)}</p>
                {hasLeadingLocalZero(inquerelyCountry, inquerelyPhone) && (
                  <p className="fieldHint warningHint">
                    0 initial détecté: il sera retiré automatiquement avant le lookup.
                  </p>
                )}
              </div>
              <button className="refreshButton" type="submit" disabled={inquerelyBusy}>
                {inquerelyBusy ? "Recherche..." : "Inquerely"}
              </button>
              {inquerelyResult && (
                <div className="lookupResult">
                  <strong>{inquerelyResult.breachCount} base{inquerelyResult.breachCount > 1 ? "s" : ""} trouvée{inquerelyResult.breachCount > 1 ? "s" : ""}</strong>
                  <span>{inquerelyResult.number || inquerelyPhone}</span>
                  <span>
                    {inquerelyResult.entriesCount} entrée{inquerelyResult.entriesCount > 1 ? "s" : ""} OSINT
                    {inquerelyResult.durationMs ? ` · ${inquerelyResult.durationMs} ms` : ""}
                  </span>
                  {inquerelyResult.databases?.length > 0 && (
                    <span>{inquerelyResult.databases.join(" · ")}</span>
                  )}
                  {inquerelyResult.breaches?.length > 0 && (
                    <div className="inquerelyResults">
                      {inquerelyResult.breaches.map((breach, breachIndex) => (
                        <div className="inquerelyBreach" key={`${breach.database}-${breachIndex}`}>
                          <strong>{breach.database}</strong>
                          {breach.description && <span>{breach.description}</span>}
                          {breach.entries.map((entry, entryIndex) => (
                            <dl key={entryIndex}>
                              {entry.map((field) => (
                                <div key={`${entryIndex}-${field.key}`}>
                                  <dt>{field.key}</dt>
                                  <dd>{field.value}</dd>
                                </div>
                              ))}
                            </dl>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                  {inquerelyResult.quota && (
                    <span>
                      Quota: {inquerelyResult.quota.remaining}/{inquerelyResult.quota.limit} restant
                    </span>
                  )}
                </div>
              )}
            </form>
          </>
        )}
      </section>
    </main>
  );
}
