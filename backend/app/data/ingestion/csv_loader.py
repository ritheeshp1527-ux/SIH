import csv
from pathlib import Path
from typing import List, Dict, Any

def load_csv_records(file_path: Path) -> List[Dict[str, str]]:
    """
    Reads a CSV file and yields a list of stripped string dictionaries.
    Handles UTF-8 with BOM and standard UTF-8 encodings.
    """
    if not file_path.exists():
        raise FileNotFoundError(f"Required CSV data file not found at: {file_path}")

    records = []
    with open(file_path, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            cleaned_row = {
                (k.strip() if k else ""): (v.strip() if v else "")
                for k, v in row.items()
                if k is not None
            }
            if any(cleaned_row.values()):
                records.append(cleaned_row)
    return records
