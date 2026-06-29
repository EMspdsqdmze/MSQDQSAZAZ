# Epstein Giveaway - site de concours transparent

Application Next.js pour gérer un concours/giveaway légal et explicite, avec inscription publique, validation manuelle via Discord, stockage serveur et interface admin.

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
- `pages/api/message/webhook.js` : confirmation/refus des inscriptions et codes depuis Discord.
- `lib/db.js` : base JSON persistante et journal d'audit.
- `lib/security.js` : normalisation, HMAC, chiffrement AES-256-GCM, masquage.
- `lib/message.js` : notification Discord avec boutons.
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

## Discord

1. Créez une application Discord dans le Developer Portal.
2. Ajoutez un bot à l'application et invitez-le sur votre serveur avec les permissions `Send Messages` et `Use External Emojis` si besoin.
3. Renseignez `DISCORD_BOT_TOKEN`.
4. Récupérez l'ID du salon où recevoir les demandes et renseignez `DISCORD_CHANNEL_ID`.
5. Récupérez votre ID Discord admin et renseignez `DISCORD_ADMIN_ID`.
6. Copiez la clé publique de l'application dans `DISCORD_PUBLIC_KEY`.
7. Dans Discord Developer Portal → General Information → Interactions Endpoint URL, configurez:

`https://votre-domaine.com/api/message/webhook`

La notification affiche seulement le numéro masqué, par exemple `+336 ** ** ** 42`, avec deux boutons: confirmer ou refuser.

Les boutons Discord sont acceptés uniquement si l'utilisateur qui clique correspond à `DISCORD_ADMIN_ID`.

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
- Après validation, le participant saisit son code directement ou revient plus tard via la page `Suivi`. Le code passe en attente, puis l'admin le confirme ou le refuse via Discord ou le panel web.

## Sécurité

- Le site ne demande jamais de mot de passe, code SMS, code de vérification, email sensible ou information bancaire.
- Le numéro complet n'est jamais affiché dans la notification Discord. Dans l'admin web, il est visible uniquement après authentification.
- Le numéro complet est chiffré avec AES-256-GCM.
- Les doublons sont détectés avec HMAC-SHA256, pas avec le numéro en clair.
- Le webhook Discord vérifie la signature `X-Signature-Ed25519`.
- Les actions Discord sont acceptées uniquement si l'utilisateur correspond à `DISCORD_ADMIN_ID`.
- Les validations, refus, confirmations de codes et suppressions sont journalisées dans `data/audit.log`.
- `ADMIN_TOKEN` doit être long, unique et stocké uniquement dans les variables d'environnement.

## Conseils RGPD et confidentialité


## Déploiement sur Netlify

- Netlify expose `NETLIFY=true` et la zone d'écriture éphémère est `/tmp` ; le projet utilise `/tmp/data` quand il détecte Netlify, sauf si `DATA_DIR` est explicitement défini.
- Dans l'interface Netlify (Site settings → Build & deploy → Environment), définissez les variables d'environnement obligatoires :
  - `PHONE_HASH_SECRET`
  - `PHONE_ENCRYPTION_KEY`
  - `ADMIN_TOKEN`
  - Optionnellement : `DISCORD_BOT_TOKEN`, `DISCORD_CHANNEL_ID`, `DISCORD_ADMIN_ID`, `DISCORD_PUBLIC_KEY`
- Le stockage local sur Netlify est éphémère : les fichiers dans `/tmp` peuvent être réinitialisés entre les exécutions. Pour persistance, utilisez une base de données externe (Postgres, MySQL, Firestore, etc.).

Un fichier `netlify.toml` a été ajouté pour faciliter le build avec le plugin Next.js et pour définir `DATA_DIR` à `/tmp/data` par défaut.
- En production, utilisez HTTPS, sauvegardes chiffrées, rotation des secrets et logs d'accès limités.
