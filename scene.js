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
  function drawingTools(context) {
    function ellipse(x,y,rx,ry,color,angle=0) {
      context.fillStyle=color; context.beginPath(); context.ellipse(x,y,rx,ry,angle,0,2*PI); context.fill();
    }
    function path(commands, fill, stroke, width=1) {
      context.beginPath();
      for(const [fn,...args] of commands) context[fn](...args);
      if(fill){context.fillStyle=fill;context.fill()}
      if(stroke){context.lineWidth=width;context.strokeStyle=stroke;context.lineCap="round";context.lineJoin="round";context.stroke()}
    }
    return {ellipse,path};
  }
  const {ellipse,path}=drawingTools(ctx);
  const M=(x,y)=>["moveTo",x,y], L=(x,y)=>["lineTo",x,y];
  const C=(a,b,c,d,x,y)=>["bezierCurveTo",a,b,c,d,x,y], Z=["closePath"];
  function line(x,y,x2,y2,shade,width){path([M(x,y),L(x2,y2)],null,shade,width)}
  function local(x,y,scale,angle,fn){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(scale,scale);fn();ctx.restore()}
  function makeDuckSprite(heavy) {
    const sprite=document.createElement("canvas");
    sprite.width=200; sprite.height=168;
    const pen=sprite.getContext("2d");
    pen.setTransform(4,0,0,4,100,108);
    const {ellipse,path}=drawingTools(pen);
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
    return sprite;
  }
  const lightDuck=makeDuckSprite(false), heavyDuck=makeDuckSprite(true);
  function duck(x,y,size,angle=0,heavy=false) {
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(angle);
    ctx.drawImage(heavy?heavyDuck:lightDuck,-25*size,-27*size,50*size,42*size);
    ctx.restore();
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
  function cameraView(s, W, H, afloat, bx, by, tilt, towerTop, sinkOffset, dt) {
    const fixed = {x: W/2, y: H/2 + sinkOffset, zoom: 1};
    const view = s.camera;
    if (!view || s.mode === "group") return fixed;

    const towerSide = 116*s.boat.scale + 36*s.duck.size;
    let x, y, zoom;
    if (s.mode === "hold" && !s.quiet) {
      const headX = bx - towerTop*Math.sin(tilt);
      const headY = by + towerTop*Math.cos(tilt) - towerSide*Math.abs(Math.sin(tilt));
      zoom = Math.min(1.22, W/(2*towerSide + 40));
      x = mix(W/2, headX, ease(part(by-headY, H*.18, H*.58)));
      y = Math.min(H/2, headY + H*.25/zoom);
    } else {
      // Leave room for the coming swing so the wide shot doesn't chase each wobble.
      const hullSide = 158*s.boat.scale;
      const angle = Math.max(Math.abs(tilt), .04 + .61*s.strain);
      const swing = -towerTop*Math.sin(angle);
      const side = Math.max(hullSide, towerSide);
      const left = bx - side - (s.direction < 0 ? swing : 0);
      const right = bx + side + (s.direction > 0 ? swing : 0);
      const top = by + towerTop - towerSide*Math.sin(angle);
      const bottom = Math.max(afloat + 28, by + 60*s.boat.scale + hullSide*Math.sin(angle));
      const pad = Math.min(W,H)*.06;
      zoom = Math.min(1, (W-2*pad)/(right-left), (H-2*pad)/(bottom-top));
      const halfWidth = (W/2-pad)/zoom, halfHeight = (H/2-pad)/zoom;
      x = Math.min(left+halfWidth, Math.max(fixed.x, right-halfWidth));
      y = Math.min(top+halfHeight, Math.max(fixed.y, bottom-halfHeight));

      const followSink = ease(part(s.sink, 0, .32));
      x = mix(x, fixed.x, followSink);
      y = mix(y, fixed.y, followSink);
      zoom = mix(zoom, fixed.zoom, followSink);
    }

    const step = s.quiet || view.width !== W || view.height !== H ? 1 : 1-Math.exp(-dt*8);
    view.x = mix(view.x ?? x, x, step);
    view.y = mix(view.y ?? y, y, step);
    view.zoom = mix(view.zoom ?? zoom, zoom, step);
    view.width = W;
    view.height = H;
    return view;
  }

  function paintBackdrop(W, H, offset) {
    if (!backdrop.complete || !backdrop.naturalWidth) {
      ctx.fillStyle = "#b8e1cb"; ctx.fillRect(0,0,W,H);
      ctx.fillStyle = "#53ae9a"; ctx.fillRect(0,H*.55+offset,W,H);
      return;
    }
    const scale = Math.max(W/backdrop.width, H/backdrop.height);
    const width = backdrop.width*scale, height = backdrop.height*scale;
    const x = (W-width)/2, y = (H-height)/2 + offset;
    ctx.drawImage(backdrop,x,y,width,height);
    if (y > 0) {
      // Blend into the painted sky when the camera rises above it.
      const fade = Math.min(H*.06,40);
      const sky = ctx.createLinearGradient(0, y, 0, y+fade);
      sky.addColorStop(0,"#96d2be");
      sky.addColorStop(1,"rgba(150,210,190,0)");
      ctx.fillStyle = sky;
      ctx.fillRect(0,0,W,y+fade);
    }
    if (y+height < H) {
      ctx.fillStyle = "#109e86";
      ctx.fillRect(0,y+height,W,H-y-height);
    }
  }

  function draw(s,wall,dt=0) {
    const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
    const dpr=Math.min(2,window.devicePixelRatio||1);
    if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)}
    const W=Math.max(492,Math.min(800,190+470*w/h));
    const H=h*W/w, scale=canvas.width/W;
    ctx.setTransform(scale,0,0,canvas.height/H,0,0);
    const afloat=H*(w<h?.65:.72), t=s.clock, r=s.ratio, end=s.sink;
    const intro=s.mode==="intro";
    const sinkOffset=H*(intro?.085:.41)*ease(part(end,.17,.78));
    const bs=s.boat.scale;
    const drop=intro
      ? .26*ease(part(end,.13,.84))+.24*ease(part(end,.66,1))
      : .49*ease(part(end,.12,.92))+.37*ease(part(end,.63,1));
    const bx=W*.557,by=afloat-29*bs+Math.min(r,1.5)*12+Math.sin(t*1.7)*2+H*drop;
    const landingTime = .44;
    let settled = s.ducks.length, impact = 0;
    for (let i=s.ducks.length-1; i>=0; i--) {
      const d = s.ducks[i], age = t-d.born-landingTime;
      if (age >= 1) break;
      if (age < 0) settled = i;
      else impact += Math.sin(age*14)*Math.exp(-age*4)*d.mass;
    }
    const landingRoll=end<.02 ? Math.tanh(impact)*(.006+.014*s.strain) : 0;
    const tilt=s.angle+Math.sin(t*1.24)*.004+landingRoll;
    const sin=Math.sin(tilt), cos=Math.cos(tilt);
    const topRow = (Math.ceil(s.ducks.length / s.columns) - 1)*s.columns;
    const towerTop = ((s.ducks[topRow]?.y ?? -22) - 4)*bs - 30*s.duck.size;
    const view = cameraView(s, W, H, afloat, bx, by, tilt, towerTop, sinkOffset, dt);
    const left = view.x-W/2/view.zoom, right = view.x+W/2/view.zoom;
    const top = view.y-H/2/view.zoom, bottom = view.y+H/2/view.zoom;
    const waterline = H/2 + (afloat-view.y)*view.zoom;
    const parallax = Math.min(H*.46, (waterline-afloat+sinkOffset)*.68);
    paintBackdrop(W, H, parallax-sinkOffset);
    ctx.save();ctx.translate(W/2,H/2);ctx.scale(view.zoom,view.zoom);ctx.translate(-view.x,-view.y);
    // Fade the painted lake into the deep-water plate as the camera follows the hull.
    const deepPlate=ctx.createLinearGradient(0,afloat-1,0,H+1);
    deepPlate.addColorStop(0,"rgba(50,143,128,0)");deepPlate.addColorStop(1,"#398f83");
    ctx.fillStyle=deepPlate;ctx.fillRect(left,afloat,right-left,Math.max(0,bottom-afloat));
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
    ellipse(bx,afloat+13,164*bs,10,"rgba(17,94,83,.23)");
    ring(bx,afloat+12,164*bs+5*Math.sin(t),.66);
    const seatOffset = row => s.shift*12 + (row%2-.5)*Math.min(8,50/s.columns);
    const rowSide = 135*bs + 36*s.duck.size;
    const rowDepth = 8*bs + 36*s.duck.size;
    const rowWidth = rowSide*Math.abs(cos) + rowDepth*Math.abs(sin);
    const rowHeight = rowSide*Math.abs(sin) + rowDepth*Math.abs(cos);
    local(bx,by,bs,tilt,()=>{
      hullBack();
      // Every row keeps its original height. Skip only rows entirely outside the camera.
      for (let row=Math.ceil(settled/s.columns)-1; row>=0; row--) {
        const start=row*s.columns, stop=Math.min(start+s.columns,settled);
        const rowY=s.ducks[start].y*bs;
        const x=bx-rowY*sin, y=by+rowY*cos;
        if (x+rowWidth<left || x-rowWidth>right || y+rowHeight<top || y-rowHeight>bottom) continue;
        const offset=seatOffset(row);
        for(let i=start;i<stop;i++){
          const d=s.ducks[i], age=t-d.born-landingTime;
          const fall=Math.max(0,Math.sin(age*18))*Math.max(0,1-age*4);
          duck(d.x+offset,d.y-3*fall,d.size/bs,Math.sin(d.seed+t*2)*.045-tilt*.47,d.heavy);
        }
      }
      hullFront();
    });
    for(let i=s.ducks.length-1;i>=settled;i--){
      const d=s.ducks[i],p=clamp((t-d.born)/landingTime);
      const row=Math.floor(i/s.columns);
      const x=d.x+seatOffset(row),y=d.y;
      const tx=bx+bs*(x*cos-y*sin),ty=by+bs*(x*sin+y*cos);
      duck(mix(112*pierScale,tx,p),mix(afloat-11-21*pierScale-8*d.size,ty,p)-80*Math.sin(PI*p),d.size,Math.sin(PI*p)*-.18,d.heavy);
    }
    const water=ctx.createLinearGradient(0,afloat,0,afloat+H*.65);
    water.addColorStop(0,"rgba(51,145,131,"+(.15+.58*ease(part(end,.02,.55)))+")");
    water.addColorStop(.21,"rgba(28,116,113,"+(.19+.57*end)+")");
    water.addColorStop(1,"rgba(9,59,68,"+(.31+.65*end)+")");
    const waveStep=5/Math.min(1,view.zoom), waveStart=Math.floor(left/waveStep)*waveStep;
    const waveEnd=right+waveStep, waterBottom=Math.max(bottom,afloat+3);
    ctx.fillStyle=water;ctx.beginPath();ctx.moveTo(waveStart,afloat);
    for(let x=waveStart;x<=waveEnd;x+=waveStep)ctx.lineTo(x,afloat+2*Math.sin(x*.035+t*2.1));
    ctx.lineTo(waveEnd,waterBottom);ctx.lineTo(waveStart,waterBottom);ctx.fill();
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
      if(intro){
        const alpha=ease(part(end,.03,.21))*(1-.78*ease(part(end,.45,.84)));
        for(let i=0;i<3;i++)ring(bx+12*i,afloat+5*i,112+22*i+88*end,(.71-.12*i)*alpha);
      }
    }
    ctx.restore();
    verdict(s,W,H);
  }
  const introDuck={size:1, mass:1.12, heavy:false};
  const introBoat={scale:1};
  const introSeats=[0,4,2,1,3];
  const boardingTimes=[-2,-1,.10,.39,.65,.85,1.02,1.16,1.25,1.35,1.43,
    1.49,1.57,1.65,1.71,1.80,1.87,1.95,2.03,2.09,2.15];
  const introDucks=boardingTimes.map((born,index)=>({
    ...introDuck, born, seed:index*2.39,
    x:(introSeats[index%introSeats.length]-2)*43+3*Math.sin(index*7),
    y:-29-Math.floor(index/introSeats.length)*23+2.6*Math.sin(index*4.5)
  }));
  const introTilt=[[0,-.016],[.65,.024],[1.16,-.027],[1.57,.10],[1.92,.19],[2.19,.31],
    [2.39,.15],[2.61,.34],[2.90,.67],[3.38,.92],[3.88,1]];

  function drawIntro(time) {
    const ducks=introDucks.filter(duck=>duck.born<=time);
    const settled=ducks.filter(duck=>duck.born+.40<=time).length;
    const load=clamp((settled-2)/(introDucks.length-2));
    const angle=sequence(time,introTilt);
    draw({
      mode:"intro", boat:introBoat, duck:introDuck, columns:introSeats.length, clock:time,
      ducks, ratio:.12+1.22*load, strain:load, angle, shift:1.4*Math.sin(angle),
      sink:.93*ease(part(time,2.69,3.88))
    },time*1000);
  }
  return {draw,drawIntro,sequence};
})();
