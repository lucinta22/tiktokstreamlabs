const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// File paths
const BEARER_TOKENS_FILE = path.join(__dirname, 'data', 'bearer-tokens.json');
const STREAM_LOGS_FILE = path.join(__dirname, 'data', 'stream-logs.json');

// Ensure data directory exists
async function ensureDataDirectory() {
    const dataDir = path.join(__dirname, 'data');
    try {
        await fs.access(dataDir);
    } catch (error) {
        await fs.mkdir(dataDir, { recursive: true });
        console.log('📁 Created data directory');
    }
}

// Initialize data files
async function initializeDataFiles() {
    await ensureDataDirectory();
    
    // Initialize bearer tokens file
    try {
        await fs.access(BEARER_TOKENS_FILE);
    } catch (error) {
        const defaultTokens = {
            tokens: [
                { id: 'token1', name: 'Account 1 - Main', token: '', description: 'Primary streaming account', enabled: true },
                { id: 'token2', name: 'Account 2 - Backup', token: '', description: 'Backup streaming account', enabled: true },
                { id: 'token3', name: 'Account 3 - Gaming', token: '', description: 'Gaming content account', enabled: true },
                { id: 'token4', name: 'Account 4 - Music', token: '', description: 'Music streaming account', enabled: true },
                { id: 'token5', name: 'Account 5 - Test', token: '', description: 'Testing account', enabled: true }
            ],
            lastUpdated: new Date().toISOString()
        };
        await fs.writeFile(BEARER_TOKENS_FILE, JSON.stringify(defaultTokens, null, 2));
        console.log('📝 Created default bearer tokens file');
    }
    
    // Initialize stream logs file
    try {
        await fs.access(STREAM_LOGS_FILE);
    } catch (error) {
        const defaultLogs = {
            streams: [],
            lastUpdated: new Date().toISOString()
        };
        await fs.writeFile(STREAM_LOGS_FILE, JSON.stringify(defaultLogs, null, 2));
        console.log('📝 Created default stream logs file');
    }
}

