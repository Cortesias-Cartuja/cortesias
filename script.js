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

// Cargar coches
db.ref('coches').on('value', (snap) => {
    const coches = snap.val();
    listaCochesGlobal = coches;
    const sSal = document.getElementById('p-veh-select');
    const sEnt = document.getElementById('d-veh-select');
    sSal.innerHTML = '<option value="">Seleccionar...</option>';
    sEnt.innerHTML = '<option value="">Seleccionar...</option>';
    for (let id in coches) {
        let c = coches[id];
        let opt = `<option value="${id}">${c.matricula}</option>`;
        if (c.estado === 'Disponible') sSal.innerHTML += opt;
        if (c.estado === 'Prestado') sEnt.innerHTML += opt;
    }
});

function autoRellenarCoche() {
    const id = document.getElementById('p-veh-select').value;
    if (id) {
        const c = listaCochesGlobal[id];
        document.getElementById('p-mod').value = c.modelo;
        document.getElementById('p-kms').value = c.kms;
        document.getElementById('p-comb').value = c.combustible;
        document.getElementById('p-mat-print').value = c.matricula; // Rellena para la impresión
        document.getElementById('p-f-salida').value = new Date().toLocaleDateString();
    }
}

function showTab(tabId) {
    document.getElementById('btn-salida').style.display = tabId === 'tab-salida' ? 'block' : 'none';
    document.getElementById('tab-entrada-actions').style.display = tabId === 'tab-entrada' ? 'block' : 'none';
    document.getElementById('btn-sal').classList.toggle('active', tabId === 'tab-salida');
    document.getElementById('btn-ent').classList.toggle('active', tabId === 'tab-entrada');
}

async function finalizarSalida() {
    const idCoche = document.getElementById('p-veh-select').value;
    if (!idCoche) return alert("Selecciona coche");
    
    const contrato = {
        matricula: listaCochesGlobal[idCoche].matricula,
        nombre: document.getElementById('p-nom').value,
        kms: document.getElementById('p-kms').value,
        fechaSalida: new Date().toLocaleString(),
        estado: "Activo"
    };

    await db.ref('contratos').push(contrato);
    await db.ref('coches/' + idCoche).update({ estado: 'Prestado' });
    
    window.print();
    location.reload();
}

async function verEstadoSalida() {
    const idCoche = document.getElementById('d-veh-select').value;
    const mat = listaCochesGlobal[idCoche].matricula;
    const snap = await db.ref('contratos').orderByChild('matricula').equalTo(mat).limitToLast(1).once('value');
    if (snap.exists()) {
        const d = Object.values(snap.val())[0];
        // Rellenamos el lado de la izquierda para que al imprimir se vea lo que hubo
        document.getElementById('p-nom').value = d.nombre;
        document.getElementById('p-mat-print').value = d.matricula;
        document.getElementById('p-kms').value = d.kms;
        document.getElementById('d-f-entrada').value = new Date().toLocaleDateString();
    }
}
