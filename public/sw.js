self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",event=>event.waitUntil(self.clients.claim()));
self.addEventListener("fetch",event=>{
 if(event.request.mode!=="navigate" || new URL(event.request.url).origin!==self.location.origin)return;
 event.respondWith(fetch(event.request).catch(()=>new Response('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reconnect to Ataimo</title><body><main><h1>You’re offline.</h1><p>Reconnect to view private messages, consultations and email.</p><a href="/portal">Try again</a></main></body></html>',{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"}})));
});
self.addEventListener("push",event=>{
 let data={};try{data=event.data.json();}catch{}
 const url=typeof data.url==="string"&&/^\/(portal|admin)(\?|$)/.test(data.url)?data.url:"/portal";
 event.waitUntil(self.registration.showNotification("Ataimo workspace",{body:typeof data.body==="string"?data.body:"You have a new workspace update.",icon:"/brand/pwa-192.png",badge:"/brand/pwa-192.png",tag:data.id||"workspace-update",data:{url}}));
});
self.addEventListener("notificationclick",event=>{
 event.notification.close();const target=new URL(event.notification.data.url,self.location.origin).href;
 event.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(async clients=>{for(const client of clients){if(new URL(client.url).origin===self.location.origin){await client.navigate(target);return client.focus();}}return self.clients.openWindow(target);}));
});
