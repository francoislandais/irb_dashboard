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

Le contenu des fichiers CSV utilisateur n'est pas envoyé à un serveur. La branche de prévisualisation charge en plus son CSV d'exemple depuis `app/assets/`.

## Prévisualiser les taxonomies DPM

La branche de test `codex/taxonomy-preview` remplace le dictionnaire interne par
une version dérivée de l'historique DPM. Les pilules **Taxonomy** au-dessus du
tableau choisissent le framework du template affiché, indépendamment des autres
templates. Chaque template démarre sur son framework le plus récent disponible.
Au démarrage, l'application lit directement
`app/assets/taxonomy-preview-empty-data.csv` comme jeu de données de référence.
Ce fichier contient une ligne technique par template, sans coordonnées ni
valeurs numériques, afin d'afficher la structure vide des templates.

Après modification du CSV, rechargez l'application pour relire le fichier. Pour
reconstruire le dictionnaire compact et le jeu de prévisualisation à partir de
`data/eba-dpm-history/generated/versioned_dimension_mapping.csv`, lancez :

```sh
python3 scripts/dpm_taxonomy/build_taxonomy_preview.py
```
