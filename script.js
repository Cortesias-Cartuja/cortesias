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

// SINCRO EN TIEMPO REAL: Filtra por estado Disponible/Prestado
db.ref('coches').on('value', (snap) => {
    const coches = snap.val();
    listaCochesGlobal = coches;
    const sSal = document.getElementById('p-veh-select');
    const sEnt = document.getElementById('d-veh-select');
    
    sSal.innerHTML = '<option value="">Coches Disponibles...</option>';
    sEnt.innerHTML = '<option value="">Coches Cedidos actualmente...</option>';
    
    for (let id in coches) {
        let c = coches[id];
        let texto = `${c.matricula} - ${c.modelo}`;
        // REGLA: Si está Prestado, no sale en Salida. Si está Disponible, no sale en Recogida.
        if (c.estado === 'Disponible') {
            sSal.innerHTML += `<option value="${id}">${texto}</option>`;
        } else if (c.estado === 'Prestado') {
            sEnt.innerHTML += `<option value="${id}">${texto}</option>`;
        }
    }
});

function showTab(tabId) {
    const isSalida = tabId === 'tab-salida';
    document.getElementById('action-salida').style.display = isSalida ? 'block' : 'none';
    document.getElementById('action-entrada').style.display = isSalida ? 'none' : 'block';
    document.getElementById('btn-sal').className = isSalida ? 'btn-tab active' : 'btn-tab';
    document.getElementById('btn-ent').className = isSalida ? 'btn-tab' : 'btn-tab active';
    
    // Limpieza de seguridad al cambiar de pestaña
    document.getElementById('contrato-imprimible').querySelectorAll('input, textarea').forEach(el => el.value = "");
}

function autoRellenarCoche() {
    const id = document.getElementById('p-veh-select').value;
    if (id && listaCochesGlobal[id]) {
        const c = listaCochesGlobal[id];
        document.getElementById('p-mod').value = c.modelo;
        document.getElementById('p-kms').value = c.kms;
        document.getElementById('p-comb').value = c.combustible || "";
        document.getElementById('p-mat-print').value = c.matricula;
        document.getElementById('p-f-salida').value = new Date().toLocaleString();
    }
}

// VOLCADO DE DATOS: Al seleccionar coche en RECOGIDA, rellena la izquierda
async function verEstadoSalida() {
    const idCoche = document.getElementById('d-veh-select').value;
    if (!idCoche) return;

    const matricula = listaCochesGlobal[idCoche].matricula;
    const snap = await db.ref('contratos').orderByChild('matricula').equalTo(matricula).limitToLast(1).once('value');

    if (snap.exists()) {
        const d = Object.values(snap.val())[0];
        // Volcamos todo lo que se registró al salir en los campos de la izquierda
        document.getElementById('p-nom').value = d.nombre || "";
        document.getElementById('p-dni').value = d.dni || "";
        document.getElementById('p-cp').value = d.cp || "";
        document.getElementById('p-tel').value = d.tel || "";
        document.getElementById('p-mat-c').value = d.matCliente || "";
        document.getElementById('p-tarifa').value = d.tarifa || "";
        document.getElementById('p-or').value = d.or || "";
        document.getElementById('p-mat-print').value = d.matricula;
        document.getElementById('p-mod').value = d.modelo;
        document.getElementById('p-kms').value = d.kms; // Kms de salida
        document.getElementById('p-comb').value = d.combustible || "";
        document.getElementById('p-f-salida').value = d.fechaSalida || "";
        document.getElementById('p-obs').value = d.obs || "";
        
        // Ponemos fecha de ahora en la columna de la derecha
        document.getElementById('d-f-entrada').value = new Date().toLocaleString();
    }
}

async function finalizarSalida() {
    const idCoche = document.getElementById('p-veh-select').value;
    if (!idCoche || !document.getElementById('p-nom').value) return alert("Error: Selecciona coche y escribe el nombre del cliente.");

    const contrato = {
        matricula: listaCochesGlobal[idCoche].matricula,
        modelo: document.getElementById('p-mod').value,
        nombre: document.getElementById('p-nom').value,
        dni: document.getElementById('p-dni').value,
        tel: document.getElementById('p-tel').value,
        cp: document.getElementById('p-cp').value,
        matCliente: document.getElementById('p-mat-c').value,
        tarifa: document.getElementById('p-tarifa').value,
        or: document.getElementById('p-or').value,
        kms: document.getElementById('p-kms').value,
        combustible: document.getElementById('p-comb').value,
        fechaSalida: new Date().toLocaleString(),
        obs: document.getElementById('p-obs').value,
        estado: "Activo"
    };

    await db.ref('contratos').push(contrato);
    await db.ref('coches/' + idCoche).update({ estado: 'Prestado' });
    
    window.print();
    location.reload();
}

async function finalizarEntrada() {
    const idCoche = document.getElementById('d-veh-select').value;
    const kmsIn = document.getElementById('d-kms').value;
    if (!idCoche || !kmsIn) return alert("Error: Indica los KMs de entrada para cerrar el contrato.");

    const matricula = listaCochesGlobal[idCoche].matricula;
    const snap = await db.ref('contratos').orderByChild('matricula').equalTo(matricula).limitToLast(1).once('value');

    if (snap.exists()) {
        const key = Object.keys(snap.val())[0];
        // 1. Cerramos contrato
        await db.ref('contratos/' + key).update({ 
            estado: "Cerrado", 
            fechaEntrada: new Date().toLocaleString(),
            kmsEntrada: kmsIn,
            danosEntrada: document.getElementById('d-danos').value
        });
        // 2. Liberamos coche y actualizamos sus Kms reales en stock
        await db.ref('coches/' + idCoche).update({ 
            estado: 'Disponible', 
            kms: kmsIn,
            combustible: document.getElementById('d-comb').value 
        });
        
        window.print();
        location.reload();
    }
}
