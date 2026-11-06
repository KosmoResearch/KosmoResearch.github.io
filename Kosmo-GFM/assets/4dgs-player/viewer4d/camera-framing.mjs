import {initialSceneState as sourceInitialSceneState} from './camera-presets.mjs';
import {invert4,translate4} from '../camera-math.mjs';

// Move along the authored camera's forward axis. Per-scene offsets keep
// space around the performers throughout the five-second clips.
export const forwardOffsets=Object.freeze({
 vvc_001_1_seq0:2,
 vvc_004_1_seq1:1.6,
 vvc_006_1_seq1:1.5,
 vvc_007_C_wall_surface:1.6,
});

export function initialSceneState(id,camera){
 const state=sourceInitialSceneState(id,camera);
 const forward=forwardOffsets[id];
 if(!state||!forward)return state;
 return {...state,
  view:invert4(translate4(invert4(state.view),0,0,forward)),
  distance:state.distance-forward,
 };
}
