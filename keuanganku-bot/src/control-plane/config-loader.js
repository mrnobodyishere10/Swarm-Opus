// src/control-plane/config-loader.js
// Sovereign Pattern: Load konfigurasi dinamis tanpa restart

const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

class ConfigLoader {
  constructor() {
    this._cache = {};
    this._watchers = new Map();
  }

  load(filename) {
    const filePath = path.join(process.cwd(), 'config', filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Config file tidak ditemukan: ${filePath}`);
    }
    const content = fs.readFileSync(filePath, 'utf8');
    this._cache[filename] = yaml.load(content);

    if (!this._watchers.has(filename)) {
      const watcher = fs.watch(filePath, () => {
        try {
          const newContent = fs.readFileSync(filePath, 'utf8');
          this._cache[filename] = yaml.load(newContent);
          console.log(`[ConfigLoader] Hot-reloaded: ${filename}`);
        } catch (err) {
          console.error(`[ConfigLoader] Gagal reload ${filename}:`, err.message);
        }
      });
      this._watchers.set(filename, watcher);
    }
    return this._cache[filename];
  }

  get(filename) {
    if (!this._cache[filename]) return this.load(filename);
    return this._cache[filename];
  }

  getPath(filename, dotPath) {
    const config = this.get(filename);
    return dotPath.split('.').reduce((obj, key) => obj?.[key], config);
  }
}

module.exports = new ConfigLoader();
