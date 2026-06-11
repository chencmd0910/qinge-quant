# -*- coding: utf-8 -*-
"""
Daily Auto Pipeline: Market data update -> Paper trading execution
Run this after market close (e.g., 15:30 CST on trading days)
"""
import subprocess
import sys
import json
from datetime import datetime

API_BASE = "http://127.0.0.1:8000/api"


def log(msg):
    print("[{}] {}".format(datetime.now().strftime('%H:%M:%S'), msg))


def main():
    today = datetime.now().strftime('%Y-%m-%d')
    
    log("=== Daily Auto Pipeline Start ===")
    
    # Step 1: Update market data (K-lines via akshare in Docker)
    log("Step 1: Updating market data...")
    try:
        # Call the market data update endpoint
        import urllib.request
        import urllib.error
        
        req = urllib.request.Request(
            "{}/paper-trading/market/update".format(API_BASE),
            data=json.dumps({"date": today}).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        resp = urllib.request.urlopen(req, timeout=120)
        result = json.loads(resp.read())
        log("Market data update: {}".format(result.get('updated', '?')))
    except Exception as e:
        log("Market data update failed: {}".format(e))
        # Continue anyway - might already have data
    
    # Step 2: Run paper trading daily update
    log("Step 2: Running paper trading daily update...")
    try:
        req = urllib.request.Request(
            "{}/paper-trading/daily-update".format(API_BASE),
            data=json.dumps({"date": today}).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        resp = urllib.request.urlopen(req, timeout=300)
        result = json.loads(resp.read())
        log("Paper trading result: success={}, value={}, pnl={}%".format(
            result.get('success'), result.get('total_value'), result.get('daily_pnl_pct')))
    except Exception as e:
        log("Paper trading update failed: {}".format(e))
    
    # Step 3: Generate daily report summary
    log("Step 3: Generating daily summary...")
    try:
        # Get paper trading summary
        resp = urllib.request.urlopen("{}/paper-trading/summary".format(API_BASE), timeout=30)
        summary = json.loads(resp.read())
        
        report = {
            'date': today,
            'total_value': summary.get('total_value'),
            'total_pnl_pct': summary.get('total_pnl_pct'),
            'daily_pnl_pct': summary.get('daily_pnl_pct'),
            'sharpe': summary.get('sharpe'),
            'max_dd': summary.get('max_dd'),
            'generated_at': datetime.now().isoformat(),
        }
        
        report_path = '/root/quant-trading-system/output/daily_report_{}.json'.format(today)
        with open(report_path, 'w') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        log("Report saved to {}".format(report_path))
    except Exception as e:
        log("Report generation failed: {}".format(e))
    
    log("=== Daily Auto Pipeline Complete ===")


if __name__ == '__main__':
    main()
