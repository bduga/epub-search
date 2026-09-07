/**
 * Cross-Platform Source Catalog Management CLI
 * Zero external dependencies (uses only Node.js standard library).
 * Compatible with Windows, macOS, and Linux/Unix.
 *
 * Usage:
 *   node tools/manage-sources.js --list
 *   node tools/manage-sources.js --add --id <id> --title <title> --url <url>
 *   node tools/manage-sources.js --remove --id <id>
 *   npm run sources
 */

const fs = require('fs');
const path = require('path');
const { reindex } = require('./reindex.js');

const projectRoot = path.resolve(__dirname, '..');
const dataPath = path.join(projectRoot, 'data');
const sourcesJsonPath = path.join(dataPath, 'sources.json');
const cachePath = path.join(dataPath, 'cache');

function getArg(flags) {
    const args = process.argv.slice(2);
    for (const flag of flags) {
        const idx = args.indexOf(flag);
        if (idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith('-')) {
            return args[idx + 1];
        }
    }
    return '';
}

function hasFlag(flags) {
    const args = process.argv.slice(2);
    return flags.some(f => args.includes(f));
}

function printHelp() {
    console.log(`
Source Catalog Management CLI

Usage:
  node tools/manage-sources.js [command] [options]

Commands:
  -l, --list                  List all registered document sources (default)
  -a, --add                   Add or update a document source
  -r, --remove                Remove a document source by ID
  -h, --help                  Show this help screen

Add Options:
  --id <id>                   Unique identifier (e.g. 'epub-tts-11') [Required]
  --title <title>             Document title [Required]
  --url <url>                 Canonical W3C URL [Required]
  --type <type>               Status: 'Recommendation', 'Candidate Standard', 'Note', etc.
  --cat, --category <cat>     Category: 'Authoring', 'A11y', 'Reading Systems', etc.
  --pub, --publisher <pub>    Publisher: 'PMWG', 'PubCG', 'EPUB3 WG'
  --ver, --version <ver>      Version string (e.g. '3.3')
  --desc, --description <txt> Summary description

Global Options:
  --no-reindex                Skip automatic re-indexing after add or remove

Examples:
  node tools/manage-sources.js --list
  node tools/manage-sources.js --add --id "epub-tts-11" --title "TTS 1.1" --url "https://www.w3.org/TR/epub-tts-11/"
  node tools/manage-sources.js --remove --id "epub-tts-11"
    `);
}

async function main() {
    if (hasFlag(['-h', '--help'])) {
        printHelp();
        return;
    }

    if (!fs.existsSync(sourcesJsonPath)) {
        console.error(`Cannot find sources catalog at: ${sourcesJsonPath}`);
        process.exit(1);
    }

    const sources = JSON.parse(fs.readFileSync(sourcesJsonPath, 'utf8'));
    const isAdd = hasFlag(['-a', '--add']);
    const isRemove = hasFlag(['-r', '--remove']);
    const isList = hasFlag(['-l', '--list']) || (!isAdd && !isRemove);
    const noReindex = hasFlag(['--no-reindex']);

    // 1. Action: List
    if (isList) {
        console.log(`\n========================================================`);
        console.log(` Registered EPUB Document Sources (${sources.length})`);
        console.log(`========================================================\n`);

        const rows = sources.map(s => ({
            ID: s.id,
            Title: s.title.length > 38 ? s.title.substring(0, 35) + '...' : s.title,
            Type: s.type,
            Category: s.category,
            Publisher: s.publisher,
            Ver: s.version || '-'
        }));

        console.table(rows);
        console.log(`To add a source:    node tools/manage-sources.js --add --id <id> --title <title> --url <url>`);
        console.log(`To remove a source: node tools/manage-sources.js --remove --id <id>`);
        console.log(`To re-index all:    node tools/reindex.js\n`);
        return;
    }

    // 2. Action: Remove
    if (isRemove) {
        const id = getArg(['--id', '-i']);
        if (!id) {
            console.error('Error: Please provide --id <sourceId> to remove.');
            process.exit(1);
        }

        const existingIdx = sources.findIndex(s => s.id === id);
        if (existingIdx === -1) {
            console.warn(`Warning: Source ID '${id}' not found in catalog.`);
            return;
        }

        sources.splice(existingIdx, 1);
        fs.writeFileSync(sourcesJsonPath, JSON.stringify(sources, null, 4), 'utf8');
        console.log(`Successfully removed '${id}' from sources.json.`);

        const cacheFile = path.join(cachePath, `${id}.html`);
        if (fs.existsSync(cacheFile)) {
            fs.unlinkSync(cacheFile);
            console.log(`Removed cached HTML: ${cacheFile}`);
        }

        if (!noReindex) {
            console.log('Triggering automatic re-indexing...');
            await reindex();
        }
        return;
    }

    // 3. Action: Add / Update
    if (isAdd) {
        const id = getArg(['--id', '-i']);
        const title = getArg(['--title', '-t']);
        const url = getArg(['--url', '-u']);

        if (!id || !title || !url) {
            console.error('Error: --id, --title, and --url are required when adding a source.');
            printHelp();
            process.exit(1);
        }

        const type = getArg(['--type']) || 'Note';
        const category = getArg(['--cat', '--category']) || 'EPUB General';
        const publisher = getArg(['--pub', '--publisher']) || 'PMWG';
        const version = getArg(['--ver', '--version']) || '';
        const description = getArg(['--desc', '--description']) || '';

        const newSource = {
            id: id.trim(),
            title: title.trim(),
            url: url.trim(),
            type: type.trim(),
            publisher: publisher.trim(),
            category: category.trim(),
            version: version.trim(),
            description: description.trim()
        };

        const existingIdx = sources.findIndex(s => s.id === id);
        if (existingIdx !== -1) {
            sources[existingIdx] = newSource;
            console.log(`Updated existing source '${id}'.`);
        } else {
            sources.push(newSource);
            console.log(`Added new source '${id}'.`);
        }

        fs.writeFileSync(sourcesJsonPath, JSON.stringify(sources, null, 4), 'utf8');
        console.log(`Updated ${sourcesJsonPath}.`);

        if (!noReindex) {
            console.log(`Triggering re-indexing for source '${id}'...`);
            await reindex({ sourceId: id });
        }
    }
}

if (require.main === module) {
    main().catch(err => {
        console.error('Operation failed:', err);
        process.exit(1);
    });
}
