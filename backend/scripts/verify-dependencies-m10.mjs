/** Validate what npm ACTUALLY installed, not only the manifest. */
import {readFileSync, existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {assertSafeManifest,summarizeMulterTree,isPatchedMulterVersion} from './m10-security-core.mjs';
const pkg=JSON.parse(readFileSync('package.json','utf8'));
const errors=assertSafeManifest(pkg);
if(!existsSync('node_modules')) errors.push('node_modules absent: run npm install in the complete backend folder');
if(errors.length){for(const e of errors) console.error('FAIL:',e);process.exitCode=1;}
else{
  const child=spawnSync('npm',['ls','multer','--all','--json'],{encoding:'utf8',maxBuffer:10*1024*1024});
  let tree;
  try{tree=JSON.parse(child.stdout||'{}');}catch{console.error('FAIL: npm ls failed to return JSON:',child.stderr?.slice(0,500));process.exit(1);}
  const result=summarizeMulterTree(tree);
  for(const item of result.versions)console.log(`${isPatchedMulterVersion(item.version)?'PASS':'FAIL'} installed multer ${item.version} via ${item.path}`);
  // npm ls may exit nonzero for an invalid dependency tree even if it exposes the correct version.
  if(child.status!==0)result.errors.push(`npm ls reported dependency-tree errors (exit ${child.status}); repair npm install`);
  for(const e of result.errors)console.error('FAIL:',e);
  if(result.errors.length){process.exitCode=1;}
  else console.log(`PASS: ${result.versions.length} installed Multer dependency path(s) patched (>=2.5.0).`);
}
