// Renders the short without the Lemo-Opuscar library: serves this folder with tools/corelib.js as /core/lib.js.
// node film.js <project-dir> stills <t1,t2,...> <outdir>   |   node film.js <project-dir> video <out.mp4> [fps]
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),{spawn}=require('child_process');
const [ROOT,mode,arg,arg2]=process.argv.slice(2),LIB=fs.readFileSync(path.join(__dirname,'corelib.js'));
const T={'.js':'text/javascript','.html':'text/html','.css':'text/css','.ttf':'font/ttf','.json':'application/json'};
(async()=>{const b=await chromium.launch();
const p=await b.newPage({viewport:{width:1080,height:1920}});
p.on('pageerror',e=>console.log('ERR',e.message));p.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text())});
await p.route('http://film.local/**',r=>{const u=new URL(r.request().url()).pathname;
 if(u==='/core/lib.js')return r.fulfill({contentType:'text/javascript',body:LIB});
 const f=path.join(ROOT,u==='/'?'index.html':u);if(!f.startsWith(ROOT)||!fs.existsSync(f))return r.fulfill({status:404});
 r.fulfill({contentType:T[path.extname(f)]||'application/octet-stream',body:fs.readFileSync(f)})});
await p.goto('http://film.local/');await p.waitForFunction(()=>window.READY,null,{timeout:60000});
const shot=async t=>{await p.evaluate(t=>window.render(t),t);return p.screenshot({type:'jpeg',quality:93});};
if(mode==='stills'){fs.mkdirSync(arg2,{recursive:true});for(const t of arg.split(','))fs.writeFileSync(path.join(arg2,`t_${t}.jpg`),await shot(+t));}
else{const fps=+(arg2||24),dur=await p.evaluate(()=>window.DUR),n=Math.round(dur*fps);
 const ff=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate',String(fps),'-i','-','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p',arg],{stdio:['pipe','inherit','inherit']});
 const t0=Date.now();for(let i=0;i<n;i++){const buf=await shot(i/fps);if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));if(i%120===0)console.log(`frame ${i}/${n} ${((Date.now()-t0)/1000).toFixed(0)}s`);}
 ff.stdin.end();await new Promise(r=>ff.on('close',r));}
// events for the mix
fs.writeFileSync(path.join(ROOT,'events.json'),JSON.stringify(await p.evaluate(()=>({dur:window.DUR,ev:window.EV,subs:window.SUBS})),null,1));
await b.close()})();
