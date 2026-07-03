import { getIndexedAxisCodes, getIndexedRowsByCoordinates, getIndexedRowsByTableJst, getIndexedTableIds } from "../data/dataIndex.js";
import { buildModule2AxisSeries, MODULE_2_TARGET } from "../data/timeSeries.js?v=20260703-contribution-benchmark";
import { normalizeAxisCode } from "../data/module2Config.js";

let latestState = null;
let activeModule2TemplateId = MODULE_2_TARGET.tableId;
const module2TemplateContexts = new Map();
const module2TemplateAxisState = {
  scroll: { left: 0, top: 0 },
  search: ""
};
const MODULE_2_STICKY_PARENT_ROW_HEIGHT = 28;
let module2StickyFrame = 0;
let module2ContextMenu = null;
let module2BenchmarkDialog = null;

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
  elements.module2TableWrap?.addEventListener("scroll", hideModule2ContextMenu, { passive: true });
  elements.module2Table.addEventListener("click", (event) => {
    hideModule2ContextMenu();

    const toggle = event.target.closest("[data-toggle-path]");
    if (toggle) {
      toggleModule2Path(toggle.dataset.togglePath);
      return;
    }

    const row = event.target.closest("tbody tr[data-point-code]");
    if (row) selectModule2Row(row.dataset.pointCode, { shouldToggle: true, shouldFocus: true });
  });
  elements.module2Table.addEventListener("contextmenu", (event) => {
    const row = event.target.closest("tbody tr[data-normalized-path]");
    if (!row) return;

    event.preventDefault();
    if (row.dataset.pointCode) {
      setSelectedModule2CodeForActiveAxis(row.dataset.pointCode);
      applyModule2Selection();
      renderModule2AxisTabs();
      row.focus({ preventScroll: true });
    }
    showModule2ContextMenu(row, event);
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
  document.addEventListener("click", hideModule2ContextMenu);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideModule2ContextMenu();
      hideModule2BenchmarkDialog();
    }
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
    contributionBaseByAxis: {
      template: null,
      x: null,
      y: null,
      z: null
    },
    selectedXCode: "",
    selectedYCode: "",
    selectedZCode: ""
  };
}

function getActiveModule2Template() {
  const templates = getModule2Templates(latestState);
  return templates.find((template) => template.tableId === activeModule2TemplateId) ?? templates[0] ?? {
    tableId: activeModule2TemplateId || MODULE_2_TARGET.tableId,
    label: activeModule2TemplateId || MODULE_2_TARGET.tableId
  };
}

function getActiveModule2Context() {
  return getModule2ContextForTemplate(activeModule2TemplateId);
}

function getModule2Templates(state = latestState) {
  const tableIds = getModule2TableIds(state);

  return tableIds.map((tableId) => ({
    tableId,
    label: tableId
  }));
}

function getModule2TableIds(state) {
  if (!state) return [];

  const indexedTableIds = getIndexedTableIds(state);
  if (indexedTableIds.length > 0 || state.dataIndexes) return indexedTableIds;

  const indexes = getModule2SourceIndexes(state.columns);
  if (!indexes || !state.selectedJst) return [];

  return [...new Set(state.rows
    .filter((row) => row[indexes.jstCode] === state.selectedJst)
    .map((row) => row[indexes.tableId])
    .filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, "fr", { numeric: true }));
}

