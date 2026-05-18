import { readFileSync, writeFileSync } from "fs";

const data = JSON.parse(readFileSync("student-photos-data.json", "utf8"));

function fixSub(s) {
  return s
    .replace(/Dong-Eui_University/g, "Dong-Eui University")
    .replace(/Hanseo_University/g, "Hanseo University")
    .replace(/Jeonbuk_National_University/g, "Jeonbuk National University");
}

function esc(s) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

const lines = [];
lines.push('import { SUPABASE_STORAGE_BASE } from "./photos";');
lines.push("");
lines.push("export type StudentPhoto = {");
lines.push("  cat: string;");
lines.push("  sub: string;");
lines.push("  name: string;");
lines.push("  src: string;");
lines.push("};");
lines.push("");
lines.push("export { SUPABASE_STORAGE_BASE };");
lines.push("");
lines.push("export const studentPhotos: StudentPhoto[] = [");

let prevCat = "";
for (const e of data) {
  if (e.cat !== prevCat) {
    if (prevCat) lines.push("");
    lines.push("  // " + e.cat);
    prevCat = e.cat;
  }
  const sub = fixSub(e.sub);
  lines.push(
    `  {cat:"${esc(e.cat)}",sub:"${esc(sub)}",name:"${esc(e.name)}",src:"${esc(e.src)}"},`
  );
}

lines.push("];");
lines.push("");

writeFileSync("src/lib/student-photos.ts", lines.join("\n"));
console.log("Written", data.length, "entries to src/lib/student-photos.ts");
