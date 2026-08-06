// src/services/video/index.js

import { PeerJSProvider } from './PeerJSProvider';
import videoConfig from './video.config';

// Chọn provider dựa trên config
const providerMap = {
  peerjs: PeerJSProvider,
  // daily: DailyProvider,
  // jitsi: JitsiProvider,
};

const ProviderClass = providerMap[videoConfig.provider] || PeerJSProvider;
export const videoService = new ProviderClass();

// Export interface để dùng chung
export { VideoProvider } from './VideoProvider';
export { PeerJSProvider } from './PeerJSProvider';