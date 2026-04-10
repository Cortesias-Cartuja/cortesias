const firebaseConfig = {
  apiKey: "AIzaSyAeejUNvRX3KvmHMgKUff5vTS44-_UGCSg",
  authDomain: "cortesias-4235e.firebaseapp.com",
  databaseURL: "https://cortesias-4235e-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "cortesias-4235e",
  storageBucket: "cortesias-4235e.firebasestorage.app",
  messagingSenderId: "45340224860",
  appId: "1:45340224860:web:69c15fc56fc5a04ab76599"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
let listaCochesGlobal = {};

// Sincronizar coches y asesores
db.ref('coches').on('value', snap => {
  listaCochesGlobal = snap.val() || {};
  const sSal = document.getElementById('p-veh-select');
  const sEnt = document.getElementById('d-veh-select');
  sSal.innerHTML = '<option value="">Seleccionar...</option>';
  sEnt.innerHTML = '<option value="">Seleccionar...</option>';
  for (let id in listaCochesGlobal) {
    let c = listaCochesGlobal[id];
    let opt = `<option value="${id}">${c.matricula} (${c.modelo})</option>`;
    if (c.estado === 'Disponible') sSal.innerHTML += opt;
    else if (c.estado === 'Prestado') sEnt.innerHTML += opt;
  }
});

db.ref('config/asesores').on('value', snap => {
    const s = document.getElementById('p-asesor-select');
    if(!s) return;
    s.innerHTML = '<option value="">Seleccione Asesor...</option>';
    snap.forEach(c => { s.innerHTML += `<option value="${c.val()}">${c.val()}</option>`; });
});

function showTab(t) {
  const isS = t === 'tab-salida';
  document.getElementById('action-salida').style.display = isS ? 'block' : 'none';
  document.getElementById('action-entrada').style.display = isS ? 'none' : 'block';
  document.getElementById('btn-sal').className = isS ? 'btn-tab active' : 'btn-tab';
  document.getElementById('btn-ent').className = isS ? 'btn-tab' : 'btn-tab active';
}

function autoRellenarCoche() {
  const id = document.getElementById('p-veh-select').value;
  if (id) {
    const c = listaCochesGlobal[id];
    document.getElementById('p-mod').value = c.modelo;
    document.getElementById('p-kms').value = c.kms;
    document.getElementById('p-mat-print').value = c.matricula;
    document.getElementById('p-cia-fija').value = c.seguroCia || "";
    document.getElementById('p-pol-fija').value = c.seguroPoliza || "";
    document.getElementById('p-tel-fija').value = c.seguroTel || "";
    document.getElementById('p-f-salida').value = new Date().toLocaleString();
  }
}

async function verEstadoSalida() {
  const id = document.getElementById('d-veh-select').value;
  if (!id) return;
  const mat = listaCochesGlobal[id].matricula;
  const snap = await db.ref('contratos').orderByChild('matricula').equalTo(mat).limitToLast(1).once('value');
  if (snap.exists()) {
    const d = Object.values(snap.val())[0];
    // Rellenar automáticamente la parte de salida con los datos guardados
    document.getElementById('p-nom').value = d.nombre;
    document.getElementById('p-dni').value = d.dni;
    document.getElementById('p-tel').value = d.tel;
    document.getElementById('p-mat-c').value = d.matCliente;
    document.getElementById('p-cp').value = d.cp;
    document.getElementById('p-or').value = d.or;
    document.getElementById('p-asesor-select').value = d.asesor;
    document.getElementById('p-tarifa-select').value = d.tarifa;
    document.getElementById('p-mod').value = d.modelo;
    document.getElementById('p-kms').value = d.kms;
    document.getElementById('p-f-salida').value = d.fechaSalida;
    document.getElementById('p-cia-fija').value = d.seguroCia || "";
    document.getElementById('p-pol-fija').value = d.seguroPoliza || "";
    document.getElementById('p-tel-fija').value = d.seguroTel || "";
    document.getElementById('d-f-entrada').value = new Date().toLocaleString();
  }
}

async function finalizarSalida() {
  const id = document.getElementById('p-veh-select').value;
  if (!id || !document.getElementById('p-asesor-select').value) return alert("Falta Coche o Asesor");
  const con = {
    matricula: listaCochesGlobal[id].matricula,
    modelo: document.getElementById('p-mod').value,
    nombre: document.getElementById('p-nom').value,
    dni: document.getElementById('p-dni').value,
    tel: document.getElementById('p-tel').value,
    matCliente: document.getElementById('p-mat-c').value,
    cp: document.getElementById('p-cp').value,
    or: document.getElementById('p-or').value,
    asesor: document.getElementById('p-asesor-select').value,
    tarifa: document.getElementById('p-tarifa-select').value,
    kms: Number(document.getElementById('p-kms').value),
    fechaSalida: document.getElementById('p-f-salida').value,
    fechaDevolucionPrevista: document.getElementById('p-f-devolucion').value,
    seguroCia: document.getElementById('p-cia-fija').value,
    seguroPoliza: document.getElementById('p-pol-fija').value,
    seguroTel: document.getElementById('p-tel-fija').value,
    estado: "Activo"
  };
  await db.ref('contratos').push(con);
  await db.ref('coches/' + id).update({ estado: 'Prestado' });
  window.print();
  location.reload();
}

async function finalizarEntrada() {
  const id = document.getElementById('d-veh-select').value;
  const kmsIn = Number(document.getElementById('d-kms').value);
  if (!id || !kmsIn) return alert("Introduce KMs de entrada");
  const mat = listaCochesGlobal[id].matricula;
  const snap = await db.ref('contratos').orderByChild('matricula').equalTo(mat).limitToLast(1).once('value');
  if (snap.exists()) {
    const key = Object.keys(snap.val())[0];
    await db.ref('contratos/' + key).update({ 
        estado: "Cerrado", 
        fechaEntrada: document.getElementById('d-f-entrada').value, 
        kmsEntrada: kmsIn 
    });
    await db.ref('coches/' + id).update({ estado: 'Disponible', kms: kmsIn });
    window.print();
    location.reload();
  }
}
