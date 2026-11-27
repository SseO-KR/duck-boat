// All positions use a shared 800-unit stage so landing arcs and the boat agree on phones.
window.PondScene = (() => {
  const canvas = document.querySelector("#scene");
  const ctx = canvas.getContext("2d");
  const backdrop = new Image();
  backdrop.src = "pond.jpg";
  const PI = Math.PI;
  const clamp = n => Math.min(1, Math.max(0, n));
  const part = (v,a,b) => clamp((v-a)/(b-a));
  const ease = n => n*n*(3-2*n);
  const mix = (a,b,n) => a+(b-a)*n;
  function ellipse(x,y,rx,ry,color,angle=0) {
    ctx.fillStyle=color; ctx.beginPath(); ctx.ellipse(x,y,rx,ry,angle,0,2*PI); ctx.fill();
  }
  function path(commands, fill, stroke, width=1) {
    ctx.beginPath();
    for(const [fn,...args] of commands) ctx[fn](...args);
    if(fill){ctx.fillStyle=fill;ctx.fill()}
    if(stroke){ctx.lineWidth=width;ctx.strokeStyle=stroke;ctx.lineCap="round";ctx.lineJoin="round";ctx.stroke()}
  }
  const M=(x,y)=>["moveTo",x,y], L=(x,y)=>["lineTo",x,y];
  const C=(a,b,c,d,x,y)=>["bezierCurveTo",a,b,c,d,x,y], Z=["closePath"];
  function line(x,y,x2,y2,shade,width){path([M(x,y),L(x2,y2)],null,shade,width)}
  function local(x,y,scale,angle,fn){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(scale,scale);fn();ctx.restore()}
  function duck(x,y,size,angle=0,heavy=false) {
    local(x,y,size,angle,()=>{
      const plumage=heavy?"#e6a333":"#ffd259";
      path([M(-18,-6),C(-23,-17,-23,-17,-21,-7),C(-23,7,-9,13,4,10),C(18,9,19,-1,12,-5),Z],plumage,"#aa7833",1.3);
      ellipse(8,-10,10.9,10.8,plumage);
      path([M(0,-18),C(0,-25,5,-22,6,-20),C(8,-25,12,-23,11,-20)],plumage);
      ellipse(17,-8,6.8,2.8,"#e98037",.12);
      ellipse(13,-12.5,1.8,2.0,"#213c34");
      ellipse(13.5,-13.1,.55,.55,"#fff");
      ellipse(11,-6,3,1.5,"#f3a056");
      path([M(-14,-3),C(-9,-6,-5,-4,1,-1),C(-1,7,-11,9,-15,3)],heavy?"#c88a2c":"#edb83b");
      path([M(-13,-3),C(-9,-4,-5,-3,-2,-1)],null,"#ffe697",1.3);
    });
  }
  function pier(y) {
    for(const x of [11,66,124]){
      path([M(x,y-3),L(x+12,y-2),L(x+11,y+33),L(x+1,y+35),Z],"#6d583b");
      line(x+3,y+4,x+3,y+27,"#987446",2);
    }
    path([M(0,y-22),L(111,y-22),L(146,y-4),L(0,y-1),Z],"#d8aa67","#8f6c42",1.8);
    path([M(0,y-1),L(146,y-4),L(145,y+3),L(0,y+7),Z],"#9e7544");
    for(let x=8;x<105;x+=23)line(x,y-21,x+29,y-5,"#ac824e",1.2);
    for(const x of [8,118]){ellipse(x,y-1,6,3,"#7c603b");ctx.fillStyle="#a88253";ctx.fillRect(x-5,y-24,10,24);ellipse(x,y-24,5,2.5,"#ebc28a")}
  }
  function hullBack(){
    path([M(-150,-24),C(-147,-47,114,-48,151,-23),C(133,-7,-128,6,-150,-24),Z],"#715b3e","#423e32",2.5);
    path([M(-132,-25),C(-69,-38,81,-39,131,-25)],null,"#be9963",4);
  }
  function hullFront(){
    path([M(-151,-25),C(-84,-2,82,-1,151,-26),C(144,6,103,36,58,42),C(-56,58,-129,32,-151,-25),Z],"#18594e","#15483f",2.3);
    path([M(-142,-12),C(-66,12,79,13,142,-14),L(139,-7),C(68,21,-67,19,-139,-5),Z],"#d5bc76");
    path([M(-128,8),C(-56,28,70,30,120,11)],null,"#408573",2.3);
    path([M(-104,25),C(-37,40,55,40,92,27)],null,"#377564",2);
    path([M(-150,-25),C(-79,0,82,0,151,-26)],null,"#785435",10);
    path([M(-150,-26),C(-79,-1,82,-1,151,-27)],null,"#f2cd8b",6.4);
    local(-71,5,1,.14,()=>{ctx.lineWidth=5.5;ctx.strokeStyle="#f2e2ba";ctx.beginPath();ctx.arc(0,0,9,0,2*PI);ctx.stroke();ctx.strokeStyle="#dc7049";for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(0,0,9,i*PI/2,i*PI/2+.69);ctx.stroke()}});

  }
  function ring(x,y,rx,alpha){
    ctx.strokeStyle="rgba(219,248,211,"+alpha+")";ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y,rx,rx*.115,0,.02,PI*.93);ctx.stroke();
  }
  function sequence(progress,keys) {
    for(let i=1;i<keys.length;i++)if(progress<=keys[i][0])return mix(keys[i-1][1],keys[i][1],ease(part(progress,keys[i-1][0],keys[i][0])));
    return keys.at(-1)[1];
  }
  function verdict(s, width, height) {
    if (!["safe", "sinking", "lost"].includes(s.mode)) return;
    const failed = s.mode !== "safe";
    const t = s.mode === "lost" ? 4.9 : s.endingTime;
    const flip = failed ? part(t, 1.21, 1.46) : 0;
    const red = flip >= .5;
    const size = s.quiet ? 1 : sequence(t,
      [[0,.02],[.26,1.18],[.43,1],[1.22,1],[1.42,1.14],[1.6,1],[3.4,1],[4.18,.76]]);
    const cream = "#fff1c8";
    const x = width / 2, y = height * .292;
    local(x, y, size * Math.min(1, height / 310), red ? .09 : -.08, () => {
      if (!s.quiet) ctx.scale(Math.max(.06, Math.abs(Math.cos(PI*flip))), 1);
      ellipse(0, 3, 42, 42, red ? "#8e3e36" : "#2f6155");
      ellipse(0, 0, 41, 41, red ? "#da5446" : "#4b9a70");
      ctx.beginPath(); ctx.arc(0,0,41,0,2*PI); ctx.strokeStyle = cream; ctx.lineWidth = 3; ctx.stroke();
      if (red) {
        line(-14,-14,14,14,cream,7); line(14,-14,-14,14,cream,7);
      } else {
        path([M(-19,0),L(-6,13),L(21,-15)],null,cream,8);
      }
    });
    if (s.quiet) return;
    const burst = red ? part(t,1.33,1.68) : part(t,0,.65);
    if (burst > 0 && burst < 1) {
      ctx.save(); ctx.globalAlpha = Math.sin(PI*burst);
      const n = red ? 12 : 9;
      for (let i=0;i<n;i++) {
        const a = i*2*PI/n, r = 43 + 8*burst;
        line(x+Math.cos(a)*r,y+Math.sin(a)*r,x+Math.cos(a)*(r+11),y+Math.sin(a)*(r+11),
          red ? "#ffb454" : cream,2.4);
      }
      ctx.restore();
    }
  }
  function draw(s,wall) {
    const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
    const dpr=Math.min(2,window.devicePixelRatio||1);
    if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)}
    const W=Math.max(492,Math.min(800,190+470*w/h));
    const H=h*W/w, scale=canvas.width/W;
    ctx.setTransform(scale,0,0,canvas.height/H,0,0);
    const afloat=H*(w<h?.65:.72), t=s.clock, r=s.ratio, end=s.sink;
    const camera=H*.41*ease(part(end,.17,.78));
    const zoom=1+(s.quiet?.018:.06)*s.focus;
    ctx.save();ctx.translate(W/2,H*.67);ctx.scale(zoom,zoom);ctx.translate(-W/2,-H*.67-camera);
    if(backdrop.complete && backdrop.naturalWidth){
      const k=Math.max(W/backdrop.width,H/backdrop.height);
      ctx.drawImage(backdrop,(W-backdrop.width*k)/2,(H-backdrop.height*k)/2,backdrop.width*k,backdrop.height*k);
    }else {ctx.fillStyle="#b8e1cb";ctx.fillRect(0,0,W,H);ctx.fillStyle="#53ae9a";ctx.fillRect(0,H*.55,W,H)}
    // Fade the painted lake into the deep-water plate as the camera follows the hull.
    const deepPlate=ctx.createLinearGradient(0,afloat-1,0,H+1);
    deepPlate.addColorStop(0,"rgba(50,143,128,0)");deepPlate.addColorStop(1,"#398f83");
    ctx.fillStyle=deepPlate;ctx.fillRect(0,afloat,W,H*2);
    for(let i=0;i<11;i++){
      const x=(i*179+12+8*Math.sin(t*.6+i))%W, y=H*(.63+((i*13)%30)/100);
      line(x,y,x+10+i%4*8,y,"rgba(233,246,203,.38)",1.6);
    }
    const pierScale=W/800;
    local(0,afloat-9,pierScale,0,()=>pier(0));
    const waiting=Math.min(3,Math.max(1,Math.floor(125*pierScale/(s.duck.size*44))));
    for(let i=0;i<waiting;i++){
      duck((112-i*43*s.duck.size/pierScale)*pierScale,afloat-11-21*pierScale-8*s.duck.size+Math.sin(t+i),
        s.duck.size,Math.sin(t+i)*.04,s.duck.heavy);
    }
    const impact=s.ducks.reduce((sum,d)=>{const v=t-d.born-.44;return v>0&&v<1?sum+Math.sin(v*14)*Math.exp(-v*4)*d.mass:sum},0);
    const tilt=s.angle+Math.sin(t*1.24)*.012+(end<.02?impact*.009:0);
    const bs=s.boat.scale;
    const bx=W*.557,by=afloat-29*bs+Math.min(r,1.5)*12+Math.sin(t*1.7)*2+H*(.49*ease(part(end,.12,.92))+.37*ease(part(end,.63,1)));
    ellipse(bx,afloat+13,164*bs,10,"rgba(17,94,83,.23)");
    ring(bx,afloat+12,164*bs+5*Math.sin(t),.66);
    const flying=[];
    // A packed flock settles closer together, keeping the upper rows in view.
    const stackHeight = s.ducks.length / s.columns * 23 * s.duck.size;
    const stackSpacing = Math.min(1, Math.min(132 * bs, H * .27) / Math.max(1, stackHeight));
    local(bx,by,bs,tilt,()=>{
      hullBack();
      for(const d of s.ducks){
        const p=clamp((t-d.born)/.44);
        const x=d.x+s.shift*12, y=-22+(d.y+22)*stackSpacing;
        if(p<1){flying.push([d,p,x,y]);continue}
        const fall=Math.max(0,Math.sin((t-d.born-.44)*18))*Math.max(0,1-(t-d.born-.44)*4);
        duck(x,y-3*fall,d.size/bs,Math.sin(d.seed+t*2)*.045-tilt*.47,d.heavy);
      }
      hullFront();
    });
    for(const [d,p,x,y] of flying){
      const tx=bx+bs*(x*Math.cos(tilt)-y*Math.sin(tilt)),ty=by+bs*(x*Math.sin(tilt)+y*Math.cos(tilt));
      duck(mix(112*pierScale,tx,p),mix(afloat-11-21*pierScale-8*d.size,ty,p)-80*Math.sin(PI*p),d.size,Math.sin(PI*p)*-.18,d.heavy);
    }
    const water=ctx.createLinearGradient(0,afloat,0,afloat+H*.65);
    water.addColorStop(0,"rgba(51,145,131,"+(.15+.58*ease(part(end,.02,.55)))+")");
    water.addColorStop(.21,"rgba(28,116,113,"+(.19+.57*end)+")");
    water.addColorStop(1,"rgba(9,59,68,"+(.31+.65*end)+")");
    ctx.fillStyle=water;ctx.beginPath();ctx.moveTo(-10,afloat);
    for(let x=-10;x<=W+12;x+=5)ctx.lineTo(x,afloat+2*Math.sin(x*.035+t*2.1));
    ctx.lineTo(W+12,H*2);ctx.lineTo(-12,H*2);ctx.fill();
    ring(bx+124,afloat-2,25+4*Math.sin(t*1.9),.55);
    if(end>0){
      ctx.save();
      ctx.beginPath();ctx.rect(0,afloat+2,W,H*1.5);ctx.clip();
      for(let i=0;i<6;i++){
        const x=i*170+12*Math.sin(t*.8+i);
        const shaft=ctx.createLinearGradient(x,afloat,x+30,afloat+H*.61);
        shaft.addColorStop(0,"rgba(221,249,199,"+(.12*end)+")");
        shaft.addColorStop(1,"rgba(136,221,194,0)");
        path([M(x,afloat),L(x+18,afloat),L(x+121,afloat+H*.67),L(x+68,afloat+H*.67),Z],shaft);
      }
      ctx.restore();
      for(let i=0;i<16;i++){
        const q=part(end,i*.007,.48+i*.006);
        if(q<=0||q>=1)continue;
        const side=i%2?1:-1;
        const x=bx+side*(76+i%5*8+q*(28+i*4));
        const y=afloat-(25+i%6*13)*Math.sin(q*PI);
        ellipse(x,y,2.5+(1-q)*3.3,4.8*(1-q)+1,"rgba(225,251,216,.82)",side*q*.8);
      }
      for(let i=0;i<23;i++){
        const q=(end*1.7+wall*.00018+i*.143)%1;
        const x=bx+(i%7-3)*25+9*Math.sin(q*6+i);
        const y=afloat+12+(1-q)*(32+end*H*.46);
        const rad=2.1+(i%4)*1.35;
        ctx.beginPath();ctx.arc(x,y,rad,0,PI*2);ctx.strokeStyle="rgba(216,249,223,"+Math.min(.75,end*1.3)+")";ctx.lineWidth=1.4;ctx.stroke();
      }
      if(end>.49){
        const up=ease(part(end,.49,.8));const y=afloat+29-35*up+2*Math.sin(wall*.002);
        duck(bx+100*bs,y,s.duck.size,.04,s.duck.heavy);

      }
    }
    ctx.restore();
    verdict(s,W,H);
  }
  return {draw,sequence};
})();
