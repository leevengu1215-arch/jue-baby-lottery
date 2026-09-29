const ORIGIN = 'https://leevengu1215-arch.github.io';
const HOME = ORIGIN + '/jue-baby-lottery/';
const FACES = ['🐱','🐼','🐰','🦊','🐶','🐨'];
const bad = (message, status=400) => { throw Object.assign(new Error(message), {status}); };
async function tokenHash(request, required=false) {
  const value=request.headers.get('Authorization');
  if (!value && !required) return '';
  if (!/^Bearer [a-f0-9]{64}$/.test(value || '')) bad('身份凭据无效，请重新打开网页',401);
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value.slice(7)));
  return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function body(request) {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) bad('需要 JSON 请求');
  const reader=request.body?.getReader();
  if(!reader) bad('请求为空');
  let text='',length=0;const decoder=new TextDecoder();
  while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>4096){await reader.cancel();bad('请求过大',413)}text+=decoder.decode(value,{stream:true})}
  try{return JSON.parse(text+decoder.decode())}catch{bad('请求格式错误')}
}
function database(env){if(!env.DB)throw new Error('Missing DB');return env.DB}
async function snapshot(db,hash){
  const results=await db.batch([
    db.prepare("SELECT pool, COUNT(*) AS count FROM members WHERE pool IS NOT NULL GROUP BY pool"),
    db.prepare("SELECT public_id AS id,nickname AS name,face,pool FROM members WHERE pool='boy' ORDER BY updated_at DESC LIMIT 12"),
    db.prepare("SELECT public_id AS id,nickname AS name,face,pool FROM members WHERE pool='girl' ORDER BY updated_at DESC LIMIT 12"),
    db.prepare("SELECT public_id AS id,nickname AS name,face,pool FROM members WHERE token_hash=?").bind(hash)
  ]);
  const me=results[3].results[0] || null;
  const pools={boy:{count:0,members:results[1].results},girl:{count:0,members:results[2].results}};
  for(const row of results[0].results)if(pools[row.pool])pools[row.pool].count=row.count;
  if(me?.pool&&!pools[me.pool].members.some(x=>x.id===me.id)){
    if(pools[me.pool].members.length>=12)pools[me.pool].members.pop();
    pools[me.pool].members.push(me);
  }
  return {me,pools};
}
export default {
 async fetch(request,env){
  const url=new URL(request.url),origin=request.headers.get('Origin');
  const allowed=origin===ORIGIN || origin===url.origin;
  const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'};
  if(allowed){headers['Access-Control-Allow-Origin']=origin;headers['Access-Control-Allow-Methods']='GET,POST,DELETE,OPTIONS';headers['Access-Control-Allow-Headers']='Authorization,Content-Type';headers['Access-Control-Max-Age']='600'}
  const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
  if(request.method==='OPTIONS')return new Response(null,{status:allowed?204:403,headers});
  if(origin&&!allowed)return json({error:'来源不允许'},403);
  if(url.pathname==='/')return Response.redirect(HOME,302);
  try{
   const db=database(env);
   if(url.pathname==='/api/pools'&&request.method==='GET')return json(await snapshot(db,await tokenHash(request)));
   if(url.pathname==='/api/profile'&&request.method==='POST'){
    const hash=await tokenHash(request,true),data=await body(request);
    if(!data||typeof data.name!=='string'||!data.name.trim()||[...data.name.trim()].length>20||/[\u0000-\u001f\u007f]/.test(data.name)||!FACES.includes(data.face))bad('请选择头像并填写 1–20 字昵称');
    await db.prepare('INSERT INTO members(token_hash,public_id,nickname,face,pool,updated_at) VALUES(?,?,?,?,NULL,?) ON CONFLICT(token_hash) DO UPDATE SET nickname=excluded.nickname,face=excluded.face,updated_at=excluded.updated_at').bind(hash,crypto.randomUUID(),data.name.trim(),data.face,Date.now()).run();
    return json({ok:true});
   }
   if(url.pathname==='/api/join'&&request.method==='POST'){
    const hash=await tokenHash(request,true),data=await body(request);
    if(!data||!['boy','girl'].includes(data.pool))bad('池子无效');
    const result=await db.prepare('UPDATE members SET pool=?,updated_at=? WHERE token_hash=?').bind(data.pool,Date.now(),hash).run();
    if(!result.meta.changes)bad('请先保存头像和昵称',409);
    return json({ok:true});
   }
   // Owner-token-only removal also lets integration tests clean up their own records.
   if(url.pathname==='/api/profile'&&request.method==='DELETE'){
    await db.prepare('DELETE FROM members WHERE token_hash=?').bind(await tokenHash(request,true)).run();
    return json({ok:true});
   }
   return json({error:'接口不存在'},404);
  }catch(error){if(!error.status)console.error('Pool API failed',error.message);return json({error:error.status?error.message:'云服务暂时不可用，请稍后重试'},error.status||503)}
 }
};
