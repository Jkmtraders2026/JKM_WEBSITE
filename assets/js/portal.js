'use strict';
(() => {
 const config = window.JKM_CONFIG || {}; const login = document.getElementById('portal-login'); const dashboard = document.getElementById('portal-dashboard');
 const loginStatus = document.getElementById('login-status'); const dashboardStatus = document.getElementById('dashboard-status');
 if (!config.supabaseUrl || !config.supabasePublishableKey || !window.supabase) { loginStatus.textContent = 'Staff access is being connected. Please contact the JKM administrator.'; document.querySelector('#login-form button').disabled = true; return; }
 const db = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
 let requests = []; let loadGeneration = 0;
 const textNode = (tag, text, className) => { const node = document.createElement(tag); node.textContent = text; if (className) node.className = className; return node; };
 function render() {
  const list = document.getElementById('requests-list'); list.replaceChildren();
  const filter = document.getElementById('status-filter').value;
  const shown = requests.filter(row => filter === 'all' || row.status === filter);
  dashboardStatus.textContent = `${shown.length} request(s) shown. Latest 100 requests loaded.`;
  shown.forEach(row => {
   const detail = document.createElement('details'); detail.className = 'request-row'; const summary = document.createElement('summary');
   summary.append(textNode('h3', `${row.reference} · ${row.full_name}`), textNode('span', row.status, 'badge')); detail.append(summary);
   const info = document.createElement('dl');
   for (const [key, value] of Object.entries({Submitted: new Date(row.created_at).toLocaleString(), Company:row.company, Email:row.email, Phone:row.phone, Service:row.service, Product:row.product, Quantity:row.quantity, Origin:row.origin, Destination:row.destination, Timeline:row.timeline})) {
    const group = document.createElement('div'); group.append(textNode('dt', key), textNode('dd', value || '—')); info.append(group);
   }
   detail.append(info, textNode('p', row.message));
   const attachments = document.createElement('div'); attachments.className = 'attachments';
   for (const file of row.attachments || []) {
    const button = textNode('button', file.name, 'button secondary'); button.type = 'button';
    button.addEventListener('click', async () => {
     button.disabled = true;
     try { const {data,error} = await db.storage.from('request-files').createSignedUrl(file.path,60); if(error) throw error;
      const link = document.createElement('a'); link.href=data.signedUrl; link.target='_blank'; link.rel='noopener noreferrer'; link.textContent='Open '+file.name+' ↗'; button.replaceWith(link);
     } catch { dashboardStatus.textContent='Unable to open attachment. Check your access or retry.'; } finally {button.disabled=false;}
    }); attachments.append(button);
   }
   detail.append(attachments);
   const label = textNode('label','Request status'); const select = document.createElement('select');
   ['new','reviewing','quoted','closed'].forEach(status => {const option=textNode('option',status); option.value=status; select.append(option);}); select.value=row.status;
   select.addEventListener('change', async () => {
    select.disabled=true; const previous=row.status;
    const {data,error}=await db.from('website_requests').update({status:select.value}).eq('id',row.id).select('id,status').single();
    if(error || !data) {select.value=previous; dashboardStatus.textContent='Status could not be saved. Please retry.';}
    else {row.status=data.status; summary.querySelector('.badge').textContent=data.status; dashboardStatus.textContent='Status saved.';}
    select.disabled=false;
   }); label.append(select); detail.append(label); list.append(detail);
  });
 }
 async function loadRequests() {
  const generation=++loadGeneration; dashboardStatus.textContent='Loading requests…';
  const {data,error}=await db.from('website_requests').select('*').order('created_at',{ascending:false}).limit(100);
  if(generation!==loadGeneration) return;
  if(error) {dashboardStatus.textContent='Unable to load requests. Check your connection and staff access.'; return;}
  requests=data || []; render();
 }
 async function showSession(session) {
  const generation=++loadGeneration;
  if(!session) {requests=[]; document.getElementById('requests-list').replaceChildren();login.hidden=false;dashboard.hidden=true;return;}
  const {data,error}=await db.from('staff_members').select('user_id').eq('user_id',session.user.id).maybeSingle();
  if(generation!==loadGeneration) return;
  if(error || !data) {login.hidden=false; dashboard.hidden=true;loginStatus.textContent='This account does not have staff access. Contact the JKM administrator.';await db.auth.signOut();return;}
  login.hidden=true; dashboard.hidden=false; await loadRequests();
 }
 document.getElementById('login-form').addEventListener('submit',async event => {
  event.preventDefault(); const button=event.target.querySelector('button');button.disabled=true;loginStatus.textContent='Signing in…';
  try {const data=new FormData(event.target);const {data:result,error}=await db.auth.signInWithPassword({email:data.get('email'),password:data.get('password')}); if(error) throw error;event.target.reset();loginStatus.textContent='';await showSession(result.session);}
  catch {loginStatus.textContent='Could not sign in. Check your details and try again.';} finally {button.disabled=false;}
 });
 document.getElementById('logout').addEventListener('click',async()=>{await db.auth.signOut();await showSession(null);});
 document.getElementById('status-filter').addEventListener('change',render);
 document.getElementById('refresh').addEventListener('click',loadRequests);
 db.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT') showSession(null);});
 db.auth.getSession().then(({data})=>showSession(data.session));
})();
