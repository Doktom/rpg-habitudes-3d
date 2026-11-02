# Journal des sessions

## 03/11/2026 — Démarrage : stack, moteur, premier prototype 3D

**Choix de la stack** (fait par l'utilisateur) : **Svelte 5 + Threlte 8** (Three.js en composants Svelte), Vite, TypeScript, Vitest. Pas de SvelteKit : une seule page statique, hébergée sur GitHub Pages.

**Fait**

- Moteur pur reconstruit depuis le brief technique (`src/lib/engine/*`), sans reprendre le code de la V3 (consultée seulement pour un doute : comptage des objectifs hebdo ratés le dimanche et arrondi de la Discipline, identiques au brief) :
  - modèle de données `AppData` v1 identique à la V3 (`src/lib/types.ts`), constantes du §24 (`config.ts`), dates UTC, semaine du lundi ;
  - journal d'événements par source, Réacteur sur l'XP (sauf trophées), Antenne sur l'Inspiration ;
  - XP, niveaux, butin, répartition par domaine (le parent cumule ses sous-compétences) ;
  - jauges : Discipline pondérée sur 28 jours (+ objectifs hebdo le dimanche), Motivation et Inspiration rejouées, clôture des journées (60 jours au plus) et re-clôture quand on modifie un jour passé ;
  - régularité : journées complètes / parfaites, paliers de série, semaines pleines (habitude, discipline), semaine sans faille, recalculées depuis la semaine modifiée ;
  - boucliers (réserve, proposition, usage, refus, fabrication), orbite (états, demi-secteurs, butin, orbite parfaite), vaisseau (coûts, classes, compétences).
  - 26 tests (`npm test`).
- Stockage : clés `rpg-habitudes-3d:data` (et `:test` pour l'horloge simulée) ; import **en lecture seule** de `rpg-habitudes-v3:data` au premier lancement ; écrire hors du préfixe 3D lève une erreur.
- Contenus de départ du §22 (domaines, 9 habitudes, 2 campagnes, carnet, rappels par défaut). Une donnée neuve démarre avec `lastProcessedDay` = la veille (pas de clôture le premier jour).
- Prototype de l'écran **Aujourd'hui** :
  - scène 3D (`src/components/scene/`) : Kronos en soleil rétro rayé avec halo et cadran d'horloge à 60 graduations, orbite des 7 secteurs (arcs et balises colorés selon l'état, balises cliquables), le Sillage et son sillage lumineux qui glisse jusqu'au secteur choisi, onde lumineuse à chaque validation, champ d'étoiles ; mouvement ralenti si le système demande moins d'animations ;
  - 2D par-dessus : secteur en kanji (暁 鍛 天 交 閃 漂 港), nom, phrase, date (précédent / suivant / aujourd'hui), bande des 7 secteurs ;
  - poste de pilotage : statut en une phrase, obligations / bonus en segments, gains du jour, boucliers, mode minimum, jour de repos, trois jauges ;
  - transmissions : proposition de bouclier, réacteur faible → mode minimum ;
  - missions par moment (repli auto quand tout est fait) : série et prochain palier, rythme hebdo, déclencheur, semaine en pastilles, séances (programme), choix du palier (re-choisir décoche), XP qui s'envole, balayage lumineux, toast de gain avec butin et tampon 完 / 極 pour les exploits.
- Système visuel commun (`src/app.css`) : indigo nuit, ambre, vermillon, cyan, rose ; Chakra Petch, Zen Kaku Gothic New, Share Tech Mono ; panneaux à coins coupés, étiquettes en katakana.
- `?date=AAAA-MM-JJ` dans l'URL : horloge simulée sur un stockage de test séparé (les vraies données ne sont pas touchées).
- Déploiement : workflow GitHub Actions (tests puis build puis GitHub Pages).

**Vérifié** dans le navigateur intégré à 375 × 812 et 1440 × 900 : rendu 3D, validation par palier, toasts, journée complète, sélection d'un secteur (bande 2D et balise 3D), persistance après rechargement.

**Reste à faire (pistes)**

- Autres écrans du §21 (À faire, Planning, Carnet, Vaisseau, Campagnes, Revue, Pilote, Habitudes, Danse, Réglages) et navigation.
- Moteur : tâches, quêtes / chapitres / campagnes, revues, trophées, missions du guide, copilote, conteur, fusion de synchro.
- Synchro Supabase (même format de données que la V3), PWA (manifeste, service worker, push).
- Tutoriel, moments racontés en plein écran.
- Poids : three.js fait l'essentiel du JS (~235 ko gzip) ; à surveiller sur téléphone.
