#!/usr/bin/env python3
"""
Test script to simulate production environment and monitor for zombie accumulation.
This runs the server with continuous sync and monitors zombie processes.
"""
import os
import sys
import time
import psutil
import subprocess
import signal
import threading
import requests
from datetime import datetime

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
                        'name': proc.info['name'],
                        'cmdline': proc.info['cmdline']
                    })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
    except Exception as e:
        print(f"Error counting zombies: {e}")
    return count, zombies

def monitor_zombies_during_operation(duration_minutes=5):
    """Monitor zombie processes while server is running."""
    print("="*80)
    print(f"MONITORING ZOMBIES DURING {duration_minutes} MINUTES OF OPERATION")
    print("="*80)
    
    initial_zombies, _ = count_zombies()
    print(f"\nInitial zombie count: {initial_zombies}")
    
    start_time = time.time()
    max_zombies = initial_zombies
    zombie_readings = []
    
    while time.time() - start_time < duration_minutes * 60:
        zombies, zombie_list = count_zombies()
        zombie_readings.append(zombies)
        
        if zombies > max_zombies:
            max_zombies = zombies
        
        elapsed = int(time.time() - start_time)
        print(f"[{elapsed//60:02d}:{elapsed%60:02d}] Zombies: {zombies} (max: {max_zombies})")
        
        if zombies > initial_zombies + 10:
            print(f"  ⚠️  WARNING: {zombies - initial_zombies} new zombies!")
            for z in zombie_list[-5:]:  # Show last 5 zombies
                print(f"     PID {z['pid']}: {z['name']} - {z['cmdline']}")
        
        time.sleep(10)  # Check every 10 seconds
    
    # Final check
    time.sleep(5)
    final_zombies, final_zombie_list = count_zombies()
    
    print("\n" + "="*80)
    print("PRODUCTION TEST RESULTS")
    print("="*80)
    print(f"Duration: {duration_minutes} minutes")
    print(f"Initial zombies: {initial_zombies}")
    print(f"Final zombies: {final_zombies}")
    print(f"Max zombies: {max_zombies}")
    print(f"Net zombie change: {final_zombies - initial_zombies}")
    
    if zombie_readings:
        avg_zombies = sum(zombie_readings) / len(zombie_readings)
        print(f"Average zombie count: {avg_zombies:.1f}")
    
    if final_zombies > initial_zombies + 20:
        print(f"\n❌ FAILED - Accumulated {final_zombies - initial_zombies} zombies!")
        print("\nRemaining zombies:")
        for z in final_zombie_list:
            print(f"  PID {z['pid']}: {z['name']} - {z['cmdline']}")
        return False
    elif final_zombies > initial_zombies:
        print(f"\n⚠️  WARNING - Small accumulation of {final_zombies - initial_zombies} zombies")
        return True
    else:
        print(f"\n✅ PASSED - No zombie accumulation!")
        return True

def start_server():
    """Start the gitSync server in background."""
    print("Starting gitSync server...")
    proc = subprocess.Popen(
        ['python3', 'server.py'],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        cwd=os.path.dirname(os.path.abspath(__file__))
    )
    
    # Wait for server to start
    print("Waiting for server to start...")
    for i in range(30):  # Wait up to 30 seconds
        try:
            response = requests.get('http://localhost:3002/health', timeout=2)
            if response.status_code == 200:
                print("✓ Server is running")
                return proc
        except:
            pass
        time.sleep(1)
    
    print("✗ Server failed to start")
    proc.terminate()
    return None

def main():
    print("="*80)
    print("PRODUCTION ZOMBIE PROCESS TEST")
    print("="*80)
    print("This test starts the actual gitSync server and monitors for zombies.")
    print("The server will run continuous sync operations.")
    print()
    
    server_proc = None
    try:
        # Start server
        server_proc = start_server()
        if not server_proc:
            return 1
        
        # Monitor for zombies
        success = monitor_zombies_during_operation(duration_minutes=3)
        
        return 0 if success else 1
        
    except KeyboardInterrupt:
        print("\nTest interrupted by user")
        return 1
    finally:
        if server_proc:
            print("\nStopping server...")
            server_proc.terminate()
            try:
                server_proc.wait(timeout=10)
            except subprocess.TimeoutExpired:
                server_proc.kill()
                server_proc.wait()
            print("Server stopped")

if __name__ == '__main__':
    sys.exit(main())
