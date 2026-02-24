
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";
import packageJson from "./package.json";

const VERSION = packageJson.version;
const PUBLIC_DIR = "./public";

async function updateVersion() {
    console.log(`[Version Updater] Updating assets to version: ${VERSION}`);

    try {
        const files = await readdir(PUBLIC_DIR);
        const htmlFiles = files.filter(f => extname(f) === '.html');

        for (const file of htmlFiles) {
            const filePath = join(PUBLIC_DIR, file);
            let content = await readFile(filePath, 'utf-8');

            // Regex explaination:
            // (href|src)=["']      -> Match href=" or src="
            // (?!\/\/|http)        -> Negative lookahead to ensure it's not an external link (// or http)
            // ([^"']+\.(css|js))   -> Match the filename ending in .css or .js (Group 2)
            // (\?v=[^"']*)?        -> Optional existing query param ?v=... (Group 4)
            // ["']                 -> Closing quote

            const regex = /(href|src)=["'](?!\/\/|http)([^"']+\.(css|js))(\?v=[^"']*)?["']/g;

            let changed = false;
            const newContent = content.replace(regex, (match, attr, path) => {
                const newTag = `${attr}="${path}?v=${VERSION}"`;
                if (match !== newTag) {
                    changed = true;
                }
                return newTag;
            });

            if (changed) {
                await writeFile(filePath, newContent, 'utf-8');
                console.log(`  ✓ Updated ${file}`);
            }
        }
        console.log("[Version Updater] Complete.");
    } catch (error) {
        console.error("[Version Updater] Error:", error);
        process.exit(1);
    }
}

updateVersion();
