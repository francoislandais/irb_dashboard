export const COST_OF_RISK_FILTER_ALL = "__all__";
export const COST_OF_RISK_BALANCE_SCOPE_IN_BALANCE = "in-balance";
export const COST_OF_RISK_BALANCE_SCOPE_OFF_BALANCE = "off-balance";
export const COST_OF_RISK_BALANCE_SCOPE_TOTAL = "total";
export const COST_OF_RISK_BALANCE_SCOPE_OPTIONS = [
  { label: "In-balance", value: COST_OF_RISK_BALANCE_SCOPE_IN_BALANCE },
  { label: "Off-balance", value: COST_OF_RISK_BALANCE_SCOPE_OFF_BALANCE },
  { label: "Total", value: COST_OF_RISK_BALANCE_SCOPE_TOTAL }
];

export const COST_OF_RISK_TREEMAP_STAGE_OPTIONS = [
  { label: "Stage 1", value: "Stage 1" },
  { label: "Stage 2", value: "Stage 2" },
  { label: "Stage 3", value: "Stage 3" },
  { label: "POCI", value: "POCI" }
];

export const COST_OF_RISK_TREEMAP_COUNTERPARTIES = [
  { label: "Central banks", shortLabel: "CB", value: "Central banks" },
  { label: "Governments", shortLabel: "Gov", value: "General governments" },
  { label: "Credit institutions", shortLabel: "CI", value: "Credit institutions" },
  { label: "Other financials", shortLabel: "OFI", value: "Other financial corporations" },
  { label: "NFC", shortLabel: "NFC", value: "Non-financial corporations" },
  { label: "HH", shortLabel: "HH", value: "Households" }
];

export const COST_OF_RISK_COUNTERPARTY_OTHER_GROUP = "Other";
export const COST_OF_RISK_COUNTERPARTY_PRIORITY_GROUP = "Key counterparties";
export const COST_OF_RISK_COUNTERPARTY_FILTER_OPTIONS = [
  { groupLabel: COST_OF_RISK_COUNTERPARTY_PRIORITY_GROUP, label: "NFC", shortLabel: "NFC", terminal: "Non-financial corporations", value: "Non-financial corporations" },
  { groupLabel: COST_OF_RISK_COUNTERPARTY_PRIORITY_GROUP, label: "SMEs", parent: "Non-financial corporations", terminal: "Of which: small and medium-sized enterprises", value: "NFC_SMES" },
  { groupLabel: COST_OF_RISK_COUNTERPARTY_PRIORITY_GROUP, label: "collat. CRE", parent: "Non-financial corporations", terminal: "Of which: loans collateralised by commercial immovable property", value: "NFC_CRE" },
  { groupLabel: COST_OF_RISK_COUNTERPARTY_PRIORITY_GROUP, label: "Households", shortLabel: "HH", terminal: "Households", value: "Households" },
  { groupLabel: COST_OF_RISK_COUNTERPARTY_PRIORITY_GROUP, label: "credit for consumption", parent: "Households", terminal: "Of which: credit for consumption", value: "HH_CONSUMPTION" },
  { groupLabel: COST_OF_RISK_COUNTERPARTY_PRIORITY_GROUP, label: "collat. RRE", parent: "Households", terminal: "Of which: loans collateralised by residential immovable property", value: "HH_RRE" },
  { groupLabel: COST_OF_RISK_COUNTERPARTY_OTHER_GROUP, label: "Central banks", shortLabel: "CB", terminal: "Central banks", value: "Central banks" },
  { groupLabel: COST_OF_RISK_COUNTERPARTY_OTHER_GROUP, label: "General governments", shortLabel: "Gov", terminal: "General governments", value: "General governments" },
  { groupLabel: COST_OF_RISK_COUNTERPARTY_OTHER_GROUP, label: "Credit institutions", shortLabel: "CI", terminal: "Credit institutions", value: "Credit institutions" },
  { groupLabel: COST_OF_RISK_COUNTERPARTY_OTHER_GROUP, label: "Other financial corporations", shortLabel: "OFI", terminal: "Other financial corporations", value: "Other financial corporations" }
];

