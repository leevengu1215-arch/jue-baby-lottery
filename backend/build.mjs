import {mkdir,readFile,writeFile} from 'node:fs/promises';
await mkdir('dist/server',{recursive:true});
await writeFile('dist/server/index.js',await readFile('worker.js'));
