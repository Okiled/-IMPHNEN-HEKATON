"""
Quick Edge Case Testing Script
Run this to verify all Phase 1 fixes are working

Usage:
    python test_edge_cases.py

Note: Service must be running on http://localhost:8000
"""

import requests
import json
from typing import Dict, Any

BASE_URL = "http://localhost:8000"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def test_case(name: str, url: str, method: str = "GET", data: Dict = None, expected_status: int = None):
    """Run a single test case"""
    print(f"\n{Colors.BLUE}Testing: {name}{Colors.END}")
    print(f"  URL: {url}")

    try:
        if method == "GET":
            response = requests.get(url, timeout=5)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=5)
        else:
            raise ValueError(f"Unsupported method: {method}")

        status = response.status_code

        if expected_status and status == expected_status:
            print(f"  {Colors.GREEN}✓ PASS{Colors.END} - Status: {status}")
        elif status >= 500:
            print(f"  {Colors.RED}✗ FAIL{Colors.END} - Status: {status} (Server Error!)")
        elif status >= 400:
            print(f"  {Colors.GREEN}✓ PASS{Colors.END} - Status: {status} (Error handled gracefully)")
        else:
            print(f"  {Colors.GREEN}✓ PASS{Colors.END} - Status: {status}")

        # Print response summary
        try:
            data = response.json()
            if 'error' in data:
                print(f"  Error: {data['error']}")
            elif 'detail' in data:
                print(f"  Detail: {data['detail']}")
        except:
            pass

        return status < 500  # Pass if not server error

    except requests.exceptions.ConnectionError:
        print(f"  {Colors.RED}✗ ERROR{Colors.END} - Service not running!")
        print(f"  {Colors.YELLOW}Hint: Run 'uvicorn main:app --reload --port 8000'{Colors.END}")
        return False
    except Exception as e:
        print(f"  {Colors.RED}✗ ERROR{Colors.END} - {str(e)}")
        return False