function ensureActiveModule2Template(state) {
  const templates = getModule2Templates(state);
  if (templates.length === 0) return;
  if (templates.some((template) => template.tableId === activeModule2TemplateId)) return;

  activeModule2TemplateId = templates[0].tableId;
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
  const templates = getModule2Templates(state);
  const configuredYCodes = getConfiguredModule2AxisCodes(state, tableId, "y");
  const configuredZCodes = getConfiguredModule2AxisCodes(state, tableId, "z");
  const availableXCodes = getAvailableModule2AxisCodes(state, tableId, "x");
  const availableYCodes = getAvailableModule2AxisCodes(state, tableId, "y");
  const availableZCodes = getAvailableModule2AxisCodes(state, tableId, "z");
  const yCodes = getPreferredModule2AxisCodes(configuredYCodes, availableYCodes);
  const zCodes = getPreferredModule2AxisCodes(configuredZCodes, availableZCodes);

  return {
    template: {
      codes: templates.map((template) => template.tableId),
      isVisible: templates.length > 1
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
  ensureActiveModule2Template(state);
  const context = getActiveModule2Context();
  const template = getActiveModule2Template();
  const templates = getModule2Templates(state);
  ensureModule2Selections(state);
  if (context.activeAxis === "template") ensureAllModule2TemplateSelections(state);
  const tableSeries = buildModule2AxisSeries(state, {
    axis: context.activeAxis,
    selectedXCode: context.selectedXCode,
    selectedYCode: context.selectedYCode,
    selectedZCode: context.selectedZCode,
    tableId: template?.tableId,
    templateSelections: getModule2TemplateSelections(),
    templates
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
  getModule2Templates(state).forEach((template) => {
    ensureModule2TemplateSelections(state, template.tableId);
  });
}

function getModule2TemplateSelections(state = latestState) {
  return Object.fromEntries(getModule2Templates(state).map((template) => {
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
  hideModule2ContextMenu();
  const activeAxis = getActiveModule2Axis();
  const orderedDates = [...series.dateColumns].reverse();
  const tableRows = series.rows.map(normalizeModule2SeriesRow);
  const displayRows = buildModule2DisplayRows(tableRows);
  const contributionBase = getModule2ContributionBase(displayRows, activeAxis);
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
    const isContributionChild = isModule2ContributionChild(normalizedPath, contributionBase);

    if (!seriesRow.isVirtual) valueRow.dataset.pointCode = seriesRow.code;
    valueRow.dataset.axis = activeAxis;
    valueRow.dataset.hierarchyPath = seriesRow.hierarchyPath;
    valueRow.dataset.normalizedPath = normalizedPath;
    valueRow.dataset.searchText = createModule2SearchText(seriesRow);
    valueRow.dataset.isParent = String(isParent);
    valueRow.dataset.isVirtual = String(Boolean(seriesRow.isVirtual));
    valueRow.dataset.parentPath = seriesRow.parentPath;
    valueRow.dataset.indentLevel = String(seriesRow.indentLevel ?? 0);
    valueRow.classList.toggle("is-contribution-base", normalizedPath === contributionBase?.path);
    valueRow.classList.toggle("is-contribution-child", isContributionChild);
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

    const reversedValues = [...seriesRow.values].reverse();
    const reversedBaseValues = contributionBase ? [...contributionBase.row.values].reverse() : [];

    reversedValues.forEach((point, index) => {
      const td = document.createElement("td");
      td.className = index === 0 ? "latest-column" : "";
      const contributionValue = isContributionChild
        ? getModule2ContributionRatio(point.value, reversedBaseValues[index]?.value)
        : null;
      td.textContent = seriesRow.isVirtual || point.value === null
        ? "-"
        : contributionValue === null
          ? formatMetricValue(point.value, selectedUnit, seriesRow.format)
          : formatContributionPercentValue(contributionValue);
      valueRow.append(td);
    });

    tbody.append(valueRow);
  });

  thead.append(headerRow);
  elements.module2Table.append(thead, tbody);
  applyModule2TreeState(parentPaths, nodePaths);
}

function getModule2ContributionBase(rows, activeAxis) {
  const base = getActiveModule2Context().contributionBaseByAxis[activeAxis];
  if (!base?.path) return null;

  const path = normalizeHierarchyPath(base.path);
  const row = rows.find((item) => normalizeHierarchyPath(item.hierarchyPath) === path);
  if (!row) {
    getActiveModule2Context().contributionBaseByAxis[activeAxis] = null;
    return null;
  }

  return { ...base, path, row };
}

function isModule2ContributionChild(path, contributionBase) {
  if (!contributionBase?.path) return false;
  return path.startsWith(`${contributionBase.path} > `);
}

function getModule2ContributionRatio(value, baseValue) {
  if (value === null || baseValue === null || baseValue === 0) return null;
  return value / baseValue;
}

function showModule2ContextMenu(row, event) {
  hideModule2ContextMenu();

  module2ContextMenu = createModule2ContextMenu(row);
  document.body.append(module2ContextMenu);

  const { innerWidth, innerHeight } = window;
  const menuRect = module2ContextMenu.getBoundingClientRect();
  const left = Math.min(event.clientX, innerWidth - menuRect.width - 8);
  const top = Math.min(event.clientY, innerHeight - menuRect.height - 8);

  module2ContextMenu.style.left = `${Math.max(8, left)}px`;
  module2ContextMenu.style.top = `${Math.max(8, top)}px`;
}

function hideModule2ContextMenu() {
  module2ContextMenu?.remove();
  module2ContextMenu = null;
}

function createModule2ContextMenu(row) {
  const menu = document.createElement("div");
  menu.className = "context-menu";
  menu.setAttribute("role", "menu");

  if (row.dataset.pointCode) {
    menu.append(createContextMenuButton("Sélectionner", () => {
      selectModule2Row(row.dataset.pointCode, { shouldFocus: true });
    }));
    menu.append(createContextMenuButton("Benchmark", () => {
      showModule2BenchmarkDialog();
    }));
  }

  const activeContributionBase = getActiveModule2ContributionSetting();
  const isCurrentContributionBase = activeContributionBase?.path === row.dataset.normalizedPath;
  if (row.dataset.pointCode && row.dataset.isParent === "true" && !isCurrentContributionBase) {
    menu.append(createContextMenuButton("Show contribution to selected total", () => {
      setModule2ContributionBase(row);
    }));
  }
  if (activeContributionBase) {
    menu.append(createContextMenuButton("Show absolute values", () => {
      clearModule2ContributionBase();
    }));
  }

  if (row.dataset.isParent === "true") {
    const expandedPaths = getActiveModule2ExpandedPaths();
    const isExpanded = expandedPaths.has(row.dataset.normalizedPath);
    menu.append(createContextMenuButton(isExpanded ? "Replier" : "Déplier", () => {
      toggleModule2Path(row.dataset.normalizedPath);
    }));
  }

  menu.append(createContextMenuButton("Copier le libellé", () => {
    copyModule2Label(row.dataset.hierarchyPath);
  }));

  return menu;
}

function createContextMenuButton(label, action) {
  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute("role", "menuitem");
  button.textContent = label;
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    hideModule2ContextMenu();
    action();
  });
  return button;
}

function copyModule2Label(label) {
  const text = String(label ?? "").replaceAll(">", "/");
  if (!text || !navigator.clipboard?.writeText) return;
  navigator.clipboard.writeText(text).catch(() => {});
}

function getActiveModule2ContributionSetting() {
  const context = getActiveModule2Context();
  return context.contributionBaseByAxis[context.activeAxis];
}

function setModule2ContributionBase(row) {
  const context = getActiveModule2Context();
  context.contributionBaseByAxis[context.activeAxis] = {
    label: row.dataset.hierarchyPath,
    path: row.dataset.normalizedPath,
    pointCode: row.dataset.pointCode
  };

  saveModule2ScrollPosition();
  if (latestState) renderAppState(latestState);
}

function clearModule2ContributionBase() {
  const context = getActiveModule2Context();
  context.contributionBaseByAxis[context.activeAxis] = null;

  saveModule2ScrollPosition();
  if (latestState) renderAppState(latestState);
}

function showModule2BenchmarkDialog() {
  hideModule2BenchmarkDialog();

  const benchmark = buildModule2Benchmark();
  module2BenchmarkDialog = createModule2BenchmarkDialog(benchmark);
  document.body.append(module2BenchmarkDialog);
}

function hideModule2BenchmarkDialog() {
  module2BenchmarkDialog?.remove();
  module2BenchmarkDialog = null;
}

function createModule2BenchmarkDialog(benchmark) {
  const overlay = document.createElement("div");
  overlay.className = "benchmark-overlay";
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) hideModule2BenchmarkDialog();
  });

  const dialog = document.createElement("section");
  dialog.className = "benchmark-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-label", "Benchmark JST");

  const header = document.createElement("header");
  header.className = "benchmark-header";

  const title = document.createElement("div");
  const strong = document.createElement("strong");
  strong.textContent = "Benchmark JST";
  const subtitle = document.createElement("span");
  subtitle.textContent = benchmark.label;
  title.append(strong, subtitle);

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.textContent = "Fermer";
  closeButton.addEventListener("click", hideModule2BenchmarkDialog);
  header.append(title, closeButton);

  const body = document.createElement("div");
  body.className = "benchmark-body";

  if (benchmark.series.length === 0 || benchmark.dates.length === 0) {
    const empty = document.createElement("p");
    empty.className = "benchmark-empty";
    empty.textContent = "Aucune donnée disponible pour ce point.";
    body.append(empty);
  } else {
    body.append(createBenchmarkChart(benchmark));
    body.append(createBenchmarkLegend(benchmark));
  }

  dialog.append(header, body);
  overlay.append(dialog);
  return overlay;
}

