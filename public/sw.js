/* Push only: no fetch handler and no caching of authenticated pages. */
self.addEventListener("push",event=>{
 let payload={};try{payload=event.data?.json()??{}}catch{/* Use the generic message. */}
 const allowed=["Tienes un recordatorio para hoy.","Tienes un recordatorio pendiente por revisar.","Se acerca la fecha de un recordatorio.","Un recordatorio alcanzó el kilometraje previsto.","Las notificaciones de este dispositivo están funcionando."];
 let path="/notifications";try{const url=new URL(payload.url,self.location.origin);if(url.origin===self.location.origin&&(/^\/reminders\/[0-9a-f-]{36}$/i.test(url.pathname)||url.pathname==="/notifications"))path=url.pathname}catch{/* Keep the inbox destination. */}
 event.waitUntil(self.registration.showNotification("Casa & Finanzas",{body:allowed.includes(payload.message)?payload.message:"Tienes un recordatorio por revisar.",icon:"/icon",badge:"/icon",tag:typeof payload.tag==="string"?payload.tag.slice(0,100):"cf-reminder",data:{path}}));
});
self.addEventListener("notificationclick",event=>{event.notification.close();const path=event.notification.data?.path;const url=new URL(typeof path==="string"&&path.startsWith("/")&&!path.startsWith("//")?path:"/notifications",self.location.origin);if(url.origin!==self.location.origin)return;event.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(async windows=>{for(const win of windows){if(new URL(win.url).origin===self.location.origin){await win.navigate(url.href);return win.focus()}}return self.clients.openWindow(url.href)}))});
