# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set environment variables
ENV WS_HOST=0.0.0.0
ENV WS_PORT=8765
ENV PYTHONUNBUFFERED=1

# Set the working directory in the container
WORKDIR /app

# Copy only the server files
COPY server/ ./server/
COPY requirements.txt ./

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Make port available to the world outside this container
EXPOSE $WS_PORT

# Run main.py when the container launches
CMD ["python", "server/main.py"]