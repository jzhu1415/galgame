# Independent game repositories

- Visual novel: https://github.com/jzhu1415/galgame
- Castle escape: https://github.com/SCML67/Escape-Naiwa

The visual novel keeps only the bilingual introduction window and external escape-game entrance. Escape source, checks, exclusive references, audio, textures, mesh tools and deployment config now belong to Escape-Naiwa, including the pending Ultra graphics, wall marks, food, stairs and roadside detail updates. The original escape files remain recoverable in Git history.

The mirror hall still uses assets/models/naiwa-h25-refined.glb, so that shared model remains here. The common character identity reference is also retained.

The mirror-hall rendering and progressive-audio changes from a8cdc05, later reverted by 7567ab9, are restored without replacing story, chapter, home or save implementations. Escape notes use a separate acknowledgement key in their own repository.
