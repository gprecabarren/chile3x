import { and, eq, ne } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { accountAuthEvents, accountTokens, authSessions, users } from "@/db/schema";
import { readAccountDocument } from "@/lib/account-data";
import { isValidAccountLocation, normalizeAccountCity } from "@/lib/account-locations";
import { readTextForm } from "@/lib/form-body";
import type { AccountSaveFeedback, AccountSavedField, AccountSaveError } from "@/lib/account-save-feedback";
import { assertSameOrigin, getCurrentUser, hashPassword } from "@/lib/auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";
import { AccountUsernameError, assertAccountUsernameAvailable, validateAccountUsername } from "@/lib/account-username";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Solicitud no válida.", { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return request.headers.get("accept")?.includes("application/json") ? NextResponse.json({error:"Tu sesión venció o no corresponde a una cuenta normal. Ingresa nuevamente."},{status:401}) : NextResponse.redirect(new URL("/ingresar?return_to=/mi-cuenta/datos-personales", request.url), 303);

  let formData: FormData;
  try { formData = await readTextForm(request); } catch { return NextResponse.json({error:"No se pudo leer el formulario. Recarga e inténtalo nuevamente."},{status:400}); }
  const action = formData.get("action");
  const db = await getDb();

  if (action === "change_username") {
    let username: string;
    try {
      username = validateAccountUsername(String(formData.get("username") ?? ""));
    } catch {
      return NextResponse.redirect(new URL("/mi-cuenta?notice=username_invalid", request.url), 303);
    }
    try {
      await assertAccountUsernameAvailable(username, user.id);
      await db.update(users).set({ username }).where(eq(users.id, user.id));
    } catch (error) {
      const taken = error instanceof AccountUsernameError || /UNIQUE constraint failed: users.username/.test(String(error));
      return NextResponse.redirect(new URL(`/mi-cuenta?notice=${taken ? "username_taken" : "username_error"}`, request.url), 303);
    }
    return NextResponse.redirect(new URL("/mi-cuenta?notice=username_saved", request.url), 303);
  }

  if (action === "change_password") {
    const password = typeof formData.get("password") === "string" ? String(formData.get("password")) : "";
    const confirmation = typeof formData.get("password_confirmation") === "string" ? String(formData.get("password_confirmation")) : "";
    if (password.length < MIN_PASSWORD_LENGTH || password.length > 256 || password !== confirmation) {
      return NextResponse.redirect(new URL("/mi-cuenta/datos-personales?notice=password_error", request.url), 303);
    }
    const sessionToken = (await cookies()).get("chile3x_user_session")?.value;
    const currentSessionId = sessionToken?.split(".")[0];
    const [current] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, user.id)).limit(1);
    await db.batch([
      db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, user.id)),
      db.insert(accountAuthEvents).values({ id: `auth_event_${crypto.randomUUID()}`, userId: user.id, provider: "password", action: current?.passwordHash ? "password_changed" : "password_created", createdAt: new Date().toISOString() }),
    ]);
    if (currentSessionId) {
      await db.delete(authSessions).where(and(eq(authSessions.userId, user.id), ne(authSessions.id, currentSessionId)));
    }
    await db.delete(accountTokens).where(and(eq(accountTokens.userId, user.id), eq(accountTokens.purpose, "reset_password")));
    return NextResponse.redirect(new URL("/mi-cuenta/datos-personales?notice=password_saved", request.url), 303);
  }

  const [current] = await db.select().from(users).where(eq(users.id,user.id)).limit(1);
  if (!current) return NextResponse.json({error:"La cuenta ya no está disponible."},{status:401});
  const result:AccountSaveFeedback={updated:[],errors:[]};
  const value=(key:string)=>String(formData.get(key)??"").trim();
  const basic:Partial<typeof users.$inferInsert>={};const basicFields:AccountSavedField[]=[];
  const fail=(error:AccountSaveError)=>{if(!result.errors.includes(error))result.errors.push(error);};
  const displayName=value("display_name"), fullName=value("full_name"), phone=value("phone"), city=normalizeAccountCity(value("account_city"));
  if(displayName.length<2||displayName.length>80)fail('displayName');else if(displayName!==current.displayName){basic.displayName=displayName;basicFields.push('displayName');}
  if(fullName.length>160)fail('fullName');else if(fullName!==(current.firstName??'')||current.lastName){basic.firstName=fullName||null;basic.lastName=null;basicFields.push('fullName');}
  if(phone.length>40)fail('phone');else if(phone!==(current.phone??'')){basic.phone=phone||null;basicFields.push('phone');}
  if(!isValidAccountLocation(value('account_region'),city))fail('city');else if(city!==current.city){basic.city=city;basicFields.push('city');}
  if(value('birth_date')!==current.birthDate)fail('birthDate');
  if(basicFields.length)try{await db.update(users).set(basic).where(eq(users.id,user.id));result.updated.push(...basicFields);}catch{fail('save_error');}
  let username:string|null=null;
  try { username=validateAccountUsername(value('username')); } catch { fail('username_invalid'); }
  if(username!==null&&username!==current.username)try{await assertAccountUsernameAvailable(username,user.id);await db.update(users).set({username}).where(eq(users.id,user.id));result.updated.push('username');}
  catch(error){fail(error instanceof AccountUsernameError||/UNIQUE/.test(String(error))?'username_taken':'username_error');}
  const document=readAccountDocument(formData);
  if(!document)fail('document');else if(document.documentType!==current.documentType||document.documentNumber!==current.documentNumber||document.foreignCountry!==current.foreignCountry){
    try {
      if(document.documentType==='rut'&&document.documentNumber){const [duplicate]=await db.select({id:users.id}).from(users).where(and(eq(users.documentType,'rut'),eq(users.documentNumber,document.documentNumber),ne(users.id,user.id))).limit(1);if(duplicate)fail('document_taken');}
      if(!result.errors.includes('document_taken')){await db.update(users).set(document).where(eq(users.id,user.id));result.updated.push('document');}
    }catch{fail('document');}
  }
  if(request.headers.get('accept')?.includes('application/json'))return NextResponse.json(result,{headers:{'cache-control':'private, no-store'}});
  const destination=new URL('/mi-cuenta/datos-personales',request.url);destination.searchParams.set('notice','details_result');destination.searchParams.set('updated',result.updated.join(','));destination.searchParams.set('errors',result.errors.join(','));
  return NextResponse.redirect(destination,303);
}
