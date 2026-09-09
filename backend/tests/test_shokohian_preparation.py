"""
Unit tests for Shokohian dataset preparation and ML readiness pipeline (Phase 3D).
Verifies:
- Raw file unchanged (hash immutability)
- Processed files exist and are non-empty
- Target column exists and is valid
- Zero leakage features present
- All engineered features present and physically consistent
- Zero-speed handling (corrupted removed, legitimate retained)
- Feature dictionary schema and 1:1 mapping with training dataset
- Determinism (running preparation twice yields identical outputs)
"""

import hashlib
from pathlib import Path
import numpy as np
import pandas as pd
import pytest

from backend.app.data.prepare_shokohian import (
    PROJECT_ROOT,
    RAW_CSV_PATH,
    OUTPUT_TRAIN_CSV,
    OUTPUT_DICT_CSV,
    OUTPUT_REPORT_MD,
    compute_file_hash,
    process_shokohian_dataset,
)


@pytest.fixture(scope="module")
def raw_dataset():
    assert RAW_CSV_PATH.exists(), f"Raw dataset not found at {RAW_CSV_PATH}"
    return pd.read_csv(RAW_CSV_PATH)


@pytest.fixture(scope="module")
def processed_dataset():
    assert OUTPUT_TRAIN_CSV.exists(), f"Processed training CSV not found at {OUTPUT_TRAIN_CSV}"
    return pd.read_csv(OUTPUT_TRAIN_CSV)


@pytest.fixture(scope="module")
def feature_dictionary():
    assert OUTPUT_DICT_CSV.exists(), f"Feature dictionary not found at {OUTPUT_DICT_CSV}"
    return pd.read_csv(OUTPUT_DICT_CSV)


def test_raw_file_immutability():
    """Verify raw/Shokohian_Data.csv is strictly unchanged."""
    hash_1 = compute_file_hash(RAW_CSV_PATH)
    raw_df = pd.read_csv(RAW_CSV_PATH)
    assert len(raw_df) == 10422, "Raw dataset row count must remain exactly 10,422"
    assert len(raw_df.columns) == 13, "Raw dataset column count must remain exactly 13"
    hash_2 = compute_file_hash(RAW_CSV_PATH)
    assert hash_1 == hash_2, "Raw CSV hash changed! Raw data must remain completely untouched."


def test_processed_files_exist_and_non_empty():
    """Verify all 3 Phase 3D required artifacts exist and are populated."""
    assert OUTPUT_TRAIN_CSV.exists()
    assert OUTPUT_TRAIN_CSV.stat().st_size > 0

    assert OUTPUT_DICT_CSV.exists()
    assert OUTPUT_DICT_CSV.stat().st_size > 0

    assert OUTPUT_REPORT_MD.exists()
    assert OUTPUT_REPORT_MD.stat().st_size > 0


def test_target_exists_and_valid(processed_dataset):
    """Verify target column exists, has no nulls, and has positive values."""
    target_col = "consumption_lshfo_mt_day"
    assert target_col in processed_dataset.columns
    assert processed_dataset[target_col].isnull().sum() == 0
    assert (processed_dataset[target_col] > 0).all()
    assert processed_dataset[target_col].min() >= 0.01
    assert processed_dataset[target_col].max() <= 35.0


def test_no_leakage_columns(processed_dataset):
    """Verify training dataset contains no downstream leakage features."""
    forbidden_terms = ["cost", "rate", "emission", "co2", "ghg", "sox", "nox", "per_distance", "per_cargo"]
    for col in processed_dataset.columns:
        col_lower = col.lower()
        for term in forbidden_terms:
            assert term not in col_lower, f"Potential leakage column detected: {col}"


