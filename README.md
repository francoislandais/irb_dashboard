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
Chaque HTML contient le code, les styles et les CSV de configuration de la version du dépôt utilisée lors de sa génération, notamment le dictionnaire des dimensions et l'historique des taxonomies. Après une mise à jour du dépôt, il faut régénérer les HTML : les fichiers déjà exportés ne se mettent pas à jour automatiquement.

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

### Mise à jour globale

Le paramétrage est un **dossier de fichiers TOML**, un fichier par application exportée. Quatre exemples éditables figurent dans `examples/global-update/`. Chaque fichier définit les LEI ou les clusters et le niveau de consolidation une seule fois, puis autant de blocs `[[extractions]]` que nécessaire. Chaque bloc a sa propre sélection de templates ou de KRI, sa fréquence et sa profondeur d'historique :

```toml
name = "Mon application"
leis = ["5493001KJTIIGC8Y1R12"]
consolidation = "HIGHEST"

[[extractions]]
category = "FINREP"
label = "FINREP principal"
module = "FINREP"
templates = ["F_xx% xx<48", "!F_20.04%", "!F_40%"]
history_years = 2
frequency = "QUARTERLY"

[[extractions]]
category = "KRI de liquidité"
label = "KRI de liquidité"
module = "KRI"
kri_ids = ["LIQ55"]
history_years = 3
frequency = "MONTHLY"
```

`name` détermine le nom de sortie ; `leis` contient des LEI de 20 caractères. Pour sélectionner par cluster à la place, omettre `leis` ou écrire `leis = []`, puis ajouter par exemple `cluster = ["CLUSTER_A", "CLUSTER_B"]` dans le bloc global. Une liste non vide génère `cluster IN (...)` dans la requête institutionnelle et dans les requêtes de données ITS et KRI ; elle est prioritaire si `leis` est aussi renseigné. `clusters` est également accepté comme nom de champ, mais il ne faut pas écrire les deux. TOML ne possède pas de valeur `null` : une liste vide ou l'absence du champ représente le choix non renseigné. Au moins un LEI ou un cluster est requis. Les valeurs de cluster sont des chaînes exactes, sans joker, et conservent leur casse. `consolidation` accepte `HIGHEST`, `CONSO`, `SOLO`, `CONSO+SOLO` ou `ALL` (CONSO, SOLO et SUBLIQ). `frequency` accepte `MONTHLY`, `QUARTERLY`, `SEMI_ANNUAL` ou `ANNUAL` ; `history_years` est un entier positif. `category` et `label` sont facultatifs : ils organisent l'index des requêtes, sans changer le filtrage Hive. Les extractions sont exécutées dans l'ordre des blocs, et les fichiers dans l'ordre de leur nom.

`module` accepte un nom exact (`module = "COREP"`), plusieurs noms (`module = ["COREP", "FINREP"]`) ou des morceaux avec `%` comme joker (`module = ["COREP%", "%FINREP%"]`). Les entrées d'une liste sont réunies par **OU** sur `module_id`. `%` peut se trouver au début, au milieu ou à la fin ; `_` reste littéral. `module = "ITS"` interroge la table ITS **sans** filtre `module_id`. `module = "KRI"` utilise la table KRI : le bloc contient soit `kri_ids = ["..."]` pour des identifiants directs ou des motifs avec `%`, soit `templates = ["..."]` pour sélectionner les KRI dépendant de ces templates. Par exemple, `kri_ids = ["LIQ%", "CRFA0900"]` sélectionne les codes correspondants ; `kri_ids = ["%"]` supprime entièrement le filtre sur `kri_data_point_id` et extrait tous les KRI disponibles pour les institutions, niveaux et dates demandés. `templates = ["%"]` n'est pas équivalent : ce mode ne retient que les KRI liés à un template. `ITS` et `KRI` doivent chacun rester seuls dans leur bloc. Dans `templates`, un `%` final est un joker et `!` une exclusion ; `"F_xx% xx<48"` développe les familles F_01 à F_47.

