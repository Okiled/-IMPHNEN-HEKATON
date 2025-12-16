'''
Training Service (Enhanced v2.0)
Orchestrates model training workflow with improved metrics tracking
'''

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

import glob
import pandas as pd
from typing import List
from pathlib import Path
import time

from core.interfaces import IProgressObserver, IModelTrainer
from core.models import TrainingResult, TrainingConfig
from core.exceptions import TrainingError, InsufficientDataError
from models.xgboost_optimal import forecaster
from utils.logger import logger
from utils.validators import SalesDataValidator


class XGBoostModelTrainer(IModelTrainer):
    '''
    XGBoost model trainer (Adapter Pattern)
    Adapts existing forecaster to IModelTrainer interface
    Enhanced to track validation metrics and baseline comparison
    '''

    def train(self, sales_data: List[dict], product_id: str) -> TrainingResult:
        '''Train XGBoost model with comprehensive metrics'''
        start_time = time.time()

        try:
            # Validate data
            validator = SalesDataValidator()
            if not validator.validate_sales_data(sales_data):
                raise InsufficientDataError(
                    f"Invalid data: {validator.get_validation_errors()}"
                )

            # Train
            result = forecaster.train(sales_data, product_id)

            training_time = time.time() - start_time
            
            # Extract enhanced metrics
            metrics = result.get('metrics', {})
            
            # Add baseline_mae to metrics if available
            if 'baseline_mae' in result.get('metrics', {}):
                metrics['baseline_mae'] = result['metrics']['baseline_mae']
            
            return TrainingResult(
                product_id=product_id,
                success=True,
                model_path=None,
                metrics=metrics,
                training_time=training_time
            )

        except Exception as e:
            training_time = time.time() - start_time
            logger.error(f"Training failed for {product_id}: {str(e)}")

            return TrainingResult(
                product_id=product_id,
                success=False,
                error_message=str(e),
                training_time=training_time
            )

    def save_model(self, product_id: str, output_path: str) -> bool:
        '''Save trained model'''
        try:
            return forecaster.save_model(product_id, output_path)
        except Exception as e:
            logger.error(f"Failed to save model {product_id}: {str(e)}")
            return False

    def load_model(self, product_id: str, model_path: str) -> bool:
        '''Load existing model'''
        try:
            return forecaster.load_model(product_id, model_path)
        except Exception as e:
            logger.error(f"Failed to load model {product_id}: {str(e)}")
            return False


