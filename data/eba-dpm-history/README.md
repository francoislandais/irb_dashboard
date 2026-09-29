# Reconstruction historique des taxonomies EBA/DPM

Ce dossier rassemble les sources EBA, les dates d’application vérifiables et le générateur qui extrait des mappings hiérarchiques de templates, en conservant la version applicable à chaque date de référence.

## Lancer la chaîne

Depuis la racine du dépôt :

```bash
python3 -m pip install -r scripts/requirements-dpm-taxonomy.txt
python3 scripts/dpm_taxonomy/download_sources.py
python3 scripts/dpm_taxonomy/build_taxonomy.py
python3 scripts/dpm_taxonomy/build_taxonomy_preview.py
python3 scripts/dpm_taxonomy/resolve_taxonomy.py C_01.00 2021-09-30 --module COREP
```

Les archives téléchargées sont contrôlées par taille et SHA-256 puis décrites dans `download_manifest.json`. Le générateur écrit dans `generated/` :

- `versioned_dimension_mapping.csv` : mêmes colonnes de mapping que le dictionnaire de l’application (`table_id`, `coordinate`, `code`, `description`, `order_first`, `ignore`, `format`), complétées par la version, le module et la provenance;
- `template_taxonomy_history.csv` : intervalles d’application par module et template;
- `workbook_inventory.csv` : inventaire des classeurs et feuilles réellement lus;
- `build_report.json` : volumes et règles de date à compléter ou à confirmer.

La préparation de l’application s’effectue ensuite avec `build_taxonomy_preview.py`.
Elle génère aussi `app/assets/ITS_explorer_template_names.csv` et son module JavaScript
associé depuis les titres des feuilles EBA. Chaque identifiant de l’application est
associé au nom de son framework le plus récent disponible; la provenance du nom
(framework, module, classeur et feuille) reste consultable dans le CSV.

Les lignes indentées des layouts annotés deviennent des chemins hiérarchiques séparés par `/`. Les colonnes reprennent le code de colonne et le libellé terminal. Pour les layouts DPM 1.0, les feuilles numérotées d’un template fournissent les codes et libellés de l’axe Z : le générateur ne développe pas tous les membres des domaines de dictionnaire référencés, car cela ajouterait des possibilités qui ne s’appliquent pas au template. En DPM 2.0, les dimensions de feuille explicitement déclarées par `Key value` sont résolues dans le glossaire. Les autres références de propriétés ne sont pas des valeurs d’axe Z.

Pour les axes Z en devises, le générateur ordonne les codes selon `CURRENCY_Z_DISPLAY_ORDER` dans `build_taxonomy.py`. Il limite les grands domaines ouverts à 21 devises (EUR et 20 devises étrangères, dont le réal brésilien et les principaux pesos latino-américains), tout en conservant les choix natifs de synthèse comme « All currencies » et « Other currency ». Les petits domaines fermés conservent tous leurs codes. Cette sélection facilite la navigation ; le glossaire EBA source reste complet dans les fichiers téléchargés. L'ordre est un choix de présentation fondé sur les devises les plus pertinentes pour les banques européennes, et non un classement statistique des volumes déclarés.

Les suffixes de template `.a`, `.b`, etc. sont retirés et les mappings identiques fusionnés, sauf si un même code d’axe possède des libellés distincts entre suffixes ou si leurs dates d’application divergent. Ces exceptions sont listées dans `build_report.json` avec leur nombre de codes conflictuels.

Le résolveur accepte un code de template, une date de référence et, si le code existe dans plusieurs modules, le module. Les intervalles sont semi-ouverts : `effective_from` est inclus et `effective_to` ne l’est pas. Il suit les équivalences de familles lors du passage aux modules DPM 2.0 (par exemple une demande `COREP` peut retrouver un layout publié sous `COREP_OF`). Il faut tout de même fournir le module lorsqu’un même code de template est réutilisé dans plusieurs familles.

## Sources et versions

`sources.json` liste les dictionnaires, layouts annotés, pages EBA et documents de conversion. Les archives DPM 2.9.1.1, 2.10 phase 2 et 3.0.1 forment les premières bases historiques; 2.10 apporte notamment les modules temporaires COVID-19 et les versions initiales de plusieurs modules de reporting. Les versions ultérieures contiennent souvent seulement les modules modifiés. Le générateur conserve donc les snapshots par module et laisse la structure précédente en vigueur lorsqu’aucun changement de layout n’est publié.

Les classeurs DPM 1.0 (onglets `Tables`, `Domains`, `Dimensions`, `Members`, `Hierarchies`) et DPM 2.0 (glossaire `Category`, `Item`, `Property`, `SubCategory`, `SubCategoryItem`) ne décrivent pas les mêmes entités. Le parseur garde leurs codes officiels et normalise uniquement les axes et chemins destinés au format du mapping de l’application. La documentation technique DPM 2.0 et le fichier de conversion DPM 1.0 → DPM 2.0 sont inclus comme références d’audit.

Les bases DPM complètes (`.accdb` ou équivalent) ne sont pas copiées ici : plusieurs dépassent 100 Mo chacune et elles ne sont pas requises pour extraire les layouts annotés. Leurs liens officiels restent accessibles via les pages de release EBA référencées.

## Interprétation des dates

`module_release_schedule.csv` est le registre explicite des premières dates de référence attendues, avec l’URL EBA et la note qui justifie chaque règle. Le résolveur choisit, pour un module/template et une date donnée, la dernière version dont `effective_from` est antérieure ou égale à la date. Un module absent d’une release garde la dernière version connue. Les versions provisoires ou remplacées ont un statut distinct et ne remplacent pas une version applicable.

Les dates données par l’EBA sont parfois au niveau du module, parfois au niveau du type de template, parfois rétroactives ou provisoires. Les règles connues sont inscrites avec leur source et leur portée; les exceptions provisoires ou non applicables restent sans date. Le générateur ne déduit pas les dates à partir du seul numéro de release. Les changements de codes de module à travers DPM 1.0 et DPM 2.0 restent séparés dans l’historique; le résolveur suit une famille de modules lorsqu’elle est demandée, et signale les codes de template qui demeurent ambigus entre plusieurs modules. Les modules de SBP 4.2 ont des dates distinctes : SBP_CR en décembre 2025, SBPIMV en février 2026, puis le reste selon les règles du paquet 4.2.

## Points de contrôle

- Comparer un jeu de codes X/Y/Z extrait à `app/assets/ITS_all_dimension_mapping.csv` pour les templates communs;
- vérifier manuellement les modules à date fractionnée et les templates créés après 2021;
- examiner les entrées `needs_effective_date` et les feuilles dont l’indentation ou les clés ne sont pas interprétées;
- ne pas sélectionner une version historique sur le seul libellé du framework si le module possède une date d’application différente.

Les sources brutes restent des publications de l’EBA, citées dans `sources.json` et `download_manifest.json`. Toute correction de la chronologie locale doit conserver l’URL, le passage de référence et le niveau de précision utilisé.