function buildModule2Benchmark() {
  const state = latestState;
  const tableId = getActiveModule2Template()?.tableId ?? MODULE_2_TARGET.tableId;
  const context = getActiveModule2Context();
  const activeAxis = context.activeAxis;
  const selections = getCompleteModule2SelectionsForBenchmark(context, activeAxis);
  const contribution = getModule2BenchmarkContributionContext(context, activeAxis);
  const indexes = getBenchmarkSourceIndexes(state?.columns ?? []);
  const dates = getBenchmarkReferenceColumns(state?.columns ?? []);
  const format = getBenchmarkValueFormat(state, tableId, context, activeAxis);
  const label = getBenchmarkLabel(state, tableId, context, activeAxis);

  if (!state || !indexes || dates.length === 0) {
    return { dates: [], format, isContribution: false, label, series: [] };
  }

  const series = (state.jstOptions ?? []).map((jstCode) => {
    const rows = getBenchmarkRows(state, indexes, tableId, selections, jstCode);
    const baseRows = contribution
      ? getBenchmarkRows(state, indexes, tableId, contribution.selections, jstCode)
      : [];

    return {
      jstCode,
      values: dates.map((dateColumn) => ({
        date: dateColumn.date,
        label: dateColumn.label,
        value: rows.length === 0
          ? null
          : getBenchmarkPointValue(rows, baseRows, dateColumn.index, Boolean(contribution))
      }))
    };
  }).filter((item) => item.values.some((point) => point.value !== null));

  return {
    dates,
    format,
    isContribution: Boolean(contribution),
    label: contribution ? `${label} / ${contribution.label}` : label,
    series
  };
}

