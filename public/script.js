document.addEventListener('DOMContentLoaded', function() {
    // Initialize the application
    initializeApp();
});

let bearerTokensData = [];

async function initializeApp() {
    try {
        // Load bearer tokens configuration
        await loadBearerTokens();
        
        // Setup event listeners
        setupEventListeners();
        
        // Initialize tabs
        showTab('stream');
        
        console.log('✅ Application initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
        showNotification('Failed to initialize application', 'error');
    }
}

function setupEventListeners() {
    // Stream form
    const streamForm = document.getElementById('streamForm');
    if (streamForm) {
        streamForm.addEventListener('submit', handleStreamSubmit);
    }

    // Account select change
    const accountSelect = document.getElementById('accountSelect');
    if (accountSelect) {
        accountSelect.addEventListener('change', handleAccountChange);
    }

    // Custom token toggle
    const toggleCustomToken = document.getElementById('toggleCustomToken');
    if (toggleCustomToken) {
        toggleCustomToken.addEventListener('click', togglePasswordVisibility);
    }

    // Config form
    const configForm = document.getElementById('configForm');
    if (configForm) {
        configForm.addEventListener('submit', handleConfigSubmit);
    }

    // Clear config button
    const clearConfigBtn = document.getElementById('clearConfigBtn');
    if (clearConfigBtn) {
        clearConfigBtn.addEventListener('click', clearConfiguration);
    }

    // Load config button
    const loadConfigBtn = document.getElementById('loadConfigBtn');
    if (loadConfigBtn) {
        loadConfigBtn.addEventListener('click', loadBearerTokens);
    }

    // Refresh logs button
    const refreshLogsBtn = document.getElementById('refreshLogsBtn');
    if (refreshLogsBtn) {
        refreshLogsBtn.addEventListener('click', loadStreamLogs);
    }

    // Close notification
    const closeNotification = document.getElementById('closeNotification');
    if (closeNotification) {
        closeNotification.addEventListener('click', hideNotification);
    }
}

// Tab Management
function showTab(tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.classList.remove('active');
    });

    // Remove active class from all tab buttons
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab content
    const selectedTab = document.getElementById(tabName + 'Tab');
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    // Add active class to selected tab button
    const selectedButton = document.querySelector(`[onclick="showTab('${tabName}')"]`);
    if (selectedButton) {
        selectedButton.classList.add('active');
    }

    // Load specific tab data
    if (tabName === 'config') {
        generateTokenInputs();
    } else if (tabName === 'logs') {
        loadStreamLogs();
    }
}

// Load Bearer Tokens from Server
async function loadBearerTokens() {
    try {
        showNotification('Loading configuration...', 'info');
        
        const response = await fetch('/api/bearer-tokens');
        const data = await response.json();

        if (data.success) {
            bearerTokensData = data.tokens;
            populateAccountSelect();
            showNotification('Configuration loaded successfully!', 'success');
        } else {
            throw new Error(data.error || 'Failed to load bearer tokens');
        }
    } catch (error) {
        console.error('Error loading bearer tokens:', error);
        showNotification('Failed to load configuration: ' + error.message, 'error');
        
        // Fallback to default tokens
        bearerTokensData = [
            { id: 'token1', name: 'Account 1 - Main', token: '', description: 'Primary streaming account', enabled: true },
            { id: 'token2', name: 'Account 2 - Backup', token: '', description: 'Backup streaming account', enabled: true },
            { id: 'token3', name: 'Account 3 - Gaming', token: '', description: 'Gaming content account', enabled: true },
            { id: 'token4', name: 'Account 4 - Music', token: '', description: 'Music streaming account', enabled: true },
            { id: 'token5', name: 'Account 5 - Test', token: '', description: 'Testing account', enabled: true }
        ];
        populateAccountSelect();
    }
}

