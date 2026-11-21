const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const {createRequire}=require('node:module');
const http=require('node:http');
const base=path.resolve(__dirname,'..');
const summaries=require('../src/summaries');
function setup(config={},hover=async()=>[]) {
 const settings={'llm.enabled':true,'llm.updateMode':'automatic','llm.apiKey':'test-key',...config};
 const document={languageId:'python',uri:{scheme:'file',fsPath:'/test.py',toString:()=> 'file:///test.py'},getText:()=> 'def add(a, b):\n    return a + b',offsetAt:()=>0,positionAt:()=>({line:0,character:0})};
 const vscode={ConfigurationTarget:{Global:1},workspace:{getConfiguration:()=>({get:(k,d)=>settings[k]??d,update:async(k,v)=>{settings[k]=v;}})},commands:{executeCommand:hover},window:{activeTextEditor:{document}},Position:class {constructor(line,character){this.line=line;this.character=character;}}};
 const source=fs.readFileSync(path.join(base,'src/extension.js'),'utf8');
 const mod={exports:{}}; const req=createRequire(path.join(base,'src/extension.js'));
 const context={module:mod,exports:mod.exports,require:n=>n==='vscode'?vscode:req(n),__dirname:path.join(base,'src'),process,console,setTimeout,clearTimeout,AbortController};
 vm.runInNewContext(source+'\ncurrentLanguage="python"; module.exports._test={LiveUmlSidebar,PlantUmlServerManager};',context);
 const sidebar=new mod.exports._test.LiveUmlSidebar({}); const messages=[];
 sidebar.currentDiagramMode='mermaid';
 sidebar.post=m=>messages.push(m);
 sidebar._currentRequestId=1; sidebar.currentFunctionName='add';
 return {sidebar,messages,document,settings,ServerManager:mod.exports._test.PlantUmlServerManager};
}
test('new workspaces default to the whole-file view in PlantUML',()=>{
 const Sidebar=setup().sidebar.constructor;const sidebar=new Sidebar({globalState:{get:(key,fallback)=>fallback}});
 assert.equal(sidebar.currentDiagramType,'file');assert.equal(sidebar.currentDiagramMode,'plantuml');
});
test('switching providers never reuses another endpoint credential',async()=>{
 const {sidebar,settings}=setup();const keys=new Map();sidebar.context.secrets={store:async(k,v)=>keys.set(k,v),get:async k=>keys.get(k)};
 await sidebar.saveApiKey('deepseek-test-key','https://api.deepseek.com/v1');await sidebar.saveApiKey('other-test-key','https://other.example/v1');
 settings['llm.baseUrl']='https://api.deepseek.com/v1';assert.equal(sidebar._summaryConfig().apiKey,'deepseek-test-key');
 settings['llm.baseUrl']='https://other.example/v1';assert.equal(sidebar._summaryConfig().apiKey,'other-test-key');
 settings['llm.baseUrl']='https://new.example/v1';assert.equal(sidebar._summaryConfig().apiKey,'');
});
test('saving a complete custom connection persists every public field but not the API key',async()=>{
 const {sidebar,settings}=setup();const keys=new Map();sidebar.context.secrets={store:async(k,v)=>keys.set(k,v),get:async k=>keys.get(k)};
 await sidebar.saveConnectionSettings({llmProvider:'custom',llmBaseUrl:'https://custom.example/v1',llmModel:'custom-model',llmTimeoutMs:45000,llmApiKey:'private-test-key',llmEnabled:true,llmUpdateMode:'manual'});
 assert.equal(settings['llm.provider'],'custom');assert.equal(settings['llm.baseUrl'],'https://custom.example/v1');assert.equal(settings['llm.model'],'custom-model');assert.equal(settings['llm.timeoutMs'],45000);assert.equal(settings['llm.updateMode'],'manual');assert.equal(settings['llm.apiKey'],'test-key');assert.equal(sidebar._summaryConfig().apiKey,'private-test-key');assert.equal(sidebar._savingSettings,false);
});
test('renderer preference is restored and updated rather than resetting to Mermaid',async()=>{
 const Sidebar=setup().sidebar.constructor;const saved=new Map([['diagramMode','plantuml']]);const context={globalState:{get:(k,d)=>saved.get(k)??d,update:async(k,v)=>saved.set(k,v)}};
 const first=new Sidebar(context);assert.equal(first.currentDiagramMode,'plantuml');await first.setDiagramMode('mermaid');assert.equal(new Sidebar(context).currentDiagramMode,'mermaid');await first.setDiagramMode('invalid');assert.equal(saved.get('diagramMode'),'mermaid');
});
test('Python notebook cells generate a diagram instead of silently leaving the spinner',async()=>{
 const {sidebar,document,messages}=setup({'llm.enabled':false});document.uri.scheme='vscode-notebook-cell';
 await sidebar.generate('add','flowchart');assert.ok(messages.some(m=>m.type==='diagram'),'notebook cell must reach rendering');
});
test('summary completes even while diagram rendering is still pending',async()=>{
 const {sidebar,messages}=setup();const Visualizer=require('../src/visualizer');const render=Visualizer.prototype.render;const summarize=summaries.summarize;let finish;
 Visualizer.prototype.render=()=>new Promise(r=>{finish=r;});summaries.summarize=async()=>({summary:'independent result',inputs:[],output:'int'});
 try {const pending=sidebar.generate('add','flowchart');await new Promise(r=>setTimeout(r,20));assert.ok(messages.some(m=>m.type==='summary'));finish({svg:'',mermaidCode:'flowchart TD; A-->B'});await pending;}finally{Visualizer.prototype.render=render;summaries.summarize=summarize;}
});
test('sidebar key is saved in SecretStorage and restored without entering settings or messages',async()=>{
 const secrets=new Map();const {sidebar,settings,messages}=setup();sidebar.context.secrets={store:async(k,v)=>secrets.set(k,v),get:async k=>secrets.get(k)};
 await sidebar.saveApiKey('  private-test-key  ');
 assert.equal(secrets.get(require('../src/llmConfig').secretName('https://api.deepseek.com/v1')),'private-test-key');assert.equal(sidebar._summaryConfig().apiKey,'private-test-key');assert.equal(settings['llm.apiKey'],'test-key');assert.ok(!JSON.stringify(messages).includes('private-test-key'));
 const fresh=setup().sidebar;fresh.context.secrets=sidebar.context.secrets;await fresh.loadApiKey();assert.equal(fresh._summaryConfig().apiKey,'private-test-key');
 await fresh.saveApiKey('');assert.equal(fresh._summaryConfig().apiKey,'private-test-key');
});
test('failed secret storage never pretends that the key was saved',async()=>{
 const {sidebar}=setup();sidebar.context.secrets={store:async()=>{throw new Error('storage unavailable');}};
 await assert.rejects(sidebar.saveApiKey('new-test-key'),/storage unavailable/);assert.equal(sidebar._summaryConfig().apiKey,'test-key');
});
test('missing Java executable is handled without crashing the extension host',async()=>{
 const {ServerManager}=setup({javaPath:'/nonexistent/live-uml-java'});const server=new ServerManager();
 const pending=server.start();await new Promise(r=>setTimeout(r,50));
 assert.ok(!server.process || server.process.listenerCount('error')>0,'spawn errors need a handler');
 assert.equal(await pending,null);
});
test('slow class scan cannot overwrite a more recent function diagram',async()=>{
 const {sidebar,messages}=setup({'llm.enabled':false});let finish;
 sidebar.findWorkspaceClasses=()=>new Promise(r=>{finish=r;});sidebar._resolveDisplayClassMethods=async()=>{};
 const old=sidebar.generate('Counter','class');await new Promise(r=>setImmediate(r));
 await sidebar.generate('add','flowchart');finish([]);await old;
 assert.equal(messages.filter(m=>m.type==='diagram').at(-1).name,'add');
});
test('source edits inside strings and comments invalidate generation',()=>{
 const {sidebar}=setup();assert.notEqual(sidebar._computeFunctionHash('return "https://a"'),sidebar._computeFunctionHash('return "https://b"'));assert.notEqual(sidebar._computeFunctionHash('# old docs\nreturn 1'),sidebar._computeFunctionHash('# new docs\nreturn 1'));
});
const req={name:'add',body:'def add(a,b):\n    return a+b',language:'python',startLine:0};
test('hung hover provider cannot block the summary',async()=>{
 const {sidebar,document,messages}=setup({},()=>new Promise(()=>{}));const original=summaries.summarize;
 summaries.summarize=async()=>({summary:'sum',inputs:[],output:'int'});
 try {await Promise.race([sidebar._runSummary(req,document,1),new Promise((_,reject)=>setTimeout(()=>reject(new Error('hover provider left analysis stuck')),2200))]);assert.equal(messages.at(-1).type,'summary');}finally{summaries.summarize=original;}
});
test('API errors produce a terminal summary error rather than a stuck spinner',async()=>{
 const {sidebar,document,messages}=setup();const original=summaries.summarize;summaries.summarize=async()=>{throw new Error('HTTP 401');};
 try {await sidebar._runSummary(req,document,1);assert.equal(messages.at(-1).status,'error');assert.match(messages.at(-1).message,/401/);}finally{summaries.summarize=original;}
});
test('provider errors never echo a non-sk API key into the webview',async()=>{
 const {sidebar,document,messages}=setup({'llm.apiKey':'plain-format-private-key'});const original=summaries.summarize;summaries.summarize=async()=>{throw new Error('HTTP 401 echoed plain-format-private-key');};
 try{await sidebar._runSummary(req,document,1);assert.equal(messages.at(-1).status,'error');assert.ok(!messages.at(-1).message.includes('plain-format-private-key'));}finally{summaries.summarize=original;}
});
test('late results cannot overwrite a newer summary request',async()=>{
 const {sidebar,document,messages}=setup();let finish;const original=summaries.summarize;summaries.summarize=()=>new Promise(r=>{finish=r;});
 try {const pending=sidebar._runSummary(req,document,1);await new Promise(r=>setImmediate(r));sidebar._currentRequestId=2;finish({summary:'outdated'});await pending;assert.equal(messages.filter(m=>m.type==='summary').length,0);}finally{summaries.summarize=original;}
});
async function withEndpoint(handler, action) {
 const server=http.createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const config={enabled:true,apiKey:'test',model:'test',baseUrl:`http://127.0.0.1:${server.address().port}`,timeoutMs:100};
 summaries.clearCache();
 try {await action(config);}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
}
test('local compatible summaries work without an API key or Authorization header',async()=>{
 let authorization;await withEndpoint((q,s)=>{authorization=q.headers.authorization;s.end(JSON.stringify({choices:[{message:{content:'{"summary":"local result","inputs":[],"output":"int"}'}}]}));},async config=>{
 const result=await summaries.summarize({...req,config:{...config,apiKey:''}});assert.equal(result?.summary,'local result');assert.equal(authorization,undefined);
 });
});
test('regenerate bypasses the content cache',async()=>{
 let calls=0;
 await withEndpoint((q,s)=>{calls++;s.end(JSON.stringify({choices:[{message:{content:JSON.stringify({summary:`result ${calls}`,inputs:[],output:'int'})}}]}));},async config=>{
  const first=await summaries.summarize({...req,config});const cached=await summaries.summarize({...req,config});const fresh=await summaries.summarize({...req,config,force:true});
  assert.equal(cached.summary,first.summary);assert.equal(calls,2);assert.notEqual(fresh.summary,first.summary);
 });
});
test('timeout is a total deadline even when the server keeps sending whitespace',async()=>{
 await withEndpoint((q,s)=>{s.writeHead(200);const timer=setInterval(()=>s.write(' '),15);s.on('close',()=>clearInterval(timer));setTimeout(()=>s.end('{}'),450);},async config=>{
  const start=Date.now();await assert.rejects(summaries.summarize({...req,config}),/timeout/i);assert.ok(Date.now()-start<350,'deadline must not reset on each chunk');
 });
});
test('an aborted request terminates promptly',async()=>{
 await withEndpoint(()=>{},async config=>{
 const controller=new AbortController();const pending=summaries.summarize({...req,config:{...config,timeoutMs:1000},signal:controller.signal});setTimeout(()=>controller.abort(),25);
 const start=Date.now();await assert.rejects(pending,/abort/i);assert.ok(Date.now()-start<300);
 });
});
test('manual mode does not automatically call the summarizer',async()=>{
 const {sidebar,document,messages}=setup({'llm.updateMode':'manual'});let calls=0;const original=summaries.summarize;summaries.summarize=async()=>{calls++;return {summary:'sum'};};
 try {await sidebar._runSummary(req,document,1);assert.equal(calls,0);assert.equal(messages.at(-1).status,'idle');}finally{summaries.summarize=original;}
});
