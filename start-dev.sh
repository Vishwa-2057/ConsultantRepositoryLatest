#!/bin/bash

echo "Starting Healthcare Management System..."
echo

echo "Starting Backend Server..."
cd backend && npm run dev &
BACKEND_PID=$!

echo "Waiting for backend to start..."
sleep 3

echo "Starting Frontend Server..."
cd ../frontend && npm run dev &
FRONTEND_PID=$!

echo
echo "Both servers are starting..."
echo "Backend: http://localhost:5000"
echo "Frontend: http://localhost:8080"
echo

echo "Running connection test..."
cd .. && node test-connection.js

echo
echo "Press Ctrl+C to stop both servers"
echo

# Function to cleanup processes on exit
cleanup() {
    echo "Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit
}

# Trap Ctrl+C
trap cleanup SIGINT

# Wait for user to stop
wait
