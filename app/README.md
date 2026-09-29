# Application locale CSV

Application HTML/JavaScript sans backend pour charger un fichier CSV local choisi par l'utilisateur.

## Servir depuis GitHub Pages

Le dossier racine du projet contient un `index.html` qui redirige vers ce dossier `app/`. Pour GitHub Pages, configurez donc le depot avec :

- source : `Deploy from a branch`
- branche : `main`
- dossier : `/root`

L'application sera disponible a l'adresse GitHub Pages du depot, puis redirigee vers `/app/`.

## Lancer l'application

Depuis le dossier `app`, servez les fichiers statiques avec un petit serveur local, puis ouvrez l'URL affichée par le serveur.

```sh
python3 -m http.server 4173
```

L'application est ensuite disponible sur `http://127.0.0.1:4173/`.

## Mémorisation du fichier

Les navigateurs ne donnent pas accès à un chemin local brut pour des raisons de sécurité. Quand l'API File System Access est disponible, l'application mémorise à la place un handle de fichier dans IndexedDB. Au prochain chargement, elle peut relire le même CSV après autorisation du navigateur.

Si le navigateur ne supporte pas cette API, le chargement CSV fonctionne quand même, mais l'utilisateur devra sélectionner le fichier à chaque session.

Le contenu des fichiers CSV utilisateur n'est pas envoyé à un serveur. La
branche avec les taxonomies DPM conserve le même chargement local des données.

## Taxonomies DPM versionnées

La branche `codex/taxonomy-preview` utilise le dictionnaire versionné dérivé de
l'historique DPM dans `app/assets/ITS_all_dimension_mapping.csv`, tout en
conservant le démarrage normal de l'Explorer et son chargement de fichiers CSV.
L'application restaure le dernier fichier local quand le navigateur y a encore
accès ; sinon, choisissez le CSV data comme d'habitude. Par défaut, chaque
template utilise le framework le plus récent disponible pour lui. Les pilules
**Taxonomy** au-dessus du tableau permettent de choisir une autre version pour
le template affiché.

Le CSV `app/assets/taxonomy-preview-empty-data.csv` reste disponible pour
prévisualiser les structures vides, mais il n'est plus chargé automatiquement.
Pour reconstruire le dictionnaire compact à partir de
`data/eba-dpm-history/generated/versioned_dimension_mapping.csv`, lancez :

```sh
python3 scripts/dpm_taxonomy/build_taxonomy_preview.py
```
