# Epstein Giveaway - site de concours transparent

Application Next.js pour gérer un concours/giveaway légal et explicite, avec inscription publique, validation manuelle via Message, stockage serveur et interface admin.

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
- `pages/api/message/webhook.js` : confirmation/refus des inscriptions et codes depuis Message.
- `lib/db.js` : base JSON persistante et journal d'audit.
- `lib/security.js` : normalisation, HMAC, chiffrement AES-256-GCM, masquage.
- `lib/message.js` : notification Message avec boutons.
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

## Message

1. Créez un bot via BotFather.
2. Renseignez `MESSAGE_BOT_TOKEN`.
3. Envoyez un message au bot depuis le chat admin, puis récupérez `chat.id` et votre `from.id` via `getUpdates`.
4. Renseignez `MESSAGE_CHAT_ID`, `MESSAGE_ADMIN_ID` et `MESSAGE_WEBHOOK_SECRET`.
5. Configurez le webhook:

```bash
curl "https://api.telegram.org/bot<VOTRE_TOKEN>/setWebhook" \
  -d "url=https://votre-domaine.com/api/message/webhook" \
  -d "secret_token=<MESSAGE_WEBHOOK_SECRET>"
```

La notification affiche seulement le numéro masqué, par exemple `+336 ** ** ** 42`, avec deux boutons: confirmer ou refuser.

Commandes du panel Message:

- `/panel` ou `/admin` : affiche le panel admin Message.
- `Inscriptions en attente` : liste les inscriptions à confirmer/refuser.
- `Codes en attente` : liste les codes de participation à confirmer/refuser.
- `Actualiser` : recharge le panel Message.

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
- Après validation, le participant saisit son code directement ou revient plus tard via la page `Suivi`. Le code passe en attente, puis l'admin le confirme ou le refuse via Message ou le panel web.

## Sécurité

- Le site ne demande jamais de mot de passe, code SMS, code de vérification, email sensible ou information bancaire.
- Le numéro complet n'est jamais affiché dans la notification Message. Dans l'admin web, il est visible uniquement après authentification.
- Le numéro complet est chiffré avec AES-256-GCM.
- Les doublons sont détectés avec HMAC-SHA256, pas avec le numéro en clair.
- Le webhook Message vérifie `X-Telegram-Bot-Api-Secret-Token`.
- Les actions Message sont acceptées uniquement si `callback_query.from.id` correspond à `MESSAGE_ADMIN_ID`.
- Les validations, refus, confirmations de codes et suppressions sont journalisées dans `data/audit.log`.
- `ADMIN_TOKEN` doit être long, unique et stocké uniquement dans les variables d'environnement.

## Conseils RGPD et confidentialité


## Déploiement sur Netlify

- Netlify expose `NETLIFY=true` et la zone d'écriture éphémère est `/tmp` ; le projet utilise `/tmp/data` quand il détecte Netlify, sauf si `DATA_DIR` est explicitement défini.
- Dans l'interface Netlify (Site settings → Build & deploy → Environment), définissez les variables d'environnement obligatoires :
  - `PHONE_HASH_SECRET`
  - `PHONE_ENCRYPTION_KEY`
  - `ADMIN_TOKEN`
  - Optionnellement : `MESSAGE_BOT_TOKEN`, `MESSAGE_CHAT_ID`, `MESSAGE_ADMIN_ID`, `MESSAGE_WEBHOOK_SECRET`
- Le stockage local sur Netlify est éphémère : les fichiers dans `/tmp` peuvent être réinitialisés entre les exécutions. Pour persistance, utilisez une base de données externe (Postgres, MySQL, Firestore, etc.).

Un fichier `netlify.toml` a été ajouté pour faciliter le build avec le plugin Next.js et pour définir `DATA_DIR` à `/tmp/data` par défaut.
- En production, utilisez HTTPS, sauvegardes chiffrées, rotation des secrets et logs d'accès limités.
