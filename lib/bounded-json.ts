export class RequestBodyError extends Error{readonly status:number;constructor(message:string,status=400){super(message);this.status=status;}}
export async function readBoundedJson(request:Request,maxBytes=240_000):Promise<unknown>{
 if(!request.headers.get('content-type')?.includes('application/json'))throw new RequestBodyError('Formato no admitido.',415);
 const length=request.headers.get('content-length');if(length&&Number(length)>maxBytes)throw new RequestBodyError('El documento supera el tamaño permitido.',413);
 if(!request.body)throw new RequestBodyError('El documento llegó vacío.');
 const reader=request.body.getReader(),chunks:Uint8Array[]=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>maxBytes){await reader.cancel();throw new RequestBodyError('El documento supera el tamaño permitido.',413);}chunks.push(value);}}
 finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw new RequestBodyError('No se pudo leer el documento.');}
}
