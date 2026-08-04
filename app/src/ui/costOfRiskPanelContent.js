import { COST_OF_RISK_DEFINITION_OPTIONS } from "../data/costOfRisk.js?v=20260804-lazy-index";

export function getCostOfRiskHelpPanelContent(topic, activeCostOfRiskDefinitionId = "f12-selected-components") {
  if (!topic) return null;

  if (topic.startsWith("cost-risk-definition:")) {
    const definitionId = topic.split(":")[1] || activeCostOfRiskDefinitionId;
    const definition = COST_OF_RISK_DEFINITION_OPTIONS.find((option) => option.id === definitionId)
      ?? COST_OF_RISK_DEFINITION_OPTIONS[0];
    const isF02Definition = definition.id === "f02-impairment";
    return {
      eyebrow: "Cost of risk method",
      title: definition.label,
      lead: definition.description,
      sections: [
        {
          title: "Regulatory source",
          body: definition.source
        },
        {
          title: "Selected components",
          body: (definition.components ?? []).join("\n")
        },
        {
          title: "What it represents",
          body: isF02Definition
            ? "This method reads cost of risk directly from the FINREP income statement. It is close to the reported P&L impairment measure, but it does not expose the underlying allowance movement components."
            : "This method reconstructs cost of risk from selected F_12.01 movements. It is designed for analysis because the same definition can be decomposed by component, stage, counterparty and instrument where FINREP provides the detail."
        }
      ],
      hint: "Changing the method immediately recomputes the selected value, the drivers and the time series."
    };
  }

  if (topic.startsWith("smoothing:")) {
    const windowSize = Math.max(1, Math.min(4, Number(topic.split(":")[1]) || 1));
    return {
      eyebrow: "Time series option",
      title: windowSize > 1 ? `Smoothing ${windowSize}Q` : "Raw figures",
      lead: windowSize > 1
        ? `Rolling ${windowSize}Q average.`
        : "Raw figures, no smoothing.",
      sections: [
        {
          title: "How it is calculated",
          body: windowSize > 1
            ? `For each point, the chart averages the current quarter and up to ${windowSize - 1} preceding quarters when they are available. This reduces short-term volatility while preserving the direction of the selected series.`
            : "Each point corresponds to the reported quarterly value, without any rolling average."
        },
        {
          title: "Scope",
          body: "Smoothing affects the temporal chart only. It does not change the underlying FINREP data or the selected perimeter."
        }
      ],
      control: {
        type: "smoothing",
        windowSize
      },
      hint: windowSize > 1
        ? "The chart badge shows the active smoothing window. Use its cross to return to raw figures."
        : "Move the slider to apply smoothing to the temporal chart."
    };
  }

  const content = {
    "reference-date": {
      eyebrow: "Reference date",
      title: "Reference Date",
      lead: "The reference date is the quarter currently used to populate the upper view and the audit trail.",
      sections: [
        {
          title: "What it controls",
          body: "Tables, flow diagrams and selected values use this quarter as their current observation date. When a metric is a variation, the calculation may also use the previous quarter where the methodology requires it."
        },
        {
          title: "How to change it",
          body: "Click any point on the temporal chart in the lower part of the tab to set a new reference quarter. You can change it as often as needed while exploring the same perimeter."
        }
      ],
      hint: "The date chip always shows the active reference quarter."
    },
    "stage-transfer-absolute": {
      eyebrow: "Transfer display",
      title: "Absolute Transfer",
      lead: "Absolute transfer shows the amount of exposure that moved through the selected stage-transfer flow.",
      sections: [
        {
          title: "Numerator",
          body: "The numerator is the quarterly transfer amount reported in F_12.02 for the selected flow and perimeter."
        },
        {
          title: "Unit",
          body: "Values are displayed in the selected monetary unit. No denominator is applied."
        }
      ],
      hint: "Switch to Relative Transfer to express the same flow against the exposure base."
    },
    "stage-transfer-relative": {
      eyebrow: "Transfer display",
      title: "Relative Transfer",
      lead: "Relative transfer expresses a stage-transfer flow as a contribution relative to the exposure base.",
      sections: [
        {
          title: "Numerator",
          body: "The numerator is the selected transfer amount from F_12.02, either as a quarterly flow or as a year-to-date amount."
        },
        {
          title: "Denominator",
          body: "The denominator is the GCA from F_18.00 on the selected instruments and counterparty perimeter, taken across all stages and excluding central bank cash where relevant. Quarterly flow uses the previous quarter; Year to date uses the first quarter of the year."
        },
        {
          title: "Formula",
          body: "Relative transfer = transfer amount divided by the aligned exposure denominator, displayed in basis points."
        }
      ],
      hint: "Use this mode to compare transfer intensity across JSTs and across time."
    },
    "npl-flow-absolute": {
      eyebrow: "NPL flow display",
      title: "Absolute Flow",
      lead: "Absolute flow shows the quarterly amount of NPL inflows, outflows or net flow reported in F_18.01.",
      sections: [
        {
          title: "Numerator",
          body: "The numerator is read from F_18.01 for loans and advances: c010 for inflows and c020 for outflows. Outflows are displayed with a negative sign so the net flow is intuitive."
        },
        {
          title: "Unit",
          body: "Values are displayed in the selected monetary unit. No denominator is applied."
        }
      ],
      hint: "Switch to Relative Flow to compare NPL flow intensity across JSTs."
    },
    "npl-flow-relative": {
      eyebrow: "NPL flow display",
      title: "Relative Flow",
      lead: "Relative flow expresses NPL inflows, outflows or net flow against the exposure base.",
      sections: [
        {
          title: "Numerator",
          body: "The numerator is the selected F_18.01 NPL flow: inflow, outflow or net inflow minus outflow."
        },
        {
          title: "Denominator",
          body: "The denominator is the previous-quarter GCA of loans and advances on the selected counterparty perimeter."
        },
        {
          title: "Formula",
          body: "Relative flow = selected NPL flow divided by previous-quarter loans and advances exposure, displayed in basis points."
        }
      ],
      hint: "This mode is best suited for benchmarking NPL formation and cure intensity."
    },
    "movement-absolute": {
      eyebrow: "Allowance movement display",
      title: "Absolute Contribution",
      lead: "Absolute contribution shows the amount by which a selected FINREP component changes the stock of allowances.",
      sections: [
        {
          title: "Numerator",
          body: "The value is the selected movement component from F_12.01, on the current perimeter."
        },
        {
          title: "Unit",
          body: "Values are displayed in the selected monetary unit. No denominator is applied."
        }
      ],
      hint: "Switch to Relative Contribution to compare allowance movements against the exposure base."
    },
    "movement-relative": {
      eyebrow: "Allowance movement display",
      title: "Relative Contribution",
      lead: "Relative contribution expresses an allowance movement against the corresponding exposure base.",
      sections: [
        {
          title: "Numerator",
          body: "The numerator is the selected F_12.01 allowance movement component, either as a quarterly flow or as a year-to-date amount."
        },
        {
          title: "Denominator",
          body: "The denominator is the exposure base from F_18.00, filtered by the selected instruments, counterparty and stage where available. Quarterly flow uses the previous quarter; Year to date uses the first quarter of the year."
        },
        {
          title: "Formula",
          body: "Relative contribution = allowance movement divided by the aligned exposure denominator, displayed in basis points."
        }
      ],
      hint: "This is a contribution-to-exposure measure, not a growth rate of allowances."
    },
    "cost-risk-absolute": {
      eyebrow: "Cost of risk display",
      title: "Absolute Value",
      lead: "Absolute value shows the selected cost of risk definition as a quarterly amount.",
      sections: [
        {
          title: "Numerator",
          body: "The value is either the direct F_02.00 impairment line or the selected sum of F_12.01 components, depending on the active cost of risk definition."
        },
        {
          title: "Unit",
          body: "Values are displayed in the selected monetary unit. No exposure denominator is applied."
        }
      ],
      hint: "Switch to Basis points to compare the intensity of cost of risk across JSTs and over time."
    },
    "cost-risk-relative": {
      eyebrow: "Cost of risk display",
      title: "Basis Points",
      lead: "Basis points express the selected cost of risk definition relative to the exposure base.",
      sections: [
        {
          title: "Numerator",
          body: "The numerator is the selected quarterly cost of risk amount, after applying the active definition and perimeter filters."
        },
        {
          title: "Denominator",
          body: "The denominator is the previous-quarter exposure base used elsewhere in this module for movement-style measures."
        },
        {
          title: "Formula",
          body: "Cost of risk in basis points = selected cost of risk amount divided by the exposure denominator."
        }
      ],
      hint: "This mode is generally better suited for benchmarking."
    },
    "summary-absolute": {
      eyebrow: "Summary display",
      title: "Absolute Value",
      lead: "Absolute value shows the underlying amount behind each Summary ratio.",
      sections: [
        {
          title: "Displayed values",
          body: "Exposure ratio is shown as GCA, coverage as allowances, and collateral as collateral received."
        },
        {
          title: "Unit",
          body: "Values are displayed in the unit selected in the application header."
        }
      ],
      hint: "Switch to Ratio to read the same cells as percentages."
    },
    "summary-relative": {
      eyebrow: "Summary display",
      title: "Ratio",
      lead: "Ratio displays the Summary cells as percentages.",
      sections: [
        {
          title: "Exposure ratio",
          body: "GCA for the selected row is divided by the GCA of the selected perimeter."
        },
        {
          title: "Coverage and collateral",
          body: "Coverage is allowances divided by GCA. Collateral is collateral received divided by GCA."
        },
        {
          title: "Format",
          body: "Values are displayed as percentages for quick cross-sectional reading."
        }
      ],
      hint: "Switch to Absolute Value to see the underlying amounts."
    },
    "y-focus-on": {
      eyebrow: "Chart scale",
      title: "Focused JST axis",
      lead: "The Y-axis is now driven by the selected JST curve.",
      sections: [
        {
          title: "What changes",
          body: "The chart chooses its vertical bounds from the selected JST series, with a small margin so that its movements are easier to read."
        },
        {
          title: "What may happen",
          body: "Peer curves or percentile lines can move partly outside the visible area if they take more extreme values."
        }
      ],
      hint: "Turn the button off to return to a global scale that includes the full benchmark range."
    },
    "y-focus-off": {
      eyebrow: "Chart scale",
      title: "Global benchmark axis",
      lead: "The Y-axis is sized to include the benchmark range.",
      sections: [
        {
          title: "What changes",
          body: "The selected JST, peers and anonymised percentile lines are all considered when setting the vertical bounds."
        },
        {
          title: "Trade-off",
          body: "This makes comparison easier, but the selected JST curve may look flatter when benchmark dispersion is large."
        }
      ],
      hint: "Turn on Focus JST axis when the selected JST curve needs to be read more precisely."
    },
    "peer-explicit": {
      eyebrow: "Peer display",
      title: "Explicit peer display",
      lead: "Benchmark charts show each peer JST as an individual labelled curve.",
      sections: [
        {
          title: "What changes",
          body: "The selected JST remains highlighted, while the peer institutions selected through the Peers control are displayed as separate time series."
        },
        {
          title: "How to read it",
          body: "This mode is useful when the identity and trajectory of each peer matter. Endpoint labels show JST codes directly on the right-hand side of the chart."
        },
        {
          title: "Confidentiality",
          body: "Because peer JST codes are visible, this mode is best suited to internal analysis where explicit peer identification is acceptable."
        }
      ],
      hint: "Switch to Anonymized when the benchmark should be read as a distribution rather than as named peer curves."
    },
    "peer-anonymised": {
      eyebrow: "Peer display",
      title: "Anonymized peer display",
      lead: "Benchmark charts replace named peer curves with an anonymized peer distribution.",
      sections: [
        {
          title: "What changes",
          body: "The selected JST remains visible, but individual peer JST codes are hidden. The chart displays percentile curves and quantile areas instead."
        },
        {
          title: "How to read it",
          body: "Use this mode to compare the selected JST against the peer distribution without focusing on the identity of any individual peer."
        },
        {
          title: "Distribution",
          body: "The anonymized view shows indicators such as median and percentile bands when enough peer observations are available for the selected date."
        }
      ],
      hint: "Switch to Explicit when you need to inspect the trajectory of individual peer JSTs."
    }
  };

  return content[topic] ?? null;
}

