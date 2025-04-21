let editMode = false;
let currentId = null;

window.onload = async function () {
  if (localStorage.getItem("loggedIn") !== "true") {
    window.location.href = "index.html";
  } else {
    fetchWorkers();
  }
};

function showAddForm() {
  editMode = false;
  document.getElementById("formTitle").textContent = "إضافة عامل";
  document.getElementById("workerForm").style.display = "block";
}

function hideForm() {
  document.getElementById("workerForm").style.display = "none";
  clearForm();
}

function clearForm() {
  document.getElementById("name").value = "";
  document.getElementById("bankCode").value = "";
  document.getElementById("rank").value = "";
  document.getElementById("notes").value = "";
}

// حفظ أو تعديل العامل
async function saveWorker() {
  const name = document.getElementById("name").value;
  const bankCode = document.getElementById("bankCode").value;
  const rank = document.getElementById("rank").value;
  const notes = document.getElementById("notes").value;

  // الحصول على آخر كود من جدول "workers" و "trash"
  const workersSnapshot = await db.collection("workers").get();
  const trashSnapshot = await db.collection("trash").get();
  
  // استخراج آخر كود من العمال الموجودين والمحفوظين
  const allWorkers = [...workersSnapshot.docs, ...trashSnapshot.docs];

  // تحديد أكبر كود موجود من بين جميع العمال (الموجودين والمحفوظين)
  let lastCode = 0;
  allWorkers.forEach(doc => {
    const data = doc.data();
    const code = data.code ? parseInt(data.code.slice(2)) : 0; // استخراج الرقم من الكود (GDXXXX)
    if (code > lastCode) {
      lastCode = code;
    }
  });

  // إنشاء الكود الجديد بناءً على أكبر كود تم العثور عليه
  const newCode = `GD${(lastCode + 1).toString().padStart(4, "0")}`;

  // إذا كان في وضع التعديل (editMode)
  if (editMode) {
    await db.collection("workers").doc(currentId).update({ name, bankCode, rank, notes });
  } else {
    // إضافة عامل جديد مع الكود الجديد
    await db.collection("workers").add({ name, bankCode, rank, notes, code: newCode });
  }

  hideForm();
  fetchWorkers();
}


async function fetchWorkers() {
  const tableBody = document.querySelector("#workersTable tbody");
  tableBody.innerHTML = "";
  const snapshot = await db.collection("workers").get();
  snapshot.forEach(doc => {
    const data = doc.data();
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${data.name}</td>
      <td>${data.bankCode}</td>
      <td>${data.rank}</td>
      <td>${data.code}</td>
      <td>${data.notes}</td>
      <td>
        <button onclick="editWorker('${doc.id}', '${data.name}', '${data.bankCode}', '${data.rank}', \`${data.notes}\`)">تعديل</button>
        <button onclick="deleteWorker('${doc.id}', '${data.name}')">حذف</button>
        </td>
    `;
    tableBody.appendChild(row);
  });
}

function editWorker(id, name, bankCode, rank, notes) {
  currentId = id;
  editMode = true;
  document.getElementById("formTitle").textContent = "تعديل عامل";
  document.getElementById("workerForm").style.display = "block";
  document.getElementById("name").value = name;
  document.getElementById("bankCode").value = bankCode;
  document.getElementById("rank").value = rank;
  document.getElementById("notes").value = notes;
}

async function deleteWorker(id, name) {
  const confirmed = confirm(`هل أنت متأكد أنك تريد حذف العامل "${name}"؟`);
  if (!confirmed) return;

  try {
    const doc = await db.collection("workers").doc(id).get();

    if (!doc.exists) {
      console.error("العامل غير موجود في قاعدة البيانات.");
      return;
    }

    const data = doc.data();

    if (data) {
      await db.collection("trash").add(data);
      await db.collection("workers").doc(id).delete();
      fetchWorkers();
    } else {
      console.error("لم يتم العثور على بيانات العامل.");
    }
  } catch (err) {
    console.error("فشل حذف العامل:", err);
  }
}



async function searchWorkers() {
  const keyword = document.getElementById("search").value.toLowerCase();
  const rows = document.querySelectorAll("#workersTable tbody tr");
  rows.forEach(row => {
    const text = row.innerText.toLowerCase();
    row.style.display = text.includes(keyword) ? "" : "none";
  });
}
