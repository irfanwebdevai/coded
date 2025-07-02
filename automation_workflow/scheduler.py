import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Callable
from croniter import croniter
import pytz

from workflow_engine import WorkflowEngine, Workflow

class ScheduledJob:
    """Represents a scheduled job"""
    
    def __init__(self, name: str, workflow_name: str, schedule: str, 
                 timezone: str = 'UTC', enabled: bool = True,
                 context: Dict[str, Any] = None):
        self.name = name
        self.workflow_name = workflow_name
        self.schedule = schedule
        self.timezone = pytz.timezone(timezone)
        self.enabled = enabled
        self.context = context or {}
        self.last_run = None
        self.next_run = None
        self.logger = logging.getLogger(f"ScheduledJob.{name}")
        
        # Calculate next run time
        self._calculate_next_run()
    
    def _calculate_next_run(self):
        """Calculate the next run time based on cron expression"""
        now = datetime.now(self.timezone)
        cron = croniter(self.schedule, now)
        self.next_run = cron.get_next(datetime)
    
    def should_run(self) -> bool:
        """Check if the job should run now"""
        if not self.enabled:
            return False
        
        now = datetime.now(self.timezone)
        return self.next_run and now >= self.next_run
    
    def mark_completed(self):
        """Mark the job as completed and calculate next run"""
        self.last_run = datetime.now(self.timezone)
        self._calculate_next_run()

class WorkflowScheduler:
    """Scheduler for running workflows on a schedule"""
    
    def __init__(self, engine: WorkflowEngine, check_interval: int = 60):
        self.engine = engine
        self.check_interval = check_interval
        self.jobs: Dict[str, ScheduledJob] = {}
        self.running = False
        self.logger = logging.getLogger("WorkflowScheduler")
        self._task = None
        self._callbacks: List[Callable] = []
    
    def add_job(self, job: ScheduledJob):
        """Add a scheduled job"""
        self.jobs[job.name] = job
        self.logger.info(f"Added scheduled job: {job.name}")
    
    def remove_job(self, job_name: str):
        """Remove a scheduled job"""
        if job_name in self.jobs:
            del self.jobs[job_name]
            self.logger.info(f"Removed scheduled job: {job_name}")
    
    def enable_job(self, job_name: str):
        """Enable a scheduled job"""
        if job_name in self.jobs:
            self.jobs[job_name].enabled = True
            self.logger.info(f"Enabled job: {job_name}")
    
    def disable_job(self, job_name: str):
        """Disable a scheduled job"""
        if job_name in self.jobs:
            self.jobs[job_name].enabled = False
            self.logger.info(f"Disabled job: {job_name}")
    
    def add_callback(self, callback: Callable):
        """Add a callback to be called after each job execution"""
        self._callbacks.append(callback)
    
    async def start(self):
        """Start the scheduler"""
        if self.running:
            self.logger.warning("Scheduler is already running")
            return
        
        self.running = True
        self.logger.info("Starting workflow scheduler")
        self._task = asyncio.create_task(self._run())
    
    async def stop(self):
        """Stop the scheduler"""
        self.running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        self.logger.info("Stopped workflow scheduler")
    
    async def _run(self):
        """Main scheduler loop"""
        while self.running:
            try:
                # Check all jobs
                for job in self.jobs.values():
                    if job.should_run():
                        await self._execute_job(job)
                
                # Wait for the next check
                await asyncio.sleep(self.check_interval)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Error in scheduler loop: {str(e)}")
                await asyncio.sleep(self.check_interval)
    
    async def _execute_job(self, job: ScheduledJob):
        """Execute a scheduled job"""
        self.logger.info(f"Executing scheduled job: {job.name}")
        
        try:
            # Run the workflow
            result = await self.engine.run_workflow(job.workflow_name, job.context.copy())
            
            # Mark job as completed
            job.mark_completed()
            
            # Call callbacks
            for callback in self._callbacks:
                try:
                    await callback(job, result, None)
                except Exception as e:
                    self.logger.error(f"Error in callback: {str(e)}")
            
            self.logger.info(f"Scheduled job completed: {job.name}")
            
        except Exception as e:
            self.logger.error(f"Failed to execute scheduled job {job.name}: {str(e)}")
            
            # Call callbacks with error
            for callback in self._callbacks:
                try:
                    await callback(job, None, e)
                except Exception as e2:
                    self.logger.error(f"Error in callback: {str(e2)}")
            
            # Still mark as completed to avoid immediate retry
            job.mark_completed()
    
    def get_job_status(self) -> List[Dict[str, Any]]:
        """Get status of all scheduled jobs"""
        return [
            {
                "name": job.name,
                "workflow": job.workflow_name,
                "schedule": job.schedule,
                "enabled": job.enabled,
                "last_run": job.last_run.isoformat() if job.last_run else None,
                "next_run": job.next_run.isoformat() if job.next_run else None
            }
            for job in self.jobs.values()
        ]

class IntervalScheduler:
    """Simple interval-based scheduler for workflows"""
    
    def __init__(self, engine: WorkflowEngine):
        self.engine = engine
        self.tasks: Dict[str, asyncio.Task] = {}
        self.logger = logging.getLogger("IntervalScheduler")
    
    async def schedule_workflow(self, workflow_name: str, interval_seconds: int,
                               context: Dict[str, Any] = None, 
                               run_immediately: bool = True):
        """Schedule a workflow to run at regular intervals"""
        
        async def run_periodically():
            if not run_immediately:
                await asyncio.sleep(interval_seconds)
            
            while True:
                try:
                    self.logger.info(f"Running scheduled workflow: {workflow_name}")
                    await self.engine.run_workflow(workflow_name, context.copy() if context else None)
                except Exception as e:
                    self.logger.error(f"Error running workflow {workflow_name}: {str(e)}")
                
                await asyncio.sleep(interval_seconds)
        
        # Cancel existing task if any
        if workflow_name in self.tasks:
            self.tasks[workflow_name].cancel()
        
        # Create new task
        task = asyncio.create_task(run_periodically())
        self.tasks[workflow_name] = task
        
        self.logger.info(f"Scheduled workflow {workflow_name} to run every {interval_seconds} seconds")
    
    def cancel_workflow(self, workflow_name: str):
        """Cancel a scheduled workflow"""
        if workflow_name in self.tasks:
            self.tasks[workflow_name].cancel()
            del self.tasks[workflow_name]
            self.logger.info(f"Cancelled scheduled workflow: {workflow_name}")
    
    def cancel_all(self):
        """Cancel all scheduled workflows"""
        for workflow_name, task in self.tasks.items():
            task.cancel()
        self.tasks.clear()
        self.logger.info("Cancelled all scheduled workflows")