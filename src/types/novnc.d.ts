declare module '@novnc/novnc/lib/rfb' {
  export default class RFB extends EventTarget {
    constructor(
      target: HTMLElement,
      url: string | WebSocket | RTCDataChannel,
      options?: {
        shared?: boolean;
        credentials?: { password?: string; username?: string; target?: string };
        repeaterID?: string;
        wsProtocols?: string[];
      }
    );

    // Properties
    viewOnly: boolean;
    scaleViewport: boolean;
    resizeSession: boolean;
    clipViewport: boolean;
    dragViewport: boolean;
    focusOnClick: boolean;
    background: string;
    qualityLevel: number;
    compressionLevel: number;
    showDotCursor: boolean;
    readonly capabilities: {
      power: boolean;
      [key: string]: boolean;
    };

    // Methods
    disconnect(): void;
    sendCredentials(credentials: { password?: string; username?: string; target?: string }): void;
    sendKey(keysym: number, code: string, down?: boolean): void;
    sendCtrlAltDel(): void;
    focus(options?: FocusOptions): void;
    blur(): void;
    machineShutdown(): void;
    machineReboot(): void;
    machineReset(): void;
    clipboardPasteFrom(text: string): void;
    getImageData(): ImageData;
    toDataURL(type?: string, encoderOptions?: number): string;
    toBlob(callback: (blob: Blob | null) => void, type?: string, quality?: number): void;

    // Events
    addEventListener(type: 'connect', listener: (e: CustomEvent) => void): void;
    addEventListener(
      type: 'disconnect',
      listener: (e: CustomEvent<{ clean: boolean }>) => void
    ): void;
    addEventListener(
      type: 'credentialsrequired',
      listener: (e: CustomEvent<{ types: string[] }>) => void
    ): void;
    addEventListener(type: 'securityfailure', listener: (e: CustomEvent) => void): void;
    addEventListener(type: 'clipboard', listener: (e: CustomEvent<{ text: string }>) => void): void;
    addEventListener(type: 'bell', listener: (e: CustomEvent) => void): void;
    addEventListener(
      type: 'desktopname',
      listener: (e: CustomEvent<{ name: string }>) => void
    ): void;
    addEventListener(
      type: 'capabilities',
      listener: (e: CustomEvent<{ capabilities: { [key: string]: boolean } }>) => void
    ): void;
    removeEventListener(type: string, listener: (e: CustomEvent) => void): void;

    // Static properties
    static messages: {
      keyEvent(sock: any, keysym: number, down: boolean): void;
      pointerEvent(sock: any, x: number, y: number, mask: number): void;
      clientCutText(sock: any, text: string): void;
      pixelFormat(sock: any, depth: number, trueColor: boolean): void;
      clientEncodings(sock: any, encodings: number[]): void;
      fbUpdateRequest(
        sock: any,
        incremental: boolean,
        x: number,
        y: number,
        w: number,
        h: number
      ): void;
    };

    static cursors: {
      none: {
        rgbaPixels: Uint8Array;
        w: number;
        h: number;
        hotx: number;
        hoty: number;
      };
      dot: {
        rgbaPixels: Uint8Array;
        w: number;
        h: number;
        hotx: number;
        hoty: number;
      };
    };
  }
}
