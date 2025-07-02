import asyncio
import logging
from workflow_engine import WorkflowEngine, Workflow, Task
from tasks import FileTask, HTTPTask, ShellTask, DataTransformTask, LogTask, ConditionalTask, LoopTask, WaitTask
from scheduler import WorkflowScheduler, ScheduledJob, IntervalScheduler

# Example 1: Simple file processing workflow
async def example_file_workflow():
    """Example of a simple file processing workflow"""
    
    # Create tasks
    tasks = [
        FileTask("create_file", {
            "operation": "write",
            "file_path": "./example_output.txt",
            "content": "Hello from automation workflow!"
        }),
        
        FileTask("read_file", {
            "operation": "read",
            "file_path": "./example_output.txt"
        }),
        
        LogTask("log_content", {
            "message": "File content: ${read_file_result}",
            "level": "INFO"
        }),
        
        FileTask("cleanup", {
            "operation": "delete",
            "file_path": "./example_output.txt"
        })
    ]
    
    # Create and run workflow
    workflow = Workflow("file_example", tasks)
    engine = WorkflowEngine()
    engine.register_workflow(workflow)
    
    result = await engine.run_workflow("file_example")
    print("Workflow completed:", workflow.get_summary())

# Example 2: Web scraping and data processing
async def example_web_scraping_workflow():
    """Example of web scraping and processing workflow"""
    
    tasks = [
        HTTPTask("fetch_data", {
            "url": "https://jsonplaceholder.typicode.com/posts",
            "method": "GET"
        }),
        
        FileTask("save_data", {
            "operation": "write",
            "file_path": "./posts_data.json",
            "content": "${fetch_data_result.body}"
        }),
        
        LogTask("log_success", {
            "message": "Fetched and saved ${fetch_data_result.json.length} posts",
            "level": "INFO"
        })
    ]
    
    workflow = Workflow("web_scraping", tasks)
    engine = WorkflowEngine()
    engine.register_workflow(workflow)
    
    result = await engine.run_workflow("web_scraping")
    return result

# Example 3: Conditional workflow with system monitoring
async def example_conditional_workflow():
    """Example of conditional workflow execution"""
    
    tasks = [
        ShellTask("check_python_version", {
            "command": "python --version",
            "timeout": 10
        }),
        
        ConditionalTask("check_version", {
            "condition": {
                "type": "contains",
                "left": "${check_python_version_result.stdout}",
                "right": "Python 3"
            },
            "true_value": "Python 3 detected",
            "false_value": "Python 3 not found"
        }),
        
        LogTask("log_result", {
            "message": "Version check: ${check_version_result}",
            "level": "INFO"
        })
    ]
    
    workflow = Workflow("conditional_example", tasks)
    engine = WorkflowEngine()
    engine.register_workflow(workflow)
    
    result = await engine.run_workflow("conditional_example")
    return result

# Example 4: Loop workflow for batch processing
async def example_loop_workflow():
    """Example of loop workflow for batch processing"""
    
    tasks = [
        # Create some test files
        FileTask("create_file1", {
            "operation": "write",
            "file_path": "./test1.txt",
            "content": "Content 1"
        }),
        
        FileTask("create_file2", {
            "operation": "write",
            "file_path": "./test2.txt",
            "content": "Content 2"
        }),
        
        FileTask("create_file3", {
            "operation": "write",
            "file_path": "./test3.txt",
            "content": "Content 3"
        }),
        
        # Process files in a loop
        LoopTask("process_files", {
            "items": ["./test1.txt", "./test2.txt", "./test3.txt"],
            "task": {
                "type": "file",
                "config": {
                    "operation": "read",
                    "file_path": "${loop_item}"
                }
            }
        }),
        
        LogTask("log_results", {
            "message": "Processed ${process_files_result.length} files",
            "level": "INFO"
        }),
        
        # Cleanup
        LoopTask("cleanup_files", {
            "items": ["./test1.txt", "./test2.txt", "./test3.txt"],
            "task": {
                "type": "file",
                "config": {
                    "operation": "delete",
                    "file_path": "${loop_item}"
                }
            }
        })
    ]
    
    workflow = Workflow("loop_example", tasks)
    engine = WorkflowEngine()
    engine.register_workflow(workflow)
    
    result = await engine.run_workflow("loop_example")
    return result

