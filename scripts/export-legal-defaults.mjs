// Read-only, mechanical export of the original JSX legal documents.
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const revision=process.argv[2];if(revision&&!/^[\w/-]+$/.test(revision))throw Error('Invalid revision');
const element=node=>ts.isJsxElement(node),tag=node=>node.openingElement.tagName.getText();
function attr(node,name){const value=node.openingElement.attributes.properties.find(item=>item.name?.getText()===name)?.initializer;return value&&ts.isStringLiteral(value)?value.text:value;}
function children(node){return node.children??[];}
function inline(node){
 if(ts.isJsxText(node))return node.text.replace(/\s+/g,' ');
 if(ts.isJsxExpression(node)){if(!node.expression)return '';return inline(node.expression);}
 if(ts.isJsxFragment(node))return children(node).map(inline).join('');
 if(ts.isStringLiteral(node))return node.text;
 if(element(node)){const value=children(node).map(inline).join('');if(tag(node)==='strong')return '**'+value+'**';if(['a','Link'].includes(tag(node)))return '['+value.trim()+']('+attr(node,'href')+')';return value;}
 throw Error('Unsupported inline node '+ts.SyntaxKind[node.kind]);
}
function blocks(parent){return children(parent).flatMap((node,index)=>{
 if(ts.isJsxText(node)&&!node.text.trim())return [];
 if(!element(node))throw Error('Unsupported block '+ts.SyntaxKind[node.kind]);
 const id='block-'+index,name=tag(node);
 if(name==='p')return [{id,type:attr(node,'className')==='legal-callout'?'callout':'paragraph',text:inline(node).trim()}];
 if(name==='h3')return [{id,type:'subheading',text:inline(node).trim().replace(/^\d+\.\d+\.\s*/,''),numbered:/^\d+\.\d+\./.test(inline(node).trim())}];
 if(['ul','ol'].includes(name))return [{id,type:'list',text:'',items:children(node).filter(element).map(item=>inline(item).trim()),ordered:name==='ol'}];
 if(name==='div'&&attr(node,'className')==='legal-sources'){const nodes=children(node).filter(element);return [{id,type:'sources',text:inline(nodes.find(item=>tag(item)==='h3')).trim(),items:children(nodes.find(item=>tag(item)==='ul')).filter(element).map(item=>inline(item).trim())}];}
 throw Error('Unsupported block '+name);
});}
function parse(path){
 const source=revision?execFileSync('git',['show',revision+':'+path],{encoding:'utf8',windowsHide:true}):readFileSync(path,'utf8');
 const root=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let page;
 function visit(node){if(element(node)&&tag(node)==='LegalPage')page=node;ts.forEachChild(node,visit);}visit(root);
 const sections=children(page).filter(node=>element(node)&&tag(node)==='section').map(node=>{
  const heading=children(node).find(item=>element(item)&&tag(item)==='h2');
  return {id:attr(node,'id'),title:inline(heading).trim().replace(/^\d+\.\s*/,''),blocks:blocks({...node,children:children(node).filter(item=>item!==heading)})};
 });
 const description=source.match(/description: "([^"]+)"/)?.[1];
 const value=name=>{const v=attr(page,name);return typeof v==='string'?v:v?inline(v).trim():'';};
 return {title:value('title'),description,summary:value('summary'),notice:value('notice'),sections};
}
console.log(JSON.stringify({terms:parse('app/terminos/page.tsx'),privacy:parse('app/privacidad/page.tsx')}));
