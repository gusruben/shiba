#!/usr/bin/env python3
"""
Wrapper script to run gitSync server with automatic restart.
This ensures the server restarts after each sync cycle to prevent zombie accumulation.
"""
import os
import sys
import time
import subprocess
import signal
import atexit

class ServerManager:
    def __init__(self):
        self.server_proc = None
        self.should_restart = True
        
    def start_server(self):
        """Start the gitSync server."""
        print(f"Starting gitSync server (PID: {os.getpid()})...")
        self.server_proc = subprocess.Popen(
            ['python3', 'server.py'],
            cwd=os.path.dirname(os.path.abspath(__file__))
        )
        return self.server_proc
    
    def stop_server(self):
        """Stop the gitSync server."""
        if self.server_proc and self.server_proc.poll() is None:
            print("Stopping server...")
            self.server_proc.terminate()
            try:
                self.server_proc.wait(timeout=10)
            except subprocess.TimeoutExpired:
                self.server_proc.kill()
                self.server_proc.wait()
    
    def signal_handler(self, signum, frame):
        """Handle shutdown signals."""
        print(f"\nReceived signal {signum}, shutting down...")
        self.should_restart = False
        self.stop_server()
        sys.exit(0)
    
    def run(self):
        """Run the server with automatic restart."""
        # Register signal handlers
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)
        try:
            signal.signal(signal.SIGHUP, self.signal_handler)
        except AttributeError:
            pass
        
        # Register cleanup on exit
        atexit.register(self.stop_server)
        
        print("="*80)
        print("GITSYNC SERVER WITH AUTOMATIC RESTART")
        print("="*80)
        print("This wrapper ensures the server restarts after each sync cycle")
        print("to prevent zombie process accumulation.")
        print("Press Ctrl+C to stop.")
        print("="*80)
        
        restart_count = 0
        
        while self.should_restart:
            restart_count += 1
            print(f"\n[Restart #{restart_count}] Starting server...")
            
            # Start server
            self.start_server()
            
            # Wait for server to complete and restart itself
            try:
                return_code = self.server_proc.wait()
                print(f"Server exited with code {return_code}")
                
                if return_code == 0:
                    print("Server completed successfully and restarted itself")
                else:
                    print("Server exited with error, will restart in 10 seconds...")
                    time.sleep(10)
                    
            except KeyboardInterrupt:
                print("\nShutdown requested by user")
                break
        
        print("\nServer manager shutting down...")

def main():
    manager = ServerManager()
    manager.run()

if __name__ == '__main__':
    main()