# Example 5: Scheduled workflow
async def example_scheduled_workflow():
    """Example of scheduled workflow execution"""
    
    # Create a simple monitoring workflow
    tasks = [
        ShellTask("get_date", {
            "command": "date",
            "timeout": 5
        }),
        
        ShellTask("get_uptime", {
            "command": "uptime",
            "timeout": 5
        }),
        
        LogTask("log_status", {
            "message": "System check at ${get_date_result.stdout.strip()} - Uptime: ${get_uptime_result.stdout.strip()}",
            "level": "INFO"
        })
    ]
    
    workflow = Workflow("system_check", tasks)
    engine = WorkflowEngine()
    engine.register_workflow(workflow)
    
    # Create scheduler
    scheduler = WorkflowScheduler(engine, check_interval=10)
    
    # Add scheduled job (runs every minute)
    job = ScheduledJob(
        name="regular_system_check",
        workflow_name="system_check",
        schedule="* * * * *",  # Every minute
        timezone="UTC"
    )
    scheduler.add_job(job)
    
    # Start scheduler
    await scheduler.start()
    
    # Run for 3 minutes then stop
    await asyncio.sleep(180)
    await scheduler.stop()

# Example 6: Parallel workflow execution
async def example_parallel_workflows():
    """Example of running multiple workflows in parallel"""
    
    # Create multiple simple workflows
    workflow1 = Workflow("workflow1", [
        WaitTask("wait1", {"duration": 2}),
        LogTask("log1", {"message": "Workflow 1 completed"})
    ])
    
    workflow2 = Workflow("workflow2", [
        WaitTask("wait2", {"duration": 3}),
        LogTask("log2", {"message": "Workflow 2 completed"})
    ])
    
    workflow3 = Workflow("workflow3", [
        WaitTask("wait3", {"duration": 1}),
        LogTask("log3", {"message": "Workflow 3 completed"})
    ])
    
    engine = WorkflowEngine()
    engine.register_workflow(workflow1)
    engine.register_workflow(workflow2)
    engine.register_workflow(workflow3)
    
    # Run all workflows in parallel
    results = await engine.run_all_workflows()
    
    print("All workflows completed:")
    for name, result in results.items():
        print(f"  {name}: {result['status']}")

# Example 7: Error handling workflow
async def example_error_handling():
    """Example of error handling in workflows"""
    
    tasks = [
        LogTask("start", {"message": "Starting error handling example"}),
        
        # This will fail
        FileTask("read_nonexistent", {
            "operation": "read",
            "file_path": "./this_file_does_not_exist.txt"
        }),
        
        # This won't execute due to previous error
        LogTask("never_reached", {"message": "This should not be logged"})
    ]
    
    workflow = Workflow("error_example", tasks)
    engine = WorkflowEngine()
    engine.register_workflow(workflow)
    
    try:
        result = await engine.run_workflow("error_example")
    except Exception as e:
        print(f"Workflow failed as expected: {e}")
        print("Workflow summary:", workflow.get_summary())

# Example 8: Complex data pipeline
async def example_data_pipeline():
    """Example of a complex data processing pipeline"""
    
    # Create sample CSV data
    csv_content = """name,age,city
John Doe,30,New York
Jane Smith,25,Los Angeles
Bob Johnson,35,Chicago
Alice Brown,28,Houston"""
    
    tasks = [
        # Create input file
        FileTask("create_csv", {
            "operation": "write",
            "file_path": "./sample_data.csv",
            "content": csv_content
        }),
        
        # Transform to JSON
        DataTransformTask("csv_to_json", {
            "source_file": "./sample_data.csv",
            "destination_file": "./sample_data.json",
            "transform_type": "csv_to_json"
        }),
        
        # Read JSON data
        FileTask("read_json", {
            "operation": "read",
            "file_path": "./sample_data.json"
        }),
        
        # Process each record
        LogTask("log_processing", {
            "message": "Processing ${read_json_result}",
            "level": "INFO"
        }),
        
        # Cleanup
        FileTask("cleanup_csv", {
            "operation": "delete",
            "file_path": "./sample_data.csv"
        }),
        
        FileTask("cleanup_json", {
            "operation": "delete",
            "file_path": "./sample_data.json"
        })
    ]
    
    workflow = Workflow("data_pipeline", tasks)
    engine = WorkflowEngine()
    engine.register_workflow(workflow)
    
    result = await engine.run_workflow("data_pipeline")
    return result

# Main function to run examples
async def main():
    """Run all examples"""
    
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    print("=== Automation Workflow Examples ===\n")
    
    print("1. Running simple file workflow...")
    await example_file_workflow()
    print("\n" + "="*50 + "\n")
    
    print("2. Running web scraping workflow...")
    await example_web_scraping_workflow()
    print("\n" + "="*50 + "\n")
    
    print("3. Running conditional workflow...")
    await example_conditional_workflow()
    print("\n" + "="*50 + "\n")
    
    print("4. Running loop workflow...")
    await example_loop_workflow()
    print("\n" + "="*50 + "\n")
    
    print("5. Running parallel workflows...")
    await example_parallel_workflows()
    print("\n" + "="*50 + "\n")
    
    print("6. Running error handling example...")
    await example_error_handling()
    print("\n" + "="*50 + "\n")
    
    print("7. Running data pipeline...")
    await example_data_pipeline()
    print("\n" + "="*50 + "\n")
    
    print("All examples completed!")

if __name__ == "__main__":
    asyncio.run(main())