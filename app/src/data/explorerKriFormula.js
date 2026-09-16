import { parseCsvRecords } from "./csvParser.js?v=20260917-kri-formula";

const EXPLORER_KRI_DICTIONARY_URL = "./assets/KRI_dictionnary.csv";

// The source file wraps every id/name/formula row as a single big
// semicolon-terminated field (formula's own commas would otherwise break a
// naive comma split), with the formula itself quote-escaped a second time
// inside that - an artifact of however it was originally exported. Splitting
// on ";" first (safe: no field ever contains one) recovers a normal
// "id,name,formula" record, which a second comma-based pass then parses.
export async function loadExplorerKriFormulas() {
  const response = await fetch(EXPLORER_KRI_DICTIONARY_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Le dictionnaire des formules KRI n'a pas pu être chargé.");
  }

  return parseKriDictionary(await response.text());
}

export function parseKriDictionary(text) {
  const outerRecords = parseCsvRecords(text, ";");
  const dictionary = new Map();

  outerRecords.slice(1).forEach((outerRecord) => {
    const content = outerRecord[0];
    if (!content?.trim()) return;

    const [code, name, formula] = parseCsvRecords(content, ",")[0] ?? [];
    if (!code) return;

    dictionary.set(code, { formula: formula ?? "", name: name ?? "" });
  });

  return dictionary;
}

// ---------------------------------------------------------------------
// Formula parser
//
// KRI formulas use a small expression language (EBA/ECB "SUBA" style):
// function calls (COALESCE/SUM/DIVIDE/IFN/...), cell references into a
// COREP/FINREP template ({T(...)R(...)C(...)S(...)}), references to an
// internal data point ({SPE.DPI(code)}), and references to other KRIs
// ({CODE}, optionally time-shifted as {CODE[T-1Y]}) - combined with
// ordinary arithmetic and comparison operators. Not every formula in the
// dictionary is actually one of these (some cells just hold a free-text
// note, e.g. a link to external documentation) - parseKriFormula always
// succeeds, falling back to a plain "text" node for anything it can't
// make sense of rather than throwing.
// ---------------------------------------------------------------------

const TOKEN_PATTERN = new RegExp(
  [
    "(?<NUMBER>\\d+\\.\\d+|\\d+)",
    "(?<STRING>'(?:[^'\\\\]|\\\\.)*')",
    "(?<IDENT>[A-Za-z_][A-Za-z0-9_.]*)",
    "(?<LBRACE>\\{)",
    "(?<RBRACE>\\})",
    "(?<LPAREN>\\()",
    "(?<RPAREN>\\))",
    "(?<LBRACK>\\[)",
    "(?<RBRACK>\\])",
    "(?<COMMA>,)",
    "(?<DSTAR>\\*\\*)",
    "(?<STAR>\\*)",
    "(?<NE><>)",
    "(?<CARETEQ>\\^=)",
    "(?<LE><=)",
    "(?<GE>>=)",
    "(?<LT><)",
    "(?<GT>>)",
    "(?<DEQ>==)",
    "(?<EQ>=)",
    "(?<PLUS>\\+)",
    "(?<MINUS>-)",
    "(?<SLASH>/)"
  ].join("|"),
  "y"
);

function tokenizeKriFormula(text) {
  const tokens = [];
  let index = 0;

  while (index < text.length) {
    if (/\s/.test(text[index])) {
      index += 1;
      continue;
    }

    TOKEN_PATTERN.lastIndex = index;
    const match = TOKEN_PATTERN.exec(text);
    if (!match || match.index !== index) {
      throw new Error(`Unexpected character ${JSON.stringify(text[index])} at ${index}`);
    }

    const kind = Object.entries(match.groups).find(([, value]) => value !== undefined)[0];
    tokens.push({ kind, value: match[0] });
    index = TOKEN_PATTERN.lastIndex;
  }

  tokens.push({ kind: "EOF", value: "" });
  return tokens;
}

class KriFormulaParser {
  constructor(tokens) {
    this.tokens = tokens;
    this.index = 0;
  }

  peek(offset = 0) {
    return this.tokens[this.index + offset];
  }

  advance() {
    return this.tokens[this.index++];
  }

  expect(kind) {
    const token = this.advance();
    if (token.kind !== kind) throw new Error(`Expected ${kind}, got ${token.kind}`);
    return token;
  }

