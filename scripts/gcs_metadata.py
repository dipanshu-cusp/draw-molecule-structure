"""
This script interates over a GCS bucket and adds metadata to each object in the specified directory.
We are adding metadata: `notebook_id` the filename is used as the notebook_id without the extension.

Eg: notebooks/2026-01-01-12-01-01-ord-notebooks-subset/ord-000cef3a-1234-5678-90ab-cdef12345678.pdf
    will have metadata notebook_id=ord-000cef3a-1234-5678-90ab-cdef12345678
"""

import os
from pathlib import Path
from google.cloud import storage
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock


def process_blob(blob_name: str, bucket_name: str) -> tuple[bool, str, str]:
    """
    Process a single blob to add notebook_id metadata.
    
    Args:
        blob_name: Name of the blob to process
        bucket_name: Name of the GCS bucket
        
    Returns:
        Tuple of (success, blob_name, message)
    """
    try:
        # Create a new client for this thread
        client = storage.Client()
        bucket = client.bucket(bucket_name)
        blob = bucket.blob(blob_name)
        
        # Extract filename without extension
        filename = Path(blob_name).stem
        
        # Load current metadata (preserves all existing metadata fields)
        blob.reload()
        
        # Get existing metadata and add notebook_id field (existing fields are preserved)
        metadata = blob.metadata.copy() if blob.metadata else {}
        metadata['notebook_id'] = filename
        blob.metadata = metadata
        
        # Patch the blob to update metadata without re-uploading content
        blob.patch()
        
        return (True, blob_name, filename)
        
    except Exception as e:
        return (False, blob_name, str(e))


def add_notebook_id_metadata(bucket_name: str, directory_prefix: str, max_workers: int = 10):
    """
    Add notebook_id metadata to all objects in a GCS bucket directory using multi-threading.
    
    Args:
        bucket_name: Name of the GCS bucket
        directory_prefix: Directory prefix to filter objects (e.g., 'notebooks/2026-01-01-12-01-01-ord-notebooks-subset/')
        max_workers: Maximum number of concurrent threads (default: 10)
    """
    # Initialize GCS client
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    
    # List all blobs in the specified directory
    print("Listing objects...")
    blobs = bucket.list_blobs(prefix=directory_prefix)
    blob_names = [blob.name for blob in blobs if not blob.name.endswith('/')]
    
    total_objects = len(blob_names)
    print(f"Found {total_objects} objects to process\n")
    
    processed_count = 0
    error_count = 0
    print_lock = Lock()
    
    # Process blobs concurrently using ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit all tasks
        future_to_blob = {
            executor.submit(process_blob, blob_name, bucket_name): blob_name 
            for blob_name in blob_names
        }
        
        # Process completed tasks
        for future in as_completed(future_to_blob):
            success, blob_name, info = future.result()
            
            with print_lock:
                if success:
                    processed_count += 1
                    print(f"[{processed_count}/{total_objects}] ✓ Added notebook_id='{info}' to {blob_name}")
                else:
                    error_count += 1
                    print(f"[{processed_count + error_count}/{total_objects}] ✗ Error processing {blob_name}: {info}")
    
    print(f"\n{'='*60}")
    print(f"Summary:")
    print(f"  Total: {total_objects} objects")
    print(f"  Processed: {processed_count} objects")
    print(f"  Errors: {error_count} objects")
    print(f"{'='*60}")


if __name__ == "__main__":
    # Configuration
    BUCKET_NAME = "your-bucket-name"  # Replace with your bucket name
    MAX_WORKERS = 10  # Number of concurrent threads
    DIRECTORY_PREFIX = "notebooks/2026-01-01-12-01-01-ord-notebooks-subset/"  # Replace with your directory prefix
    
    print(f"Starting metadata update for bucket: {BUCKET_NAME}")
    print(f"Directory: {DIRECTORY_PREFIX}")
    print(f"Concurrent threads: {MAX_WORKERS}\n")
    
    add_notebook_id_metadata(BUCKET_NAME, DIRECTORY_PREFIX, MAX_WORKERS)