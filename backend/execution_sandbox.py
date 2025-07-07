"""
Execution Sandbox
Secure code execution environment for ALI system
"""
import os
import sys
import subprocess
import tempfile
import docker
import logging
import json
import time
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
import threading
import signal
import psutil
from pathlib import Path
import uuid

from config import CONFIG

logger = logging.getLogger(__name__)

class ExecutionResult:
    """Container for execution results"""
    
    def __init__(self, success: bool, stdout: str = "", stderr: str = "", 
                 exit_code: int = 0, execution_time: float = 0.0, 
                 error: Optional[str] = None, metadata: Optional[Dict] = None):
        self.success = success
        self.stdout = stdout
        self.stderr = stderr
        self.exit_code = exit_code
        self.execution_time = execution_time
        self.error = error
        self.metadata = metadata or {}
        self.timestamp = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "stdout": self.stdout,
            "stderr": self.stderr,
            "exit_code": self.exit_code,
            "execution_time": self.execution_time,
            "error": self.error,
            "metadata": self.metadata,
            "timestamp": self.timestamp.isoformat()
        }

class ExecutionSandbox:
    """Secure execution environment for code and commands"""
    
    def __init__(self):
        self.docker_client = None
        self.active_executions = {}
        self.execution_history = []
        self.resource_limits = {
            "max_memory": "512m",
            "max_cpu": "1.0",
            "max_disk": "1g",
            "max_time": CONFIG.sandbox_timeout
        }
        
        # Security configuration
        self.blocked_imports = [
            "os.system", "subprocess.call", "eval", "exec", "open",
            "__import__", "globals", "locals", "vars", "dir"
        ]
        
        self.blocked_commands = CONFIG.blocked_commands
        
        # Initialize Docker client
        self._initialize_docker()
        
        logger.info("Execution Sandbox initialized")
    
    def _initialize_docker(self):
        """Initialize Docker client for containerized execution"""
        try:
            self.docker_client = docker.from_env()
            
            # Test Docker connection
            self.docker_client.ping()
            
            # Build custom sandbox image if needed
            self._ensure_sandbox_image()
            
            logger.info("Docker client initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Docker: {str(e)}")
            logger.warning("Falling back to local execution (less secure)")
    
    def execute_code(self, code: str, language: str = "python", 
                    timeout: int = None, environment: Dict[str, str] = None) -> ExecutionResult:
        """Execute code in a secure sandbox"""
        
        execution_id = str(uuid.uuid4())
        start_time = time.time()
        
        logger.info(f"Executing {language} code (ID: {execution_id})")
        
        try:
            # Validate and sanitize code
            if not self._validate_code(code, language):
                return ExecutionResult(
                    success=False,
                    error="Code validation failed - potentially unsafe content detected"
                )
            
            # Choose execution method
            if self.docker_client:
                result = self._execute_in_docker(code, language, timeout, environment, execution_id)
            else:
                result = self._execute_locally(code, language, timeout, environment, execution_id)
            
            # Update execution time
            result.execution_time = time.time() - start_time
            
            # Store in history
            self._store_execution_history(execution_id, code, language, result)
            
            return result
            
        except Exception as e:
            logger.error(f"Error executing code: {str(e)}")
            return ExecutionResult(
                success=False,
                error=str(e),
                execution_time=time.time() - start_time
            )
    
    def execute_command(self, command: str, timeout: int = None, 
                       working_dir: str = None, environment: Dict[str, str] = None) -> ExecutionResult:
        """Execute shell command in sandbox"""
        
        execution_id = str(uuid.uuid4())
        start_time = time.time()
        
        logger.info(f"Executing command: {command[:50]}... (ID: {execution_id})")
        
        try:
            # Validate command
            if not self._validate_command(command):
                return ExecutionResult(
                    success=False,
                    error="Command validation failed - potentially unsafe command detected"
                )
            
            # Execute command
            if self.docker_client:
                result = self._execute_command_in_docker(command, timeout, working_dir, environment, execution_id)
            else:
                result = self._execute_command_locally(command, timeout, working_dir, environment, execution_id)
            
            # Update execution time
            result.execution_time = time.time() - start_time
            
            # Store in history
            self._store_execution_history(execution_id, command, "shell", result)
            
            return result
            
        except Exception as e:
            logger.error(f"Error executing command: {str(e)}")
            return ExecutionResult(
                success=False,
                error=str(e),
                execution_time=time.time() - start_time
            )
    
    def _validate_code(self, code: str, language: str) -> bool:
        """Validate code for security issues"""
        
        # Check for blocked imports/functions
        for blocked in self.blocked_imports:
            if blocked in code:
                logger.warning(f"Blocked import/function detected: {blocked}")
                return False
        
        # Language-specific validation
        if language == "python":
            return self._validate_python_code(code)
        elif language == "javascript":
            return self._validate_javascript_code(code)
        elif language == "bash":
            return self._validate_bash_code(code)
        
        return True
    
    def _validate_python_code(self, code: str) -> bool:
        """Validate Python code"""
        
        # Check for dangerous patterns
        dangerous_patterns = [
            "__import__", "exec(", "eval(", "open(", "file(",
            "subprocess", "os.system", "os.popen", "os.spawn"
        ]
        
        for pattern in dangerous_patterns:
            if pattern in code:
                logger.warning(f"Dangerous Python pattern detected: {pattern}")
                return False
        
        # Try to compile the code
        try:
            compile(code, "<string>", "exec")
            return True
        except SyntaxError as e:
            logger.warning(f"Python syntax error: {str(e)}")
            return False
    
    def _validate_javascript_code(self, code: str) -> bool:
        """Validate JavaScript code"""
        
        dangerous_patterns = [
            "eval(", "Function(", "setTimeout(", "setInterval(",
            "require(", "import(", "process.exit", "process.kill"
        ]
        
        for pattern in dangerous_patterns:
            if pattern in code:
                logger.warning(f"Dangerous JavaScript pattern detected: {pattern}")
                return False
        
        return True
    
    def _validate_bash_code(self, code: str) -> bool:
        """Validate Bash code"""
        
        dangerous_patterns = [
            "rm -rf", "format", "dd if=", "mkfs", "shutdown", "reboot",
            ":(){ :|:& };:", "chmod 777", "sudo", "su -"
        ]
        
        for pattern in dangerous_patterns:
            if pattern in code:
                logger.warning(f"Dangerous Bash pattern detected: {pattern}")
                return False
        
        return True
    
    def _validate_command(self, command: str) -> bool:
        """Validate shell command"""
        
        for blocked in self.blocked_commands:
            if blocked in command:
                logger.warning(f"Blocked command detected: {blocked}")
                return False
        
        return True
    
    def _execute_in_docker(self, code: str, language: str, timeout: int, 
                          environment: Dict[str, str], execution_id: str) -> ExecutionResult:
        """Execute code in Docker container"""
        
        try:
            # Create temporary file for code
            with tempfile.NamedTemporaryFile(mode='w', suffix=self._get_file_extension(language), 
                                           delete=False) as f:
                f.write(code)
                code_file = f.name
            
            # Prepare Docker run parameters
            volumes = {
                os.path.dirname(code_file): {"bind": "/workspace", "mode": "rw"}
            }
            
            environment = environment or {}
            environment.update({
                "PYTHONUNBUFFERED": "1",
                "EXECUTION_ID": execution_id
            })
            
            # Run container
            container = self.docker_client.containers.run(
                image="ali-sandbox:latest",
                command=self._get_execution_command(language, os.path.basename(code_file)),
                volumes=volumes,
                environment=environment,
                mem_limit=self.resource_limits["max_memory"],
                cpu_quota=int(float(self.resource_limits["max_cpu"]) * 100000),
                working_dir="/workspace",
                detach=True,
                remove=True,
                network_disabled=True,  # Disable network access
                cap_drop=["ALL"],  # Drop all capabilities
                security_opt=["no-new-privileges:true"]
            )
            
            # Track active execution
            self.active_executions[execution_id] = container
            
            # Wait for completion with timeout
            timeout = timeout or self.resource_limits["max_time"]
            
            try:
                container.wait(timeout=timeout)
                
                # Get logs
                logs = container.logs(stdout=True, stderr=True).decode('utf-8')
                
                # Parse stdout/stderr
                stdout_lines = []
                stderr_lines = []
                
                for line in logs.split('\\n'):
                    if line.startswith("STDERR: "):
                        stderr_lines.append(line[8:])
                    else:
                        stdout_lines.append(line)
                
                stdout = '\\n'.join(stdout_lines)
                stderr = '\\n'.join(stderr_lines)
                
                # Get exit code
                exit_code = container.wait()["StatusCode"]
                
                return ExecutionResult(
                    success=exit_code == 0,
                    stdout=stdout,
                    stderr=stderr,
                    exit_code=exit_code,
                    metadata={"execution_method": "docker", "container_id": container.id}
                )
                
            except docker.errors.ContainerError as e:
                logger.error(f"Container execution error: {str(e)}")
                return ExecutionResult(
                    success=False,
                    error=f"Container execution failed: {str(e)}",
                    metadata={"execution_method": "docker"}
                )
                
            finally:
                # Clean up
                if execution_id in self.active_executions:
                    del self.active_executions[execution_id]
                
                # Remove temporary file
                try:
                    os.unlink(code_file)
                except:
                    pass
                
        except Exception as e:
            logger.error(f"Docker execution error: {str(e)}")
            return ExecutionResult(
                success=False,
                error=f"Docker execution failed: {str(e)}",
                metadata={"execution_method": "docker"}
            )
    
    def _execute_locally(self, code: str, language: str, timeout: int, 
                        environment: Dict[str, str], execution_id: str) -> ExecutionResult:
        """Execute code locally (fallback - less secure)"""
        
        logger.warning("Executing code locally - reduced security")
        
        try:
            # Create temporary file for code
            with tempfile.NamedTemporaryFile(mode='w', suffix=self._get_file_extension(language), 
                                           delete=False) as f:
                f.write(code)
                code_file = f.name
            
            # Prepare command
            command = self._get_execution_command(language, code_file)
            
            # Set up environment
            env = os.environ.copy()
            if environment:
                env.update(environment)
            
            # Execute with timeout
            timeout = timeout or self.resource_limits["max_time"]
            
            process = subprocess.Popen(
                command,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                env=env,
                cwd=tempfile.gettempdir()
            )
            
            # Track active execution
            self.active_executions[execution_id] = process
            
            try:
                stdout, stderr = process.communicate(timeout=timeout)
                
                return ExecutionResult(
                    success=process.returncode == 0,
                    stdout=stdout,
                    stderr=stderr,
                    exit_code=process.returncode,
                    metadata={"execution_method": "local", "pid": process.pid}
                )
                
            except subprocess.TimeoutExpired:
                process.kill()
                return ExecutionResult(
                    success=False,
                    error=f"Execution timeout after {timeout} seconds",
                    metadata={"execution_method": "local"}
                )
                
            finally:
                # Clean up
                if execution_id in self.active_executions:
                    del self.active_executions[execution_id]
                
                # Remove temporary file
                try:
                    os.unlink(code_file)
                except:
                    pass
                
        except Exception as e:
            logger.error(f"Local execution error: {str(e)}")
            return ExecutionResult(
                success=False,
                error=f"Local execution failed: {str(e)}",
                metadata={"execution_method": "local"}
            )
    
    def _execute_command_in_docker(self, command: str, timeout: int, working_dir: str, 
                                  environment: Dict[str, str], execution_id: str) -> ExecutionResult:
        """Execute command in Docker container"""
        
        try:
            # Prepare Docker run parameters
            volumes = {}
            if working_dir:
                volumes[working_dir] = {"bind": "/workspace", "mode": "rw"}
            
            environment = environment or {}
            environment.update({"EXECUTION_ID": execution_id})
            
            # Run container
            container = self.docker_client.containers.run(
                image="ali-sandbox:latest",
                command=["sh", "-c", command],
                volumes=volumes,
                environment=environment,
                mem_limit=self.resource_limits["max_memory"],
                cpu_quota=int(float(self.resource_limits["max_cpu"]) * 100000),
                working_dir="/workspace" if working_dir else "/tmp",
                detach=True,
                remove=True,
                network_disabled=True,
                cap_drop=["ALL"],
                security_opt=["no-new-privileges:true"]
            )
            
            # Track active execution
            self.active_executions[execution_id] = container
            
            # Wait for completion
            timeout = timeout or self.resource_limits["max_time"]
            
            try:
                container.wait(timeout=timeout)
                
                # Get logs
                logs = container.logs(stdout=True, stderr=True).decode('utf-8')
                
                # Get exit code
                exit_code = container.wait()["StatusCode"]
                
                return ExecutionResult(
                    success=exit_code == 0,
                    stdout=logs,
                    stderr="",
                    exit_code=exit_code,
                    metadata={"execution_method": "docker", "container_id": container.id}
                )
                
            except docker.errors.ContainerError as e:
                return ExecutionResult(
                    success=False,
                    error=f"Container command failed: {str(e)}",
                    metadata={"execution_method": "docker"}
                )
                
            finally:
                if execution_id in self.active_executions:
                    del self.active_executions[execution_id]
                
        except Exception as e:
            logger.error(f"Docker command execution error: {str(e)}")
            return ExecutionResult(
                success=False,
                error=f"Docker command execution failed: {str(e)}",
                metadata={"execution_method": "docker"}
            )
    
    def _execute_command_locally(self, command: str, timeout: int, working_dir: str, 
                               environment: Dict[str, str], execution_id: str) -> ExecutionResult:
        """Execute command locally"""
        
        logger.warning("Executing command locally - reduced security")
        
        try:
            # Set up environment
            env = os.environ.copy()
            if environment:
                env.update(environment)
            
            # Execute command
            timeout = timeout or self.resource_limits["max_time"]
            
            process = subprocess.Popen(
                command,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                env=env,
                cwd=working_dir or tempfile.gettempdir()
            )
            
            # Track active execution
            self.active_executions[execution_id] = process
            
            try:
                stdout, stderr = process.communicate(timeout=timeout)
                
                return ExecutionResult(
                    success=process.returncode == 0,
                    stdout=stdout,
                    stderr=stderr,
                    exit_code=process.returncode,
                    metadata={"execution_method": "local", "pid": process.pid}
                )
                
            except subprocess.TimeoutExpired:
                process.kill()
                return ExecutionResult(
                    success=False,
                    error=f"Command timeout after {timeout} seconds",
                    metadata={"execution_method": "local"}
                )
                
            finally:
                if execution_id in self.active_executions:
                    del self.active_executions[execution_id]
                
        except Exception as e:
            logger.error(f"Local command execution error: {str(e)}")
            return ExecutionResult(
                success=False,
                error=f"Local command execution failed: {str(e)}",
                metadata={"execution_method": "local"}
            )
    
    def _get_file_extension(self, language: str) -> str:
        """Get file extension for language"""
        extensions = {
            "python": ".py",
            "javascript": ".js",
            "bash": ".sh",
            "shell": ".sh"
        }
        return extensions.get(language, ".txt")
    
    def _get_execution_command(self, language: str, filename: str) -> str:
        """Get execution command for language"""
        commands = {
            "python": f"python {filename}",
            "javascript": f"node {filename}",
            "bash": f"bash {filename}",
            "shell": f"bash {filename}"
        }
        return commands.get(language, f"cat {filename}")
    
    def _ensure_sandbox_image(self):
        """Ensure sandbox Docker image exists"""
        try:
            # Check if image exists
            self.docker_client.images.get("ali-sandbox:latest")
            logger.info("Sandbox image found")
        except docker.errors.ImageNotFound:
            logger.info("Building sandbox image...")
            self._build_sandbox_image()
    
    def _build_sandbox_image(self):
        """Build sandbox Docker image"""
        dockerfile = """
        FROM python:3.9-slim
        
        # Install basic tools
        RUN apt-get update && apt-get install -y \\
            nodejs npm bash curl wget git \\
            && rm -rf /var/lib/apt/lists/*
        
        # Create non-root user
        RUN useradd -m -u 1000 sandbox
        
        # Set working directory
        WORKDIR /workspace
        
        # Change to non-root user
        USER sandbox
        
        # Set default command
        CMD ["python", "--version"]
        """
        
        try:
            # Create temporary directory for build context
            with tempfile.TemporaryDirectory() as temp_dir:
                dockerfile_path = os.path.join(temp_dir, "Dockerfile")
                with open(dockerfile_path, "w") as f:
                    f.write(dockerfile)
                
                # Build image
                self.docker_client.images.build(
                    path=temp_dir,
                    tag="ali-sandbox:latest",
                    rm=True
                )
                
                logger.info("Sandbox image built successfully")
                
        except Exception as e:
            logger.error(f"Failed to build sandbox image: {str(e)}")
            raise
    
    def _store_execution_history(self, execution_id: str, code: str, 
                               language: str, result: ExecutionResult):
        """Store execution in history"""
        
        history_entry = {
            "execution_id": execution_id,
            "code": code[:1000] + "..." if len(code) > 1000 else code,
            "language": language,
            "result": result.to_dict(),
            "timestamp": datetime.now().isoformat()
        }
        
        self.execution_history.append(history_entry)
        
        # Keep only last 100 executions
        if len(self.execution_history) > 100:
            self.execution_history = self.execution_history[-100:]
    
    def kill_execution(self, execution_id: str) -> bool:
        """Kill running execution"""
        
        if execution_id not in self.active_executions:
            return False
        
        try:
            execution = self.active_executions[execution_id]
            
            if isinstance(execution, subprocess.Popen):
                execution.kill()
            elif hasattr(execution, 'kill'):  # Docker container
                execution.kill()
            
            del self.active_executions[execution_id]
            logger.info(f"Killed execution {execution_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error killing execution {execution_id}: {str(e)}")
            return False
    
    def get_active_executions(self) -> List[Dict[str, Any]]:
        """Get list of active executions"""
        
        active = []
        for exec_id, execution in self.active_executions.items():
            if isinstance(execution, subprocess.Popen):
                active.append({
                    "execution_id": exec_id,
                    "type": "local",
                    "pid": execution.pid,
                    "status": "running" if execution.poll() is None else "finished"
                })
            else:
                active.append({
                    "execution_id": exec_id,
                    "type": "docker",
                    "container_id": getattr(execution, 'id', 'unknown'),
                    "status": "running"
                })
        
        return active
    
    def get_execution_history(self) -> List[Dict[str, Any]]:
        """Get execution history"""
        return self.execution_history.copy()
    
    def get_resource_usage(self) -> Dict[str, Any]:
        """Get current resource usage"""
        return {
            "cpu_percent": psutil.cpu_percent(),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_percent": psutil.disk_usage('/').percent,
            "active_executions": len(self.active_executions)
        }
