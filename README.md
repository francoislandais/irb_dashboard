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

## Generation automatisee d'une application autonome

La fonction `exportStandaloneApp` produit le meme fichier HTML autonome que le bouton d'export de l'application. Son seul argument obligatoire est le chemin du fichier CSV a integrer :

```sh
node scripts/exportStandaloneApp.mjs /chemin/vers/donnees.csv
```

Le fichier `agora-explorer-donnees.html` est cree dans le dossier courant.

La fonction peut aussi etre importee depuis un autre script :

```js
import { exportStandaloneApp } from "./scripts/exportStandaloneApp.mjs";

const outputPath = await exportStandaloneApp("/chemin/vers/donnees.csv");
```

Un chemin de sortie peut être fourni en option lorsque cela est necessaire :

```js
await exportStandaloneApp("/chemin/vers/donnees.csv", {
  outputPath: "/chemin/vers/application-autonome.html"
});
```

### Generation de toutes les applications locales

Deux dossiers locaux, exclus de Git, sont utilises :

- `datasets/` recoit les fichiers CSV utilisateur ;
- `outputs/` recoit les applications HTML generees.

Deposer les CSV dans `datasets/`, puis executer :

```sh
node scripts/exportAllStandaloneApps.mjs
```

Pour chaque fichier `mon-fichier.csv`, le programme cree :

```text
outputs/Agora Explorer_mon-fichier.html
```

Les dossiers sont crees automatiquement s'ils n'existent pas. Leur contenu n'est jamais suivi par Git.

### Extraire directement depuis Hive vers `datasets/`

Le module `scripts/hive_to_dataset.py` contient les fonctions `build_hive_query` et `run_hive_query_to_csv`. Par defaut, le CSV est toujours enregistre dans le dossier local `datasets/` du projet :

```python
from scripts.hive_to_dataset import run_hive_query_to_csv

df = run_hive_query_to_csv(
    templates=["F_12.01", "F_18.00"],
    reference_dates=["2025-03-31", "2025-06-30"],
    jst_codes=["FRSOG", "FRBNP", "FRCAG"],
    output_name="finrep_extract",
    devo_client=devo,
)
```

Le résultat est enregistré sous `datasets/finrep_extract.csv`. Il peut ensuite être transforme en application autonome avec :

```sh
node scripts/exportAllStandaloneApps.mjs
```

## Organisation du code

- `app/src/data/` contient le modele de donnees, le parsing CSV, les index et les calculs metier.
- `app/src/data/costOfRisk/definitions.js` regroupe les constantes FINREP et les definitions du module Cost of risk.
- `app/src/ui/` contient les vues, le cablage des controles et le rendu des graphiques/tableaux.
- `app/src/data/csvSchema.js` centralise les validations minimales attendues pour un CSV exploitable.
