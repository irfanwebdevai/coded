import logging
import json
import asyncio
from datetime import datetime
from typing import Dict, List, Any, Optional
from abc import ABC, abstractmethod
import traceback
from enum import Enum

class TaskStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    SKIPPED = "skipped"

class Task(ABC):
    """Abstract base class for all automation tasks"""
    
    def __init__(self, name: str, config: Dict[str, Any] = None):
        self.name = name
        self.config = config or {}
        self.status = TaskStatus.PENDING
        self.result = None
        self.error = None
        self.start_time = None
        self.end_time = None
        self.logger = logging.getLogger(f"Task.{name}")
    
    @abstractmethod
    async def execute(self, context: Dict[str, Any]) -> Any:
        """Execute the task"""
        pass
    
    async def run(self, context: Dict[str, Any]) -> Any:
        """Run the task with error handling and logging"""
        self.logger.info(f"Starting task: {self.name}")
        self.status = TaskStatus.RUNNING
        self.start_time = datetime.now()
        
        try:
            self.result = await self.execute(context)
            self.status = TaskStatus.SUCCESS
            self.logger.info(f"Task completed successfully: {self.name}")
            return self.result
        except Exception as e:
            self.status = TaskStatus.FAILED
            self.error = str(e)
            self.logger.error(f"Task failed: {self.name} - {str(e)}")
            self.logger.debug(traceback.format_exc())
            raise
        finally:
            self.end_time = datetime.now()
            duration = (self.end_time - self.start_time).total_seconds()
            self.logger.info(f"Task {self.name} took {duration:.2f} seconds")

class Workflow:
    """Main workflow engine that orchestrates tasks"""
    
    def __init__(self, name: str, tasks: List[Task], config: Dict[str, Any] = None):
        self.name = name
        self.tasks = tasks
        self.config = config or {}
        self.context = {}
        self.logger = logging.getLogger(f"Workflow.{name}")
        self.status = TaskStatus.PENDING
        self.start_time = None
        self.end_time = None
    
    async def run(self, initial_context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Execute the workflow"""
        self.logger.info(f"Starting workflow: {self.name}")
        self.status = TaskStatus.RUNNING
        self.start_time = datetime.now()
        self.context = initial_context or {}
        
        try:
            for task in self.tasks:
                if self.should_skip_task(task):
                    task.status = TaskStatus.SKIPPED
                    self.logger.info(f"Skipping task: {task.name}")
                    continue
                
                await task.run(self.context)
                
                # Update context with task results
                if task.result is not None:
                    self.context[f"{task.name}_result"] = task.result
            
            self.status = TaskStatus.SUCCESS
            self.logger.info(f"Workflow completed successfully: {self.name}")
        except Exception as e:
            self.status = TaskStatus.FAILED
            self.logger.error(f"Workflow failed: {self.name} - {str(e)}")
            raise
        finally:
            self.end_time = datetime.now()
            duration = (self.end_time - self.start_time).total_seconds()
            self.logger.info(f"Workflow {self.name} took {duration:.2f} seconds")
        
        return self.context
    
    def should_skip_task(self, task: Task) -> bool:
        """Determine if a task should be skipped based on conditions"""
        if "skip_conditions" in task.config:
            for condition in task.config["skip_conditions"]:
                if self.evaluate_condition(condition):
                    return True
        return False
    
    def evaluate_condition(self, condition: Dict[str, Any]) -> bool:
        """Evaluate a condition"""
        # Simple implementation - can be extended
        if "context_key" in condition and "value" in condition:
            key = condition["context_key"]
            expected_value = condition["value"]
            return self.context.get(key) == expected_value
        return False
    
    def get_summary(self) -> Dict[str, Any]:
        """Get workflow execution summary"""
        return {
            "name": self.name,
            "status": self.status.value,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "duration": (self.end_time - self.start_time).total_seconds() if self.start_time and self.end_time else None,
            "tasks": [
                {
                    "name": task.name,
                    "status": task.status.value,
                    "error": task.error
                }
                for task in self.tasks
            ],
            "context": self.context
        }

class WorkflowEngine:
    """Main engine to manage and execute workflows"""
    
    def __init__(self, config_file: Optional[str] = None):
        self.workflows: Dict[str, Workflow] = {}
        self.config = {}
        self.logger = logging.getLogger("WorkflowEngine")
        
        if config_file:
            self.load_config(config_file)
    
    def load_config(self, config_file: str):
        """Load configuration from file"""
        with open(config_file, 'r') as f:
            self.config = json.load(f)
        
        # Configure logging
        log_config = self.config.get('logging', {})
        logging.basicConfig(
            level=getattr(logging, log_config.get('level', 'INFO')),
            format=log_config.get('format', '%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        )
    
    def register_workflow(self, workflow: Workflow):
        """Register a workflow"""
        self.workflows[workflow.name] = workflow
        self.logger.info(f"Registered workflow: {workflow.name}")
    
    async def run_workflow(self, workflow_name: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Run a specific workflow"""
        if workflow_name not in self.workflows:
            raise ValueError(f"Workflow not found: {workflow_name}")
        
        workflow = self.workflows[workflow_name]
        return await workflow.run(context)
    
    async def run_all_workflows(self, context: Dict[str, Any] = None) -> Dict[str, Dict[str, Any]]:
        """Run all registered workflows"""
        results = {}
        for name, workflow in self.workflows.items():
            try:
                result = await workflow.run(context.copy() if context else None)
                results[name] = {"status": "success", "result": result}
            except Exception as e:
                results[name] = {"status": "failed", "error": str(e)}
        
        return results