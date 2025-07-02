import os
import json
import time
import requests
import subprocess
import asyncio
import aiofiles
import aiohttp
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime
import pandas as pd
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from workflow_engine import Task

class FileTask(Task):
    """Task for file operations"""
    
    async def execute(self, context: Dict[str, Any]) -> Any:
        operation = self.config.get('operation', 'read')
        file_path = self.config.get('file_path')
        
        if not file_path:
            raise ValueError("file_path is required")
        
        if operation == 'read':
            async with aiofiles.open(file_path, 'r') as f:
                content = await f.read()
            return content
        
        elif operation == 'write':
            content = self.config.get('content', '')
            async with aiofiles.open(file_path, 'w') as f:
                await f.write(content)
            return f"Written to {file_path}"
        
        elif operation == 'copy':
            destination = self.config.get('destination')
            if not destination:
                raise ValueError("destination is required for copy operation")
            
            async with aiofiles.open(file_path, 'rb') as src:
                async with aiofiles.open(destination, 'wb') as dst:
                    await dst.write(await src.read())
            return f"Copied {file_path} to {destination}"
        
        elif operation == 'delete':
            os.remove(file_path)
            return f"Deleted {file_path}"
        
        elif operation == 'list':
            path = Path(file_path)
            if path.is_dir():
                files = list(path.iterdir())
                return [str(f) for f in files]
            else:
                raise ValueError(f"{file_path} is not a directory")
        
        else:
            raise ValueError(f"Unknown operation: {operation}")

class HTTPTask(Task):
    """Task for HTTP requests"""
    
    async def execute(self, context: Dict[str, Any]) -> Any:
        url = self.config.get('url')
        method = self.config.get('method', 'GET')
        headers = self.config.get('headers', {})
        params = self.config.get('params', {})
        data = self.config.get('data')
        timeout = self.config.get('timeout', 30)
        
        if not url:
            raise ValueError("url is required")
        
        async with aiohttp.ClientSession() as session:
            async with session.request(
                method=method,
                url=url,
                headers=headers,
                params=params,
                json=data if isinstance(data, dict) else None,
                data=data if isinstance(data, str) else None,
                timeout=aiohttp.ClientTimeout(total=timeout)
            ) as response:
                result = {
                    'status_code': response.status,
                    'headers': dict(response.headers),
                    'body': await response.text()
                }
                
                # Try to parse JSON response
                try:
                    result['json'] = await response.json()
                except:
                    pass
                
                return result

class ShellTask(Task):
    """Task for running shell commands"""
    
    async def execute(self, context: Dict[str, Any]) -> Any:
        command = self.config.get('command')
        shell = self.config.get('shell', True)
        timeout = self.config.get('timeout', 60)
        cwd = self.config.get('cwd')
        env = self.config.get('env', {})
        
        if not command:
            raise ValueError("command is required")
        
        # Merge environment variables
        process_env = os.environ.copy()
        process_env.update(env)
        
        try:
            process = await asyncio.create_subprocess_shell(
                command if shell else ' '.join(command),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=cwd,
                env=process_env
            )
            
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=timeout
            )
            
            return {
                'returncode': process.returncode,
                'stdout': stdout.decode('utf-8'),
                'stderr': stderr.decode('utf-8'),
                'success': process.returncode == 0
            }
            
        except asyncio.TimeoutError:
            process.kill()
            raise TimeoutError(f"Command timed out after {timeout} seconds")

class DataTransformTask(Task):
    """Task for data transformation operations"""
    
    async def execute(self, context: Dict[str, Any]) -> Any:
        source_file = self.config.get('source_file')
        destination_file = self.config.get('destination_file')
        transform_type = self.config.get('transform_type', 'csv_to_json')
        
        if not source_file:
            raise ValueError("source_file is required")
        
        if transform_type == 'csv_to_json':
            df = pd.read_csv(source_file)
            result = df.to_dict('records')
            
            if destination_file:
                with open(destination_file, 'w') as f:
                    json.dump(result, f, indent=2)
            
            return result
        
        elif transform_type == 'json_to_csv':
            with open(source_file, 'r') as f:
                data = json.load(f)
            
            df = pd.DataFrame(data)
            
            if destination_file:
                df.to_csv(destination_file, index=False)
            
            return f"Converted to CSV: {destination_file}"
        
        elif transform_type == 'aggregate':
            df = pd.read_csv(source_file)
            group_by = self.config.get('group_by', [])
            agg_functions = self.config.get('agg_functions', {'count': 'size'})
            
            if group_by:
                result = df.groupby(group_by).agg(agg_functions)
                
                if destination_file:
                    result.to_csv(destination_file)
                
                return result.to_dict()
            else:
                raise ValueError("group_by is required for aggregate transform")
        
        else:
            raise ValueError(f"Unknown transform_type: {transform_type}")

