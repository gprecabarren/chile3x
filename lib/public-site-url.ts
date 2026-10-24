export function publicSiteOrigin(value:string) {
  try{
    const url=new URL(value);
    if(url.protocol!=="https:"||url.username||url.password||url.port||url.pathname!=="/"||url.search||url.hash)return null;
    if(!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(url.hostname)||/\.(?:local|localhost|internal|test|invalid|example)$/i.test(url.hostname))return null;
    return url.origin;
  }catch{return null;}
}
