import { getIndexedAxisCodes, getIndexedRowsByTableJst } from "../data/dataIndex.js";
import { buildModule2AxisSeries, MODULE_2_TARGET } from "../data/timeSeries.js?v=20260703-data-index-3";
import { MODULE_2_TEMPLATES, normalizeAxisCode } from "../data/module2Config.js";

let latestState = null;
let activeModule2TemplateId = MODULE_2_TEMPLATES[0]?.tableId ?? MODULE_2_TARGET.tableId;
const module2TemplateContexts = new Map();
const module2TemplateAxisState = {
  scroll: { left: 0, top: 0 },
  search: ""
};
const MODULE_2_STICKY_PARENT_ROW_HEIGHT = 28;
let module2StickyFrame = 0;

const elements = {
  chooseFileButton: document.querySelector("#choose-file-button"),
  columnCount: document.querySelector("#column-count"),
  datasetLabel: document.querySelector("#dataset-label"),
  fileName: document.querySelector("#file-name"),
  fileStatus: document.querySelector("#file-status"),
  forgetFileButton: document.querySelector("#forget-file-button"),
  jstSelect: document.querySelector("#jst-select"),
  moduleButtons: [...document.querySelectorAll("[data-module-target]")],
  moduleViews: [...document.querySelectorAll(".module-view")],
  module2AxisButtons: [...document.querySelectorAll("[data-module-2-axis]")],
  module2AxisCaptions: {
    template: document.querySelector('[data-axis-caption="template"]'),
    x: document.querySelector('[data-axis-caption="x"]'),
    y: document.querySelector('[data-axis-caption="y"]'),
    z: document.querySelector('[data-axis-caption="z"]')
  },
  module2Empty: document.querySelector("#module-2-empty"),
  module2Table: document.querySelector("#module-2-table"),
  module2TableWrap: document.querySelector(".metric-table-wrap"),
  previewStatus: document.querySelector("#preview-status"),
  previewTable: document.querySelector("#preview-table"),
  reloadFileButton: document.querySelector("#reload-file-button"),
  rowCount: document.querySelector("#row-count"),
  supportNotice: document.querySelector("#support-notice"),
  unitSelect: document.querySelector("#unit-select")
};

export function wireUi(actions) {
  elements.chooseFileButton.addEventListener("click", actions.chooseFile);
  elements.reloadFileButton.addEventListener("click", actions.reloadFile);
  elements.forgetFileButton.addEventListener("click", actions.forgetFile);
  elements.datasetLabel.addEventListener("input", (event) => {
    actions.updateDatasetLabel(event.target.value);
  });
  elements.jstSelect.addEventListener("change", (event) => {
    actions.updateSelectedJst(event.target.value);
  });
  elements.unitSelect.addEventListener("change", (event) => {
    saveModule2ScrollPosition();
    actions.updateSelectedUnit(event.target.value);
  });
  elements.module2AxisButtons.forEach((button) => {
    button.addEventListener("click", () => {
      saveModule2ScrollPosition();
      getActiveModule2Context().activeAxis = button.getAttribute("data-module-2-axis") || "y";
      renderAppState(actions.getState());
    });
  });
  elements.module2TableWrap?.addEventListener("scroll", scheduleModule2StickyParentsUpdate, { passive: true });
  elements.module2Table.addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-toggle-path]");
    if (toggle) {
      toggleModule2Path(toggle.dataset.togglePath);
      return;
    }

    const row = event.target.closest("tbody tr[data-point-code]");
    if (row) selectModule2Row(row.dataset.pointCode, { shouldToggle: true, shouldFocus: true });
  });
  elements.module2Table.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      moveModule2Selection(event.key === "ArrowDown" ? 1 : -1);
      return;
    }

    if (event.key !== "Enter" && event.key !== " ") return;

    const row = event.target.closest("tbody tr[data-point-code]");
    if (!row) return;

    event.preventDefault();
    selectModule2Row(row.dataset.pointCode, { shouldToggle: true, shouldFocus: true });
  });
  elements.moduleButtons.forEach((button) => {
    button.addEventListener("click", () => actions.setActiveModule(button.dataset.moduleTarget));
  });
}

export function renderAppState(state) {
  latestState = state;
  const hasData = state.rows.length > 0 || state.columns.length > 0;

  elements.rowCount.textContent = state.rows.length.toLocaleString("fr-FR");
  elements.columnCount.textContent = state.columns.length.toLocaleString("fr-FR");
  elements.fileName.textContent = state.fileName || "-";
  elements.reloadFileButton.disabled = !state.fileHandle;
  elements.forgetFileButton.disabled = !state.fileHandle && !hasData;
  renderJstSelect(state.jstOptions, state.selectedJst);
  renderActiveModule(state.activeModule);

  if (state.isRestoring) {
    elements.fileStatus.textContent = "Recherche du dernier fichier utilisé...";
  } else if (state.rememberedFileReady) {
    elements.fileStatus.textContent = "Dernier fichier mémorisé. Cliquez sur Recharger pour autoriser sa lecture.";
  } else if (state.error) {
    elements.fileStatus.textContent = state.error;
  } else if (state.fileName) {
    elements.fileStatus.textContent = `Fichier chargé ${formatLoadedAt(state.loadedAt)}.`;
  } else {
    elements.fileStatus.textContent = "Aucun fichier chargé.";
  }

  elements.supportNotice.hidden = !state.capabilityNotice;
  elements.supportNotice.textContent = state.capabilityNotice;
  renderPreview(state.columns, state.rows);
  if (state.activeModule === "module-2") renderModule2(state);
}

