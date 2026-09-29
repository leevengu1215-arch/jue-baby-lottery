import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from './worker.js';
const sqlite=new DatabaseSync(':memory:');
sqlite.exec(readFileSync('drizzle/0000_chief_penance.sql','utf8'));
const DB={prepare(sql){let args=[];return {bind(...values){args=values;return this},async run(){const result=sqlite.prepare(sql).run(...args);return {meta:{changes:Number(result.changes)}}},async all(){return {results:sqlite.prepare(sql).all(...args)}}}},async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.all());sqlite.exec('COMMIT');return results}catch(e){sqlite.exec('ROLLBACK');throw e}}};
const A='a'.repeat(64),B='b'.repeat(64);
async function request(path,method='GET',token=A,body){return worker.fetch(new Request('https://api.example.test'+path,{method,headers:{Origin:'https://leevengu1215-arch.github.io',...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),{DB})}

 assert.equal((await request('/api/join','POST','',{pool:'boy'})).status,401);
 assert.equal((await request('/api/join','POST',A,{pool:'boy'})).status,409);
 assert.equal((await request('/api/profile','POST',A,{name:' ',face:'🐱'})).status,400);
 await request('/api/profile','POST',A,{name:'A',face:'🐱'});
 assert.equal((await (await request('/api/pools')).json()).pools.boy.count,0);
 for(let i=0;i<3;i++)assert.equal((await request('/api/join','POST',A,{pool:'boy'})).status,200);
 await request('/api/profile','POST',B,{name:'B',face:'🐼'});await request('/api/join','POST',B,{pool:'girl'});
 let snap=await (await request('/api/pools')).json();assert.equal(snap.pools.boy.count,1);assert.equal(snap.pools.girl.count,1);assert.equal(snap.me.name,'A');assert(!JSON.stringify(snap).includes('token'));
 await request('/api/profile','POST',A,{name:'A改名',face:'🦊'});await request('/api/join','POST',A,{pool:'girl'});
 snap=await (await request('/api/pools','GET',B)).json();assert.equal(snap.pools.boy.count,0);assert.equal(snap.pools.girl.count,2);assert.equal(snap.me.name,'B');
 assert.equal((await request('/api/join','POST',A,{pool:'bad'})).status,400);
 const cors=await worker.fetch(new Request('https://api.example.test/api/pools',{headers:{Origin:'https://evil.example'}}),{DB});assert.equal(cors.status,403);
 await request('/api/profile','DELETE',A);await request('/api/profile','DELETE',B);snap=await (await request('/api/pools','GET','')).json();assert.equal(snap.pools.girl.count,0);
 console.log('PASS SQLite API: empty counts, authenticated writes, repeat join, profile edit, two identities, switching, CORS, token isolation, cleanup.');