Le dossier est validé entièrement avant la première connexion Hive : syntaxe TOML, fichiers inattendus, champs inconnus ou manquants, formats et doublons des LEI et clusters, nom de sortie en collision, sélecteurs, fréquences, années et identifiants KRI inconnus. Les fichiers temporaires (`*.amltmp`, `*.tmp`, `*.temp`, `*.swp`, `*.swo`, `*.bak`, `*~`, `~$*`) sont ignorés. Le message d'erreur indique le fichier et, pour une extraction, son numéro. Python 3.11 ou plus récent lit TOML sans dépendance ; pour Python 3.10, installer `python3 -m pip install -r scripts/requirements-global-update.txt`.

Le point d'entrée unique peut être importé :

```python
from scripts.global_update import global_update

result = global_update(mode="preview")
```

Le mode `preview` valide tout le dossier et écrit une requête SQL par extraction, la requête dédiée aux métadonnées des institutions, un manifeste et un index lisible dans `outputs/global-update-prototype/generated/preview/`. Il ne se connecte pas à Hive. Pour les KRI, le SQL de prévisualisation contient des marqueurs explicites à la place des `entity_id`, qui ne sont connus qu'après exécution de la requête des métadonnées. Sans `--config`, `preview` et `test` utilisent le dossier d'exemples.

Le mode `test` remplace ces marqueurs par les `entity_id` de la fixture, puis construit localement les datasets factices, un dictionnaire d'institutions et les applications HTML autonomes :

```sh
python3 scripts/global_update.py --mode test
```

Ce mode ne se connecte pas à Hive : les institutions et les templates disponibles viennent de `scripts/fixtures/global_update_test_entities.json`; des valeurs déterministes sont générées localement pour simuler les résultats. Il valide le flux de bout en bout et l'incorporation du dictionnaire d'institutions dans les applications exportées. Les requêtes utilisent les deux schémas fournis dans `scripts/fixtures/hive_schemas/` : l'ITS porte le LEI ; la requête KRI filtre directement les couples `entity_id` et `cons_level` extraits séparément des métadonnées ITS, sans jointure avec ITS. Le format d'`Institution ID` est `LEI_niveau`. Aucune extraction Hive réelle n'est lancée en mode `test`.

Sur une machine disposant de `vl_connect`, le mode `hive` exécute d'abord la requête des métadonnées institutionnelles via `devo.read_sql(sql)`. Il détermine ensuite les niveaux de consolidation demandés et les applique dans chaque requête de données, puis assemble les DataFrames par template, institution, coordonnées et date. Pour le mode `HIGHEST`, le filtre est directement `is_highest_cons = 'Y'` dans la requête des métadonnées et dans chaque requête de données ITS ou KRI ; cet indicateur n'est pas agrégé. Enfin, il génère un CSV et un HTML autonome par fichier :

```sh
python3 scripts/global_update.py --mode preview --config /chemin/vers/mes-applications
python3 scripts/global_update.py --mode hive --config /chemin/vers/mes-applications
```

Pour réduire facultativement la taille des CSV et des HTML générés, ajouter `--compact-values` à cette commande (ou `compact_values=True` à `global_update`). Le programme consulte le dictionnaire des dimensions et l'historique des taxonomies : les montants sont stockés comme des milliers d'euros entiers, les pourcentages avec quatre chiffres significatifs et les valeurs `Unit` sans modification. La colonne technique `value_scale=1000` signale les lignes de montants ; l'application les remet en euros avant tout calcul ou affichage. Les lignes dont le format est inconnu ou change selon les dates restent inchangées. Cette option est avec perte de précision et ne modifie pas les requêtes Hive elles-mêmes.

Il faut renseigner un dossier réel : les exemples contiennent des LEI fictifs et ne sont pas acceptés par défaut en mode `hive`. Le résultat est écrit dans un nouveau dossier horodaté sous `outputs/global-update-prototype/generated/hive/` ; `--output` permet de choisir un dossier vide. La même opération peut être lancée depuis Python avec `global_update("/chemin/vers/mes-applications", mode="hive")`, ou avec `devo_client=devo` si le client est déjà initialisé. Le package `vl_connect` et son accès Hive doivent être disponibles dans cet environnement ; ils ne sont pas nécessaires aux modes `preview` et `test`.

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
