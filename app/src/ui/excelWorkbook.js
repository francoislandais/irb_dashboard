const encoder = new TextEncoder();

export function downloadExcelWorkbook({ columns, fileName, metadata, rows, subtitle, title }) {
  const blob = createExcelWorkbookBlob({ columns, metadata, rows, subtitle, title });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function createExcelWorkbookBlob({ columns, metadata, rows, subtitle, title }) {
  const workbookFiles = buildWorkbookFiles({ columns, metadata, rows, subtitle, title });
  return createZip(workbookFiles);
}

function buildWorkbookFiles({ columns, metadata, rows, subtitle, title }) {
  const sheet = buildSheetXml({ columns, metadata, rows, subtitle, title });
  const createdAt = new Date().toISOString();
  return [
    ["[Content_Types].xml", contentTypesXml()],
    ["_rels/.rels", rootRelationshipsXml()],
    ["docProps/app.xml", appPropertiesXml()],
    ["docProps/core.xml", corePropertiesXml(createdAt)],
    ["xl/workbook.xml", workbookXml()],
    ["xl/_rels/workbook.xml.rels", workbookRelationshipsXml()],
    ["xl/styles.xml", stylesXml()],
    ["xl/worksheets/sheet1.xml", sheet]
  ];
}

function buildSheetXml({ columns, metadata, rows, subtitle, title }) {
  const columnCount = Math.max(2, columns.length);
  const lastColumn = columnName(columnCount);
  const sheetRows = [];
  const merges = [`A1:${lastColumn}1`, `A2:${lastColumn}2`];

  sheetRows.push(xmlRow(1, [inlineCell("A1", title, 1)], 27));
  sheetRows.push(xmlRow(2, [inlineCell("A2", subtitle, 2)], 21));
  sheetRows.push(xmlRow(3, []));

  let rowNumber = 4;
  metadata.forEach(({ label, value }) => {
    sheetRows.push(xmlRow(rowNumber, [
      inlineCell(`A${rowNumber}`, label, 3),
      inlineCell(`B${rowNumber}`, value || "-", 4)
    ]));
    rowNumber += 1;
  });

  rowNumber += 1;
  const tableHeaderRow = rowNumber;
  sheetRows.push(xmlRow(rowNumber, columns.map((column, index) => (
    inlineCell(`${columnName(index + 1)}${rowNumber}`, column.label, 5)
  )), 23));

  rows.forEach((row) => {
    rowNumber += 1;
    const cells = row.cells.map((cell, index) => {
      const reference = `${columnName(index + 1)}${rowNumber}`;
      if (cell.type === "number" && Number.isFinite(cell.value)) {
        return numericCell(reference, cell.value, getNumericStyle(cell));
      }
      const style = index === 0
        ? Math.min(10, 6 + Math.max(0, Math.min(4, cell.indent ?? 0)))
        : index === 1 ? 19 : 6;
      return inlineCell(reference, cell.value ?? "", style);
    });
    sheetRows.push(xmlRow(rowNumber, cells));
  });

  const widths = columns.map((column, index) => {
    const width = column.width ?? (index === 0 ? 52 : index === 1 ? 13 : 18);
    return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`;
  }).join("");
  const endRow = Math.max(tableHeaderRow, rowNumber);

  return xmlDocument(`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews><sheetView workbookViewId="0"><pane xSplit="2" ySplit="${tableHeaderRow}" topLeftCell="C${tableHeaderRow + 1}" activePane="bottomRight" state="frozen"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>${widths}</cols>
  <sheetData>${sheetRows.join("")}</sheetData>
  <autoFilter ref="A${tableHeaderRow}:${lastColumn}${endRow}"/>
  <mergeCells count="${merges.length}">${merges.map((range) => `<mergeCell ref="${range}"/>`).join("")}</mergeCells>
  <pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>
  <pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>
</worksheet>`);
}

function getNumericStyle(cell) {
  const fillOffset = cell.emphasis >= 3 ? 3 : cell.emphasis === 2 ? 2 : cell.emphasis === 1 ? 1 : 0;
  return (cell.numberFormat === "percent" ? 15 : 11) + fillOffset;
}

function xmlRow(number, cells, height = null) {
  const heightAttributes = height ? ` ht="${height}" customHeight="1"` : "";
  return `<row r="${number}"${heightAttributes}>${cells.join("")}</row>`;
}

function inlineCell(reference, value, style) {
  return `<c r="${reference}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

function numericCell(reference, value, style) {
  return `<c r="${reference}" s="${style}"><v>${Number(value)}</v></c>`;
}

function stylesXml() {
  const xfs = [
    xf(),
    xf({ font: 1, fill: 2, align: "left" }),
    xf({ font: 2, align: "left" }),
    xf({ font: 2, fill: 3, align: "left" }),
    xf({ align: "left" }),
    xf({ font: 1, fill: 2, align: "center" }),
    xf({ align: "left" }),
    xf({ align: "left", indent: 1 }),
    xf({ align: "left", indent: 2 }),
    xf({ align: "left", indent: 3 }),
    xf({ align: "left", indent: 4 }),
    xf({ numberFormat: 4 }),
    xf({ numberFormat: 4, fill: 4 }),
    xf({ numberFormat: 4, fill: 5 }),
    xf({ numberFormat: 4, fill: 6 }),
    xf({ numberFormat: 10 }),
    xf({ numberFormat: 10, fill: 4 }),
    xf({ numberFormat: 10, fill: 5 }),
    xf({ numberFormat: 10, fill: 6 }),
    xf({ align: "center", fill: 3 })
  ];
  return xmlDocument(`<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="3">
    <font><sz val="10"/><color rgb="FF1D2520"/><name val="Aptos"/><family val="2"/></font>
    <font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Aptos"/><family val="2"/></font>
    <font><b/><sz val="10"/><color rgb="FF0168A0"/><name val="Aptos"/><family val="2"/></font>
  </fonts>
  <fills count="7">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0168A0"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF0F3F1"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF2F4F3"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE3E7E5"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFD2D8D5"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left/><right/><top/><bottom style="thin"><color rgb="FFE7ECE9"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1">${xf()}</cellStyleXfs>
  <cellXfs count="${xfs.length}">${xfs.join("")}</cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
  <dxfs count="0"/>
  <tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>`);
}

function xf({ align = "right", fill = 0, font = 0, indent = 0, numberFormat = 0 } = {}) {
  const alignment = `<alignment horizontal="${align}" vertical="center"${indent ? ` indent="${indent}"` : ""}/>`;
  return `<xf numFmtId="${numberFormat}" fontId="${font}" fillId="${fill}" borderId="1" xfId="0" applyAlignment="1"${numberFormat ? " applyNumberFormat=\"1\"" : ""}>${alignment}</xf>`;
}

function contentTypesXml() {
  return xmlDocument(`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`);
}

function rootRelationshipsXml() {
  return xmlDocument(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`);
}

function workbookXml() {
  return xmlDocument(`<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Explorer" sheetId="1" r:id="rId1"/></sheets></workbook>`);
}

function workbookRelationshipsXml() {
  return xmlDocument(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);
}

function corePropertiesXml(createdAt) {
  return xmlDocument(`<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Agora Explorer export</dc:title><dc:creator>Agora Explorer</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${createdAt}</dcterms:created></cp:coreProperties>`);
}

function appPropertiesXml() {
  return xmlDocument(`<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Agora Explorer</Application></Properties>`);
}

function xmlDocument(content) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${content}`;
}

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function columnName(index) {
  let value = index;
  let name = "";
  while (value > 0) {
    value -= 1;
    name = String.fromCharCode(65 + (value % 26)) + name;
    value = Math.floor(value / 26);
  }
  return name;
}

function createZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  files.forEach(([path, content]) => {
    const name = encoder.encode(path);
    const data = encoder.encode(content);
    const crc = crc32(data);
    const localHeader = new Uint8Array(30 + name.length);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, data.length, true);
    localView.setUint32(22, data.length, true);
    localView.setUint16(26, name.length, true);
    localHeader.set(name, 30);
    localParts.push(localHeader, data);

    const centralHeader = new Uint8Array(46 + name.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, data.length, true);
    centralView.setUint32(24, data.length, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint32(42, offset, true);
    centralHeader.set(name, 46);
    centralParts.push(centralHeader);
    offset += localHeader.length + data.length;
  });

  const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  return new Blob([...localParts, ...centralParts, end], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
}

const crcTable = buildCrcTable();

function buildCrcTable() {
  return Array.from({ length: 256 }, (_, index) => {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
    return value >>> 0;
  });
}

function crc32(bytes) {
  let crc = 0xffffffff;
  bytes.forEach((byte) => {
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  });
  return (crc ^ 0xffffffff) >>> 0;
}
