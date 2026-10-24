import type { ReactNode } from 'react';
import Link from '@/app/NavigationLink';
import { legalHref,type LegalDocument } from '@/lib/legal-document';

export function LegalInline({text,depth=0}:{text:string;depth?:number}){
 if(depth>3)return <>{text}</>;
 const parts:ReactNode[]=[];let cursor=0;const pattern=/\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
 for(const match of text.matchAll(pattern)){
  const index=match.index!;if(index>cursor)parts.push(text.slice(cursor,index));
  if(match[1])parts.push(<strong key={index}><LegalInline text={match[1]} depth={depth+1}/></strong>);
  else{const href=legalHref(match[3]);parts.push(href?href.startsWith('/')?<Link href={href} key={index}><LegalInline text={match[2]} depth={depth+1}/></Link>:<a href={href} key={index} {...(/^https?:/.test(href)?{target:'_blank',rel:'noopener noreferrer'}:{})}><LegalInline text={match[2]} depth={depth+1}/></a>:match[0]);}
  cursor=index+match[0].length;
 }
 if(cursor<text.length)parts.push(text.slice(cursor));return <>{parts}</>;
}
export function LegalDocumentContent({document}:{document:LegalDocument}){
 return <><nav className="legal-index" aria-label={`Índice: ${document.title}`}><strong>Contenido</strong><ol>{document.sections.map(section=><li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>)}</ol></nav><div className="legal-sections">{document.sections.map((section,index)=>{
  let subheading=0;
  return <section id={section.id} key={section.id}><h2>{index+1}. {section.title}</h2>{section.blocks.map(block=>{
   if(block.type==='subheading')return <h3 key={block.id}>{block.numbered?`${index+1}.${++subheading}. `:''}<LegalInline text={block.text}/></h3>;
   if(block.type==='list'||block.type==='sources'){const List=block.ordered?'ol':'ul',list=<List>{block.items?.map((item,i)=><li key={i}><LegalInline text={item}/></li>)}</List>;return block.type==='sources'?<div className="legal-sources" key={block.id}><h3><LegalInline text={block.text}/></h3>{list}</div>:<div className="legal-list-block" key={block.id}>{list}</div>;}
   return <p key={block.id} className={block.type==='callout'?'legal-callout':undefined}><LegalInline text={block.text}/></p>;
  })}</section>;
 })}</div></>;
}