function getCompleteModule2SelectionsForBenchmark(context, activeAxis) {
  const selectedCode = getSelectedModule2CodeForActiveAxis();
  return getModule2SelectionsForAxisCode(context, activeAxis, selectedCode);
}

function getModule2SelectionsForAxisCode(context, activeAxis, axisCode) {
  return {
    selectedXCode: normalizeAxisCode(activeAxis === "x" ? axisCode : context.selectedXCode, "x"),
    selectedYCode: normalizeAxisCode(activeAxis === "y" ? axisCode : context.selectedYCode, "y"),
    selectedZCode: normalizeAxisCode(activeAxis === "z" ? axisCode : context.selectedZCode, "z")
  };
}

function getModule2BenchmarkContributionContext(context, activeAxis) {
  const base = context.contributionBaseByAxis[activeAxis];
  if (!base?.path) return null;

  const selectedCode = getSelectedModule2CodeForActiveAxis();
  const selectedRow = elements.module2Table.querySelector(`tbody tr[data-point-code="${CSS.escape(selectedCode)}"]`);
  const selectedPath = selectedRow?.dataset.normalizedPath || "";
  const basePath = normalizeHierarchyPath(base.path);

  if (!selectedPath.startsWith(`${basePath} > `)) return null;

  const baseCode = base.pointCode
    || elements.module2Table.querySelector(`tbody tr[data-normalized-path="${CSS.escape(basePath)}"]`)?.dataset.pointCode;
  if (!baseCode) return null;

  return {
    label: String(base.label ?? "").replaceAll(">", "/"),
    selections: getModule2SelectionsForAxisCode(context, activeAxis, baseCode)
  };
}