// Read bearer tokens from JSON file
async function readBearerTokens() {
    try {
        const data = await fs.readFile(BEARER_TOKENS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading bearer tokens:', error);
        throw new Error('Failed to read bearer tokens configuration');
    }
}

// Write bearer tokens to JSON file
async function writeBearerTokens(tokensData) {
    try {
        tokensData.lastUpdated = new Date().toISOString();
        await fs.writeFile(BEARER_TOKENS_FILE, JSON.stringify(tokensData, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing bearer tokens:', error);
        throw new Error('Failed to save bearer tokens configuration');
    }
}

// Log stream activity
async function logStreamActivity(logData) {
    try {
        const logsData = await fs.readFile(STREAM_LOGS_FILE, 'utf8');
        const logs = JSON.parse(logsData);
        
        logs.streams.push({
            ...logData,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 100 logs
        if (logs.streams.length > 100) {
            logs.streams = logs.streams.slice(-100);
        }
        
        logs.lastUpdated = new Date().toISOString();
        await fs.writeFile(STREAM_LOGS_FILE, JSON.stringify(logs, null, 2));
    } catch (error) {
        console.error('Error logging stream activity:', error);
    }
}

// Serve HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Function to extract RTMP and Key from response
function extractRtmpAndKey(responseData) {
    try {
        let rtmpServer = null;
        let streamKey = null;
        
        if (typeof responseData === 'object' && responseData !== null) {
            // Direct extraction
            if (responseData.rtmp) rtmpServer = responseData.rtmp;
            if (responseData.key) streamKey = responseData.key;
            
            // Recursive search if not found directly
            if (!rtmpServer || !streamKey) {
                function searchRecursive(obj) {
                    for (const [key, value] of Object.entries(obj)) {
                        if (key === 'rtmp' && typeof value === 'string') rtmpServer = value;
                        if (key === 'key' && typeof value === 'string') streamKey = value;
                        if (typeof value === 'object' && value !== null) {
                            searchRecursive(value);
                        }
                    }
                }
                searchRecursive(responseData);
            }
        }
        
        if (rtmpServer || streamKey) {
            return {
                rtmp_server: rtmpServer || 'Not found',
                stream_key: streamKey || 'Not found',
                full_url: rtmpServer && streamKey ? `${rtmpServer}/${streamKey}` : 'Incomplete data',
                formatted: `rtmp:${streamKey || 'NOT_FOUND'}:`
            };
        }
        
        return null;
    } catch (error) {
        console.error('Error extracting RTMP data:', error);
        return null;
    }
}

// API endpoint to get bearer tokens configuration
app.get('/api/bearer-tokens', async (req, res) => {
    try {
        const tokensData = await readBearerTokens();
        res.json({ 
            success: true, 
            tokens: tokensData.tokens,
            lastUpdated: tokensData.lastUpdated
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API endpoint to save bearer tokens configuration
app.post('/api/save-bearer-tokens', async (req, res) => {
    try {
        const { tokens } = req.body;
        
        if (!Array.isArray(tokens) || tokens.length !== 5) {
            return res.status(400).json({
                success: false,
                error: 'Invalid tokens configuration - must have exactly 5 tokens'
            });
        }
        
        for (const token of tokens) {
            if (!token.id || !token.name || typeof token.enabled !== 'boolean') {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid token structure'
                });
            }
        }
        
        const tokensData = { tokens: tokens };
        await writeBearerTokens(tokensData);
        
        console.log('✅ Bearer tokens configuration saved successfully');
        
        res.json({
            success: true,
            message: 'Bearer tokens configuration saved successfully!',
            lastUpdated: tokensData.lastUpdated
        });
        
    } catch (error) {
        console.error('❌ Error saving bearer tokens:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API endpoint to start TikTok stream - MAIN FUNCTIONALITY
app.post('/api/start-stream', async (req, res) => {
    try {
        const { selectedTokenId, customToken, streamTitle } = req.body;

        console.log("=== START STREAM TIKTOK via Streamlabs API ===");

        // Validate input
        if (!streamTitle || !streamTitle.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Stream title is required'
            });
        }

        let bearerToken = '';
        let accountName = '';

        // Determine which token to use
        if (selectedTokenId === 'custom') {
            if (!customToken || !customToken.trim()) {
                return res.status(400).json({
                    success: false,
                    error: 'Custom bearer token is required when "Custom Token" is selected'
                });
            }
            bearerToken = customToken.trim();
            accountName = 'Custom Token';
        } else {
            // Read tokens from JSON file
            const tokensData = await readBearerTokens();
            const selectedToken = tokensData.tokens.find(t => t.id === selectedTokenId);
            
            if (!selectedToken || !selectedToken.token || !selectedToken.enabled) {
                return res.status(400).json({
                    success: false,
                    error: 'Selected bearer token is not configured, disabled, or invalid'
                });
            }
            bearerToken = selectedToken.token.trim();
            accountName = selectedToken.name;
        }

        console.log('Account:', accountName);
        console.log('Stream Title:', streamTitle.trim());

        // Prepare form data - exactly like Python script
        const formData = new URLSearchParams();
        formData.append('title', streamTitle.trim());

        // Headers - exactly like Python script
        const headers = {
            'Authorization': `Bearer ${bearerToken}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        };

        // Endpoint URL - exactly like Python script
        const url = 'https://streamlabs.com/api/v5/slobs/tiktok/stream/start';

        console.log('\nSending request to Streamlabs...');

        // Make API request
        const response = await axios.post(url, formData, { headers });

        console.log('\n✅ Response received:');
        console.log('Status Code:', response.status);
        
        // Try to parse as JSON first, fallback to text
        let responseData;
        try {
            responseData = response.data;
            console.log('Response JSON:', responseData);
        } catch (error) {
            responseData = response.data;
            console.log('Response Text:', responseData);
        }

        // Extract RTMP and Key from response
        const rtmpData = extractRtmpAndKey(responseData);

        // Log stream activity
        await logStreamActivity({
            account: accountName,
            streamTitle: streamTitle.trim(),
            success: !!rtmpData,
            statusCode: response.status,
            rtmpFound: !!rtmpData
        });

        if (rtmpData) {
            console.log('🎯 RTMP Data Extracted:');
            console.log('RTMP Server:', rtmpData.rtmp_server);
            console.log('Stream Key:', rtmpData.stream_key);
            console.log('Formatted Output:', rtmpData.formatted);
            
            res.json({
                success: true,
                account: accountName,
                rtmp: rtmpData.rtmp_server,
                key: rtmpData.stream_key,
                formatted_output: rtmpData.formatted,
                full_response: responseData,
                message: 'RTMP data extracted successfully!'
            });
        } else {
            console.log('⚠️ No RTMP/Key data found in response');
            
            res.json({
                success: true,
                account: accountName,
                statusCode: response.status,
                data: responseData,
                message: 'Stream request sent but could not extract RTMP/Key data',
                note: 'Check the full response data for manual extraction'
            });
        }

    } catch (error) {
        console.error('\n❌ Error occurred:', error.message);
        
        // Log failed stream attempt
        try {
            await logStreamActivity({
                account: req.body.selectedTokenId === 'custom' ? 'Custom Token' : 'Unknown',
                streamTitle: req.body.streamTitle || 'Unknown',
                success: false,
                error: error.message,
                statusCode: error.response?.status || null
            });
        } catch (logError) {
            console.error('Failed to log error:', logError);
        }
        
        let errorResponse = {
            success: false,
            error: error.message
        };

        if (error.response) {
            errorResponse.statusCode = error.response.status;
            errorResponse.data = error.response.data;
            console.log('Error Response Data:', error.response.data);
        }

        res.status(500).json(errorResponse);
    }
});

// API endpoint to get stream logs
app.get('/api/stream-logs', async (req, res) => {
    try {
        const data = await fs.readFile(STREAM_LOGS_FILE, 'utf8');
        const logs = JSON.parse(data);
        
        const recentLogs = logs.streams.slice(-20).reverse();
        
        res.json({
            success: true,
            logs: recentLogs,
            total: logs.streams.length,
            lastUpdated: logs.lastUpdated
        });
    } catch (error) {
        console.error('Error reading stream logs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to read stream logs'
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Initialize and start server
initializeDataFiles().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📁 Data files location: ${path.join(__dirname, 'data')}`);
        console.log('=== Streamlabs TikTok Web Tool Ready ===');
    });
}).catch(error => {
    console.error('❌ Failed to initialize data files:', error);
    process.exit(1);
});