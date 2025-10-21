#!/usr/bin/env python3
"""
Test script to monitor for zombie processes while running gitSync.
"""
import os
import time
import psutil
import subprocess
import signal
import sys

def count_zombies():
    """Count current zombie processes."""
    zombies = []
    try:
        for proc in psutil.process_iter(['pid', 'name', 'status', 'cmdline']):
            try:
                if proc.info['status'] == psutil.STATUS_ZOMBIE:
                    zombies.append({
                        'pid': proc.info['pid'],
                        'name': proc.info['name'],
                        'cmdline': proc.info['cmdline']
                    })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
    except Exception as e:
        print(f"Error counting zombies: {e}")
    return zombies

def count_git_processes():
    """Count current git processes."""
    git_procs = []
    try:
        for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'status']):
            try:
                if proc.info['name'] == 'git':
                    git_procs.append({
                        'pid': proc.info['pid'],
                        'cmdline': ' '.join(proc.info['cmdline']) if proc.info['cmdline'] else '',
                        'status': proc.info['status']
                    })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
    except Exception as e:
        print(f"Error counting git processes: {e}")
    return git_procs

def monitor_process(proc, interval=2):
    """Monitor a process for zombies while it runs."""
    print("\n" + "="*80)
    print("MONITORING FOR ZOMBIES")
    print("="*80)
    
    start_zombies = count_zombies()
    start_git = count_git_processes()
    
    print(f"\nInitial state:")
    print(f"  Zombie processes: {len(start_zombies)}")
    print(f"  Git processes: {len(start_git)}")
    
    max_zombies = len(start_zombies)
    max_git = len(start_git)
    iterations = 0
    
    while proc.poll() is None:
        time.sleep(interval)
        iterations += 1
        
        zombies = count_zombies()
        git_procs = count_git_processes()
        
        if len(zombies) > max_zombies:
            max_zombies = len(zombies)
        if len(git_procs) > max_git:
            max_git = len(git_procs)
        
        print(f"\n[{iterations * interval}s] Current state:")
        print(f"  Zombie processes: {len(zombies)} (max: {max_zombies})")
        print(f"  Git processes: {len(git_procs)} (max: {max_git})")
        
        if len(zombies) > len(start_zombies):
            print(f"  ⚠️  NEW ZOMBIES DETECTED! (+{len(zombies) - len(start_zombies)})")
            for z in zombies:
                if z not in start_zombies:
                    print(f"     PID {z['pid']}: {z['name']} - {z['cmdline']}")
        
        if len(git_procs) > 5:
            print(f"  ⚠️  High number of git processes!")
            for g in git_procs[:5]:
                status_str = '(ZOMBIE)' if g['status'] == psutil.STATUS_ZOMBIE else ''
                print(f"     PID {g['pid']}: {g['cmdline']} {status_str}")
    
    # Final check after process completes
    time.sleep(2)
    final_zombies = count_zombies()
    final_git = count_git_processes()
    
    print("\n" + "="*80)
    print("FINAL RESULTS")
    print("="*80)
    print(f"Initial zombies: {len(start_zombies)}")
    print(f"Final zombies: {len(final_zombies)}")
    print(f"Max zombies during run: {max_zombies}")
    print(f"Max git processes during run: {max_git}")
    print(f"Final git processes: {len(final_git)}")
    
    new_zombies = len(final_zombies) - len(start_zombies)
    if new_zombies > 0:
        print(f"\n❌ CREATED {new_zombies} NEW ZOMBIE PROCESSES!")
        print("\nNew zombies:")
        for z in final_zombies:
            if z not in start_zombies:
                print(f"  PID {z['pid']}: {z['name']} - {z['cmdline']}")
        return False
    else:
        print(f"\n✅ NO NEW ZOMBIE PROCESSES CREATED!")
        return True

def create_test_script(base_dir):
    """Create a minimal test version of main.py that only processes one repo."""
    test_script = f'''
import os
import sys
sys.path.insert(0, "{base_dir}")

from main import clone_repo, get_commits_in_timerange, get_commit_changes
import tempfile
import shutil

# Test with a small public repo
test_url = "https://github.com/hackclub/dinosaurs"

print("Testing git operations with small repo...")
print(f"Test repo: {{test_url}}")

temp_dir = tempfile.mkdtemp()
repo_dir = os.path.join(temp_dir, 'test_repo')

try:
    print("\\n1. Testing clone...")
    if clone_repo(test_url, repo_dir):
        print("   ✓ Clone succeeded")
    else:
        print("   ✗ Clone failed")
        sys.exit(1)
    
    print("\\n2. Testing get_commits_in_timerange...")
    commits = get_commits_in_timerange(repo_dir)
    print(f"   ✓ Found {{len(commits)}} commits")
    
    if commits:
        print("\\n3. Testing get_commit_changes...")
        changes = get_commit_changes(repo_dir, commits[0]['hash'], test_url)
        print(f"   ✓ Found {{len(changes)}} file changes")
    
    print("\\n✓ All git operations completed")
    
finally:
    shutil.rmtree(temp_dir, ignore_errors=True)
    print("\\n✓ Cleanup complete")
'''
    
    with open('/tmp/test_git_ops.py', 'w') as f:
        f.write(test_script)
    
    return '/tmp/test_git_ops.py'

def main():
    print("="*80)
    print("ZOMBIE PROCESS TESTER FOR GITSYNC")
    print("="*80)
    
    # Create test script
    base_dir = os.path.dirname(os.path.abspath(__file__))
    test_script = create_test_script(base_dir)
    print(f"\nCreated test script: {test_script}")
    
    # Run the test script with monitoring
    print("\nStarting test run...")
    proc = subprocess.Popen(
        ['python3', test_script],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        cwd=os.path.dirname(__file__)
    )
    
    # Monitor in a separate thread while capturing output
    import threading
    
    output_lines = []
    def read_output():
        for line in proc.stdout:
            print(f"  | {line.rstrip()}")
            output_lines.append(line)
    
    reader = threading.Thread(target=read_output)
    reader.start()
    
    # Monitor for zombies
    success = monitor_process(proc, interval=1)
    
    # Wait for output reader
    reader.join()
    proc.wait()
    
    print("\n" + "="*80)
    if success:
        print("✅ TEST PASSED - No zombie processes created!")
        return 0
    else:
        print("❌ TEST FAILED - Zombie processes detected!")
        return 1

if __name__ == '__main__':
    sys.exit(main())

