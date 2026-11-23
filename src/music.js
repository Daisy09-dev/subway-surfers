// Original procedural instrumental for LTO Road Rush.
// All notes and rhythms are composed here; no third-party recordings or samples.
export function createRoadRushMusic() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let ctx, master, timer, nextTime = 0, step = 0, playing = false;
  let muted = false, volume = 0.23;
  const tempo = 108, sixteenth = 60 / tempo / 4;
  const bass = [55,55,65.41,55,73.42,65.41,49,49,55,55,65.41,82.41,73.42,65.41,55,49];
  const melody = [0,329.63,0,392,440,0,392,0,293.66,0,329.63,0,261.63,293.66,0,392];
  function init() {
    if (!AudioCtx) return false;
    if (!ctx) {
      ctx = new AudioCtx();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : volume;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return true;
  }
  function tone(freq, time, duration, type, gain, sweep = 1) {
    const osc = ctx.createOscillator(), env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    if (sweep !== 1) osc.frequency.exponentialRampToValueAtTime(Math.max(25, freq*sweep), time+duration);
    env.gain.setValueAtTime(0.0001,time);
    env.gain.exponentialRampToValueAtTime(gain,time+0.008);
    env.gain.exponentialRampToValueAtTime(0.0001,time+duration);
    osc.connect(env).connect(master);
    osc.start(time); osc.stop(time+duration+0.02);
  }
  function noise(time, duration, gain, highpass) {
    const len = Math.ceil(ctx.sampleRate*duration);
    const buffer = ctx.createBuffer(1,len,ctx.sampleRate), data = buffer.getChannelData(0);
    for(let i=0;i<len;i++) data[i] = Math.random()*2-1;
    const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), env = ctx.createGain();
    source.buffer=buffer; filter.type='highpass'; filter.frequency.value=highpass;
    env.gain.setValueAtTime(gain,time); env.gain.exponentialRampToValueAtTime(0.0001,time+duration);
    source.connect(filter).connect(env).connect(master);
    source.start(time); source.stop(time+duration);
  }
  function schedule(n,t) {
    const s=n%16;
    if(s%4===0) tone(135,t,0.17,'sine',0.65,0.28); // kick
    if(s===4||s===12) {noise(t,0.13,0.22,1100);tone(190,t,0.09,'triangle',0.14,0.55);} // snare
    if(s%2===0) noise(t,0.045,0.07,6500); // hats
    if([0,3,6,8,11,14].includes(s)) tone(bass[s],t,0.18,'sawtooth',0.13,0.9);
    if(melody[s]) tone(melody[s],t,0.13,'triangle',0.11);
  }
  function tick() {
    if(!playing||!ctx) return;
    while(nextTime<ctx.currentTime+0.12) {schedule(step++,nextTime);nextTime+=sixteenth;}
  }
  return {
    start() {
      if(!init()) return;
      if(playing) return;
      playing=true; nextTime=ctx.currentTime+0.04;
      timer=setInterval(tick,25); tick();
    },
    pause() {
      if(!playing) return;
      playing=false;clearInterval(timer);
      // Fade scheduled notes out quickly, then disconnect them by closing context only when needed.
      master.gain.setTargetAtTime(0,ctx.currentTime,0.025);
    },
    resume() {
      if(!init()) return;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(muted?0:volume,ctx.currentTime,0.035);
      if(!playing) {playing=true;nextTime=ctx.currentTime+0.05;timer=setInterval(tick,25);tick();}
    },
    setMuted(value) {
      muted=!!value;
      if(ctx&&master) {master.gain.cancelScheduledValues(ctx.currentTime);master.gain.setTargetAtTime(muted?0:volume,ctx.currentTime,0.025);}
    },
    setVolume(value) {
      volume=Math.max(0,Math.min(0.5,Number(value)||0));
      if(ctx&&master&&!muted) {master.gain.cancelScheduledValues(ctx.currentTime);master.gain.setTargetAtTime(volume,ctx.currentTime,0.025);}
    },
    get muted(){return muted;}
  };
}
