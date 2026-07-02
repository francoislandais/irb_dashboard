# Application locale CSV

Application HTML/JavaScript statique, sans backend.

L'application est dans le dossier `app/`. La racine contient un petit `index.html` qui redirige vers `app/`, afin que GitHub Pages puisse servir le projet directement depuis la racine du depot.

## Publication avec GitHub Pages

1. Creer un depot GitHub.
2. Envoyer ce dossier dans le depot.
3. Dans GitHub, ouvrir `Settings` puis `Pages`.
4. Choisir `Deploy from a branch`.
5. Selectionner la branche `main`.
6. Choisir le dossier `/root`.
7. Ouvrir l'URL GitHub Pages fournie par GitHub.

L'URL finale aura typiquement cette forme :

```text
https://nom-utilisateur.github.io/nom-du-repo/
```

La page racine redirige automatiquement vers :

```text
https://nom-utilisateur.github.io/nom-du-repo/app/
```

## Donnees confidentielles

Le CSV utilisateur n'est pas inclus dans le depot. Il reste charge localement dans le navigateur par l'utilisateur.

GitHub Pages ne recoit pas le contenu du CSV charge via le bouton `Choisir un CSV`. L'application lit le fichier dans le navigateur.

## Lancement local

Depuis le dossier racine :

```sh
python3 -m http.server 4173
```

Puis ouvrir :

```text
http://127.0.0.1:4173/
```

Ou directement :

```text
http://127.0.0.1:4173/app/
```
