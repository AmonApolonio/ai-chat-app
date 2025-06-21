export type OnTokenCallback = (chunk: string, done: boolean, status?: 'researching' | 'streaming' | 'streaming-complete' | 'formatted-complete', error?: boolean) => void;
