"""
Agent Foundry
Creates and manages specialized sub-agents for ALI system
"""
import json
import logging
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime
import uuid
from dataclasses import dataclass, asdict
from enum import Enum

logger = logging.getLogger(__name__)

class AgentType(Enum):
    ANALYZER = "analyzer"
    EXECUTOR = "executor"
    MONITOR = "monitor"
    DEBUGGER = "debugger"
    RESEARCHER = "researcher"
    OPTIMIZER = "optimizer"

@dataclass
class AgentCapability:
    """Represents a capability of an agent"""
    name: str
    description: str
    parameters: Dict[str, Any]
    dependencies: List[str]

@dataclass
class AgentSpec:
    """Specification for creating an agent"""
    name: str
    agent_type: AgentType
    description: str
    capabilities: List[AgentCapability]
    memory_limit: int = 512  # MB
    cpu_limit: float = 1.0
    timeout: int = 300  # seconds
    priority: int = 1  # 1-10, 10 is highest
    metadata: Dict[str, Any] = None

class Agent:
    """Base class for ALI agents"""
    
    def __init__(self, spec: AgentSpec):
        self.id = str(uuid.uuid4())
        self.spec = spec
        self.status = "inactive"
        self.created_at = datetime.now()
        self.last_activity = datetime.now()
        self.task_count = 0
        self.success_count = 0
        self.failure_count = 0
        self.memory_usage = 0
        self.cpu_usage = 0.0
        
        # Initialize capabilities
        self.capabilities = {}
        for cap in spec.capabilities:
            self.capabilities[cap.name] = cap
        
        logger.info(f"Agent created: {self.id} ({spec.name})")
    
    def execute_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a task with this agent"""
        
        self.status = "active"
        self.last_activity = datetime.now()
        self.task_count += 1
        
        try:
            # Route task to appropriate capability
            capability_name = task.get("capability")
            if not capability_name or capability_name not in self.capabilities:
                raise ValueError(f"Unknown capability: {capability_name}")
            
            capability = self.capabilities[capability_name]
            
            # Execute capability
            result = self._execute_capability(capability, task)
            
            self.success_count += 1
            self.status = "idle"
            
            return {
                "success": True,
                "result": result,
                "agent_id": self.id,
                "capability": capability_name,
                "execution_time": (datetime.now() - self.last_activity).total_seconds()
            }
            
        except Exception as e:
            self.failure_count += 1
            self.status = "error"
            logger.error(f"Agent {self.id} task execution failed: {str(e)}")
            
            return {
                "success": False,
                "error": str(e),
                "agent_id": self.id,
                "capability": task.get("capability"),
                "execution_time": (datetime.now() - self.last_activity).total_seconds()
            }
    
    def _execute_capability(self, capability: AgentCapability, task: Dict[str, Any]) -> Any:
        """Execute a specific capability"""
        
        # This is a base implementation - specific agent types will override
        return f"Executed {capability.name} with task: {task.get('description', 'No description')}"
    
    def get_status(self) -> Dict[str, Any]:
        """Get agent status"""
        
        return {
            "id": self.id,
            "name": self.spec.name,
            "type": self.spec.agent_type.value,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "last_activity": self.last_activity.isoformat(),
            "task_count": self.task_count,
            "success_count": self.success_count,
            "failure_count": self.failure_count,
            "success_rate": self.success_count / self.task_count if self.task_count > 0 else 0.0,
            "memory_usage": self.memory_usage,
            "cpu_usage": self.cpu_usage,
            "capabilities": list(self.capabilities.keys())
        }
    
    def shutdown(self):
        """Shutdown the agent"""
        self.status = "shutdown"
        logger.info(f"Agent {self.id} shutdown")

class AnalyzerAgent(Agent):
    """Agent specialized for analysis tasks"""
    
    def _execute_capability(self, capability: AgentCapability, task: Dict[str, Any]) -> Any:
        """Execute analysis capability"""
        
        if capability.name == "data_analysis":
            return self._analyze_data(task)
        elif capability.name == "text_analysis":
            return self._analyze_text(task)
        elif capability.name == "code_analysis":
            return self._analyze_code(task)
        else:
            return super()._execute_capability(capability, task)
    
    def _analyze_data(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze data"""
        
        data = task.get("data", [])
        analysis_type = task.get("analysis_type", "summary")
        
        if analysis_type == "summary":
            return {
                "type": "summary",
                "total_items": len(data),
                "data_types": list(set(type(item).__name__ for item in data)),
                "sample": data[:5] if data else []
            }
        
        elif analysis_type == "statistics":
            if all(isinstance(item, (int, float)) for item in data):
                return {
                    "type": "statistics",
                    "count": len(data),
                    "min": min(data) if data else 0,
                    "max": max(data) if data else 0,
                    "average": sum(data) / len(data) if data else 0
                }
            else:
                return {
                    "type": "statistics",
                    "error": "Data contains non-numeric values"
                }
        
        return {"type": "unknown", "error": f"Unknown analysis type: {analysis_type}"}
    
    def _analyze_text(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze text"""
        
        text = task.get("text", "")
        
        words = text.split()
        sentences = text.split('.')
        
        return {
            "type": "text_analysis",
            "character_count": len(text),
            "word_count": len(words),
            "sentence_count": len(sentences),
            "average_word_length": sum(len(word) for word in words) / len(words) if words else 0,
            "most_common_words": self._get_most_common_words(words)
        }
    
    def _analyze_code(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze code"""
        
        code = task.get("code", "")
        language = task.get("language", "python")
        
        lines = code.split('\\n')
        non_empty_lines = [line for line in lines if line.strip()]
        
        return {
            "type": "code_analysis",
            "language": language,
            "total_lines": len(lines),
            "non_empty_lines": len(non_empty_lines),
            "function_count": self._count_functions(code, language),
            "class_count": self._count_classes(code, language),
            "complexity_score": self._calculate_complexity(code, language)
        }
    
    def _get_most_common_words(self, words: List[str]) -> List[Dict[str, Any]]:
        """Get most common words"""
        
        from collections import Counter
        
        # Filter out common stop words
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'}
        
        filtered_words = [word.lower() for word in words if word.lower() not in stop_words]
        
        counter = Counter(filtered_words)
        
        return [{"word": word, "count": count} for word, count in counter.most_common(10)]
    
    def _count_functions(self, code: str, language: str) -> int:
        """Count functions in code"""
        
        if language == "python":
            return code.count("def ")
        elif language == "javascript":
            return code.count("function ") + code.count("=> ")
        elif language == "java":
            return code.count("public ") + code.count("private ") + code.count("protected ")
        else:
            return 0
    
    def _count_classes(self, code: str, language: str) -> int:
        """Count classes in code"""
        
        if language == "python":
            return code.count("class ")
        elif language == "javascript":
            return code.count("class ")
        elif language == "java":
            return code.count("class ") + code.count("interface ")
        else:
            return 0
    
    def _calculate_complexity(self, code: str, language: str) -> int:
        """Calculate code complexity (simplified)"""
        
        complexity = 1  # Base complexity
        
        # Count decision points
        decision_keywords = ['if', 'else', 'elif', 'while', 'for', 'switch', 'case', 'catch', 'try']
        
        for keyword in decision_keywords:
            complexity += code.count(keyword)
        
        return complexity

class ExecutorAgent(Agent):
    """Agent specialized for execution tasks"""
    
    def _execute_capability(self, capability: AgentCapability, task: Dict[str, Any]) -> Any:
        """Execute execution capability"""
        
        if capability.name == "command_execution":
            return self._execute_command(task)
        elif capability.name == "script_execution":
            return self._execute_script(task)
        elif capability.name == "workflow_execution":
            return self._execute_workflow(task)
        else:
            return super()._execute_capability(capability, task)
    
    def _execute_command(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Execute command (simulation)"""
        
        command = task.get("command", "")
        
        # This is a simulation - in production would use execution sandbox
        return {
            "type": "command_execution",
            "command": command,
            "status": "simulated",
            "output": f"Simulated execution of: {command}"
        }
    
    def _execute_script(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Execute script (simulation)"""
        
        script = task.get("script", "")
        language = task.get("language", "python")
        
        # This is a simulation - in production would use execution sandbox
        return {
            "type": "script_execution",
            "language": language,
            "status": "simulated",
            "output": f"Simulated execution of {language} script ({len(script)} characters)"
        }
    
    def _execute_workflow(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Execute workflow (simulation)"""
        
        workflow = task.get("workflow", [])
        
        results = []
        for i, step in enumerate(workflow):
            results.append({
                "step": i + 1,
                "description": step.get("description", ""),
                "status": "simulated",
                "output": f"Simulated step {i + 1}"
            })
        
        return {
            "type": "workflow_execution",
            "total_steps": len(workflow),
            "results": results,
            "status": "completed"
        }

class MonitorAgent(Agent):
    """Agent specialized for monitoring tasks"""
    
    def _execute_capability(self, capability: AgentCapability, task: Dict[str, Any]) -> Any:
        """Execute monitoring capability"""
        
        if capability.name == "system_monitoring":
            return self._monitor_system(task)
        elif capability.name == "process_monitoring":
            return self._monitor_process(task)
        elif capability.name == "log_monitoring":
            return self._monitor_logs(task)
        else:
            return super()._execute_capability(capability, task)
    
    def _monitor_system(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Monitor system resources"""
        
        import psutil
        
        return {
            "type": "system_monitoring",
            "cpu_percent": psutil.cpu_percent(),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_percent": psutil.disk_usage('/').percent,
            "network_io": psutil.net_io_counters()._asdict(),
            "timestamp": datetime.now().isoformat()
        }
    
    def _monitor_process(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Monitor specific process"""
        
        pid = task.get("pid")
        
        if not pid:
            return {
                "type": "process_monitoring",
                "error": "PID is required"
            }
        
        try:
            import psutil
            process = psutil.Process(pid)
            
            return {
                "type": "process_monitoring",
                "pid": pid,
                "name": process.name(),
                "status": process.status(),
                "cpu_percent": process.cpu_percent(),
                "memory_percent": process.memory_percent(),
                "timestamp": datetime.now().isoformat()
            }
        except psutil.NoSuchProcess:
            return {
                "type": "process_monitoring",
                "error": f"Process {pid} not found"
            }
    
    def _monitor_logs(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Monitor log files"""
        
        log_file = task.get("log_file")
        
        if not log_file:
            return {
                "type": "log_monitoring",
                "error": "log_file is required"
            }
        
        # Simplified log monitoring
        return {
            "type": "log_monitoring",
            "log_file": log_file,
            "status": "monitoring",
            "last_check": datetime.now().isoformat()
        }

class AgentFoundry:
    """Factory for creating and managing agents"""
    
    def __init__(self):
        self.agents: Dict[str, Agent] = {}
        self.agent_templates = self._load_agent_templates()
        self.creation_history = []
        
        logger.info("Agent Foundry initialized")
    
    def create_agent(self, spec: AgentSpec) -> Optional[Agent]:
        """Create a new agent from specification"""
        
        try:
            # Create agent based on type
            if spec.agent_type == AgentType.ANALYZER:
                agent = AnalyzerAgent(spec)
            elif spec.agent_type == AgentType.EXECUTOR:
                agent = ExecutorAgent(spec)
            elif spec.agent_type == AgentType.MONITOR:
                agent = MonitorAgent(spec)
            else:
                # Default to base agent
                agent = Agent(spec)
            
            # Store agent
            self.agents[agent.id] = agent
            
            # Record creation
            self.creation_history.append({
                "agent_id": agent.id,
                "spec": asdict(spec),
                "created_at": datetime.now().isoformat()
            })
            
            logger.info(f"Created agent: {agent.id} ({spec.name})")
            return agent
            
        except Exception as e:
            logger.error(f"Failed to create agent: {str(e)}")
            return None
    
    def create_agent_from_template(self, template_name: str, customizations: Dict[str, Any] = None) -> Optional[Agent]:
        """Create agent from predefined template"""
        
        if template_name not in self.agent_templates:
            logger.error(f"Unknown agent template: {template_name}")
            return None
        
        template = self.agent_templates[template_name].copy()
        
        # Apply customizations
        if customizations:
            template.update(customizations)
        
        # Create spec from template
        spec = AgentSpec(**template)
        
        return self.create_agent(spec)
    
    def get_agent(self, agent_id: str) -> Optional[Agent]:
        """Get agent by ID"""
        return self.agents.get(agent_id)
    
    def list_agents(self) -> List[Dict[str, Any]]:
        """List all agents"""
        return [agent.get_status() for agent in self.agents.values()]
    
    def shutdown_agent(self, agent_id: str) -> bool:
        """Shutdown and remove agent"""
        
        agent = self.agents.get(agent_id)
        if not agent:
            return False
        
        agent.shutdown()
        del self.agents[agent_id]
        
        logger.info(f"Shutdown agent: {agent_id}")
        return True
    
    def assign_task(self, agent_id: str, task: Dict[str, Any]) -> Dict[str, Any]:
        """Assign task to specific agent"""
        
        agent = self.agents.get(agent_id)
        if not agent:
            return {
                "success": False,
                "error": f"Agent {agent_id} not found"
            }
        
        return agent.execute_task(task)
    
    def find_best_agent(self, task: Dict[str, Any]) -> Optional[Agent]:
        """Find best agent for a task"""
        
        required_capability = task.get("capability")
        if not required_capability:
            return None
        
        # Find agents with required capability
        candidates = []
        for agent in self.agents.values():
            if required_capability in agent.capabilities and agent.status in ["idle", "inactive"]:
                candidates.append(agent)
        
        if not candidates:
            return None
        
        # Select best candidate based on success rate and priority
        best_agent = max(candidates, key=lambda a: (
            a.success_count / a.task_count if a.task_count > 0 else 0.0,
            a.spec.priority
        ))
        
        return best_agent
    
    def get_agent_statistics(self) -> Dict[str, Any]:
        """Get agent statistics"""
        
        total_agents = len(self.agents)
        active_agents = sum(1 for agent in self.agents.values() if agent.status == "active")
        
        agent_types = {}
        for agent in self.agents.values():
            agent_type = agent.spec.agent_type.value
            agent_types[agent_type] = agent_types.get(agent_type, 0) + 1
        
        total_tasks = sum(agent.task_count for agent in self.agents.values())
        total_successes = sum(agent.success_count for agent in self.agents.values())
        
        return {
            "total_agents": total_agents,
            "active_agents": active_agents,
            "agent_types": agent_types,
            "total_tasks": total_tasks,
            "total_successes": total_successes,
            "overall_success_rate": total_successes / total_tasks if total_tasks > 0 else 0.0
        }
    
    def _load_agent_templates(self) -> Dict[str, Dict[str, Any]]:
        """Load predefined agent templates"""
        
        return {
            "bug_hunter": {
                "name": "Bug Hunter",
                "agent_type": AgentType.ANALYZER,
                "description": "Specialized in finding and analyzing bugs",
                "capabilities": [
                    AgentCapability(
                        name="code_analysis",
                        description="Analyze code for bugs",
                        parameters={},
                        dependencies=[]
                    ),
                    AgentCapability(
                        name="log_analysis",
                        description="Analyze logs for errors",
                        parameters={},
                        dependencies=[]
                    )
                ],
                "priority": 8
            },
            "data_processor": {
                "name": "Data Processor",
                "agent_type": AgentType.EXECUTOR,
                "description": "Specialized in data processing tasks",
                "capabilities": [
                    AgentCapability(
                        name="data_processing",
                        description="Process and transform data",
                        parameters={},
                        dependencies=[]
                    ),
                    AgentCapability(
                        name="data_validation",
                        description="Validate data integrity",
                        parameters={},
                        dependencies=[]
                    )
                ],
                "priority": 6
            },
            "system_watchdog": {
                "name": "System Watchdog",
                "agent_type": AgentType.MONITOR,
                "description": "Monitors system health and performance",
                "capabilities": [
                    AgentCapability(
                        name="system_monitoring",
                        description="Monitor system resources",
                        parameters={},
                        dependencies=[]
                    ),
                    AgentCapability(
                        name="alert_generation",
                        description="Generate alerts for anomalies",
                        parameters={},
                        dependencies=[]
                    )
                ],
                "priority": 7
            }
        }
    
    def get_available_templates(self) -> List[str]:
        """Get list of available agent templates"""
        return list(self.agent_templates.keys())
    
    def get_template_info(self, template_name: str) -> Optional[Dict[str, Any]]:
        """Get information about a template"""
        return self.agent_templates.get(template_name)
