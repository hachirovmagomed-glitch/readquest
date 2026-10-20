// ReadQuest: перекраска одежды. Тот же алгоритм, что в sheet.py.
// Профиль хранит {item:'hoodie', color:'red'}.
const hex = h => [1,3,5].map(i => parseInt(h.slice(i,i+2),16)/255);
const load = src => new Promise((ok,err)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=err;i.src=src;});

// gray: ImageData серого слоя (R=оттенок, A=маска), det: ImageData маски деталей (R), c: цвет из palette.json
export function recolorPixels(gray, det, c, mid){
  const C=hex(c.hex), k=c.contrast, D=C.map(v=>v*c.detail), lift=c.lift||0;
  const g=gray.data, d=det.data, out=new ImageData(gray.width,gray.height), o=out.data;
  for(let i=0;i<g.length;i+=4){
    const a=g[i+3]; if(!a) continue;
    const s=g[i]/255/mid-1, m=d[i]/255;
    for(let ch=0;ch<3;ch++){
      const base = s<0 ? C[ch]*(1+s*k) : C[ch]+(1-C[ch])*s*k*0.8;
      const dd   = s<0 ? D[ch]*(1+s*k) : D[ch]+(1-D[ch])*s*k*0.5;
      let v = base*(1-m)+dd*m; v = lift+v*(1-lift);
      o[i+ch]=Math.max(0,Math.min(255,v*255+.5));
    }
    o[i+3]=a; // альфа слоя без изменений
  }
  return out;
}

// Рисует героя: база, затем перекрашенный слой. scale — масштаб от холста 4096×6144.
export async function drawHero(ctx, {base, item, palette, colorId, scale=1}){
  const c = palette.colors.find(x=>x.id===colorId) || palette.colors[0];
  const [b,g,d,meta] = await Promise.all([load(base), load(item.gray), load(item.details), fetch(item.trim).then(r=>r.json())]);
  ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
  ctx.drawImage(b,0,0,b.width*scale,b.height*scale);
  const w=Math.round(meta.w*scale), h=Math.round(meta.h*scale);
  const tmp=new OffscreenCanvas(w,h), t=tmp.getContext('2d',{willReadFrequently:true});
  t.drawImage(g,0,0,w,h); const gi=t.getImageData(0,0,w,h);
  t.clearRect(0,0,w,h); t.drawImage(d,0,0,w,h); const di=t.getImageData(0,0,w,h);
  t.putImageData(recolorPixels(gi,di,c,palette.mid),0,0);
  ctx.drawImage(tmp, Math.round(meta.x*scale), Math.round(meta.y*scale));
}
