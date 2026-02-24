// =============================================
// 3D Visualization Module
// =============================================
const ITEM_COLORS = { 'Heavy Equip': 0xf59e0b, 'Long Parts': 0xef4444, 'Small Parts': 0x3b82f6 };
const DEFAULT_COLOR = 0x8b5cf6;
const COLOR_PALETTE = [0xf59e0b, 0xef4444, 0x3b82f6, 0x8b5cf6, 0x10b981, 0xec4899, 0x14b8a6, 0xf97316, 0x06b6d4, 0x84cc16];

let scene, camera, renderer, controls, raycaster, mouse;
let itemMeshes = [], containerGroup, autoRotate = false, currentContainerDims = null;

function initThreeJS() {
  const el = document.getElementById('canvas-container');
  const w = el.clientWidth, h = el.clientHeight;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xfafafa);
  camera = new THREE.PerspectiveCamera(60, w / h, 1, 50000);
  camera.position.set(1500, 1000, 1500);
  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  el.appendChild(renderer.domElement);
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const dl = new THREE.DirectionalLight(0xffffff, 0.5);
  dl.position.set(1000, 1200, 800); dl.castShadow = true; scene.add(dl);
  const grid = new THREE.GridHelper(2500, 25, 0xe5e7eb, 0xf3f4f6);
  grid.position.y = -1; scene.add(grid);
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.05;
  controls.minDistance = 100; controls.maxDistance = 15000;
  raycaster = new THREE.Raycaster(); mouse = new THREE.Vector2();
  addCoordinateAxes();
  containerGroup = new THREE.Group(); scene.add(containerGroup);
  renderer.domElement.addEventListener('mousemove', onMouseMove);
  window.addEventListener('resize', onResize);
  (function animate() { requestAnimationFrame(animate); if (autoRotate && containerGroup) containerGroup.rotation.y += 0.003; controls.update(); renderer.render(scene, camera); })();
}

function makeTextSprite(text, color, fs) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const ctx = c.getContext('2d'); ctx.font = 'Bold '+(fs||32)+'px Arial';
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 128, 32);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c) }));
  s.scale.set(200, 50, 1); return s;
}

function addCoordinateAxes() {
  [{c:0xff0000,d:'x',l:'X (Length)',p:[650,0,0]},{c:0x00ff00,d:'y',l:'Y (Height)',p:[0,650,0]},{c:0x0000ff,d:'z',l:'Z (Width)',p:[0,0,650]}].forEach(a => {
    const mat = new THREE.MeshBasicMaterial({color:a.c});
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(3,3,600,8), mat);
    if(a.d==='x'){cyl.rotation.z=-Math.PI/2;cyl.position.set(300,0,0)}
    else if(a.d==='y'){cyl.position.set(0,300,0)}
    else{cyl.rotation.x=Math.PI/2;cyl.position.set(0,0,300)}
    scene.add(cyl);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(8,24,8), mat);
    if(a.d==='x'){cone.rotation.z=-Math.PI/2;cone.position.set(612,0,0)}
    else if(a.d==='y'){cone.position.set(0,612,0)}
    else{cone.rotation.x=Math.PI/2;cone.position.set(0,0,612)}
    scene.add(cone);
    const sp = makeTextSprite(a.l, '#'+a.c.toString(16).padStart(6,'0'));
    sp.position.set(...a.p); scene.add(sp);
  });
}

function onResize() {
  const c = document.getElementById('canvas-container');
  const w = c.clientWidth, h = c.clientHeight;
  if(!w||!h) return; camera.aspect=w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h);
}

function onMouseMove(e) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX-rect.left)/rect.width)*2-1;
  mouse.y = -((e.clientY-rect.top)/rect.height)*2+1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(itemMeshes, false);
  const tip = document.getElementById('tooltip');
  if (hits.length > 0) {
    const d = hits[0].object.userData;
    if (d && d.name) {
      tip.style.display = 'block';
      tip.style.left = (e.clientX+15)+'px'; tip.style.top = (e.clientY+15)+'px';
      tip.querySelector('.tip-name').textContent = d.name;
      let html = 'Size: '+d.origL+'\u00d7'+d.origH+'\u00d7'+d.origW+' cm<br>Weight: '+d.weight+' kg<br>Pos: ('+d.x+', '+d.y+', '+d.z+')';
      if (d.stackLayer !== undefined) html += '<br>Stack: Layer '+d.stackLayer+' / Max '+d.stackMax;
      if (d.aggCount > 1) html += '<br>Aggregated: '+d.aggCount+' pcs';
      tip.querySelector('.tip-details').innerHTML = html;
      return;
    }
  }
  tip.style.display = 'none';
}

function getColor(name, idx) { return ITEM_COLORS[name] || COLOR_PALETTE[idx % COLOR_PALETTE.length] || DEFAULT_COLOR; }

