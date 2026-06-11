# -*- coding: utf-8 -*-
"""
Market Data Microservice - serves /api/market/* endpoints using baostock
+ SSE real-time streaming endpoint
"""
import sys
import os
import json
import time
from pathlib import Path

_dashboard_dir = str(Path(__file__).resolve().parent)
sys.path.insert(0, _dashboard_dir)

from flask import Flask, jsonify, Response, stream_with_context
from market_broker import (
    get_index_data, get_market_overview, get_sectors, get_heatmap
)

app = Flask(__name__)


@app.route('/api/market/overview')
def market_overview():
    data = get_market_overview()
    # Translate distribution labels to Chinese for frontend
    cn_labels = {
        'LimitUp': '\u6da8\u505c',
        '7-10%': '7~10%',
        '3-7%': '3~7%',
        '0-3%': '0~3%',
        '0-(-3)%': '0~-3%',
        '(-3)-(-7)%': '-3~-7%',
        '(-7)-(-10)%': '-7~-10%',
        'LimitDown': '\u8dcc\u505c',
    }
    if 'distribution' in data and 'labels' in data['distribution']:
        data['distribution']['labels'] = [
            cn_labels.get(l, l) for l in data['distribution']['labels']
        ]
    return jsonify(data)


@app.route('/api/market/index')
def market_index():
    data = get_index_data()
    return jsonify({
        'date': datetime.now().strftime('%Y-%m-%d'),
        'sh': {
            'value': data.get('sh', {}).get('value', 0),
            'change_pct': data.get('sh', {}).get('change_pct', 0),
        },
        'sz': {
            'value': data.get('sz', {}).get('value', 0),
            'change_pct': data.get('sz', {}).get('change_pct', 0),
        },
        'cy': {
            'value': data.get('cy', {}).get('value', 0),
            'change_pct': data.get('cy', {}).get('change_pct', 0),
        },
    })


@app.route('/api/market/sectors')
def market_sectors():
    return jsonify(get_sectors())


@app.route('/api/market/heatmap')
def market_heatmap():
    return jsonify(get_heatmap())


@app.route('/api/market/health')
def market_health():
    return jsonify({'status': 'ok', 'service': 'market-data-broker'})


@app.route('/api/market/stream')
def market_stream():
    """SSE real-time market data stream"""
    def generate():
        while True:
            try:
                idx = get_index_data()
                ov = get_market_overview()
                data = {
                    'type': 'market_update',
                    'index': {
                        'sh': idx.get('sh', {}),
                        'sz': idx.get('sz', {}),
                        'cy': idx.get('cy', {}),
                    },
                    'overview': {
                        'date': ov.get('date'),
                        'up': ov.get('up_count'),
                        'down': ov.get('down_count'),
                        'amount': ov.get('total_amount'),
                    },
                    'ts': int(time.time()),
                }
                yield 'data: {}\n\n'.format(json.dumps(data, ensure_ascii=False))
            except Exception as e:
                yield 'data: {}\n\n'.format(json.dumps({'type': 'error', 'msg': str(e)}))
            time.sleep(30)
    
    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        }
    )


if __name__ == '__main__':
    from datetime import datetime
    app.run(host='127.0.0.1', port=5002, debug=False)