  isKeyword(word) {
    const token = this.peek();
    return token.kind === "IDENT" && token.value.toUpperCase() === word;
  }

  parse() {
    const node = this.orExpr();
    if (this.peek().kind !== "EOF") throw new Error(`Trailing tokens starting at ${this.peek().kind}`);
    return node;
  }

  orExpr() {
    let node = this.andExpr();
    while (this.isKeyword("OR")) {
      this.advance();
      node = { type: "binary", op: "OR", left: node, right: this.andExpr() };
    }
    return node;
  }

  andExpr() {
    let node = this.comparison();
    while (this.isKeyword("AND")) {
      this.advance();
      node = { type: "binary", op: "AND", left: node, right: this.comparison() };
    }
    return node;
  }

  comparison() {
    let node = this.additive();
    const comparisonKinds = ["EQ", "DEQ", "NE", "CARETEQ", "LE", "GE", "LT", "GT"];
    if (comparisonKinds.includes(this.peek().kind)) {
      const op = this.advance().kind;
      node = { type: "binary", op, left: node, right: this.additive() };
    } else if (this.isKeyword("EQ")) {
      this.advance();
      node = { type: "binary", op: "EQ", left: node, right: this.additive() };
    } else if (this.isKeyword("IN")) {
      this.advance();
      node = { type: "binary", op: "IN", left: node, right: this.listLiteral() };
    }
    return node;
  }

  listLiteral() {
    this.expect("LBRACK");
    const values = [];
    if (this.peek().kind !== "RBRACK") {
      values.push(this.orExpr());
      while (this.peek().kind === "COMMA") {
        this.advance();
        values.push(this.orExpr());
      }
    }
    this.expect("RBRACK");
    return { type: "list", values };
  }

  additive() {
    let node = this.term();
    while (["PLUS", "MINUS"].includes(this.peek().kind)) {
      const op = this.advance().kind;
      node = { type: "binary", op, left: node, right: this.term() };
    }
    return node;
  }

  term() {
    let node = this.power();
    while (["STAR", "SLASH"].includes(this.peek().kind)) {
      const op = this.advance().kind;
      node = { type: "binary", op, left: node, right: this.power() };
    }
    return node;
  }

  power() {
    let node = this.unary();
    while (this.peek().kind === "DSTAR") {
      this.advance();
      node = { type: "binary", op: "POW", left: node, right: this.unary() };
    }
    return node;
  }

  unary() {
    if (this.peek().kind === "MINUS") {
      this.advance();
      return { type: "unary", op: "-", operand: this.unary() };
    }
    return this.primary();
  }

  primary() {
    const token = this.peek();
    if (token.kind === "NUMBER") {
      this.advance();
      return { type: "number", value: token.value };
    }
    if (token.kind === "STRING") {
      this.advance();
      return { type: "string", value: token.value.slice(1, -1) };
    }
    if (token.kind === "STAR") {
      this.advance();
      return { type: "wildcard" };
    }
    if (token.kind === "LBRACK") {
      return this.listLiteral();
    }
    if (token.kind === "LPAREN") {
      this.advance();
      const node = this.orExpr();
      this.expect("RPAREN");
      return node;
    }
    if (token.kind === "LBRACE") {
      return this.reference();
    }
    if (token.kind === "IDENT") {
      this.advance();
      if (this.peek().kind === "LPAREN") {
        this.advance();
        const args = [];
        if (this.peek().kind !== "RPAREN") {
          args.push(this.orExpr());
          while (this.peek().kind === "COMMA") {
            this.advance();
            args.push(this.orExpr());
          }
        }
        this.expect("RPAREN");
        return { type: "call", name: token.value, args };
      }
      return { type: "ident", value: token.value };
    }
    throw new Error(`Unexpected token ${token.kind}`);
  }

  reference() {
    this.expect("LBRACE");
    const inner = this.referenceBody();
    this.expect("RBRACE");
    return inner;
  }

  referenceBody() {
    if (this.peek().kind === "IDENT" && this.peek().value === "T" && this.peek(1).kind === "LPAREN") {
      return this.cellRef();
    }
    if (this.peek().kind === "IDENT" && this.peek().value === "SPE.DPI") {
      this.advance();
      this.expect("LPAREN");
      const code = this.dimValue();
      this.expect("RPAREN");
      return { type: "spedpi", code, offset: this.maybeOffset() };
    }

    const token = this.advance();
    if (token.kind !== "IDENT") throw new Error(`Expected identifier in reference, got ${token.kind}`);
    return { type: "kriref", code: token.value, offset: this.maybeOffset() };
  }