export const COST_OF_RISK_TABLE_ID = "F_12.01";
export const COST_OF_RISK_STAGE_TRANSFER_TABLE_ID = "F_12.02";
export const COST_OF_RISK_STAGE_BOX_TABLE_ID = "F_18.00";
export const COST_OF_RISK_NPL_FLOW_TABLE_ID = "F_18.01";
export const COST_OF_RISK_GEOGRAPHY_TABLE_ID = "F_20.04";
export const COST_OF_RISK_GEOGRAPHY_EXPOSURE_X_CODE = "0012";
export const COST_OF_RISK_GEOGRAPHY_NON_PERFORMING_X_CODE = "0025";
export const COST_OF_RISK_GEOGRAPHY_IMPAIRMENT_X_CODE = "0031";
export const COST_OF_RISK_GEOGRAPHY_EURO_AREA_COUNTRIES = [
  "AT",
  "BE",
  "HR",
  "CY",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PT",
  "SK",
  "SI",
  "ES"
];
export const COST_OF_RISK_GEOGRAPHY_Y_CODES = {
  all: {
    debt: ["0080"],
    loans: ["0140"]
  },
  "Central banks": {
    debt: ["0090"],
    loans: ["0150"]
  },
  "General governments": {
    debt: ["0100"],
    loans: ["0160"]
  },
  "Credit institutions": {
    debt: ["0110"],
    loans: ["0170"]
  },
  "Other financial corporations": {
    debt: ["0120"],
    loans: ["0180"]
  },
  "Non-financial corporations": {
    debt: ["0130"],
    loans: ["0190"]
  },
  NFC_SMES: {
    debt: [],
    loans: ["0200"]
  },
  NFC_CRE: {
    debt: [],
    loans: ["0210"]
  },
  Households: {
    debt: [],
    loans: ["0220"]
  },
  HH_RRE: {
    debt: [],
    loans: ["0230"]
  },
  HH_CONSUMPTION: {
    debt: [],
    loans: ["0240"]
  }
};
export const COST_OF_RISK_NPL_FLOW_INFLOW_X_CODE = "0010";
export const COST_OF_RISK_NPL_FLOW_OUTFLOW_X_CODE = "0020";
export const COST_OF_RISK_NPL_FLOW_DEFINITION = [
  { key: "inflow", label: "Inflows", shortLabel: "Inflow" },
  { key: "outflow", label: "Outflows", shortLabel: "Outflow" },
  { key: "net", label: "Net flow", shortLabel: "Net" }
];

export const COST_OF_RISK_NPL_FLOW_COUNTERPARTY_ROWS = [
  { key: "all", label: "All", value: COST_OF_RISK_FILTER_ALL, yCodes: ["0150"] },
  { key: "nfc", label: "NFC", value: "Non-financial corporations", yCodes: ["0050"] },
  { key: "nfc-smes", label: "SMEs", value: "NFC_SMES", parent: "Non-financial corporations", yCodes: ["0060"] },
  { key: "nfc-cre", label: "collat. CRE", value: "NFC_CRE", parent: "Non-financial corporations", yCodes: ["0090"] },
  { key: "households", label: "Households", value: "Households", yCodes: ["0100"] },
  { key: "hh-consumption", label: "credit for consumption", value: "HH_CONSUMPTION", parent: "Households", yCodes: ["0120"] },
  { key: "hh-rre", label: "collat. RRE", value: "HH_RRE", parent: "Households", yCodes: ["0110"] },
  { key: "other", label: "Other", value: "__npl_other__", yCodes: ["0010", "0020", "0030", "0040"] },
  { key: "central-banks", label: "Central banks", value: "Central banks", yCodes: ["0010"] },
  { key: "governments", label: "General governments", value: "General governments", yCodes: ["0020"] },
  { key: "credit-institutions", label: "Credit institutions", value: "Credit institutions", yCodes: ["0030"] },
  { key: "other-financials", label: "Other financial corporations", value: "Other financial corporations", yCodes: ["0040"] }
];

