const API = '';

async function api(path, opts={}){
  const res = await fetch((API||'') + path, opts);
  if(!res.ok) throw new Error(await res.text());
  return res.json();
}

function show(msg){ document.getElementById('loginMsg').innerText = msg; }

document.getElementById('loginBtn').onclick = ()=>{
  const e=document.getElementById('email').value, p=document.getElementById('password').value;
  if(e==='hsengineering.40@gmail.com' && p==='haadi.mmf'){
    document.getElementById('login').style.display='none';
    document.getElementById('app').style.display='block';
    loadLabours();
  } else show('Invalid creds');
};

async function loadLabours(){
  try{
    const labs = await api('/api/labours');
    const tbody = document.querySelector('#labTable tbody');
    tbody.innerHTML='';
    const selects = ['attLab','calcLab','payLab'];
    selects.forEach(id=> document.getElementById(id).innerHTML='');
    labs.forEach(l=>{
      const tr=document.createElement('tr');
      tr.innerHTML=`<td>${l.name}</td><td>${l.hourly_rate}</td><td>${l.shift||''}</td><td><button data-id="${l.id}" class="del">Delete</button></td>`;
      tbody.appendChild(tr);
      selects.forEach(id=>{
        const opt=document.createElement('option'); opt.value=l.id; opt.innerText=l.name; document.getElementById(id).appendChild(opt);
      });
    });
  }catch(e){ console.error(e); alert('Failed to load labours'); }
}

document.getElementById('addLab').onclick = async ()=>{
  const name=document.getElementById('ln').value, rate=document.getElementById('lr').value, shift=document.getElementById('ls').value;
  if(!name) return alert('Enter name');
  await api('/api/labours', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name, hourly_rate: rate, shift }) });
  document.getElementById('ln').value=''; document.getElementById('lr').value=''; document.getElementById('ls').value='';
  loadLabours();
};

document.getElementById('markAtt').onclick = async ()=>{
  const labour_id=document.getElementById('attLab').value, date=document.getElementById('attDate').value, hours=document.getElementById('attHours').value;
  if(!labour_id) return alert('Select labour');
  await api('/api/attendance', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ labour_id, date, hours }) });
  alert('Attendance marked');
};

document.getElementById('calcBtn').onclick = async ()=>{
  const labour_id=document.getElementById('calcLab').value, from=document.getElementById('from').value, to=document.getElementById('to').value;
  if(!labour_id) return alert('Select labour');
  const res = await api('/api/calc-wages', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ labour_id, from, to }) });
  document.getElementById('calcResult').innerText = JSON.stringify(res, null, 2);
};

document.getElementById('payBtn').onclick = async ()=>{
  const labour_id=document.getElementById('payLab').value, amount=document.getElementById('payAmount').value, date=document.getElementById('payDate').value;
  if(!labour_id || !amount) return alert('Select labour and amount');
  await api('/api/payments', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ labour_id, amount, date }) });
  alert('Payment recorded');
  loadPayments(labour_id);
};

async function loadPayments(labour_id){
  if(!labour_id) return;
  const rows = await api('/api/payments?labour_id='+labour_id);
  document.getElementById('paymentsList').innerText = JSON.stringify(rows, null, 2);
}

document.addEventListener('click', async (e)=>{
  if(e.target.classList.contains('del')){
    const id=e.target.dataset.id;
    // simple delete - not implemented on backend to keep package small
    alert('To delete, you can remove from data/database.json manually.');
  }
});
