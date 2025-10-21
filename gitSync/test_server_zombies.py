#!/usr/bin/env python3
"""
Test the actual server for zombie processes during continuous operation.
This simulates the production environment.
"""
import os
import sys
import time
import psutil
import subprocess
import signal
import requests

def count_zombies():
    """Count current zombie processes."""
    count = 0
    zombies = []
    try:
        for proc in psutil.process_iter(['pid', 'name', 'status', 'cmdline', 'create_time']):
            try:
                if proc.info['status'] == psutil.STATUS_ZOMBIE:
                    count += 1
                    zombies.append({
                        'pid': proc.info['pid'],
                        'name': proc.info['name'],
                        'cmdline': proc.info['cmdline']
                    })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
    except Exception as e:
        print(f"Error counting zombies: {e}")
    return count, zombies

def count_git_processes():
    """Count current git processes."""
    count = 0
    git_procs = []
    try:
        for proc in psutil.process_iter(['pid', 'name', 'status', 'cmdline']):
            try:
                if proc.info['name'] == 'git':
                    count += 1
                    git_procs.append({
                        'pid': proc.info['pid'],
                        'status': proc.info['status'],
                        'cmdline': ' '.join(proc.info['cmdline']) if proc.info['cmdline'] else ''
                    })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
    except Exception as e:
        print(f"Error counting git processes: {e}")
    return count, git_procs

def monitor_server_for_zombies(duration_seconds=30, check_interval=2):
    """
    Monitor the server for zombie processes during operation.
    Returns True if no zombie accumulation detected.
    """
    print("="*80)
    print(f"MONITORING SERVER FOR {duration_seconds} SECONDS")
    print("="*80)
    
    initial_zombies, _ = count_zombies()
    initial_git, _ = count_git_processes()
    
    print(f"\nInitial state:")
    print(f"  Zombies: {initial_zombies}")
    print(f"  Git processes: {initial_git}")
    print()
    
    max_zombies = initial_zombies
    max_git = initial_git
    zombie_readings = []
    git_readings = []
    
    start_time = time.time()
    iterations = 0
    
    while time.time() - start_time < duration_seconds:
        time.sleep(check_interval)
        iterations += 1
        
        zombies, zombie_list = count_zombies()
        git_count, git_procs = count_git_processes()
        
        zombie_readings.append(zombies - initial_zombies)
        git_readings.append(git_count)
        
        if zombies > max_zombies:
            max_zombies = zombies
        if git_count > max_git:
            max_git = git_count
        
        elapsed = int(time.time() - start_time)
        print(f"[{elapsed}s] Zombies: {zombies} (+{zombies - initial_zombies}), Git procs: {git_count} (max: {max_git})")
        
        if zombies > initial_zombies + 5:
            print(f"  ⚠️  WARNING: {zombies - initial_zombies} new zombies detected!")
            for z in zombie_list:
                print(f"     PID {z['pid']}: {z['name']} - {z['cmdline']}")
        
        if git_count > 10:
            print(f"  ⚠️  WARNING: {git_count} git processes running!")
            for g in git_procs[:5]:
                status_str = '(ZOMBIE)' if g['status'] == psutil.STATUS_ZOMBIE else ''
                print(f"     PID {g['pid']}: {g['cmdline'][:80]} {status_str}")
    
    # Final check
    time.sleep(2)
    final_zombies, final_zombie_list = count_zombies()
    final_git, _ = count_git_processes()
    
    print("\n" + "="*80)
    print("MONITORING RESULTS")
    print("="*80)
    print(f"Duration: {duration_seconds}s")
    print(f"Checks: {iterations}")
    print(f"Initial zombies: {initial_zombies}")
    print(f"Final zombies: {final_zombies}")
    print(f"Max zombies: {max_zombies}")
    print(f"Max git processes: {max_git}")
    print(f"Final git processes: {final_git}")
    
    if zombie_readings:
        avg_zombies = sum(zombie_readings) / len(zombie_readings)
        max_zombie_increase = max(zombie_readings)
        print(f"Average zombie increase: {avg_zombies:.2f}")
        print(f"Max zombie increase: {max_zombie_increase}")
    
    net_zombie_change = final_zombies - initial_zombies
    
    if net_zombie_change > 5:
        print(f"\n❌ FAILED - Accumulated {net_zombie_change} zombie processes!")
        print("\nRemaining zombies:")
        for z in final_zombie_list:
            print(f"  PID {z['pid']}: {z['name']} - {z['cmdline']}")
        return False
    elif net_zombie_change > 0:
        print(f"\n⚠️  WARNING - Small accumulation of {net_zombie_change} zombies (may be transient)")
        return True
    else:
        print(f"\n✅ PASSED - No zombie accumulation detected!")
        return True

def test_with_manual_sync(port=3002):
    """Test by manually triggering sync via API."""
    print("="*80)
    print("TESTING WITH MANUAL SYNC TRIGGER")
    print("="*80)
    print(f"Server should be running on port {port}")
    print("Will trigger 3 syncs and monitor for zombies...\n")
    
    base_url = f"http://localhost:{port}"
    
    # Check if server is running
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            print("✓ Server is running and healthy")
        else:
            print(f"✗ Server returned status {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"✗ Cannot connect to server: {e}")
        print("  Please start the server with: python3 server.py")
        return False
    
    initial_zombies, _ = count_zombies()
    print(f"\nInitial zombie count: {initial_zombies}")
    
    # Trigger multiple syncs
    for i in range(3):
        print(f"\nTrigger sync {i+1}/3...")
        try:
            response = requests.post(f"{base_url}/api/sync", timeout=60)
            if response.status_code == 200:
                result = response.json()
                print(f"  ✓ Sync completed: {result.get('repos_processed', 0)} repos processed")
            elif response.status_code == 409:
                print(f"  ⚠️  Sync already running, waiting...")
                time.sleep(5)
            else:
                print(f"  ✗ Sync failed with status {response.status_code}")
        except requests.exceptions.Timeout:
            print(f"  ✗ Sync timed out")
        except Exception as e:
            print(f"  ✗ Error: {e}")
        
        zombies, zombie_list = count_zombies()
        git_count, _ = count_git_processes()
        print(f"  After sync: {zombies} zombies (+{zombies - initial_zombies}), {git_count} git procs")
        
        if zombies > initial_zombies:
            print(f"  ⚠️  {zombies - initial_zombies} new zombies!")
            for z in zombie_list:
                print(f"     PID {z['pid']}: {z['name']}")
        
        time.sleep(2)
    
    # Final check
    time.sleep(3)
    final_zombies, final_zombie_list = count_zombies()
    final_git, _ = count_git_processes()
    
    print(f"\nFinal state:")
    print(f"  Zombies: {final_zombies} (initial: {initial_zombies})")
    print(f"  Git processes: {final_git}")
    print(f"  Net zombie change: {final_zombies - initial_zombies}")
    
    if final_zombies > initial_zombies + 5:
        print(f"\n❌ FAILED - Accumulated {final_zombies - initial_zombies} zombies!")
        return False
    else:
        print(f"\n✅ PASSED - No significant zombie accumulation!")
        return True

def main():
    print("="*80)
    print("GITSYNC SERVER ZOMBIE PROCESS TESTER")
    print("="*80)
    print()
    print("This test requires the gitSync server to be running.")
    print("Start it with: python3 server.py")
    print()
    
    # Test with manual sync triggers
    success = test_with_manual_sync(port=3002)
    
    return 0 if success else 1

if __name__ == '__main__':
    sys.exit(main())

