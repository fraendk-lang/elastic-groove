/**
 * Inline tone sweetener for the main melody engine (Channel 14).
 *
 * Sits between MelodyEngine output and the mixer. Adds subtle stereo chorus
 * and gentle compression so poly pad + step patterns feel glued and wide
 * without overpowering the main sequencer.
 */

/** L3 (pad export) follows main pad tone at this scale — slightly softer on layers. */
export const LAYER3_TONE_FOLLOW = 0.92;

export class MelodyPadToneFx {
  readonly input: GainNode;
  readonly output: GainNode;

  private dryGain: GainNode;
  private wetGain: GainNode;
  private comp: DynamicsCompressorNode;
  private bypassGain: GainNode;
  private _amount = 1;

  constructor(ctx: AudioContext) {
    this.input = ctx.createGain();
    this.input.gain.value = 1;

    const delayL = ctx.createDelay(0.04);
    const delayR = ctx.createDelay(0.04);
    delayL.delayTime.value = 0.011;
    delayR.delayTime.value = 0.016;

    const lfoL = ctx.createOscillator();
    lfoL.type = "sine";
    lfoL.frequency.value = 0.52;
    const lfoDepthL = ctx.createGain();
    lfoDepthL.gain.value = 0.0032;
    lfoL.connect(lfoDepthL);
    lfoDepthL.connect(delayL.delayTime);

    const lfoR = ctx.createOscillator();
    lfoR.type = "sine";
    lfoR.frequency.value = 0.67;
    const lfoDepthR = ctx.createGain();
    lfoDepthR.gain.value = 0.0041;
    lfoR.connect(lfoDepthR);
    lfoDepthR.connect(delayR.delayTime);

    const chorusBus = ctx.createGain();
    chorusBus.gain.value = 1;

    this.dryGain = ctx.createGain();
    this.dryGain.gain.value = 0.76;
    this.wetGain = ctx.createGain();
    this.wetGain.gain.value = 0.34;

    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -22;
    this.comp.knee.value = 10;
    this.comp.ratio.value = 2.4;
    this.comp.attack.value = 0.006;
    this.comp.release.value = 0.13;

    this.bypassGain = ctx.createGain();
    this.bypassGain.gain.value = 0;

    this.output = ctx.createGain();
    this.output.gain.value = 1;

    this.input.connect(this.dryGain);
    this.input.connect(delayL);
    this.input.connect(delayR);
    delayL.connect(chorusBus);
    delayR.connect(chorusBus);
    chorusBus.connect(this.wetGain);

    this.dryGain.connect(this.comp);
    this.wetGain.connect(this.comp);
    this.comp.connect(this.output);

    this.input.connect(this.bypassGain);
    this.bypassGain.connect(this.output);

    lfoL.start();
    lfoR.start();
  }

  get amount(): number {
    return this._amount;
  }

  /** 0 = bypass, 1 = full pad sweetener. */
  setAmount(amount: number): void {
    const t = this.input.context.currentTime;
    const a = Math.max(0, Math.min(1, amount));
    this._amount = a;
    const fxOn = a > 0.02 ? 1 : 0;
    const bypass = 1 - fxOn;
    this.bypassGain.gain.setTargetAtTime(bypass, t, 0.025);
    this.dryGain.gain.setTargetAtTime(0.76 + (1 - a) * 0.24, t, 0.025);
    this.wetGain.gain.setTargetAtTime(0.34 * a, t, 0.025);
    // Compression eases in with amount — at low % mostly chorus, at high % full glue
    this.comp.threshold.setTargetAtTime(-22 + (1 - a) * 14, t, 0.03);
    this.comp.ratio.setTargetAtTime(1 + a * 1.4, t, 0.03);
  }
}

let _padToneFx: MelodyPadToneFx | null = null;
let _layer3ToneFx: MelodyPadToneFx | null = null;
let _toneAmountPercent = 78;

export function initMelodyPadToneFx(ctx: AudioContext): MelodyPadToneFx {
  if (_padToneFx) return _padToneFx;
  _padToneFx = createMelodyPadToneFx(ctx, _toneAmountPercent / 100);
  return _padToneFx;
}

export function createMelodyPadToneFx(ctx: AudioContext, amount = 1): MelodyPadToneFx {
  const fx = new MelodyPadToneFx(ctx);
  fx.setAmount(amount);
  return fx;
}

export function getMelodyPadToneFx(): MelodyPadToneFx | null {
  return _padToneFx;
}

export function registerLayer3PadToneFx(fx: MelodyPadToneFx | null): void {
  _layer3ToneFx = fx;
  if (fx) fx.setAmount((_toneAmountPercent / 100) * LAYER3_TONE_FOLLOW);
}

/** Apply chorus/comp intensity (0–100) to main pad path + L3 layer export. */
export function applyPadToneAmountPercent(percent: number): void {
  _toneAmountPercent = Math.max(0, Math.min(100, Math.round(percent)));
  const a = _toneAmountPercent / 100;
  _padToneFx?.setAmount(a);
  _layer3ToneFx?.setAmount(a * LAYER3_TONE_FOLLOW);
}

export function getPadToneAmountPercent(): number {
  return _toneAmountPercent;
}
