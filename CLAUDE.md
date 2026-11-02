# CLAUDE.md

Version **3D** de l'app RPG d'habitudes « Le Sillage ». Langue du projet : français.

## Règle de départ

L'app se reconstruit **uniquement à partir des documents de ce dépôt** :

- `docs/brief-technique.md` : tout le fond (architecture, modèle de données, journal d'événements, formules, jauges, régularité, boucliers, orbite, vaisseau, trophées, campagnes, revues, récits, copilote, prise en main, notifications, synchro, écrans, contenus et textes, constantes, tests). C'est la source de vérité ; les mécaniques et valeurs se reprennent telles quelles.
- `docs/brief-graphique.md` : la direction visuelle (japonais rétrofuturiste, 3D/2D, cohérence entre interfaces, rendu qui claque).
- `docs/recherche-motivation.md` : les principes que toute mécanique doit respecter.

Le code de la V3 (`Doktom/rpg-habitudes-v3`, tag `v3-base`) n'est pas la référence de départ ; il ne sert qu'en cas de doute sur un détail que le brief ne tranche pas.

## État

03/11/2026 : stack choisie (Svelte 5 + Threlte 8, Vite, Vitest). Moteur pur (`src/lib/engine/*`, testé), stockage `rpg-habitudes-3d:*` avec import V3 en lecture seule, prototype de l'écran Aujourd'hui en 3D/2D, déployé sur GitHub Pages (https://doktom.github.io/rpg-habitudes-3d/). Détail et suite : `docs/journal-sessions.md`.

Commandes : `npm run dev`, `npm test`, `npm run check`, `npm run build`. `?date=AAAA-MM-JJ` = horloge simulée sur un stockage de test séparé.

## Points d'attention

- Données : clés locales propres (`rpg-habitudes-3d:*`), import en lecture seule des données V3 (`rpg-habitudes-v3:data`) au premier lancement ; ne jamais écrire dans les clés d'une autre version.
- Backend : projet Supabase existant (voir brief §2.3 et §20) ; ne pas casser la synchro de la V3 si le format de données change.
- Fin de session : journal à jour, commit et push (l'utilisateur travaille sur plusieurs PC, GitHub est la seule source de vérité).
