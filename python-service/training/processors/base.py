'''
Base Processor (Template Method Pattern)
Defines common preprocessing workflow
Enhanced for better data quality and XGBoost compatibility
'''

from abc import ABC, abstractmethod
from typing import Dict, Optional
from pathlib import Path
import os
import pandas as pd
import numpy as np
from core.interfaces import IFileProcessor, IColumnDetector, IDataCleaner, IDataValidator
from core.exceptions import FileProcessingError, ColumnDetectionError
from core.models import ProcessedDataset
from utils.validators import ColumnDetector, DataCleaner, SalesDataValidator
from utils.logger import logger


class BaseFileProcessor(IFileProcessor, ABC):
    '''
    Base class for all file processors (Template Method Pattern)
    Defines the common workflow, subclasses implement file-specific reading
    Enhanced with better gap filling and outlier handling
    '''

    def __init__(self):
        self.column_detector: IColumnDetector = ColumnDetector()
        self.data_cleaner: IDataCleaner = DataCleaner()
        self.validator: IDataValidator = SalesDataValidator()

    def process(self, filepath: str) -> Optional[Dict[str, pd.DataFrame]]:
        '''
        Template method: defines the processing workflow
        Subclasses implement read_file()
        '''
        try:
            logger.info(f"Processing: {filepath}")

            # Step 1: Read file (implemented by subclass)
            df = self.read_file(filepath)

            if df is None or df.empty:
                logger.error("Failed to read file or file is empty")
                return None

            # Step 2: Detect columns
            date_col = self.column_detector.detect_date_column(df)
            quantity_col = self.column_detector.detect_quantity_column(df)
            product_col = self.column_detector.detect_product_column(df)
            price_col = self.column_detector.detect_price_column(df)

            if not date_col or not quantity_col:
                raise ColumnDetectionError(
                    f"Could not detect required columns. "
                    f"Date: {date_col}, Quantity: {quantity_col}"
                )

            logger.info(
                f"Detected columns - Date: '{date_col}', Quantity: '{quantity_col}', Product: '{product_col}', Price: '{price_col}'"
            )

            # Step 3: Standardize data
            # Fallback product id from filename (sanitized)
            fallback_product = os.path.splitext(os.path.basename(filepath))[0]
            fallback_product = fallback_product.replace(" ", "_").lower()

            standardized = self._standardize_dataframe(
                df, date_col, quantity_col, product_col, fallback_product, price_col=price_col
            )

            if not standardized:
                logger.error("Failed to standardize data")
                return None

            logger.info(f"Successfully processed {len(standardized)} product(s)")
            return standardized

        except Exception as e:
            logger.error(f"Processing failed: {str(e)}")
            return None

    @abstractmethod
    def read_file(self, filepath: str) -> Optional[pd.DataFrame]:
        '''
        Read file and return DataFrame
        Must be implemented by subclass (Strategy Pattern)
        '''
        pass

    def _standardize_dataframe(
        self,
        df: pd.DataFrame,
        date_col: str,
        quantity_col: str,
        product_col: Optional[str],
        fallback_product: str,
        price_col: Optional[str] = None
    ) -> Optional[Dict[str, pd.DataFrame]]:
        '''Standardize dataframe to common format with enhanced quality checks'''

        cleaned_records = []

        for _, row in df.iterrows():
            date_val = self.data_cleaner.clean_date(row[date_col])
            quantity_val = self.data_cleaner.clean_quantity(row[quantity_col])

            if date_val and quantity_val:
                record = {
                    'date': date_val,
                    'quantity': quantity_val
                }

                if product_col and product_col in row:
                    record['product'] = str(row[product_col]).strip()

                if price_col and price_col in row:
                    price_idr = self.data_cleaner.clean_price_to_idr(row[price_col])
                    if price_idr is not None:
                        record['price_idr'] = price_idr

                cleaned_records.append(record)

        if not cleaned_records:
            logger.warning("No valid records after cleaning")
            return None

        output_df = pd.DataFrame(cleaned_records)
        
        # ═══════════════════════════════════════════════════════════
        # AGGREGATE PER DAY (handle multiple transactions per day)
        # ═══════════════════════════════════════════════════════════
        if 'product' in output_df.columns:
            agg_dict = {'quantity': 'sum'}
            if 'price_idr' in output_df.columns:
                agg_dict['price_idr'] = 'mean'
            
            output_df = output_df.groupby(['date', 'product']).agg(agg_dict).reset_index()
            logger.info(f"Aggregated to {len(output_df)} unique date-product combinations")
        else:
            agg_dict = {'quantity': 'sum'}
            if 'price_idr' in output_df.columns:
                agg_dict['price_idr'] = 'mean'
            
            output_df = output_df.groupby('date').agg(agg_dict).reset_index()
            logger.info(f"Aggregated to {len(output_df)} unique dates")

        # Group by product if multiple products
        if 'product' in output_df.columns:
            products = output_df['product'].unique()
            logger.info(f"Found {len(products)} product(s)")

            results = {}
            warn_limit = 5
            warn_count = 0
            warn_suppressed = 0
            
            for product in products:
                cols = ['date', 'quantity']
                if 'price_idr' in output_df.columns:
                    cols.append('price_idr')
                product_df = output_df[output_df['product'] == product][cols].copy()
                product_df = product_df.sort_values('date').reset_index(drop=True)
                
                # Convert date to datetime
                product_df['date'] = pd.to_datetime(product_df['date'])
                
                # ═══════════════════════════════════════════════════════════
                # FILL DATE GAPS (Critical for time series)
                # ═══════════════════════════════════════════════════════════
                product_df = self._fill_date_gaps(product_df, product)
                
                # ═══════════════════════════════════════════════════════════
                # REMOVE OUTLIERS (Z-score based)
                # ═══════════════════════════════════════════════════════════
                product_df = self.data_cleaner.remove_outliers(product_df)

                if self.validator.validate_dataframe(product_df):
                    results[product] = product_df
                    logger.info(f"  ✓ {product}: {len(product_df)} days, qty range: {product_df['quantity'].min():.1f}-{product_df['quantity'].max():.1f}")
                else:
                    if warn_count < warn_limit:
                        logger.warning(f"  Invalid {product}: {self.validator.get_validation_errors()}")        
                        warn_count += 1
                    else:
                        warn_suppressed += 1

            if warn_suppressed:
                logger.warning(f"  ...suppressed {warn_suppressed} additional validation warnings")

            return results if results else None

        # Single product fallback uses filename instead of "default"
        cols = ['date', 'quantity']
        if 'price_idr' in output_df.columns:
            cols.append('price_idr')
        output_df = output_df[cols].sort_values('date').reset_index(drop=True)
        output_df['date'] = pd.to_datetime(output_df['date'])
        
        # Fill gaps for single product
        output_df = self._fill_date_gaps(output_df, fallback_product)
        
        output_df = self.data_cleaner.remove_outliers(output_df)

        if self.validator.validate_dataframe(output_df):
            logger.info(f"✓ Single product: {len(output_df)} days, qty range: {output_df['quantity'].min():.1f}-{output_df['quantity'].max():.1f}")
            return {fallback_product: output_df}

        logger.warning(f"✗ Validation failed: {self.validator.get_validation_errors()}")
        return None

    def _fill_date_gaps(self, df: pd.DataFrame, product_name: str) -> pd.DataFrame:
        '''
        Fill missing dates with intelligent interpolation
        Uses forward fill + backward fill for continuity
        '''
        if 'date' not in df.columns or len(df) < 2:
            return df
        
        df = df.copy()
        df['date'] = pd.to_datetime(df['date'])
        
        # Create complete date range
        date_range = pd.date_range(
            df['date'].min(),
            df['date'].max(),
            freq='D'
        )
        
        gap_count = len(date_range) - len(df)
        
        if gap_count <= 0:
            return df
        
        gap_pct = gap_count / len(date_range) * 100
        
        # Only fill if gaps exist
        if gap_count > 0:
            logger.info(f"[{product_name}] Filling {gap_count} gaps ({gap_pct:.1f}%)")
            
            # Create full date frame
            complete_df = pd.DataFrame({'date': date_range})
            df = complete_df.merge(df, on='date', how='left')
            
            # ═══════════════════════════════════════════════════════════
            # SMART GAP FILLING
            # ═══════════════════════════════════════════════════════════
            
            # For small gaps (≤20%), use forward fill + backward fill
            if gap_pct <= 20:
                df['quantity'] = df['quantity'].ffill().bfill()
            
            # For medium gaps (20-50%), use rolling mean interpolation
            elif gap_pct <= 50:
                # First, fill with rolling mean
                rolling_mean = df['quantity'].rolling(window=7, min_periods=1, center=True).mean()
                df['quantity'] = df['quantity'].fillna(rolling_mean)
                # Then fill remaining with ffill/bfill
                df['quantity'] = df['quantity'].ffill().bfill()
            
            # For large gaps (>50%), use overall mean with day-of-week adjustment
            else:
                # Calculate day-of-week means from existing data
                df['dow'] = df['date'].dt.dayofweek
                
                # Calculate existing day-of-week means
                existing_data = df[df['quantity'].notna()]
                if len(existing_data) > 0:
                    overall_mean = existing_data['quantity'].mean()
                    dow_means = existing_data.groupby('dow')['quantity'].mean()
                    
                    # Fill missing with day-of-week mean or overall mean
                    def fill_missing(row):
                        if pd.isna(row['quantity']):
                            return dow_means.get(row['dow'], overall_mean)
                        return row['quantity']
                    
                    df['quantity'] = df.apply(fill_missing, axis=1)
                else:
                    # No existing data - fill with 0 (shouldn't happen)
                    df['quantity'] = df['quantity'].fillna(0)
                
                df = df.drop(columns=['dow'])
            
            # Fill price if present
            if 'price_idr' in df.columns:
                df['price_idr'] = df['price_idr'].ffill().bfill()
        
        # Ensure no NaN remains
        df['quantity'] = df['quantity'].fillna(df['quantity'].mean() if len(df) > 0 else 1.0)
        
        return df
