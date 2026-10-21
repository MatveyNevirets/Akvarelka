import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync, readFileSync} from 'node:fs';
import {extname, join, relative} from 'node:path';
import {fileURLToPath} from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const runtimeRoot = fileURLToPath(new URL('../dist/', import.meta.url));
const textExtensions = new Set(['.html', '.css', '.js', '.mjs', '.json', '.svg']);
const ignoredDirectories = new Set(['.git','node_modules','qa-screenshots']);
const emojiCodePoint = /\p{Emoji}/u;
const nonEmojiKeycapBase = /^[0-9#*]$/u;

function runtimeFiles(directory) {
  return readdirSync(directory, {withFileTypes:true}).flatMap(entry => {
    if(entry.isDirectory()&&ignoredDirectories.has(entry.name))return [];
    const path = join(directory, entry.name);
    return entry.isDirectory() ? runtimeFiles(path) : textExtensions.has(extname(entry.name)) ? [path] : [];
  });
}

function emojiHits(source) {
  const hits=[];
  for (const [index, character] of [...source].entries()) {
    if (emojiCodePoint.test(character) && !nonEmojiKeycapBase.test(character)) {
      hits.push(`${character} U+${character.codePointAt(0).toString(16).toUpperCase()} @${index}`);
    }
  }
  return hits;
}

test('project UI sources contain no Unicode emoji code points', () => {
  const failures=[];
  for (const file of runtimeFiles(projectRoot)) {
    const hits=emojiHits(readFileSync(file, 'utf8'));
    if (hits.length) failures.push(`${relative(projectRoot,file)}: ${hits.join(', ')}`);
  }
  assert.deepEqual(failures, []);
});

test('SVG assets contain paths rather than Unicode text icons', () => {
  for (const file of runtimeFiles(runtimeRoot).filter(file=>extname(file)==='.svg')) {
    assert.doesNotMatch(readFileSync(file,'utf8'), /<text\b/i, relative(runtimeRoot,file));
  }
});

test('CSS pseudo-elements do not inject text icons', () => {
  const css=readFileSync(new URL('../dist/style.css',import.meta.url),'utf8');
  const values=[...css.matchAll(/(?<![-\w])content\s*:\s*([^;}]+)/g)].map(match=>match[1].trim());
  assert.ok(values.length>0);
  for(const value of values)assert.match(value,/^(?:''|""|none|normal)$/);
});
