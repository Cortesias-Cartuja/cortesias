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

// Sincro de Stock y Carga de seguros
db.ref('coches').on('value', snap => {
  listaCochesGlobal = snap.val() || {};
  const sSal = document.getElementById('p-veh-select');
  const sEnt = document.getElementById('d-veh-select');
  sSal.innerHTML = '<option value="">Seleccionar coche...</option>';
  sEnt.innerHTML = '<option value="">Seleccionar coche prestado...</option>';
  for (let id in listaCochesGlobal) {
    let c = listaCochesGlobal[id];
    let opt = `<option value="${id}">${c.matricula}</option>`;
    if (c.estado === 'Disponible') sSal.innerHTML += opt;
    else sEnt.innerHTML += opt;
  }
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
    document.getElementById('p-cia-fija').value = c.seguroCia || "N/A";
    document.getElementById('p-pol-fija').value = c.seguroPoliza || "N/A";
    document.getElementById('p-tel-fija').value = c.seguroTel || "N/A";
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
    document.getElementById('p-nom').value = d.nombre;
    document.getElementById('p-dni').value = d.dni;
    document.getElementById('p-tel').value = d.tel;
    document.getElementById('p-mat-c').value = d.matCliente;
    document.getElementById('p-cp').value = d.cp;
    document.getElementById('p-or').value = d.or;
    document.getElementById('p-asesor').value = d.asesor;
    document.getElementById('p-tarifa-select').value = d.tarifa;
    document.getElementById('p-mat-print').value = d.matricula;
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
  if (!id) return alert("Elige coche");
  const con = {
    matricula: listaCochesGlobal[id].matricula,
    modelo: document.getElementById('p-mod').value,
    nombre: document.getElementById('p-nom').value,
    dni: document.getElementById('p-dni').value,
    tel: document.getElementById('p-tel').value,
    matCliente: document.getElementById('p-mat-c').value,
    cp: document.getElementById('p-cp').value,
    or: document.getElementById('p-or').value,
    asesor: document.getElementById('p-asesor').value,
    tarifa: document.getElementById('p-tarifa-select').value,
    kms: document.getElementById('p-kms').value,
    combustible: document.getElementById('p-comb').value,
    fechaSalida: document.getElementById('p-f-salida').value,
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
  const kms = document.getElementById('d-kms').value;
  if (!id || !kms) return alert("Rellena KMs entrada");
  const mat = listaCochesGlobal[id].matricula;
  const snap = await db.ref('contratos').orderByChild('matricula').equalTo(mat).limitToLast(1).once('value');
  if (snap.exists()) {
    const key = Object.keys(snap.val())[0];
    await db.ref('contratos/' + key).update({ estado: "Cerrado", fechaEntrada: document.getElementById('d-f-entrada').value, kmsEntrada: kms });
    await db.ref('coches/' + id).update({ estado: 'Disponible', kms: kms });
    window.print();
    location.reload();
  }
}
