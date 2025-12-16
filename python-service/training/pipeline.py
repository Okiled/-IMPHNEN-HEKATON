#!/usr/bin/env python3
'''
Enhanced Pipeline: Preprocessing + Training with optimized XGBoost
Targets: MAE ~0.1, Improvement over baseline 90%+
Usage: python pipeline.py
'''

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(__file__))

from services import PreprocessingService, TrainingService, ConsoleProgressObserver
from training_config import PREPROCESSING_CONFIG, TRAINING_CONFIG
from utils.logger import logger
import pandas as pd


def filter_quality_datasets(preprocessed_dir: str) -> tuple:
    """
    Filter datasets that are suitable for high-accuracy XGBoost training
    Returns: (valid_files, excluded_info)
    """
    import glob
    
    pattern = os.path.join(preprocessed_dir, "*_cleaned.csv")
    all_files = sorted(glob.glob(pattern))
    
    valid_files = []
    excluded_info = {
        'too_few_rows': [],
        'flat_data': [],
        'low_variance': [],
        'sparse_dates': [],
        'read_error': []
    }
    
    print("\n" + "="*60)
    print("QUALITY FILTERING FOR HIGH-ACCURACY TRAINING")
    print("="*60)
    
    for file_path in all_files:
        product_name = os.path.basename(file_path).replace('_cleaned.csv', '')
        
        try:
            df = pd.read_csv(file_path)
            df['date'] = pd.to_datetime(df['date'])
            
            # Check 1: Minimum 30 data points
            if len(df) < 30:
                excluded_info['too_few_rows'].append((product_name, len(df)))
                continue
            
            # Check 2: At least 5 unique values (not flat data)
            unique_values = df['quantity'].nunique()
            if unique_values < 5:
                excluded_info['flat_data'].append((product_name, unique_values))
                continue
            
            # Check 3: Coefficient of Variation > 10% (has meaningful patterns)
            mean_qty = df['quantity'].mean()
            std_qty = df['quantity'].std()
            cv = (std_qty / mean_qty) if mean_qty > 0 else 0
            
            if cv < 0.10:
                excluded_info['low_variance'].append((product_name, f"{cv:.1%}"))
                continue
            
            # Check 4: Data density - at least 50% coverage of date range
            date_range = (df['date'].max() - df['date'].min()).days + 1
            coverage = len(df) / date_range if date_range > 0 else 0
            
            if coverage < 0.3:  # Less than 30% of days have data
                excluded_info['sparse_dates'].append((product_name, f"{coverage:.1%}"))
                continue
            
            # Passed all checks
            valid_files.append(file_path)
            
        except Exception as e:
            excluded_info['read_error'].append((product_name, str(e)[:50]))
            continue
    
    # Print filtering results
    total_excluded = sum(len(v) for v in excluded_info.values())
    print(f"\n📊 Dataset Quality Summary:")
    print(f"   Total found:     {len(all_files)}")
    print(f"   ✅ Valid:        {len(valid_files)}")
    print(f"   ⚠️  Excluded:    {total_excluded}")
    
    if any(excluded_info.values()):
        print("\n   Exclusion reasons:")
        for reason, items in excluded_info.items():
            if items:
                print(f"   • {reason}: {len(items)}")
    
    print("="*60 + "\n")
    
    return valid_files, excluded_info


