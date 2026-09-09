/**
 * Automated Verification Suite for Advanced EPUB Query Engine
 */
const fs = require('fs');
const path = require('path');
const { EpubSearchEngine, QueryLexer, QueryParser } = require('../js/search-engine.js');

const projectRoot = path.resolve(__dirname, '..');
const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
const sources = readJson(path.join(projectRoot, 'data', 'sources.json'));
const entries = readJson(path.join(projectRoot, 'data', 'index-entries.json'));

console.log(`\n======================================================`);
console.log(`Running Advanced Query Engine Test Suite`);
console.log(`Ingesting ${sources.length} sources and ${entries.length} deep entries...`);
console.log(`======================================================\n`);

const engine = new EpubSearchEngine();
engine.initialize(sources, entries);

let passed = 0;
let failed = 0;

function assert(description, condition, details = '') {
    if (condition) {
        console.log(`  ✓ PASS: ${description}`);
        passed++;
    } else {
        console.error(`  ✗ FAIL: ${description}`);
        if (details) console.error(`    Details: ${details}`);
        failed++;
    }
}

// 0. Empty Search (No query, no filters)
const rEmpty = engine.search('');
assert('Empty search without filters returns 0 results', rEmpty.length === 0);

// 1. Basic Token Search
const r1 = engine.search('manifest');
assert('Single term search (manifest) returns results', r1.length > 0);
assert('Manifest results include EPUB 3.3 manifest entry', r1.some(d => d.title.toLowerCase().includes('manifest')));

// 2. Boolean AND
const rAnd = engine.search('manifest AND spine');
assert('Boolean AND (manifest AND spine) returns matching results', rAnd.length > 0);
assert('All manifest AND spine results contain manifest or spine concepts', 
    rAnd.every(d => d.rawText.includes('manifest') && d.rawText.includes('spine')),
    `Count: ${rAnd.length}`
);

// 3. Boolean OR
const rOr = engine.search('manifest OR spine');
assert('Boolean OR returns more results than AND', rOr.length >= rAnd.length, `OR: ${rOr.length} vs AND: ${rAnd.length}`);

// 4. Boolean NOT (Exclusion)
const rNot = engine.search('accessibility NOT draft');
assert('Boolean NOT excludes draft documents', 
    rNot.length > 0 && rNot.every(d => !d.type.toLowerCase().includes('draft') && !d.title.toLowerCase().includes('draft')),
    `Count: ${rNot.length}`
);

// 5. Shorthand Negation (-term)
const rMinus = engine.search('accessibility -draft');
assert('Shorthand negation (-draft) matches Boolean NOT', rMinus.length === rNot.length, `Minus: ${rMinus.length} vs NOT: ${rNot.length}`);

// 6. Exact Quoted Phrase
const rPhrase = engine.search('"package document"');
assert('Exact phrase ("package document") returns results', rPhrase.length > 0);
assert('All phrase results contain "package document"', 
    rPhrase.every(d => d.rawText.includes('package document')),
    `Count: ${rPhrase.length}`
);

// 7. Field Qualifier (type:Recommendation)
const rField = engine.search('type:Recommendation AND manifest');
assert('Field qualifier (type:Recommendation AND manifest) returns results', rField.length > 0);
assert('All field qualifier results have type === Recommendation', 
    rField.every(d => d.type === 'Recommendation'),
    `Count: ${rField.length}`
);

// 8. Field Qualifier for Publisher (pub:PMWG)
const rPub = engine.search('pub:PMWG spine');
assert('Field qualifier (pub:PMWG spine) returns PMWG results', rPub.length > 0);
assert('All results are published by PMWG', rPub.every(d => d.publisher === 'PMWG'));

// 9. Parentheses Grouping
const rGroup = engine.search('(manifest OR spine) AND package');
assert('Grouped query ((manifest OR spine) AND package) returns results', rGroup.length > 0);
assert('Grouped results satisfy both branches', 
    rGroup.every(d => (d.rawText.includes('manifest') || d.rawText.includes('spine')) && d.rawText.includes('package'))
);

