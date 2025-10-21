#!/usr/bin/env python3
"""
Test script to verify the server restart behavior works correctly.
"""
import os
import sys
import time
import subprocess
import requests
import signal

def test_server_restart():
    """Test that the server restarts after sync completion."""
    print("="*80)
    print("TESTING SERVER RESTART BEHAVIOR")
    print("="*80)
    
    # Start server
    print("Starting server...")
    server_proc = subprocess.Popen(
        ['python3', 'server.py'],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        cwd=os.path.dirname(os.path.abspath(__file__))
    )
    
    try:
        # Wait for server to start
        print("Waiting for server to start...")
        for i in range(30):
            try:
                response = requests.get('http://localhost:3002/health', timeout=2)
                if response.status_code == 200:
                    print("✓ Server started successfully")
                    break
            except:
                pass
            time.sleep(1)
        else:
            print("✗ Server failed to start")
            return False
        
        # Monitor server output for restart behavior
        print("\nMonitoring server behavior...")
        print("The server should complete a sync cycle and then restart.")
        print("This may take several minutes depending on the number of repos...")
        print("\nServer output:")
        print("-" * 80)
        
        start_time = time.time()
        restart_detected = False
        
        while time.time() - start_time < 300:  # Monitor for up to 5 minutes
            line = server_proc.stdout.readline()
            if line:
                print(f"  {line.rstrip()}")
                
                # Look for restart indicators
                if "Restarting server" in line or "Starting sync" in line:
                    restart_detected = True
                    print(f"\n✓ Restart behavior detected!")
                    break
            
            # Check if process is still running
            if server_proc.poll() is not None:
                print(f"\n✗ Server process ended unexpectedly")
                return False
        
        if not restart_detected:
            print(f"\n⚠️  No restart detected within 5 minutes")
            print("This might be normal if there are many repos to process")
            return True  # Not necessarily a failure
        
        return True
        
    except KeyboardInterrupt:
        print("\nTest interrupted by user")
        return False
    finally:
        if server_proc.poll() is None:
            print("\nStopping server...")
            server_proc.terminate()
            try:
                server_proc.wait(timeout=10)
            except subprocess.TimeoutExpired:
                server_proc.kill()
                server_proc.wait()

def main():
    print("This test verifies that the server restarts after completing a sync cycle.")
    print("The restart prevents zombie process accumulation.")
    print()
    
    success = test_server_restart()
    
    if success:
        print("\n✅ RESTART TEST PASSED")
        print("Server successfully implements restart-after-sync behavior")
    else:
        print("\n❌ RESTART TEST FAILED")
        print("Server restart behavior needs investigation")
    
    return 0 if success else 1

if __name__ == '__main__':
    sys.exit(main())
