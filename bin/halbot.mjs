#!/usr/bin/env node

import { cache, dbio, memory, storage as _storage, utilitas } from 'utilitas';
import halbot from '../index.mjs';

const envConfig=JSON.parse(process.env.BOT_CONFIG || "{}")

const debug = utilitas.humanReadableBoolean(process.env['DEBUG']);
const log = content => utilitas.log(content, import.meta.url);
const MEMORY = 'memory';
const _getConfig = async () => await _storage.getConfig({config:process.env.BOT_CONFIG_FILE|| "./config.json"});
const getConfig = async key => (await _getConfig())?.config?.[key];

let storage = {
    get: async key => (await getConfig(MEMORY))?.[key],
    set: async (k, v) => await _storage.setConfig({ [MEMORY]: { [k]: v } }),
};

try {
    var { filename, config } = await _getConfig();
    if(!utilitas.countKeys(config)){
        config=envConfig;
    }
    Object.assign(config,envConfig);
    assert(utilitas.countKeys(config), `Error loading config from ${filename}. and ${process.env.BOT_CONFIG}`);
    const sessionType = utilitas.trim(config.storage?.type, { case: 'UP' });
    if (config.storage?.type) { delete config.storage.type; }
    switch (sessionType) {
        case 'MARIADB': case 'MYSQL':
            await dbio.init(config.storage);
            storage = await memory.init();
            break;
        case 'REDIS':
            storage = await cache.init(config.storage);
            break;
        default:
            config.storage && utilitas.throwError('Invalid storage config.');
    }
    await halbot({ ...config, storage });
} catch (err) { debug ? utilitas.throwError(err) : log(err); }