class TrainingService:
    '''
    High-level training service
    Coordinates training workflow with quality filtering
    '''

    def __init__(
        self,
        config: TrainingConfig,
        trainer: IModelTrainer = None,
        observer: IProgressObserver = None
    ):
        self.config = config
        self.trainer = trainer or XGBoostModelTrainer()
        self.observer = observer
        self.results: List[TrainingResult] = []

    def discover_datasets(self) -> List[str]:
        '''Find all preprocessed CSV files'''
        pattern = os.path.join(self.config.input_folder, "*_cleaned.csv")
        return sorted(glob.glob(pattern))

    def _filter_quality_datasets(self, all_files: List[str]) -> List[str]:
        """Filter datasets suitable for high-quality training"""
        valid_files = []
        
        for file_path in all_files:
            try:
                df = pd.read_csv(file_path)
                df['date'] = pd.to_datetime(df['date'])
                
                # Check 1: Minimum 30 rows
                if len(df) < 30:
                    continue
                
                # Check 2: At least 5 unique values
                if df['quantity'].nunique() < 5:
                    continue
                
                # Check 3: CV > 10%
                mean_qty = df['quantity'].mean()
                std_qty = df['quantity'].std()
                cv = std_qty / mean_qty if mean_qty > 0 else 0
                
                if cv < 0.10:
                    continue
                
                # Check 4: Date density > 30%
                date_range = (df['date'].max() - df['date'].min()).days + 1
                coverage = len(df) / date_range if date_range > 0 else 0
                
                if coverage < 0.3:
                    continue
                
                valid_files.append(file_path)
                
            except Exception:
                continue
        
        return valid_files

    def train_all(self) -> List[TrainingResult]:
        '''Train models for all preprocessed datasets'''

        logger.info("=" * 60)
        logger.info("TRAINING STARTED")
        logger.info("=" * 60)

        print("\n" + "="*60)
        print("MODEL TRAINING")
        print("="*60)

        # Discover datasets
        all_datasets = self.discover_datasets()

        if not all_datasets:
            logger.warning(f"No datasets found in {self.config.input_folder}")
            print(f"\n❌ No preprocessed data found in: {self.config.input_folder}")
            print(f"Run preprocessing first: python preprocess.py\n")
            return []

        # Filter quality datasets
        datasets = self._filter_quality_datasets(all_datasets)
        
        filtered_count = len(all_datasets) - len(datasets)
        if filtered_count > 0:
            print(f"\n⚠️  Filtered out {filtered_count} low-quality datasets")
        
        if not datasets:
            logger.warning("No datasets passed quality filter")
            print(f"\n❌ No datasets passed quality filtering")
            print("Ensure datasets have:")
            print("  • At least 30 rows")
            print("  • At least 5 unique values")
            print("  • Coefficient of variation > 10%")
            print("  • Date coverage > 30%\n")
            return []

        logger.info(f"Found {len(datasets)} quality dataset(s)")
        print(f"\nFound {len(datasets)} quality dataset(s) for training\n")

        # Ensure output directory exists
        os.makedirs(self.config.output_folder, exist_ok=True)

        # Train each dataset
        self.results = []

        for i, csv_path in enumerate(datasets, 1):
            product_id = Path(csv_path).stem.replace('_cleaned', '')

            if self.observer:
                self.observer.on_training_start(product_id, i, len(datasets))

            try:
                result = self._train_single_dataset(csv_path, product_id)
                self.results.append(result)

                if self.observer:
                    self.observer.on_training_complete(product_id, result)

            except Exception as e:
                logger.error(f"Training failed for {product_id}: {str(e)}")
                result = TrainingResult(
                    product_id=product_id,
                    success=False,
                    error_message=str(e)
                )
                self.results.append(result)

                if self.observer:
                    self.observer.on_training_complete(product_id, result)

        # Summary
        self._print_summary()

        logger.info("=" * 60)
        logger.info("TRAINING COMPLETED")
        logger.info(f"Success: {sum(1 for r in self.results if r.success)}/{len(self.results)}")
        logger.info("=" * 60)

        return self.results

    def _train_single_dataset(self, csv_path: str, product_id: str) -> TrainingResult:
        '''Train model for single dataset'''

        # Load data
        df = pd.read_csv(csv_path)
        sales_data = df.to_dict('records')

        logger.info(f"Training {product_id} with {len(sales_data)} records")

        # Train
        result = self.trainer.train(sales_data, product_id)

        # Attach row count to metrics for downstream reporting (non-invasive)
        if result.metrics is not None:
            result.metrics = {**result.metrics, "rows": len(sales_data)}

        if result.success:
            # Save model
            model_path = os.path.join(
                self.config.output_folder,
                f"xgboost_{product_id}.pkl"
            )

            if self.trainer.save_model(product_id, model_path):
                result.model_path = model_path
                logger.info(f"Model saved: {model_path}")
            else:
                logger.warning(f"Failed to save model for {product_id}")

        return result

    def _print_summary(self):
        '''Print training summary with detailed metrics'''
        success_count = sum(1 for r in self.results if r.success)
        failed_count = len(self.results) - success_count

        print("\n" + "="*60)
        print("TRAINING SUMMARY")
        print("="*60)
        print(f"Total datasets:  {len(self.results)}")
        print(f"✅ Success:      {success_count}")
        print(f"❌ Failed:       {failed_count}")

        if success_count > 0:
            # Calculate aggregate metrics
            val_maes = []
            improvements = []
            
            print(f"\nSuccessfully trained:")
            for result in self.results:
                if result.success and result.metrics:
                    val_mae = result.metrics.get('validation', {}).get('mae', 0)
                    baseline_mae = result.metrics.get('baseline_mae', 0)
                    
                    val_maes.append(val_mae)
                    
                    improvement = 0
                    if baseline_mae and baseline_mae > 0:
                        improvement = (1 - val_mae / baseline_mae) * 100
                        improvements.append(improvement)
                    
                    short_name = result.product_id[:40] if len(result.product_id) > 40 else result.product_id
                    print(f"  • {short_name:40} Val MAE: {val_mae:.4f}, Imp: {improvement:.1f}%")
            
            if val_maes:
                avg_mae = sum(val_maes) / len(val_maes)
                print(f"\n📊 Average Validation MAE: {avg_mae:.4f}")
            
            if improvements:
                avg_imp = sum(improvements) / len(improvements)
                print(f"📈 Average Improvement: {avg_imp:.1f}%")
                
                if avg_imp >= 90:
                    print("✅ Target improvement achieved! (≥90%)")
                elif avg_imp >= 50:
                    print("✓  Good improvement (≥50%)")
                else:
                    print("⚠️  Below target improvement (<50%)")

        if failed_count > 0:
            print(f"\nFailed:")
            for result in self.results:
                if not result.success:
                    error_msg = result.error_message[:50] if result.error_message else "Unknown error"
                    print(f"  • {result.product_id}: {error_msg}")

        print("\n" + "="*60 + "\n")

    def get_results(self) -> List[TrainingResult]:
        '''Get training results'''
        return self.results
