# IRB risk-weight model — first analytical view

This module is separate from **Standardised vs IRB**. It explores the one-factor Gaussian (Vasicek/ASRF) risk-weight function used in the IRB framework. It is an educational approximation at reporting-class level, not a reconstruction of an institution's regulatory calculation.

## Calculation

For a non-defaulted exposure, with PD and LGD expressed as fractions:

- Asset correlation `R` is `0.24 - 0.12 f50(PD)` for corporate, sovereign and institution exposures, where `fα(PD) = (1 - exp(-α PD)) / (1 - exp(-α))`. A corporate SME turnover adjustment may reduce it when turnover is known; qualifying financial institutions may have a 1.25 multiplier. Neither adjustment is inferred from the C_08.01 aggregate.
- Retail residential mortgages use `R = 0.15`; qualifying revolving retail uses `R = 0.04`; other retail uses `R = 0.16 - 0.13 f35(PD)`.
- Stressed default probability is `N((G(PD) + sqrt(R) G(0.999)) / sqrt(1-R))`, with standard-normal CDF `N` and inverse CDF `G`.
- Expected loss rate is `PD × LGD`. Conditional loss at the 99.9% systemic stress is `stressed PD × LGD`. Their difference is the unexpected loss before maturity adjustment.
- For corporate, sovereign and institution exposures, `b = (0.11852 - 0.05478 ln(PD))²` and the maturity multiplier is `(1 + (M - 2.5)b)/(1 - 1.5b)`. Retail has no maturity multiplier.
- `RWA = max(0, unexpected loss rate × maturity multiplier) × 12.5 × EAD`. There is no legacy 1.06 scaling multiplier for the post-2025 CRR3 view.

The chart occupies only the right pane; dragging the separator resizes it while the reporting class and parameter sliders remain visible in the left pane. Its bell curve is the **standard-normal common economic shock**, not a normal distribution of portfolio losses. Two vertical markers locate the shock whose conditional loss equals `PD × LGD` and the 99.9th-percentile shock. A second curve maps the same shocks to conditional losses; the bracket at the stress marker measures `L₉₉.₉ − EL` before the maturity adjustment. The asset-correlation slider overrides the Basel correlation for an illustrative scenario; the dotted conditional-loss curve retains the Basel baseline. The expected loss rate stays fixed when only correlation changes, whereas tail loss and RWA change. Restoring reported inputs also restores the Basel correlation function.

The illustrative correlation slider spans 0–80%. At `R = 0`, conditional loss is exactly `PD × LGD` for every common-factor shock, so the loss curve is flat and unexpected loss and model RWA are zero. The green EL-equivalent marker uses the continuous-limit coordinate zero. Values near 80% are stress illustrations and are not presented as Basel-prescribed correlations for the chosen exposure class.

A separate time-path illustration draws 60 independent annual values of an **adverse** common factor `S ~ N(0,1)` with a deterministic seed. "New draw" changes only this illustration. The theoretical factor has mean zero, variance one and a 99.9th percentile of approximately `+3.09`; the displayed finite sample will have different empirical moments and normally will not reach that rare threshold. The IRB capital formula itself is a one-year, static portfolio calculation and does not prescribe temporal persistence, so the chart is not historical data, a forecast, or a fitted macroeconomic series. In the latent-asset interpretation, `Aᵢ = −√R S + √(1−R) εᵢ` with independent borrower-specific `εᵢ ~ N(0,1)`. R is the common-factor share of latent asset-return variance, not the variance of S and not necessarily observed price correlation.

**Why the green marker can move right when PD falls:** the horizontal axis measures the severity of the common economic shock, not the amount of loss. Its position solves `conditional_loss(shock) = PD × LGD`. With LGD fixed, a lower PD always lowers EL. In the corporate illustration, PD 4% and LGD 30% yield EL 1.2%; PD 1% yields EL 0.3%, although the equivalent-shock coordinate moves from about 0.33 to 0.54 standard deviations. This is a coordinate change, not a higher EL.

The numerical test checks the function against Basel's published examples for PD 1%, LGD 45% and maturity 2.5 years: corporate 92.32%, residential mortgage 56.40%, qualifying revolving retail 17.22%, and other retail 45.77%.

## Reported inputs and comparison

Frameworks 4.0 and 4.2 are read from the existing taxonomy history. The first view offers one C_08.01 Z class at a time, not totals that mix risk-weight functions. The class codes are declared in [`app/src/data/irbMechanics.js`](../app/src/data/irbMechanics.js).

| Measure | C_08.01 X | Preferred Y | Fallback Y |
| --- | --- | --- | --- |
| PD, exposure-weighted aggregate | 0010 | 0070 | 0010 |
| LGD, exposure-weighted aggregate | 0230 | 0070 | 0010 |
| Effective maturity, days | 0250 | 0070 | 0010 |
| Exposure value / EAD | 0110 | 0010 | — |
| Reported RWA before supporting factors | 0255 | 0010 | — |
| Reported RWA after supporting factors | 0260 | 0010 | — |
| Reported expected loss amount | 0280 | 0010 | — |

Missing PD, LGD, maturity or EAD receives a *labelled illustrative assumption* (1%, 45%, 2.5 years, €100m respectively). Conflicting duplicate cells are not silently combined. Peer risk weights are directly reported `X 0255 / X 0110`, not model estimates.

## Why model and reported RWA can differ

The formula applies per exposure or homogeneous grade/pool. The C_08.01 values above are exposure-weighted averages for a reporting class; applying a nonlinear formula once to those averages does not equal summing per-exposure RWA. A class can also include defaulted exposures, slotting, credit protection, different maturities, SME firm-size adjustment and financial-sector correlation uplift. C_08.01 column 0230 can exclude large financial-sector entities that are instead reported in 0240. Supporting factors affect column 0260, while the model output is more naturally compared with pre-supporting-factor 0255. None of those effects is fabricated from missing details.

Later, C_08.02 rating-grade/pool data can replace the single class-level approximation with a weighted sum across reported grades.

## Sources

- [Basel Framework CRE31, IRB risk-weight functions](https://www.bis.org/committees/bcbs/basel-framework/standard/cre/31/inforce/2023-01-01/published/2020-03-27)
- [Basel Committee explanatory note on the asymptotic single risk factor model](https://www.bis.org/bcbs/irbriskweight.pdf)
- [Basel CRE99, published illustrative risk weights](https://www.bis.org/committees/bcbs/basel-framework/standard/cre/99/inforce/2019-12-15/published/2019-12-15)
- [EBA Q&A 2013_564, exposure-weighted C_08.01 PD](https://www.eba.europa.eu/single-rule-book-qa/qna/view/publicId/2013_564)
- [EBA statement on CRR3, including removal of 1.06](https://eba.europa.eu/sites/default/files/2024-07/dcb8e85c-2025-4fb7-a2c9-28ada314c507/CRR3%20IRB%20statement.pdf)
