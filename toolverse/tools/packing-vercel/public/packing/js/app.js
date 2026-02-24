const DEFAULT_ITEMS = [
  {name:"Heavy Equip",length:500,height:100,width:60,weight:3000,quantity:15,stackLimit:1,allowRotate:false},
  {name:"Long Parts",length:100,height:30,width:30,weight:50,quantity:20,stackLimit:5,allowRotate:true},
  {name:"Small Parts",length:10,height:10,width:10,weight:1,quantity:100,stackLimit:10,allowRotate:false}
];

document.addEventListener('DOMContentLoaded', () => {
  Viz.init(document.getElementById('canvas-container'));
  DEFAULT_ITEMS.forEach(it => document.getElementById('items-tbody').insertAdjacentHTML('beforeend', createRow(it)));
});

function createRow(it) {
  return '<tr><td><input class="cell-input" type="text" value="'+it.name+'" data-field="name"></td>'
    +'<td><input class="cell-input" type="number" min="1" value="'+it.length+'" data-field="length"></td>'
    +'<td><input class="cell-input" type="number" min="1" value="'+it.height+'" data-field="height"></td>'
    +'<td><input class="cell-input" type="number" min="1" value="'+it.width+'" data-field="width"></td>'
    +'<td><input class="cell-input" type="number" min="0.1" step="0.1" value="'+it.weight+'" data-field="weight"></td>'
    +'<td><input class="cell-input" type="number" min="1" value="'+it.quantity+'" data-field="quantity"></td>'
    +'<td><input class="cell-input" type="number" min="1" value="'+it.stackLimit+'" data-field="stackLimit"></td>'
    +'<td style="text-align:center"><input class="cell-checkbox" type="checkbox" '+(it.allowRotate?'checked':'')+' data-field="allowRotate"></td>'
    +'<td class="status-cell"></td>'
    +'<td><button class="btn-delete" onclick="deleteRow(this)" title="Delete">\u2715</button></td></tr>';
}
function addItemRow() {
  document.getElementById('items-tbody').insertAdjacentHTML('beforeend',
    createRow({name:"New Item",length:50,height:50,width:50,weight:10,quantity:1,stackLimit:5,allowRotate:true}));
}
function deleteRow(btn) { const tb=document.getElementById('items-tbody'); if(tb.rows.length>1) btn.closest('tr').remove(); }

function readTableData() {
  const items = [];
  document.querySelectorAll('#items-tbody tr').forEach(row => {
    const it = {};
    row.querySelectorAll('.cell-input,.cell-checkbox').forEach(inp => {
      const f=inp.dataset.field;
      if(f==='allowRotate') it[f]=inp.checked;
      else if(f==='name') it[f]=inp.value||'Unnamed';
      else it[f]=Math.abs(parseFloat(inp.value))||1;
    });
    if(it.length>0&&it.height>0&&it.width>0&&it.weight>0&&it.quantity>0){
      it.quantity=Math.round(it.quantity); it.stackLimit=Math.round(it.stackLimit)||1; items.push(it);
    }
  });
  return items;
}

function updateTableStatus(ps, us) {
  document.querySelectorAll('#items-tbody tr').forEach(row => {
    const ni=row.querySelector('[data-field="name"]'), sc=row.querySelector('.status-cell');
    if(!ni||!sc) return;
    const name=ni.value, p=ps[name]||0, u=us[name]||0;
    row.classList.remove('row-packed','row-unpacked');
    let h='';
    if(p>0) h+='<span class="badge badge-green">Loaded '+p+'</span> ';
    if(u>0) h+='<span class="badge badge-red">Unloaded '+u+'</span>';
    sc.innerHTML=h;
    if(u===0&&p>0) row.classList.add('row-packed');
    else if(p===0&&u>0) row.classList.add('row-unpacked');
  });
}

async function startPacking() {
  const btn=document.getElementById('btn-pack'); btn.disabled=true;
  const ov=document.getElementById('loading-overlay'); ov.classList.add('active');
  try {
    const items=readTableData();
    if(!items.length){alert('Please add items');return;}
    const result = await api.pack({
      container_type: document.getElementById('container-type').value,
      support_ratio: parseInt(document.getElementById('support-slider').value),
      enable_aggregation: document.getElementById('enable-aggregation').checked,
      items: items,
    });
    const s=result.stats;
    document.getElementById('results-section').style.display='block';
    document.getElementById('stat-packed').textContent=s.packed_count;
    document.getElementById('stat-unpacked').textContent=s.unpacked_count;
    document.getElementById('stat-pack-rate').textContent=s.pack_rate+'%';
    document.getElementById('stat-space-rate').textContent=s.space_utilization+'%';
    document.getElementById('stat-weight').textContent=s.actual_weight+' / '+s.max_weight+' kg';
    document.getElementById('stat-weight-rate').textContent=s.weight_utilization+'%';
    document.getElementById('stat-time').textContent=s.calc_time+'s';
    document.getElementById('stat-cog').textContent=s.cog_offset+'%';
    updateTableStatus(result.packed_summary, result.unpacked_summary);
    Viz.clear(); Viz.renderContainer(result.container); Viz.renderItems(result.packed_items, result.container);
  } catch(err){ alert('Packing error: '+err.message); }
  finally{ ov.classList.remove('active'); btn.disabled=false; }
}