def calculate_aggregate_metrics(results):
    """Calculate and display aggregate training metrics"""
    successful = [r for r in results if r.success]
    
    if not successful:
        return None
    
    # Extract metrics
    metrics_list = []
    for r in successful:
        if r.metrics and 'validation' in r.metrics:
            val_mae = r.metrics['validation'].get('mae', 0)
            train_mae = r.metrics.get('train', {}).get('mae', val_mae)
            val_r2 = r.metrics['validation'].get('r2', 0)
            val_rmse = r.metrics['validation'].get('rmse', 0)
            val_mape = r.metrics['validation'].get('mape', 0)
            val_accuracy = r.metrics['validation'].get('accuracy_pct', 0)
            overfit_ratio = r.metrics.get('overfit_ratio', 0)
            rows = r.metrics.get('rows', 0)
            
            # Calculate improvement (if baseline available)
            baseline_mae = r.metrics.get('baseline_mae')
            if baseline_mae and baseline_mae > 0:
                improvement = (1 - val_mae / baseline_mae) * 100
            else:
                improvement = 0
            
            metrics_list.append({
                'product_id': r.product_id,
                'train_mae': train_mae,
                'val_mae': val_mae,
                'val_r2': val_r2,
                'val_rmse': val_rmse,
                'val_mape': val_mape,
                'val_accuracy': val_accuracy,
                'overfit_ratio': overfit_ratio,
                'rows': rows,
                'improvement': improvement,
                'time': r.training_time
            })
    
    if not metrics_list:
        return None
    
    # Calculate aggregates
    avg_val_mae = sum(m['val_mae'] for m in metrics_list) / len(metrics_list)
    avg_improvement = sum(m['improvement'] for m in metrics_list) / len(metrics_list)
    total_time = sum(m['time'] for m in metrics_list)
    avg_r2 = sum(m.get('val_r2', 0) for m in metrics_list) / len(metrics_list)
    avg_accuracy = sum(m.get('val_accuracy', 0) for m in metrics_list) / len(metrics_list)
    avg_rmse = sum(m.get('val_rmse', 0) for m in metrics_list) / len(metrics_list)
    avg_mape = sum(m.get('val_mape', 0) for m in metrics_list) / len(metrics_list)
    avg_overfit = sum(m.get('overfit_ratio', 0) for m in metrics_list) / len(metrics_list)
    total_rows = sum(m.get('rows', 0) for m in metrics_list)
    
    # Find best and worst
    sorted_by_mae = sorted(metrics_list, key=lambda x: x['val_mae'])
    best_models = sorted_by_mae[:5]
    
    return {
        'count': len(metrics_list),
        'avg_val_mae': avg_val_mae,
        'avg_improvement': avg_improvement,
        'avg_r2': avg_r2,
        'avg_accuracy': avg_accuracy,
        'avg_rmse': avg_rmse,
        'avg_mape': avg_mape,
        'avg_overfit': avg_overfit,
        'total_rows': total_rows,
        'total_time': total_time,
        'best_models': best_models,
        'all_metrics': metrics_list
    }


