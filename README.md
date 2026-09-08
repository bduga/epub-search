# EPUB Documentation Search Engine

A high-performance, client-side search engine and explorer for official W3C and community specifications, notes, reports, and guidance for the EPUB standard.

## Overview

The EPUB ecosystem spans multiple specifications, working group notes, community group reports, and best practice guides across the W3C Publishing Maintenance Working Group (PMWG), Publishing Community Group (PubCG), and legacy IDPF/W3C working groups.

This application provides a unified, fast, searchable catalog and index across **38 official document sources**, featuring:
- **Advanced Query Engine**: Full Boolean logic (`AND`, `OR`, `NOT`), shorthand negation (`-term`), exact quoted phrases (`"package document"`), parentheses grouping (`(...)`), and prefix wildcards (`nav*`).
- **Normative Requirement Indexing (RFC 2119)**: Semantic extraction of official conformance keywords (`class="rfc2119"`) with dedicated query qualifiers (`req:any`, `req:must`, `req:should`, `req:"must not"`), collapsed negation logic, and interactive badge pills.
- **Field-Specific Filtering**: Targeted search qualifiers such as `type:Recommendation`, `pub:PMWG`, `cat:Authoring`, and `title:spine`.
- **Interactive Syntax Guide**: In-app modal with one-click demo query chips for instant demonstration.
- **Syntax-Aware Snippet Highlighting**: Intelligently highlights matched keywords and phrases while excluding syntax operators.
- **Faceted Multi-Select Filtering**: Filter by Document Type/Status (*Recommendation*, *Candidate Standard*, *Working Draft*, *Draft Note*, *Note*, *Report*, *Legacy*), Publisher (*PMWG*, *PubCG*, *EPUB3 WG*), and Subject Category (*Authoring*, *A11y*, *Reading Systems*, *Annotations*, *Audio | Media*, *EPUB General*).
- **Direct Official Linking**: Deep-links directly to canonical W3C Recommendation anchors.
- **Zero Dependencies**: Pure modern HTML5, Vanilla CSS, and JavaScript. Runs instantly in any browser without requiring node, npm, or backend servers.

## Document Sources Catalog

The search index is initialized from `data/sources.json` (and `data/sources.csv`), comprising 38 official publications:
- **Core Standards**: EPUB 3.3, EPUB 3.4 (Candidate), EPUB Reading Systems 3.3/3.4, EPUB Accessibility 1.1/1.2.
- **Working Group Notes**: EPUB 3.3/3.4 Overview, Structural Semantics Vocabulary (SSV), Text-to-Speech (TTS), Fixed-Layout Accessibility, Annotations Vocabulary & Use Cases, Accessibility Exemptions, Multiple-Renditions.
- **PubCG Final Reports**: Metadata Crosswalks (Schema.org, ONIX, EPUB), Accessibility Display Guidelines, Page Source Identification, Audio Playback, Package Metadata Authoring Guide.
- **Ecosystem & Legacy Reference**: Publishing portals, historical archives, and event notes.

## Quick Start

Simply open `index.html` in any web browser (works directly off `file://` with zero servers):
```bash
# On macOS:
open index.html

# On Linux:
xdg-open index.html

# In PowerShell on Windows:
Start-Process index.html
```

Or serve locally with Node.js, Python, or .NET:
```bash
# Using Node.js (cross-platform):
npm start
# or: node tools/server.js 8080

# Using Python:
python3 -m http.server 8080
```

## Adding, Removing & Re-Indexing Documents

All tooling is **100% cross-platform** (macOS, Linux, and Windows) with zero external npm dependencies:

### 1. Re-Index All Documents
Run the crawler to ingest sections and anchors across all sources in `data/sources.json`:

```bash
# Cross-Platform (Node.js / npm):
npm run reindex

# Force re-download of latest drafts from W3C:
npm run reindex:fresh

# Using Bash on macOS/Linux:
./tools/reindex.sh

# Using PowerShell on Windows:
.\tools\reindex.ps1
```

### 2. Add a New Document Source
Add a new specification or guideline using the CLI tool (automatically triggers re-indexing):

```bash
# Cross-Platform (Node.js):
node tools/manage-sources.js --add \
  --id "epub-tts-11" \
  --title "EPUB Text-to-Speech 1.1" \
  --url "https://www.w3.org/TR/epub-tts-11/" \
  --type "Note" \
  --cat "Audio | Media" \
  --pub "PMWG"

# Using PowerShell on Windows:
.\tools\manage-sources.ps1 -Add `
    -Id "epub-tts-11" `
    -Title "EPUB Text-to-Speech 1.1" `
    -Url "https://www.w3.org/TR/epub-tts-11/" `
    -Type "Note" `
    -Category "Audio | Media" `
    -Publisher "PMWG"
```

### 3. Remove a Document Source
Remove a document and prune its indexed sections automatically:

```bash
# Cross-Platform (Node.js):
node tools/manage-sources.js --remove --id "epub-tts-11"

# Using PowerShell on Windows:
.\tools\manage-sources.ps1 -Remove -Id "epub-tts-11"
```

### 4. List Registered Document Sources

```bash
# Cross-Platform:
npm run sources
# or: node tools/manage-sources.js --list

# Using PowerShell on Windows:
.\tools\manage-sources.ps1 -List
```

## Project Structure

```
epub-search/
├── index.html               # Main search application UI
├── test.html                # Browser test suite (22 automated assertions)
├── package.json             # Cross-platform npm scripts (zero npm dependencies)
├── .gitattributes           # Normalized cross-platform line endings
├── css/
│   └── style.css            # Responsive layout, dark/light theme, syntax modal
├── js/
│   ├── app.js               # UI coordinator, filtering, syntax modal, shortcuts
│   ├── search-engine.js     # QueryLexer, QueryParser (AST), Boolean & phrase engine
│   └── data-loader.js       # Asynchronous data loading and index compilation
├── data/
│   ├── sources.json         # Master catalog of official document sources
│   ├── sources.js           # Companion JS bundle for file:// execution
│   ├── sources.csv          # Clean CSV export of master catalog
│   ├── index-entries.json   # 2,100+ deep specification sections and anchors
│   ├── index-entries.js     # Companion JS bundle for file:// execution
│   └── cache/               # Downloaded raw spec HTML cache (git-ignored)
└── tools/
    ├── reindex.js           # Cross-platform crawler & indexer (Node.js standard lib)
    ├── reindex.sh           # Unix/macOS shell wrapper
    ├── reindex.ps1          # Windows PowerShell crawler (delegates to Node if present)
    ├── manage-sources.js    # Cross-platform source management CLI (Node.js)
    ├── manage-sources.sh    # Unix/macOS shell wrapper
    ├── manage-sources.ps1   # Windows PowerShell CLI (delegates to Node if present)
    ├── server.js            # Cross-platform zero-dependency HTTP server
    ├── server.ps1           # Windows PowerShell HTTP server
    └── test-search.js       # Node.js automated test runner
```

## License
MIT License