// 10. Prefix Wildcard
const rPrefix = engine.search('nav*');
assert('Prefix wildcard (nav*) matches navigation and nav elements', rPrefix.length > 0);
assert('Results contain tokens starting with nav', 
    rPrefix.some(d => d.title.toLowerCase().includes('nav') || d.keywords.some(k => k.toLowerCase().startsWith('nav')))
);

// 11. Highlighting Accuracy (does not highlight syntax keywords like AND, OR, NOT)
const text = "Defines the manifest and package element in the specification.";
const highlighted = EpubSearchEngine.highlightText(text, 'manifest AND package NOT draft');
assert('Highlighting marks "manifest"', highlighted.includes('<mark>manifest</mark>'));
assert('Highlighting marks "package"', highlighted.includes('<mark>package</mark>'));
assert('Highlighting DOES NOT mark "AND"', !highlighted.includes('<mark>and</mark>') && !highlighted.includes('<mark>AND</mark>'));
assert('Highlighting DOES NOT mark "NOT"', !highlighted.includes('<mark>not</mark>') && !highlighted.includes('<mark>NOT</mark>'));

// 12. Quoted Phrase Highlighting
const phraseText = "The EPUB package document contains manifest items.";
const phraseHighlighted = EpubSearchEngine.highlightText(phraseText, '"package document"');
assert('Highlighting marks exact phrase as single unit', phraseHighlighted.includes('<mark>package document</mark>'));

// 13. RFC 2119 Qualifier: req:any
const rReqAny = engine.search('req:any');
assert('req:any returns normative sections (' + rReqAny.length + ' sections)', rReqAny.length > 0);
assert('All req:any sections contain at least 1 RFC 2119 keyword', rReqAny.every(d => d.rfc2119 && d.rfc2119.length > 0));

// 14. RFC 2119 Qualifier: req:must (collapsing MUST and MUST NOT)
const rReqMust = engine.search('req:must');
assert('req:must returns sections (' + rReqMust.length + ' sections)', rReqMust.length > 0);
assert('All req:must sections contain MUST or MUST NOT', 
    rReqMust.every(d => d.rfc2119 && (d.rfc2119.includes('MUST') || d.rfc2119.includes('MUST NOT'))));

// 15. RFC 2119 Qualifier: req:should (collapsing SHOULD and SHOULD NOT)
const rReqShould = engine.search('req:should');
assert('req:should returns sections (' + rReqShould.length + ' sections)', rReqShould.length > 0);
assert('All req:should sections contain SHOULD or SHOULD NOT',
    rReqShould.every(d => d.rfc2119 && (d.rfc2119.includes('SHOULD') || d.rfc2119.includes('SHOULD NOT'))));

// 16. RFC 2119 Qualifier: specific negative req:"must not"
const rReqMustNot = engine.search('req:"must not"');
assert('req:"must not" returns sections (' + rReqMustNot.length + ' sections)', rReqMustNot.length > 0);
assert('All req:"must not" sections explicitly contain MUST NOT',
    rReqMustNot.every(d => d.rfc2119 && d.rfc2119.includes('MUST NOT')));

// 17. RFC 2119 Combined query: req:must AND type:Recommendation
const rReqCombo = engine.search('req:must AND type:Recommendation');
assert('req:must AND type:Recommendation returns matching results (' + rReqCombo.length + ' sections)', rReqCombo.length > 0);
assert('Combined results satisfy both requirement and type',
    rReqCombo.every(d => d.type === 'Recommendation' && d.rfc2119 && (d.rfc2119.includes('MUST') || d.rfc2119.includes('MUST NOT'))));

// 18. RFC 2119 Highlighting: does not highlight 'any' when using req:any
const sampleText = "Any creator must provide a fallback.";
const anyHighlighted = EpubSearchEngine.highlightText(sampleText, 'req:any fallback');
assert('Highlighting marks "fallback"', anyHighlighted.includes('<mark>fallback</mark>'));
assert('Highlighting DOES NOT mark "any" from req:any', !anyHighlighted.toLowerCase().includes('<mark>any</mark>'));

console.log(`\n======================================================`);
console.log(`Test Results: ${passed} passed, ${failed} failed`);
console.log(`======================================================\n`);

if (failed > 0) {
    process.exit(1);
}
