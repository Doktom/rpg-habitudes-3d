# RPG Habitudes 3D · Le Sillage

Nouvelle version en 3D de l'app RPG de suivi d'habitudes, planification et projets au long cours : un pilote, son vaisseau le Sillage, en orbite autour de Kronos, la planète-horloge dont la révolution de 7 jours est la semaine.

En ligne : https://doktom.github.io/rpg-habitudes-3d/ (prototype de l'écran Aujourd'hui).

- Fond de l'app : [docs/brief-technique.md](docs/brief-technique.md)
- Direction visuelle : [docs/brief-graphique.md](docs/brief-graphique.md)
- Principes de motivation : [docs/recherche-motivation.md](docs/recherche-motivation.md)

Version précédente (2D) : [Doktom/rpg-habitudes-v3](https://github.com/Doktom/rpg-habitudes-v3), tag `v3-base`.

## Développement

Svelte 5 + Threlte 8 (Three.js), Vite, TypeScript, Vitest.

```bash
npm install
npm run dev     # serveur local
npm test        # tests du moteur
npm run build   # build statique dans dist/
```

Journal des sessions : [docs/journal-sessions.md](docs/journal-sessions.md).
