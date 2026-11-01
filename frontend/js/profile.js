(() => {
const $=id=>document.getElementById(id);
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const feedback=(el,msg,type="")=>{el.textContent=msg;el.className="feedback "+type};
const busy=(form,on)=>{form.querySelector("button").disabled=on};
async function loadProgress(){
try{
const [pr,qr]=await Promise.all([fetch("/api/questions/progress"),fetch("/que.html")]);
if(!pr.ok||!qr.ok)throw new Error("Unable to load your saved progress.");
const data=await pr.json(),doc=new DOMParser().parseFromString(await qr.text(),"text/html");
const topics=Array.from(doc.querySelectorAll(".quegrid-item")).map(group=>{
const category=group.querySelector(".aman1 h1").textContent.trim();
return {category,ids:Array.from(group.querySelectorAll(".aman11 li a")).map(a=>slug(category)+"--"+slug(a.textContent.trim()))};
});
const solved=new Set(data.solvedQuestionIds||[]),ids=topics.flatMap(t=>t.ids),done=ids.filter(id=>solved.has(id)).length,total=ids.length,pct=total?Math.round(done/total*100):0;
$("solved-count").textContent=done;$("total-count").textContent=total;$("remaining-count").textContent=Math.max(0,total-done);
$("progress-percent").textContent=pct+"%";$("progress-caption").textContent=done+" out of "+total+" questions completed";$("overall-progress").style.width=pct+"%";
$("topic-progress").replaceChildren();
topics.forEach(t=>{const n=t.ids.filter(id=>solved.has(id)).length,p=t.ids.length?Math.round(n/t.ids.length*100):0,row=document.createElement("div"),meta=document.createElement("div"),name=document.createElement("strong"),value=document.createElement("span"),track=document.createElement("div"),fill=document.createElement("div");
row.className="topic-row";meta.className="topic-meta";name.textContent=t.category;value.textContent=n+"/"+t.ids.length;meta.append(name,value);track.className="topic-track";fill.className="topic-fill";fill.style.width=p+"%";track.append(fill);row.append(meta,track);$("topic-progress").append(row)});
}catch(e){feedback($("progress-error"),e.message,"error")}
}
$("username-form").addEventListener("submit",async e=>{e.preventDefault();const form=e.currentTarget;busy(form,true);feedback($("username-feedback"),"Saving…");try{const r=await fetch("/api/profile/username",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:$("new-username").value.trim()})}),d=await r.json();if(!r.ok)throw Error(d.error||"Unable to update username.");$("profile-username").textContent=d.username;$("new-username").value=d.username;feedback($("username-feedback"),d.message,"success")}catch(err){feedback($("username-feedback"),err.message,"error")}finally{busy(form,false)}});
$("password-form").addEventListener("submit",async e=>{e.preventDefault();const form=e.currentTarget;busy(form,true);feedback($("password-feedback"),"Updating…");try{const r=await fetch("/api/profile/password",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({currentPassword:$("current-password").value,newPassword:$("new-password").value,confirmPassword:$("confirm-password").value})}),d=await r.json();if(!r.ok)throw Error(d.error||"Unable to change password.");form.reset();feedback($("password-feedback"),d.message,"success")}catch(err){feedback($("password-feedback"),err.message,"error")}finally{busy(form,false)}});
loadProgress();
})();