function renderJstSelect(jstOptions, selectedJst) {
  elements.jstSelect.replaceChildren();

  if (jstOptions.length === 0) {
    elements.jstSelect.append(new Option("Chargez un CSV", ""));
    elements.jstSelect.disabled = true;
    return;
  }

  jstOptions.forEach((jstCode) => {
    elements.jstSelect.append(new Option(jstCode, jstCode, false, jstCode === selectedJst));
  });
  elements.jstSelect.disabled = false;
}

function renderActiveModule(activeModule) {
  elements.moduleButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.moduleTarget === activeModule);
  });

  elements.moduleViews.forEach((view) => {
    view.classList.toggle("is-visible", view.id === `${activeModule}-view`);
  });
}

function renderPreview(columns, rows) {
  elements.previewTable.replaceChildren();

  if (columns.length === 0) {
    elements.previewStatus.textContent = "Les premières lignes apparaîtront ici.";
    return;
  }

  elements.previewStatus.textContent = "Aperçu des 20 premières lignes.";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  columns.forEach((column) => {
    const th = document.createElement("th");
    th.textContent = column;
    headerRow.append(th);
  });
  thead.append(headerRow);

  const tbody = document.createElement("tbody");
  rows.slice(0, 20).forEach((row) => {
    const tr = document.createElement("tr");
    row.forEach((value) => {
      const td = document.createElement("td");
      td.textContent = value;
      tr.append(td);
    });
    tbody.append(tr);
  });

  elements.previewTable.append(thead, tbody);
}

function createModule2TemplateContext() {
  return {
    activeAxis: "y",
    defaultExpandedPathsInitialized: false,
    expandedPaths: new Set(),
    scrollByAxis: {
      template: { left: 0, top: 0 },
      x: { left: 0, top: 0 },
      y: { left: 0, top: 0 },
      z: { left: 0, top: 0 }
    },
    searchByAxis: {
      template: "",
      x: "",
      y: "",
      z: ""
    },
    selectedXCode: "",
    selectedYCode: "",
    selectedZCode: ""
  };
}

function getActiveModule2Template() {
  return MODULE_2_TEMPLATES.find((template) => template.tableId === activeModule2TemplateId) ?? MODULE_2_TEMPLATES[0];
}

function getActiveModule2Context() {
  return getModule2ContextForTemplate(activeModule2TemplateId);
}

function getModule2ContextForTemplate(tableId) {
  const contextKey = tableId || MODULE_2_TARGET.tableId;

  if (!module2TemplateContexts.has(contextKey)) {
    module2TemplateContexts.set(contextKey, createModule2TemplateContext());
  }

  return module2TemplateContexts.get(contextKey);
}

function getActiveModule2Axis() {
  return getActiveModule2Context().activeAxis;
}

function getActiveModule2ExpandedPaths() {
  return getActiveModule2Context().expandedPaths;
}

function getModule2AxisOptions(state, tableId) {
  const configuredYCodes = getConfiguredModule2AxisCodes(state, tableId, "y");
  const configuredZCodes = getConfiguredModule2AxisCodes(state, tableId, "z");
  const availableXCodes = getAvailableModule2AxisCodes(state, tableId, "x");
  const availableYCodes = getAvailableModule2AxisCodes(state, tableId, "y");
  const availableZCodes = getAvailableModule2AxisCodes(state, tableId, "z");
  const yCodes = getPreferredModule2AxisCodes(configuredYCodes, availableYCodes);
  const zCodes = getPreferredModule2AxisCodes(configuredZCodes, availableZCodes);

  return {
    template: {
      codes: MODULE_2_TEMPLATES.map((template) => template.tableId),
      isVisible: MODULE_2_TEMPLATES.length > 1
    },
    x: {
      codes: availableXCodes,
      isVisible: availableXCodes.length > 1
    },
    y: {
      codes: yCodes,
      isVisible: yCodes.length > 1
    },
    z: {
      codes: zCodes,
      isVisible: zCodes.length > 1
    }
  };
}

function getPreferredModule2AxisCodes(configuredCodes, availableCodes) {
  if (configuredCodes.length === 0) return [];
  if (availableCodes.length === 0) return configuredCodes;

  const availableCodeSet = new Set(availableCodes);
  const matchingCodes = configuredCodes.filter((code) => availableCodeSet.has(code));

  return matchingCodes.length > 0 ? matchingCodes : availableCodes;
}

function getVisibleModule2Axes(axisOptions) {
  return ["template", "y", "x", "z"].filter((axis) => axisOptions[axis]?.isVisible);
}

function ensureModule2Selections(state) {
  const tableId = getActiveModule2Template()?.tableId ?? MODULE_2_TARGET.tableId;
  ensureModule2TemplateSelections(state, tableId);
}

