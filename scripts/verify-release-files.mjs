// Read-only pre-commit hygiene check. Prints filenames, never matched secrets.
import {execFileSync} from 'node:child_process';
import {readFileSync,statSync} from 'node:fs';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).split('\0').filter(Boolean);
const tracked=[...git('diff','--name-only','-z'),...git('diff','--cached','--name-only','-z')];
const untracked=git('ls-files','--others','--exclude-standard','-z');
const selected=[...new Set([...tracked,...untracked])].filter(path=>/^(?:app|db|lib|worker|tests|scripts|docs|public|drizzle)\//.test(path)||/^(?:\.gitignore|AGENTS\.md|cloudflare-env\.d\.ts|package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|vite\.config\.ts)$/.test(path));
const forbidden=/(?:^|\/)(?:\.env[^/]*|\.dev\.vars[^/]*|[^/]*credentials[^/]*|[^/]*token-backup[^/]*)$|\.(?:sqlite(?:-wal|-shm)?|db|pem|key|p12|pfx|map|log)$/i;
const patterns=[/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----\s+[A-Za-z0-9+/=]{48,}/,/\bgh[pousr]_[A-Za-z0-9]{30,}\b/,/\bgithub_pat_[A-Za-z0-9_]{35,}\b/,/\bAKIA[A-Z0-9]{16}\b/];
let failures=0;
for(const path of selected){
 if(forbidden.test(path)){console.error('REVIEW forbidden release filename: '+path);failures++;continue;}
 let bytes;try{if(statSync(path).size>10_000_000){console.error('REVIEW large release file: '+path);failures++;continue;}bytes=readFileSync(path);}catch(error){if(error.code==='ENOENT')continue;throw error;}
 if(!/\.(?:png|jpe?g|webp|ico|woff2|mp4|webm)$/i.test(path)&&patterns.some(pattern=>pattern.test(bytes.toString('utf8')))){console.error('REVIEW possible credential content: '+path);failures++;}
}
console.log(`Checked ${selected.length} site release paths; ${untracked.length-selected.filter(path=>untracked.includes(path)).length} unrelated untracked paths excluded.`);
if(failures)process.exitCode=1;else console.log('PASS release filename/credential-pattern hygiene. This is not a full security audit.');
