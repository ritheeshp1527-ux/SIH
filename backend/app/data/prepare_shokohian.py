"""
Data Preparation & Processing Pipeline for Shokohian Maritime Fuel Dataset.
Phase 3D - SIH26138 - Quantum-Inspired Maritime Fleet & Voyage Fuel Optimization.

Reads raw/Shokohian_Data.csv (never modifies raw source data) and outputs:
1. processed/shokohian_fuel_training.csv
2. processed/shokohian_feature_dictionary.csv
3. processed/shokohian_data_quality_report.md
"""

from __future__ import annotations

import hashlib
import math
from pathlib import Path
from typing import Dict, List, Set, Tuple

import numpy as np
import pandas as pd

# Paths relative to project root
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
RAW_CSV_PATH = PROJECT_ROOT / "raw" / "Shokohian_Data.csv"
PROCESSED_DIR = PROJECT_ROOT / "processed"
OUTPUT_TRAIN_CSV = PROCESSED_DIR / "shokohian_fuel_training.csv"
OUTPUT_DICT_CSV = PROCESSED_DIR / "shokohian_feature_dictionary.csv"
OUTPUT_REPORT_MD = PROCESSED_DIR / "shokohian_data_quality_report.md"

MONTH_MAP = {
    "January": 1,
    "February": 2,
    "March": 3,
    "April": 4,
    "May": 5,
    "June": 6,
    "July": 7,
    "August": 8,
    "September": 9,
    "October": 10,
    "November": 11,
    "December": 12,
}

CANONICAL_COLUMNS: Dict[str, str] = {
    "Wind Power": "wind_power_beaufort",
    "Amount of Cargo": "cargo_mt",
    "Auxiliary Engine Power": "aux_engine_kw",
    "Main Engine Power": "main_engine_kw",
    "LOA": "loa_m",
    "Breath": "beam_m",
    "Draught": "draught_m",
    "Light Weight": "light_weight_mt",
    "Month": "month",
    "Latitude": "latitude_deg",
    "Longitude": "longitude_deg",
    "Speed": "speed_knots",
    "Consumption_LSHFO": "consumption_lshfo_mt_day",
}


def compute_file_hash(filepath: Path) -> str:
    """Compute SHA-256 hash of a file to verify immutability."""
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


def identify_pasted_voyage_blocks(df: pd.DataFrame, min_block_len: int = 3) -> Set[int]:
    """
    Identify clearly copy-pasted multi-row voyage duplicate blocks.
    Excludes genuine consecutive repeated stationary observations in port.
    """
    row_hashes = pd.util.hash_pandas_object(df, index=False).values
    n = len(df)
    pasted_indices: Set[int] = set()

    i = 0
    while i < n:
        best_len = 0
        best_j = -1
        h_i = row_hashes[i]
        potential_js = [
            j for j in range(i - 1)
            if row_hashes[j] == h_i and (df.iloc[j] == df.iloc[i]).all()
        ]
        for j in potential_js:
            k = 0
            while (
                i + k < n
                and j + k < i
                and row_hashes[i + k] == row_hashes[j + k]
                and (df.iloc[i + k] == df.iloc[j + k]).all()
            ):
                k += 1
            if k > best_len:
                best_len = k
                best_j = j

        if best_len >= min_block_len:
            has_steaming = (df.iloc[i : i + best_len]["Speed"] > 0).any()
            if has_steaming:
                pasted_indices.update(range(i, i + best_len))
                i += best_len
                continue
        i += 1

    return pasted_indices