function ensureModule2TemplateSelections(state, tableId) {
  const context = getModule2ContextForTemplate(tableId);
  const axisOptions = getModule2AxisOptions(state, tableId);
  const yCodes = axisOptions.y.codes;
  const zCodes = axisOptions.z.codes;
  const xCodes = axisOptions.x.codes;
  let selectionChanged = false;

  if (!context.selectedYCode || !yCodes.includes(context.selectedYCode)) {
    context.selectedYCode = yCodes[0] ?? "";
    selectionChanged = true;
  }

  if (!context.selectedXCode || !xCodes.includes(context.selectedXCode)) {
    context.selectedXCode = xCodes[0] ?? "";
    selectionChanged = true;
  }

  if (zCodes.length > 0 && (!context.selectedZCode || !zCodes.includes(context.selectedZCode))) {
    context.selectedZCode = zCodes[0] ?? "";
    selectionChanged = true;
  }

  if (zCodes.length === 0 && context.selectedZCode) {
    context.selectedZCode = "";
    selectionChanged = true;
  }

  if (selectionChanged) {
    ensureModule2SelectionUsesExistingRow(state, tableId, context, axisOptions);
  }

  const visibleAxes = getVisibleModule2Axes(axisOptions);
  if (visibleAxes.length > 0 && !visibleAxes.includes(context.activeAxis)) {
    context.activeAxis = visibleAxes[0];
  }
}

function ensureModule2SelectionUsesExistingRow(state, tableId, context, axisOptions) {
  const rows = getModule2RowsForTemplate(state, tableId);
  if (rows.length === 0 || hasModule2SelectedCombination(rows, state.columns, context)) return;

  const firstRow = rows[0];
  const indexes = getModule2SourceIndexes(state.columns);
  if (!indexes) return;

  if (axisOptions.x.codes.length > 0) {
    context.selectedXCode = normalizeAxisCode(firstRow[indexes.xAxisRcCode], "x");
  }
  if (axisOptions.y.codes.length > 0) {
    context.selectedYCode = normalizeAxisCode(firstRow[indexes.yAxisRcCode], "y");
  }
  if (axisOptions.z.codes.length > 0) {
    context.selectedZCode = normalizeAxisCode(firstRow[indexes.zAxisRcCode], "z");
  }
}

function hasModule2SelectedCombination(rows, columns, context) {
  const indexes = getModule2SourceIndexes(columns);
  if (!indexes) return true;

  return rows.some((row) => (
    (!context.selectedXCode || normalizeAxisCode(row[indexes.xAxisRcCode], "x") === context.selectedXCode)
    && (!context.selectedYCode || normalizeAxisCode(row[indexes.yAxisRcCode], "y") === context.selectedYCode)
    && (!context.selectedZCode || normalizeAxisCode(row[indexes.zAxisRcCode], "z") === context.selectedZCode)
  ));
}

function getModule2RowsForTemplate(state, tableId) {
  const indexedRows = getIndexedRowsByTableJst(state, tableId);
  if (indexedRows.length > 0 || state.dataIndexes) return indexedRows;

  const indexes = getModule2SourceIndexes(state.columns);
  if (!indexes || !state.selectedJst) return [];

  return state.rows.filter((row) => (
    row[indexes.jstCode] === state.selectedJst
    && row[indexes.tableId] === tableId
  ));
}

function getModule2SourceIndexes(columns) {
  const indexes = {
    jstCode: columns.indexOf("jst_code"),
    tableId: columns.indexOf("table_id"),
    xAxisRcCode: columns.indexOf("x_axis_rc_code"),
    yAxisRcCode: columns.indexOf("y_axis_rc_code"),
    zAxisRcCode: columns.indexOf("z_axis_rc_code")
  };

  return Object.values(indexes).every((index) => index !== -1) ? indexes : null;
}

function getConfiguredModule2AxisCodes(state, tableId, axis) {
  return (state.module2Points ?? [])
    .filter((point) => (
      point.tableId === tableId
      && point.coordinate === `${axis}_axis_rc_code`
    ))
    .map((point) => point.code)
    .filter(Boolean);
}

function getAvailableModule2AxisCodes(state, tableId, axis) {
  const indexedCodes = getIndexedAxisCodes(state, tableId, axis);
  if (indexedCodes.length > 0 || state.dataIndexes) return indexedCodes;

  const columnName = `${axis}_axis_rc_code`;
  const indexes = {
    jstCode: state.columns.indexOf("jst_code"),
    tableId: state.columns.indexOf("table_id"),
    axisCode: state.columns.indexOf(columnName)
  };

  if (Object.values(indexes).some((index) => index === -1) || !state.selectedJst) return [];

  return [...new Set(state.rows
    .filter((row) => (
      row[indexes.jstCode] === state.selectedJst
      && row[indexes.tableId] === tableId
    ))
    .map((row) => normalizeAxisCode(row[indexes.axisCode], axis))
    .filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, "fr"));
}

function renderModule2(state) {
  const context = getActiveModule2Context();
  const template = getActiveModule2Template();
  ensureModule2Selections(state);
  if (context.activeAxis === "template") ensureAllModule2TemplateSelections(state);
  const tableSeries = buildModule2AxisSeries(state, {
    axis: context.activeAxis,
    selectedXCode: context.selectedXCode,
    selectedYCode: context.selectedYCode,
    selectedZCode: context.selectedZCode,
    tableId: template?.tableId,
    templateSelections: getModule2TemplateSelections(),
    templates: MODULE_2_TEMPLATES
  });
  elements.module2Table.replaceChildren();
  elements.unitSelect.value = state.selectedUnit;

  elements.module2Empty.hidden = !tableSeries.status;
  elements.module2Empty.textContent = tableSeries.status;
  renderModule2AxisTabs();

  if (tableSeries.rows.length === 0 || tableSeries.dateColumns.length === 0) return;

  renderModule2Table(tableSeries, state.selectedUnit);
  applyModule2Selection();
  restoreModule2ScrollPosition();
}

