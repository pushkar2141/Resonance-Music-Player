"""Vercel Serverless Function entry point for Resonance."""
import os
import sys
from pathlib import Path

# Add project root directory to Python path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

# Mark environment as Vercel
os.environ["VERCEL"] = "1"

from app import create_app

app = create_app()
