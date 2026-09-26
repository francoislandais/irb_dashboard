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
python3 scripts/export_all_standalone_apps.py
```

Pour chaque fichier `mon-fichier.csv`, le programme cree :

```text
outputs/Agora Explorer_mon-fichier.html
```

Les dossiers sont crees automatiquement s'ils n'existent pas. Leur contenu n'est jamais suivi par Git.

La fonction peut etre appelee directement depuis un notebook Python :

```python
from scripts.export_all_standalone_apps import export_all_standalone_apps

generated_files = export_all_standalone_apps()
generated_files
```

La generation est entierement realisee en Python : le notebook n'a pas besoin d'appeler Node.js.

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
    module_id="YOUR_MODULE_ID",  # Optionnel : correspondance exacte
)
```

Sans argument `module_id`, aucun filtre n'est appliqué sur cette colonne.

### Prototype de mise à jour globale

Le classeur `outputs/global-update-prototype/global_update_examples.xlsx` montre le format proposé : un onglet par application, les LEI en `B1`, le niveau de consolidation en `B2`, puis une ligne par extraction à partir de la ligne 5. La fréquence et la profondeur d'historique s'appliquent séparément à chaque ligne.

Après installation de la dépendance du lecteur Excel (`python3 -m pip install -r scripts/requirements-global-update.txt`), le point d'entrée unique peut être importé :

```python
from scripts.global_update import global_update

result = global_update(mode="preview")
```

Le mode `preview` valide tout le classeur et écrit une requête SQL par extraction, la requête dédiée aux métadonnées des institutions, un manifeste et un index lisible dans `outputs/global-update-prototype/generated/preview/`. Il ne se connecte pas à Hive.

Le mode `test` redirige le SQL vers les noms de tables suffixés `_test`, puis construit localement les datasets factices, un dictionnaire d'institutions et les applications HTML autonomes :

```sh
python3 scripts/global_update.py --mode test
```

Ce mode ne se connecte pas à Hive : les valeurs viennent de `scripts/fixtures/global_update_test_entities.json`. Il valide le flux de bout en bout et l'incorporation du dictionnaire d'institutions dans les applications exportées. Les noms de tables `_test` et les noms de colonnes `lei`, `consolidation_level` et `institution_name` restent à confirmer sur le schéma Hive réel avant d'activer une exécution distante. Le format d'`Institution ID` utilisé dans ce prototype est `LEI_niveau`.

Le résultat est enregistré sous `datasets/finrep_extract.csv`. La colonne d’identification est publiée sous le nom `reporting_unit_id` ; les anciens CSV qui utilisent encore `jst_code` restent acceptés par l’application. Il peut ensuite être transforme en application autonome avec :

```sh
python3 scripts/export_all_standalone_apps.py
```

## Organisation du code

- `app/src/data/` contient le modele de donnees, le parsing CSV, les index et les calculs metier.
- `app/src/data/costOfRisk/definitions.js` regroupe les constantes FINREP utilisées par le module Credit Risk, notamment par son onglet Cost of Risk.
- `app/src/ui/` contient les vues, le cablage des controles et le rendu des graphiques/tableaux.
- `app/src/data/csvSchema.js` centralise les validations minimales attendues pour un CSV exploitable.

## Historique des sélections Explorer

Les flèches sous le bloc de sélection permettent de revenir à la combinaison
précédente ou suivante de template, ligne (Y), colonne (X) et onglet (Z).
L’axe affiché, le mode de vue, la date sélectionnée et l’état du benchmark
restent ceux de la vue courante. Les filtres de recherche ne sont pas restaurés.

L’historique est conservé localement dans le navigateur, par nom de fichier de
dataset. Il ne contient que les codes des sélections, pas les valeurs du CSV.
Deux sélections consécutives identiques ne créent pas de doublon. Une nouvelle
sélection après un retour arrière remplace les étapes suivantes. Si le stockage
local est indisponible, l’historique reste utilisable pendant la session.

Vérification sans navigateur : `node scripts/testExplorerSelectionHistory.mjs`.

## Vue XY

Dans Explorer, le choix **Table display → XY view** affiche une matrice à la
date de référence sélectionnée, pour la JST et le Tab/Z courants :

**XY view** est le choix proposé en premier et le mode utilisé par défaut en
l’absence de paramètre dans l’URL. **Temporal** reste restauré lorsqu’il est
explicitement présent dans l’URL. En mode Temporal, **History depth** et
**Evolution frequency** sont réunis dans le panneau **Table display** sous
forme de curseurs. Le choix de fréquence reste global entre les templates.

Y est toujours en lignes et X en colonnes. **ROW** et **COLUMN** mémorisent
l’axe choisi sans transposer la matrice ; cet axe est utilisé au retour en
Temporal. **TAB** affiche Z en temporel tout en conservant le mode XY, qui
réaffiche la matrice au retour sur ROW ou COLUMN. Le mode est global : il reste
actif lors du passage à un autre template, sans réglage template par template.
Les boutons d’axe restent actifs dans les deux modes.

Les en-têtes suivent la hiérarchie des métadonnées, avec fusions horizontales
pour les groupes et verticales pour les branches moins profondes. Un clic sur
une cellule sélectionne ses coordonnées X/Y pour les détails, le benchmark et
l’historique. Les données absentes sont affichées par un tiret ; les vrais zéros
restent à zéro. Les templates sans les deux dimensions X et Y affichent une
indication d’indisponibilité. L’export Excel conserve les libellés complets et
les codes des colonnes.

Vérification sans navigateur : `node scripts/testExplorerXY.mjs`.

## Requêtes Explorer

**Generate query** ouvre immédiatement la requête et la conserve dans le bouton
**Query**. Les plages sélectionnées (y compris plusieurs plages avec Ctrl/Cmd)
sont incluses ; **Add to query** les ajoute à la requête conservée. Les doublons
sont éliminés. Les filtres X/Y et dates sont factorisés sans inclure de
combinaisons non sélectionnées. La JST de chaque point est conservée.

Les données ITS interrogent `crp_agora.agora_its_bft_current` ; les KRI
interrogent `crp_agora.agora_dm_imas_kris_raw` via `kri_data_point_id`. Une
sélection mixte produit une union avec les mêmes colonnes de sortie. Les
coordonnées brutes proviennent du dataset. Le SQL est indenté et les listes
`IN` sont réparties sur plusieurs lignes.

Vérification sans navigateur ni connexion Hive :
`node scripts/testExplorerHiveQuery.mjs` (exécution sur une base SQL de test).
