#!/bin/bash
# RotaMind MVP Setup — نصب یک‌خطی
# اجرا: bash scripts/setup.sh

set -e
echo "🚀 RotaMind MVP Setup"

echo "1) Python inference..."
cd software/rota-inference
python3 -m venv .venv || python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
echo "✅ Python ready. Test: python api/server.py --port 8000"

echo "2) Frontend..."
cd ../rotaviewer
npm install
echo "✅ Frontend ready. Run: npm run dev"

echo "3) Generate sample data..."
cd ../../
python3 hardware/firmware/simulator.py --fault outer --snr -4 --out datasets/fixtures/sample_bearing_outer.csv
python3 hardware/firmware/simulator.py --fault normal --snr 20 --out datasets/fixtures/sample_bearing_normal.csv
python3 hardware/firmware/simulator.py --fault inner --snr -2 --out datasets/fixtures/sample_bearing_inner.csv
echo "✅ Fixtures ready in datasets/fixtures/"

echo ""
echo "🎉 Setup complete!"
echo "Run in 2 terminals:"
echo "  Terminal 1: cd software/rota-inference && source .venv/bin/activate && python api/server.py"
echo "  Terminal 2: cd software/rotaviewer && npm run dev"
