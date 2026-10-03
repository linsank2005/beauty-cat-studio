export type Timing = {start: number; end: number};
export type Narration = {id: string; text: string; estimated: Timing; actual?: Timing; speaker?: string};
export type Beat = {
  id: string; narrationId: string; at: number; anchor?: string; action: string;
  meaning: string; method: 'direct' | 'metaphor' | 'contrast' | 'reaction' | 'callback';
  actualAt?: number; actualMethod?: string;
};
export type SourceRect = {x:number;y:number;width:number;height:number;sourceWidth:number;sourceHeight:number};
export type Layer = {
  id: string; kind: 'cat'|'image'|'text'|'path'|'shape';
  x: number; y: number; width?: number; height?: number; rotation?: number;
  showAt: string; hideAt?: string; src?: string; text?: string; fontSize?: number;
  color?: string; fill?: string; path?: string; strokeWidth?: number;
  fontFamily?: string; fontWeight?: number; letterSpacing?: number;
  reveal?: 'draw'|'pop'|'wipe'|'fade'|'none'; revealSeconds?: number;
  sourceRect?: SourceRect; clipPath?: string; fadeOutSeconds?: number;
  motionEasing?: 'smooth'; transformOrigin?: string;
  expression?: 'neutral'|'surprised'|'proud';
  view?: 'sit'|'front'|'groom'|'walk'; reactions?: {at: string; expression: 'neutral'|'surprised'|'proud'}[];
  walk?: {durationSeconds:number;distanceX:number;distanceY:number;endScale:number;cycles:number};
  motion?: {at:string;x?:number;y?:number;rotation?:number}[];
  shape?: 'ellipse'|'rect'|'note'; radius?: number;
  doodle?: 'roller'|'moon'|'shirt'|'nail'|'brow'|'shoe'|'bag'|'redo'; noteIndex?: number;
};
export type SceneArt = {variant:'vanity'|'thoughts'|'compare'|'focus'|'exit'; appearAt?:string; fadeSeconds?:number};
export type Scene = {
  id: string; title: string; narrationIds: string[]; estimated: Timing; actual?: Timing;
  background: string; initialState: string; beats: Beat[]; layers: Layer[];
  art?: SceneArt;
  camera?: {at:string;x:number;y:number;scale:number}[];
  transitionInSeconds?: number;
};
export type EpisodeData = {
  schemaVersion: 1; id: string; title: string; scriptVersion: string;
  status: 'draft'|'approved'|'aligned'; timing: 'estimated'|'actual';
  fps: number; width: number; height: number; duration: number;
  designWidth?: number; designHeight?: number;
  voice?: string; burnCaptions: boolean; silenceDemo?: boolean;
  narration: Narration[]; scenes: Scene[];
  sources: {claim: string; url: string; note?: string}[];
  audioNote?: string; alignmentReview?: string;
  visualVersion?: string;
};
export type EpisodeProps = {episode: EpisodeData; silent?: boolean; captions?: boolean};
export const activeTime = (v: {estimated: Timing; actual?: Timing}, actual: boolean): Timing => actual && v.actual ? v.actual : v.estimated;
