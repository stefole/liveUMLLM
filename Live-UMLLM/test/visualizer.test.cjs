const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');const{createRequire}=require('node:module');const{EventEmitter}=require('node:events');
test('hung Java process times out instead of leaving Analyzing forever',async()=>{
 const filename=path.resolve(__dirname,'../src/visualizer.js');const native=createRequire(filename);const child=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.stdin={on(){},write(){},end(){}};child.kill=()=>{child.killed=true;setImmediate(()=>child.emit('close',-1));};
 const mod={exports:{}};vm.runInNewContext(fs.readFileSync(filename,'utf8'),{module:mod,exports:mod.exports,__dirname:path.dirname(filename),require:n=>n==='child_process'?{spawn:()=>child}:native(n),setTimeout:fn=>setTimeout(fn,20),clearTimeout,console});
 const visualizer=new mod.exports('plantuml');visualizer.setRequestId(1);
 const result=visualizer.render('@startuml\nstart\nstop\n@enduml',{extensionPath:path.resolve(__dirname,'..')},null,1);
 await assert.rejects(Promise.race([result,new Promise((_,reject)=>setTimeout(()=>reject(new Error('test deadline: renderer did not stop')),100))]),/PlantUML rendering timed out/);assert.equal(child.killed,true);
});