// Populate Account Select Dropdown
function populateAccountSelect() {
    const accountSelect = document.getElementById('accountSelect');
    if (!accountSelect) return;

    // Clear existing options
    accountSelect.innerHTML = '';

    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select an account...';
    accountSelect.appendChild(defaultOption);

    // Add enabled tokens
    bearerTokensData.forEach(token => {
        if (token.enabled && token.token.trim()) {
            const option = document.createElement('option');
            option.value = token.id;
            option.textContent = token.name;
            accountSelect.appendChild(option);
        }
    });

    // Add custom token option
    const customOption = document.createElement('option');
    customOption.value = 'custom';
    customOption.textContent = '🔧 Custom Token';
    accountSelect.appendChild(customOption);
}

// Handle Account Selection Change
function handleAccountChange() {
    const accountSelect = document.getElementById('accountSelect');
    const customTokenGroup = document.getElementById('customTokenGroup');
    
    if (accountSelect.value === 'custom') {
        customTokenGroup.style.display = 'block';
        document.getElementById('customToken').required = true;
    } else {
        customTokenGroup.style.display = 'none';
        document.getElementById('customToken').required = false;
    }
}

// Toggle Password Visibility
function togglePasswordVisibility() {
    const customTokenInput = document.getElementById('customToken');
    const toggleBtn = document.getElementById('toggleCustomToken');
    
    if (customTokenInput.type === 'password') {
        customTokenInput.type = 'text';
        toggleBtn.textContent = '🙈';
    } else {
        customTokenInput.type = 'password';
        toggleBtn.textContent = '👁️';
    }
}