function ensureAllModule2TemplateSelections(state) {
  MODULE_2_TEMPLATES.forEach((template) => {
    ensureModule2TemplateSelections(state, template.tableId);
  });
}

function getModule2TemplateSelections() {
  return Object.fromEntries(MODULE_2_TEMPLATES.map((template) => {
    const context = getModule2ContextForTemplate(template.tableId);
    return [template.tableId, {
      selectedXCode: context.selectedXCode,
      selectedYCode: context.selectedYCode,
      selectedZCode: context.selectedZCode
    }];
  }));
}

function formatLoadedAt(date) {
  if (!date) return "";
  return `à ${new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date)}`;
}

function renderModule2Table(series, selectedUnit) {
  const activeAxis = getActiveModule2Axis();
  const orderedDates = [...series.dateColumns].reverse();
  const tableRows = series.rows.map(normalizeModule2SeriesRow);
  const displayRows = buildModule2DisplayRows(tableRows);
  const parentPaths = getParentPaths(tableRows);
  const nodePaths = getExplicitPaths(displayRows);
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  const tbody = document.createElement("tbody");

  expandDefaultModule2Paths(displayRows, parentPaths);

  const descriptionHeader = document.createElement("th");
  descriptionHeader.scope = "col";
  descriptionHeader.className = "description-column";
  descriptionHeader.append(createModule2SearchInput());
  headerRow.append(descriptionHeader);

  orderedDates.forEach((dateColumn, index) => {
    const th = document.createElement("th");
    th.scope = "col";
    th.className = index === 0 ? "latest-column" : "";
    th.textContent = dateColumn.label;
    headerRow.append(th);
  });

  displayRows.forEach((seriesRow) => {
    const valueRow = document.createElement("tr");
    const normalizedPath = normalizeHierarchyPath(seriesRow.hierarchyPath);
    const isParent = parentPaths.has(normalizedPath);

    if (!seriesRow.isVirtual) valueRow.dataset.pointCode = seriesRow.code;
    valueRow.dataset.axis = activeAxis;
    valueRow.dataset.hierarchyPath = seriesRow.hierarchyPath;
    valueRow.dataset.normalizedPath = normalizedPath;
    valueRow.dataset.searchText = createModule2SearchText(seriesRow);
    valueRow.dataset.isParent = String(isParent);
    valueRow.dataset.isVirtual = String(Boolean(seriesRow.isVirtual));
    valueRow.dataset.parentPath = seriesRow.parentPath;
    valueRow.dataset.indentLevel = String(seriesRow.indentLevel ?? 0);
    if (!seriesRow.isVirtual) {
      valueRow.setAttribute("role", "button");
      valueRow.tabIndex = 0;
    }

    const description = document.createElement("th");
    description.scope = "row";
    description.className = "description-column";
    description.style.setProperty("--indent-level", seriesRow.indentLevel ?? 0);
    description.title = seriesRow.description;
    description.append(createDescriptionContent(seriesRow, normalizedPath, isParent));
    valueRow.append(description);

    [...seriesRow.values].reverse().forEach((point, index) => {
      const td = document.createElement("td");
      td.className = index === 0 ? "latest-column" : "";
      td.textContent = seriesRow.isVirtual || point.value === null
        ? "-"
        : formatMetricValue(point.value, selectedUnit, seriesRow.format);
      valueRow.append(td);
    });

    tbody.append(valueRow);
  });

  thead.append(headerRow);
  elements.module2Table.append(thead, tbody);
  applyModule2TreeState(parentPaths, nodePaths);
}

function createModule2SearchInput() {
  const input = document.createElement("input");
  input.id = "module-2-search";
  input.className = "table-search-input";
  input.type = "search";
  input.placeholder = "search";
  input.setAttribute("aria-label", "Recherche");
  input.value = getActiveModule2SearchRawValue();
  input.addEventListener("input", updateModule2Search);
  input.addEventListener("search", updateModule2Search);
  return input;
}

function updateModule2Search(event) {
  const context = getActiveModule2Context();
  if (context.activeAxis === "template") {
    module2TemplateAxisState.search = event.target.value;
  } else {
    context.searchByAxis[context.activeAxis] = event.target.value;
  }
  applyModule2SearchFilter();
}

function renderModule2AxisTabs() {
  const captions = getModule2AxisCaptions();
  const activeAxis = getActiveModule2Axis();
  const tableId = getActiveModule2Template()?.tableId ?? MODULE_2_TARGET.tableId;
  const axisOptions = getModule2AxisOptions(latestState ?? { columns: [], rows: [], module2Points: [] }, tableId);

  elements.module2AxisButtons.forEach((button) => {
    const axis = button.getAttribute("data-module-2-axis");
    const isActive = axis === activeAxis;
    const isAvailable = Boolean(axisOptions[axis]?.isVisible);
    button.classList.toggle("is-active", isActive);
    button.hidden = !isAvailable;
    button.setAttribute("aria-selected", String(isActive));
  });

  Object.entries(elements.module2AxisCaptions).forEach(([axis, element]) => {
    if (!element) return;

    element.title = captions[axis] || "";
    element.replaceChildren(createAxisCaptionLine(captions[axis]));
  });
}

