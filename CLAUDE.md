# CLAUDE.md

Version **3D** de l'app RPG d'habitudes « Le Sillage ». Langue du projet : français.

## Règle de départ

L'app se reconstruit **uniquement à partir des documents de ce dépôt** :

- `docs/brief-technique.md` : tout le fond (architecture, modèle de données, journal d'événements, formules, jauges, régularité, boucliers, orbite, vaisseau, trophées, campagnes, revues, récits, copilote, prise en main, notifications, synchro, écrans, contenus et textes, constantes, tests). C'est la source de vérité ; les mécaniques et valeurs se reprennent telles quelles.
- `docs/brief-graphique.md` : la direction visuelle (japonais rétrofuturiste, 3D/2D, cohérence entre interfaces, rendu qui claque).
- `docs/recherche-motivation.md` : les principes que toute mécanique doit respecter.

Le code de la V3 (`Doktom/rpg-habitudes-v3`, tag `v3-base`) n'est pas la référence de départ ; il ne sert qu'en cas de doute sur un détail que le brief ne tranche pas.

## État

03/11/2026 : dépôt créé avec les briefs. Rien n'est encore codé : stack 3D, prototype et premiers écrans à choisir avec l'utilisateur.

## Points d'attention

- Données : clés locales propres (`rpg-habitudes-3d:*`), import en lecture seule des données V3 (`rpg-habitudes-v3:data`) au premier lancement ; ne jamais écrire dans les clés d'une autre version.
- Backend : projet Supabase existant (voir brief §2.3 et §20) ; ne pas casser la synchro de la V3 si le format de données change.
- Fin de session : journal à jour, commit et push (l'utilisateur travaille sur plusieurs PC, GitHub est la seule source de vérité).
