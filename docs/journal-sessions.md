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

## 03/11/2026 (suite) — Immersion et couche RPG

Demande : « améliore l'immersion visuelle et rajoute une grosse couche de RPG sur l'ensemble ».

**Moteur**

- Trophées (`engine/trophies.ts`) : les 22 du brief, conditions, progression, récompenses (XP non multipliée par le Réacteur), débloqués une seule fois et jamais perdus, vérifiés à chaque sauvegarde (un trophée qui fait monter de niveau peut en débloquer un autre).
- Conteur (`engine/story.ts`) : moments racontés pour les paliers de série, semaines sans faille, semaines d'affilée (4, 8, 12, 26, 52), trophées, montées de niveau, changement de classe du vaisseau ; variantes déterministes ; à la première ouverture tout l'existant est marqué comme vu ; pas de moments en mode test. Pas encore : « fin d'une série ».
- 8 tests de plus (34 au total).

**Interface**

- Navigation : Aujourd'hui, Vaisseau, Pilote (barre basse sur téléphone, onglets en haut sur PC), pastille quand une amélioration ou un point de compétence attend.
- Écran **Vaisseau** : hangar 3D (le Sillage tourne sur une plateforme holographique, on le fait pivoter au doigt), classe et progression vers la suivante, soute avec le lore, chantier des 4 modules (niveau, effet actuel → suivant, coût, ce qui manque, Réparer / Améliorer), boucliers (réserve, progression, fabrication), butin d'orbite prévu, trophées (sceaux en kanji, progression des verrouillés).
- Écran **Pilote** : anneau de niveau, grade (habillage seulement : Cadet, Enseigne, Lieutenant, Capitaine, Commandant, Commodore, Amiral), compétences à apprendre avec les points, radar et détail des disciplines (stats et sous-compétences), jauges en cadrans, séries en cours, journal de bord.
- Le vaisseau 3D **évolue avec les modules** : épave au départ (coque terne, aile pendante, verrière qui clignote, étincelles), plaques de blindage dorées (Coque), flamme plus longue puis anneau et couleur plus chaude (Réacteur), nacelles latérales (Propulseurs), mât et parabole(s) (Antenne).
- Immersion : nébuleuse procédurale, ceinture de débris, lune de Kronos, parallaxe de la caméra au doigt / à la souris avec une légère dérive, particules dans le sillage, vignette, séquence de démarrage « SILLAGE·OS » une fois par session (un toucher la passe), transition entre écrans, moments racontés en plein écran (rayons, kanji tamponné, « Continuer le voyage »), notifications de trophée, de chantier et de compétence.

**Vérifié** dans le navigateur à 375 × 812 et 1440 × 900 : démarrage, scène, réparation d'un module, compétence apprise, trophée puis moment raconté, aucune erreur console.

**Reste à faire** : autres écrans (À faire, Planning, Carnet, Campagnes, Revue, Habitudes, Danse, Réglages), tâches / quêtes / revues dans le moteur, copilote, guide des premiers jours, tutoriel, synchro, PWA.

## 03/11/2026 (suite) — Campagnes et quêtes

**Moteur** (`engine/campaigns.ts`, `templates.ts`)

- Quête cochée : XP de la quête (× Discipline) au domaine de la campagne, butin quête ou boss, +6 Motivation, libellé « Quête : » ou « Boss vaincu : ». Toutes les quêtes d'un chapitre faites : chapitre terminé (+300 XP, 3 Cristaux, +15 Inspiration). Décocher annule les deux.
- Campagne terminée (action explicite, réversible) : +1 000 XP, 10 Cristaux, +30 Inspiration. Pause : plus de baisse d'Inspiration.
- Ajout de chapitre et de quête (XP, boss) ; une nouvelle quête rouvre un chapitre terminé.
- Tâches liées à une quête : XP d'une action « normale » de l'effort × Logistique, donnée au domaine de la campagne (et compte comme progrès de la campagne ce jour-là).
- Les 7 modèles du brief (§22), arrivée visée = aujourd'hui + durée indicative.
- Moments racontés : cap franchi (chapitre, avec le prochain cap), boss vaincu, destination atteinte (rappel de l'intention).
- 9 tests de plus (43 au total).

**Écran Campagnes** (onglet 航路 dans la navigation)

- Route 3D : les chapitres sont des balises le long d'une trajectoire en pointillés, allumée jusqu'au vaisseau ; la destination est une planète à la couleur de la stat ; le Sillage se tient au cap en cours, avance quand on coche et une onde part de la balise.
- Destination (stat, statut, intention), progression en % et arrivée visée ; onglets des campagnes ; pause / reprise ; « Destination atteinte » / rouvrir.
- Chapitres (franchi, en cours, à venir) dépliables ; quêtes en hexagones (boss marqués 鬼) ; tâches liées sous chaque quête avec aperçu d'XP ; ajout de quête, de chapitre, de tâche.
- Nouvelle route : les 7 modèles ou une campagne libre (nom, intention, stat).

**Vérifié** à 375 × 812 et 1440 × 900 : quêtes, chapitre terminé avec boss, trophées et moments enchaînés, création depuis un modèle, tâche liée. Corrigé en route : la liste ne se rafraîchissait pas (objets modifiés en place), elle travaille maintenant sur une copie à chaque révision.

**Fin de session (03/11/2026)** : tout est poussé sur `main` et déployé. `CLAUDE.md` résume l'état et la suite ; reprendre par la revue hebdo (§15) ou l'écran À faire.