export function getCostOfRiskAuditPanelIntroContent(tab) {
  const content = {
    summary: {
      eyebrow: "Overview",
      title: "Summary",
      lead: "This view gives a compact reading of the selected perimeter using FINREP F_18.00. It is designed as a first checkpoint before moving into the more analytical tabs.",
      sections: [
        {
          title: "What you see",
          body: "The upper panel is a mosaic of key ratios for the selected reference date: exposure mix by stage and performing status, coverage ratios, and collateralisation ratios."
        },
        {
          title: "How to use it",
          body: "Click a card to benchmark that ratio in the time chart below. Each card shows the current ratio and its quarter-on-quarter variation."
        },
        {
          title: "Source",
          body: "Figures are built from F_18.00, with the active instruments, counterparty, staging status and balance-scope filters applied where the regulatory template supports that level of detail."
        }
      ],
      hint: "The Summary is designed as a quick cross-sectional reading before moving into the specialised tabs."
    },
    "cost-of-risk": {
      eyebrow: "Risk charge",
      title: "Cost of Risk",
      lead: "This view focuses on the actual cost of risk measure. It lets you compare a direct F02 definition with a selected F12 component-based definition.",
      sections: [
        {
          title: "Definitions",
          body: "F02 impairment uses F_02.00 row 460. EBA definition sums F_12.01 columns 020, 040, 050, 070, 090, 110 and 120 on the selected perimeter."
        },
        {
          title: "Display",
          body: "Absolute value mode shows either the quarterly amount or the year-to-date amount. Basis-points mode divides that amount by the aligned exposure denominator: previous quarter for quarterly flow, first quarter of the year for Year to date."
        },
        {
          title: "Drivers",
          body: "The upper panel ranks the largest F12 component × detailed FINREP row combinations for the selected quarter, so drivers can point to stage, counterparty and instrument type when that granularity is available."
        }
      ],
      hint: "Use the definition switch to compare F02 and F12 views, then use the time chart for benchmark context."
    },
    "stage-ratio": {
      eyebrow: "Stage mix",
      title: "Exposure Ratio",
      lead: "This view measures the share of the selected exposure perimeter that sits in a selected IFRS stage or in the F_18.00 performing / non-performing breakdown.",
      sections: [
        {
          title: "What you see",
          body: "The upper panel focuses on the selected category. It shows the exposure ratio, its quarter-on-quarter change, and the numerator and denominator components that explain the movement."
        },
        {
          title: "How it is calculated",
          body: "Exposure ratio = GCA of the selected category divided by total GCA of the perimeter. The variation is decomposed with a two-factor Shapley method, averaging the numerator-first and denominator-first paths."
        },
        {
          title: "Source",
          body: "Figures are built from FINREP F_18.00. Instruments and counterparty filters define the perimeter; the stage selector can target either an IFRS stage or the performing / non-performing status."
        }
      ],
      hint: "Click any value in the upper panel to benchmark the selected ratio or decomposition effect over time."
    },
    "coverage-ratio": {
      eyebrow: "Allowance coverage",
      title: "Coverage Ratio",
      lead: "This view measures allowances as a share of GCA for the selected stage or performing status.",
      sections: [
        {
          title: "What you see",
          body: "The upper panel focuses on the selected category. It shows the coverage ratio, its quarter-on-quarter change, and the allowance and GCA components that explain the movement."
        },
        {
          title: "How it is calculated",
          body: "Coverage ratio = allowances for the stage divided by GCA for the same stage. The variation is decomposed with a two-factor Shapley method, averaging the numerator-first and denominator-first paths."
        },
        {
          title: "Source",
          body: "Figures are built from FINREP F_18.00. Instruments and counterparty filters define the perimeter; the stage selector can target either an IFRS stage or the performing / non-performing status."
        }
      ],
      hint: "Click any value in the upper panel to benchmark the selected coverage ratio or decomposition effect over time."
    },
    "collateral-ratio": {
      eyebrow: "Collateralisation",
      title: "Collateral",
      lead: "This view measures the share of the selected in-balance exposure perimeter covered by collateral received in FINREP F_18.00.",
      sections: [
        {
          title: "What you see",
          body: "The upper panel focuses on total, performing or non-performing exposures. It shows the collateral ratio, its quarter-on-quarter change, and the numerator and denominator components that explain the movement."
        },
        {
          title: "How it is calculated",
          body: "Collateral ratio = maximum amount of collateral received that can be considered divided by GCA. The variation is decomposed with the same two-factor Shapley method used in the ratio tabs."
        },
        {
          title: "Source",
          body: "Figures are built from FINREP F_18.00 columns 200 and 201. F_18.00 reports collateral for performing and non-performing exposures, not for Stage 1, Stage 2, Stage 3 or POCI."
        }
      ],
      hint: "Click any value in the upper panel to benchmark the selected collateral ratio or decomposition effect over time."
    },
    "stage-transfers": {
      eyebrow: "Flow analysis",
      title: "Stage Transfer",
      lead: "This view explains how exposures move between IFRS 9 stages over the selected quarter. It focuses on the mechanics of migration, while keeping the surrounding exposure movements visible.",
      sections: [
        {
          title: "What you see",
          body: "The flow chart shows transfers between Stage 1, Stage 2 and Stage 3, together with write-offs and other residual movements. Stage blocks display the current stock on the selected perimeter."
        },
        {
          title: "How to read it",
          body: "Click a stage block or a flow to select it. The time chart tracks the same measure across reporting dates and peer institutions. Relative transfer mode expresses flows against the aligned exposure denominator."
        },
        {
          title: "Source",
          body: "Transfer flows come mainly from F_12.02. Stage stocks and denominator controls rely on F_18.00, excluding central bank cash where it should not be part of the credit-risk exposure base."
        }
      ],
      hint: "Click any flow or stage block to replace this introduction with a detailed audit trail."
    },
    contributions: {
      eyebrow: "ECL movements",
      title: "ECL movements",
      lead: "This view reconciles movements in expected credit loss allowances and provisions, covering both in-balance exposures and off-balance commitments when that perimeter is selected.",
      sections: [
        {
          title: "What you see",
          body: "The waterfall decomposes the selected allowance movement into the relevant F_12.01 components. Direct P&L impacts that do not move the allowance stock are intentionally kept outside this view."
        },
        {
          title: "How to read it",
          body: "Absolute contribution mode shows the movement in amount. Relative contribution mode divides the selected contribution by the exposure denominator of the same perimeter: previous quarter for quarterly flow, first quarter of the year for Year to date."
        },
        {
          title: "Source",
          body: "The waterfall is built from F_12.01 and reconciled with the selected instruments, counterparty and stage filters whenever FINREP provides the required granularity."
        }
      ],
      hint: "Click a waterfall component to display its selected scope and, in relative mode, its denominator."
    },
    "npl-flows": {
      eyebrow: "Asset quality migration",
      title: "NPL Flows",
      lead: "This view focuses on inflows to and outflows from non-performing loans and advances.",
      sections: [
        {
          title: "What you see",
          body: "The upper panel shows inflows, outflows and net NPL flow for the selected reference date, with a compact counterparty split for the selected flow."
        },
        {
          title: "How to read it",
          body: "Click Inflows, Outflows or Net flow to benchmark that series over time. Click a counterparty line to apply the same counterparty filter across the module."
        },
        {
          title: "Source",
          body: "Figures are built from FINREP F_18.01. The template reports in-balance loans and advances, so debt securities, off-balance exposures and stage breakdowns are not available in this view."
        }
      ],
      hint: "Relative Flow divides the selected NPL movement by the previous-quarter loans and advances exposure denominator."
    }
  };

  return content[tab] ?? null;
}
