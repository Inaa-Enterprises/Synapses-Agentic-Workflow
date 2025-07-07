"""
Google Cloud Function Entry Point
Main API Handler for ALI System
"""
import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime
import traceback

from google.cloud import logging as cloud_logging
from flask import Flask, request, jsonify
from flask_cors import CORS

from orchestrator import ALIOrchestrator
from config import CONFIG

# Setup logging
cloud_logging.Client().setup_logging()
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Initialize ALI orchestrator
orchestrator = ALIOrchestrator()

@app.route('/api/ali', methods=['POST'])
def api_handler():
    """
    Main API endpoint for ALI system
    
    Expected payload:
    {
        "user_query": "string",
        "user_context": "string",
        "current_mode": "operator" | "ghost_runner",
        "session_id": "string"
    }
    """
    try:
        # Validate request
        if not request.is_json:
            return jsonify({"error": "Content-Type must be application/json"}), 400
            
        payload = request.get_json()
        
        # Extract and validate required fields
        user_query = payload.get('user_query')
        if not user_query:
            return jsonify({"error": "user_query is required"}), 400
            
        user_context = payload.get('user_context', '')
        current_mode = payload.get('current_mode', 'operator')
        session_id = payload.get('session_id', f"session_{datetime.now().timestamp()}")
        
        logger.info(f"Processing request - Session: {session_id}, Mode: {current_mode}")
        
        # Process request through orchestrator
        result = orchestrator.process_request(
            user_query=user_query,
            user_context=user_context,
            current_mode=current_mode,
            session_id=session_id
        )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "error": "Internal server error",
            "details": str(e) if CONFIG.debug else "Contact system administrator"
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    })

@app.route('/api/status', methods=['GET'])
def system_status():
    """System status endpoint"""
    return jsonify({
        "orchestrator_status": orchestrator.get_status(),
        "active_sessions": orchestrator.get_active_sessions(),
        "system_resources": orchestrator.get_system_resources()
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8080)
