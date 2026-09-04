# EPUB Documentation Search Engine

A high-performance, client-side search engine and explorer for official W3C and community specifications, notes, reports, and guidance for the EPUB standard.

## Overview

The EPUB ecosystem spans multiple specifications, working group notes, community group reports, and best practice guides across the W3C Publishing Maintenance Working Group (PMWG), Publishing Community Group (PubCG), and legacy IDPF/W3C working groups.

This application provides a unified, fast, searchable catalog and index across **38 official document sources**, featuring:
- **Instant Search**: Sub-millisecond tokenized full-text search across documents, sections, element definitions, and topics.
- **Faceted Filtering**: Filter by Document Type/Status (*Standard / Recommendation*, *Candidate Standard*, *Note*, *Report*, *Legacy*), Publisher (*PMWG*, *PubCG*, *EPUB3 WG*), and Subject Category (*Authoring*, *A11y*, *Reading Systems*, *Annotations*, *Audio | Media*, *EPUB General*).
- **Direct Official Linking**: Deep-links directly to canonical W3C Recommendation anchors.
- **Zero Dependencies**: Pure modern HTML5, Vanilla CSS, and JavaScript. Runs instantly in any browser without requiring node, npm, or backend servers.

## Document Sources Catalog

The search index is initialized from `data/sources.json` (and `data/sources.csv`), comprising 38 official publications:
- **Core Standards**: EPUB 3.3, EPUB 3.4 (Candidate), EPUB Reading Systems 3.3/3.4, EPUB Accessibility 1.1/1.2.
- **Working Group Notes**: EPUB 3.3/3.4 Overview, Structural Semantics Vocabulary (SSV), Text-to-Speech (TTS), Fixed-Layout Accessibility, Annotations Vocabulary & Use Cases, Accessibility Exemptions, Multiple-Renditions.
- **PubCG Final Reports**: Metadata Crosswalks (Schema.org, ONIX, EPUB), Accessibility Display Guidelines, Page Source Identification, Audio Playback, Package Metadata Authoring Guide.
- **Ecosystem & Legacy Reference**: Publishing portals, historical archives, and event notes.

## Quick Start

Simply open `index.html` in any web browser:
```powershell
# In PowerShell on Windows:
Start-Process index.html
```

Or serve locally with any static web server:
```powershell
# Using Python (if installed):
python -m http.server 8000

# Or using .NET:
dotnet serve
```

## Project Structure

```
epub-search/
├── index.html               # Main search application UI
├── css/
│   └── style.css            # Modern styling, responsive layout, dark/light theme
├── js/
│   ├── app.js               # UI coordinator, filtering, keyboard shortcuts
│   ├── search-engine.js     # Tokenizer, inverted index, BM25-style ranking
│   └── data-loader.js       # Asynchronous data loading and index compilation
├── data/
│   ├── sources.json         # Master catalog of 38 official document sources
│   ├── sources.csv          # CSV export of master catalog
│   └── index-entries.json   # Deeply indexed sections, elements, and concepts
└── tools/
    └── init-sources.ps1     # Data generator script for catalog
```

## License
MIT License
