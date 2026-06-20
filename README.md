# Epstein Giveaway - site de concours transparent

Application Next.js pour gérer un concours/giveaway légal et explicite, avec inscription publique, validation manuelle via Telegram, stockage serveur et interface admin.

## Architecture

- `pages/index.js` : formulaire public de participation.
- `pages/rules.js` : règlement du concours.
- `pages/privacy.js` : politique de confidentialité.
- `pages/contact.js` : contact et demandes RGPD.
- `pages/status.js` : suivi public d'une demande par numéro de téléphone et envoi tardif du code.
- `pages/admin.js` : interface admin avec jeton.
- `pages/api/participations.js` : création d'inscription, validation, anti-spam, chiffrement.
- `pages/api/participations/status.js` : consultation du statut via empreinte HMAC du téléphone.
- `pages/api/admin/participations.js` : liste admin après authentification.
- `pages/api/telegram/webhook.js` : confirmation/refus des inscriptions et codes depuis Telegram.
- `lib/db.js` : base JSON persistante et journal d'audit.
- `lib/security.js` : normalisation, HMAC, chiffrement AES-256-GCM, masquage.
- `lib/telegram.js` : notification Telegram avec boutons.
- `data/participations.json` : base de données créée automatiquement au premier usage.
- `data/audit.log` : journalisation des créations, validations et refus.

## Installation

```bash
npm install
cp .env.example .env.local
```

Générez des secrets:

```bash
openssl rand -hex 32
```

Renseignez ensuite:

- `PHONE_HASH_SECRET` : secret HMAC pour détecter les doublons.
- `PHONE_ENCRYPTION_KEY` : clé hexadécimale de 64 caractères pour AES-256-GCM.
- `ADMIN_TOKEN` : jeton long pour accéder à `/admin`.
- `DATA_DIR` : dossier de stockage, par défaut `./data`.

Lancez le site:

```bash
npm run dev
```

Puis ouvrez `http://localhost:3000`.

## Telegram

1. Créez un bot via BotFather.
2. Renseignez `TELEGRAM_BOT_TOKEN`.
3. Envoyez un message au bot depuis le chat admin, puis récupérez `chat.id` et votre `from.id` via `getUpdates`.
4. Renseignez `TELEGRAM_CHAT_ID`, `TELEGRAM_ADMIN_ID` et `TELEGRAM_WEBHOOK_SECRET`.
5. Configurez le webhook:

```bash
curl "https://api.telegram.org/bot<VOTRE_TOKEN>/setWebhook" \
  -d "url=https://votre-domaine.com/api/telegram/webhook" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

Le message Telegram affiche seulement le numéro masqué, par exemple `+336 ** ** ** 42`, avec deux boutons: confirmer ou refuser.

Commandes du panel Telegram:

- `/panel` ou `/admin` : affiche le panel admin Telegram.
- `Inscriptions en attente` : liste les inscriptions à confirmer/refuser.
- `Codes en attente` : liste les codes de participation à confirmer/refuser.
- `Actualiser` : recharge le panel Telegram.

## Base de données

Pour ce livrable local, la base est un fichier JSON serveur:

```json
{
  "participations": []
}
```

Chaque inscription stocke le cadeau, le pseudo, le téléphone chiffré, l'empreinte HMAC du téléphone, le numéro masqué, le statut et les dates. En production, migrez la même structure vers PostgreSQL ou MySQL avec une contrainte unique sur `phoneHash`.

## Système de validation

- Cadeau obligatoire et limité à la liste autorisée.
- Téléphone obligatoire, normalisé et validé par longueur/format.
- Pseudo obligatoire pour Robux, V-Bucks et Brawl Pass.
- Case règlement/confidentialité obligatoire.
- Honeypot anti-bot.
- Délai minimal avant soumission.
- Limitation IP en mémoire.
- Unicité par HMAC du numéro de téléphone.
- Statut initial `pending`, puis `validated` ou `rejected`.
- En cas de refus depuis le panel admin web, l'administrateur peut renseigner une raison visible par le participant.
- Après validation, le participant saisit son code directement ou revient plus tard via la page `Suivi`. Le code passe en attente, puis l'admin le confirme ou le refuse via Telegram ou le panel web.

## Sécurité

- Le site ne demande jamais de mot de passe, code SMS, code de vérification, email sensible ou information bancaire.
- Le numéro complet n'est jamais affiché dans Telegram. Dans l'admin web, il est visible uniquement après authentification.
- Le numéro complet est chiffré avec AES-256-GCM.
- Les doublons sont détectés avec HMAC-SHA256, pas avec le numéro en clair.
- Le webhook Telegram vérifie `X-Telegram-Bot-Api-Secret-Token`.
- Les actions Telegram sont acceptées uniquement si `callback_query.from.id` correspond à `TELEGRAM_ADMIN_ID`.
- Les validations, refus, confirmations de codes et suppressions sont journalisées dans `data/audit.log`.
- `ADMIN_TOKEN` doit être long, unique et stocké uniquement dans les variables d'environnement.

## Conseils RGPD et confidentialité

- Remplacez `contact@example.com` par l'adresse de l'organisateur.
- Ajoutez l'identité juridique de l'organisateur avant mise en ligne.
- Définissez une durée de conservation claire, par exemple 90 jours après le tirage.
- Prévoyez un processus de suppression sur demande.
- N'exportez jamais les numéros complets vers Telegram, un tableur ou un outil tiers non justifié.
- Ajoutez une mention d'âge minimum ou d'autorisation parentale si le concours cible des mineurs.
- En production, utilisez HTTPS, sauvegardes chiffrées, rotation des secrets et logs d'accès limités.
