import type { Instrumentation } from "next";

// Production RSC failures can occur after a 200 streaming response starts.
// Record a bounded diagnostic without cookies, request bodies or SQL params.
export const onRequestError: Instrumentation.onRequestError = (error,request,context) => {
  const details:string[]=[];let cause:unknown=error;
  for(let depth=0;depth<4&&cause;depth++){
    const message=cause instanceof Error?cause.message:String(cause);
    details.push(message.split(/\nparams:|\nparameters:/i)[0].replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi,"[correo]").slice(0,1800));
    cause=cause instanceof Error?cause.cause:null;
  }
  console.error("Portal render failed",{path:request.path.split('?')[0],route:context.routePath,details});
};
