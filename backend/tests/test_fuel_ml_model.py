"""
Automated Unit Tests for Phase 3E Empirical Fuel Consumption ML Model (XGBoost).
Verifies:
- Model artifacts exist and can be cleanly loaded
- Feature schema matches expected canonical features
- No target or target-derived leakage features in the model
- Deterministic 3-way vessel-grouped split with zero group leakage
- Inference produces finite, non-negative predictions across edge cases
- Evaluation metrics and reports exist and are mathematically sane
"""

import json
from pathlib import Path
import numpy as np
import pandas as pd
import pytest

from backend.app.ml.fuel_model import DEFAULT_ARTIFACT_DIR, XGBFuelModel
from backend.app.ml.train_fuel_model import (
    ARTIFACT_DIR,
    PROCESSED_CSV_PATH,
    PROCESSED_REPORT_PATH,
    RANDOM_SEED,
    TARGET_COL,
    split_dataset_by_vessel,
)


@pytest.fixture(scope="module")
def loaded_model():
    """Load the trained production XGBoost fuel model."""
    assert DEFAULT_ARTIFACT_DIR.exists(), f"Artifact directory not found at {DEFAULT_ARTIFACT_DIR}"
    return XGBFuelModel.load(DEFAULT_ARTIFACT_DIR)


@pytest.fixture(scope="module")
def processed_df():
    """Load the processed training dataset."""
    assert PROCESSED_CSV_PATH.exists(), f"Processed CSV not found at {PROCESSED_CSV_PATH}"
    return pd.read_csv(PROCESSED_CSV_PATH)


def test_model_artifacts_exist_and_load(loaded_model):
    """Verify all model artifact files exist and the model is initialized."""
    expected_files = [
        "xgb_fuel_model.json",
        "xgb_fuel_model.joblib",
        "model_metadata.json",
        "feature_names.json",
        "split_info.json",
        "evaluation_metrics.json",
        "feature_importance.csv",
        "feature_importance.json",
        "training_evaluation_report.md",
    ]
    for fname in expected_files:
        fpath = DEFAULT_ARTIFACT_DIR / fname
        assert fpath.exists(), f"Missing artifact: {fname}"
        assert fpath.stat().st_size > 0, f"Empty artifact: {fname}"

    assert PROCESSED_REPORT_PATH.exists()
    assert PROCESSED_REPORT_PATH.stat().st_size > 0

    assert loaded_model.model is not None
    assert len(loaded_model.feature_names) == 21


def test_feature_schema_and_order(loaded_model):
    """Verify expected feature list matches exact non-leakage feature schema."""
    features_path = DEFAULT_ARTIFACT_DIR / "feature_names.json"
    with open(features_path, "r", encoding="utf-8") as f:
        stored_features = json.load(f)

    assert loaded_model.feature_names == stored_features
    assert "vessel_id" not in stored_features, "vessel_id must not be used as a predictive feature"
    assert "month" not in stored_features, "Raw month string should be replaced by cyclical/numerical features"
    assert TARGET_COL not in stored_features, "Target must not be in feature schema"


def test_no_target_leakage(loaded_model):
    """Verify strictly no target or target-derived columns are present in features."""
    forbidden = ["consumption", "lshfo", "cost", "rate", "emission", "co2", "ghg", "sox", "nox", "per_distance"]
    for feat in loaded_model.feature_names:
        feat_lower = feat.lower()
        for f in forbidden:
            assert f not in feat_lower, f"Detected potential leakage term '{f}' in feature '{feat}'"


def test_deterministic_split(processed_df):
    """Verify vessel-grouped split is strictly deterministic with zero vessel group leakage."""
    train_idx1, val_idx1, test_idx1, info1 = split_dataset_by_vessel(processed_df, seed=RANDOM_SEED)
    train_idx2, val_idx2, test_idx2, info2 = split_dataset_by_vessel(processed_df, seed=RANDOM_SEED)

    np.testing.assert_array_equal(train_idx1, train_idx2)
    np.testing.assert_array_equal(val_idx1, val_idx2)
    np.testing.assert_array_equal(test_idx1, test_idx2)

    # Check partition sizes and groups
    assert info1["train"]["group_count"] == 20
    assert info1["validation"]["group_count"] == 4
    assert info1["test"]["group_count"] == 5

    # Check strict disjointness of vessel groups
    train_groups = set(info1["train"]["vessel_group_ids"])
    val_groups = set(info1["validation"]["vessel_group_ids"])
    test_groups = set(info1["test"]["vessel_group_ids"])

    assert len(train_groups & val_groups) == 0, "Train and Val vessel groups overlap!"
    assert len(train_groups & test_groups) == 0, "Train and Test vessel groups overlap!"
    assert len(val_groups & test_groups) == 0, "Val and Test vessel groups overlap!"


def test_inference_produces_finite_non_negative_predictions(loaded_model, processed_df):
    """Verify inference produces finite, non-negative predictions on real and synthetic inputs."""
    # Batch prediction on test sample
    sample_df = processed_df[loaded_model.feature_names].head(25)
    preds = loaded_model.predict(sample_df)

    assert len(preds) == 25
    assert np.all(np.isfinite(preds))
    assert np.all(preds >= 0.0)

    # Steaming vs Stationary single predictions
    steaming_sample = sample_df.iloc[0].to_dict()
    steaming_sample["speed_knots"] = 14.0
    steaming_sample["is_steaming"] = 1
    pred_steaming = loaded_model.predict_single(steaming_sample)
    assert np.isfinite(pred_steaming)
    assert pred_steaming >= 10.0, "Expected underway steaming fuel to reflect sea passage range"

    stationary_sample = sample_df.iloc[0].to_dict()
    stationary_sample["speed_knots"] = 0.0
    stationary_sample["is_steaming"] = 0
    pred_stationary = loaded_model.predict_single(stationary_sample)
    assert np.isfinite(pred_stationary)
    assert pred_stationary >= 0.0
    assert pred_stationary < pred_steaming, "Stationary fuel burn should be substantially lower than steaming"


def test_evaluation_artifacts_exist_and_sane():
    """Verify evaluation metrics JSON values are within reasonable physical and statistical bounds."""
    metrics_path = DEFAULT_ARTIFACT_DIR / "evaluation_metrics.json"
    with open(metrics_path, "r", encoding="utf-8") as f:
        metrics = json.load(f)

    assert "test_overall" in metrics
    assert "test_steaming_only" in metrics
    assert "test_stationary_only" in metrics

    overall = metrics["test_overall"]
    assert overall["r2"] > 0.90, f"Overall test R2 should exceed 0.90, got {overall['r2']}"
    assert overall["mae"] < 2.5, f"Overall test MAE should be < 2.5 MT/day, got {overall['mae']}"
    assert overall["rmse"] < 3.5, f"Overall test RMSE should be < 3.5 MT/day, got {overall['rmse']}"

    steaming = metrics["test_steaming_only"]
    assert steaming["mae"] < 4.0, f"Steaming MAE should be < 4.0 MT/day, got {steaming['mae']}"
    assert steaming["mape_percent"] < 20.0, f"Steaming MAPE should be < 20%, got {steaming['mape_percent']}"
