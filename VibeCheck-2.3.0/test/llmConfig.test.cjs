const{test}=require('node:test');const assert=require('node:assert/strict');const http=require('node:http');
const config=()=>require('../src/llmConfig');
test('provider presets include hosted, local, and custom OpenAI-compatible connections',()=>{
 const {PROVIDERS}=config();assert.deepEqual(Object.keys(PROVIDERS),['deepseek','openai','openrouter','ollama','lmstudio','custom']);assert.equal(PROVIDERS.ollama.baseUrl,'http://127.0.0.1:11434/v1');assert.equal(PROVIDERS.custom.model,'');
});
test('credentials are scoped to the exact endpoint, not a single global slot',()=>{
 const{secretName}=config();assert.notEqual(secretName('https://api.deepseek.com/v1'),secretName('https://api.openai.com/v1'));assert.notEqual(secretName('http://localhost:1234/a'),secretName('http://localhost:1234/b'));assert.equal(secretName('https://API.DEEPSEEK.COM/v1/'),secretName('https://api.deepseek.com/v1'));
});
test('connection settings reject invalid URLs, embedded credentials and missing model IDs',()=>{
 const{validateConnection}=config();const valid={llmProvider:'custom',llmBaseUrl:'https://example.com/v1',llmModel:'my-model',llmTimeoutMs:30000};assert.equal(validateConnection(valid).model,'my-model');
 for(const url of ['file:///etc/passwd','https://user:password@example.com/v1','https://example.com/v1?api_key=secret','not a url'])assert.throws(()=>validateConnection({...valid,llmBaseUrl:url}));assert.throws(()=>validateConnection({...valid,llmModel:''}),/model/i);assert.throws(()=>validateConnection({...valid,llmTimeoutMs:0}),/timeout/i);
});
test('local endpoint without a key can list available models without an Authorization header',async()=>{
 const{testConnection}=config();let authorization;const server=http.createServer((q,s)=>{authorization=q.headers.authorization;assert.equal(q.url,'/v1/models');s.end(JSON.stringify({data:[{id:'local-model'},{id:'local-model'},{id:'another-model'}]}));});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const result=await testConnection({baseUrl:`http://127.0.0.1:${server.address().port}/v1`,apiKey:'',timeoutMs:1000});assert.deepEqual(result.models,['another-model','local-model']);assert.equal(authorization,undefined);}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
test('connection test reports an HTTP authentication error without echoing response credentials',async()=>{
 const{testConnection}=config();const server=http.createServer((q,s)=>{s.writeHead(401);s.end('do not leak private-test-key');});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{await assert.rejects(testConnection({baseUrl:`http://127.0.0.1:${server.address().port}`,apiKey:'private-test-key',timeoutMs:1000}),error=>error.message.includes('401')&&!error.message.includes('private-test-key'));}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
