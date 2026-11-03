# CLAUDE.md

Version **3D** de l'app RPG d'habitudes « Le Sillage ». Langue du projet : français.

## Règle de départ

L'app se reconstruit **uniquement à partir des documents de ce dépôt** :

- `docs/brief-technique.md` : tout le fond (architecture, modèle de données, journal d'événements, formules, jauges, régularité, boucliers, orbite, vaisseau, trophées, campagnes, revues, récits, copilote, prise en main, notifications, synchro, écrans, contenus et textes, constantes, tests). C'est la source de vérité ; les mécaniques et valeurs se reprennent telles quelles.
- `docs/brief-graphique.md` : la direction visuelle (japonais rétrofuturiste, 3D/2D, cohérence entre interfaces, rendu qui claque).
- `docs/recherche-motivation.md` : les principes que toute mécanique doit respecter.

Le code de la V3 (`Doktom/rpg-habitudes-v3`, tag `v3-base`) n'est pas la référence de départ ; il ne sert qu'en cas de doute sur un détail que le brief ne tranche pas.

## État

Au 03/11/2026 (détail session par session : `docs/journal-sessions.md`, à lire en premier) :

- **Stack** : Svelte 5 + Threlte 8 (Three.js), Vite, TypeScript, Vitest. Pas de SvelteKit : une page, routage par hash (`#/`, `#/vaisseau`, `#/campagnes`, `#/pilote`). En ligne : https://doktom.github.io/rpg-habitudes-3d/ (workflow `.github/workflows/deploy.yml` : tests, build, Pages à chaque push sur `main`).
- **Moteur pur** `src/lib/engine/` (43 tests) : `progress` (journal, jauges, clôtures), `regularity`, `shields`, `orbit`, `ship`, `effects`, `xp`, `trophies` (22), `story` (moments racontés), `campaigns` (quêtes, chapitres, campagnes, tâches), `actions`. Contenus : `seed.ts`, `templates.ts` (7 modèles), `universe.ts` (textes, kanji, grades).
- **App** : `src/lib/app.svelte.ts` (état + actions ; le moteur modifie un `AppData` brut en place, `rev` déclenche le recalcul ; les vues doivent renvoyer des objets neufs, cf. `view.ts` et la copie dans `CampaignsScreen`), `src/lib/storage.ts` (clés `rpg-habitudes-3d:*`, import V3 en lecture seule).
- **Écrans faits** : Aujourd'hui (orbite 3D, cockpit, missions), Vaisseau (hangar 3D, chantier, boucliers, trophées), Campagnes (route 3D, quêtes, tâches liées, modèles), Pilote (grade, compétences, disciplines, journal). Overlays : démarrage, moments racontés, toasts de gain. 3D dans `src/components/scene/`.
- **Pas encore fait** : écrans À faire, Planning, Carnet, Revue (hebdo + mensuelle), Habitudes, Danse, Réglages ; copilote ; guide des premiers jours ; tutoriel ; moment « fin d'une série » ; synchro Supabase ; PWA et notifications.
- **Prochaine étape proposée** : revue hebdo « amarrage au Havre » (§15), ou écran À faire.

Commandes : `npm run dev`, `npm test`, `npm run check`, `npm run build`. Serveur de prévisualisation : `.claude/launch.json` (`sillage-dev`, port 5179). `?date=AAAA-MM-JJ` = horloge simulée sur un stockage de test séparé (pas de moments racontés en mode test).

## Points d'attention

- Données : clés locales propres (`rpg-habitudes-3d:*`), import en lecture seule des données V3 (`rpg-habitudes-v3:data`) au premier lancement ; ne jamais écrire dans les clés d'une autre version.
- Backend : projet Supabase existant (voir brief §2.3 et §20) ; ne pas casser la synchro de la V3 si le format de données change.
- Fin de session : journal à jour, commit et push (l'utilisateur travaille sur plusieurs PC, GitHub est la seule source de vérité).
