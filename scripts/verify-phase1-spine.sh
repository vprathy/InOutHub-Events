#!/usr/bin/env bash
set -e

echo "=========================================="
echo "    PHASE 1 OPERATOR SPINE VERIFICATION   "
echo "=========================================="

echo "[1/3] Running Typecheck (UI & Spine Integrity)..."
npx tsc -b
echo "✅ Typecheck passed. No UI or Hook regressions detected."

echo ""
echo "[2/3] Checking Build Pass..."
npm run build
echo "✅ Build passed."

echo ""
echo "[3/3] Running Backend Contract Tests..."
# Assuming tsx is available from package.json
npx tsx scripts/test-db-contract.ts
echo "✅ Backend contract validation complete."

echo ""
echo "=========================================="
echo "  PHASE 1 VERIFICATION COMPLETED SAFELY   "
echo "=========================================="
