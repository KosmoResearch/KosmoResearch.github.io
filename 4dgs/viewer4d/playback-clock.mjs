// Wall-clock playback: speed changes preserve the current content time.
export function playbackTime(anchor,epoch,now,rate,duration=5){return ((anchor+Math.max(0,now-epoch)*.001*rate)%duration+duration)%duration;}
