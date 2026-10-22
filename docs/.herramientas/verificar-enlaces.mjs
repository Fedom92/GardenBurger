// Verifica los enlaces del vault: que cada [[nota]] y [[nota#encabezado]] apunte a
// algo que existe, que ninguno se salga del árbol de hubs (ver abajo), que los nodos
// de archivo de los canvas existan y que las rutas docs/... que nombra el CLAUDE.md
// de la raíz sigan en pie.
//
// Uso, desde la raíz del repo:   node docs/.herramientas/verificar-enlaces.mjs
//
// Resuelve como Obsidian: por nombre de archivo sin importar la carpeta, sin
// distinguir mayúsculas. Los encabezados se comparan normalizados (solo letras y
// dígitos), así que no da falsos positivos por acentos de código o signos. Vive en
// una carpeta con punto para que Obsidian no la muestre. Sin dependencias.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, basename, extname, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const vault = join(dirname(fileURLToPath(import.meta.url)), "..");
const raiz = join(vault, "..");

const archivos = [];
const recorrer = (dir) => {
    for (const nombre of readdirSync(dir)) {
        if (nombre.startsWith(".")) continue;
        const ruta = join(dir, nombre);
        if (statSync(ruta).isDirectory()) recorrer(ruta);
        else archivos.push(ruta);
    }
};
recorrer(vault);

const norm = (t) => t.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
const notas = new Map();      // clave (nombre sin .md, o nombre.canvas) -> ruta
for (const ruta of archivos) {
    const ext = extname(ruta);
    if (ext === ".md") notas.set(basename(ruta, ".md").toLowerCase(), ruta);
    else if (ext === ".canvas") notas.set(basename(ruta).toLowerCase(), ruta);
}

const encabezados = new Map();
for (const [clave, ruta] of notas) {
    if (!ruta.endsWith(".md")) continue;
    const set = new Set();
    let enCodigo = false;
    for (const linea of readFileSync(ruta, "utf8").split(/\r?\n/)) {
        if (linea.trim().startsWith("```")) { enCodigo = !enCodigo; continue; }
        if (!enCodigo && /^#{1,6}\s/.test(linea)) set.add(norm(linea.replace(/^#+/, "").trim()));
    }
    encabezados.set(clave, set);
}

// El árbol: el padre de cada nota es el destino de su línea `↑ [[...]]`. Para que el grafo de
// Obsidian se vea como árbol, un enlace entre dos notas solo puede ir de una nota a su padre o del
// padre a una hija. Cualquier otra referencia va como texto en cursiva (*Nota › Sección*). Los
// canvas quedan afuera de esta regla: el "Mapa del vault" se oculta del grafo con un filtro.
const padre = new Map();
for (const [clave, ruta] of notas) {
    if (!ruta.endsWith(".md")) continue;
    const m = readFileSync(ruta, "utf8").match(/^↑ \[\[([^\]|#]+)/m);
    if (m) padre.set(clave, m[1].trim().toLowerCase());
}
// Un canvas cuelga de la nota que lo enlaza.
const enElArbol = (a, b) => b.endsWith(".canvas") || padre.get(a) === b || padre.get(b) === a;

const errores = [];
const entrantes = new Map([...notas.keys()].map((k) => [k, 0]));
let total = 0;

const revisar = (origen, texto) => {
    const yo = basename(origen, ".md").toLowerCase();
    const esNota = origen.endsWith(".md");
    for (const m of texto.matchAll(/!?\[\[([^\]]+?)\]\]/g)) {
        total++;
        const destino = m[1].replace(/\\\|/g, "|").split("|")[0];
        const [nota, ...resto] = destino.split("#");
        const encabezado = resto.join("#");
        const clave = nota.trim() ? nota.trim().toLowerCase() : basename(origen, ".md").toLowerCase();
        const donde = relative(vault, origen);
        if (!notas.has(clave)) { errores.push(`${donde}: [[${m[1]}]] — no existe la nota`); continue; }
        if (clave !== yo) {
            entrantes.set(clave, entrantes.get(clave) + 1);
            if (esNota && !enElArbol(yo, clave)) {
                errores.push(`${donde}: [[${m[1]}]] — fuera del árbol: no es su hub ni una hija (pasarlo a *texto*)`);
            }
        }
        if (encabezado && !encabezado.startsWith("^") && !encabezados.get(clave)?.has(norm(encabezado))) {
            errores.push(`${donde}: [[${m[1]}]] — no existe el encabezado`);
        }
    }
};

for (const ruta of archivos) {
    if (ruta.endsWith(".md")) revisar(ruta, readFileSync(ruta, "utf8"));
    if (ruta.endsWith(".canvas")) {
        const datos = JSON.parse(readFileSync(ruta, "utf8") || "{}");
        for (const nodo of datos.nodes || []) {
            if (nodo.type === "text") revisar(ruta, nodo.text);
            if (nodo.type === "file") {
                if (!existsSync(join(vault, nodo.file))) errores.push(`${relative(vault, ruta)}: nodo de archivo ${nodo.file} — no existe`);
                else { const k = basename(nodo.file, ".md").toLowerCase(); entrantes.set(k, entrantes.get(k) + 1); }
            }
        }
    }
}

// Las rutas del CLAUDE.md son texto plano (no wikilinks): se chequea que existan.
const claude = join(raiz, "CLAUDE.md");
if (existsSync(claude)) {
    for (const m of readFileSync(claude, "utf8").matchAll(/`(docs\/[^`]+?\.(?:md|canvas))`/g)) {
        if (!existsSync(join(raiz, m[1]))) errores.push(`CLAUDE.md: ${m[1]} — no existe`);
    }
}

errores.forEach((e) => console.log("ROTO  " + e));
const huerfanas = [...entrantes].filter(([, n]) => n === 0).map(([k]) => k);
console.log(`\n${notas.size} notas, ${total} enlaces, ${errores.length} rotos`);
console.log("Sin enlaces entrantes:", huerfanas.length ? huerfanas.join(", ") : "ninguna");
process.exitCode = errores.length ? 1 : 0;