function createAxisCaptionLine(caption) {
  const parts = splitAxisCaption(caption);
  const line = document.createElement("span");
  line.className = "axis-tab-line";

  if (parts.length === 0) {
    line.textContent = "-";
    return line;
  }

  line.textContent = parts.join(" - ");
  return line;
}

function splitAxisCaption(caption) {
  return String(caption ?? "")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
}

function getModule2AxisCaptions() {
  const context = getActiveModule2Context();
  const tableId = getActiveModule2Template()?.tableId ?? MODULE_2_TARGET.tableId;
  const yPoint = latestState?.module2Points?.find((point) => (
    point.tableId === tableId
    && point.code === context.selectedYCode
    && point.coordinate === "y_axis_rc_code"
  ));
  const zPoint = latestState?.module2Points?.find((point) => (
    point.tableId === tableId
    && point.code === context.selectedZCode
    && point.coordinate === "z_axis_rc_code"
  ));
  const xDescription = latestState?.dimensionMapping
    ?.find(tableId, "x_axis_rc_code", context.selectedXCode)
    ?.description;

  return {
    template: getActiveModule2Template()?.label || activeModule2TemplateId,
    x: xDescription || (context.selectedXCode ? `X ${context.selectedXCode}` : ""),
    y: yPoint?.description || (context.selectedYCode ? `Y ${context.selectedYCode}` : ""),
    z: zPoint?.description || (context.selectedZCode ? `Z ${context.selectedZCode}` : "")
  };
}

function getSelectedModule2CodeForActiveAxis() {
  const context = getActiveModule2Context();
  if (context.activeAxis === "template") return activeModule2TemplateId;
  if (context.activeAxis === "x") return context.selectedXCode;
  if (context.activeAxis === "z") return context.selectedZCode;
  return context.selectedYCode;
}

function normalizeModule2SeriesRow(seriesRow) {
  return {
    ...seriesRow,
    format: seriesRow.format || "",
    hierarchyPath: seriesRow.hierarchyPath || seriesRow.description || "",
    parentPath: seriesRow.parentPath || splitHierarchyPath(seriesRow.description).slice(0, -1).join(" > ")
  };
}

function buildModule2DisplayRows(rows) {
  const explicitPaths = getExplicitPaths(rows);
  const displayedPaths = new Set();
  const displayRows = [];

  rows.forEach((row) => {
    const parts = splitHierarchyPath(row.hierarchyPath);

    for (let index = 0; index < parts.length - 1; index += 1) {
      const path = parts.slice(0, index + 1).join(" > ");
      const normalizedPath = normalizeHierarchyPath(path);
      if (explicitPaths.has(normalizedPath) || displayedPaths.has(normalizedPath)) continue;

      displayedPaths.add(normalizedPath);
      displayRows.push(createVirtualModule2Row(path, parts[index], index, row.values));
    }

    displayedPaths.add(normalizeHierarchyPath(row.hierarchyPath));
    displayRows.push(row);
  });

  return displayRows;
}

function createVirtualModule2Row(path, label, indentLevel, values) {
  return {
    code: `virtual:${normalizeHierarchyPath(path)}`,
    description: path,
    displayDescription: label,
    hierarchyPath: path,
    indentLevel,
    isVirtual: true,
    parentPath: splitHierarchyPath(path).slice(0, -1).join(" > "),
    values: values.map((point) => ({
      ...point,
      value: null
    }))
  };
}

function expandDefaultModule2Paths(rows, parentPaths) {
  const context = getActiveModule2Context();
  if (context.defaultExpandedPathsInitialized) return;

  const expandedPaths = context.expandedPaths;

  rows.forEach((row) => {
    const path = normalizeHierarchyPath(row.hierarchyPath);
    if (parentPaths.has(path) && (row.indentLevel ?? 0) < 1) {
      expandedPaths.add(path);
    }
  });

  context.defaultExpandedPathsInitialized = true;
}

function createDescriptionContent(seriesRow, normalizedPath, isParent) {
  const fragment = document.createDocumentFragment();
  const content = document.createElement("span");
  content.className = "tree-cell-content";
  const expandedPaths = getActiveModule2ExpandedPaths();
  const parts = splitHierarchyPath(seriesRow.hierarchyPath);

  createTreeConnectors(parts, normalizedPath, isParent).forEach((connector) => {
    fragment.append(connector);
  });

  if (isParent) {
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "tree-toggle";
    toggle.dataset.togglePath = normalizedPath;
    toggle.setAttribute("aria-expanded", String(expandedPaths.has(normalizedPath)));
    toggle.textContent = expandedPaths.has(normalizedPath) ? "-" : "+";
    content.append(toggle);
  } else {
    const spacer = document.createElement("span");
    spacer.className = "tree-toggle-spacer";
    content.append(spacer);
  }

  const label = document.createElement("span");
  label.className = "tree-label";
  label.textContent = seriesRow.displayDescription || seriesRow.description;
  content.append(label);

  fragment.append(content);

  return fragment;
}