function getBenchmarkPointValue(rows, baseRows, dateColumnIndex, isContribution) {
  const value = rows.reduce((total, row) => total + parseBenchmarkNumber(row[dateColumnIndex]), 0);
  if (!isContribution) return value;

  const baseValue = baseRows.reduce((total, row) => total + parseBenchmarkNumber(row[dateColumnIndex]), 0);
  if (baseRows.length === 0 || baseValue === 0) return null;

  return value / baseValue;
}

function getBenchmarkRows(state, indexes, tableId, selections, jstCode) {
  if (hasCompleteBenchmarkSelection(selections)) {
    const indexedRows = getIndexedRowsByCoordinates(state, tableId, selections, jstCode);
    if (indexedRows.length > 0 || state.dataIndexes) return indexedRows;
  }

  return state.rows.filter((row) => (
    row[indexes.jstCode] === jstCode
    && row[indexes.tableId] === tableId
    && matchesBenchmarkSelection(row, indexes, "x", selections.selectedXCode)
    && matchesBenchmarkSelection(row, indexes, "y", selections.selectedYCode)
    && matchesBenchmarkSelection(row, indexes, "z", selections.selectedZCode)
  ));
}

function hasCompleteBenchmarkSelection(selections) {
  return Boolean(selections.selectedXCode && selections.selectedYCode && selections.selectedZCode);
}

function matchesBenchmarkSelection(row, indexes, axis, selectedCode) {
  if (!selectedCode) return true;
  return normalizeAxisCode(row[indexes[`${axis}AxisRcCode`]], axis) === selectedCode;
}

function getBenchmarkLabel(state, tableId, context, activeAxis) {
  if (activeAxis === "template") return getActiveModule2Template()?.label || tableId;
  if (activeAxis === "x") {
    return state?.dimensionMapping?.find(tableId, "x_axis_rc_code", context.selectedXCode)?.description
      || `Column ${context.selectedXCode}`;
  }
  if (activeAxis === "z") {
    return state?.module2Points?.find((point) => (
      point.tableId === tableId
      && point.coordinate === "z_axis_rc_code"
      && point.code === context.selectedZCode
    ))?.description || `Tab ${context.selectedZCode}`;
  }
  return state?.module2Points?.find((point) => (
    point.tableId === tableId
    && point.coordinate === "y_axis_rc_code"
    && point.code === context.selectedYCode
  ))?.description || `Row ${context.selectedYCode}`;
}

function getBenchmarkValueFormat(state, tableId, context, activeAxis) {
  const candidates = [
    { axis: "y", code: context.selectedYCode, coordinate: "y_axis_rc_code" },
    { axis: "z", code: context.selectedZCode, coordinate: "z_axis_rc_code" },
    { axis: "x", code: context.selectedXCode, coordinate: "x_axis_rc_code" }
  ];

  for (const candidate of candidates) {
    if (!candidate.code) continue;

    const configuredFormat = state?.module2Points?.find((point) => (
      point.tableId === tableId
      && point.coordinate === candidate.coordinate
      && point.code === candidate.code
    ))?.format;
    if (configuredFormat) return configuredFormat;

    const mappingFormat = state?.dimensionMapping?.find(tableId, candidate.coordinate, candidate.code)?.format;
    if (mappingFormat) return mappingFormat;
  }

  return activeAxis === "template" ? "" : "";
}