// F_18.00 GCA, split by stage on the x-axis: stage 2 is
// reported as two separate rows (performing / non-performing) that must be
// summed to get the total stage 2 exposure.
export const COST_OF_RISK_STAGE_BOX_X_CODES = {
  "1": ["56"],
  "2": ["57", "109"],
  "3": ["121"]
};

export const COST_OF_RISK_STAGE_SUMMARY_ROWS = [
  { key: "all", label: "All", gcaXCodes: ["0010"], allowanceXCodes: ["0130"] },
  { key: "stage1", label: "Stage 1", gcaXCodes: ["0056"], allowanceXCodes: ["0141"] },
  { key: "stage2", label: "Stage 2", gcaXCodes: ["0057", "0109"], allowanceXCodes: ["0142", "0950"] },
  { key: "stage3", label: "Stage 3", gcaXCodes: ["0121"], allowanceXCodes: ["0951"] },
  { key: "poci", label: "POCI", gcaXCodes: ["0058", "0900"], allowanceXCodes: ["0143", "0952"] },
  { key: "performing", label: "Performing", gcaXCodes: ["0020"], allowanceXCodes: ["0140"], collateralXCodes: ["0201"] },
  { key: "nonperforming", label: "Non-performing", gcaXCodes: ["0060"], allowanceXCodes: ["0150"], collateralXCodes: ["0200"] }
];

export const COST_OF_RISK_STAGE_SERIES_DEFINITIONS = [
  ...COST_OF_RISK_STAGE_SUMMARY_ROWS,
  { key: "performing", label: "Performing", gcaXCodes: ["0020"], allowanceXCodes: ["0140"] },
  { key: "nonperforming", label: "Non-performing", gcaXCodes: ["0060"], allowanceXCodes: ["0150"] }
];

export const DEFAULT_COST_OF_RISK_STAGE_SUMMARY_CELL = "gca:ratio:stage2";
export const DEFAULT_COST_OF_RISK_STAGE_RATIO_CELL = "stage2:ratio";
export const DEFAULT_COST_OF_RISK_COVERAGE_RATIO_CELL = "stage3:ratio";
export const DEFAULT_COST_OF_RISK_COLLATERAL_RATIO_CELL = "all:ratio";

export const COST_OF_RISK_ALLOWANCE_STAGE_X_CODES = {
  "": ["0130"],
  "Non-performing": ["0150"],
  "Performing": ["0140"],
  "POCI": ["0143", "0952"],
  "Stage 1": ["0141"],
  "Stage 2": ["0142", "0950"],
  "Stage 3": ["0951"]
};

export const COST_OF_RISK_COUNTERPARTY_SUMMARY_ROWS = [
  { key: "all", label: "All", type: "row", value: COST_OF_RISK_FILTER_ALL },
  { key: "nfc", label: "NFC", type: "row", value: "Non-financial corporations" },
  { key: "nfc-smes", label: "SMEs", type: "row", value: "NFC_SMES" },
  { key: "nfc-cre", label: "collat. CRE", type: "row", value: "NFC_CRE" },
  { key: "households", label: "Households", type: "row", value: "Households" },
  { key: "hh-consumption", label: "credit for consumption", type: "row", value: "HH_CONSUMPTION" },
  { key: "hh-rre", label: "collat. RRE", type: "row", value: "HH_RRE" },
  { key: "other", label: "Other", type: "group" },
  { group: "other", key: "central-banks", label: "Central banks", type: "row", value: "Central banks" },
  { group: "other", key: "governments", label: "General governments", type: "row", value: "General governments" },
  { group: "other", key: "credit-institutions", label: "Credit institutions", type: "row", value: "Credit institutions" },
  { group: "other", key: "other-financials", label: "Other financial corporations", type: "row", value: "Other financial corporations" }
];