function createTreeConnectors(parts, normalizedPath, isParent) {
  const expandedPaths = getActiveModule2ExpandedPaths();
  const connectors = [];

  for (let index = 0; index < parts.length - 1; index += 1) {
    const ancestorPath = normalizeHierarchyPath(parts.slice(0, index + 1).join(" > "));
    if (!expandedPaths.has(ancestorPath)) continue;

    connectors.push(createTreeConnector(index));
  }

  if (isParent && expandedPaths.has(normalizedPath)) {
    connectors.push(createTreeConnector(Math.max(0, parts.length - 1), true));
  }

  return connectors;
}

function createTreeConnector(level, startsUnderToggle = false) {
  const connector = document.createElement("span");
  connector.className = startsUnderToggle
    ? "tree-connector starts-under-toggle"
    : "tree-connector";
  connector.style.setProperty("--connector-level", level);
  connector.setAttribute("aria-hidden", "true");
  return connector;
}

function getParentPaths(rows) {
  const parentPaths = new Set();

  rows.forEach((row) => {
    const parts = splitHierarchyPath(row.hierarchyPath);
    for (let index = 0; index < parts.length - 1; index += 1) {
      parentPaths.add(normalizeHierarchyPath(parts.slice(0, index + 1).join(" > ")));
    }
  });

  return parentPaths;
}

function getExplicitPaths(rows) {
  return new Set(rows.map((row) => normalizeHierarchyPath(row.hierarchyPath)).filter(Boolean));
}

function normalizeHierarchyPath(path) {
  return String(path ?? "").trim().toLocaleLowerCase("fr-FR");
}

function splitHierarchyPath(path) {
  return String(path ?? "")
    .split(">")
    .map((part) => part.trim())
    .filter(Boolean);
}

function toggleModule2Path(path) {
  const expandedPaths = getActiveModule2ExpandedPaths();
  saveModule2ScrollPosition();

  if (expandedPaths.has(path)) {
    collapseModule2Path(path);
  } else {
    expandedPaths.add(path);
  }

  if (latestState) {
    renderAppState(latestState);
    return;
  }

  const rows = [...elements.module2Table.querySelectorAll("tbody tr[data-normalized-path]")];
  applyModule2TreeState(getParentPathsFromRenderedRows(rows), getExplicitPathsFromRenderedRows(rows));
}

function collapseModule2Path(path) {
  const expandedPaths = getActiveModule2ExpandedPaths();

  expandedPaths.delete(path);
  [...expandedPaths].forEach((expandedPath) => {
    if (expandedPath.startsWith(`${path} > `)) expandedPaths.delete(expandedPath);
  });
}

function applyModule2TreeState(parentPaths, explicitPaths) {
  const rows = [...elements.module2Table.querySelectorAll("tbody tr[data-normalized-path]")];
  const expandedPaths = getActiveModule2ExpandedPaths();

  rows.forEach((row) => {
    const path = row.dataset.normalizedPath;
    const isParent = parentPaths.has(path);
    const isExpanded = expandedPaths.has(path);
    row.dataset.treeHidden = String(hasCollapsedExplicitAncestor(path, explicitPaths));
    row.classList.toggle("is-tree-parent", isParent);
    row.classList.remove("is-sticky-parent");
    row.classList.toggle("is-tree-expanded", isParent && isExpanded);
    row.classList.toggle("is-tree-collapsed", isParent && !isExpanded);
    setStickyParentPosition(row, isParent);

    const toggle = row.querySelector("[data-toggle-path]");
    if (toggle) {
      toggle.textContent = isExpanded ? "-" : "+";
      toggle.setAttribute("aria-expanded", String(isExpanded));
      toggle.setAttribute("aria-label", isExpanded ? "Replier" : "Déplier");
    }
  });

  applyModule2SearchFilter();
}

function applyModule2SearchFilter() {
  const rows = [...elements.module2Table.querySelectorAll("tbody tr[data-normalized-path]")];
  const query = getActiveModule2SearchQuery();

  if (!query) {
    rows.forEach((row) => {
      row.hidden = row.dataset.treeHidden === "true";
      row.classList.remove("is-search-match");
    });
    scheduleModule2StickyParentsUpdate();
    return;
  }

  const visiblePaths = new Set();
  const matchedPaths = new Set();

  rows.forEach((row) => {
    if (!row.dataset.searchText?.includes(query)) return;

    const path = row.dataset.normalizedPath;
    matchedPaths.add(path);
    getHierarchyAncestorPaths(row.dataset.hierarchyPath).forEach((ancestorPath) => {
      visiblePaths.add(ancestorPath);
    });
    visiblePaths.add(path);
  });

  rows.forEach((row) => {
    const path = row.dataset.normalizedPath;
    row.hidden = !visiblePaths.has(path);
    row.classList.toggle("is-search-match", matchedPaths.has(path));
  });

  scheduleModule2StickyParentsUpdate();
}

function getActiveModule2SearchQuery() {
  return getActiveModule2SearchRawValue()
    .trim()
    .toLocaleLowerCase("fr-FR");
}

function getActiveModule2SearchRawValue() {
  const context = getActiveModule2Context();
  return String(context.activeAxis === "template"
    ? module2TemplateAxisState.search
    : context.searchByAxis[context.activeAxis] ?? "");
}

function createModule2SearchText(seriesRow) {
  return [
    seriesRow.description,
    seriesRow.hierarchyPath,
    String(seriesRow.hierarchyPath ?? "").replaceAll(">", "/")
  ]
    .join(" ")
    .toLocaleLowerCase("fr-FR");
}

