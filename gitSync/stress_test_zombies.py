#!/usr/bin/env python3
"""
Stress test to check for zombie accumulation over many git operations.
"""
import os
import sys
import time
import psutil
import tempfile
import shutil

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import clone_repo, get_commits_in_timerange, get_commit_changes

def count_zombies():
    """Count current zombie processes."""
    count = 0
    zombies = []
    try:
        for proc in psutil.process_iter(['pid', 'name', 'status', 'cmdline']):
            try:
                if proc.info['status'] == psutil.STATUS_ZOMBIE:
                    count += 1
                    zombies.append({
                        'pid': proc.info['pid'],
                        'name': proc.info['name']
                    })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
    except Exception as e:
        print(f"Error counting zombies: {e}")
    return count, zombies

def count_git_processes():
    """Count current git processes."""
    count = 0
    try:
        for proc in psutil.process_iter(['pid', 'name', 'status']):
            try:
                if proc.info['name'] == 'git':
                    count += 1
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
    except Exception as e:
        print(f"Error counting git processes: {e}")
    return count

def stress_test_git_operations(iterations=10):
    """Run multiple git operations and monitor for zombie accumulation."""
    print("="*80)
    print(f"STRESS TEST - Running {iterations} git operation cycles")
    print("="*80)
    
    # Test repo
    test_url = "https://github.com/hackclub/dinosaurs"
    
    initial_zombies, _ = count_zombies()
    initial_git = count_git_processes()
    
    print(f"\nInitial state:")
    print(f"  Zombies: {initial_zombies}")
    print(f"  Git processes: {initial_git}")
    print()
    
    max_zombies = initial_zombies
    max_git = initial_git
    zombie_accumulation = []
    
    for i in range(iterations):
        print(f"Iteration {i+1}/{iterations}:")
        
        temp_dir = tempfile.mkdtemp()
        repo_dir = os.path.join(temp_dir, 'test_repo')
        
        try:
            # Clone
            print(f"  Cloning...")
            if not clone_repo(test_url, repo_dir):
                print(f"  ✗ Clone failed")
                continue
            
            zombies, zombie_list = count_zombies()
            git_procs = count_git_processes()
            
            if zombies > max_zombies:
                max_zombies = zombies
            if git_procs > max_git:
                max_git = git_procs
            
            print(f"  After clone: {zombies} zombies, {git_procs} git procs")
            
            # Get commits
            commits = get_commits_in_timerange(repo_dir)
            zombies, zombie_list = count_zombies()
            git_procs = count_git_processes()
            
            if zombies > max_zombies:
                max_zombies = zombies
            if git_procs > max_git:
                max_git = git_procs
            
            print(f"  After log:   {zombies} zombies, {git_procs} git procs ({len(commits)} commits)")
            
            # Get changes for first commit
            if commits:
                changes = get_commit_changes(repo_dir, commits[0]['hash'], test_url)
                zombies, zombie_list = count_zombies()
                git_procs = count_git_processes()
                
                if zombies > max_zombies:
                    max_zombies = zombies
                if git_procs > max_git:
                    max_git = git_procs
                
                print(f"  After show:  {zombies} zombies, {git_procs} git procs ({len(changes)} changes)")
            
            zombie_accumulation.append(zombies - initial_zombies)
            
            if zombies > initial_zombies:
                print(f"  ⚠️  Zombie count increased by {zombies - initial_zombies}!")
                for z in zombie_list:
                    print(f"     - PID {z['pid']}: {z['name']}")
        
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)
        
        # Small delay between iterations
        time.sleep(0.5)
    
    # Final check
    time.sleep(2)
    final_zombies, final_zombie_list = count_zombies()
    final_git = count_git_processes()
    
    print("\n" + "="*80)
    print("STRESS TEST RESULTS")
    print("="*80)
    print(f"Iterations: {iterations}")
    print(f"Initial zombies: {initial_zombies}")
    print(f"Final zombies: {final_zombies}")
    print(f"Max zombies during test: {max_zombies}")
    print(f"Max git processes during test: {max_git}")
    print(f"Final git processes: {final_git}")
    print(f"Net zombie change: {final_zombies - initial_zombies}")
    
    if zombie_accumulation:
        avg_zombies = sum(zombie_accumulation) / len(zombie_accumulation)
        print(f"Average zombie accumulation per iteration: {avg_zombies:.2f}")
    
    if final_zombies > initial_zombies:
        print(f"\n❌ FAILED - Created {final_zombies - initial_zombies} zombie processes!")
        print("\nRemaining zombies:")
        for z in final_zombie_list:
            print(f"  PID {z['pid']}: {z['name']}")
        return False
    else:
        print(f"\n✅ PASSED - No zombie process accumulation!")
        return True

if __name__ == '__main__':
    success = stress_test_git_operations(iterations=5)
    sys.exit(0 if success else 1)