function clearScene() {
  while(containerGroup.children.length>0) {
    const c=containerGroup.children[0];
    if(c.geometry)c.geometry.dispose();
    if(c.material){if(Array.isArray(c.material))c.material.forEach(m=>m.dispose());else c.material.dispose();}
    containerGroup.remove(c);
  }
  itemMeshes=[]; containerGroup.rotation.y=0;
}

function renderContainer(d) {
  const geo=new THREE.BoxGeometry(d.length,d.height,d.width);
  const line=new THREE.LineSegments(new THREE.EdgesGeometry(geo),new THREE.LineBasicMaterial({color:0x9ca3af}));
  line.position.set(d.length/2,d.height/2,d.width/2);
  containerGroup.add(line);
  const fg=new THREE.PlaneGeometry(d.length,d.width);
  const fm=new THREE.Mesh(fg,new THREE.MeshBasicMaterial({color:0xe5e7eb,transparent:true,opacity:0.15,side:THREE.DoubleSide}));
  fm.rotation.x=-Math.PI/2; fm.position.set(d.length/2,.5,d.width/2);
  containerGroup.add(fm);
  const lc='#6b7280';
  const ls=makeTextSprite(d.length+' cm',lc,28); ls.scale.set(180,45,1); ls.position.set(d.length/2,-30,d.width+40); containerGroup.add(ls);
  const hs=makeTextSprite(d.height+' cm',lc,28); hs.scale.set(160,40,1); hs.position.set(-50,d.height/2,d.width+40); containerGroup.add(hs);
  const ws=makeTextSprite(d.width+' cm',lc,28); ws.scale.set(160,40,1); ws.position.set(-50,-30,d.width/2); containerGroup.add(ws);
}

function renderItems(packed, cd) {
  const names=[...new Set(packed.map(i=>i.name))];
  const ncm={}; names.forEach((n,i)=>{ncm[n]=i;});

  packed.forEach(item => {
    const color = getColor(item.name, ncm[item.name]);
    const minD = Math.min(item.l, item.h, item.w);
    const geo = new THREE.BoxGeometry(item.l - 0.5, item.h - 0.5, item.w - 0.5);
    const mat = new THREE.MeshStandardMaterial({ color, metalness:0.15, roughness:0.75 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(item.x+item.l/2, item.y+item.h/2, item.z+item.w/2);
    mesh.castShadow=true; mesh.receiveShadow=true;

    mesh.userData = {
      name:item.name, origL:item.origL, origH:item.origH, origW:item.origW,
      weight:item.wt, x:Math.round(item.x), y:Math.round(item.y), z:Math.round(item.z),
      aggCount:item.aggCnt||1, stackLayer:item.stackLayer, stackMax:item.stackLimit
    };
    containerGroup.add(mesh); itemMeshes.push(mesh);

    if(minD > 5) {
      const opacity = minD > 40 ? 0.25 : (minD > 15 ? 0.18 : 0.1);
      const el = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo),
        new THREE.LineBasicMaterial({color:0x000000,transparent:true,opacity})
      );
      el.position.copy(mesh.position);
      containerGroup.add(el);
    }
  });

  containerGroup.position.set(-cd.length/2, 0, -cd.width/2);
  updateLegend(names, ncm);
  updateDimLabels(cd);
  autoFitCamera(cd);
}

function autoFitCamera(d) {
  currentContainerDims = d;
  const maxD = Math.max(d.length, d.height, d.width);
  const dist = maxD * 1.5;
  camera.position.set(dist*0.9, dist*0.55, dist*0.9);
  controls.target.set(0, d.height*0.3, 0);
  camera.near=1; camera.far=maxD*10;
  camera.updateProjectionMatrix(); controls.update();
}

function updateLegend(names, ncm) {
  const p=document.getElementById('legend-panel'), c=document.getElementById('legend-items');
  if(!names.length){p.style.display='none';return;}
  p.style.display='block';
  c.innerHTML=names.map(n=>{
    const hex='#'+getColor(n,ncm[n]).toString(16).padStart(6,'0');
    return '<div class="legend-item"><div class="legend-swatch" style="background:'+hex+'"></div><span>'+n+'</span></div>';
  }).join('');
}

function updateDimLabels(d) {
  const el=document.getElementById('dim-labels'); el.style.display='block';
  el.innerHTML='Container: <b>'+d.length+'</b>\u00d7<b>'+d.height+'</b>\u00d7<b>'+d.width+'</b> cm | Max Wt: <b>'+d.maxWeight+'</b> kg';
}

function resetCamera(){ autoFitCamera(currentContainerDims||{length:1203,height:269,width:235,maxWeight:28500}); }
function toggleAutoRotate(){ autoRotate=!autoRotate; document.getElementById('btn-rotate').classList.toggle('active',autoRotate); }
function takeScreenshot(){ renderer.render(scene,camera); const a=document.createElement('a'); a.download='packing-'+Date.now()+'.png'; a.href=renderer.domElement.toDataURL('image/png'); a.click(); }