export const DEFAULT_COST_OF_RISK_COUNTERPARTY_SUMMARY_CELL = "gca:level:nfc";
export const COST_OF_RISK_STAGE_BOX_DESCRIPTION_PREFIX = "Debt instruments other than held for trading";
export const COST_OF_RISK_BALANCE_SHEET_ALLOWANCE_PREFIX = "Total allowance for debt instruments";
export const COST_OF_RISK_OFF_BALANCE_ALLOWANCE_PREFIX = "Total  provisions on commitments and financial guarantees given";
export const COST_OF_RISK_OFF_BALANCE_ALLOWANCE_Y_CODES = {
  "": ["0570"],
  "POCI": ["0565"],
  "Stage 1": ["0530"],
  "Stage 2": ["0540"],
  "Stage 3": ["0560"]
};
export const COST_OF_RISK_OFF_BALANCE_ALLOWANCE_Y_CODE_SET = new Set(
  Object.values(COST_OF_RISK_OFF_BALANCE_ALLOWANCE_Y_CODES).flat()
);

export const COST_OF_RISK_X_AXIS_CODE = "0020";
export const COST_OF_RISK_TOTAL_CONTRIBUTION_X_CODE = "__total_contribution__";
export const COST_OF_RISK_F02_TABLE_ID = "F_02.00";
export const COST_OF_RISK_F02_X_AXIS_CODE = "0010";
export const COST_OF_RISK_F02_Y_AXIS_CODE = "0460";
export const COST_OF_RISK_TOTAL_Y_AXIS_CODE = "0520";
export const COST_OF_RISK_WATERFALL_X_CODES = ["0020", "0030", "0040", "0050", "0070", "0080", "0090"];
export const COST_OF_RISK_F12_RECONCILIATION_X_CODES = ["0020", "0030", "0040", "0050", "0070", "0080", "0090", "0110", "0120", "0125"];
export const COST_OF_RISK_DEFINITION_F12_X_CODES = ["0020", "0040", "0050", "0070", "0090", "0110", "0120"];
export const COST_OF_RISK_DEFINITION_ACPR_X_CODES = ["0020", "0030", "0040", "0050", "0070", "0090", "0110", "0120"];
export const COST_OF_RISK_DEFINITION_CUSTOM_X_CODES = [...COST_OF_RISK_F12_RECONCILIATION_X_CODES];

export const COST_OF_RISK_DEFINITION_OPTIONS = [
  {
    id: "f02-impairment",
    label: "F02 impairment",
    source: "F_02.00 r0460",
    description: "Direct impairment or reversal line reported in the FINREP income statement.",
    components: [
      "F_02.00 row 460",
      "Single income statement impairment/reversal measure",
      "Quarterly amount after detrimestrialisation"
    ]
  },
  {
    id: "f12-selected-components",
    label: "EBA definition",
    source: "F_12.01 c020+c040+c050+c070+c090+c110+c120",
    description: "Component-based cost of risk proxy built from selected FINREP F_12.01 movements.",
    components: [
      "c020 - Increased due to origination and acquisition",
      "c040 - Increased due to changes in credit risk",
      "c050 - Decreased due to changes in credit risk",
      "c070 - Decreased due to derecognition",
      "c090 - Changes due to updates in the institution's methodology for estimation",
      "c110 - Foreign exchange and other movements",
      "c120 - Changes due to modifications without derecognition"
    ]
  },
  {
    id: "f12-acpr-components",
    label: "ACPR definition",
    source: "F_12.01 c020+c030+c040+c050+c070+c090+c110+c120",
    description: "Same as the EBA definition, plus c030 (decrease due to derecognition, repayments and disposals).",
    components: [
      "c020 - Increased due to origination and acquisition",
      "c030 - Decrease due to derecognition, repayments and disposals",
      "c040 - Increased due to changes in credit risk",
      "c050 - Decreased due to changes in credit risk",
      "c070 - Decreased due to derecognition",
      "c090 - Changes due to updates in the institution's methodology for estimation",
      "c110 - Foreign exchange and other movements",
      "c120 - Changes due to modifications without derecognition"
    ]
  }
];

export const COST_OF_RISK_STAGE_TRANSFER_STAGE_OPTIONS = [
  { label: "Stage 1", value: "1" },
  { label: "Stage 2", value: "2" },
  { label: "Stage 3", value: "3" }
];

