// Chart.js Configuration for Modern Dark Professional Theme
Chart.defaults.color = '#94a3b8'; // --text-muted
Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.08)'; // --glass-border
Chart.defaults.font.family = "'Outfit', sans-serif";

document.addEventListener('DOMContentLoaded', async function() {
    try {
        const response = await fetch('/api/admin/metrics/charts');
        const result = await response.json();
        
        if (!result.success) throw new Error('Failed to fetch chart data');
        const dbData = result.data;

        const colorPalette = ['#6366f1', '#06b6d4', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6'];

        const isMobile = window.innerWidth < 768;
        const truncateLimit = isMobile ? 12 : 20;

        // 1. Skills Gap Chart (Bar)
        const ctxSkills = document.getElementById('skillsGapChart');
        if (ctxSkills) {
            new Chart(ctxSkills, {
                type: 'bar',
                data: {
                    labels: dbData.skills.labels.length > 0 ? dbData.skills.labels : ['No Data'],
                    datasets: [{
                        label: 'Count',
                        data: dbData.skills.values.length > 0 ? dbData.skills.values : [0],
                        backgroundColor: 'rgba(99, 102, 241, 0.8)',
                        hoverBackgroundColor: '#818cf8',
                        borderRadius: 8
                    }]
                },
                options: { 
                    responsive: true,
                    indexAxis: 'y',
                    layout: { padding: { left: 0 } },
                    plugins: { 
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const total = dbData.totalProfiles || 100;
                                    const perc = ((context.raw / total) * 100).toFixed(1);
                                    return ` ${context.raw} Alumni (${perc}%)`;
                                },
                                afterLabel: function(context) {
                                    const index = context.dataIndex;
                                    const breakdown = dbData.skills.breakdown[index];
                                    if (!breakdown) return '';
                                    
                                    let lines = ['Degree Breakdown:'];
                                    for (const [deg, count] of Object.entries(breakdown)) {
                                        lines.push(` • ${deg}: ${count}`);
                                    }
                                    return lines;
                                }
                            }
                        }
                    },
                    scales: {
                        x: { 
                            beginAtZero: true, 
                            grid: { color: 'rgba(255, 255, 255, 0.05)' },
                            title: { display: !isMobile, text: 'Alumni Count', color: '#64748b', font: { weight: '600' } }
                        },
                        y: { 
                            position: isMobile ? 'left' : 'right',
                            grid: { display: false },
                            ticks: {
                                color: '#94a3b8',
                                padding: 5,
                                font: { size: isMobile ? 10 : 11 },
                                callback: function(value) {
                                    const label = this.getLabelForValue(value);
                                    return label.length > truncateLimit ? label.substr(0, truncateLimit - 3) + '...' : label;
                                }
                            }
                        },
                        yTitle: {
                            position: 'left',
                            display: !isMobile,
                            title: { display: true, text: 'Technical Skills', color: '#64748b', font: { weight: '600' } },
                            grid: { display: false },
                            ticks: { display: false },
                            border: { display: false }
                        }
                    }
                }
            });
        }

        // 2. Career Pathways (New Roles vs Degrees Bar Chart)
        const ctxRoles = document.getElementById('rolesChart');
        if (ctxRoles) {
            new Chart(ctxRoles, {
                type: 'bar',
                data: {
                    labels: dbData.roles.labels.length > 0 ? dbData.roles.labels : ['No Data'],
                    datasets: [{
                        label: 'Alumni',
                        data: dbData.roles.values.length > 0 ? dbData.roles.values : [0],
                        backgroundColor: 'rgba(6, 182, 212, 0.8)',
                        hoverBackgroundColor: '#22d3ee',
                        borderRadius: 8
                    }]
                },
                options: { 
                    responsive: true,
                    indexAxis: 'y',
                    layout: { padding: { left: 0 } },
                    plugins: { 
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const val = context.raw;
                                    const total = dbData.totalProfiles || val;
                                    const percentage = ((val / total) * 100).toFixed(1);
                                    return ` Total: ${val} Alumni (${percentage}%)`;
                                },
                                afterLabel: function(context) {
                                    const index = context.dataIndex;
                                    const breakdown = dbData.roles.breakdown[index];
                                    if (!breakdown) return '';
                                    
                                    const totalForThisRole = dbData.roles.values[index];
                                    let lines = ['Academic Background:'];
                                    for (const [degree, count] of Object.entries(breakdown)) {
                                        const perc = ((count / totalForThisRole) * 100).toFixed(1);
                                        lines.push(` • ${degree}: ${count} (${perc}%)`);
                                    }
                                    return lines;
                                }
                            }
                        }
                    },
                    scales: {
                        x: { 
                            beginAtZero: true, 
                            grid: { color: 'rgba(255, 255, 255, 0.05)' },
                            title: { display: !isMobile, text: 'Alumni Count', color: '#64748b', font: { weight: '600' } }
                        },
                        y: { 
                            position: isMobile ? 'left' : 'right',
                            grid: { display: false },
                            ticks: {
                                color: '#94a3b8',
                                padding: 5,
                                font: { size: isMobile ? 10 : 11 },
                                callback: function(value) {
                                    const label = this.getLabelForValue(value);
                                    return label.length > truncateLimit ? label.substr(0, truncateLimit - 3) + '...' : label;
                                }
                            }
                        },
                        yTitle: {
                            position: 'left',
                            display: !isMobile,
                            title: { display: true, text: 'Professional Roles', color: '#64748b', font: { weight: '600' } },
                            grid: { display: false },
                            ticks: { display: false },
                            border: { display: false }
                        }
                    }
                }
            });
        }

        // 3. Academic Distribution (Degrees)
        const ctxPathways = document.getElementById('careerPathwaysChart');
        if (ctxPathways) {
            new Chart(ctxPathways, {
                type: 'bar',
                data: {
                    labels: dbData.pathways.labels.length > 0 ? dbData.pathways.labels : ['No Data'],
                    datasets: [{
                        label: 'Alumni',
                        data: dbData.pathways.values.length > 0 ? dbData.pathways.values : [0],
                        backgroundColor: 'rgba(99, 102, 241, 0.8)',
                        hoverBackgroundColor: '#818cf8',
                        borderRadius: 8
                    }]
                },
                options: { 
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: { 
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return ` Total: ${context.raw} Graduates`;
                                },
                                afterLabel: function(context) {
                                    const index = context.dataIndex;
                                    const breakdown = dbData.pathways.breakdown[index];
                                    if (!breakdown) return '';
                                    
                                    const totalForThisDegree = dbData.pathways.values[index];
                                    let lines = ['Career Trajectory:'];
                                    for (const [role, count] of Object.entries(breakdown).slice(0, 5)) {
                                        const perc = ((count / totalForThisDegree) * 100).toFixed(1);
                                        lines.push(` • ${role}: ${count} (${perc}%)`);
                                    }
                                    return lines;
                                }
                            }
                        }
                    },
                    scales: {
                        x: { 
                            beginAtZero: true, 
                            grid: { color: 'rgba(255, 255, 255, 0.05)' },
                            title: { display: !isMobile, text: 'Alumni Count', color: '#64748b', font: { weight: '600' } }
                        },
                        y: { 
                            position: isMobile ? 'left' : 'right',
                            grid: { display: false },
                            ticks: {
                                color: '#94a3b8',
                                padding: 5,
                                font: { size: isMobile ? 10 : 11 },
                                callback: function(value) {
                                    const label = this.getLabelForValue(value);
                                    return label.length > truncateLimit ? label.substr(0, truncateLimit - 3) + '...' : label;
                                }
                            }
                        },
                        yTitle: {
                            position: 'left',
                            display: !isMobile,
                            title: { display: true, text: 'Degree Programmes', color: '#64748b', font: { weight: '600' } },
                            grid: { display: false },
                            ticks: { display: false },
                            border: { display: false }
                        }
                    }
                }
            });
        }

        // 4. Industry Demand Trends (Line)
        const ctxIndustry = document.getElementById('industryDemandChart');
        if(ctxIndustry) {
            new Chart(ctxIndustry, {
                type: 'line',
                data: {
                    labels: dbData.industries.labels.length > 0 ? dbData.industries.labels : ['No Data'],
                    datasets: [{
                        label: 'Annual Placements',
                        data: dbData.industries.values.length > 0 ? dbData.industries.values : [0],
                        borderColor: '#06b6d4',
                        backgroundColor: 'rgba(6, 182, 212, 0.1)',
                        borderWidth: 4,
                        pointBackgroundColor: '#06b6d4',
                        pointBorderColor: 'rgba(255, 255, 255, 0.5)',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        tension: 0.45,
                        fill: true
                    }]
                },
                options: { 
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { 
                            position: 'right',
                            grid: { color: 'rgba(255, 255, 255, 0.05)' },
                            ticks: { color: '#94a3b8' }
                        },
                        yTitle: {
                            position: 'left',
                            display: !isMobile,
                            title: { display: true, text: 'Placement Volume', color: '#64748b', font: { weight: '600' } },
                            grid: { display: false },
                            ticks: { display: false },
                            border: { display: false }
                        },
                        x: { 
                            grid: { display: false },
                            title: { display: !isMobile, text: 'Graduation Year', color: '#64748b', font: { weight: '600' } }
                        }
                    }
                }
            });
        }

        // 5. Professional Licences Distribution (Pie)
        const ctxLicences = document.getElementById('licencesChart');
        if(ctxLicences) {
            new Chart(ctxLicences, {
                type: 'pie',
                data: {
                    labels: dbData.licences.labels.length > 0 ? dbData.licences.labels : ['No Data'],
                    datasets: [{
                        data: dbData.licences.values.length > 0 ? dbData.licences.values : [1],
                        backgroundColor: colorPalette,
                        borderWidth: 2,
                        borderColor: '#1e293b'
                    }]
                },
                options: { 
                    responsive: true,
                    plugins: { 
                        legend: { 
                            position: 'bottom', 
                            labels: { 
                                usePointStyle: true, 
                                padding: isMobile ? 10 : 25, 
                                color: '#f8fafc',
                                font: { size: isMobile ? 9 : 12 }
                            } 
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return ` ${context.label}: ${context.raw} Alumni`;
                                },
                                afterLabel: function(context) {
                                    const index = context.dataIndex;
                                    const breakdown = dbData.licences.breakdown[index];
                                    if (!breakdown) return '';
                                    
                                    let lines = ['Issuing Bodies:'];
                                    for (const [body, count] of Object.entries(breakdown)) {
                                        lines.push(` • ${body}: ${count}`);
                                    }
                                    return lines;
                                }
                            }
                        }
                    }
                }
            });
        }

        // 6. Professional Courses Distribution (Bar)
        const ctxCourses = document.getElementById('coursesChart');
        if (ctxCourses) {
            new Chart(ctxCourses, {
                type: 'bar',
                data: {
                    labels: dbData.courses.labels.length > 0 ? dbData.courses.labels : ['No Data'],
                    datasets: [{
                        label: 'Alumni',
                        data: dbData.courses.values.length > 0 ? dbData.courses.values : [0],
                        backgroundColor: 'rgba(244, 63, 94, 0.8)', // --ruby
                        hoverBackgroundColor: '#fb7185',
                        borderRadius: 8
                    }]
                },
                options: { 
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: { 
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return ` Total: ${context.raw} Alumni`;
                                },
                                afterLabel: function(context) {
                                    const index = context.dataIndex;
                                    const degBreakdown = dbData.courses.degreeBreakdown[index];
                                    const roleBreakdown = dbData.courses.roleBreakdown[index];
                                    if (!degBreakdown || !roleBreakdown) return '';
                                    
                                    let lines = ['\nAcademic Background:'];
                                    for (const [deg, count] of Object.entries(degBreakdown)) {
                                        lines.push(` • ${deg}: ${count}`);
                                    }
                                    
                                    lines.push(''); // Added margin
                                    lines.push('Professional Roles:');
                                    for (const [role, count] of Object.entries(roleBreakdown)) {
                                        lines.push(` • ${role}: ${count}`);
                                    }
                                    return lines;
                                }
                            }
                        }
                    },
                    scales: {
                        x: { 
                            beginAtZero: true, 
                            grid: { color: 'rgba(255, 255, 255, 0.05)' },
                            title: { display: !isMobile, text: 'Alumni Count', color: '#64748b', font: { weight: '600' } }
                        },
                        y: { 
                            position: isMobile ? 'left' : 'right',
                            grid: { display: false },
                            ticks: {
                                color: '#94a3b8',
                                padding: 5,
                                font: { size: isMobile ? 10 : 11 },
                                callback: function(value) {
                                    const label = this.getLabelForValue(value);
                                    return label.length > truncateLimit ? label.substr(0, truncateLimit - 3) + '...' : label;
                                }
                            }
                        },
                        yTitle: {
                            position: 'left',
                            display: !isMobile,
                            title: { display: true, text: 'Professional Courses', color: '#64748b', font: { weight: '600' } },
                            grid: { display: false },
                            ticks: { display: false },
                            border: { display: false }
                        }
                    }
                }
            });
        }

        // 7. Employment Placement (Bar Chart)
        const ctxPlacement = document.getElementById('placementLineChart');
        if (ctxPlacement) {
            new Chart(ctxPlacement, {
                type: 'bar',
                data: {
                    labels: dbData.placements.labels.length > 0 ? dbData.placements.labels : ['No Data'],
                    datasets: [{
                        label: 'Alumni Placed',
                        data: dbData.placements.values.length > 0 ? dbData.placements.values : [0],
                        backgroundColor: 'rgba(16, 185, 129, 0.8)', // --success / emerald
                        hoverBackgroundColor: '#34d399',
                        borderRadius: 6
                    }]
                },
                options: { 
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y', // Horizontal bars look great for company names
                    plugins: { 
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return ` ${context.raw} Alumni work here`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: { 
                            beginAtZero: true, 
                            grid: { color: 'rgba(255, 255, 255, 0.05)' },
                            title: { display: !isMobile, text: 'Alumni Count', color: '#64748b', font: { weight: '600' } }
                        },
                        y: { 
                            position: isMobile ? 'left' : 'right',
                            grid: { display: false },
                            ticks: {
                                color: '#94a3b8',
                                padding: 5,
                                font: { size: isMobile ? 10 : 11 },
                                callback: function(value) {
                                    const label = this.getLabelForValue(value);
                                    return label.length > truncateLimit ? label.substr(0, truncateLimit - 3) + '...' : label;
                                }
                            }
                        },
                        yTitle: {
                            position: 'left',
                            display: !isMobile,
                            title: { display: true, text: 'Employer Partners', color: '#64748b', font: { weight: '600' } },
                            grid: { display: false },
                            ticks: { display: false },
                            border: { display: false }
                        }
                    }
                }
            });
        }

        // 8. Industry Competency Map (Radar Chart)
        const ctxCompetency = document.getElementById('competencyRadarChart');
        if (ctxCompetency && dbData.competency) {
            new Chart(ctxCompetency, {
                type: 'radar',
                data: {
                    labels: ['Certifications', 'Skills/Courses', 'Licensing', 'Experience', 'Engagement'],
                    datasets: dbData.competency.map((c, i) => ({
                        label: c.industry,
                        data: c.scores,
                        backgroundColor: i === 0 ? 'rgba(99, 102, 241, 0.2)' : (i === 1 ? 'rgba(6, 182, 212, 0.2)' : (i === 2 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)')),
                        borderColor: i === 0 ? '#6366f1' : (i === 1 ? '#06b6d4' : (i === 2 ? '#10b981' : '#f59e0b')),
                        pointBackgroundColor: i === 0 ? '#6366f1' : (i === 1 ? '#06b6d4' : (i === 2 ? '#10b981' : '#f59e0b')),
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: i === 0 ? '#6366f1' : (i === 1 ? '#06b6d4' : (i === 2 ? '#10b981' : '#f59e0b'))
                    }))
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { 
                            position: 'bottom', 
                            labels: { 
                                color: '#f8fafc', 
                                padding: isMobile ? 10 : 20,
                                font: { size: isMobile ? 9 : 12 }
                            } 
                        }
                    },
                    scales: {
                        r: {
                            angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' },
                            pointLabels: { 
                                color: '#94a3b8', 
                                font: { size: isMobile ? 8 : 11, weight: '600' }
                            },
                            ticks: { display: false, stepSize: 20 },
                            beginAtZero: true,
                            max: 100
                        }
                    }
                }
            });
        }
        
        // Hide all loaders after charts are initialized
        document.querySelectorAll('.chart-loader').forEach(loader => {
            loader.classList.add('hidden');
            setTimeout(() => loader.style.display = 'none', 500);
        });

    } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('Error loading real-time charts:', err);
        // Also hide loaders on error to show empty state/error
        document.querySelectorAll('.chart-loader').forEach(loader => {
            loader.style.display = 'none';
        });
    }

    // 9. Delegated Event Listener for Chart Downloads (CSP Compliant)
    document.addEventListener('click', function(e) {
        const btn = e.target.closest('.btn-download-chart');
        if (btn) {
            e.preventDefault();
            const chartId = btn.getAttribute('data-chart-id');
            const filename = btn.getAttribute('data-filename');
            if (chartId && filename) {
                downloadChart(chartId, filename);
            }
        }
    });
});

/**
 * Captures a Chart.js canvas as a high-quality PNG and triggers a download.
 * Adds a solid background to prevent transparency issues in image viewers.
 */
function downloadChart(chartId, filename) {
    const canvas = document.getElementById(chartId);
    if (!canvas) return;

    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;

    ctx.fillStyle = '#1e293b'; // dashboard background color
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    ctx.drawImage(canvas, 0, 0);

    const link = document.createElement('a');
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.png`;
    link.href = tempCanvas.toDataURL('image/png', 1.0);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
