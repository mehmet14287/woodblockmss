
// Synthesized audio to avoid external assets

let audioCtx: AudioContext | null = null;
let bgmNodes: AudioNode[] = [];
let nextNoteTime = 0.0;
let isBgmPlaying = false;
let timerID: number | null = null;
let tempo = 60.0;
let lookahead = 25.0;
let scheduleAheadTime = 0.1;

const NOTES = {
  'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'G4': 392.00, 'A4': 440.00,
  'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'G5': 783.99
};

// Pentatonic scale for Zen feeling
const SCALE = [NOTES.C4, NOTES.D4, NOTES.E4, NOTES.G4, NOTES.A4, NOTES.C5, NOTES.D5, NOTES.E5];

const getContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
};

export const playComboSound = (comboCount: number) => {
  try {
    const ctx = getContext();
    if (ctx.state === 'suspended') ctx.resume();
    
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    // Pitch based on combo
    const baseFreq = 300 + (comboCount * 50);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, t + 0.3);
    
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.3 + (Math.min(comboCount, 5) * 0.05), t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(t);
    osc.stop(t + 0.4);
    
    // Sparkle for big combos
    if (comboCount > 1) {
      const sparkOsc = ctx.createOscillator();
      const sparkGain = ctx.createGain();
      
      sparkOsc.type = 'triangle';
      sparkOsc.frequency.setValueAtTime(baseFreq * 2, t);
      sparkOsc.frequency.linearRampToValueAtTime(baseFreq * 3, t + 0.2);
      
      sparkGain.gain.setValueAtTime(0, t);
      sparkGain.gain.linearRampToValueAtTime(0.1, t + 0.05);
      sparkGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
      
      sparkOsc.connect(sparkGain);
      sparkGain.connect(ctx.destination);
      
      sparkOsc.start(t);
      sparkOsc.stop(t + 0.2);
    }
  } catch (e) {
    console.error("SFX error", e);
  }
};

// --- Background Music Logic ---

const playNote = (freq: number, time: number, duration: number) => {
  if (!audioCtx) return;
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = 'sine';
  osc.frequency.value = freq;
  
  // Soft envelope for ambient feel
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(0.05, time + 0.1); // Very low volume
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.start(time);
  osc.stop(time + duration);
  
  bgmNodes.push(osc);
  bgmNodes.push(gain);
  
  // Cleanup
  setTimeout(() => {
    const i = bgmNodes.indexOf(osc);
    if (i > -1) bgmNodes.splice(i, 2);
  }, (duration + 1) * 1000);
};

const scheduler = () => {
  if (!isBgmPlaying || !audioCtx) return;
  
  while (nextNoteTime < audioCtx.currentTime + scheduleAheadTime) {
    scheduleNote(nextNoteTime);
    nextNoteTime += 60.0 / tempo; // 1 beat
  }
  timerID = window.setTimeout(scheduler, lookahead);
};

let beatCount = 0;

const scheduleNote = (time: number) => {
  // Procedural ambient pattern
  // Play a random note from pentatonic scale every few beats
  
  // Bass note every 4 beats
  if (beatCount % 4 === 0) {
    playNote(NOTES.C4 / 2, time, 4); // C3
  }
  
  // Random melody note
  if (Math.random() > 0.3) {
    const note = SCALE[Math.floor(Math.random() * SCALE.length)];
    playNote(note, time, 1.5);
  }
  
  // Occasional harmony
  if (Math.random() > 0.7) {
    const note = SCALE[Math.floor(Math.random() * SCALE.length)];
    playNote(note, time + 0.1, 2);
  }
  
  beatCount++;
};

export const startBackgroundMusic = () => {
  const ctx = getContext();
  if (isBgmPlaying) return;
  
  if (ctx.state === 'suspended') ctx.resume();
  
  isBgmPlaying = true;
  nextNoteTime = ctx.currentTime;
  beatCount = 0;
  scheduler();
};

export const stopBackgroundMusic = () => {
  isBgmPlaying = false;
  if (timerID) window.clearTimeout(timerID);
  
  // Stop all currently playing notes
  bgmNodes.forEach((node: any) => {
    try { node.stop(); } catch(e) {}
    try { node.disconnect(); } catch(e) {}
  });
  bgmNodes = [];
};
