function escHTML(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function postMedia(p){
 let h="";
 if(p.media_url){
  if(p.media_type==="image")h='<img class="post-display-image" src="'+p.media_url+'" alt="">';
  else if(p.media_type==="video")h='<video class="post-display-video" controls src="'+p.media_url+'"></video>';
  else h='<a class="file-link" href="'+p.media_url+'" target="_blank" rel="noopener">📎 Open attached media/file →</a>';
 }
 if(p.facebook_url)h+='<a class="facebook-post-btn" href="'+p.facebook_url+'" target="_blank" rel="noopener">View original post on Facebook →</a>';
 return h;
}
