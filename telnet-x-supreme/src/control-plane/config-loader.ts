// src/control-plane/config-loader.ts
// Sovereign Pattern: Dynamic config tanpa recompile/restart

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

class ConfigLoader {
  private cache: Record<string, any> = {};
  private watchers: Map<string, fs.FSWatcher> = new Map();

  load<T = any>(filename: string): T {
    const filePath = path.join(process.cwd(), 'config', filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Config not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    this.cache[filename] = yaml.load(content);

    if (!this.watchers.has(filename)) {
      const watcher = fs.watch(filePath, () => {
        try {
          const updated = fs.readFileSync(filePath, 'utf8');
          this.cache[filename] = yaml.load(updated);
          console.log(`[ConfigLoader] Hot-reloaded: ${filename}`);
        } catch (err: any) {
          console.error(`[ConfigLoader] Reload failed: ${err.message}`);
        }
      });
      this.watchers.set(filename, watcher);
    }

    return this.cache[filename] as T;
  }

  get<T = any>(filename: string): T {
    if (!this.cache[filename]) this.load(filename);
    return this.cache[filename] as T;
  }

  getPath<T = any>(filename: string, dotPath: string): T {
    const config = this.get(filename);
    return dotPath.split('.').reduce((obj: any, key) => obj?.[key], config) as T;
  }
}

export const configLoader = new ConfigLoader();
