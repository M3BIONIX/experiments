"""Download and checksum-verify the upstream MaleCNS dataset, without any videos."""
import os
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent
os.environ.setdefault('FLYWIREHEAD_DATA', str(ROOT / 'data'))
sys.path.insert(0, str(ROOT / 'vendor'))
from flywirehead.data import prepare
prepare()
