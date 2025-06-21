let currentEmpId = "";
let editingRowIndex = null;

const scriptURL = "https://script.google.com/macros/s/AKfycbyOj6kPo4Pm6523MdXwUN_aCyW7QXpZeTuRn3KP_gfp1t9I6BfVjv6QLnTqqogB7TYD/exec";

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("loginForm").addEventListener("submit", login);
  document.getElementById("timesheetForm").addEventListener("submit", saveEntry);
  document.getElementById("date").addEventListener("change", updateDayFromDate);
  document.getElementById("startTime").addEventListener("change", calculateTotalHours);
  document.getElementById("endTime").addEventListener("change", calculateTotalHours);
  document.getElementById("break").addEventListener("change", calculateTotalHours);
  document.getElementById("logoutBtn").addEventListener("click", logout);
  document.getElementById("viewBtn").addEventListener("click", viewEntries);
  document.getElementById("newBtn").addEventListener("click", newEntry);
});

function login(event) {
  event.preventDefault();
  const empId = document.getElementById("empId").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!empId || !password) return alert("Please enter Employee ID and Password");
  if (password.length < 6) return alert("Password must be at least 6 characters long");

  currentEmpId = empId;
  document.getElementById("empDisplay").textContent = currentEmpId;
  document.getElementById("loginForm").classList.add("hidden");
  document.getElementById("timesheetForm").classList.remove("hidden");
  document.getElementById("timesheetTitle").classList.remove("hidden");
}

function logout() {
  if (confirm("Are you sure you want to logout?")) {
    currentEmpId = "";
    editingRowIndex = null;
    document.getElementById("loginForm").classList.remove("hidden");
    document.getElementById("timesheetForm").classList.add("hidden");
    document.getElementById("timesheetTitle").classList.add("hidden");
    clearForm();
    document.getElementById("latestEntrySection").innerHTML = "";
    document.getElementById("allEntriesSection").classList.add("hidden");
  }
}

function saveEntry(event) {
  event.preventDefault();

  const entry = {
    empId: currentEmpId,
    date: document.getElementById("date").value,
    day: document.getElementById("day").value,
    startTime: document.getElementById("startTime").value,
    endTime: document.getElementById("endTime").value,
    task: document.getElementById("task").value,
    break: document.getElementById("break").value || 0,
    totalHours: document.getElementById("totalHours").value,
    rowIndex: editingRowIndex
  };

  if (!entry.date || !entry.day || !entry.startTime || !entry.endTime || !entry.task) {
    return alert("Please fill in all required fields.");
  }

  const formData = new URLSearchParams();
  Object.keys(entry).forEach(k => {
    if (entry[k] !== null && entry[k] !== undefined) {
      formData.append(k, entry[k]);
    }
  });
  formData.append("action", editingRowIndex ? "update" : "create");

  fetch(scriptURL, {
    method: "POST",
    body: formData
  })
    .then(res => res.text())
    .then(result => {
      if (result.startsWith("Success")) {
        const parts = result.split("|");
        const newRowIndex = parts[1] || "";
        entry.rowIndex = newRowIndex;
        alert("Saved successfully");
        showLatestEntry(entry);
        clearForm();
        editingRowIndex = null;
      } else if (result === "Updated") {
        alert("Updated successfully");
        showLatestEntry(entry);
        clearForm();
        editingRowIndex = null;
      } else {
        alert("Error: " + result);
      }
    })
    .catch(err => {
      console.error("Save error:", err);
      alert("Failed to save entry.");
    });
}

function showLatestEntry(entry) {
  const html = `
    <h3>Latest Entry</h3>
    <table>
      <tr>
        <th>ID</th><th>Date</th><th>Day</th><th>Start</th><th>End</th>
        <th>Task</th><th>Break</th><th>Total Hours</th><th>Actions</th>
      </tr>
      <tr data-row-index="${entry.rowIndex || ''}">
        <td>${entry.empId}</td>
        <td>${entry.date}</td>
        <td>${entry.day}</td>
        <td>${entry.startTime}</td>
        <td>${entry.endTime}</td>
        <td>${entry.task}</td>
        <td>${entry.break}</td>
        <td>${entry.totalHours}</td>
        <td>
          <button onclick="editEntry(this)">Edit</button>
          <button onclick="deleteEntry(this)">Delete</button>
        </td>
      </tr>
    </table>
  `;
  document.getElementById("latestEntrySection").innerHTML = html;
}

function editEntry(button) {
  const row = button.closest('tr');
  editingRowIndex = row.getAttribute("data-row-index");

  const cells = row.querySelectorAll('td');

  document.getElementById("date").value = cells[1].innerText;
  updateDayFromDate();
  document.getElementById("startTime").value = cells[3].innerText;
  document.getElementById("endTime").value = cells[4].innerText;
  document.getElementById("task").value = cells[5].innerText;
  document.getElementById("break").value = cells[6].innerText;
  document.getElementById("totalHours").value = cells[7].innerText;

  alert("Entry loaded for editing.");
}

function deleteEntry(button) {
  const row = button.closest('tr');
  const rowIndex = row.getAttribute("data-row-index");

  if (!rowIndex) return alert("Row index not found");
  if (!confirm("Are you sure you want to delete this entry?")) return;

  const formData = new URLSearchParams();
  formData.append("empId", currentEmpId);
  formData.append("rowIndex", rowIndex);
  formData.append("action", "delete");

  fetch(scriptURL, {
    method: "POST",
    body: formData
  })
    .then(res => res.text())
    .then(result => {
      if (result === "Deleted") {
        alert("Entry deleted.");
        document.getElementById("latestEntrySection").innerHTML = "";
        editingRowIndex = null;
      } else {
        alert("Delete failed: " + result);
      }
    })
    .catch(err => {
      console.error("Delete error:", err);
      alert("Failed to delete entry.");
    });
}

function updateDayFromDate() {
  const val = document.getElementById("date").value;
  if (val) {
    const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date(val));
    document.getElementById("day").value = dayName;
  }
}

function calculateTotalHours() {
  const start = document.getElementById("startTime").value;
  const end = document.getElementById("endTime").value;
  const breakTime = parseFloat(document.getElementById("break").value) || 0;

  if (start && end) {
    const [startH, startM] = start.split(":").map(Number);
    const [endH, endM] = end.split(":").map(Number);
    const total = (endH + endM / 60) - (startH + startM / 60) - breakTime;
    document.getElementById("totalHours").value = total < 0 ? 0 : total.toFixed(2);
  }
}

function clearForm() {
  document.getElementById("date").value = "";
  document.getElementById("day").value = "";
  document.getElementById("startTime").value = "";
  document.getElementById("endTime").value = "";
  document.getElementById("task").value = "";
  document.getElementById("break").value = "";
  document.getElementById("totalHours").value = "";
  editingRowIndex = null;
}

function newEntry() {
  clearForm();
  document.getElementById("latestEntrySection").innerHTML = "";
}

function viewEntries() {
  alert("View functionality not yet implemented.");
}