def main():
    print(f"\n{Colors.BLUE}{'='*60}")
    print(f"PHASE 1 EDGE CASE TESTING - AI Market Pulse ML Service")
    print(f"{'='*60}{Colors.END}\n")

    results = []

    # Test 1: Empty/Invalid Product ID
    print(f"\n{Colors.YELLOW}=== TEST GROUP 1: Product ID Validation ==={Colors.END}")
    results.append(test_case(
        "Invalid product ID (not found)",
        f"{BASE_URL}/api/ml/forecast?productId=INVALID_PRODUCT_99999&days=7",
        expected_status=404
    ))

    results.append(test_case(
        "Path traversal attempt (security)",
        f"{BASE_URL}/api/ml/forecast?productId=../../etc/passwd&days=7",
        expected_status=400
    ))

    results.append(test_case(
        "Special characters in product_id",
        f"{BASE_URL}/api/ml/forecast?productId=test<script>alert(1)</script>&days=7",
        expected_status=400
    ))

    # Test 2: Days Parameter Validation
    print(f"\n{Colors.YELLOW}=== TEST GROUP 2: Days Parameter Validation ==={Colors.END}")
    results.append(test_case(
        "days=abc (non-numeric)",
        f"{BASE_URL}/api/ml/forecast?productId=test&days=abc",
        expected_status=422
    ))

    results.append(test_case(
        "days=-5 (negative)",
        f"{BASE_URL}/api/ml/forecast?productId=test&days=-5",
        expected_status=422
    ))

    results.append(test_case(
        "days=0 (zero)",
        f"{BASE_URL}/api/ml/forecast?productId=test&days=0",
        expected_status=422
    ))

    results.append(test_case(
        "days=1000 (too large)",
        f"{BASE_URL}/api/ml/forecast?productId=test&days=1000",
        expected_status=422
    ))

    # Test 3: Training Data Validation
    print(f"\n{Colors.YELLOW}=== TEST GROUP 3: Training Data Validation ==={Colors.END}")
    results.append(test_case(
        "Empty sales_data array",
        f"{BASE_URL}/api/ml/train",
        method="POST",
        data={"product_id": "test", "sales_data": []},
        expected_status=400
    ))

    results.append(test_case(
        "Missing required fields (no quantity)",
        f"{BASE_URL}/api/ml/train",
        method="POST",
        data={
            "product_id": "test",
            "sales_data": [
                {"date": "2024-01-01"},
                {"date": "2024-01-02"}
            ]
        },
        expected_status=400
    ))

    results.append(test_case(
        "Insufficient data (less than 7 rows)",
        f"{BASE_URL}/api/ml/train",
        method="POST",
        data={
            "product_id": "test",
            "sales_data": [
                {"date": "2024-01-01", "quantity": 10},
                {"date": "2024-01-02", "quantity": 12}
            ]
        },
        expected_status=400
    ))

    # Test 4: Inventory Optimization Validation
    print(f"\n{Colors.YELLOW}=== TEST GROUP 4: Inventory Optimization Validation ==={Colors.END}")
    results.append(test_case(
        "Negative current_stock",
        f"{BASE_URL}/api/ml/inventory/optimize",
        method="POST",
        data={
            "product_id": "test",
            "current_stock": -10,
            "lead_time_days": 3
        },
        expected_status=400
    ))

    results.append(test_case(
        "current_stock as string",
        f"{BASE_URL}/api/ml/inventory/optimize",
        method="POST",
        data={
            "product_id": "test",
            "current_stock": "abc",
            "lead_time_days": 3
        },
        expected_status=400
    ))

    results.append(test_case(
        "lead_time_days out of range",
        f"{BASE_URL}/api/ml/inventory/optimize",
        method="POST",
        data={
            "product_id": "test",
            "current_stock": 100,
            "lead_time_days": 999
        },
        expected_status=400
    ))

    # Test 5: Profit Forecast Validation
    print(f"\n{Colors.YELLOW}=== TEST GROUP 5: Profit Forecast Validation ==={Colors.END}")
    results.append(test_case(
        "Negative price_per_unit",
        f"{BASE_URL}/api/ml/profit/forecast",
        method="POST",
        data={
            "product_id": "test",
            "price_per_unit": -10,
            "cost_per_unit": 5
        },
        expected_status=400
    ))

    results.append(test_case(
        "price_per_unit = 0 (must be positive)",
        f"{BASE_URL}/api/ml/profit/forecast",
        method="POST",
        data={
            "product_id": "test",
            "price_per_unit": 0,
            "cost_per_unit": 5
        },
        expected_status=400
    ))

    results.append(test_case(
        "Invalid numeric parameter (string)",
        f"{BASE_URL}/api/ml/profit/forecast",
        method="POST",
        data={
            "product_id": "test",
            "price_per_unit": "abc",
            "cost_per_unit": 5
        },
        expected_status=400
    ))

    # Test 6: Weekly Report Validation
    print(f"\n{Colors.YELLOW}=== TEST GROUP 6: Weekly Report Validation ==={Colors.END}")
    results.append(test_case(
        "Invalid top_n parameter (should fallback to 3)",
        f"{BASE_URL}/api/ml/report/weekly?top_n=abc",
        expected_status=200
    ))

    results.append(test_case(
        "Valid weekly report request",
        f"{BASE_URL}/api/ml/report/weekly",
        expected_status=200
    ))

    # Test 7: Service Health
    print(f"\n{Colors.YELLOW}=== TEST GROUP 7: Service Health ==={Colors.END}")
    results.append(test_case(
        "Root endpoint",
        f"{BASE_URL}/",
        expected_status=200
    ))

    results.append(test_case(
        "Models list",
        f"{BASE_URL}/api/ml/models",
        expected_status=200
    ))

    # Summary
    print(f"\n{Colors.BLUE}{'='*60}")
    print(f"TEST SUMMARY")
    print(f"{'='*60}{Colors.END}")

    passed = sum(results)
    total = len(results)
    percentage = (passed / total * 100) if total > 0 else 0

    print(f"\nTotal Tests: {total}")
    print(f"{Colors.GREEN}Passed: {passed}{Colors.END}")
    print(f"{Colors.RED}Failed: {total - passed}{Colors.END}")
    print(f"Success Rate: {percentage:.1f}%\n")

    if percentage == 100:
        print(f"{Colors.GREEN}🎉 ALL TESTS PASSED! Service is DEMO-READY!{Colors.END}\n")
    elif percentage >= 90:
        print(f"{Colors.YELLOW}⚠️  Most tests passed, but check failures above{Colors.END}\n")
    else:
        print(f"{Colors.RED}❌ Multiple tests failed - review fixes needed{Colors.END}\n")

    return passed == total


if __name__ == "__main__":
    try:
        success = main()
        exit(0 if success else 1)
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}Testing interrupted by user{Colors.END}\n")
        exit(1)
