const ctx = document.getElementById('expenseChart').getContext('2d');

// Constants
const STORAGE_KEY = 'spendlens_expenses';
const BUDGET_KEY = 'spendlens_budget';
const PALETTE = ['#FADADD', '#B0E0E6', '#FFDAB9', '#E6E6FA', '#C1E1C1', '#FFFACD', '#FFB6C1', '#CDEDF6', '#E3F2D6', '#D1ECF1'];

// State
let expenseItems = [];
let monthlyBudget = localStorage.getItem(BUDGET_KEY) ? parseFloat(localStorage.getItem(BUDGET_KEY)) : 0;

const expenseChart = new Chart(ctx, {
  type: 'pie',
  data: {
    labels: [],
    datasets: [{
      label: 'Expenses',
      data: [],
      backgroundColor: [],
      borderWidth: 1,
      borderColor: '#fff'
    }]
  },
  options: {
    plugins: {
      legend: { position: 'bottom' },
      tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ₹${ctx.parsed}` } }
    }
  }
});

const categoryEl = document.getElementById('category');
const amountEl = document.getElementById('amount');
const addBtn = document.getElementById('add-btn');
const listEl = document.getElementById('expense-list');

function formatCurrency(v) {
  return Number(v).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
}

// Filter and render expenses
function filterExpenses() {
  const searchTerm = document.getElementById('search').value.toLowerCase();
  const monthFilter = document.getElementById('month-filter').value;
  const categoryFilter = document.getElementById('category-filter').value;
  
  return expenseItems.filter(item => {
    const matchesSearch = item.category.toLowerCase().includes(searchTerm) || 
                         (item.note && item.note.toLowerCase().includes(searchTerm));
    const matchesMonth = !monthFilter || item.date.startsWith(monthFilter);
    const matchesCategory = !categoryFilter || item.category === categoryFilter;
    
    return matchesSearch && matchesMonth && matchesCategory;
  });
}

function renderList() {
  const filtered = filterExpenses();
  
  if (filtered.length === 0) {
    listEl.innerHTML = '<p class="muted" style="padding:12px">No expenses found — adjust filters or add new expenses.</p>';
    return;
  }

  let html = '<table><thead><tr><th>Date</th><th>Category</th><th>Description</th><th class="right">Amount</th><th>Actions</th></tr></thead><tbody>';
  let total = 0;
  
  filtered.forEach((item, idx) => {
    total += item.amount;
    html += `
      <tr>
        <td>${new Date(item.date).toLocaleDateString()}</td>
        <td>${item.category}</td>
        <td class="muted">${item.note || ''}</td>
        <td class="right">${formatCurrency(item.amount)}</td>
        <td>
          <button onclick="deleteExpense(${idx})" class="delete-btn" title="Delete this expense">🗑️</button>
        </td>
      </tr>`;
  });

  html += `<tr class="total-row">
    <td colspan="3" style="text-align:right">Total</td>
    <td class="right">${formatCurrency(total)}</td>
    <td></td>
  </tr>`;
  html += '</tbody></table>';
  listEl.innerHTML = html;
}

function updateChart() {
  // aggregate by category
  const sums = {};
  let totalExpense = 0;
  expenseItems.forEach(it => { 
    sums[it.category] = (sums[it.category] || 0) + it.amount;
    totalExpense += it.amount;
  });

  const labels = Object.keys(sums);
  const data = labels.map(l => sums[l]);
  const colors = labels.map((_, i) => PALETTE[i % PALETTE.length]);

  expenseChart.data.labels = labels;
  expenseChart.data.datasets[0].data = data;
  expenseChart.data.datasets[0].backgroundColor = colors;
  expenseChart.update();

  // Update total expense display
  document.getElementById('total-expense').innerHTML = `Total Expenses: ${formatCurrency(totalExpense)}`;
}

// Local Storage
function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenseItems));
}

function loadFromStorage() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    expenseItems = JSON.parse(stored);
    updateMonthlySummary();
    updateBudgetProgress();
    renderList();
    updateChart();
    updateFilters();
  }
}

// Budget tracking
function updateBudgetProgress() {
  const currentDate = new Date();
  const currentMonth = currentDate.toISOString().slice(0, 7);
  
  const monthlyTotal = expenseItems
    .filter(item => item.date.startsWith(currentMonth))
    .reduce((sum, item) => sum + item.amount, 0);
  
  const progress = monthlyBudget > 0 ? (monthlyTotal / monthlyBudget) * 100 : 0;
  const progressBar = document.querySelector('.progress-bar');
  const messageEl = document.getElementById('budget-message');
  
  progressBar.style.width = `${Math.min(100, progress)}%`;
  progressBar.className = 'progress-bar' + 
    (progress > 90 ? ' danger' : progress > 75 ? ' warning' : '');

  // Update budget message
  if (monthlyBudget > 0) {
    messageEl.className = 'budget-message show ' + (progress >= 100 ? 'warning' : 'normal');
    if (progress >= 100) {
      messageEl.textContent = '⚠️ Budget limit reached!';
    } else {
      const remaining = monthlyBudget - monthlyTotal;
      messageEl.textContent = `✅ Under limit - ${formatCurrency(remaining)} remaining`;
    }
  } else {
    messageEl.className = 'budget-message';
    messageEl.textContent = '';
  }
}

// Monthly summary
function updateMonthlySummary() {
  const currentDate = new Date();
  const currentMonth = currentDate.toISOString().slice(0, 7);
  
  const monthlyTotal = expenseItems
    .filter(item => item.date.startsWith(currentMonth))
    .reduce((sum, item) => sum + item.amount, 0);
  
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  document.getElementById('monthly-summary').innerHTML = 
    `You spent ${formatCurrency(monthlyTotal)} in ${monthName} 🎯`;
}

// Filter updates
function updateFilters() {
  const monthFilter = document.getElementById('month-filter');
  const categoryFilter = document.getElementById('category-filter');
  
  // Get unique months
  const months = [...new Set(expenseItems.map(item => item.date.slice(0, 7)))].sort();
  monthFilter.innerHTML = '<option value="">All Months</option>' +
    months.map(m => `<option value="${m}">${new Date(m).toLocaleString('default', { month: 'long', year: 'numeric' })}</option>`).join('');
  
  // Get unique categories
  const categories = [...new Set(expenseItems.map(item => item.category))].sort();
  categoryFilter.innerHTML = '<option value="">All Categories</option>' +
    categories.map(c => `<option value="${c}">${c}</option>`).join('');
}

function addExpense() {
  const category = categoryEl.value.trim();
  const amount = parseFloat(amountEl.value);
  const date = document.getElementById('date').value;

  if (!category) { alert('Please select a category.'); return; }
  if (isNaN(amount) || amount <= 0) { alert('Please enter a valid positive amount.'); return; }
  if (!date) { alert('Please select a date.'); return; }

  const item = { category, amount, date, note: '', time: new Date().toLocaleString() };
  expenseItems.push(item);

  // clear inputs
  amountEl.value = '';
  categoryEl.value = '';
  
  saveToStorage();
  updateMonthlySummary();
  updateBudgetProgress();
  updateFilters();
  renderList();
  updateChart();
}

function deleteExpense(index) {
  if (confirm('Are you sure you want to delete this expense?')) {
    expenseItems.splice(index, 1);
    saveToStorage();
    updateMonthlySummary();
    updateBudgetProgress();
    updateFilters();
    renderList();
    updateChart();
  }
}

// Set up event listeners
addBtn.addEventListener('click', addExpense);
amountEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') addExpense(); });

document.getElementById('search').addEventListener('input', renderList);
document.getElementById('month-filter').addEventListener('change', renderList);
document.getElementById('category-filter').addEventListener('change', renderList);

document.getElementById('set-budget').addEventListener('click', () => {
  const amount = prompt('Enter your monthly budget:', monthlyBudget);
  if (amount !== null) {
    monthlyBudget = parseFloat(amount) || 0;
    localStorage.setItem(BUDGET_KEY, monthlyBudget.toString());
    updateBudgetProgress();
  }
});

// Reset monthly expenses
document.getElementById('reset-month').addEventListener('click', () => {
  const currentDate = new Date();
  const currentMonth = currentDate.toISOString().slice(0, 7);
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  
  if (confirm(`Are you sure you want to reset all expenses for ${monthName}? This cannot be undone.`)) {
    // Keep only expenses from other months
    expenseItems = expenseItems.filter(item => !item.date.startsWith(currentMonth));
    
    // Save and update everything
    saveToStorage();
    updateMonthlySummary();
    updateBudgetProgress();
    updateFilters();
    renderList();
    updateChart();
    
    alert(`All expenses for ${monthName} have been reset.`);
  }
});

// Set default date to today
document.getElementById('date').valueAsDate = new Date();

// Initialize
loadFromStorage();
