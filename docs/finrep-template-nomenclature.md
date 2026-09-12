# FINREP and EBA F-template nomenclature

## Scope and conclusion

The application contains 104 distinct templates from `F_01.01` to `F_47.00`. Every one now has a non-empty English description in `EXPLORER_TEMPLATE_LABELS`. The revised wording follows the official template inventory in Annex I to Commission Implementing Regulation (EU) 2024/3117, while remaining concise enough for navigation in Agora Explorer.^1

The EBA reporting framework 4.2 page was used as the release-level control. Framework 4.2 is the current technical package, and its FINREP module is rooted in the same regulatory template inventory.^2 The EBA reporting-framework overview was also checked to distinguish changes to the reporting technology and DPM dictionary from changes to the legal meaning of the templates.^3

## Editorial rules

- Preserve the exact template granularity. Variants such as `F_04.02.1`, `F_09.01.1`, `F_11.03.1`, `F_13.02.1`, `F_16.04.1` and `F_20.07.1` have their own descriptions.
- State the measurement basis or portfolio whenever it distinguishes two neighbouring templates.
- State “national GAAP” only for variants that Annex I identifies as GAAP-specific.
- Prefer the official accounting concept over an inferred use. For example, `F_12.02` is “Transfers between impairment stages (gross-basis presentation)”, not a generic change in gross carrying amount.
- Keep established regulatory terminology: “held for trading”, “fair value through profit or loss”, “fair value through other comprehensive income”, “amortised cost”, “counterparty sector”, “forborne” and “non-performing”.
- Use a concise navigation label rather than copying every introductory word from the legal title. The meaning and scope are preserved.

## Material corrections

| Template | Previous description | Revised description |
|---|---|---|
| F_04.02.1 | Loans and advances | Non-trading financial assets mandatorily at fair value through profit or loss by instrument and counterparty sector |
| F_04.03.1 | Debt securities | Financial assets at fair value through other comprehensive income by instrument and counterparty sector |
| F_04.05 | Collateral and guarantees | Subordinated financial assets |
| F_04.07 | Purchased or originated credit-impaired assets | Non-trading non-derivative financial assets at fair value through profit or loss by instrument and counterparty sector (national GAAP) |
| F_09.02 | Financial guarantees | Loan commitments, financial guarantees and other commitments received |
| F_11.03 | Hedged items | Non-derivative hedging instruments by accounting portfolio and type of hedge |
| F_11.04 | Hedge effectiveness | Hedged items in fair value hedges |
| F_12.01 | Stage transfers | Movements in allowances and provisions for credit losses |
| F_12.02 | Changes in GCA | Transfers between impairment stages (gross-basis presentation) |
| F_17.02 | Reconciliation of provisions | Reconciliation between accounting and CRR scopes of consolidation: off-balance-sheet exposures given |
| F_18.01 | Performing / non-performing by instrument | Inflows and outflows of non-performing loans and advances by counterparty sector |
| F_24.01 | Loan origination | Inflows and outflows of non-performing loans and advances |
| F_24.02 | Loan servicing | Impairment flows and fair-value losses on non-performing loans and advances |
| F_42.00 | Financial guarantees received | Tangible and intangible assets by measurement method |
| F_44.01–04 | Commitments | Defined-benefit-plan and staff-expense templates, identified separately |
| F_45.01–03 | Equity instruments | Selected profit-or-loss items, identified separately |

## Template families

| Range | Regulatory subject |
|---|---|
| F_01–F_03 | Primary financial statements: balance sheet, profit or loss, comprehensive income |
| F_04–F_08 | Financial assets, loans, past-due assets and financial liabilities |
| F_09–F_13 | Off-balance-sheet commitments, derivatives, hedge accounting, credit-loss allowances and collateral |
| F_14–F_19 | Fair value, derecognition, profit-or-loss detail, consolidation-scope reconciliation, non-performing and forborne exposures |
| F_20–F_26 | Geographical detail, services, loan-level aggregates, NPE flows, possessed collateral and forbearance management |
| F_30–F_31 | Unconsolidated structured entities and related parties |
| F_32–F_36 | Asset encumbrance reporting, not FINREP financial-statement reporting |
| F_40–F_47 | Group structure, fair value, fixed assets, provisions, employee benefits, profit-or-loss detail, equity changes and recovery periods |

## Asset encumbrance boundary

Templates `F_32.01` to `F_36.02` use the `F` prefix but Annex I places them in the separate Asset Encumbrance section. They are therefore labelled with an explicit “Asset encumbrance —” prefix in the application. This prevents users from mistaking `F_32.01` (“Assets of the reporting institution”) or `F_35.00` (“Covered-bond issuance”) for ordinary FINREP financial statements.^1

## Coverage controls

- 104 template identifiers in the application metadata fall between F_01 and F_47.
- 104 of those identifiers have a revised description.
- IFRS-specific, GAAP-specific and Asset Encumbrance variants are kept distinct.
- `F_40.01` and `F_40.02` are included in the canonical map even though they are not present in the current metadata extract, so future datasets receive the correct labels automatically.

## Sources

1. European Union. “[Commission Implementing Regulation (EU) 2024/3117 — authentic Official Journal PDF, Annex I](https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=OJ:L_202403117).” 29 November 2024, current consolidated version referenced by EUR-Lex on 29 December 2025.
2. European Banking Authority. “[Reporting framework 4.2](https://www.eba.europa.eu/risk-and-data-analysis/reporting-frameworks/reporting-framework-42).” Technical package and FINREP taxonomy materials, 2025–2026.
3. European Banking Authority. “[Reporting frameworks](https://www.eba.europa.eu/risk-and-data-analysis/reporting/reporting-frameworks).” Release overview and applicability calendar.