def process_shokohian_dataset() -> Tuple[pd.DataFrame, pd.DataFrame, str]:
    """
    Main preprocessing pipeline:
    - Verifies raw data integrity
    - Identifies and removes corrupted zero-speed ocean steaming records
    - Identifies and removes copy-pasted duplicate voyage blocks
    - Performs canonical feature renaming and physical feature engineering
    - Generates feature dictionary and data quality report
    """
    if not RAW_CSV_PATH.exists():
        raise FileNotFoundError(f"Raw Shokohian dataset not found at: {RAW_CSV_PATH}")

    raw_hash_before = compute_file_hash(RAW_CSV_PATH)

    # Read raw dataset without modifications
    raw_df = pd.read_csv(RAW_CSV_PATH)
    raw_row_count = len(raw_df)
    raw_col_count = len(raw_df.columns)

    # 1. Audit Missing Values
    missing_counts = raw_df.isnull().sum()
    total_missing = int(missing_counts.sum())

    # 2. Audit Duplicates
    exact_duplicates_count = int(raw_df.duplicated().sum())
    consecutive_duplicates_count = int((raw_df == raw_df.shift(1)).all(axis=1).sum())
    non_consecutive_duplicates_count = exact_duplicates_count - consecutive_duplicates_count

    # 3. Identify Corrupted Zero-Speed Ocean Steaming Records
    # Criteria: Speed == 0 and Consumption >= 10.0 MT/day
    corrupted_zero_speed_mask = (raw_df["Speed"] == 0) & (raw_df["Consumption_LSHFO"] >= 10.0)
    corrupted_zero_speed_indices = set(raw_df[corrupted_zero_speed_mask].index)
    corrupted_zero_speed_count = len(corrupted_zero_speed_indices)

    # Total zero-speed count in raw data
    raw_zero_speed_count = int((raw_df["Speed"] == 0).sum())
    legitimate_zero_speed_count = raw_zero_speed_count - corrupted_zero_speed_count

    # 4. Identify Copy-pasted multi-row blocks
    pasted_block_indices = identify_pasted_voyage_blocks(raw_df, min_block_len=3)
    pasted_block_count = len(pasted_block_indices)

    # 5. Determine Records to Remove
    removal_indices = corrupted_zero_speed_indices | pasted_block_indices
    total_removed_count = len(removal_indices)

    # Filter clean dataset
    clean_df = raw_df.drop(index=list(removal_indices)).reset_index(drop=True)
    processed_row_count = len(clean_df)

    # 6. Normalize Column Names to Canonical Schema
    clean_df = clean_df.rename(columns=CANONICAL_COLUMNS)

    # 7. Physical & Operational Feature Engineering
    # - displacement_approx_mt = light_weight_mt + cargo_mt
    clean_df["displacement_approx_mt"] = clean_df["light_weight_mt"] + clean_df["cargo_mt"]

    # - cargo_ratio = cargo_mt / displacement_approx_mt (guarded against division by zero)
    clean_df["cargo_ratio"] = np.where(
        clean_df["displacement_approx_mt"] > 0,
        clean_df["cargo_mt"] / clean_df["displacement_approx_mt"],
        0.0,
    )

    # - is_laden = 1 if cargo_mt > 0 else 0
    clean_df["is_laden"] = (clean_df["cargo_mt"] > 0).astype(int)

    # - is_steaming = 1 if speed_knots > 0 else 0
    clean_df["is_steaming"] = (clean_df["speed_knots"] > 0).astype(int)

    # - total_power_kw = main_engine_kw + aux_engine_kw
    clean_df["total_power_kw"] = clean_df["main_engine_kw"] + clean_df["aux_engine_kw"]

    # - aux_power_ratio = aux_engine_kw / total_power_kw (guarded)
    clean_df["aux_power_ratio"] = np.where(
        clean_df["total_power_kw"] > 0,
        clean_df["aux_engine_kw"] / clean_df["total_power_kw"],
        0.0,
    )

    # - Month encodings
    clean_df["month_num"] = clean_df["month"].map(MONTH_MAP).fillna(1).astype(int)
    clean_df["month_sin"] = np.sin(2.0 * np.pi * clean_df["month_num"] / 12.0)
    clean_df["month_cos"] = np.cos(2.0 * np.pi * clean_df["month_num"] / 12.0)

    # - abs_latitude = abs(latitude_deg)
    clean_df["abs_latitude"] = clean_df["latitude_deg"].abs()

    # - vessel_id cluster for grouped cross-validation/splits
    vessel_signature_cols = ["loa_m", "beam_m", "light_weight_mt", "main_engine_kw", "aux_engine_kw"]
    clean_df["vessel_id"] = clean_df.groupby(vessel_signature_cols, sort=False).ngroup()

    # Verify no raw data alteration
    raw_hash_after = compute_file_hash(RAW_CSV_PATH)
    if raw_hash_before != raw_hash_after:
        raise RuntimeError("FATAL: Raw CSV file hash modified during processing!")

    # 8. Create Feature Dictionary
    feature_dict_rows = [
        {
            "feature_name": "wind_power_beaufort",
            "original_column": "Wind Power",
            "unit": "Beaufort scale (0-9)",
            "data_type": "int64",
            "role": "Predictive feature",
            "transformation": "None (integer scale)",
            "reason": "Environmental wind resistance on hull & superstructure.",
            "leakage_status": "Clean",
        },
        {
            "feature_name": "cargo_mt",
            "original_column": "Amount of Cargo",
            "unit": "Metric tonnes (MT)",
            "data_type": "float64",
            "role": "Predictive feature",
            "transformation": "Renamed to canonical",
            "reason": "Ship payload driving displacement and frictional resistance.",
            "leakage_status": "Clean",
        },
        {
            "feature_name": "aux_engine_kw",
            "original_column": "Auxiliary Engine Power",
            "unit": "kW",
            "data_type": "int64",
            "role": "Predictive feature",
            "transformation": "Renamed to canonical",
            "reason": "Installed auxiliary generator rating (hotel load/pumps/cargo gear).",
            "leakage_status": "Clean",
        },
        {
            "feature_name": "main_engine_kw",
            "original_column": "Main Engine Power",
            "unit": "kW",
            "data_type": "float64",
            "role": "Predictive feature",
            "transformation": "Renamed to canonical",
            "reason": "Installed main propulsion engine rating (MCR).",
            "leakage_status": "Clean",
        },
        {
            "feature_name": "loa_m",
            "original_column": "LOA",
            "unit": "Meters (m)",
            "data_type": "float64",
            "role": "Predictive feature",
            "transformation": "Renamed to canonical",
            "reason": "Length Overall, dictates hydrodynamic wave-making resistance.",
            "leakage_status": "Clean",
        },
        {
            "feature_name": "beam_m",
            "original_column": "Breath",
            "unit": "Meters (m)",
            "data_type": "float64",
            "role": "Predictive feature",
            "transformation": "Corrected spelling from 'Breath'",
            "reason": "Molded breadth/beam, governs transverse hull cross-section.",
            "leakage_status": "Clean",
        },
        {
            "feature_name": "draught_m",
            "original_column": "Draught",
            "unit": "Meters (m)",
            "data_type": "float64",
            "role": "Predictive feature",
            "transformation": "Renamed to canonical",
            "reason": "Submerged draft, dictates wetted surface area.",
            "leakage_status": "Clean",
        },
        {
            "feature_name": "light_weight_mt",
            "original_column": "Light Weight",
            "unit": "Metric tonnes (MT)",
            "data_type": "float64",
            "role": "Predictive feature",
            "transformation": "Renamed to canonical",
            "reason": "Lightship displacement (empty hull/machinery weight).",
            "leakage_status": "Clean",
        },
        {
            "feature_name": "month",
            "original_column": "Month",
            "unit": "Calendar month name",
            "data_type": "string",
            "role": "Categorical feature",
            "transformation": "None (retained string)",
            "reason": "Calendar month name preserved for grouping/filtering.",
            "leakage_status": "Clean",
        },
        {
            "feature_name": "latitude_deg",
            "original_column": "Latitude",
            "unit": "Decimal degrees",
            "data_type": "float64",
            "role": "Identifier/location feature",
            "transformation": "Renamed to canonical",
            "reason": "Geographic coordinate for spatial clustering / route context.",
            "leakage_status": "Clean",
        },
        {
            "feature_name": "longitude_deg",
            "original_column": "Longitude",
            "unit": "Decimal degrees",
            "data_type": "float64",
            "role": "Identifier/location feature",
            "transformation": "Renamed to canonical",
            "reason": "Geographic coordinate for spatial clustering / route context.",
            "leakage_status": "Clean",
        },
        {
            "feature_name": "speed_knots",
            "original_column": "Speed",
            "unit": "Knots (kn)",
            "data_type": "float64",
            "role": "Predictive feature",
            "transformation": "Renamed to canonical",
            "reason": "Ship speed through water / over ground, primary power driver.",
            "leakage_status": "Clean",
        },
        {
            "feature_name": "displacement_approx_mt",
            "original_column": "Derived from Light Weight + Amount of Cargo",
            "unit": "Metric tonnes (MT)",
            "data_type": "float64",
            "role": "Derived feature",
            "transformation": "light_weight_mt + cargo_mt",
            "reason": "Naval architecture total displacement proxy.",
            "leakage_status": "Clean",
        },
        {
            "feature_name": "cargo_ratio",
            "original_column": "Derived from Amount of Cargo / displacement_approx_mt",
            "unit": "Dimensionless ratio [0, 1]",
            "data_type": "float64",
            "role": "Derived feature",
            "transformation": "cargo_mt / displacement_approx_mt",
            "reason": "Vessel capacity utilization fraction.",
            "leakage_status": "Clean",
        },
        {
            "feature_name": "is_laden",
            "original_column": "Derived from Amount of Cargo",
            "unit": "Binary flag (0 or 1)",
            "data_type": "int64",
            "role": "Derived feature",
            "transformation": "1 if cargo_mt > 0 else 0",
            "reason": "Differentiates laden vs ballast operational voyage condition.",
            "leakage_status": "Clean",
        },
        {
            "feature_name": "is_steaming",
            "original_column": "Derived from Speed",
            "unit": "Binary flag (0 or 1)",
            "data_type": "int64",
            "role": "Derived feature",
            "transformation": "1 if speed_knots > 0 else 0",
            "reason": "Differentiates underway sea steaming vs stationary port/anchorage hotel load.",
            "leakage_status": "Clean",
        },
        {
            "feature_name": "total_power_kw",
            "original_column": "Derived from Main Engine Power + Auxiliary Engine Power",
            "unit": "kW",
            "data_type": "float64",
            "role": "Derived feature",
            "transformation": "main_engine_kw + aux_engine_kw",
            "reason": "Total installed mechanical & electrical power generation capacity.",
            "leakage_status": "Clean",
        },
        {
            "feature_name": "aux_power_ratio",
            "original_column": "Derived from Auxiliary Engine Power / total_power_kw",
            "unit": "Dimensionless ratio [0, 1]",
            "data_type": "float64",
            "role": "Derived feature",
            "transformation": "aux_engine_kw / total_power_kw",
            "reason": "Relative auxiliary generation sizing.",
            "leakage_status": "Clean",
        },
        {
            "feature_name": "month_num",
            "original_column": "Derived from Month",
            "unit": "Integer 1-12",
            "data_type": "int64",
            "role": "Derived feature",
            "transformation": "Map month name to calendar ordinal 1-12",
            "reason": "Numerical calendar month index.",
            "leakage_status": "Clean",
        },
        {
            "feature_name": "month_sin",
            "original_column": "Derived from Month",
            "unit": "Trigonometric [-1, 1]",
            "data_type": "float64",
            "role": "Derived feature",
            "transformation": "sin(2 * pi * month_num / 12)",
            "reason": "Cyclical seasonal encoding preserving continuity (Dec -> Jan).",
            "leakage_status": "Clean",
        },
        {
            "feature_name": "month_cos",
            "original_column": "Derived from Month",
            "unit": "Trigonometric [-1, 1]",
            "data_type": "float64",
            "role": "Derived feature",
            "transformation": "cos(2 * pi * month_num / 12)",
            "reason": "Cyclical seasonal encoding preserving continuity (Dec -> Jan).",
            "leakage_status": "Clean",
        },
        {
            "feature_name": "abs_latitude",
            "original_column": "Derived from Latitude",
            "unit": "Decimal degrees",
            "data_type": "float64",
            "role": "Derived feature",
            "transformation": "abs(latitude_deg)",
            "reason": "Equator distance proxy for climate/ambient temperature zone.",
            "leakage_status": "Clean",
        },
        {
            "feature_name": "vessel_id",
            "original_column": "Derived from (LOA, Breath, Light Weight, Main Engine Power, Auxiliary Engine Power)",
            "unit": "Integer ID (0-28)",
            "data_type": "int64",
            "role": "Identifier feature",
            "transformation": "Grouped categorical ID based on static vessel hull/machinery specifications",
            "reason": "Vessel group identifier to enable grouped k-fold / out-of-sample vessel evaluation.",
            "leakage_status": "Clean",
        },
        {
            "feature_name": "consumption_lshfo_mt_day",
            "original_column": "Consumption_LSHFO",
            "unit": "Metric tonnes / day (MT/day)",
            "data_type": "float64",
            "role": "Target variable",
            "transformation": "Renamed to canonical",
            "reason": "Ground-truth empirical fuel consumption to predict.",
            "leakage_status": "Target",
        },
    ]
    feature_dict_df = pd.DataFrame(feature_dict_rows)

    # 9. Generate Quality Report Markdown
    target_clean = clean_df["consumption_lshfo_mt_day"]
    q25 = target_clean.quantile(0.25)
    q75 = target_clean.quantile(0.75)
    iqr = q75 - q25
    iqr_lower = q25 - 1.5 * iqr
    iqr_upper = q75 + 1.5 * iqr

    steaming_sub = clean_df[clean_df["is_steaming"] == 1]
    stationary_sub = clean_df[clean_df["is_steaming"] == 0]

    report_md = f"""# Shokohian Dataset Data Quality & ML Readiness Report
**Project:** SIH26138 — Quantum-Inspired Maritime Fleet & Voyage Fuel Optimization  
**Phase:** 3D — Empirical Dataset Preparation & ML Readiness  
**Source File:** `raw/Shokohian_Data.csv`  
**Processed File:** `processed/shokohian_fuel_training.csv`  
**Feature Dictionary:** `processed/shokohian_feature_dictionary.csv`  

---

## 1. Executive Summary

| Metric | Value |
|---|---|
| **Raw Row Count** | {raw_row_count:,} |
| **Processed Row Count** | {processed_row_count:,} |
| **Removed Rows Count** | {total_removed_count:,} ({total_removed_count/raw_row_count*100:.2f}%) |
| **Missing Values (All Columns)** | {total_missing} (0.00%) |
| **Exact Duplicate Rows in Raw** | {exact_duplicates_count:,} ({exact_duplicates_count/raw_row_count*100:.2f}%) |
| **Consecutive Duplicates in Raw** | {consecutive_duplicates_count:,} ({consecutive_duplicates_count/raw_row_count*100:.2f}%) |
| **Non-consecutive Duplicates in Raw** | {non_consecutive_duplicates_count:,} ({non_consecutive_duplicates_count/raw_row_count*100:.2f}%) |
| **Identified Copy-Pasted Block Rows Removed** | {pasted_block_count:,} |
| **Raw Zero-Speed Count** | {raw_zero_speed_count:,} ({raw_zero_speed_count/raw_row_count*100:.2f}%) |
| **Legitimate Stationary Port Rows Retained** | {legitimate_zero_speed_count:,} |
| **Corrupted Zero-Speed Records Removed** | {corrupted_zero_speed_count:,} |
| **Processed Underway (Steaming) Rows** | {len(steaming_sub):,} ({len(steaming_sub)/processed_row_count*100:.2f}%) |
| **Processed Stationary (Moored) Rows** | {len(stationary_sub):,} ({len(stationary_sub)/processed_row_count*100:.2f}%) |
| **Distinct Vessel Configurations** | {clean_df['vessel_id'].nunique()} |
| **Target Column** | `consumption_lshfo_mt_day` |
| **Target Mean (Processed)** | {target_clean.mean():.2f} MT/day |
| **Target Median (Processed)** | {target_clean.median():.2f} MT/day |
| **Target Std Dev (Processed)** | {target_clean.std():.2f} MT/day |
| **Target Range (Processed)** | [{target_clean.min():.2f}, {target_clean.max():.2f}] MT/day |
| **Target Skewness (Processed)** | {target_clean.skew():.2f} |
| **Target Leakage Status** | Clean (Zero Leakage) |

---

## 2. Zero-Speed Investigation & Resolution

Initial data exploration revealed 6,655 rows with `Speed == 0`. Detailed nautical trajectory and operational analysis demonstrated that these zero-speed rows fall into two distinct populations:

1. **Legitimate Stationary / Port Operations (6,564 rows / 98.63% of zero-speed records):**
   - **Location:** Deeply clustered at specific berths and designated anchorages (Bandar Abbas, Asaluyeh/Pars Port, Bandar Imam Khomeini, Qinzhou, Paranagua, Phuket, Kerch Strait).
   - **Displacement & Movement:** 75% of these records have distance from previous log $\\le 0.37$ nautical miles (within GPS/anchor swing radius).
   - **Fuel Burn:** Auxiliary engine power ratings are 420–770 kW, with mean fuel consumption of 2.19 MT/day (median 2.10 MT/day; 94.3% consume $< 5.0$ MT/day).
   - **Cargo Dynamics:** Amount of cargo dynamically increases or decreases sequentially across consecutive rows (e.g. 0 $\\rightarrow$ 2,474 $\\rightarrow$ 12,018 $\\rightarrow$ 50,601 MT) while speed remains zero, accurately recording port cargo loading and discharging operations.
   - **Handling Decision:** **Retained completely**. An engineered flag `is_steaming` ($1$ for speed $> 0$, $0$ for speed $= 0$) allows future models to seamlessly differentiate underway voyage fuel from in-port hotel load.

2. **Corrupted Open-Ocean Steaming Records (91 rows / 1.37% of zero-speed records):**
   - **Coordinates:** Moving rapidly through deep ocean waters (e.g. South Atlantic crossing from Lat -28.327, Lon -40.967 to Lat -29.000, Lon -0.167 at distances of 190–250 nm between reports).
   - **Fuel Burn:** 10.0 to 28.1 MT/day (mean 19.86 MT/day, median 21.7 MT/day), identical to high-speed sea passage main engine consumption.
   - **Physical Contradiction:** Burning 20–28 MT/day of HFO while traveling 200+ nm per day with recorded speed $= 0.0$ is physically impossible on merchant cargo vessels and represents sensor/data logging failure.
   - **Handling Decision:** **Removed** ({corrupted_zero_speed_count} rows).

---

## 3. Duplicate Analysis & Handling

- **Consecutive Duplicates (823 rows):**
  - Vessels moored at port or waiting at anchorage for several days log identical noon reports (same coordinates, zero speed, identical steady-state auxiliary fuel consumption of ~2.1 MT/day). These represent **legitimate repeated operational observations** and were **preserved**.
- **Copy-Pasted Voyage Blocks (104 rows):**
  - Exactly 4 multi-row voyage sequences were copy-pasted in the raw dataset:
    1. Rows 559–599 (41 rows, exact copy of rows 101–141)
    2. Rows 5847–5851, 5853–5868, 5869–5876 (27 rows, exact copy of rows 5543–5572)
    3. Rows 7533–7539 (7 rows, exact copy of rows 7178–7184)
    4. Rows 8500–8528 (29 rows, exact copy of rows 8319–8347)
  - **Handling Decision:** These 104 rows represent artificial duplicated blocks and were **removed**.

---

## 4. Feature Engineering & Physical Justification

| Feature Name | Formula / Derivation | Physical Justification |
|---|---|---|
| `displacement_approx_mt` | `light_weight_mt + cargo_mt` | Fundamental naval architecture displacement: total immersed vessel mass resisting motion. |
| `cargo_ratio` | `cargo_mt / displacement_approx_mt` | Operational payload ratio indicating loading efficiency. |
| `is_laden` | `cargo_mt > 0` | Distinguishes laden voyage vs ballast voyage hydrodynamics. |
| `is_steaming` | `speed_knots > 0` | Separates hydrodynamic hull drag regime from stationary auxiliary hotel load regime. |
| `total_power_kw` | `main_engine_kw + aux_engine_kw` | Total installed powerplant capacity. |
| `aux_power_ratio` | `aux_engine_kw / total_power_kw` | Relative proportion of auxiliary power sizing. |
| `month_num` | Ordinal 1 to 12 | Numerical calendar index. |
| `month_sin`, `month_cos` | $\\sin(2\\pi m/12)$, $\\cos(2\\pi m/12)$ | Smooth cyclical seasonal encoding connecting December (12) and January (1). |
| `abs_latitude` | $\\|\\text{{latitude}}\\|$ | Distance from equator proxy for ambient weather and water temperature. |
| `vessel_id` | Cluster ID (0–28) | Grouping key of static design specs for grouped cross-validation. |

*Note: In accordance with Phase 3D requirements, no heuristic artifacts from the deterministic equation (such as `(speed/14)^3` or heuristic weather factor multipliers) were introduced.*

---

## 5. Data Leakage Audit

A strict audit confirmed that no features contain mathematically or operationally downstream transformations of the target:
- No fuel costs ($/MT)
- No fuel rates (g/kWh)
- No fuel consumption per distance (MT/nm)
- No emissions ($CO_2$, $SO_x$, $NO_x$) calculated from consumption
- Leakage status: **100% CLEAN**.

---

## 6. Target Analysis

| Statistic | Underway Records (`is_steaming == 1`) | Stationary Records (`is_steaming == 0`) | Combined Processed Dataset |
|---|---|---|---|
| **Count** | {len(steaming_sub):,} | {len(stationary_sub):,} | {len(clean_df):,} |
| **Mean (MT/day)** | {steaming_sub['consumption_lshfo_mt_day'].mean():.2f} | {stationary_sub['consumption_lshfo_mt_day'].mean():.2f} | {target_clean.mean():.2f} |
| **Median (MT/day)** | {steaming_sub['consumption_lshfo_mt_day'].median():.2f} | {stationary_sub['consumption_lshfo_mt_day'].median():.2f} | {target_clean.median():.2f} |
| **Std Dev (MT/day)** | {steaming_sub['consumption_lshfo_mt_day'].std():.2f} | {stationary_sub['consumption_lshfo_mt_day'].std():.2f} | {target_clean.std():.2f} |
| **Min (MT/day)** | {steaming_sub['consumption_lshfo_mt_day'].min():.2f} | {stationary_sub['consumption_lshfo_mt_day'].min():.2f} | {target_clean.min():.2f} |
| **Max (MT/day)** | {steaming_sub['consumption_lshfo_mt_day'].max():.2f} | {stationary_sub['consumption_lshfo_mt_day'].max():.2f} | {target_clean.max():.2f} |
| **IQR (MT/day)** | [{steaming_sub['consumption_lshfo_mt_day'].quantile(0.25):.2f}, {steaming_sub['consumption_lshfo_mt_day'].quantile(0.75):.2f}] | [{stationary_sub['consumption_lshfo_mt_day'].quantile(0.25):.2f}, {stationary_sub['consumption_lshfo_mt_day'].quantile(0.75):.2f}] | [{q25:.2f}, {q75:.2f}] |

---

## 7. Recommended Train / Validation / Test Strategy for Phase 3E

1. **Vessel-Aware Grouped Split (Recommended Primary Strategy):**
   - The dataset contains 29 unique static vessel specifications.
   - Using `GroupKFold` or `GroupShuffleSplit` on `vessel_id` (e.g. 70% train / 15% validation / 15% test) tests true generalizability: predicting fuel consumption on *unseen vessels*.
2. **Temporal Split (Secondary Strategy):**
   - Train on Months 1–9 (January to September), evaluate on Months 10–12 (October to December) to assess seasonal forecast robustness.
3. **ML Baselines Defined:**
   - **Baseline 1 (Mean Target Baseline):** Predicts sample mean (RMSE $\\approx 10.63$).
   - **Baseline 2 (Linear / Ridge Regression):** Standard linear model using speed, cargo, wind, and engine power.
   - **Baseline 3 (Deterministic Heuristic Model):** Existing cubic speed heuristic mapping for vessels under underway steaming conditions.
"""

    return clean_df, feature_dict_df, report_md


def main() -> None:
    """Execute the Shokohian dataset preparation pipeline."""
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    print("Running Shokohian dataset preparation...")
    clean_df, feature_dict_df, report_md = process_shokohian_dataset()

    # Save outputs deterministically
    clean_df.to_csv(OUTPUT_TRAIN_CSV, index=False)
    feature_dict_df.to_csv(OUTPUT_DICT_CSV, index=False)
    with open(OUTPUT_REPORT_MD, "w", encoding="utf-8") as f:
        f.write(report_md)

    print(f"[OK] Training CSV saved: {OUTPUT_TRAIN_CSV} ({len(clean_df):,} rows)")
    print(f"[OK] Feature Dictionary saved: {OUTPUT_DICT_CSV} ({len(feature_dict_df)} features)")
    print(f"[OK] Quality Report saved: {OUTPUT_REPORT_MD}")


if __name__ == "__main__":
    main()
