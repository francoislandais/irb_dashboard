# Standardised / IRB historical bridge

The dashboard compares C_07.00 (standardised approach) with C_08.01 (IRB). Its crosswalk is implemented in [`app/src/data/approachBenchmark.js`](../app/src/data/approachBenchmark.js), in `APPROACH_TAXONOMY_MAP`. This document describes the intended interpretation. The authoritative local input for all codes and labels is [`app/assets/ITS_all_dimension_mapping.csv`](../app/assets/ITS_all_dimension_mapping.csv); applicable dates come from [`app/assets/ITS_template_taxonomy_history.csv`](../app/assets/ITS_template_taxonomy_history.csv).

The bridge starts at framework **3.2**, the last pre-CRR3 layout in this project, and continues through **4.0** and **4.2**. Earlier versions are deliberately excluded. [EBA framework 3.2](https://www.eba.europa.eu/risk-and-data-analysis/reporting/reporting-frameworks/reporting-framework-32) and [framework 4.0](https://eba.europa.eu/risk-and-data-analysis/reporting/reporting-frameworks/reporting-framework-40) document the release boundary; the EBA dates 4.0's CRR3 changes from March 2025. The application resolves the framework separately for each template and reference date, and compares only dates where the two templates resolve to the same supported framework.

## Measures

| Measure | C_07.00 X | C_08.01 X | Interpretation |
| --- | --- | --- | --- |
| Original exposure | 0010 | 0020 | Before conversion factors |
| After CRM | 0110 | 0090 | After substitution, before conversion factors |
| EAD / exposure value | 0200 | 0110 | Principal basis for the approach share |
| RWA | 0220 | 0260 | After supporting factors; standardised 4.0/4.2 also reflects FX mismatch |

These X codes and total row Y `0010` occur in all three supported frameworks. The SME standardised subset uses Y `0020` instead. Every table value is read from the corresponding reported X coordinate; the four stages are **not** added together.

## Z-axis crosswalk

Codes joined with `+` are summed only within that approach and group. A parent total is not added to its children. In 3.2, IRB `0001` and `0002` are separate IRB A and IRB F totals. In 4.0/4.2, `qx01` is a reported total but is missing for several institutions in the inspected dataset; the bridge reconstructs it from IRB A `qx2023`, IRB F `qx2022`, and CIU `qx2082` where reported. In the inspected dataset, all 24 non-empty `qx01` values across the four dashboard stages and two post-CRR3 dates reconcile with this decomposition.

| Analytical group | 3.2 C_07.00 | 3.2 C_08.01 | 4.0/4.2 C_07.00 | 4.0/4.2 C_08.01 |
| --- | --- | --- | --- | --- |
| All exposures | 0001 | 0001 + 0002 | qx01 | qx2023 + qx2022 + qx2082 |
| Central governments & central banks | 0002 | 0003 + 0004 | qx16 | qx2020 + qx2021 |
| Regional authorities & public-sector entities | 0003 + 0004 | **Not isolated** | qx23 + qx22 | qx2071 + qx2072 + qx2073 + qx2074 |
| Institutions | 0007 | 0005 + 0006 | qx19 | qx2018 |
| Corporates | 0008 | 0007 + 0008 + 0009 + 0010 + 0011 + 0012 | qx2036 + qx2037 | qx2012 + qx2013 + qx2014 + qx2015 + qx2075 + qx2076 |
| Retail, excluding property-secured | 0009 | 0015 + 0016 + 0017 | qx26 | qx2009 + qx2055 + qx2081 |
| SMEs, memo subset | Y 0020 / Z 0001 | 0007 + 0008 + 0013 + 0016 | Y 0020 / Z qx01 | qx2079 + qx2080 + qx2008 + qx2011 |

The standardised short-term assessment class mixes institutions and corporates (3.2 `0014`, post-CRR3 `qx18`), so it is excluded from both corresponding analytical groups. Post-CRR3 `qx17` is a corporate heading in the dictionary but the inspected dataset reports its amounts under `qx2036` (other) and `qx2037` (specialised lending); using the heading would produce a false zero share. The SME subset overlaps corporate and retail exposures and must not be added to either group or to the total. Property-secured exposures have a different perimeter across the two approaches; the narrow retail comparison excludes them on both sides. Regional/public-sector IRB exposures cannot be isolated from the 3.2 Z axis, so no historical cross-approach share is calculated for that group.

An empty source cell is omitted from a group sum, with reported-class coverage shown in the dashboard. If one mapped approach has no reported cell and the other has a positive reported amount, its share contribution is zero. A class that **does not exist as a separate 3.2 category** is different from an empty cell: it makes the corresponding group comparison unavailable. Conflicting non-empty values for an identical data point also make that sum unavailable.

This crosswalk aligns reporting categories for exploratory analysis; it does not claim that CRR3 left the economic definition or risk-weighting of those categories unchanged. Interpret changes across 2025 as a reporting and regulatory break as well as a possible portfolio change.
