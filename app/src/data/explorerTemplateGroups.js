import { parseCsv } from "./csvParser.js?v=20260917-kri-formula";

const EXPLORER_TEMPLATE_GROUPS_URL = "./assets/ITS_explorer_template_groups.csv";
const EXPLORER_LAST_TEMPLATE_GROUP = "Funding Plan";

export async function loadExplorerTemplateGroups() {
  const response = await fetch(EXPLORER_TEMPLATE_GROUPS_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("La configuration interne des groupes de templates n'a pas pu être chargée.");
  }

  const parsed = parseCsv(await response.text());
  return parseExplorerTemplateGroups(parsed.columns, parsed.rows);
}

// groupOrder is the order groups first appear in the CSV, so reordering the
// file's rows is enough to reorder the groups shown in the Explorer.
export function parseExplorerTemplateGroups(columns, rows) {
  const indexes = {
    template: columns.indexOf("template"),
    group: columns.indexOf("groupe")
  };

  if (indexes.template === -1) {
    throw new Error("La configuration interne des groupes de templates n'a pas la structure attendue.");
  }

  const groupByTemplateId = new Map();
  const groupOrder = [];

  rows.forEach((row) => {
    const templateId = row[indexes.template];
    if (!templateId) return;

    const group = String(indexes.group === -1 ? "" : row[indexes.group] ?? "").trim();
    if (!group) return;

    groupByTemplateId.set(templateId, group);
    if (!groupOrder.includes(group)) groupOrder.push(group);
  });

  return { groupByTemplateId, groupOrder };
}

// Templates with no configured group keep their given order. Funding Plan
// is deliberately appended after them and every configured group so it
// remains the final section regardless of the CSV's group order.
export function groupExplorerTemplatesByFamily(templates, config) {
  if (!config || config.groupByTemplateId.size === 0) {
    return [{ group: "", templates }];
  }

  const templatesByGroup = new Map();
  const ungrouped = [];

  templates.forEach((template) => {
    const group = config.groupByTemplateId.get(template.id) ?? "";
    if (!group) {
      ungrouped.push(template);
      return;
    }
    if (!templatesByGroup.has(group)) templatesByGroup.set(group, []);
    templatesByGroup.get(group).push(template);
  });

  const sections = config.groupOrder
    .filter((group) => group !== EXPLORER_LAST_TEMPLATE_GROUP && templatesByGroup.has(group))
    .map((group) => ({ group, templates: templatesByGroup.get(group) }));

  if (ungrouped.length > 0) sections.push({ group: "", templates: ungrouped });
  if (templatesByGroup.has(EXPLORER_LAST_TEMPLATE_GROUP)) {
    sections.push({
      group: EXPLORER_LAST_TEMPLATE_GROUP,
      templates: templatesByGroup.get(EXPLORER_LAST_TEMPLATE_GROUP)
    });
  }

  return sections;
}
