param(
    [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$sources = @(
    @{
        id = "epub-overview-33"
        title = "EPUB 3 Overview (3.3)"
        url = "https://www.w3.org/TR/epub-overview-33/"
        type = "Note"
        publisher = "PMWG"
        category = "EPUB General"
        version = "3.3"
        description = "High-level overview of the EPUB 3.3 standard and its companion specifications."
    },
    @{
        id = "epub-a11y-explain-12"
        title = "EPUB Accessibility 1.2 Explainer"
        url = "https://www.w3.org/TR/epub-a11y-explain-12/"
        type = "Draft Note"
        publisher = "PMWG"
        category = "A11y"
        version = "1.2"
        description = "Explainer document detailing accessibility principles and rationale for EPUB 1.2."
    },
    @{
        id = "epub-34"
        title = "EPUB 3.4 Core Specification"
        url = "https://www.w3.org/TR/epub-34/"
        type = "Candidate Standard"
        publisher = "PMWG"
        category = "Authoring"
        version = "3.4"
        description = "Defines the core structural semantics, package document, manifest, and spine for EPUB 3.4 publications."
    },
    @{
        id = "epub-a11y-12"
        title = "EPUB Accessibility 1.2"
        url = "https://www.w3.org/TR/epub-a11y-12/"
        type = "Candidate Standard"
        publisher = "PMWG"
        category = "A11y"
        version = "1.2"
        description = "Specifies accessibility conformance requirements for EPUB Publications."
    },
    @{
        id = "epub-a11y-tech-12"
        title = "EPUB Accessibility Techniques 1.2"
        url = "https://www.w3.org/TR/epub-a11y-tech-12/"
        type = "Note"
        publisher = "PMWG"
        category = "A11y"
        version = "1.2"
        description = "Provides practical authoring guidance and techniques for meeting EPUB Accessibility 1.2 requirements."
    },
    @{
        id = "epub-rs-34"
        title = "EPUB Reading Systems 3.4"
        url = "https://www.w3.org/TR/epub-rs-34/"
        type = "Candidate Standard"
        publisher = "PMWG"
        category = "Reading Systems"
        version = "3.4"
        description = "Conformance requirements and processing rules for reading systems conforming to EPUB 3.4."
    },
    @{
        id = "epub-ssv-11"
        title = "EPUB Structural Semantics Vocabulary 1.1"
        url = "https://www.w3.org/TR/epub-ssv-11/"
        type = "Note"
        publisher = "PMWG"
        category = "EPUB General"
        version = "1.1"
        description = "Defines the structural semantics vocabulary used in epub:type attributes."
    },
    @{
        id = "epub-anno-10"
        title = "EPUB Annotations 1.0"
        url = "https://www.w3.org/TR/epub-anno-10/"
        type = "Working Draft"
        publisher = "PMWG"
        category = "Annotations"
        version = "1.0"
        description = "Standard specification for representing user and publisher annotations in EPUB."
    },
    @{
        id = "epub-anno-vocab-10"
        title = "EPUB Annotations Vocabulary 1.0"
        url = "https://www.w3.org/TR/epub-anno-vocab-10/"
        type = "Draft Note"
        publisher = "PMWG"
        category = "Annotations"
        version = "1.0"
        description = "Defines the terms and vocabulary for describing annotation properties and types."
    },
    @{
        id = "epub-fxl-a11y"
        title = "EPUB Fixed Layout Accessibility"
        url = "https://www.w3.org/TR/epub-fxl-a11y/"
        type = "Note"
        publisher = "PMWG"
        category = "A11y"
        version = "1.0"
        description = "Techniques and guidelines for making fixed-layout EPUB publications accessible."
    },
    @{
        id = "epub-overview-34"
        title = "EPUB 3.4 Overview"
        url = "https://www.w3.org/TR/epub-overview-34/"
        type = "Note"
        publisher = "PMWG"
        category = "EPUB General"
        version = "3.4"
        description = "Overview of changes and ecosystem features introduced in EPUB 3.4."
    },
    @{
        id = "epub-anno-ucr"
        title = "EPUB Annotations Use Cases and Requirements"
        url = "https://www.w3.org/TR/epub-anno-ucr/"
        type = "Note"
        publisher = "PMWG"
        category = "Annotations"
        version = "1.0"
        description = "Describes real-world use cases, scenarios, and requirements for annotation interoperability in EPUB."
    },
    @{
        id = "epub-a11y-exemption"
        title = "EPUB Accessibility Conformance and Exemptions"
        url = "https://www.w3.org/TR/epub-a11y-exemption/"
        type = "Note"
        publisher = "PMWG"
        category = "A11y"
        version = "1.0"
        description = "Guidelines regarding exemptions and edge cases for EPUB accessibility evaluation."
    },
    @{
        id = "epub-multi-rend-11"
        title = "EPUB Multiple-Rendition Publications 1.1"
        url = "https://www.w3.org/TR/epub-multi-rend-11/"
        type = "Note"
        publisher = "PMWG"
        category = "EPUB General"
        version = "1.1"
        description = "Defines how to package and reference multiple renditions of the same work in a single container."
    },
    @{
        id = "epub-33"
        title = "EPUB 3.3 Core Specification"
        url = "https://www.w3.org/TR/epub-33/"
        type = "Recommendation"
        publisher = "PMWG"
        category = "Authoring"
        version = "3.3"
        description = "Official W3C Recommendation defining the core structure, package document, manifest, spine, and navigation for EPUB 3.3."
    },
    @{
        id = "epub-tts-10"
        title = "EPUB Text-to-Speech (TTS) 1.0"
        url = "https://www.w3.org/TR/epub-tts-10/"
        type = "Note"
        publisher = "PMWG"
        category = "Audio | Media"
        version = "1.0"
        description = "Defines pronunciation lexicons, SSML markup, and CSS speech properties for EPUB."
    },
    @{
        id = "epub-a11y-eaa-mapping"
        title = "EPUB Accessibility European Accessibility Act (EAA) Mapping"
        url = "https://www.w3.org/TR/epub-a11y-eaa-mapping/"
        type = "Note"
        publisher = "PMWG"
        category = "A11y"
        version = "1.0"
        description = "Mapping between European Accessibility Act requirements and EPUB Accessibility 1.1."
    },
    @{
        id = "epub-a11y-tech-11"
        title = "EPUB Accessibility Techniques 1.1"
        url = "https://www.w3.org/TR/epub-a11y-tech-11/"
        type = "Note"
        publisher = "PMWG"
        category = "A11y"
        version = "1.1"
        description = "Comprehensive techniques for meeting accessibility requirements in EPUB 3.3 and EPUB Accessibility 1.1."
    },
    @{
        id = "epub-a11y-11"
        title = "EPUB Accessibility 1.1"
        url = "https://www.w3.org/TR/epub-a11y-11/"
        type = "Recommendation"
        publisher = "PMWG"
        category = "A11y"
        version = "1.1"
        description = "Official W3C Recommendation specifying content accessibility requirements and metadata for EPUB."
    },
    @{
        id = "epub-rs-33"
        title = "EPUB Reading Systems 3.3"
        url = "https://www.w3.org/TR/epub-rs-33/"
        type = "Recommendation"
        publisher = "PMWG"
        category = "Reading Systems"
        version = "3.3"
        description = "Official W3C Recommendation defining reading system conformance and processing requirements for EPUB 3.3."
    },
    @{
        id = "epub-aria-authoring-11"
        title = "EPUB-ARIA Authoring Guide 1.1"
        url = "https://www.w3.org/TR/epub-aria-authoring-11/"
        type = "Note"
        publisher = "EPUB3 WG"
        category = "A11y"
        version = "1.1"
        description = "Guide for digital publishing content creators on using WAI-ARIA with EPUB."
    },
    @{
        id = "cg-crosswalk-20260326"
        title = "Crosswalk for Accessibility Metadata (2026)"
        url = "https://www.w3.org/community/reports/publishingcg/CG-FINAL-crosswalk-20260326/"
        type = "Report"
        publisher = "PubCG"
        category = "A11y"
        version = "2026"
        description = "Community Group report aligning accessibility metadata across Schema.org, ONIX, and EPUB."
    },
    @{
        id = "cg-onix-techniques-20251222"
        title = "ONIX Accessibility Techniques"
        url = "https://www.w3.org/community/reports/publishingcg/CG-FINAL-onix-techniques-20251222/"
        type = "Report"
        publisher = "PubCG"
        category = "A11y"
        version = "2025"
        description = "Techniques for expressing accessibility metadata in ONIX feeds for publishing distribution."
    },
    @{
        id = "cg-epub-techniques-20251222"
        title = "EPUB Accessibility Techniques (PubCG Final)"
        url = "https://www.w3.org/community/reports/publishingcg/CG-FINAL-epub-techniques-20251222/"
        type = "Report"
        publisher = "PubCG"
        category = "A11y"
        version = "2025"
        description = "Community Group final report on authoring accessible EPUB publications."
    },
    @{
        id = "cg-a11y-display-guidelines-20251222"
        title = "Display Guidelines for Accessibility Metadata"
        url = "https://www.w3.org/community/reports/publishingcg/CG-FINAL-a11y-display-guidelines-20251222/"
        type = "Report"
        publisher = "PubCG"
        category = "A11y"
        version = "2025"
        description = "Guidelines for digital retail platforms and libraries on displaying accessibility metadata to end users."
    },
    @{
        id = "cg-a11y-discov-crosswalk-20240906"
        title = "Accessibility Discovery Vocabulary Crosswalk"
        url = "https://www.w3.org/community/reports/a11y-discov-vocab/CG-FINAL-crosswalk-20240906/"
        type = "Report"
        publisher = "PubCG"
        category = "A11y"
        version = "2024"
        description = "Crosswalk mapping accessibility discovery properties between EPUB metadata and vocabulary terms."
    },
    @{
        id = "cg-schema-a11y-summary-20230516"
        title = "Schema.org Accessibility Summary Recommendation"
        url = "https://www.w3.org/community/reports/publishingcg/CG-FINAL-schema-a11y-summary-20230516/"
        type = "Report"
        publisher = "PubCG"
        category = "A11y"
        version = "2023"
        description = "Best practices for authoring human-readable accessibility summaries using Schema.org properties."
    },
    @{
        id = "cg-page-source-id-20230314"
        title = "Page Source Identification (Print Pagination Reference)"
        url = "https://www.w3.org/community/reports/publishingcg/CG-FINAL-page-source-id-20230314/"
        type = "Report"
        publisher = "PubCG"
        category = "EPUB General"
        version = "2023"
        description = "Techniques for identifying the print source edition used to generate digital page breaks and page-lists."
    },
    @{
        id = "cg-audio-playback-20230314"
        title = "Audio Playback in EPUB"
        url = "https://www.w3.org/community/reports/publishingcg/CG-FINAL-audio-playback-20230314/"
        type = "Report"
        publisher = "PubCG"
        category = "Audio | Media"
        version = "2023"
        description = "Guidance on embedding, controlling, and syncing audio playback in EPUB content."
    },
    @{
        id = "w3c-ecosystems-publishing-legacy"
        title = "W3C Publishing Ecosystems Overview"
        url = "https://www.w3.org/ecosystems/publishing/"
        type = "Legacy"
        publisher = "W3C Evangelists"
        category = "Publishing"
        version = "Legacy"
        description = "Historical overview of publishing standards and web integration initiatives at W3C."
    },
    @{
        id = "w3c-github-publishing"
        title = "Publishing at W3C Portal"
        url = "https://w3c.github.io/publishing/"
        type = "Legacy"
        publisher = "W3C Publishing"
        category = "Publishing"
        version = "Legacy"
        description = "GitHub resource hub and landing page for W3C Publishing working groups."
    },
    @{
        id = "w3c-ecosystems-publishing-post"
        title = "Publishing Ecosystem Announcements & Posts"
        url = "https://www.w3.org/ecosystems/publishing/"
        type = "Post"
        publisher = "W3C Publishing"
        category = "Publishing"
        version = "Current"
        description = "Blog updates, event announcements, and activity reports from W3C Publishing."
    },
    @{
        id = "epub-current-standard"
        title = "EPUB Standard (Latest W3C Recommendation Redirect)"
        url = "https://www.w3.org/TR/epub/"
        type = "Recommendation"
        publisher = "PMWG"
        category = "EPUB General"
        version = "Latest"
        description = "Canonical redirect pointing to the latest version of the EPUB standard."
    },
    @{
        id = "epub-overview-34-authoring"
        title = "EPUB 3.4 Authoring Guidelines & Overview"
        url = "https://www.w3.org/TR/epub-overview-34/"
        type = "Note"
        publisher = "PMWG"
        category = "Authoring"
        version = "3.4"
        description = "Authoring-centric walkthrough of EPUB 3.4 features, syntax changes, and deprecations."
    },
    @{
        id = "w3c-github-epub-portal"
        title = "EPUB Working Group Hub (GitHub)"
        url = "https://w3c.github.io/epub/"
        type = "Post"
        publisher = "PMWG"
        category = "EPUB General"
        version = "Current"
        description = "Landing page and status dashboard for EPUB working drafts, test suites, and discussions."
    },
    @{
        id = "w3c-publishing-events"
        title = "W3C Publishing Events Archive"
        url = "https://w3c.github.io/publishing/events"
        type = "Legacy"
        publisher = "W3C Publishing"
        category = "EPUB feedback"
        version = "Historical"
        description = "Archive of publishing summits, workshops, and community feedback events."
    },
    @{
        id = "w3c-publishing-testimonials"
        title = "W3C Publishing Testimonials"
        url = "https://w3c.github.io/publishing/testimonials"
        type = "Legacy"
        publisher = "W3C Publishing"
        category = "Publishing"
        version = "Historical"
        description = "Industry testimonials and adoption statements for EPUB and web publishing."
    },
    @{
        id = "cg-package-metadata-authoring"
        title = "Package Metadata Authoring Guide"
        url = "https://w3c-cg.github.io/publ-a11y/package-metadata-authoring-guide/"
        type = "Report"
        publisher = "PubCG"
        category = "A11y"
        version = "2024"
        description = "Step-by-step authoring guide for crafting accessible package metadata in EPUB OPF package documents."
    }
)

$json = $sources | ConvertTo-Json -Depth 5
Set-Content -Path (Join-Path (Join-Path $ProjectRoot "data") "sources.json") -Value $json -Encoding UTF8

$sources | Export-Csv -Path (Join-Path (Join-Path $ProjectRoot "data") "sources.csv") -NoTypeInformation -Encoding UTF8
Write-Output "Successfully wrote $($sources.Count) sources to data/sources.json and data/sources.csv"