function createBenchmarkChart(benchmark) {
  const selectedJst = latestState?.selectedJst || "";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "benchmark-chart");
  svg.setAttribute("viewBox", "0 0 760 360");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Graphique benchmark par JST");

  const values = benchmark.series.flatMap((serie) => serie.values.map((point) => point.value).filter((value) => value !== null));
  const minValue = Math.min(0, ...values);
  const maxValue = Math.max(0, ...values);
  const range = maxValue - minValue || 1;
  const plot = { left: 58, top: 24, width: 660, height: 270 };

  appendBenchmarkGrid(svg, plot);
  appendBenchmarkAxes(svg, benchmark, plot, minValue, maxValue);

  const tooltip = createBenchmarkTooltip();
  svg.append(tooltip.group);

  benchmark.series.forEach((serie, index) => {
    const isSelectedJst = serie.jstCode === selectedJst;
    const color = getBenchmarkColor(index, isSelectedJst);
    const points = serie.values
      .map((point, pointIndex) => {
        if (point.value === null) return null;
        const x = plot.left + (benchmark.dates.length <= 1 ? plot.width / 2 : (pointIndex / (benchmark.dates.length - 1)) * plot.width);
        const y = plot.top + plot.height - (((point.value - minValue) / range) * plot.height);
        return { x, y, value: point.value, label: point.label };
      })
      .filter(Boolean);

    if (points.length === 0) return;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", points.map((point, pointIndex) => `${pointIndex === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" "));
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", color);
    path.setAttribute("stroke-width", isSelectedJst ? "2.6" : "1.4");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("class", isSelectedJst ? "benchmark-line is-selected-jst" : "benchmark-line");
    if (!isSelectedJst) path.setAttribute("stroke-dasharray", "4 5");
    svg.append(path);

    points.forEach((point) => {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", point.x);
      circle.setAttribute("cy", point.y);
      circle.setAttribute("r", isSelectedJst ? "4" : "3");
      circle.setAttribute("fill", color);
      circle.setAttribute("class", isSelectedJst ? "benchmark-point is-selected-jst" : "benchmark-point");
      circle.addEventListener("mouseenter", () => {
        showBenchmarkTooltip(tooltip, point.x, point.y, `${serie.jstCode} - ${point.label}`, formatBenchmarkValue(point.value, benchmark));
      });
      circle.addEventListener("focus", () => {
        showBenchmarkTooltip(tooltip, point.x, point.y, `${serie.jstCode} - ${point.label}`, formatBenchmarkValue(point.value, benchmark));
      });
      circle.addEventListener("mouseleave", () => hideBenchmarkTooltip(tooltip));
      circle.addEventListener("blur", () => hideBenchmarkTooltip(tooltip));
      circle.setAttribute("tabindex", "0");
      circle.append(createSvgTitle(`${serie.jstCode} - ${point.label}: ${formatBenchmarkValue(point.value, benchmark)}`));
      svg.append(circle);
    });
  });

  return svg;
}

function createBenchmarkTooltip() {
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
  const value = document.createElementNS("http://www.w3.org/2000/svg", "text");

  group.setAttribute("class", "benchmark-tooltip");
  group.setAttribute("opacity", "0");
  background.setAttribute("rx", "5");
  background.setAttribute("ry", "5");
  label.setAttribute("class", "benchmark-tooltip-label");
  value.setAttribute("class", "benchmark-tooltip-value");
  group.append(background, label, value);

  return { background, group, label, value };
}

function showBenchmarkTooltip(tooltip, x, y, label, value) {
  tooltip.label.textContent = label;
  tooltip.value.textContent = value;

  const tooltipWidth = 178;
  const tooltipHeight = 48;
  const left = Math.min(Math.max(8, x + 12), 760 - tooltipWidth - 8);
  const top = Math.max(8, y - tooltipHeight - 10);

  tooltip.background.setAttribute("x", left);
  tooltip.background.setAttribute("y", top);
  tooltip.background.setAttribute("width", tooltipWidth);
  tooltip.background.setAttribute("height", tooltipHeight);
  tooltip.label.setAttribute("x", left + 10);
  tooltip.label.setAttribute("y", top + 18);
  tooltip.value.setAttribute("x", left + 10);
  tooltip.value.setAttribute("y", top + 36);
  tooltip.group.setAttribute("opacity", "1");
}

