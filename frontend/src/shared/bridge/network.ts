import { NativeEventEmitter, NativeModules } from 'react-native';

export interface ActiveUrlChangedEvent {
  url: string;
}

export const ActiveUrlChangedEmitter = new NativeEventEmitter(NativeModules.NetworkStatusModule);
