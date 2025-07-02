#!/usr/bin/env python3
"""
Automation Workflow System
A flexible, extensible automation framework for orchestrating various tasks
"""

import asyncio
import logging
import sys
import json
import argparse
from pathlib import Path
from typing import Dict, Any

from workflow_engine import WorkflowEngine, Workflow
from tasks import (
    FileTask, HTTPTask, ShellTask, DataTransformTask, 
    EmailTask, ConditionalTask, LoopTask, WaitTask, LogTask
)
from scheduler import WorkflowScheduler, ScheduledJob

# Task type mapping
TASK_TYPES = {
    'file': FileTask,
    'http': HTTPTask,
    'shell': ShellTask,
    'transform': DataTransformTask,
    'email': EmailTask,
    'conditional': ConditionalTask,
    'loop': LoopTask,
    'wait': WaitTask,
    'log': LogTask
}

def load_workflow_from_config(workflow_name: str, workflow_config: Dict[str, Any]) -> Workflow:
    """Load a workflow from configuration"""
    tasks = []
    
    for task_config in workflow_config.get('tasks', []):
        task_type = task_config.get('type')
        task_name = task_config.get('name')
        task_settings = task_config.get('config', {})
        
        if task_type not in TASK_TYPES:
            raise ValueError(f"Unknown task type: {task_type}")
        
        task_class = TASK_TYPES[task_type]
        task = task_class(task_name, task_settings)
        tasks.append(task)
    
    return Workflow(workflow_name, tasks)

async def run_workflow(engine: WorkflowEngine, workflow_name: str, context: Dict[str, Any] = None):
    """Run a specific workflow"""
    try:
        print(f"\nRunning workflow: {workflow_name}")
        result = await engine.run_workflow(workflow_name, context)
        
        # Get workflow summary
        workflow = engine.workflows[workflow_name]
        summary = workflow.get_summary()
        
        print(f"\nWorkflow '{workflow_name}' completed!")
        print(f"Status: {summary['status']}")
        print(f"Duration: {summary['duration']:.2f} seconds")
        
        # Show task statuses
        print("\nTask results:")
        for task in summary['tasks']:
            status_emoji = "✅" if task['status'] == 'success' else "❌" if task['status'] == 'failed' else "⏭️"
            print(f"  {status_emoji} {task['name']}: {task['status']}")
            if task['error']:
                print(f"     Error: {task['error']}")
        
        return result
        
    except Exception as e:
        print(f"\nWorkflow '{workflow_name}' failed: {str(e)}")
        raise

async def run_scheduled_workflows(engine: WorkflowEngine, schedules: list):
    """Run workflows on schedule"""
    scheduler = WorkflowScheduler(engine, check_interval=30)
    
    # Add scheduled jobs
    for schedule_config in schedules:
        job = ScheduledJob(
            name=schedule_config['name'],
            workflow_name=schedule_config['workflow'],
            schedule=schedule_config['schedule'],
            timezone=schedule_config.get('timezone', 'UTC'),
            enabled=schedule_config.get('enabled', True)
        )
        scheduler.add_job(job)
        print(f"Scheduled job '{job.name}' for workflow '{job.workflow_name}'")
    
    # Define callback for job completion
    async def job_callback(job: ScheduledJob, result: Any, error: Exception):
        if error:
            print(f"\n❌ Scheduled job '{job.name}' failed: {str(error)}")
        else:
            print(f"\n✅ Scheduled job '{job.name}' completed successfully")
    
    scheduler.add_callback(job_callback)
    
    print("\nStarting scheduler... Press Ctrl+C to stop")
    await scheduler.start()
    
    try:
        # Keep running until interrupted
        while True:
            await asyncio.sleep(60)
            
            # Show job status every minute
            print("\nScheduled jobs status:")
            for job_status in scheduler.get_job_status():
                enabled = "✓" if job_status['enabled'] else "✗"
                print(f"  [{enabled}] {job_status['name']}: Next run at {job_status['next_run']}")
                
    except KeyboardInterrupt:
        print("\nStopping scheduler...")
        await scheduler.stop()

async def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Automation Workflow System')
    parser.add_argument('--config', '-c', default='config.json', help='Configuration file path')
    parser.add_argument('--workflow', '-w', help='Run a specific workflow')
    parser.add_argument('--list', '-l', action='store_true', help='List available workflows')
    parser.add_argument('--schedule', '-s', action='store_true', help='Run scheduled workflows')
    parser.add_argument('--context', help='JSON string with initial context for workflow')
    parser.add_argument('--log-level', default='INFO', choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'])
    
    args = parser.parse_args()
    
    # Configure logging
    logging.basicConfig(
        level=getattr(logging, args.log_level),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Load configuration
    config_path = Path(args.config)
    if not config_path.exists():
        print(f"Configuration file not found: {args.config}")
        sys.exit(1)
    
    with open(config_path, 'r') as f:
        config = json.load(f)
    
    # Create workflow engine
    engine = WorkflowEngine(args.config)
    
    # Load workflows from configuration
    workflows = config.get('workflows', {})
    for workflow_name, workflow_config in workflows.items():
        workflow = load_workflow_from_config(workflow_name, workflow_config)
        engine.register_workflow(workflow)
    
    print(f"Loaded {len(workflows)} workflows from configuration")
    
    # List workflows
    if args.list:
        print("\nAvailable workflows:")
        for name, workflow_config in workflows.items():
            description = workflow_config.get('description', 'No description')
            print(f"  - {name}: {description}")
        return
    
    # Run scheduled workflows
    if args.schedule:
        schedules = config.get('schedules', [])
        if not schedules:
            print("No scheduled workflows found in configuration")
            return
        
        await run_scheduled_workflows(engine, schedules)
        return
    
    # Run specific workflow
    if args.workflow:
        if args.workflow not in workflows:
            print(f"Workflow '{args.workflow}' not found")
            print("Use --list to see available workflows")
            sys.exit(1)
        
        # Parse context if provided
        context = {}
        if args.context:
            try:
                context = json.loads(args.context)
            except json.JSONDecodeError:
                print("Invalid JSON context")
                sys.exit(1)
        
        await run_workflow(engine, args.workflow, context)
        return
    
    # If no specific action, show help
    parser.print_help()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nInterrupted by user")
    except Exception as e:
        print(f"\nError: {str(e)}")
        sys.exit(1)