"""
Multi-LLM API Layer
Handles concurrent requests to multiple LLM providers
"""
import asyncio
import json
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import aiohttp
import openai
import google.generativeai as genai
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

from config import CONFIG, LLMConfig

logger = logging.getLogger(__name__)

class LLMResponse:
    """Standard response format for LLM outputs"""
    
    def __init__(self, provider: str, model: str, response: str, 
                 confidence: float = 0.0, latency: float = 0.0, 
                 error: Optional[str] = None, metadata: Optional[Dict] = None):
        self.provider = provider
        self.model = model
        self.response = response
        self.confidence = confidence
        self.latency = latency
        self.error = error
        self.metadata = metadata or {}
        self.timestamp = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "provider": self.provider,
            "model": self.model,
            "response": self.response,
            "confidence": self.confidence,
            "latency": self.latency,
            "error": self.error,
            "metadata": self.metadata,
            "timestamp": self.timestamp.isoformat()
        }

class MultiLLMAPILayer:
    """Manages multiple LLM API connections and handles concurrent requests"""
    
    def __init__(self):
        self.providers = {}
        self.rate_limits = {}
        self.response_cache = {}
        self.performance_metrics = {
            "total_requests": 0,
            "successful_requests": 0,
            "failed_requests": 0,
            "average_latency": 0.0,
            "provider_performance": {}
        }
        
        self._initialize_providers()
        logger.info("Multi-LLM API Layer initialized")
    
    def _initialize_providers(self):
        """Initialize all LLM providers"""
        
        for llm_config in CONFIG.llm_providers:
            try:
                if llm_config.name == "gemini" and llm_config.api_key:
                    genai.configure(api_key=llm_config.api_key)
                    self.providers["gemini"] = {
                        "config": llm_config,
                        "client": genai.GenerativeModel(llm_config.model),
                        "status": "active"
                    }
                    logger.info(f"Initialized Gemini provider")
                
                elif llm_config.name == "grok" and llm_config.api_key:
                    # Grok uses OpenAI-compatible API
                    self.providers["grok"] = {
                        "config": llm_config,
                        "client": openai.OpenAI(
                            api_key=llm_config.api_key,
                            base_url=llm_config.endpoint
                        ),
                        "status": "active"
                    }
                    logger.info(f"Initialized Grok provider")
                
                elif llm_config.name == "deepseek" and llm_config.api_key:
                    # DeepSeek uses OpenAI-compatible API
                    self.providers["deepseek"] = {
                        "config": llm_config,
                        "client": openai.OpenAI(
                            api_key=llm_config.api_key,
                            base_url=llm_config.endpoint
                        ),
                        "status": "active"
                    }
                    logger.info(f"Initialized DeepSeek provider")
                
                # Initialize rate limiting
                self.rate_limits[llm_config.name] = {
                    "requests_per_minute": 60,
                    "tokens_per_minute": 100000,
                    "current_requests": 0,
                    "current_tokens": 0,
                    "reset_time": datetime.now() + timedelta(minutes=1)
                }
                
            except Exception as e:
                logger.error(f"Failed to initialize {llm_config.name}: {str(e)}")
    
    def get_multiple_responses(self, prompt: str, task_type: str = "general", 
                             timeout: int = 30) -> List[LLMResponse]:
        """Get responses from all active providers concurrently"""
        
        logger.info(f"Getting responses for task_type: {task_type}")
        
        responses = []
        
        # Use ThreadPoolExecutor for concurrent requests
        with ThreadPoolExecutor(max_workers=len(self.providers)) as executor:
            future_to_provider = {
                executor.submit(self._get_single_response, provider_name, prompt, task_type, timeout): provider_name
                for provider_name in self.providers.keys()
                if self.providers[provider_name]["status"] == "active"
            }
            
            for future in as_completed(future_to_provider):
                provider_name = future_to_provider[future]
                try:
                    response = future.result()
                    if response:
                        responses.append(response)
                        logger.info(f"Got response from {provider_name}")
                except Exception as e:
                    logger.error(f"Error getting response from {provider_name}: {str(e)}")
                    responses.append(LLMResponse(
                        provider=provider_name,
                        model=self.providers[provider_name]["config"].model,
                        response="",
                        error=str(e)
                    ))
        
        # Update metrics
        self.performance_metrics["total_requests"] += len(responses)
        self.performance_metrics["successful_requests"] += sum(1 for r in responses if not r.error)
        self.performance_metrics["failed_requests"] += sum(1 for r in responses if r.error)
        
        return responses
    
    def _get_single_response(self, provider_name: str, prompt: str, 
                           task_type: str, timeout: int) -> Optional[LLMResponse]:
        """Get response from a single provider"""
        
        start_time = time.time()
        
        try:
            # Check rate limits
            if not self._check_rate_limit(provider_name):
                return LLMResponse(
                    provider=provider_name,
                    model=self.providers[provider_name]["config"].model,
                    response="",
                    error="Rate limit exceeded"
                )
            
            provider = self.providers[provider_name]
            config = provider["config"]
            
            # Format prompt based on task type
            formatted_prompt = self._format_prompt(prompt, task_type)
            
            # Make API call based on provider
            if provider_name == "gemini":
                response_text = self._call_gemini(provider["client"], formatted_prompt, config)
            elif provider_name == "grok":
                response_text = self._call_grok(provider["client"], formatted_prompt, config)
            elif provider_name == "deepseek":
                response_text = self._call_deepseek(provider["client"], formatted_prompt, config)
            else:
                raise ValueError(f"Unknown provider: {provider_name}")
            
            latency = time.time() - start_time
            
            # Calculate confidence score (simplified)
            confidence = self._calculate_confidence(response_text, task_type)
            
            return LLMResponse(
                provider=provider_name,
                model=config.model,
                response=response_text,
                confidence=confidence,
                latency=latency,
                metadata={"task_type": task_type, "prompt_length": len(prompt)}
            )
            
        except Exception as e:
            latency = time.time() - start_time
            logger.error(f"Error calling {provider_name}: {str(e)}")
            return LLMResponse(
                provider=provider_name,
                model=self.providers[provider_name]["config"].model,
                response="",
                confidence=0.0,
                latency=latency,
                error=str(e)
            )
    
    def _call_gemini(self, client, prompt: str, config: LLMConfig) -> str:
        """Call Gemini API"""
        
        generation_config = genai.types.GenerationConfig(
            max_output_tokens=config.max_tokens,
            temperature=config.temperature,
        )
        
        response = client.generate_content(
            prompt,
            generation_config=generation_config
        )
        
        return response.text
    
    def _call_grok(self, client, prompt: str, config: LLMConfig) -> str:
        """Call Grok API (OpenAI-compatible)"""
        
        response = client.chat.completions.create(
            model=config.model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=config.max_tokens,
            temperature=config.temperature
        )
        
        return response.choices[0].message.content
    
    def _call_deepseek(self, client, prompt: str, config: LLMConfig) -> str:
        """Call DeepSeek API (OpenAI-compatible)"""
        
        response = client.chat.completions.create(
            model=config.model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=config.max_tokens,
            temperature=config.temperature
        )
        
        return response.choices[0].message.content
    
    def _format_prompt(self, prompt: str, task_type: str) -> str:
        """Format prompt based on task type"""
        
        if task_type == "planning":
            return f"""
            You are an expert AI planning assistant. Create a detailed, executable plan for the following task.
            
            Task: {prompt}
            
            Provide your response in valid JSON format with the following structure:
            {{
                "steps": [
                    {{
                        "description": "Step description",
                        "type": "code_execution|tool_use|llm_analysis|agent_creation",
                        "details": {{}}
                    }}
                ],
                "success_criteria": ["criterion1", "criterion2"],
                "estimated_time": seconds,
                "required_tools": ["tool1", "tool2"]
            }}
            """
        
        elif task_type == "analysis":
            return f"""
            You are an expert AI analyst. Provide a thorough analysis of the following:
            
            {prompt}
            
            Focus on accuracy, completeness, and actionable insights.
            """
        
        elif task_type == "correction":
            return f"""
            You are an expert AI debugging assistant. Analyze the following failure and provide correction steps.
            
            {prompt}
            
            Provide specific, actionable steps to resolve the issue.
            """
        
        else:
            return prompt
    
    def _calculate_confidence(self, response: str, task_type: str) -> float:
        """Calculate confidence score for response (simplified heuristic)"""
        
        if not response:
            return 0.0
        
        score = 0.5  # Base score
        
        # Length-based scoring
        if len(response) > 100:
            score += 0.1
        if len(response) > 500:
            score += 0.1
        
        # Task-specific scoring
        if task_type == "planning":
            if "steps" in response.lower() and "plan" in response.lower():
                score += 0.2
            if "{" in response and "}" in response:  # JSON format
                score += 0.1
        
        elif task_type == "analysis":
            if len(response.split()) > 50:  # Detailed analysis
                score += 0.2
        
        return min(score, 1.0)
    
    def _check_rate_limit(self, provider_name: str) -> bool:
        """Check if provider is within rate limits"""
        
        rate_limit = self.rate_limits.get(provider_name, {})
        now = datetime.now()
        
        # Reset counters if needed
        if now > rate_limit.get("reset_time", now):
            rate_limit["current_requests"] = 0
            rate_limit["current_tokens"] = 0
            rate_limit["reset_time"] = now + timedelta(minutes=1)
        
        # Check limits
        if rate_limit["current_requests"] >= rate_limit["requests_per_minute"]:
            logger.warning(f"Rate limit exceeded for {provider_name}")
            return False
        
        # Increment counter
        rate_limit["current_requests"] += 1
        return True
    
    def get_provider_status(self) -> Dict[str, Any]:
        """Get status of all providers"""
        
        status = {}
        for provider_name, provider in self.providers.items():
            status[provider_name] = {
                "status": provider["status"],
                "model": provider["config"].model,
                "rate_limit": self.rate_limits.get(provider_name, {})
            }
        
        return status
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get performance metrics"""
        
        return self.performance_metrics.copy()
    
    def set_provider_status(self, provider_name: str, status: str):
        """Set provider status (active/inactive)"""
        
        if provider_name in self.providers:
            self.providers[provider_name]["status"] = status
            logger.info(f"Set {provider_name} status to {status}")
        else:
            logger.warning(f"Provider {provider_name} not found")
