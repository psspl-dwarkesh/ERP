// Finds CSS rules whose class selectors cannot be produced by the app source, and
// optionally deletes the wholly dead blocks. Liveness is read from string literals only,
// so a variable named `landing` does not keep `.landing` alive, while a literal prefix
// such as `grid-col-` (className={`grid-col-${id}`}) keeps dynamic column classes alive.
// Usage: node scripts/dead-css.mjs [--apply]
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, extname } from "node:path";

const root = process.cwd();
const apply = process.argv.includes("--apply");
// Pruning rewrites existing lines, so it runs in its own pass after blocks are deleted.
const pruneOnly = process.argv.includes("--prune-apply");

function walk(dir, out = []) {
  if (!exists(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    statSync(p).isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}
function exists(p) {
  try { statSync(p); return true; } catch { return false; }
}

const srcFiles = walk(join(root, "src"));
const cssFiles = srcFiles.filter((f) => extname(f) === ".css");
const sourceFiles = srcFiles
  .filter((f) => [".tsx", ".ts"].includes(extname(f)))
  .concat(walk(join(root, "public")).filter((f) => extname(f) === ".html"))
  .concat(join(root, "index.html"))
  .filter(exists);

const literals = [];
const quoted = /"([^"\n]*)"|'([^'\n]*)'/g;
for (const f of sourceFiles) {
  const text = readFileSync(f, "utf8");
  // plain strings first, including the ones nested inside template expressions
  for (const m of text.matchAll(quoted)) if (m[1] ?? m[2]) literals.push((m[1] ?? m[2]).trim());
  for (const m of text.matchAll(/`([^`]*)`/gs)) {
    for (const piece of m[1].split(/\$\{[^}]*\}/g)) if (piece.trim()) literals.push(piece.trim());
  }
}
const isLive = (tok) =>
  literals.some((l) => l.split(/[\s,]+/).includes(tok) || l.includes(tok) || (l.endsWith("-") && tok.startsWith(l)));

const lineOf = (text, index) => {
  let n = 1;
  for (let i = 0; i < index; i++) if (text[i] === "\n") n++;
  return n;
};
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
const classTokens = (s) => [...s.matchAll(/\.([A-Za-z_][\w-]*)/g)].map((m) => m[1]);

function parse(cssPath) {
  const css = stripComments(readFileSync(cssPath, "utf8"));
  const rules = [];
  const stack = [];
  let buffer = "";
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === "{") {
      const prelude = buffer.trim();
      const firstChar = i - buffer.length + buffer.search(/\S/);
      stack.push({ prelude, start: lineOf(css, firstChar) });
      buffer = "";
    } else if (ch === "}") {
      const frame = stack.pop();
      buffer = "";
      if (!frame) continue;
      const parent = stack[stack.length - 1];
      if (/^@(media|supports)/.test(frame.prelude)) continue;
      if (parent && /^@keyframes/.test(parent.prelude)) continue;
      rules.push({ selector: frame.prelude.replace(/\s+/g, " "), start: frame.start, end: lineOf(css, i) });
    } else buffer += ch;
  }
  return rules;
}

// a comma group can never match when one of its required classes is unreferenced;
// classes inside :not()/ :is-exceptions do not have to exist, so ignore them
function deadInGroup(group) {
  return classTokens(group.replace(/:not\([^)]*\)/g, "")).filter((t) => !isLive(t));
}
function splitGroups(selector) {
  const out = [];
  let depth = 0;
  let cur = "";
  for (const ch of selector) {
    if (ch === "(" || ch === "[") depth++;
    if (ch === ")" || ch === "]") depth--;
    if (ch === "," && depth === 0) { out.push(cur.trim()); cur = ""; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

for (const file of cssFiles) {
  const text = readFileSync(file, "utf8");
  const lines = text.split("\n");
  const rules = parse(file);
  const drop = new Set();
  const prune = [];
  for (const r of rules) {
    if (r.selector.startsWith("@")) continue;
    const groups = splitGroups(r.selector);
    if (!classTokens(r.selector).length) continue;
    const live = groups.filter((g) => !deadInGroup(g).length);
    if (!live.length) {
      for (let l = r.start; l <= r.end; l++) drop.add(l);
    } else if (live.length < groups.length) {
      prune.push({ ...r, live, dead: groups.filter((g) => deadInGroup(g).length) });
    }
  }
  const rel = "prototype/src/" + file.slice(join(root, "src").length + 1).replace(/\\/g, "/");
  let draft = lines.filter((_, i) => !drop.has(i + 1)).join("\n");

  // @keyframes whose animation name no longer survives are decoration for deleted rules
  const orphanFrames = rules
    .filter((r) => /^@keyframes\s+[\w-]+$/.test(r.selector))
    .filter((r) => {
      const name = r.selector.split(/\s+/)[1];
      return !new RegExp(`animation(-name)?:[^;}]*\\b${name}\\b`).test(draft);
    });
  if (orphanFrames.length) {
    const body = text.split("\n");
    for (const r of orphanFrames) {
      for (let l = r.start; l <= Math.min(r.end, body.length); l++) drop.add(l);
    }
    draft = lines.filter((_, i) => !drop.has(i + 1)).join("\n");
  }
  // media wrappers left with nothing inside them
  draft = draft.replace(/@media[^{]*\{\s*\}\n/g, "");

  console.log(
    `\n${rel}: ${rules.length} rule blocks · ${drop.size} dead lines · ${orphanFrames.length} orphan @keyframes · ${prune.length} mixed selectors to prune`,
  );
  for (const r of orphanFrames) console.log(`   orphan keyframes L${r.start}-${r.end}  ${r.selector}`);
  for (const p of prune) console.log(`   prune L${p.start}-${p.end}  drop:[${p.dead.join(" | ")}]  keep:[${p.live.join(" | ")}]`);
  if (!apply && !pruneOnly) {
    const deadRules = rules.filter(
      (r) => !r.selector.startsWith("@") && classTokens(r.selector).length > 0 && splitGroups(r.selector).every((g) => deadInGroup(g).length),
    );
    for (const r of deadRules) console.log(`   DEAD L${r.start}-${r.end}  ${r.selector.slice(0, 100)}`);
  }

  if (apply && drop.size) {
    const kept = draft.replace(/\n{3,}/g, "\n\n");
    writeFileSync(file, kept.endsWith("\n") ? kept : kept + "\n");
    console.log(`   wrote ${rel} (-${drop.size} lines)`);
  }

  // run in a pass of its own, after deletes, so line numbers are current
  if (pruneOnly && !drop.size && prune.length) {
    const out = [...lines];
    for (const p of [...prune].sort((a, b) => b.start - a.start)) {
      let brace = p.start - 1;
      while (brace < out.length && !out[brace].includes("{")) brace++;
      if (brace >= out.length) continue;
      const at = out[brace].indexOf("{");
      const after = out[brace].slice(at);
      const head = p.live.slice(0, -1).map((g) => g + ",");
      const last = p.live[p.live.length - 1] + " " + after;
      out.splice(p.start - 1, brace - (p.start - 1) + 1, ...head, last);
    }
    writeFileSync(file, out.join("\n").replace(/\n{3,}/g, "\n\n"));
    console.log(`   pruned ${prune.length} selectors in ${rel}`);
  }
}