class EmailTask(Task):
    """Task for sending emails"""
    
    async def execute(self, context: Dict[str, Any]) -> Any:
        smtp_server = self.config.get('smtp_server', 'smtp.gmail.com')
        smtp_port = self.config.get('smtp_port', 587)
        username = self.config.get('username')
        password = self.config.get('password')
        from_email = self.config.get('from_email', username)
        to_emails = self.config.get('to_emails', [])
        subject = self.config.get('subject', 'Automation Notification')
        body = self.config.get('body', '')
        
        if not username or not password:
            raise ValueError("username and password are required")
        
        if not to_emails:
            raise ValueError("to_emails is required")
        
        # Create message
        msg = MIMEMultipart()
        msg['From'] = from_email
        msg['To'] = ', '.join(to_emails)
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))
        
        # Send email
        try:
            server = smtplib.SMTP(smtp_server, smtp_port)
            server.starttls()
            server.login(username, password)
            server.send_message(msg)
            server.quit()
            
            return f"Email sent to {', '.join(to_emails)}"
        except Exception as e:
            raise Exception(f"Failed to send email: {str(e)}")

class ConditionalTask(Task):
    """Task that executes based on conditions"""
    
    async def execute(self, context: Dict[str, Any]) -> Any:
        condition = self.config.get('condition', {})
        true_value = self.config.get('true_value')
        false_value = self.config.get('false_value')
        
        # Evaluate condition
        condition_type = condition.get('type', 'equals')
        left = self._evaluate_value(condition.get('left'), context)
        right = self._evaluate_value(condition.get('right'), context)
        
        result = False
        if condition_type == 'equals':
            result = left == right
        elif condition_type == 'not_equals':
            result = left != right
        elif condition_type == 'greater_than':
            result = left > right
        elif condition_type == 'less_than':
            result = left < right
        elif condition_type == 'contains':
            result = str(right) in str(left)
        elif condition_type == 'exists':
            result = left is not None
        
        return true_value if result else false_value
    
    def _evaluate_value(self, value: Any, context: Dict[str, Any]) -> Any:
        """Evaluate a value that might be a context reference"""
        if isinstance(value, str) and value.startswith('${') and value.endswith('}'):
            key = value[2:-1]
            return context.get(key)
        return value

class LoopTask(Task):
    """Task that loops over items"""
    
    async def execute(self, context: Dict[str, Any]) -> Any:
        items = self.config.get('items', [])
        if isinstance(items, str) and items.startswith('${') and items.endswith('}'):
            key = items[2:-1]
            items = context.get(key, [])
        
        task_config = self.config.get('task', {})
        task_type = task_config.get('type')
        results = []
        
        for index, item in enumerate(items):
            # Create a new context for each iteration
            loop_context = context.copy()
            loop_context['loop_item'] = item
            loop_context['loop_index'] = index
            
            # Create and execute the task
            task = self._create_task(task_type, task_config, f"{self.name}_item_{index}")
            result = await task.run(loop_context)
            results.append(result)
        
        return results
    
    def _create_task(self, task_type: str, config: Dict[str, Any], name: str) -> Task:
        """Create a task instance based on type"""
        task_map = {
            'file': FileTask,
            'http': HTTPTask,
            'shell': ShellTask,
            'transform': DataTransformTask,
            'email': EmailTask,
            'conditional': ConditionalTask
        }
        
        task_class = task_map.get(task_type)
        if not task_class:
            raise ValueError(f"Unknown task type: {task_type}")
        
        return task_class(name, config)

class WaitTask(Task):
    """Task that waits for a specified duration"""
    
    async def execute(self, context: Dict[str, Any]) -> Any:
        duration = self.config.get('duration', 1)
        await asyncio.sleep(duration)
        return f"Waited for {duration} seconds"

class LogTask(Task):
    """Task for logging messages"""
    
    async def execute(self, context: Dict[str, Any]) -> Any:
        message = self.config.get('message', '')
        level = self.config.get('level', 'INFO')
        
        # Replace context variables in message
        for key, value in context.items():
            message = message.replace(f"${{{key}}}", str(value))
        
        log_func = getattr(self.logger, level.lower(), self.logger.info)
        log_func(message)
        
        return message