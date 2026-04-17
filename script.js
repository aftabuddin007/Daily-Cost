// ---------- DATA & STATE MANAGEMENT ----------
let expenses = [];            // Each expense: { id, title, amount, date }
let currentFilterDate = '';   // YYYY-MM-DD format, empty means no filter

// ---------- DOM ELEMENT REFERENCES ----------
const titleInput = document.getElementById('titleInput');
const amountInput = document.getElementById('amountInput');
const dateInput = document.getElementById('dateInput');
const form = document.getElementById('expenseForm');
const container = document.getElementById('expenseListContainer');
const totalDisplay = document.getElementById('totalDisplay');
const filterDateInput = document.getElementById('filterDateInput');
const clearFilterBtn = document.getElementById('clearFilterBtn');
const visibleCountSpan = document.getElementById('visibleCount');
const chartFill = document.getElementById('chartFill');
const chartPercentLabel = document.getElementById('chartPercentLabel');

// ---------- UTILITY FUNCTIONS ----------

/**
 * Format a number as USD currency
 * @param {number} value - The amount to format
 * @returns {string} Formatted currency string
 */
const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD', 
    minimumFractionDigits: 2 
  }).format(value);
};

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML string
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Set the date input field to today's date
 */
function setDefaultDate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  dateInput.value = `${yyyy}-${mm}-${dd}`;
}

// ---------- LOCALSTORAGE OPERATIONS ----------

/**
 * Save expenses array to localStorage
 */
function saveToLocalStorage() {
  localStorage.setItem('flow_expenses', JSON.stringify(expenses));
}

/**
 * Load expenses from localStorage
 */
function loadFromLocalStorage() {
  const stored = localStorage.getItem('flow_expenses');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        expenses = parsed;
      }
    } catch (e) {
      console.warn('Invalid storage data');
    }
  }
  
  // Add sample data if empty (for demonstration)
  if (!expenses.length) {
    const today = new Date().toISOString().slice(0, 10);
    expenses.push(
      { id: Date.now() + 1, title: 'Client lunch', amount: 34.50, date: today },
      { id: Date.now() + 2, title: 'Software subscription', amount: 12.99, date: today }
    );
    saveToLocalStorage();
  }
}

// ---------- FILTERING & DATA GETTERS ----------

/**
 * Get expenses filtered by the current filter date
 * @returns {Array} Filtered expenses array
 */
function getFilteredExpenses() {
  if (!currentFilterDate) return expenses.slice(); // Return all expenses
  return expenses.filter(exp => exp.date === currentFilterDate);
}

/**
 * Calculate total amount of filtered expenses
 * @returns {number} Total amount
 */
function computeFilteredTotal() {
  return getFilteredExpenses().reduce((sum, exp) => sum + exp.amount, 0);
}

// ---------- CHART VISUALIZATION ----------

/**
 * Update the minimal chart visualization
 * @param {number} total - Current filtered total
 */
function updateChartVisual(total) {
  // Calculate average daily spending for reference
  const dailySums = {};
  expenses.forEach(exp => { 
    dailySums[exp.date] = (dailySums[exp.date] || 0) + exp.amount; 
  });
  
  const values = Object.values(dailySums);
  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 50;
  const maxRef = Math.max(avg, 50); // Minimum reference value
  
  let percent = Math.min((total / maxRef) * 100, 100);
  if (!total) percent = 0;
  
  chartFill.style.width = percent + '%';
  chartPercentLabel.textContent = `${Math.round(percent)}% of typical daily`;
}

// ---------- RENDERING ----------

/**
 * Render the expense list with current filter
 */
function renderExpenseList() {
  const filtered = getFilteredExpenses();
  const total = computeFilteredTotal();

  // Update UI elements
  totalDisplay.textContent = formatCurrency(total);
  visibleCountSpan.textContent = `${filtered.length} item${filtered.length !== 1 ? 's' : ''}`;
  updateChartVisual(total);

  // Handle empty state
  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-message">✨ no expenses — add your first</div>`;
    return;
  }

  // Sort expenses by date (newest first)
  const sorted = [...filtered].sort((a, b) => 
    b.date.localeCompare(a.date) || (b.id - a.id)
  );
  
  // Build HTML
  let html = '';
  sorted.forEach(exp => {
    const formattedAmount = formatCurrency(exp.amount);
    const dateObj = new Date(exp.date + 'T00:00:00');
    const displayDate = dateObj.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: '2-digit' 
    });
    
    html += `
      <div class="expense-row" data-id="${exp.id}">
        <span class="expense-title">${escapeHtml(exp.title) || '—'}</span>
        <span class="expense-amount">${formattedAmount}</span>
        <span class="expense-date">${displayDate}</span>
        <button class="delete-btn" aria-label="delete expense" data-id="${exp.id}">🗑️</button>
      </div>
    `;
  });
  
  container.innerHTML = html;

  // Attach delete event listeners
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = Number(btn.dataset.id);
      deleteExpenseById(id);
    });
  });
}

// ---------- CRUD OPERATIONS ----------

/**
 * Delete an expense by ID
 * @param {number} id - Expense ID to delete
 */
function deleteExpenseById(id) {
  expenses = expenses.filter(exp => exp.id !== id);
  saveToLocalStorage();
  renderExpenseList();
}

/**
 * Add a new expense
 * @param {string} title - Expense title
 * @param {number} amount - Expense amount
 * @param {string} date - Expense date (YYYY-MM-DD)
 * @returns {boolean} Success status
 */
function addExpense(title, amount, date) {
  // Validation
  if (!title.trim() || amount <= 0 || !date) {
    alert('Please fill all fields with valid values.');
    return false;
  }

  const newExpense = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    title: title.trim(),
    amount: Number(amount),
    date: date,
  };
  
  expenses.push(newExpense);
  saveToLocalStorage();
  renderExpenseList();
  return true;
}

// ---------- FILTER OPERATIONS ----------

/**
 * Apply date filter
 * @param {string} dateValue - Date string (YYYY-MM-DD) or empty string
 */
function applyFilter(dateValue) {
  currentFilterDate = dateValue;
  renderExpenseList();
  filterDateInput.value = currentFilterDate;
}

// ---------- EVENT HANDLERS ----------

/**
 * Handle form submission
 */
form.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const title = titleInput.value;
  const amount = parseFloat(amountInput.value);
  const date = dateInput.value;

  if (addExpense(title, amount, date)) {
    // Reset form
    titleInput.value = '';
    amountInput.value = '';
    setDefaultDate();
    titleInput.focus();
  }
});

/**
 * Handle filter date change
 */
filterDateInput.addEventListener('change', (e) => {
  applyFilter(e.target.value);
});

/**
 * Handle clear filter button
 */
clearFilterBtn.addEventListener('click', () => {
  applyFilter('');
  filterDateInput.value = '';
});

// ---------- INITIALIZATION ----------

/**
 * Initialize the application
 */
function init() {
  loadFromLocalStorage();
  setDefaultDate();
  currentFilterDate = '';
  filterDateInput.value = '';
  renderExpenseList();
}

// Start the application
init();