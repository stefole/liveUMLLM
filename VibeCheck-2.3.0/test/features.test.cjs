const{test}=require('node:test');const assert=require('node:assert/strict');
const analysis=require('../src/analysis');
const{buildFileOverview}=require('../src/fileOverview');
const{buildCodeMap}=require('../src/codeMap');

test('analysis parses JSON issues and rejects labels that are not usable',()=>{
 const result=analysis.parseAnalysis(JSON.stringify({choices:[{message:{content:JSON.stringify({summary:'ok',issues:[{label:'build_window(window_size)',severity:'high',title:'Repeated window build',explanation:'Rebuilt each iteration',line:18,suggestion:'Hoist it',},{label:'',severity:'low',title:'bad',explanation:'bad'}]})}}]}));
 assert.equal(result.issues.length,1);assert.equal(result.issues[0].label,'build_window(window_size)');assert.equal(result.issues[0].line,18);assert.equal(result.issues[0].severity,'high');
});
test('analysis tolerates fenced JSON and clamps severities/count',()=>{
 const issues=Array.from({length:12},(_,i)=>({label:'node '+i,severity:'weird',title:'t',explanation:'e'}));
 const result=analysis.parseAnalysis(JSON.stringify({choices:[{message:{content:'```json\n'+JSON.stringify({summary:'s',issues})+'\n```'}}]}));
 assert.equal(result.issues.length,8);assert.ok(result.issues.every(issue=>issue.severity==='medium'));
});
test('diagram labels are extracted from both renderers',()=>{
 assert.deepEqual(analysis.extractLabels('flowchart TD\n N1["build_window(window_size)"]\n N2{"value > 0"}','mermaid').sort(),['build_window(window_size)','value > 0'].sort());
 const uml=analysis.extractLabels('@startuml\nstart\n:window = build_window(size);\nif (cache empty) then (yes)\nstop\n@enduml','plantuml');
 assert.ok(uml.includes('window = build_window(size)'));assert.ok(uml.includes('cache empty'));
});
test('file overview connects functions that call each other and preserves node metadata',()=>{
 const funcs=[{name:'spectral_power',startLine:10,body:'def spectral_power():\n    window = build_window(8)'},{name:'build_window',startLine:2,body:'def build_window(size):\n    return []'},{name:'unused',startLine:30,body:'def unused():\n    pass'}];
 const overview=buildFileOverview(funcs,{mode:'mermaid',fileName:'demo.py'});
 assert.match(overview.code,/flowchart TD/);assert.ok(overview.nodes.some(n=>n.name==='spectral_power'&&n.line===11));
 assert.equal(overview.code.match(/-->/g).length,1);
 const uml=buildFileOverview(funcs,{mode:'plantuml',fileName:'demo.py'});
 assert.match(uml.code,/rectangle "spectral_power"/);assert.match(uml.code,/@enduml/);
});
test('code map maps statement labels to real file lines',()=>{
 const lines=['def add(a, b):','    total = a + b','    return total'];
 const document={lineCount:lines.length,lineAt:i=>({text:lines[i]})};
 const func={name:'add',startLine:0,body:lines.join('\n'),rawBody:lines.join('\n')};
 const map=buildCodeMap(func,'python',document);
 assert.ok(map.some(entry=>entry.line===1&&entry.text.includes('total')));
 assert.ok(map.some(entry=>entry.line===2&&entry.text.includes('return')));
});
