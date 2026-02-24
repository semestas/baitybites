
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import packageJson from "./package.json";

const VERSION = packageJson.version;
const SRC_DIR = "./src/views/pages";
const PARTIALS_DIR = "./src/views/partials";
const PUBLIC_DIR = "./public";
const SW_SRC = "./src/sw.js";
const SW_DEST = "./public/sw.js";
const JS_SRC_DIR = "./src/js";
const JS_DEST_DIR = "./public/js";
const MANIFEST_SRC = "./src/manifest.json";
const MANIFEST_DEST = "./public/manifest.json";

async function buildManifest() {
    try {
        let content = await readFile(MANIFEST_SRC, 'utf-8');
        const json = JSON.parse(content);
        json.version = VERSION;
        await writeFile(MANIFEST_DEST, JSON.stringify(json, null, 4), 'utf-8');
        console.log(`  ✓ Built manifest.json`);
    } catch {
        // If manifest doesn't exist in src, try reading from public and updating it there
        try {
            let content = await readFile(MANIFEST_DEST, 'utf-8');
            const json = JSON.parse(content);
            json.version = VERSION;
            await writeFile(MANIFEST_DEST, JSON.stringify(json, null, 4), 'utf-8');
            console.log(`  ✓ Updated manifest.json version`);
        } catch {
            // Silently fail if no manifest found
        }
    }
}

async function getPartials() {
    try {
        const files = await readdir(PARTIALS_DIR);
        const partials: Record<string, string> = {};
        for (const file of files) {
            if (file.endsWith('.html')) {
                const name = file.replace('.html', '');
                partials[name] = await readFile(join(PARTIALS_DIR, file), 'utf-8');
            }
        }
        return partials;
    } catch {
        return {};
    }
}

async function buildServiceWorker() {
    try {
        let content = await readFile(SW_SRC, 'utf-8');
        content = content.replace(/\{\{VERSION\}\}/g, VERSION);
        await writeFile(SW_DEST, content, 'utf-8');
        console.log(`  ✓ Built sw.js`);
    } catch (error) {
        console.error(`[HTML Builder] Error building SW:`, error);
    }
}

async function buildJs() {
    try {
        const files = await readdir(JS_SRC_DIR);
        for (const file of files) {
            if (file.endsWith('.js')) {
                const srcPath = join(JS_SRC_DIR, file);
                const destPath = join(JS_DEST_DIR, file);
                let content = await readFile(srcPath, 'utf-8');
                content = content.replace(/\{\{VERSION\}\}/g, VERSION)
                    .replace(/\$VERSION/g, VERSION);
                await writeFile(destPath, content, 'utf-8');
                console.log(`  ✓ Built js/${file}`);
            }
        }
    } catch (error) {
        console.error(`[HTML Builder] Error building JS:`, error);
    }
}

async function buildHtml() {
    console.log(`[HTML Builder] Generating files... Version: ${VERSION}`);

    try {
        await mkdir(PUBLIC_DIR, { recursive: true });
        await mkdir(JS_DEST_DIR, { recursive: true });
        const partials = await getPartials();
        const files = await readdir(SRC_DIR);
        const htmlFiles = files.filter(f => f.endsWith('.html'));

        if (htmlFiles.length === 0) {
            console.warn(`[HTML Builder] No source HTML files found in ${SRC_DIR}. Did you move them?`);
        } else {
            for (const file of htmlFiles) {
                const srcPath = join(SRC_DIR, file);
                const destPath = join(PUBLIC_DIR, file);

                // Read source template
                let content = await readFile(srcPath, 'utf-8');

                // Replace partials
                for (const [name, partialContent] of Object.entries(partials)) {
                    const regex = new RegExp(`\\{\\{>\\s*${name}\\s*\\}\\}`, 'g');
                    content = content.replace(regex, partialContent);
                }

                // Replace VERSION placeholder
                content = content.replace(/\{\{VERSION\}\}/g, VERSION)
                    .replace(/\$VERSION/g, VERSION);

                // Replace any existing ?v=... with ?v=VERSION
                const versionRegex = /(href|src)=["'](?!\/\/|http)([^"']+\.(css|js))(\?v=[^"']*)?["']/g;

                content = content.replace(versionRegex, (match, attr, path) => {
                    return `${attr}="${path}?v=${VERSION}"`;
                });

                // Write to public folder
                await writeFile(destPath, content, 'utf-8');
                console.log(`  ✓ Built ${file}`);
            }
        }

        // Build JS files
        await buildJs();

        // Build Service Worker
        await buildServiceWorker();

        // Build Manifest
        await buildManifest();

        console.log("[HTML Builder] Complete.");
    } catch (error) {
        console.error("[HTML Builder] Error:", error);
        process.exit(1);
    }
}

// Watch mode
if (process.argv.includes('--watch')) {
    const { watch } = require('fs');
    console.log(`[HTML Builder] Watching for changes...`);

    // Initial build
    buildHtml();

    // Watch for HTML changes
    watch(SRC_DIR, (_: string, filename: string | null) => {
        if (filename && filename.endsWith('.html')) {
            console.log(`[HTML Builder] HTML changed: ${filename}`);
            buildHtml();
        }
    });

    // Watch for JS changes
    try {
        watch(JS_SRC_DIR, (_: string, filename: string | null) => {
            if (filename && filename.endsWith('.js')) {
                console.log(`[HTML Builder] JS changed: ${filename}`);
                buildHtml();
            }
        });
    } catch { }

    // Watch for Partials changes
    try {
        watch(PARTIALS_DIR, (_: string, filename: string | null) => {
            if (filename && filename.endsWith('.html')) {
                console.log(`[HTML Builder] Partial changed: ${filename}`);
                buildHtml();
            }
        });
    } catch {
        // partials dir might not exist yet
    }

    // Watch for SW changes
    try {
        watch(SW_SRC, () => {
            console.log(`[HTML Builder] Service Worker changed`);
            buildServiceWorker();
        });
    } catch {
        console.log("Could not watch sw.js directly (maybe it doesn't exist yet?)");
    }

} else {
    buildHtml();
}
