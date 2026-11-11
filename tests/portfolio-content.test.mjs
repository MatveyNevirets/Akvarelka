import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Window} from 'happy-dom';

const root=fileURLToPath(new URL('../dist/',import.meta.url));
const files=directory=>readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(join(directory,entry.name)):[join(directory,entry.name)]);
const originalPhotos=new Set([
  '2a085bee067a54e20627a738ac71f1f2a8868ade3a511524a52233070bba0075',
  '0e295e9dd216aa5e66ba3afd11c8b4a78b63f29d93e8311f2e58bae037f81342'
]);

test('public build contains only demo photos and no original image bytes',()=>{
  const assets=readdirSync(join(root,'assets')).sort();
  assert.deepEqual(assets,['classroom.jpg','creative.jpg','favicon-outline.svg']);
  for(const file of files(root)){
    const digest=createHash('sha256').update(readFileSync(file)).digest('hex');
    assert.equal(originalPhotos.has(digest),false,relative(root,file));
  }
});

test('public links remain local and visible phone numbers use demo digits',()=>{
  const window=new Window();
  try{
    window.document.write(readFileSync(join(root,'index.html'),'utf8'));
    const document=window.document;
    for(const anchor of document.querySelectorAll('a[href]')){
      assert.match(anchor.getAttribute('href'),/^#/,'Contact and social links must not leave the demo');
    }
    for(const phone of document.querySelectorAll('.phone'))assert.equal(phone.textContent,'+7 (999) 999 99 99');
    assert.match(document.title,/Мел и Маяк/);
    assert.match(document.querySelector('address').textContent,/Краснодар/);
    assert.doesNotMatch(document.documentElement.outerHTML,/демо|сгенер|вымышлен|портфолио/i);
    for(const meta of document.querySelectorAll('meta[property^="og:"],meta[name^="twitter:"]')){
      assert.doesNotMatch(meta.content,/https?:\/\//);
    }
    assert.match(document.querySelector('meta[property="og:image"]').content,/classroom\.jpg$/);
  }finally{window.close();}
});
