import SettingsPage from "@/app/admin/configuracion/[section]/page";
export default function Page({searchParams}:{searchParams:Promise<{saved?:string}>}) { return SettingsPage({params:Promise.resolve({section:"seo"}),searchParams,contentRoute:true}); }
