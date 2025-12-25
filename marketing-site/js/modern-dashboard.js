// ============================================
// MODERN DASHBOARD - Chart.js Implementation
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Chart.js default configuration
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = '#64748b';

    // ============================================
    // NEW STUDENTS CHART (Small Line Chart)
    // ============================================
    const newStudentsCtx = document.getElementById('newStudentsChart');
    if (newStudentsCtx) {
        new Chart(newStudentsCtx, {
            type: 'line',
            data: {
                labels: ['', '', '', '', '', '', ''],
                datasets: [{
                    data: [20, 35, 25, 45, 30, 50, 40],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                },
                scales: {
                    x: { display: false },
                    y: { display: false }
                }
            }
        });
    }

    // ============================================
    // TOTAL INCOME CHART (Small Line Chart)
    // ============================================
    const totalIncomeCtx = document.getElementById('totalIncomeChart');
    if (totalIncomeCtx) {
        new Chart(totalIncomeCtx, {
            type: 'line',
            data: {
                labels: ['', '', '', '', '', '', ''],
                datasets: [{
                    data: [15, 25, 20, 35, 28, 42, 38],
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                },
                scales: {
                    x: { display: false },
                    y: { display: false }
                }
            }
        });
    }

    // ============================================
    // TOTAL STUDENTS CHART (Bar Chart)
    // ============================================
    const totalStudentsCtx = document.getElementById('totalStudentsChart');
    if (totalStudentsCtx) {
        new Chart(totalStudentsCtx, {
            type: 'bar',
            data: {
                labels: ['', '', '', '', '', ''],
                datasets: [{
                    data: [40, 55, 45, 70, 60, 80],
                    backgroundColor: '#6366f1',
                    borderRadius: 4,
                    barThickness: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                },
                scales: {
                    x: { display: false },
                    y: { display: false }
                }
            }
        });
    }

    // ============================================
    // WORKING HOURS SMALL CHART (Line Chart)
    // ============================================
    const workingHoursSmallCtx = document.getElementById('workingHoursSmallChart');
    if (workingHoursSmallCtx) {
        new Chart(workingHoursSmallCtx, {
            type: 'line',
            data: {
                labels: ['', '', '', '', '', '', ''],
                datasets: [{
                    data: [25, 30, 28, 35, 32, 40, 38],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                },
                scales: {
                    x: { display: false },
                    y: { display: false }
                }
            }
        });
    }

    // ============================================
    // WORKING HOURS STATISTICS (Main Chart)
    // ============================================
    const workingHoursCtx = document.getElementById('workingHoursChart');
    if (workingHoursCtx) {
        new Chart(workingHoursCtx, {
            type: 'line',
            data: {
                labels: ['8h', '10h', '12h', '14h', '16h', '18h', '20h'],
                datasets: [
                    {
                        label: 'This Month',
                        data: [12, 14, 16, 18, 17, 19, 17],
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        pointHoverBackgroundColor: '#3b82f6',
                        pointHoverBorderColor: '#fff',
                        pointHoverBorderWidth: 2
                    },
                    {
                        label: 'Last Month',
                        data: [10, 11, 13, 15, 14, 16, 15],
                        borderColor: '#94a3b8',
                        backgroundColor: 'rgba(148, 163, 184, 0.05)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        pointHoverBackgroundColor: '#94a3b8',
                        pointHoverBorderColor: '#fff',
                        pointHoverBorderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#334155',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                            label: function (context) {
                                return context.dataset.label + ': ' + context.parsed.y + 'h';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        border: {
                            display: false
                        },
                        ticks: {
                            color: '#94a3b8',
                            font: {
                                size: 12
                            }
                        }
                    },
                    y: {
                        grid: {
                            color: '#f1f5f9',
                            drawBorder: false
                        },
                        border: {
                            display: false
                        },
                        ticks: {
                            color: '#94a3b8',
                            font: {
                                size: 12
                            },
                            callback: function (value) {
                                return value + 'h';
                            }
                        }
                    }
                }
            }
        });
    }
});

// ============================================
// INTERACTIVE FEATURES
// ============================================

// Smooth scroll for navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        // Remove active class from all items
        document.querySelectorAll('.nav-item').forEach(nav => {
            nav.classList.remove('active');
        });
        // Add active class to clicked item
        e.currentTarget.classList.add('active');
    });
});

// Performance card navigation
const navArrows = document.querySelectorAll('.nav-arrow');
navArrows.forEach(arrow => {
    arrow.addEventListener('click', () => {
        // Add animation effect
        arrow.style.transform = 'scale(0.9)';
        setTimeout(() => {
            arrow.style.transform = 'scale(1)';
        }, 150);
    });
});

// Console welcome message
console.log('%c🌊 MindWave Dashboard', 'font-size: 20px; font-weight: bold; color: #6366f1;');
console.log('%c✨ Modern Dashboard Loaded Successfully!', 'font-size: 12px; color: #8b5cf6;');