function hideBenchmarkTooltip(tooltip) {
  tooltip.group.setAttribute("opacity", "0");
}

function appendBenchmarkGrid(svg, plot) {
  for (let index = 0; index <= 4; index += 1) {
    const y = plot.top + ((plot.height / 4) * index);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", plot.left);
    line.setAttribute("x2", plot.left + plot.width);
    line.setAttribute("y1", y);
    line.setAttribute("y2", y);
    line.setAttribute("class", "benchmark-grid-line");
    svg.append(line);
  }
}

function appendBenchmarkAxes(svg, benchmark, plot, minValue, maxValue) {
  [maxValue, (maxValue + minValue) / 2, minValue].forEach((value, index) => {
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", plot.left - 10);
    text.setAttribute("y", plot.top + ((plot.height / 2) * index) + 4);
    text.setAttribute("text-anchor", "end");
    text.setAttribute("class", "benchmark-axis-label");
    text.textContent = formatBenchmarkValue(value, benchmark);
    svg.append(text);
  });

  benchmark.dates.forEach((dateColumn, index) => {
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", plot.left + (benchmark.dates.length <= 1 ? plot.width / 2 : (index / (benchmark.dates.length - 1)) * plot.width));
    text.setAttribute("y", plot.top + plot.height + 32);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("class", "benchmark-axis-label");
    text.textContent = dateColumn.label;
    svg.append(text);
  });
}

function createBenchmarkLegend(benchmark) {
  const legend = document.createElement("div");
  legend.className = "benchmark-legend";
  const selectedJst = latestState?.selectedJst || "";

  benchmark.series.forEach((serie, index) => {
    const item = document.createElement("span");
    const swatch = document.createElement("i");
    const isSelectedJst = serie.jstCode === selectedJst;
    swatch.style.background = getBenchmarkColor(index, isSelectedJst);
    item.classList.toggle("is-selected-jst", isSelectedJst);
    item.append(swatch, document.createTextNode(serie.jstCode));
    legend.append(item);
  });

  return legend;
}

function formatBenchmarkValue(value, benchmark) {
  return benchmark.isContribution
    ? formatContributionPercentValue(value)
    : formatMetricValue(value, latestState.selectedUnit, benchmark.format);
}

function createSvgTitle(text) {
  const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
  title.textContent = text;
  return title;
}

function getBenchmarkColor(index, isSelectedJst = false) {
  if (isSelectedJst) return "#17483f";

  const grays = ["#8d9891", "#a1aaa5", "#b5bdb8", "#7c8781"];
  return grays[index % grays.length];
}

function getBenchmarkSourceIndexes(columns) {
  const indexes = {
    jstCode: columns.indexOf("jst_code"),
    tableId: columns.indexOf("table_id"),
    xAxisRcCode: columns.indexOf("x_axis_rc_code"),
    yAxisRcCode: columns.indexOf("y_axis_rc_code"),
    zAxisRcCode: columns.indexOf("z_axis_rc_code")
  };

  return Object.values(indexes).every((index) => index !== -1) ? indexes : null;
}

function getBenchmarkReferenceColumns(columns) {
  return columns
    .map((name, index) => {
      const match = String(name).match(/^ref_(\d{4})_(\d{2})_(\d{2})$/);
      if (!match) return null;

      const [, year, month, day] = match;
      const date = new Date(Number(year), Number(month) - 1, Number(day));
      return {
        date,
        index,
        label: new Intl.DateTimeFormat("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric"
        }).format(date)
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.date - right.date);
}

function parseBenchmarkNumber(value) {
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
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

function formatContributionPercentValue(value) {
  return `${new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value * 100)} %`;
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