def test_engineered_features_present_and_valid(processed_dataset):
    """Verify all required physically defensible features exist and obey physical constraints."""
    expected_features = [
        "displacement_approx_mt",
        "cargo_ratio",
        "is_laden",
        "is_steaming",
        "total_power_kw",
        "aux_power_ratio",
        "month_num",
        "month_sin",
        "month_cos",
        "abs_latitude",
        "vessel_id",
    ]
    for feat in expected_features:
        assert feat in processed_dataset.columns, f"Engineered feature missing: {feat}"

    # Physical validations
    # displacement >= light_weight
    assert (processed_dataset["displacement_approx_mt"] >= processed_dataset["light_weight_mt"]).all()

    # cargo_ratio in [0, 1]
    assert (processed_dataset["cargo_ratio"] >= 0.0).all()
    assert (processed_dataset["cargo_ratio"] <= 1.0).all()

    # is_laden and is_steaming are binary {0, 1}
    assert set(processed_dataset["is_laden"].unique()).issubset({0, 1})
    assert set(processed_dataset["is_steaming"].unique()).issubset({0, 1})

    # total_power >= main_engine_kw
    assert (processed_dataset["total_power_kw"] >= processed_dataset["main_engine_kw"]).all()

    # aux_power_ratio in (0, 1)
    assert (processed_dataset["aux_power_ratio"] > 0.0).all()
    assert (processed_dataset["aux_power_ratio"] < 1.0).all()

    # month_sin and month_cos in [-1, 1]
    assert (processed_dataset["month_sin"] >= -1.0).all() and (processed_dataset["month_sin"] <= 1.0).all()
    assert (processed_dataset["month_cos"] >= -1.0).all() and (processed_dataset["month_cos"] <= 1.0).all()
    assert (processed_dataset["month_num"].isin(range(1, 13))).all()

    # abs_latitude >= 0
    assert (processed_dataset["abs_latitude"] >= 0.0).all()


def test_zero_speed_handling(processed_dataset, raw_dataset):
    """
    Verify zero-speed handling:
    1. The 91 corrupted records (Speed == 0 and Consumption >= 10.0) are removed.
    2. Legitimate zero-speed port records (Speed == 0 and Consumption < 10.0) are preserved.
    """
    # In raw:
    raw_corrupt_count = ((raw_dataset["Speed"] == 0) & (raw_dataset["Consumption_LSHFO"] >= 10.0)).sum()
    assert raw_corrupt_count == 91

    # In processed:
    proc_corrupt_count = (
        (processed_dataset["speed_knots"] == 0) & (processed_dataset["consumption_lshfo_mt_day"] >= 10.0)
    ).sum()
    assert proc_corrupt_count == 0, "Corrupted zero-speed records must not be in processed dataset!"

    # Legitimate stationary records retained
    stationary_count = (processed_dataset["is_steaming"] == 0).sum()
    assert stationary_count > 6400, "Legitimate stationary port records must be retained."


def test_feature_dictionary_matches(processed_dataset, feature_dictionary):
    """Verify 1:1 mapping between feature dictionary and processed training columns."""
    dict_features = set(feature_dictionary["feature_name"])
    dataset_cols = set(processed_dataset.columns)
    assert dict_features == dataset_cols, (
        f"Feature dictionary mismatch! "
        f"In dict but not dataset: {dict_features - dataset_cols}, "
        f"In dataset but not dict: {dataset_cols - dict_features}"
    )

    required_dict_cols = [
        "feature_name",
        "original_column",
        "unit",
        "data_type",
        "role",
        "transformation",
        "reason",
        "leakage_status",
    ]
    for col in required_dict_cols:
        assert col in feature_dictionary.columns, f"Required column missing from dictionary: {col}"


def test_deterministic_output():
    """Verify running the preprocessing pipeline twice yields byte-for-byte identical output."""
    df_1, dict_1, rep_1 = process_shokohian_dataset()
    df_2, dict_2, rep_2 = process_shokohian_dataset()

    pd.testing.assert_frame_equal(df_1, df_2)
    pd.testing.assert_frame_equal(dict_1, dict_2)
    assert rep_1 == rep_2
