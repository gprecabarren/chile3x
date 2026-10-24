// Use the existing local Wrangler OAuth session without altering the parent's
// environment. Never print credentials or pass secret values as arguments.
import {spawnSync} from 'node:child_process';
const env={...process.env};
delete env.CLOUDFLARE_API_TOKEN;
delete env.CLOUDFLARE_ACCOUNT_ID;
const result=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js',...process.argv.slice(2)],{env,stdio:'inherit'});
process.exitCode=result.status??1;