// Handle Stream Form Submit
async function handleStreamSubmit(e) {
    e.preventDefault();
    
    const selectedTokenId = document.getElementById('accountSelect').value;
    const customToken = document.getElementById('customToken').value.trim();
    const streamTitle = document.getElementById('streamTitle').value.trim();

    // Validate inputs
    if (!selectedTokenId) {
        showNotification('Please select an account', 'error');
        return;
    }

    if (!streamTitle) {
        showNotification('Please enter a stream title', 'error');
        return;
    }

    if (selectedTokenId === 'custom' && !customToken) {
        showNotification('Please enter a custom bearer token', 'error');
        return;
    }

    // Show loading state
    showLoading(true);
    hideResult();

    try {
        const response = await fetch('/api/start-stream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                selectedTokenId: selectedTokenId,
                customToken: customToken,
                streamTitle: streamTitle
            })
        });

        const data = await response.json();

        if (data.success) {
            if (data.rtmp && data.key) {
                // Show extracted RTMP and Key data
                showResult(`
                    <div class="rtmp-result">
                        <h3>🎯 Stream Data Retrieved!</h3>
                        <p><strong>Account:</strong> ${data.account}</p>
                        
                        <div class="main-output">
                            <label><strong>Formatted Output:</strong></label>
                            <div class="output-box">
                                <code class="formatted-code">${data.formatted_output}</code>
                                <button class="copy-btn" onclick="copyText('${data.formatted_output}')">📋 Copy</button>
                            </div>
                        </div>

                        <div class="data-grid">
                            <div class="data-item">
                                <label><strong>RTMP Server:</strong></label>
                                <div class="output-box">
                                    <code class="data-code">${data.rtmp}</code>
                                    <button class="copy-btn-sm" onclick="copyText('${data.rtmp}')">📋</button>
                                </div>
                            </div>
                            
                            <div class="data-item">
                                <label><strong>Stream Key:</strong></label>
                                <div class="output-box">
                                    <code class="data-code">${data.key}</code>
                                    <button class="copy-btn-sm" onclick="copyText('${data.key}')">📋</button>
                                </div>
                            </div>
                            </div>

                            <div class="success-message">
                                ✅ Ready to stream! Use the data above in your streaming software.
                            </div>
                        </div>
                    `, 'success');
                } else {
                    // Fallback if extraction failed
                    showResult(`
                        <div class="fallback-result">
                            <strong>⚠️ Stream Started - Manual Extraction Needed</strong><br><br>
                            <strong>Account:</strong> ${data.account}<br>
                            <strong>Title:</strong> ${streamTitle}<br>
                            <strong>Note:</strong> ${data.note || 'Could not automatically extract RTMP/Key data'}<br><br>
                            <details>
                                <summary><strong>📋 Full Response Data (click to expand)</strong></summary>
                                <pre class="response-data">${JSON.stringify(data.full_response || data.data, null, 2)}</pre>
                            </details>
                            <p class="manual-note">
                                💡 Look for <code>rtmp</code> and <code>key</code> fields in the response above.
                            </p>
                        </div>
                    `, 'success');
                }
            } else {
                showResult(`
                    <div class="error-result">
                        <strong>❌ Failed to Start Stream</strong><br><br>
                        <strong>Error:</strong> ${data.error}<br>
                        ${data.statusCode ? `<strong>Status Code:</strong> ${data.statusCode}<br>` : ''}
                        ${data.data ? `
                            <details>
                                <summary>Error Details</summary>
                                <pre class="error-data">${JSON.stringify(data.data, null, 2)}</pre>
                            </details>
                        ` : ''}
                    </div>
                `, 'error');
            }
        } catch (error) {
            showResult(`
                <div class="error-result">
                    <strong>❌ Network Error</strong><br><br>
                    <strong>Error:</strong> ${error.message}<br><br>
                    Please check your internet connection and try again.
                </div>
            `, 'error');
        } finally {
            showLoading(false);
        }
    }

    // Generate Token Input Fields
    function generateTokenInputs() {
        const tokenInputsContainer = document.getElementById('tokenInputs');
        if (!tokenInputsContainer) return;

        tokenInputsContainer.innerHTML = '';

        bearerTokensData.forEach((token, index) => {
            const tokenGroup = document.createElement('div');
            tokenGroup.className = 'token-input-group';
            tokenGroup.innerHTML = `
                <h4>
                    <span>${token.name}</span>
                    <label class="toggle-switch">
                        <input type="checkbox" ${token.enabled ? 'checked' : ''} onchange="toggleTokenEnabled('${token.id}')">
                        <span class="toggle-slider"></span>
                    </label>
                </h4>
                <div class="token-fields">
                    <div class="form-group">
                        <label>Account Name:</label>
                        <input type="text" value="${token.name}" onchange="updateTokenField('${token.id}', 'name', this.value)" required>
                    </div>
                    <div class="form-group">
                        <label>Description:</label>
                        <input type="text" value="${token.description}" onchange="updateTokenField('${token.id}', 'description', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Bearer Token:</label>
                        <div class="input-with-toggle">
                            <input type="password" value="${token.token}" onchange="updateTokenField('${token.id}', 'token', this.value)" id="token-${token.id}">
                            <button type="button" class="toggle-btn" onclick="toggleTokenVisibility('token-${token.id}', this)">👁️</button>
                        </div>
                    </div>
                </div>
            `;
            tokenInputsContainer.appendChild(tokenGroup);
        });
    }

    // Update Token Field
    function updateTokenField(tokenId, field, value) {
        const token = bearerTokensData.find(t => t.id === tokenId);
        if (token) {
            token[field] = value;
        }
    }

    // Toggle Token Enabled
    function toggleTokenEnabled(tokenId) {
        const token = bearerTokensData.find(t => t.id === tokenId);
        if (token) {
            token.enabled = !token.enabled;
            populateAccountSelect(); // Refresh account dropdown
        }
    }

    // Toggle Token Visibility
    function toggleTokenVisibility(inputId, button) {
        const input = document.getElementById(inputId);
        if (input.type === 'password') {
            input.type = 'text';
            button.textContent = '🙈';
        } else {
            input.type = 'password';
            button.textContent = '👁️';
        }
    }

    // Handle Config Form Submit
    async function handleConfigSubmit(e) {
        e.preventDefault();
        
        try {
            showNotification('Saving configuration...', 'info');
            
            const response = await fetch('/api/save-bearer-tokens', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    tokens: bearerTokensData
                })
            });

            const data = await response.json();

            if (data.success) {
                showNotification('Configuration saved successfully!', 'success');
                populateAccountSelect(); // Refresh account dropdown
            } else {
                throw new Error(data.error || 'Failed to save configuration');
            }
        } catch (error) {
            console.error('Error saving configuration:', error);
            showNotification('Failed to save configuration: ' + error.message, 'error');
        }
    }

    // Clear Configuration
    function clearConfiguration() {
        if (confirm('Are you sure you want to clear all bearer tokens? This action cannot be undone.')) {
            bearerTokensData.forEach(token => {
                token.token = '';
                token.enabled = true;
            });
            generateTokenInputs();
            populateAccountSelect();
            showNotification('Configuration cleared successfully!', 'success');
        }
    }

    // Load Stream Logs
    async function loadStreamLogs() {
        try {
            const response = await fetch('/api/stream-logs');
            const data = await response.json();

            const logsContainer = document.getElementById('logsContainer');
            if (!logsContainer) return;

            if (data.success && data.logs.length > 0) {
                logsContainer.innerHTML = data.logs.map(log => `
                    <div class="log-entry ${log.success ? 'success' : 'error'}">
                        <div class="log-header">
                            <span class="log-account">${log.account}</span>
                            <span class="log-time">${new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                        <div class="log-details">
                            <strong>Title:</strong> ${log.streamTitle}<br>
                            ${log.error ? `<strong>Error:</strong> ${log.error}<br>` : ''}
                            ${log.statusCode ? `<strong>Status:</strong> ${log.statusCode}<br>` : ''}
                            ${log.rtmpFound ? '<strong>RTMP Data:</strong> ✅ Extracted' : '<strong>RTMP Data:</strong> ❌ Not found'}
                        </div>
                        <span class="log-status ${log.success ? 'success' : 'error'}">
                            ${log.success ? '✅ Success' : '❌ Failed'}
                        </span>
                    </div>
                `).join('');
            } else {
                logsContainer.innerHTML = '<p>No stream logs available yet.</p>';
            }
        } catch (error) {
            console.error('Error loading stream logs:', error);
            const logsContainer = document.getElementById('logsContainer');
            if (logsContainer) {
                logsContainer.innerHTML = '<p>Failed to load stream logs.</p>';
            }
        }
    }

    // Copy text to clipboard
    function copyText(text) {
        navigator.clipboard.writeText(text).then(() => {
            showNotification('Copied to clipboard!', 'success');
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            showNotification('Failed to copy text', 'error');
        });
    }

    // Show loading spinner
    function showLoading(show) {
        const loadingSpinner = document.getElementById('loadingSpinner');
        const startStreamBtn = document.getElementById('startStreamBtn');
        
        if (show) {
            loadingSpinner.classList.remove('hidden');
            startStreamBtn.disabled = true;
            startStreamBtn.textContent = 'Starting Stream...';
        } else {
            loadingSpinner.classList.add('hidden');
            startStreamBtn.disabled = false;
            startStreamBtn.textContent = '🚀 Start TikTok Stream';
        }
    }

    // Show result
    function showResult(html, type) {
        const resultDiv = document.getElementById('result');
        if (resultDiv) {
            resultDiv.innerHTML = html;
            resultDiv.className = `result ${type}`;
            resultDiv.classList.remove('hidden');
        }
    }

    // Hide result
    function hideResult() {
        const resultDiv = document.getElementById('result');
        if (resultDiv) {
            resultDiv.classList.add('hidden');
        }
    }

    // Show notification
    function showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const notificationText = document.getElementById('notificationText');
        
        if (notification && notificationText) {
            notificationText.textContent = message;
            notification.className = `notification ${type}`;
            notification.classList.remove('hidden');
            
            // Auto hide after 5 seconds
            setTimeout(() => {
                hideNotification();
            }, 5000);
        }
    }

    // Hide notification
    function hideNotification() {
        const notification = document.getElementById('notification');
        if (notification) {
            notification.classList.add('hidden');
        }
    }

    // Make functions globally available
    window.showTab = showTab;
    window.copyText = copyText;
    window.updateTokenField = updateTokenField;
    window.toggleTokenEnabled = toggleTokenEnabled;
    window.toggleTokenVisibility = toggleTokenVisibility;