  maybeOffset() {
    if (this.peek().kind !== "LBRACK") return null;
    this.advance();
    let text = "";
    while (this.peek().kind !== "RBRACK") text += this.advance().value;
    this.expect("RBRACK");
    return text;
  }

  dimList() {
    const values = [this.dimValue()];
    while (this.peek().kind === "COMMA") {
      this.advance();
      values.push(this.dimValue());
    }
    return values;
  }

  dimValue() {
    const token = this.advance();
    let base;
    if (token.kind === "STAR") {
      base = "*";
    } else if (["IDENT", "NUMBER", "STRING"].includes(token.kind)) {
      base = token.value;
      // A rare nested call inside a dimension slot (e.g. S(__DOM())) - kept
      // as raw text rather than fully parsed, it's only ever display data.
      if (this.peek().kind === "LPAREN") {
        this.advance();
        let depth = 1;
        let extra = "(";
        while (depth > 0) {
          const inner = this.advance();
          if (inner.kind === "LPAREN") depth += 1;
          if (inner.kind === "RPAREN") {
            depth -= 1;
            if (depth === 0) {
              extra += ")";
              break;
            }
          }
          extra += inner.value;
        }
        base += extra;
      }
    } else {
      throw new Error(`Expected a dimension value, got ${token.kind}`);
    }

    // A range like 0030-0070 or AD-WS.
    if (this.peek().kind === "MINUS" && ["NUMBER", "IDENT"].includes(this.peek(1).kind)) {
      this.advance();
      base = `${base}-${this.advance().value}`;
    }
    return base;
  }

  cellRef() {
    this.advance(); // "T"
    this.expect("LPAREN");
    const template = this.dimValue();
    this.expect("RPAREN");

    let row = null;
    let column = null;
    let sheet = null;
    while (
      (this.peek().kind === "IDENT" && this.peek().value === "R")
      || (this.peek().kind === "IDENT" && this.peek().value === "C")
      || (this.peek().kind === "IDENT" && this.peek().value === "S")
    ) {
      const letter = this.advance().value;
      this.expect("LPAREN");
      const values = this.dimList();
      this.expect("RPAREN");
      if (letter === "R") row = values;
      else if (letter === "C") column = values;
      else sheet = values;
    }

    return { type: "cellref", template, row, column, sheet, offset: this.maybeOffset() };
  }
}

// Always returns a node - either the parsed expression tree, or a "text"
// leaf carrying the original string when it isn't (or isn't fully) a
// formula in this grammar (a free-text note, an external doc reference, or
// an edge case this first-draft grammar doesn't cover).
export function parseKriFormula(formulaText) {
  const text = String(formulaText ?? "").trim();
  if (!text) return { type: "text", value: "" };

  try {
    return new KriFormulaParser(tokenizeKriFormula(text)).parse();
  } catch {
    return { type: "text", value: text };
  }
}

// Plain-language phrasing for the functions that show up often enough to be
// worth a dedicated description - anything else still renders correctly
// (see explorerView.js), just as "NAME(...)" instead of a sentence.
export const EXPLORER_KRI_FORMULA_FUNCTION_LABELS = {
  ABS: "Absolute value of",
  COALESCE: "First available value among",
  DIVIDE: "Ratio of",
  IFN: "Conditional value",
  ISNULL: "Is empty:",
  LOGICAL: "Condition",
  MAX: "Maximum of",
  MEAN: "Average of",
  MIN: "Minimum of",
  RANK: "Rank of",
  SUBSTR: "Substring of",
  SUM: "Sum of",
  SUM_DOMAIN: "Sum across"
};

// Duration between reference periods encoded as e.g. "T-1Y" / "T-2Q" - used
// on a cell/KRI reference to mean "the same figure from N periods ago".
export function describeExplorerKriOffset(offset) {
  if (!offset) return "";

  const match = /^T-(\d+)([YQM])$/i.exec(offset.trim());
  if (!match) return offset;

  const count = Number(match[1]);
  const unit = { Y: "year", Q: "quarter", M: "month" }[match[2].toUpperCase()];
  return `${count} ${unit}${count === 1 ? "" : "s"} ago`;
}
