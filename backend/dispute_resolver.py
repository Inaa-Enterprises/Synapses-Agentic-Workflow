"""
Dispute Resolver
Analyzes multiple LLM responses and selects the best output
"""
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

from multi_llm_api_layer import LLMResponse

logger = logging.getLogger(__name__)

class DisputeResolver:
    """Resolves disputes between multiple LLM responses"""
    
    def __init__(self):
        self.resolution_history = []
        self.scoring_weights = {
            "confidence": 0.25,
            "latency": 0.15,
            "content_quality": 0.30,
            "format_compliance": 0.20,
            "consensus": 0.10
        }
        
        logger.info("Dispute Resolver initialized")
    
    def resolve_planning_dispute(self, responses: List[LLMResponse]) -> Optional[Dict[str, Any]]:
        """Resolve disputes for planning tasks"""
        
        logger.info(f"Resolving planning dispute with {len(responses)} responses")
        
        # Filter out error responses
        valid_responses = [r for r in responses if not r.error and r.response]
        
        if not valid_responses:
            logger.error("No valid responses to resolve")
            return None
        
        # Score each response
        scored_responses = []
        
        for response in valid_responses:
            try:
                # Parse JSON if possible
                parsed_plan = self._parse_json_plan(response.response)
                
                score = self._score_planning_response(response, parsed_plan)
                
                scored_responses.append({
                    "response": response,
                    "parsed_plan": parsed_plan,
                    "score": score
                })
                
            except Exception as e:
                logger.error(f"Error scoring response from {response.provider}: {str(e)}")
                continue
        
        if not scored_responses:
            logger.error("No scorable responses found")
            return None
        
        # Select best response
        best_response = max(scored_responses, key=lambda x: x["score"])
        
        # Log resolution
        self._log_resolution("planning", responses, best_response)
        
        return best_response["parsed_plan"]
    
    def resolve_analysis_dispute(self, responses: List[LLMResponse]) -> Optional[str]:
        """Resolve disputes for analysis tasks"""
        
        logger.info(f"Resolving analysis dispute with {len(responses)} responses")
        
        # Filter out error responses
        valid_responses = [r for r in responses if not r.error and r.response]
        
        if not valid_responses:
            return None
        
        # Score each response
        scored_responses = []
        
        for response in valid_responses:
            score = self._score_analysis_response(response, valid_responses)
            scored_responses.append({
                "response": response,
                "score": score
            })
        
        # Select best response
        best_response = max(scored_responses, key=lambda x: x["score"])
        
        # Log resolution
        self._log_resolution("analysis", responses, best_response)
        
        return best_response["response"].response
    
    def resolve_correction_dispute(self, responses: List[LLMResponse]) -> Optional[Dict[str, Any]]:
        """Resolve disputes for correction tasks"""
        
        logger.info(f"Resolving correction dispute with {len(responses)} responses")
        
        # Filter out error responses
        valid_responses = [r for r in responses if not r.error and r.response]
        
        if not valid_responses:
            return None
        
        # Score each response
        scored_responses = []
        
        for response in valid_responses:
            score = self._score_correction_response(response, valid_responses)
            scored_responses.append({
                "response": response,
                "score": score
            })
        
        # Select best response
        best_response = max(scored_responses, key=lambda x: x["score"])
        
        # Log resolution
        self._log_resolution("correction", responses, best_response)
        
        # Parse correction plan
        correction_plan = self._parse_correction_plan(best_response["response"].response)
        
        return correction_plan
    
    def _parse_json_plan(self, response_text: str) -> Dict[str, Any]:
        """Parse JSON plan from response text"""
        
        try:
            # Try to extract JSON from response
            json_match = re.search(r'```json\\n(.*?)\\n```', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                # Look for JSON-like structure
                json_match = re.search(r'\\{.*\\}', response_text, re.DOTALL)
                if json_match:
                    json_str = json_match.group(0)
                else:
                    json_str = response_text
            
            # Parse JSON
            plan = json.loads(json_str)
            
            # Validate required fields
            if "steps" not in plan:
                raise ValueError("Missing 'steps' field")
            
            if "success_criteria" not in plan:
                plan["success_criteria"] = ["Task completed successfully"]
            
            return plan
            
        except Exception as e:
            logger.error(f"Error parsing JSON plan: {str(e)}")
            
            # Fallback: create a simple plan
            return {
                "steps": [
                    {
                        "description": "Execute user request",
                        "type": "llm_analysis",
                        "prompt": response_text[:500] + "...",
                        "critical": True
                    }
                ],
                "success_criteria": ["Task completed successfully"],
                "estimated_time": 60,
                "required_tools": []
            }
    
    def _score_planning_response(self, response: LLMResponse, parsed_plan: Dict[str, Any]) -> float:
        """Score a planning response"""
        
        score = 0.0
        
        # Confidence score
        score += response.confidence * self.scoring_weights["confidence"]
        
        # Latency score (lower is better)
        latency_score = max(0, 1 - (response.latency / 10))  # Normalize to 0-1
        score += latency_score * self.scoring_weights["latency"]
        
        # Content quality score
        content_score = self._evaluate_plan_quality(parsed_plan)
        score += content_score * self.scoring_weights["content_quality"]
        
        # Format compliance score
        format_score = self._evaluate_plan_format(parsed_plan)
        score += format_score * self.scoring_weights["format_compliance"]
        
        return score
    
    def _score_analysis_response(self, response: LLMResponse, all_responses: List[LLMResponse]) -> float:
        """Score an analysis response"""
        
        score = 0.0
        
        # Confidence score
        score += response.confidence * self.scoring_weights["confidence"]
        
        # Latency score (lower is better)
        latency_score = max(0, 1 - (response.latency / 10))
        score += latency_score * self.scoring_weights["latency"]
        
        # Content quality score
        content_score = self._evaluate_analysis_quality(response.response)
        score += content_score * self.scoring_weights["content_quality"]
        
        # Consensus score (similarity to other responses)
        consensus_score = self._calculate_consensus(response, all_responses)
        score += consensus_score * self.scoring_weights["consensus"]
        
        return score
    
    def _score_correction_response(self, response: LLMResponse, all_responses: List[LLMResponse]) -> float:
        """Score a correction response"""
        
        score = 0.0
        
        # Confidence score
        score += response.confidence * self.scoring_weights["confidence"]
        
        # Latency score
        latency_score = max(0, 1 - (response.latency / 10))
        score += latency_score * self.scoring_weights["latency"]
        
        # Content quality score
        content_score = self._evaluate_correction_quality(response.response)
        score += content_score * self.scoring_weights["content_quality"]
        
        # Consensus score
        consensus_score = self._calculate_consensus(response, all_responses)
        score += consensus_score * self.scoring_weights["consensus"]
        
        return score
    
    def _evaluate_plan_quality(self, plan: Dict[str, Any]) -> float:
        """Evaluate the quality of a plan"""
        
        quality_score = 0.0
        
        # Check for required fields
        if "steps" in plan and isinstance(plan["steps"], list):
            quality_score += 0.3
            
            # Check step quality
            for step in plan["steps"]:
                if isinstance(step, dict) and "description" in step and "type" in step:
                    quality_score += 0.1
                    
                    # Check for detailed steps
                    if len(step.get("description", "")) > 20:
                        quality_score += 0.05
        
        # Check for success criteria
        if "success_criteria" in plan and isinstance(plan["success_criteria"], list):
            quality_score += 0.2
            
            # Check criteria quality
            for criteria in plan["success_criteria"]:
                if isinstance(criteria, str) and len(criteria) > 10:
                    quality_score += 0.05
        
        # Check for time estimation
        if "estimated_time" in plan and isinstance(plan["estimated_time"], (int, float)):
            quality_score += 0.1
        
        return min(quality_score, 1.0)
    
    def _evaluate_plan_format(self, plan: Dict[str, Any]) -> float:
        """Evaluate the format compliance of a plan"""
        
        format_score = 0.0
        
        # Check top-level structure
        required_fields = ["steps", "success_criteria"]
        for field in required_fields:
            if field in plan:
                format_score += 0.3
        
        # Check step format
        if "steps" in plan and isinstance(plan["steps"], list):
            for step in plan["steps"]:
                if isinstance(step, dict):
                    if "description" in step and "type" in step:
                        format_score += 0.2
                        break
        
        return min(format_score, 1.0)
    
    def _evaluate_analysis_quality(self, response_text: str) -> float:
        """Evaluate the quality of an analysis response"""
        
        quality_score = 0.0
        
        # Length-based scoring
        if len(response_text) > 100:
            quality_score += 0.2
        if len(response_text) > 500:
            quality_score += 0.2
        
        # Content indicators
        analysis_indicators = [
            "analysis", "conclusion", "recommendation", "findings",
            "observation", "insight", "assessment", "evaluation"
        ]
        
        for indicator in analysis_indicators:
            if indicator in response_text.lower():
                quality_score += 0.1
        
        # Structure indicators
        structure_indicators = ["1.", "2.", "3.", "•", "-", "First", "Second", "Finally"]
        
        for indicator in structure_indicators:
            if indicator in response_text:
                quality_score += 0.1
                break
        
        return min(quality_score, 1.0)
    
    def _evaluate_correction_quality(self, response_text: str) -> float:
        """Evaluate the quality of a correction response"""
        
        quality_score = 0.0
        
        # Length-based scoring
        if len(response_text) > 50:
            quality_score += 0.2
        if len(response_text) > 200:
            quality_score += 0.2
        
        # Correction indicators
        correction_indicators = [
            "fix", "correct", "solution", "resolve", "debug",
            "error", "issue", "problem", "step", "action"
        ]
        
        for indicator in correction_indicators:
            if indicator in response_text.lower():
                quality_score += 0.1
        
        # Actionable content
        action_indicators = ["1.", "2.", "3.", "step", "first", "then", "next", "finally"]
        
        for indicator in action_indicators:
            if indicator in response_text.lower():
                quality_score += 0.1
                break
        
        return min(quality_score, 1.0)
    
    def _calculate_consensus(self, response: LLMResponse, all_responses: List[LLMResponse]) -> float:
        """Calculate consensus score based on similarity to other responses"""
        
        if len(all_responses) < 2:
            return 0.5  # Neutral score for single response
        
        try:
            # Get response texts
            response_texts = [r.response for r in all_responses if r.response]
            
            if len(response_texts) < 2:
                return 0.5
            
            # Calculate TF-IDF similarity
            vectorizer = TfidfVectorizer(stop_words='english', max_features=1000)
            tfidf_matrix = vectorizer.fit_transform(response_texts)
            
            # Find similarity of target response to others
            target_idx = next(i for i, r in enumerate(all_responses) if r == response)
            similarities = cosine_similarity(tfidf_matrix[target_idx:target_idx+1], tfidf_matrix)[0]
            
            # Remove self-similarity
            similarities = np.delete(similarities, target_idx)
            
            # Return average similarity
            return np.mean(similarities)
            
        except Exception as e:
            logger.error(f"Error calculating consensus: {str(e)}")
            return 0.5
    
    def _parse_correction_plan(self, response_text: str) -> Dict[str, Any]:
        """Parse correction plan from response text"""
        
        # Extract steps from response
        steps = []
        
        # Look for numbered steps
        step_matches = re.findall(r'\\d+\\.\\s*(.+?)(?=\\n|$)', response_text, re.MULTILINE)
        
        for i, step_text in enumerate(step_matches):
            steps.append({
                "step_number": i + 1,
                "description": step_text.strip(),
                "type": "manual_action"
            })
        
        # If no numbered steps, create a single step
        if not steps:
            steps = [{
                "step_number": 1,
                "description": response_text[:200] + "...",
                "type": "manual_action"
            }]
        
        return {
            "correction_steps": steps,
            "priority": "high",
            "estimated_time": len(steps) * 60  # 1 minute per step
        }
    
    def _log_resolution(self, task_type: str, responses: List[LLMResponse], best_response: Dict[str, Any]):
        """Log resolution for analysis"""
        
        resolution_record = {
            "timestamp": datetime.now().isoformat(),
            "task_type": task_type,
            "num_responses": len(responses),
            "selected_provider": best_response["response"].provider,
            "selected_score": best_response["score"],
            "provider_scores": {
                r.provider: scored_r["score"] 
                for r, scored_r in zip(responses, [best_response])
            }
        }
        
        self.resolution_history.append(resolution_record)
        
        # Keep only last 100 records
        if len(self.resolution_history) > 100:
            self.resolution_history = self.resolution_history[-100:]
        
        logger.info(f"Resolution completed: {task_type} -> {best_response['response'].provider}")
    
    def get_resolution_history(self) -> List[Dict[str, Any]]:
        """Get resolution history"""
        return self.resolution_history.copy()
    
    def get_provider_performance(self) -> Dict[str, Any]:
        """Get provider performance statistics"""
        
        provider_stats = {}
        
        for record in self.resolution_history:
            selected_provider = record["selected_provider"]
            
            if selected_provider not in provider_stats:
                provider_stats[selected_provider] = {
                    "selections": 0,
                    "total_score": 0.0,
                    "task_types": {}
                }
            
            provider_stats[selected_provider]["selections"] += 1
            provider_stats[selected_provider]["total_score"] += record["selected_score"]
            
            task_type = record["task_type"]
            if task_type not in provider_stats[selected_provider]["task_types"]:
                provider_stats[selected_provider]["task_types"][task_type] = 0
            provider_stats[selected_provider]["task_types"][task_type] += 1
        
        # Calculate averages
        for provider, stats in provider_stats.items():
            if stats["selections"] > 0:
                stats["average_score"] = stats["total_score"] / stats["selections"]
        
        return provider_stats
    
    def update_scoring_weights(self, new_weights: Dict[str, float]):
        """Update scoring weights"""
        
        # Validate weights sum to 1.0
        total_weight = sum(new_weights.values())
        if abs(total_weight - 1.0) > 0.01:
            logger.error(f"Scoring weights must sum to 1.0, got {total_weight}")
            return False
        
        self.scoring_weights.update(new_weights)
        logger.info(f"Updated scoring weights: {self.scoring_weights}")
        return True
