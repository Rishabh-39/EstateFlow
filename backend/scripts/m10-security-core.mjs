/** Pure dependency security rules. No network, secrets or database access. */
export const MIN_SAFE_MULTER = '2.5.0';

export function isPatchedMulterVersion(version) {
  if (typeof version !== 'string') return false;
  const match = /^(\d+)\.(\d+)\.(\d+)(?:\+[^ ]+)?$/.exec(version);
  if (!match) return false;
  const [, maj, min, patch] = match.map(Number);
  return maj > 2 || (maj === 2 && (min > 5 || (min === 5 && patch >= 0)));
}

export function assertSafeManifest(pkg) {
  const errors = [];
  if (pkg?.overrides?.multer !== MIN_SAFE_MULTER) errors.push('npm overrides must pin multer exactly to '+MIN_SAFE_MULTER);
  if (!/^\^11\./.test(pkg?.dependencies?.['@nestjs/platform-express']||'')) errors.push('Expected NestJS 11 platform-express major; review any major change');
  if (!pkg?.scripts?.['security:verify']) errors.push('security:verify npm script is missing');
  return errors;
}

export function collectInstalledMulterVersions(root) {
  const found=[];
  const visited=new Set();
  function walk(node, path) {
    if (!node || typeof node !== 'object' || visited.has(node)) return;
    visited.add(node);
    for(const [name, child] of Object.entries(node.dependencies||{})) {
      const next=path?`${path} > ${name}`:name;
      if(name==='multer') found.push({path:next,version:typeof child?.version==='string'?child.version:'unknown'});
      walk(child,next);
    }
  }
  walk(root,'');
  return found;
}

export function summarizeMulterTree(tree) {
  const versions = collectInstalledMulterVersions(tree);
  return {versions, errors: versions.length === 0
    ? ['No installed multer dependency found. Run npm install before security verification.']
    : versions.filter(item=>!isPatchedMulterVersion(item.version)).map(item=>`Vulnerable or unresolved multer ${item.version}: ${item.path}`)};
}
