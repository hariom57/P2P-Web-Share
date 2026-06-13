let activeDataChannel: RTCDataChannel | null = null;
let activeFile: File | null = null;

export function setActiveDataChannel(dc: RTCDataChannel | null) {
  activeDataChannel = dc;
}

export function getActiveDataChannel(): RTCDataChannel | null {
  return activeDataChannel;
}

export function setActiveFile(file: File | null) {
  activeFile = file;
}

export function getActiveFile(): File | null {
  return activeFile;
}