function getHierarchyAncestorPaths(path) {
  const parts = splitHierarchyPath(path);
  const paths = [];

  for (let index = 0; index < parts.length - 1; index += 1) {
    paths.push(normalizeHierarchyPath(parts.slice(0, index + 1).join(" > ")));
  }

  return paths;
}

function setStickyParentPosition(row, isParent) {
  if (!isParent) {
    row.style.removeProperty("--sticky-top");
    return;
  }

  const headerHeight = elements.module2Table.querySelector("thead")?.getBoundingClientRect().height ?? 0;
  const indentLevel = Number(row.dataset.indentLevel) || 0;
  row.style.setProperty("--sticky-top", `${headerHeight + (indentLevel * MODULE_2_STICKY_PARENT_ROW_HEIGHT)}px`);
}

function scheduleModule2StickyParentsUpdate() {
  if (module2StickyFrame) return;

  module2StickyFrame = requestAnimationFrame(() => {
    module2StickyFrame = 0;
    updateModule2StickyParents();
  });
}

function updateModule2StickyParents() {
  if (!elements.module2TableWrap) return;

  const rows = [...elements.module2Table.querySelectorAll("tbody tr[data-normalized-path]")];
  const headerHeight = elements.module2Table.querySelector("thead")?.getBoundingClientRect().height ?? 0;
  const scrollTop = elements.module2TableWrap.scrollTop;
  const stickyStack = new Map();

  rows.forEach((row) => {
    row.classList.remove("is-sticky-parent");

    if (!row.classList.contains("is-tree-parent") || row.hidden) return;

    const indentLevel = Number(row.dataset.indentLevel) || 0;
    const activationTop = scrollTop + headerHeight + (indentLevel * MODULE_2_STICKY_PARENT_ROW_HEIGHT);

    if (row.offsetTop > activationTop) return;

    stickyStack.set(indentLevel, row);
    [...stickyStack.keys()].forEach((level) => {
      if (level > indentLevel) stickyStack.delete(level);
    });
  });

  stickyStack.forEach((row) => {
    row.classList.add("is-sticky-parent");
  });
}

function hasCollapsedExplicitAncestor(path, explicitPaths) {
  const parts = splitHierarchyPath(path);
  const expandedPaths = getActiveModule2ExpandedPaths();

  for (let index = 0; index < parts.length - 1; index += 1) {
    const ancestor = normalizeHierarchyPath(parts.slice(0, index + 1).join(" > "));
    if (explicitPaths.has(ancestor) && !expandedPaths.has(ancestor)) return true;
  }

  return false;
}

function getParentPathsFromRenderedRows(rows) {
  return getParentPaths(rows.map((row) => ({
    hierarchyPath: row.dataset.hierarchyPath
  })));
}

function getExplicitPathsFromRenderedRows(rows) {
  return new Set(rows.map((row) => row.dataset.normalizedPath).filter(Boolean));
}

function selectModule2Row(pointCode, options = {}) {
  const { shouldFocus = false } = options;
  const context = getActiveModule2Context();
  const activeAxis = context.activeAxis;

  if (activeAxis === "template") {
    activeModule2TemplateId = pointCode || activeModule2TemplateId;
    getActiveModule2Context().activeAxis = "template";
  } else if (activeAxis === "y") {
    context.selectedYCode = pointCode || context.selectedYCode;
  } else if (activeAxis === "z") {
    context.selectedZCode = pointCode || context.selectedZCode;
  } else {
    context.selectedXCode = pointCode || context.selectedXCode;
  }
  const selectedCode = getSelectedModule2CodeForActiveAxis();

  if (latestState) {
    saveModule2ScrollPosition();
    renderAppState(latestState);
    if (shouldFocus && selectedCode) focusSelectedModule2Row();
    return;
  }

  applyModule2Selection();
  if (shouldFocus && selectedCode) focusSelectedModule2Row();
}

function applyModule2Selection() {
  const rows = [...elements.module2Table.querySelectorAll("tbody tr")];

  rows.forEach((row) => {
    row.classList.remove(
      "is-selected",
      "is-ancestor",
      "is-family",
      "is-descendant",
      "is-selected-child",
      "is-leaf-parent-highlight",
      "is-leaf-sibling-highlight"
    );
    row.removeAttribute("aria-selected");
    row.style.removeProperty("--highlight-start");
    row.style.removeProperty("--parent-highlight-start");
  });

  const selectedCode = getSelectedModule2CodeForActiveAxis();
  if (!selectedCode) return;

  const selectedRow = rows.find((row) => row.dataset.pointCode === selectedCode);
  const selectedPath = selectedRow?.dataset.normalizedPath || "";
  const selectedIndentLevel = Number(selectedRow?.dataset.indentLevel) || 0;
  const highlightStart = getModule2HighlightStart(selectedIndentLevel);

  if (selectedPath) {
    const orderedAncestorPaths = getHierarchyAncestorPaths(selectedRow.dataset.hierarchyPath);
    const ancestorPaths = new Set(orderedAncestorPaths);
    const isSelectedLeaf = selectedRow.dataset.isParent !== "true";
    const parentPath = normalizeHierarchyPath(selectedRow.dataset.parentPath);

    rows.forEach((row) => {
      const path = row.dataset.normalizedPath || "";
      const isSelectedChild = path.startsWith(`${selectedPath} > `);
      row.classList.toggle("is-selected-child", isSelectedChild);
      row.classList.toggle("is-ancestor", ancestorPaths.has(path));
      if (isSelectedChild) row.style.setProperty("--highlight-start", highlightStart);
    });

    if (isSelectedLeaf && parentPath) {
      applyLeafFamilyHighlight(rows, selectedRow, parentPath);
    }
  }

  rows.forEach((row) => {
    if (row.dataset.pointCode === selectedCode) {
      row.classList.add("is-selected");
      row.setAttribute("aria-selected", "true");
      row.style.setProperty("--highlight-start", highlightStart);
    }
  });
}

