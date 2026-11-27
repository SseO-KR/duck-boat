(() => {
  const $=id=>document.getElementById(id);
  const clamp=n=>Math.min(1,Math.max(0,n));
  const between=(a,b)=>a+Math.random()*(b-a);
  const quiet=matchMedia("(prefers-reduced-motion: reduce)").matches;
  const defaults=["1번 선장","2번 선장","3번 선장","4번 선장"];
  function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
  function save(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
  const validNames=a=>Array.isArray(a)&&a.length>=2&&a.length<=12&&a.every(n=>typeof n==="string"&&n.trim()&&n.length<=16);
  const stored=read("pond.players",null);
  let players=validNames(stored)?stored:defaults.slice(),soundOn=read("pond.sound",false)===true;
  let audio,owner=null,s,elapsed=0,nextDuck=0,lastFrame=performance.now(),runTime=0;
  function note(hz,to,duration,delay=0,volume=.05,type="sine"){
    if(!soundOn||!audio||audio.state!=="running")return;
    const start=audio.currentTime+delay,gain=audio.createGain(),osc=audio.createOscillator();
    osc.type=type;osc.frequency.setValueAtTime(hz,start);osc.frequency.exponentialRampToValueAtTime(to,start+duration);
    gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(volume,start+.012);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    osc.connect(gain);gain.connect(audio.destination);osc.start(start);osc.stop(start+duration+.015);
  }
  function wakeAudio(){if(!soundOn)return;try{const Audio=window.AudioContext||window.webkitAudioContext;if(Audio){audio??=new Audio();audio.resume().catch(()=>{})}}catch{}}
  function soundUI(){$("sound").setAttribute("aria-pressed",String(soundOn));$("sound").setAttribute("aria-label",soundOn?"소리 끄기":"소리 켜기");$("soundText").textContent=soundOn?"소리 켜짐":"소리 꺼짐"}
  $("sound").onclick=()=>{soundOn=!soundOn;save("pond.sound",soundOn);soundUI();wakeAudio();note(440,660,.1)};
  function newRound(){
    const scale=between(.89,1.13),capacity=31*scale**2*between(.92,1.12);
    s={mode:"ready",player:0,turn:1,clock:1,quiet,ducks:[],mass:0,moment:0,ratio:0,angle:0,shift:0,focus:0,sink:0,
       boat:{scale,capacity},duration:0,doomed:false,lastBeat:-1};
    elapsed=0;owner=null;
    board(-2);board(-2);
    $("boatSize").textContent=scale<.97?"아담한 배":scale>1.055?"넉넉한 배":"보통 배";
    refresh();say(players[0]+" 차례"); 
  }
  function board(born){
    const i=s.ducks.length;
    const heavy=Math.random()<.15;
    const mass=heavy?between(1.85,2.75):between(.58,1.35);
    const size=.52+mass*.13;
    const row=Math.floor(i/9),slot=(i*5+3+row*2)%9;
    const x=(slot-4)*24+between(-6,6),y=-23-row*12+between(-2,2);
    s.ducks.push({born,mass,heavy,size,x,y,seed:between(0,6)});
    s.mass+=mass;s.moment+=x*mass;
    // An uneven load lowers the usable capacity. Weight and seating persist across turns.
    s.ratio=(s.mass+Math.abs(s.moment)/420)/s.boat.capacity;
    $("duckCount").textContent=s.ducks.length;
  }
  function say(text){$("announce").textContent=text}
  function roster(){
    const list=$("roster");list.replaceChildren();
    players.forEach((name,i)=>{
      const item=document.createElement("li"),num=document.createElement("span"),who=document.createElement("span");
      num.className="num";num.textContent=String(i+1).padStart(2,"0");
      who.className="name";who.textContent=name;item.append(num,who);
      if(i===s.player){item.className="on";const tag=document.createElement("b");tag.className="now";tag.textContent=s.mode==="lost"?"침몰":"이번 차례";item.append(tag)}
      list.append(item);
    });
  }
  function setCaption(message,deep=false){
    const el=$("caption");if(el.textContent!==message)el.textContent=message;
    el.hidden=!message;el.classList.toggle("deep",deep);
  }
  function refresh(){
    const name=players[s.player],mode=s.mode;
    const views={
      ready:["승선 대기","꾹 눌러 오리 태우기","누르는 동안 승선하고, 손을 떼면 배가 흔들려요."],
      hold:["승선 중","손을 떼면 멈춰요","작고 무거운 오리도 있어요. 어디서 멈출까요?"],
      balance:["균형 확인 중","균형 잡는 중…","배가 완전히 멈출 때까지 기다려요."],
      safe:["무사 통과","버텼어요!","다음 사람에게 기기를 건네주세요."],
      sinking:["침몰 중","잠깐, 올라오나…?","마지막 오리가 수면 위로 떠오를 때까지…"],
      lost:["침몰","다시 한 판","같은 참가자로 새로운 배를 띄워요."]
    };
    const [badge,action,tip]=views[mode];
    $("phase").textContent=badge;$("action").textContent=action;$("tip").textContent=tip;
    $("turn").textContent=mode==="lost"?name+" 패배":name+" 차례";
    $("turnNote").textContent=s.turn+"번째 차례";
    const btn=$("hold");btn.disabled=!["ready","hold","lost"].includes(mode);btn.classList.toggle("waiting",btn.disabled);btn.classList.toggle("pressed",mode==="hold");
    btn.querySelector(".button-duck").textContent=mode==="ready"?"+":mode==="lost"?"↻":mode==="safe"?"✓":"≈";
    $("edit").disabled=!["ready","lost"].includes(mode);$("help").disabled=!["ready","lost"].includes(mode);
    if(mode==="ready"||mode==="hold")setCaption("");
    if(mode==="safe")setCaption("휴… 버텼다!");
    if(mode==="lost")setCaption(name+" 패배!",true);
    roster();
  }
  function begin(id){
    if(s.mode!=="ready"||owner!==null||$("modal").open)return false;
    wakeAudio();owner=id;s.mode="hold";elapsed=0;
    board(s.clock-.04);board(s.clock+.04);nextDuck=.135;
    note(530,730,.055,0,.025);refresh();return true;
  }
  function stop(id){
    if(s.mode!=="hold"||id!==owner)return;
    owner=null;s.mode="balance";s.doomed=s.ratio>=1;s.releaseAngle=s.angle;
    s.direction=Math.abs(s.moment)>5?Math.sign(s.moment):1;
    s.duration=4.05+1.95*clamp((s.ratio-.2)/.8);
    s.lastBeat=-1;elapsed=0;refresh();say("손을 뗐어요. 배가 흔들려요.");
  }
  const action=$("hold");
  action.addEventListener("contextmenu",e=>e.preventDefault());
  action.addEventListener("pointerdown",e=>{
    if(e.button!==0||!e.isPrimary)return;
    if(begin(e.pointerId)){e.preventDefault();try{action.setPointerCapture(e.pointerId)}catch{}}
  });
  for(const event of ["pointerup","pointercancel","lostpointercapture"]){
    window.addEventListener(event,e=>stop(e.pointerId),true);
  }
  for(const key of ["keydown","keyup"]){action.addEventListener(key,e=>{
    if((e.code!=="Space"&&e.code!=="Enter")||s.mode==="lost")return;
    e.preventDefault();
    if(key==="keydown"&&!e.repeat)begin(e.code);
    if(key==="keyup")stop(e.code);
  })}
  action.addEventListener("click",e=>{
    if(s.mode==="lost"){newRound();return}
    // Assistive activation without a pointer or key sequence boards a small batch.
    if(e.detail===0 && begin("assist"))stop("assist");
  });
  function interrupt(){stop(owner);lastFrame=performance.now()}
  window.addEventListener("blur",interrupt);
  document.addEventListener("visibilitychange",interrupt);
  function frame(now){
    const dt=Math.min(.1,Math.max(0,(now-lastFrame)/1000));lastFrame=now;
    if(!document.hidden&&!$("modal").open){
      elapsed+=dt;runTime+=dt;
      s.clock+=dt*(s.mode==="balance"?.32:s.mode==="sinking"?.46:1);
      if(s.mode==="hold"){
        while(elapsed>=nextDuck && s.ducks.length<96){
          board(s.clock);nextDuck+=.077;
          if(s.ducks.length%3===0)note(between(450,660),880,.06,0,.018);
        }
        if(s.ducks.length>=96)$("action").textContent="만선! 손을 떼세요";
        s.angle+=((Math.sin(s.clock*6)*.021+s.moment/Math.max(1,s.mass)*.0017)-s.angle)*Math.min(1,dt*4);
      }else if(s.mode==="balance"){
        const p=clamp(elapsed/s.duration);
        const risk=clamp(s.ratio);
        const maxAngle=(.09+.39*risk)*s.direction;
        const q=PondScene.sequence(p,[[0,0],[.20,.52],[.37,.90],[.56,.26],[.65,.31],[.86,1.06],[.92,1.04],[1,s.doomed?1.19:.11]]);
        s.angle=s.releaseAngle*(1-clamp(p*4))+maxAngle*q;s.shift=Math.sin(s.angle)*1.4;
        s.focus=Math.min(1,p*4);
        if(p>.54&&p<.67&&risk>.66)setCaption("버텼나…?");else setCaption("");
        const beat=p>.78?2:p>.52?1:p>.23?0:-1;
        if(beat!==s.lastBeat){s.lastBeat=beat;note(92,49,.20,0,.09);note(77,44,.14,.15,.045)}
        if(p===1){s.mode=s.doomed?"sinking":"safe";s.beforeSink=s.angle;elapsed=0;refresh();
          if(s.doomed){setCaption("");note(184,41,.92,0,.10,"triangle")}
          else{note(392,494,.12);note(494,587,.16,.12);say("버텼어요.");}}
      }else if(s.mode==="safe"){
        s.angle*=Math.exp(-dt*5);s.focus=Math.max(0,1-elapsed);s.shift*=Math.exp(-dt*5);
        if(elapsed>=1.05){s.player=(s.player+1)%players.length;s.turn++;s.mode="ready";elapsed=0;refresh();say(players[s.player]+" 차례")}
      }else if(s.mode==="sinking"){
        s.sink=clamp(elapsed/3.45);
        s.angle=s.beforeSink+s.direction*PondScene.sequence(s.sink,[[0,0],[.18,-.09],[.34,.22],[.68,.47],[1,.59]]);
        if(s.sink>.84&&!s.quacked){s.quacked=true;note(620,330,.125,0,.045,"sawtooth")}
        if(s.sink===1){s.mode="lost";elapsed=0;refresh();say(players[s.player]+" 패배!")}
      }
    }
    PondScene.draw(s,runTime*1000);requestAnimationFrame(frame);
  }
  const modal=$("modal"),body=$("modalBody");
  function openDialog(){modal.showModal()}
  $("help").onclick=()=>{
    body.innerHTML="<h2>게임 방법</h2><p><b>1.</b> 한 기기를 돌려가며 자신의 차례에 버튼을 꾹 눌러요. 짧게 톡 눌러도 오리 두 마리가 올라타요.</p><p><b>2.</b> 손을 떼면 슬로모션이 시작돼요. 버티면 다음 사람 차례예요.</p><p><b>3.</b> 배가 가라앉으면 마지막으로 태운 사람이 져요. 판마다 배 크기가 달라지고, 통통한 주황빛 오리는 더 무거워요.</p><button class='hold' id='gotIt'>알겠어요</button>";
    $("gotIt").onclick=()=>modal.close();openDialog();
  };
  $("edit").onclick=()=>{
    body.innerHTML="<h2>참가자 편집</h2><label for='names'>이름을 한 줄에 한 명씩 입력해요. (2~12명)</label><textarea id='names' rows='6' maxlength='215'></textarea><p class='err' id='error' role='alert'></p><button class='hold' id='saveNames'>이 명단으로 새 판 시작</button>";
    $("names").value=players.join("\n");
    $("saveNames").onclick=()=>{
      const names=$("names").value.split(/\r?\n/).map(n=>n.trim()).filter(Boolean);
      if(!validNames(names)||new Set(names).size!==names.length){$("error").textContent="서로 다른 이름을 2~12개 입력해 주세요. 한 이름은 16자까지예요.";return}
      players=names;save("pond.players",names);modal.close();newRound();
    };openDialog();
  };
  modal.addEventListener("close",()=>{lastFrame=performance.now()});
  soundUI();newRound();requestAnimationFrame(frame);
})();