export const COST_OF_RISK_STAGE_TRANSFER_FLOW_MOVEMENTS = [
  { code: "0010", from: "1", to: "2" },
  { code: "0020", from: "2", to: "1" },
  { code: "0030", from: "2", to: "3" },
  { code: "0040", from: "3", to: "2" },
  { code: "0050", from: "1", to: "3" },
  { code: "0060", from: "3", to: "1" }
];

export const COST_OF_RISK_STAGE_TRANSFER_MOVEMENTS = {
  "1": [
    { code: "0010", sign: -1 },
    { code: "0020", sign: 1 },
    { code: "0050", sign: -1 },
    { code: "0060", sign: 1 }
  ],
  "2": [
    { code: "0010", sign: 1 },
    { code: "0020", sign: -1 },
    { code: "0030", sign: -1 },
    { code: "0040", sign: 1 }
  ],
  "3": [
    { code: "0030", sign: 1 },
    { code: "0040", sign: -1 },
    { code: "0050", sign: 1 },
    { code: "0060", sign: -1 }
  ]
};

export const COST_OF_RISK_STAGE_TRANSFER_STAGE_LABELS = {
  "1": "Stage 1",
  "2": "Stage 2",
  "3": "Stage 3"
};

export const COST_OF_RISK_WRITE_OFF_X_CODES = ["0080", "0120"];
export const ALL_STAGES_LABEL = "all stages + POCI";

export const COST_OF_RISK_DENOMINATOR_STAGE_X_CODES = {
  "": ["0010"],
  "Non-performing": ["0060"],
  "Performing": ["0020"],
  "POCI": ["0058", "0900"],
  "Stage 1": ["0056"],
  "Stage 2": ["0057", "0109"],
  "Stage 3": ["0121"]
};

export const COST_OF_RISK_DENOMINATOR_CASH_Y_CODE = "0005";

export const COST_OF_RISK_CONFIG = {
  numerator: {
    label: "Numerator",
    points: [
      {
        label: "Numerator point 1",
        sign: 1,
        xCode: "",
        yCode: "",
        zCode: ""
      },
      {
        label: "Numerator point 2",
        sign: 1,
        xCode: "",
        yCode: "",
        zCode: ""
      },
      {
        label: "Numerator point 3",
        sign: 1,
        xCode: "",
        yCode: "",
        zCode: ""
      }
    ],
    tableId: COST_OF_RISK_TABLE_ID
  }
};

export const COST_OF_RISK_PERFORMANCE_STATUS_VALUES = ["Performing", "Non-performing"];
export const STAGE_LABELS = ["Stage 1", "Stage 2", "Stage 3", "Purchased or originated credit-impaired"];
export const ASSET_LABELS = ["Debt securities", "Loans and advances"];
export const COUNTERPARTY_LABELS = [
  "Central banks",
  "General governments",
  "Credit institutions",
  "Other financial corporations",
  "Non-financial corporations",
  "Households"
];

export const ASSET_SHORT_LABELS = new Map([
  ["Debt securities", "Debt securities"],
  ["Loans and advances", "L&A"]
]);

export const ASSET_KEY_BY_LABEL = new Map([
  ["Debt securities", "debt"],
  ["Loans and advances", "loans"]
]);

export const ASSET_LABEL_BY_KEY = new Map([...ASSET_KEY_BY_LABEL.entries()].map(([label, key]) => [key, label]));

export const COUNTERPARTY_SHORT_LABELS = new Map([
  ["Central banks", "Central banks"],
  ["General governments", "Governments"],
  ["Credit institutions", "Credit institutions"],
  ["Other financial corporations", "Other financials"],
  ["Non-financial corporations", "NFC"],
  ["Households", "Households"]
]);

export const STAGE_SHORT_LABELS = new Map([
  ["Non-performing", "Non-performing"],
  ["Performing", "Performing"],
  ["Stage 1", "Stage 1"],
  ["Stage 2", "Stage 2"],
  ["Stage 3", "Stage 3"],
  ["POCI", "POCI"],
  ["Purchased or originated credit-impaired", "POCI"]
]);
