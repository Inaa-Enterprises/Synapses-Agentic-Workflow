"""
ALI Orchestrator - Core PDCA Autonomous Loop
Plan-Do-Check-Act framework for autonomous task execution
"""
import json
import logging
import uuid
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from enum import Enum
import asyncio
import concurrent.futures

from multi_llm_api_layer import MultiLLMAPILayer
from dispute_resolver import DisputeResolver
from execution_sandbox import ExecutionSandbox
from tool_use_api import ToolUseAPI
from agent_foundry import AgentFoundry
from config import CONFIG

logger = logging.getLogger(__name__)

class TaskStatus(Enum):
    PENDING = "pending"
    PLANNING = "planning"
    EXECUTING = "executing"
    CHECKING = "checking"
    ACTING = "acting"
    COMPLETED = "completed"
    FAILED = "failed"

class ALIOrchestrator:
    """Main orchestrator implementing PDCA autonomous loop"""
    
    def __init__(self):
        self.llm_layer = MultiLLMAPILayer()
        self.dispute_resolver = DisputeResolver()
        self.execution_sandbox = ExecutionSandbox()
        self.tool_use_api = ToolUseAPI()
        self.agent_foundry = AgentFoundry()
        
        # Session management
        self.active_sessions: Dict[str, Dict] = {}
        self.task_history: List[Dict] = []
        
        # Performance metrics
        self.metrics = {
            "total_tasks": 0,
            "successful_tasks": 0,
            "failed_tasks": 0,
            "average_completion_time": 0.0
        }
        
        logger.info("ALI Orchestrator initialized")

    def process_request(self, user_query: str, user_context: str, 
                       current_mode: str, session_id: str) -> Dict[str, Any]:
        """
        Main entry point for processing user requests
        Implements the PDCA cycle
        """
        start_time = datetime.now()
        
        try:
            # Initialize session if new
            if session_id not in self.active_sessions:
                self.active_sessions[session_id] = {
                    "created_at": start_time,
                    "mode": current_mode,
                    "task_count": 0,
                    "context_memory": []
                }
            
            session = self.active_sessions[session_id]
            session["task_count"] += 1
            
            # Add to context memory
            session["context_memory"].append({
                "query": user_query,
                "context": user_context,
                "timestamp": start_time
            })
            
            # Keep only last 10 context entries
            if len(session["context_memory"]) > 10:
                session["context_memory"] = session["context_memory"][-10:]
            
            # Execute PDCA cycle
            result = self._execute_pdca_cycle(
                user_query, user_context, current_mode, session_id
            )
            
            # Update metrics
            completion_time = (datetime.now() - start_time).total_seconds()
            self._update_metrics(result["status"] == "success", completion_time)
            
            return result
            
        except Exception as e:
            logger.error(f"Error in process_request: {str(e)}")
            self._update_metrics(False, (datetime.now() - start_time).total_seconds())
            return {
                "status": "error",
                "message": str(e),
                "session_id": session_id,
                "timestamp": datetime.now().isoformat()
            }

    def _execute_pdca_cycle(self, user_query: str, user_context: str, 
                           current_mode: str, session_id: str) -> Dict[str, Any]:
        """Execute the Plan-Do-Check-Act cycle"""
        
        task_id = str(uuid.uuid4())
        
        # Initialize task tracking
        task = {
            "id": task_id,
            "session_id": session_id,
            "query": user_query,
            "context": user_context,
            "mode": current_mode,
            "status": TaskStatus.PENDING,
            "created_at": datetime.now(),
            "steps": [],
            "results": [],
            "errors": []
        }
        
        try:
            # PLAN Phase
            task["status"] = TaskStatus.PLANNING
            plan = self._plan_phase(user_query, user_context, current_mode, session_id)
            task["plan"] = plan
            
            if not plan["success"]:
                task["status"] = TaskStatus.FAILED
                task["errors"].append(plan["error"])
                return self._format_response(task, plan)
            
            # DO Phase
            task["status"] = TaskStatus.EXECUTING
            execution_results = self._do_phase(plan["steps"], task_id, session_id)
            task["execution_results"] = execution_results
            
            # CHECK Phase
            task["status"] = TaskStatus.CHECKING
            check_results = self._check_phase(execution_results, plan["success_criteria"])
            task["check_results"] = check_results
            
            # ACT Phase
            task["status"] = TaskStatus.ACTING
            final_results = self._act_phase(check_results, task, session_id)
            task["final_results"] = final_results
            
            # Mark as completed
            task["status"] = TaskStatus.COMPLETED
            task["completed_at"] = datetime.now()
            
            # Store in history
            self.task_history.append(task)
            
            return self._format_response(task, final_results)
            
        except Exception as e:
            logger.error(f"Error in PDCA cycle: {str(e)}")
            task["status"] = TaskStatus.FAILED
            task["errors"].append(str(e))
            return self._format_response(task, {"success": False, "error": str(e)})

    def _plan_phase(self, user_query: str, user_context: str, 
                   current_mode: str, session_id: str) -> Dict[str, Any]:
        """PLAN: Decompose user goal into actionable steps"""
        
        logger.info(f"Planning phase for query: {user_query}")
        
        # Get session context
        session = self.active_sessions.get(session_id, {})
        context_memory = session.get("context_memory", [])
        
        # Construct planning prompt
        planning_prompt = self._construct_planning_prompt(
            user_query, user_context, current_mode, context_memory
        )
        
        # Get plans from multiple LLMs
        llm_responses = self.llm_layer.get_multiple_responses(
            planning_prompt, 
            task_type="planning"
        )
        
        # Resolve disputes and select best plan
        best_plan = self.dispute_resolver.resolve_planning_dispute(llm_responses)
        
        if not best_plan:
            return {
                "success": False,
                "error": "Failed to generate valid plan",
                "llm_responses": llm_responses
            }
        
        return {
            "success": True,
            "steps": best_plan["steps"],
            "success_criteria": best_plan["success_criteria"],
            "estimated_time": best_plan.get("estimated_time", 300),
            "required_tools": best_plan.get("required_tools", []),
            "llm_responses": llm_responses
        }

    def _do_phase(self, steps: List[Dict], task_id: str, session_id: str) -> List[Dict]:
        """DO: Execute the planned steps"""
        
        logger.info(f"Executing {len(steps)} steps for task {task_id}")
        
        results = []
        
        for i, step in enumerate(steps):
            step_result = {
                "step_number": i + 1,
                "step_description": step.get("description", ""),
                "step_type": step.get("type", "unknown"),
                "started_at": datetime.now(),
                "success": False,
                "output": None,
                "error": None
            }
            
            try:
                # Execute step based on type
                if step["type"] == "code_execution":
                    output = self.execution_sandbox.execute_code(
                        step["code"], 
                        step.get("language", "python")
                    )
                    step_result["output"] = output
                    step_result["success"] = output.get("success", False)
                    
                elif step["type"] == "tool_use":
                    output = self.tool_use_api.execute_tool(
                        step["tool"], 
                        step.get("parameters", {})
                    )
                    step_result["output"] = output
                    step_result["success"] = output.get("success", False)
                    
                elif step["type"] == "llm_analysis":
                    llm_responses = self.llm_layer.get_multiple_responses(
                        step["prompt"], 
                        task_type="analysis"
                    )
                    resolved_response = self.dispute_resolver.resolve_analysis_dispute(llm_responses)
                    step_result["output"] = resolved_response
                    step_result["success"] = resolved_response is not None
                    
                elif step["type"] == "agent_creation":
                    agent = self.agent_foundry.create_agent(
                        step["agent_spec"]
                    )
                    step_result["output"] = agent
                    step_result["success"] = agent is not None
                    
                else:
                    step_result["error"] = f"Unknown step type: {step['type']}"
                    
            except Exception as e:
                logger.error(f"Error executing step {i+1}: {str(e)}")
                step_result["error"] = str(e)
                
            step_result["completed_at"] = datetime.now()
            step_result["duration"] = (
                step_result["completed_at"] - step_result["started_at"]
            ).total_seconds()
            
            results.append(step_result)
            
            # If step failed and is critical, abort
            if not step_result["success"] and step.get("critical", False):
                logger.warning(f"Critical step {i+1} failed, aborting execution")
                break
                
        return results

    def _check_phase(self, execution_results: List[Dict], 
                    success_criteria: List[str]) -> Dict[str, Any]:
        """CHECK: Evaluate execution results against success criteria"""
        
        logger.info("Checking execution results against success criteria")
        
        check_result = {
            "overall_success": True,
            "criteria_met": [],
            "criteria_failed": [],
            "execution_summary": {
                "total_steps": len(execution_results),
                "successful_steps": sum(1 for r in execution_results if r["success"]),
                "failed_steps": sum(1 for r in execution_results if not r["success"])
            }
        }
        
        # Check each success criterion
        for criterion in success_criteria:
            met = self._evaluate_criterion(criterion, execution_results)
            if met:
                check_result["criteria_met"].append(criterion)
            else:
                check_result["criteria_failed"].append(criterion)
                check_result["overall_success"] = False
        
        return check_result

    def _act_phase(self, check_results: Dict, task: Dict, session_id: str) -> Dict[str, Any]:
        """ACT: Take corrective action if needed or finalize results"""
        
        logger.info("Acting on check results")
        
        if check_results["overall_success"]:
            # Success - finalize and return results
            return {
                "success": True,
                "message": "Task completed successfully",
                "results": self._compile_final_results(task),
                "metrics": check_results["execution_summary"]
            }
        else:
            # Failure - attempt automatic correction
            correction_result = self._attempt_auto_correction(check_results, task, session_id)
            
            if correction_result["success"]:
                return {
                    "success": True,
                    "message": "Task completed after auto-correction",
                    "results": correction_result["results"],
                    "corrections_applied": correction_result["corrections"]
                }
            else:
                return {
                    "success": False,
                    "message": "Task failed and auto-correction unsuccessful",
                    "failed_criteria": check_results["criteria_failed"],
                    "correction_attempts": correction_result["attempts"]
                }

    def _attempt_auto_correction(self, check_results: Dict, task: Dict, session_id: str) -> Dict[str, Any]:
        """Attempt to automatically correct failures"""
        
        logger.info("Attempting automatic correction")
        
        # Simple retry logic for now
        # In production, this would be more sophisticated
        
        correction_attempts = []
        
        for failed_criterion in check_results["criteria_failed"]:
            # Generate correction plan
            correction_prompt = f"""
            The following success criterion failed: {failed_criterion}
            
            Original task: {task['query']}
            Execution results: {json.dumps(task['execution_results'], indent=2)}
            
            Please provide a corrective action plan.
            """
            
            correction_responses = self.llm_layer.get_multiple_responses(
                correction_prompt, 
                task_type="correction"
            )
            
            correction_plan = self.dispute_resolver.resolve_correction_dispute(correction_responses)
            
            if correction_plan:
                correction_attempts.append({
                    "criterion": failed_criterion,
                    "plan": correction_plan,
                    "executed": False
                })
        
        # For now, return unsuccessful correction
        # In production, would execute correction plans
        return {
            "success": False,
            "attempts": correction_attempts,
            "message": "Auto-correction not yet implemented"
        }

    def _construct_planning_prompt(self, user_query: str, user_context: str, 
                                 current_mode: str, context_memory: List[Dict]) -> str:
        """Construct the planning prompt for LLMs"""
        
        context_str = ""
        if context_memory:
            context_str = "\\n".join([
                f"Previous: {item['query']}" for item in context_memory[-3:]
            ])
        
        return f"""
        You are ALI (Autonomous Intelligence Loop), an advanced AI system capable of autonomous task execution.
        
        Current Mode: {current_mode}
        User Query: {user_query}
        User Context: {user_context}
        Recent Context: {context_str}
        
        Please create a detailed execution plan with the following structure:
        
        {{
            "steps": [
                {{
                    "description": "Step description",
                    "type": "code_execution|tool_use|llm_analysis|agent_creation",
                    "code": "Python code if applicable",
                    "language": "python|bash|javascript",
                    "tool": "tool name if applicable",
                    "parameters": {{"param": "value"}},
                    "prompt": "LLM prompt if applicable",
                    "agent_spec": {{}} if creating agent,
                    "critical": true/false,
                    "estimated_time": seconds
                }}
            ],
            "success_criteria": [
                "Specific measurable criteria for success"
            ],
            "estimated_time": total_seconds,
            "required_tools": ["tool1", "tool2"]
        }}
        
        Focus on creating executable, specific steps that can be automatically validated.
        """

    def _evaluate_criterion(self, criterion: str, execution_results: List[Dict]) -> bool:
        """Evaluate a single success criterion"""
        
        # Simple heuristic evaluation
        # In production, would use more sophisticated logic
        
        if "all steps successful" in criterion.lower():
            return all(result["success"] for result in execution_results)
        
        if "no errors" in criterion.lower():
            return all(not result["error"] for result in execution_results)
        
        if "output generated" in criterion.lower():
            return any(result["output"] for result in execution_results)
        
        # Default to checking if any step was successful
        return any(result["success"] for result in execution_results)

    def _compile_final_results(self, task: Dict) -> Dict[str, Any]:
        """Compile final results from task execution"""
        
        return {
            "task_id": task["id"],
            "query": task["query"],
            "execution_summary": {
                "total_steps": len(task["execution_results"]),
                "successful_steps": sum(1 for r in task["execution_results"] if r["success"]),
                "total_time": (task.get("completed_at", datetime.now()) - task["created_at"]).total_seconds()
            },
            "outputs": [r["output"] for r in task["execution_results"] if r["output"]],
            "step_details": task["execution_results"]
        }

    def _format_response(self, task: Dict, results: Dict) -> Dict[str, Any]:
        """Format the final response"""
        
        return {
            "status": "success" if results.get("success", False) else "error",
            "message": results.get("message", ""),
            "task_id": task["id"],
            "session_id": task["session_id"],
            "results": results,
            "timestamp": datetime.now().isoformat(),
            "execution_time": (
                task.get("completed_at", datetime.now()) - task["created_at"]
            ).total_seconds()
        }

    def _update_metrics(self, success: bool, completion_time: float):
        """Update performance metrics"""
        
        self.metrics["total_tasks"] += 1
        
        if success:
            self.metrics["successful_tasks"] += 1
        else:
            self.metrics["failed_tasks"] += 1
        
        # Update average completion time
        total_time = self.metrics["average_completion_time"] * (self.metrics["total_tasks"] - 1)
        self.metrics["average_completion_time"] = (total_time + completion_time) / self.metrics["total_tasks"]

    def get_status(self) -> Dict[str, Any]:
        """Get orchestrator status"""
        return {
            "status": "operational",
            "metrics": self.metrics,
            "active_sessions": len(self.active_sessions),
            "total_tasks_in_history": len(self.task_history)
        }

    def get_active_sessions(self) -> List[Dict]:
        """Get active session information"""
        return [
            {
                "session_id": sid,
                "created_at": session["created_at"].isoformat(),
                "mode": session["mode"],
                "task_count": session["task_count"]
            }
            for sid, session in self.active_sessions.items()
        ]

    def get_system_resources(self) -> Dict[str, Any]:
        """Get system resource information"""
        import psutil
        
        return {
            "cpu_percent": psutil.cpu_percent(),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_percent": psutil.disk_usage('/').percent,
            "active_processes": len(psutil.pids())
        }
