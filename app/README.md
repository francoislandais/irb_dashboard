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

Le contenu du fichier CSV n'est pas inclus dans l'application et n'est pas envoyé à un serveur.
