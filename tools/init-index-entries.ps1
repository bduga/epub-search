param(
    [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$entries = @(
    # EPUB 3.3 Core Specification
    @{
        id = "sec-package-def"
        sourceId = "epub-33"
        title = "The package Document and Root Element"
        section = "Section 3.2"
        anchor = "#sec-package-def"
        url = "https://www.w3.org/TR/epub-33/#sec-package-def"
        category = "Authoring"
        type = "Recommendation"
        publisher = "PMWG"
        keywords = @("package", "root", "unique-identifier", "version", "dir", "prefix", "xml:lang", "opf")
        summary = "Defines the root element <package> of the EPUB Package Document, including mandatory attributes unique-identifier and version ('3.0')."
    },
    @{
        id = "sec-metadata-elem"
        sourceId = "epub-33"
        title = "Package Metadata (<metadata>)"
        section = "Section 3.3"
        anchor = "#sec-pkg-metadata"
        url = "https://www.w3.org/TR/epub-33/#sec-pkg-metadata"
        category = "Authoring"
        type = "Recommendation"
        publisher = "PMWG"
        keywords = @("metadata", "dc:identifier", "dc:title", "dc:language", "dcterms:modified", "meta", "property", "refines")
        summary = "Specifies required Dublin Core elements (identifier, title, language) and dcterms:modified timestamp, as well as property refinement."
    },
    @{
        id = "sec-manifest-elem"
        sourceId = "epub-33"
        title = "The manifest Element and Publication Resources (<manifest>)"
        section = "Section 3.4"
        anchor = "#sec-pkg-manifest"
        url = "https://www.w3.org/TR/epub-33/#sec-pkg-manifest"
        category = "Authoring"
        type = "Recommendation"
        publisher = "PMWG"
        keywords = @("manifest", "item", "href", "media-type", "fallback", "properties", "nav", "cover-image", "scripted", "mathml")
        summary = "Lists all publication resources using <item> elements, defining mime types, fallbacks, and resource properties (e.g. nav, scripted, cover-image)."
    },
    @{
        id = "sec-spine-elem"
        sourceId = "epub-33"
        title = "The spine Element and Reading Order (<spine>)"
        section = "Section 3.5"
        anchor = "#sec-pkg-spine"
        url = "https://www.w3.org/TR/epub-33/#sec-pkg-spine"
        category = "Authoring"
        type = "Recommendation"
        publisher = "PMWG"
        keywords = @("spine", "itemref", "idref", "linear", "page-progression-direction", "reading order", "rtl", "ltr")
        summary = "Defines the linear reading order of Content Documents via <itemref> elements and controls page-progression-direction (ltr/rtl)."
    },
    @{
        id = "sec-nav-doc"
        sourceId = "epub-33"
        title = "EPUB Navigation Document"
        section = "Section 4.4"
        anchor = "#sec-nav-doc"
        url = "https://www.w3.org/TR/epub-33/#sec-nav-doc"
        category = "Authoring"
        type = "Recommendation"
        publisher = "PMWG"
        keywords = @("nav", "navigation", "toc", "page-list", "landmarks", "table of contents", "ol", "li", "epub:type")
        summary = "Special XHTML document providing human- and machine-readable navigation: Table of Contents (toc), page-list, and landmarks."
    },
    @{
        id = "sec-fixed-layouts"
        sourceId = "epub-33"
        title = "Fixed-Layout Documents"
        section = "Section 5.2"
        anchor = "#sec-fxl"
        url = "https://www.w3.org/TR/epub-33/#sec-fxl"
        category = "Authoring"
        type = "Recommendation"
        publisher = "PMWG"
        keywords = @("fixed-layout", "fxl", "rendition:layout", "pre-paginated", "viewport", "rendition:orientation", "rendition:spread")
        summary = "Rules and package metadata for pre-paginated fixed-layout publications, including viewport dimensions and synthetic spread control."
    },
    @{
        id = "sec-media-overlays"
        sourceId = "epub-33"
        title = "Media Overlays (Synchronized Audio and Text)"
        section = "Section 5.3"
        anchor = "#sec-media-overlays"
        url = "https://www.w3.org/TR/epub-33/#sec-media-overlays"
        category = "Audio | Media"
        type = "Recommendation"
        publisher = "PMWG"
        keywords = @("media overlays", "smil", "audio sync", "par", "seq", "textref", "clipBegin", "clipEnd", "narration")
        summary = "Defines SMIL-based synchronized audio playback and text highlighting in EPUB Content Documents."
    },
    @{
        id = "sec-content-docs"
        sourceId = "epub-33"
        title = "EPUB Content Documents (XHTML & SVG)"
        section = "Section 4.1"
        anchor = "#sec-contentdocs"
        url = "https://www.w3.org/TR/epub-33/#sec-contentdocs"
        category = "Authoring"
        type = "Recommendation"
        publisher = "PMWG"
        keywords = @("xhtml", "svg", "content documents", "css", "html5", "scripting", "embedded content")
        summary = "Defines profiles of HTML5, SVG, and CSS tailored for digital publishing, along with scripting constraints."
    },

    # EPUB 3.4
    @{
        id = "epub-34-diff"
        sourceId = "epub-34"
        title = "EPUB 3.4 Core Updates and Clarifications"
        section = "Section 1"
        anchor = "#sec-overview"
        url = "https://www.w3.org/TR/epub-34/#sec-overview"
        category = "Authoring"
        type = "Candidate Standard"
        publisher = "PMWG"
        keywords = @("epub 3.4", "candidate recommendation", "modernized", "packaging", "core updates")
        summary = "Next-generation evolution of the core EPUB specification, refining conformance criteria and clarifying modern web integration."
    },
    @{
        id = "epub-34-authoring-guidance"
        sourceId = "epub-overview-34-authoring"
        title = "EPUB 3.4 Authoring Guidelines"
        section = "General Overview"
        anchor = "#sec-authoring"
        url = "https://www.w3.org/TR/epub-overview-34/#sec-authoring"
        category = "Authoring"
        type = "Note"
        publisher = "PMWG"
        keywords = @("authoring guidance", "best practices", "syntax", "epub 3.4 transition")
        summary = "Walkthrough for digital publishers transitioning workflows to EPUB 3.4 standards."
    },

    # EPUB Reading Systems 3.3 & 3.4
    @{
        id = "sec-rs-xml-html"
        sourceId = "epub-rs-33"
        title = "Reading Systems: Content Processing & XML Parsing"
        section = "Section 2.2"
        anchor = "#sec-processing"
        url = "https://www.w3.org/TR/epub-rs-33/#sec-processing"
        category = "Reading Systems"
        type = "Recommendation"
        publisher = "PMWG"
        keywords = @("reading systems", "xml parser", "html parser", "fallback processing", "error handling", "conformance")
        summary = "Processing rules for XML/XHTML content documents, resource fallback chain resolution, and error recovery."
    },
    @{
        id = "sec-rs-scripting"
        sourceId = "epub-rs-33"
        title = "Reading Systems: Scripting Environment & Security"
        section = "Section 3.3"
        anchor = "#sec-script-container"
        url = "https://www.w3.org/TR/epub-rs-33/#sec-script-container"
        category = "Reading Systems"
        type = "Recommendation"
        publisher = "PMWG"
        keywords = @("scripting", "javascript", "security", "sandbox", "navigator.epubReadingSystem", "container")
        summary = "Requirements for reading systems executing JavaScript, container sandboxing, and the navigator.epubReadingSystem API."
    },
    @{
        id = "sec-rs-css"
        sourceId = "epub-rs-33"
        title = "Reading Systems: User Styles & CSS Overrides"
        section = "Section 3.1"
        anchor = "#sec-css-support"
        url = "https://www.w3.org/TR/epub-rs-33/#sec-css-support"
        category = "Reading Systems"
        type = "Recommendation"
        publisher = "PMWG"
        keywords = @("css", "user preferences", "fonts", "colors", "margins", "reading system stylesheets", "pagination")
        summary = "Specifications on how reading systems apply reader preferences (font size, themes, margins) without breaking layout integrity."
    },

    # EPUB Accessibility 1.1 & 1.2
    @{
        id = "sec-a11y-metadata"
        sourceId = "epub-a11y-11"
        title = "Accessibility Discovery Metadata Requirements"
        section = "Section 4.1"
        anchor = "#sec-disc-package"
        url = "https://www.w3.org/TR/epub-a11y-11/#sec-disc-package"
        category = "A11y"
        type = "Recommendation"
        publisher = "PMWG"
        keywords = @("accessibility", "a11y", "schema:accessMode", "schema:accessibilityFeature", "schema:accessibilityHazard", "schema:accessibilitySummary", "schema:accessModeSufficient")
        summary = "Mandatory package metadata properties for discovering accessibility modes, hazards, and features in published EPUBs."
    },
    @{
        id = "sec-a11y-conformance"
        sourceId = "epub-a11y-11"
        title = "Accessibility Conformance & WCAG Mapping"
        section = "Section 3.1"
        anchor = "#sec-wcag"
        url = "https://www.w3.org/TR/epub-a11y-11/#sec-wcag"
        category = "A11y"
        type = "Recommendation"
        publisher = "PMWG"
        keywords = @("wcag", "wcag 2.1", "conformance", "level a", "level aa", "certifiedBy", "certifierCredential")
        summary = "Defines conformance criteria mapping EPUB publications to WCAG 2.1 Level A and AA standards, plus third-party certifier tags."
    },
    @{
        id = "sec-a11y-tech-11"
        sourceId = "epub-a11y-tech-11"
        title = "EPUB Accessibility Techniques 1.1"
        section = "Techniques Guide"
        anchor = "#techniques"
        url = "https://www.w3.org/TR/epub-a11y-tech-11/"
        category = "A11y"
        type = "Note"
        publisher = "PMWG"
        keywords = @("techniques", "alt text", "aria", "headings", "tables", "contrast", "mathml accessibility")
        summary = "Comprehensive practical implementation techniques for authoring accessible markup, descriptions, and structural semantics."
    },
    @{
        id = "sec-a11y-eaa"
        sourceId = "epub-a11y-eaa-mapping"
        title = "European Accessibility Act (EAA) Mapping"
        section = "EAA Guide"
        anchor = "#mapping"
        url = "https://www.w3.org/TR/epub-a11y-eaa-mapping/"
        category = "A11y"
        type = "Note"
        publisher = "PMWG"
        keywords = @("eaa", "european accessibility act", "en 301 549", "legal compliance", "commercial ebooks")
        summary = "Direct mapping between statutory European Accessibility Act requirements and EPUB Accessibility 1.1 technical criteria."
    },
    @{
        id = "sec-fxl-a11y"
        sourceId = "epub-fxl-a11y"
        title = "Fixed-Layout Accessibility Guidelines"
        section = "FXL A11y"
        anchor = "#guidelines"
        url = "https://www.w3.org/TR/epub-fxl-a11y/"
        category = "A11y"
        type = "Note"
        publisher = "PMWG"
        keywords = @("fixed-layout", "fxl", "comics", "children books", "zoom", "reflowable alternative", "screen reader")
        summary = "Strategies and accessibility techniques for comics, illustrated books, and graphic-heavy fixed-layout content."
    },

    # Structural Semantics Vocabulary
    @{
        id = "sec-ssv-terms"
        sourceId = "epub-ssv-11"
        title = "Structural Semantics Vocabulary (SSV) 1.1 Terms"
        section = "Vocabulary Terms"
        anchor = "#sec-vocab"
        url = "https://www.w3.org/TR/epub-ssv-11/#sec-vocab"
        category = "EPUB General"
        type = "Note"
        publisher = "PMWG"
        keywords = @("ssv", "epub:type", "frontmatter", "bodymatter", "backmatter", "chapter", "footnote", "endnote", "glossary", "landmarks")
        summary = "Canonical vocabulary of semantic values for epub:type, categorizing publication divisions, sections, and structural references."
    },

    # Annotations
    @{
        id = "sec-anno-model"
        sourceId = "epub-anno-10"
        title = "EPUB Annotations 1.0 Data Model"
        section = "Section 2"
        anchor = "#sec-model"
        url = "https://www.w3.org/TR/epub-anno-10/#sec-model"
        category = "Annotations"
        type = "Working Draft"
        publisher = "PMWG"
        keywords = @("annotations", "w3c web annotation", "cfi", "canonical fragment identifier", "highlight", "bookmark", "note")
        summary = "Standard specification for exchanging and serializing bookmarks, highlights, and annotations within EPUB using Web Annotation models."
    },
    @{
        id = "sec-anno-ucr"
        sourceId = "epub-anno-ucr"
        title = "Annotations Use Cases and Requirements"
        section = "Use Cases"
        anchor = "#usecases"
        url = "https://www.w3.org/TR/epub-anno-ucr/"
        category = "Annotations"
        type = "Note"
        publisher = "PMWG"
        keywords = @("annotations", "use cases", "sharing", "syncing", "education", "scholarly")
        summary = "Requirements collected from education, research, and reader applications for interoperable annotation syncing."
    },

    # TTS
    @{
        id = "sec-tts-lexicon"
        sourceId = "epub-tts-10"
        title = "EPUB Text-to-Speech (TTS) & Pronunciation Lexicons"
        section = "Section 3"
        anchor = "#sec-pls"
        url = "https://www.w3.org/TR/epub-tts-10/#sec-pls"
        category = "Audio | Media"
        type = "Note"
        publisher = "PMWG"
        keywords = @("tts", "text-to-speech", "pronunciation", "pls", "lexicon", "ssml", "speech synthesis", "css speech")
        summary = "Integration of W3C Pronunciation Lexicon Specification (PLS) and SSML for controlling synthetic speech engines in reading systems."
    },

    # Multiple Renditions
    @{
        id = "sec-multi-rend"
        sourceId = "epub-multi-rend-11"
        title = "EPUB Multiple-Rendition Publications 1.1"
        section = "Section 2"
        anchor = "#sec-container"
        url = "https://www.w3.org/TR/epub-multi-rend-11/#sec-container"
        category = "EPUB General"
        type = "Note"
        publisher = "PMWG"
        keywords = @("multiple-renditions", "container.xml", "rendition mapping", "reflow and fixed in one container")
        summary = "Defines how multiple versions of a book (e.g. reflowable and fixed-layout, or translations) reside in a single .epub container."
    },

    # PubCG Final Reports
    @{
        id = "cg-crosswalk-meta"
        sourceId = "cg-crosswalk-20260326"
        title = "Accessibility Metadata Crosswalk (Schema.org ↔ ONIX ↔ EPUB)"
        section = "Crosswalk Specification"
        anchor = "#crosswalk-table"
        url = "https://www.w3.org/community/reports/publishingcg/CG-FINAL-crosswalk-20260326/"
        category = "A11y"
        type = "Report"
        publisher = "PubCG"
        keywords = @("crosswalk", "onix", "schema.org", "codelist 196", "metadata mapping", "distribution")
        summary = "Comprehensive field-by-field crosswalk mapping accessibility metadata attributes between EPUB, Schema.org, and ONIX 3.0."
    },
    @{
        id = "cg-onix-tech"
        sourceId = "cg-onix-techniques-20251222"
        title = "ONIX Accessibility Techniques for Publishers"
        section = "Techniques Guide"
        anchor = "#techniques"
        url = "https://www.w3.org/community/reports/publishingcg/CG-FINAL-onix-techniques-20251222/"
        category = "A11y"
        type = "Report"
        publisher = "PubCG"
        keywords = @("onix", "supply chain", "metadata", "retail feeds", "accessibility statements")
        summary = "Guidance for publishers and distributors encoding accessibility compliance in ONIX metadata feeds."
    },
    @{
        id = "cg-a11y-display"
        sourceId = "cg-a11y-display-guidelines-20251222"
        title = "Display Guidelines for Accessibility Metadata in Bookstores"
        section = "Retailer & Library Guidelines"
        anchor = "#display-rules"
        url = "https://www.w3.org/community/reports/publishingcg/CG-FINAL-a11y-display-guidelines-20251222/"
        category = "A11y"
        type = "Report"
        publisher = "PubCG"
        keywords = @("display guidelines", "retailers", "libraries", "badges", "user interface", "consumer transparency")
        summary = "Best practice guidelines for bookstore web portals and library catalogues to communicate accessibility features to shoppers."
    },
    @{
        id = "cg-page-source-ident"
        sourceId = "cg-page-source-id-20230314"
        title = "Page Source Identification & Print Page Breaks"
        section = "Techniques"
        anchor = "#page-source"
        url = "https://www.w3.org/community/reports/publishingcg/CG-FINAL-page-source-id-20230314/"
        category = "EPUB General"
        type = "Report"
        publisher = "PubCG"
        keywords = @("page-source", "print pagination", "page-list", "isbn", "pagebreak", "epub:type='pagebreak'", "doc-pagebreak")
        summary = "Techniques for identifying the exact print source edition used to synchronize digital and print classroom pagination."
    },
    @{
        id = "cg-audio-play"
        sourceId = "cg-audio-playback-20230314"
        title = "Audio Playback Guidance in EPUB Publications"
        section = "Audio Guidelines"
        anchor = "#audio-playback"
        url = "https://www.w3.org/community/reports/publishingcg/CG-FINAL-audio-playback-20230314/"
        category = "Audio | Media"
        type = "Report"
        publisher = "PubCG"
        keywords = @("audio playback", "html5 audio", "media overlays", "background audio", "controls", "codecs")
        summary = "Community group best practices for integrating embedded audio and background tracks within EPUB content."
    },
    @{
        id = "cg-pkg-meta-guide"
        sourceId = "cg-package-metadata-authoring"
        title = "Package Metadata Authoring Guide for Accessibility"
        section = "Authoring Guide"
        anchor = "#package-metadata"
        url = "https://w3c-cg.github.io/publ-a11y/package-metadata-authoring-guide/"
        category = "A11y"
        type = "Report"
        publisher = "PubCG"
        keywords = @("package metadata", "authoring guide", "step-by-step", "code samples", "opf metadata")
        summary = "Hands-on tutorial with concrete OPF code examples for authors adding accessibility properties to EPUB packages."
    }
)

$json = $entries | ConvertTo-Json -Depth 5
Set-Content -Path (Join-Path (Join-Path $ProjectRoot "data") "index-entries.json") -Value $json -Encoding UTF8
Write-Output "Successfully wrote $($entries.Count) deep index entries to data/index-entries.json"


