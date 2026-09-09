"""
Empirical Fuel Consumption ML Model (XGBoost).
Phase 3E - SIH26138 - Quantum-Inspired Maritime Fleet & Voyage Fuel Optimization.

Provides the inference and loading wrapper for the trained empirical
XGBoost fuel-consumption model, alongside the existing deterministic fuel model.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import numpy as np
import pandas as pd
import xgboost as xgb

DEFAULT_ARTIFACT_DIR = Path(__file__).resolve().parent / "artifacts"


class XGBFuelModel:
    """Wrapper for trained XGBoost empirical fuel consumption model."""

    def __init__(
        self,
        model: Optional[xgb.XGBRegressor] = None,
        feature_names: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        self.model = model
        self.feature_names = feature_names or []
        self.metadata = metadata or {}

    @classmethod
    def load(cls, artifact_dir: Optional[Union[str, Path]] = None) -> XGBFuelModel:
        """Load trained XGBoost model and associated feature metadata from artifact directory."""
        dir_path = Path(artifact_dir) if artifact_dir else DEFAULT_ARTIFACT_DIR
        model_json_path = dir_path / "xgb_fuel_model.json"
        features_path = dir_path / "feature_names.json"
        metadata_path = dir_path / "model_metadata.json"

        if not model_json_path.exists():
            raise FileNotFoundError(f"Model file not found: {model_json_path}")
        if not features_path.exists():
            raise FileNotFoundError(f"Features file not found: {features_path}")

        # Load feature names
        with open(features_path, "r", encoding="utf-8") as f:
            feature_names = json.load(f)

        # Load metadata if exists
        metadata = {}
        if metadata_path.exists():
            with open(metadata_path, "r", encoding="utf-8") as f:
                metadata = json.load(f)

        # Load XGBRegressor
        model = xgb.XGBRegressor()
        model.load_model(str(model_json_path))

        return cls(model=model, feature_names=feature_names, metadata=metadata)

    def predict(self, data: Union[pd.DataFrame, Dict[str, Any], List[Dict[str, Any]]]) -> np.ndarray:
        """
        Run inference on input data.
        Guarantees:
        - Schema alignment with feature_names
        - Non-negative predictions (clipped at 0.0)
        - Finite numeric values
        """
        if self.model is None:
            raise RuntimeError("Model is not loaded or trained.")

        if isinstance(data, dict):
            df = pd.DataFrame([data])
        elif isinstance(data, list):
            df = pd.DataFrame(data)
        elif isinstance(data, pd.DataFrame):
            df = data.copy()
        else:
            raise TypeError(f"Unsupported data type for prediction: {type(data)}")

        # Ensure all required features are present
        missing_cols = [col for col in self.feature_names if col not in df.columns]
        if missing_cols:
            raise ValueError(f"Input data is missing required features: {missing_cols}")

        X = df[self.feature_names].astype(float)
        raw_preds = self.model.predict(X)

        # Physics guard: fuel consumption cannot be negative
        clipped_preds = np.clip(raw_preds, 0.0, None)
        return np.asarray(clipped_preds, dtype=np.float64)

    def predict_single(self, feature_dict: Dict[str, Any]) -> float:
        """Convenience method to predict consumption for a single observation."""
        preds = self.predict(feature_dict)
        return float(preds[0])