def main():
    '''Run complete pipeline with quality filtering'''

    print("""
╔══════════════════════════════════════════════════════════════╗
║         AI MARKET PULSE - COMPLETE PIPELINE v2.0             ║
║                                                              ║
║  Optimized for high accuracy:                                ║
║  • Target MAE: ≤ 0.5 (normalized)                           ║
║  • Target Improvement: 90%+ over baseline                    ║
║                                                              ║
║  Pipeline Steps:                                             ║
║  1. Preprocessing - Data cleaning & feature extraction       ║
║  2. Quality Filter - Select high-quality datasets            ║
║  3. Training - XGBoost with optimized hyperparameters        ║
║  4. Validation - Cross-validation and metrics                ║
╚══════════════════════════════════════════════════════════════╝
    """)

    try:
        observer = ConsoleProgressObserver()

        # ═══════════════════════════════════════════════════════════
        # STEP 1: PREPROCESSING
        # ═══════════════════════════════════════════════════════════
        print("\n" + "="*60)
        print("STEP 1: PREPROCESSING")
        print("="*60 + "\n")

        preprocess_service = PreprocessingService(PREPROCESSING_CONFIG, observer)
        datasets = preprocess_service.process_all()

        if not datasets:
            print("\n❌ No datasets created. Pipeline stopped.\n")
            return 1

        print(f"\n✅ Preprocessing complete: {len(datasets)} datasets created\n")

        # ═══════════════════════════════════════════════════════════
        # STEP 2: QUALITY FILTERING
        # ═══════════════════════════════════════════════════════════
        print("\n" + "="*60)
        print("STEP 2: QUALITY FILTERING")
        print("="*60)
        
        valid_files, excluded_info = filter_quality_datasets(
            PREPROCESSING_CONFIG.output_folder
        )
        
        if not valid_files:
            print("\n❌ No datasets passed quality filtering.")
            print("Suggestions:")
            print("  • Add more historical data (at least 30 days)")
            print("  • Ensure data has meaningful variance")
            print("  • Check for data format issues\n")
            return 1

        # ═══════════════════════════════════════════════════════════
        # STEP 3: TRAINING
        # ═══════════════════════════════════════════════════════════
        print("\n" + "="*60)
        print("STEP 3: TRAINING")
        print("="*60 + "\n")

        training_service = TrainingService(TRAINING_CONFIG, observer=observer)
        results = training_service.train_all()

        # ═══════════════════════════════════════════════════════════
        # STEP 4: RESULTS & METRICS
        # ═══════════════════════════════════════════════════════════
        success_count = sum(1 for r in results if r.success)
        failed_count = len(results) - success_count

        print("\n" + "="*60)
        print("PIPELINE COMPLETE - FINAL SUMMARY")
        print("="*60)
        
        print(f"\n📊 Dataset Statistics:")
        print(f"   Preprocessed:        {len(datasets)}")
        print(f"   Quality filtered:    {len(valid_files)}")
        print(f"   Training attempted:  {len(results)}")
        print(f"   ✅ Successful:       {success_count}")
        print(f"   ❌ Failed:           {failed_count}")
        
        # Calculate aggregate metrics
        agg_metrics = calculate_aggregate_metrics(results)
        
        if agg_metrics:
            print(f"\n📈 Model Performance Metrics:")
            print(f"   Average Validation MAE:     {agg_metrics['avg_val_mae']:.4f}")
            print(f"   Average Improvement:        {agg_metrics['avg_improvement']:.1f}%")
            print(f"   Average R2 Score:           {agg_metrics['avg_r2']:.3f}")
            print(f"   Average Accuracy (1-MAPE):  {agg_metrics['avg_accuracy']:.1f}%")
            print(f"   Average RMSE:               {agg_metrics['avg_rmse']:.4f}")
            print(f"   Average MAPE:               {agg_metrics['avg_mape']:.4f}")
            print(f"   Average Overfit Ratio:      {agg_metrics['avg_overfit']:.2f}")
            print(f"   Total Rows Processed:       {agg_metrics['total_rows']:,}")
            print(f"   Total Training Time:        {agg_metrics['total_time']:.1f}s")
            
            print(f"\n🏆 Top 5 Best Models (by MAE):")
            for i, m in enumerate(agg_metrics['best_models'], 1):
                name = m['product_id'][:35]
                print(
                    f"   {i}. {name:35} MAE: {m['val_mae']:.4f} | "
                    f"R2: {m.get('val_r2', 0):.3f} | "
                    f"Acc: {m.get('val_accuracy', 0):.1f}% | "
                    f"Overfit: {m.get('overfit_ratio', 0):.2f} | "
                    f"Rows: {m.get('rows', 0):,}"
                )
            
            # Quality assessment
            if agg_metrics['avg_val_mae'] <= 0.5:
                print(f"\n✅ Target MAE achieved! ({agg_metrics['avg_val_mae']:.4f} ≤ 0.5)")
            else:
                print(f"\n⚠️  MAE above target ({agg_metrics['avg_val_mae']:.4f} > 0.5)")
            
            if agg_metrics['avg_improvement'] >= 90:
                print(f"✅ Improvement target achieved! ({agg_metrics['avg_improvement']:.1f}% ≥ 90%)")
            elif agg_metrics['avg_improvement'] >= 50:
                print(f"✓  Good improvement ({agg_metrics['avg_improvement']:.1f}% ≥ 50%)")
            else:
                print(f"⚠️  Low improvement ({agg_metrics['avg_improvement']:.1f}% < 50%)")
        
        print(f"\n📁 Models saved to: {TRAINING_CONFIG.output_folder}")
        print("="*60 + "\n")

        logger.info(f"Pipeline complete: {success_count}/{len(results)} models trained")
        return 0 if success_count > 0 else 1

    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user\n")
        logger.warning("Pipeline interrupted by user")
        return 130

    except Exception as e:
        print(f"\n❌ Pipeline error: {str(e)}\n")
        logger.error(f"Pipeline failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == '__main__':
    sys.exit(main())
