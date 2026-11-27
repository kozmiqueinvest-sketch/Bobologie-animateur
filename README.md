# Bobologie

Carnet de bobologie pour animateurs : on enregistre les enfants, leurs bobos, les soins donnés et à quelle heure, puis on envoie le récapitulatif de la journée sur le groupe WhatsApp de l'équipe.

C'est une appli web qui s'installe sur l'écran d'accueil de l'iPhone (pas besoin de l'App Store). Une fois installée, elle s'ouvre en plein écran et fonctionne sans réseau.

## Ce qu'elle fait

- **Journal du jour** : les bobos classés par heure, avec les soins et leur heure. Flèches pour revoir les jours précédents.
- **Noter un bobo** en quelques touches : enfant, heure, type de bobo, zone du corps, circonstances, soins (plusieurs soins à des heures différentes possibles), parents ou direction prévenus, « à surveiller ».
- **Conflits** : même fiche que pour un bobo, avec plusieurs enfants concernés, le type de conflit et les mesures prises. Ils apparaissent dans le journal et dans le message du jour, et sont toujours transmis à la direction par le lien verrouillé.
- **Enfants** : fiche avec prénom, nom, groupe et infos utiles (allergies, PAI) affichées en alerte au moment de noter un bobo. On peut coller une liste d'appel entière d'un coup.
- **Partager** : le message du jour est rédigé automatiquement, relisible et modifiable, puis envoyé vers WhatsApp où l'on choisit son groupe. On peut aussi le copier ou passer par une autre appli.
- **Sauvegarde** : export et import d'un fichier depuis les réglages.

## Confidentialité

Les données restent sur le téléphone, dans le stockage de l'appli. Il n'y a ni compte ni serveur. Seul le message que l'on choisit de partager quitte le téléphone. Par défaut, le message nomme les enfants par leur prénom suivi de l'initiale du nom ; c'est réglable.

## Mettre l'appli en ligne (une seule fois)

L'appli doit être servie en HTTPS pour pouvoir être installée. Le plus simple est GitHub Pages :

1. Sur GitHub, ouvrir ce dépôt puis **Settings → Pages**.
2. Dans **Build and deployment**, choisir **Deploy from a branch**, sélectionner la branche qui contient ces fichiers et le dossier **/ (root)**, puis **Save**.
3. Attendre une minute : l'adresse de l'appli s'affiche en haut de la page (du type `https://<compte>.github.io/Bobologie-animateur/`).

Avec un compte GitHub gratuit, Pages n'est disponible que pour un dépôt public. Le dépôt ne contient que le code de l'appli, aucune donnée.

## QR code

`qr-bobologie.png` mène à l'adresse de l'appli (`https://ifac-lambesc.github.io/Bobologie-animateur/`). À scanner avec l'appareil photo du téléphone.

## Installer sur Android

Ouvrir l'adresse dans **Chrome**, puis toucher « Installer » dans le bandeau de l'appli, ou le menu ⋮ → « Ajouter à l'écran d'accueil ».

## Installer sur l'iPhone

1. Ouvrir l'adresse de l'appli dans **Safari**.
2. Toucher le bouton **Partager**, puis **Sur l'écran d'accueil**.
3. Ouvrir ensuite l'appli depuis son icône, et saisir les données là.

À savoir : sur iPhone, l'appli installée a son propre stockage. Ce qui est saisi dans Safari avant l'installation n'est pas repris.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `index.html` | Page de l'appli |
| `styles.css` | Mise en forme (clair et sombre) |
| `app.js` | Toute la logique : données, écrans, message |
| `sw.js` | Fonctionnement hors ligne |
| `manifest.webmanifest`, `icons/` | Nom et icône de l'appli installée |

Aucune dépendance ni étape de compilation. Pour essayer en local : `python3 -m http.server` puis ouvrir `http://localhost:8000`.

Après une modification, les téléphones récupèrent la nouvelle version tout seuls : elle est téléchargée en arrière-plan à l'ouverture de l'appli (avec du réseau) et s'affiche à l'ouverture suivante.