function applyLeafFamilyHighlight(rows, selectedRow, parentPath) {
  const parentRow = rows.find((row) => row.dataset.normalizedPath === parentPath);
  const parentHighlightStart = getModule2HighlightStart(Number(parentRow?.dataset.indentLevel) || 0);

  selectedRow.style.setProperty("--parent-highlight-start", parentHighlightStart);

  rows.forEach((row) => {
    const path = row.dataset.normalizedPath || "";

    if (path === parentPath) {
      row.classList.add("is-leaf-parent-highlight");
      row.style.setProperty("--highlight-start", parentHighlightStart);
      return;
    }

    if (row !== selectedRow && path.startsWith(`${parentPath} > `)) {
      row.classList.add("is-leaf-sibling-highlight");
      row.style.setProperty("--highlight-start", parentHighlightStart);
    }
  });
}

function getModule2HighlightStart(indentLevel) {
  return `${18 + (indentLevel * 18)}px`;
}

function moveModule2Selection(direction) {
  const rows = getVisibleSelectableModule2Rows();
  if (rows.length === 0) return;

  const focusedRow = document.activeElement?.closest?.("tbody tr[data-point-code]");
  const currentCode = getSelectedModule2CodeForActiveAxis() || focusedRow?.dataset.pointCode || "";
  const currentIndex = rows.findIndex((row) => row.dataset.pointCode === currentCode);
  const fallbackIndex = direction > 0 ? 0 : rows.length - 1;
  const nextIndex = currentIndex === -1
    ? fallbackIndex
    : Math.min(Math.max(currentIndex + direction, 0), rows.length - 1);

  setSelectedModule2CodeForActiveAxis(rows[nextIndex].dataset.pointCode);
  applyModule2Selection();
  focusSelectedModule2Row();
}

function setSelectedModule2CodeForActiveAxis(pointCode) {
  const context = getActiveModule2Context();

  if (context.activeAxis === "template") {
    activeModule2TemplateId = pointCode || activeModule2TemplateId;
    getActiveModule2Context().activeAxis = "template";
  } else if (context.activeAxis === "y") {
    context.selectedYCode = pointCode;
  } else if (context.activeAxis === "z") {
    context.selectedZCode = pointCode;
  } else {
    context.selectedXCode = pointCode || MODULE_2_TARGET.xAxisRcCode;
  }
}

function getVisibleSelectableModule2Rows() {
  return [...elements.module2Table.querySelectorAll("tbody tr[data-point-code]")]
    .filter((row) => !row.hidden);
}

function focusSelectedModule2Row() {
  const selectedCode = getSelectedModule2CodeForActiveAxis();
  const row = elements.module2Table.querySelector(`tbody tr[data-point-code="${CSS.escape(selectedCode)}"]`);
  if (!row || row.hidden) return;

  row.focus({ preventScroll: true });
  row.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function saveModule2ScrollPosition() {
  if (!elements.module2TableWrap) return;

  const context = getActiveModule2Context();
  if (context.activeAxis === "template") {
    module2TemplateAxisState.scroll = {
      left: elements.module2TableWrap.scrollLeft,
      top: elements.module2TableWrap.scrollTop
    };
    return;
  }

  context.scrollByAxis[context.activeAxis] = {
    left: elements.module2TableWrap.scrollLeft,
    top: elements.module2TableWrap.scrollTop
  };
}

function restoreModule2ScrollPosition() {
  if (!elements.module2TableWrap) return;

  const context = getActiveModule2Context();
  const position = context.activeAxis === "template"
    ? module2TemplateAxisState.scroll
    : context.scrollByAxis[context.activeAxis] ?? { left: 0, top: 0 };
  elements.module2TableWrap.scrollLeft = position.left;
  elements.module2TableWrap.scrollTop = position.top;
  scheduleModule2StickyParentsUpdate();
}

function formatMetricValue(value, selectedUnit, valueFormat = "") {
  if (isPercentFormat(valueFormat)) return formatPercentValue(value);

  const unit = getUnitDefinition(selectedUnit);
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value / unit.divisor);
}

function isPercentFormat(valueFormat) {
  const format = String(valueFormat ?? "").trim().toLocaleLowerCase("fr-FR");
  if (!format) return false;

  return ["%", "pct", "percent", "percentage", "pourcent", "pourcentage"]
    .some((keyword) => format.includes(keyword));
}

function formatPercentValue(value) {
  const percentValue = Math.abs(value) <= 1 ? value * 100 : value;

  return `${new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(percentValue)} %`;
}

function getUnitDefinition(selectedUnit) {
  const units = {
    billions: { divisor: 1_000_000_000 },
    euros: { divisor: 1 },
    millions: { divisor: 1_000_000 },
    thousands: { divisor: 1_000 }
  };

  return units[selectedUnit] ?? units.millions;
}
