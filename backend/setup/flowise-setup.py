#!/usr/bin/env python3
"""
ALI Flowise Backend Setup
Configures Flowise with PostgreSQL and initializes the ALI chatflow
"""
import os
import json
import subprocess
import time
import requests
import psycopg2
from datetime import datetime

class ALIFlowiseSetup:
    def __init__(self):
        self.flowise_port = 3001
        self.flowise_url = f"http://localhost:{self.flowise_port}"
        self.db_config = {
            'host': 'localhost',
            'port': 5432,
            'database': 'ali_flowise',
            'user': 'ali_user',
            'password': 'ali_secure_2024'
        }
        
    def setup_postgresql(self):
        """Setup PostgreSQL database for Flowise"""
        print("🗄️  Setting up PostgreSQL database...")
        
        # Create database and user
        try:
            # Connect as postgres user to create database
            conn = psycopg2.connect(
                host=self.db_config['host'],
                port=self.db_config['port'],
                database='postgres',
                user='postgres',
                password='postgres'
            )
            conn.autocommit = True
            cur = conn.cursor()
            
            # Create user
            cur.execute(f"CREATE USER {self.db_config['user']} WITH PASSWORD '{self.db_config['password']}';")
            
            # Create database
            cur.execute(f"CREATE DATABASE {self.db_config['database']} OWNER {self.db_config['user']};")
            
            # Grant privileges
            cur.execute(f"GRANT ALL PRIVILEGES ON DATABASE {self.db_config['database']} TO {self.db_config['user']};")
            
            print("✅ PostgreSQL database created successfully")
            
        except psycopg2.Error as e:
            if "already exists" in str(e):
                print("✅ PostgreSQL database already exists")
            else:
                print(f"❌ Error setting up PostgreSQL: {e}")
        finally:
            if 'conn' in locals():
                conn.close()
    
    def install_flowise(self):
        """Install Flowise if not already installed"""
        print("📦 Checking Flowise installation...")
        
        try:
            # Check if Flowise is already installed
            result = subprocess.run(['npx', 'flowise', '--version'], 
                                  capture_output=True, text=True)
            if result.returncode == 0:
                print("✅ Flowise already installed")
                return True
        except:
            pass
        
        # Install Flowise
        print("📦 Installing Flowise...")
        try:
            subprocess.run(['npm', 'install', '-g', 'flowise'], check=True)
            print("✅ Flowise installed successfully")
            return True
        except subprocess.CalledProcessError as e:
            print(f"❌ Error installing Flowise: {e}")
            return False
    
    def create_flowise_config(self):
        """Create Flowise configuration file"""
        config_dir = "backend/flowise/config"
        os.makedirs(config_dir, exist_ok=True)
        
        flowise_config = {
            "port": self.flowise_port,
            "database": {
                "type": "postgres",
                "host": self.db_config['host'],
                "port": self.db_config['port'],
                "username": self.db_config['user'],
                "password": self.db_config['password'],
                "database": self.db_config['database']
            },
            "cors": {
                "origin": "*"
            },
            "secretKey": "ali_flowise_secret_2024"
        }
        
        with open(f"{config_dir}/flowise.json", 'w') as f:
            json.dump(flowise_config, f, indent=2)
        
        print("✅ Flowise configuration created")
    
    def start_flowise(self):
        """Start Flowise server"""
        print("🚀 Starting Flowise server...")
        
        # Set environment variables
        env = os.environ.copy()
        env['FLOWISE_USERNAME'] = 'ali_admin'
        env['FLOWISE_PASSWORD'] = 'ali_secure_2024'
        env['DATABASE_TYPE'] = 'postgres'
        env['DATABASE_HOST'] = self.db_config['host']
        env['DATABASE_PORT'] = str(self.db_config['port'])
        env['DATABASE_USER'] = self.db_config['user']
        env['DATABASE_PASSWORD'] = self.db_config['password']
        env['DATABASE_NAME'] = self.db_config['database']
        env['PORT'] = str(self.flowise_port)
        
        # Start Flowise in background
        try:
            process = subprocess.Popen(
                ['npx', 'flowise', 'start'],
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            
            # Wait for startup
            time.sleep(10)
            
            # Check if server is running
            response = requests.get(f"{self.flowise_url}/api/v1/ping")
            if response.status_code == 200:
                print("✅ Flowise server started successfully")
                return process
            else:
                print("❌ Flowise server failed to start")
                return None
                
        except Exception as e:
            print(f"❌ Error starting Flowise: {e}")
            return None
    
    def create_ali_chatflow(self):
        """Create the main ALI Multi-Agent Reasoning chatflow"""
        print("🧠 Creating ALI Multi-Agent Reasoning chatflow...")
        
        # ALI Main Chatflow JSON
        ali_chatflow = {
            "nodes": [
                {
                    "id": "inputNode",
                    "position": {"x": 100, "y": 100},
                    "type": "chatInput",
                    "data": {
                        "label": "User Input",
                        "name": "userInput"
                    }
                },
                {
                    "id": "routerNode", 
                    "position": {"x": 300, "y": 100},
                    "type": "routerChain",
                    "data": {
                        "label": "Multi-Agent Router",
                        "name": "agentRouter"
                    }
                },
                {
                    "id": "analyzerAgent",
                    "position": {"x": 500, "y": 50},
                    "type": "llmChain",
                    "data": {
                        "label": "Analyzer Agent",
                        "systemMessage": "You are the Analyzer Agent. Break down complex problems into manageable components. Analyze the user's request thoroughly and identify key elements, dependencies, and potential challenges.",
                        "temperature": 0.3
                    }
                },
                {
                    "id": "creativeAgent",
                    "position": {"x": 500, "y": 150},
                    "type": "llmChain", 
                    "data": {
                        "label": "Creative Agent",
                        "systemMessage": "You are the Creative Agent. Generate innovative and out-of-the-box solutions. Think creatively and propose novel approaches to problems.",
                        "temperature": 0.8
                    }
                },
                {
                    "id": "criticAgent",
                    "position": {"x": 500, "y": 250},
                    "type": "llmChain",
                    "data": {
                        "label": "Critic Agent", 
                        "systemMessage": "You are the Critic Agent. Evaluate proposed solutions critically. Identify potential flaws, risks, and areas for improvement.",
                        "temperature": 0.2
                    }
                },
                {
                    "id": "synthesizerAgent",
                    "position": {"x": 700, "y": 150},
                    "type": "llmChain",
                    "data": {
                        "label": "Synthesizer Agent",
                        "systemMessage": "You are the Synthesizer Agent. Combine insights from the Analyzer, Creative, and Critic agents to create a unified, optimal response. Synthesize their perspectives into a coherent final answer.",
                        "temperature": 0.5
                    }
                },
                {
                    "id": "memoryBuffer",
                    "position": {"x": 100, "y": 300},
                    "type": "bufferMemory",
                    "data": {
                        "label": "Adaptive Context Memory",
                        "memoryKey": "chat_history",
                        "k": 10
                    }
                },
                {
                    "id": "vectorStore",
                    "position": {"x": 300, "y": 300},
                    "type": "chroma",
                    "data": {
                        "label": "Emotional Memory Store",
                        "collectionName": "ali_emotional_memory"
                    }
                },
                {
                    "id": "outputNode",
                    "position": {"x": 900, "y": 150},
                    "type": "chatOutput",
                    "data": {
                        "label": "ALI Response",
                        "name": "aliResponse"
                    }
                }
            ],
            "edges": [
                {"source": "inputNode", "target": "routerNode"},
                {"source": "routerNode", "target": "analyzerAgent"},
                {"source": "routerNode", "target": "creativeAgent"}, 
                {"source": "routerNode", "target": "criticAgent"},
                {"source": "analyzerAgent", "target": "synthesizerAgent"},
                {"source": "creativeAgent", "target": "synthesizerAgent"},
                {"source": "criticAgent", "target": "synthesizerAgent"},
                {"source": "synthesizerAgent", "target": "outputNode"},
                {"source": "memoryBuffer", "target": "routerNode"},
                {"source": "vectorStore", "target": "synthesizerAgent"}
            ]
        }
        
        # Save chatflow
        chatflow_dir = "backend/flowise/chatflows"
        os.makedirs(chatflow_dir, exist_ok=True)
        
        with open(f"{chatflow_dir}/ali-main-chatflow.json", 'w') as f:
            json.dump(ali_chatflow, f, indent=2)
        
        print("✅ ALI chatflow configuration created")
        
        # Upload to Flowise via API
        try:
            response = requests.post(
                f"{self.flowise_url}/api/v1/chatflows",
                json={
                    "name": "ALI Main Reasoning Engine",
                    "flowData": json.dumps(ali_chatflow),
                    "deployed": True
                }
            )
            
            if response.status_code == 201:
                chatflow_data = response.json()
                chatflow_id = chatflow_data.get('id')
                print(f"✅ ALI chatflow uploaded successfully (ID: {chatflow_id})")
                return chatflow_id
            else:
                print(f"❌ Error uploading chatflow: {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Error uploading chatflow: {e}")
            return None
    
    def setup_complete(self):
        """Complete setup and return configuration"""
        print("\n🎯 ALI Flowise Backend Setup Complete!")
        print("="*50)
        print(f"🌐 Flowise Dashboard: {self.flowise_url}")
        print(f"🗄️  Database: {self.db_config['database']}")
        print(f"🧠 Multi-Agent Reasoning: Enabled")
        print(f"📊 Emotional Memory: Configured")
        print("="*50)
        
        # Return configuration for frontend
        return {
            "flowise_url": self.flowise_url,
            "database": self.db_config,
            "setup_complete": True,
            "timestamp": datetime.now().isoformat()
        }

def main():
    print("🚀 ALI FLOWISE BACKEND SETUP")
    print("="*50)
    
    setup = ALIFlowiseSetup()
    
    # Step 1: Setup PostgreSQL
    setup.setup_postgresql()
    
    # Step 2: Install Flowise
    if not setup.install_flowise():
        return False
    
    # Step 3: Create configuration
    setup.create_flowise_config()
    
    # Step 4: Start Flowise
    process = setup.start_flowise()
    if not process:
        return False
    
    # Step 5: Create ALI chatflow
    chatflow_id = setup.create_ali_chatflow()
    
    # Step 6: Complete setup
    config = setup.setup_complete()
    
    # Save configuration
    with open("backend/flowise/config/setup-complete.json", 'w') as f:
        json.dump(config, f, indent=2)
    
    print("\n✅ Setup complete! Flowise is running and ready.")
    print("Press Ctrl+C to stop the server.")
    
    try:
        process.wait()
    except KeyboardInterrupt:
        print("\n🛑 Stopping Flowise server...")
        process.terminate()
        process.wait()

if __name__ == "__main__":
    main()
