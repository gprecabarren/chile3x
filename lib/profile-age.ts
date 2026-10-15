export function publicProfileAge(type:string,metadata:Record<string,string>){
 const value=typeof metadata?.age==='string'?metadata.age.trim():'';if(type!=='escort'||!value||!/^\d{2}$/.test(value))return null;
 const age=Number(value);return age>=18&&age<=99?age:null;
}
