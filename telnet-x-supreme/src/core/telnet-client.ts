// src/core/telnet-client.ts

import * as net from 'net';
import { logger } from '../sidecars/logger-sidecar';

export interface TelnetResult {
  host: string;
  port: number;
  open: boolean;
  banner: string;
  responseMs: number;
  error?: string;
}

export async function probeTelnet(
  host: string,
  port: number = 23,
  timeoutMs: number = 5000,
  maxBannerBytes: number = 2048,
): Promise<TelnetResult> {
  const start = Date.now();

  return new Promise((resolve) => {
    const socket = new net.Socket();
    let banner = '';
    let resolved = false;

    const finish = (open: boolean, error?: string) => {
      if (resolved) return;
      resolved = true;
      socket.destroy();
      resolve({
        host, port, open,
        banner: banner.slice(0, maxBannerBytes),
        responseMs: Date.now() - start,
        error,
      });
    };

    socket.setTimeout(timeoutMs);
    socket.connect(port, host, () => {
      logger.debug('TCP connected', { host, port });
    });

    socket.on('data', (data) => {
      banner += data.toString('utf8', 0, Math.min(data.length, maxBannerBytes - banner.length));
      if (banner.length >= maxBannerBytes) finish(true);
    });

    socket.on('connect', () => {
      // Jika tidak ada data setelah 500ms, port dianggap open tapi tanpa banner
      setTimeout(() => {
        if (!resolved) finish(true);
      }, 500);
    });

    socket.on('timeout', () => finish(false, 'timeout'));
    socket.on('error', (err) => finish(false, err.message));
    socket.on('close', () => {
      if (!resolved) finish(banner.length > 0, undefined);
    });
  });
}
